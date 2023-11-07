/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

import { RedshiftDataClient } from '@aws-sdk/client-redshift-data';
import {
  CreateSecretCommand,
  CreateSecretCommandInput,
  DeleteSecretCommand,
  DeleteSecretCommandInput,
  DescribeSecretCommand,
  DescribeSecretCommandInput,
  ResourceNotFoundException,
  SecretsManagerClient,
  Tag,
  TagResourceCommand,
  UpdateSecretCommand,
  UpdateSecretCommandInput,
} from '@aws-sdk/client-secrets-manager';
import { CdkCustomResourceHandler, CdkCustomResourceEvent, CdkCustomResourceResponse, CloudFormationCustomResourceEvent, Context, CloudFormationCustomResourceUpdateEvent } from 'aws-lambda';
import { getFunctionTags } from '../../../common/lambda/tags';
import { BIUserCredential } from '../../../common/model';
import { logger } from '../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';
import { generateRandomStr } from '../../../common/utils';
import { LEGACY_REDSHIFT_ODS_EVENTS_TABLE_NAME, SQL_TEMPLATE_PARAMETER } from '../../private/constant';
import { CreateDatabaseAndSchemas, MustacheParamType, SQLDef, SQLViewDef } from '../../private/model';
import { getSqlContent, getSqlContents } from '../../private/utils';
import { getRedshiftClient, executeStatementsWithWait } from '../redshift-data';

export type ResourcePropertiesType = CreateDatabaseAndSchemas & {
  readonly ServiceToken: string;
}

const secretManagerClient = new SecretsManagerClient({
  ...aws_sdk_client_common_config,
});

export const physicalIdPrefix = 'create-redshift-db-schemas-custom-resource-';
export const handler: CdkCustomResourceHandler = async (event: CloudFormationCustomResourceEvent, context: Context) => {
  logger.info('event', { event });
  const physicalId = ('PhysicalResourceId' in event) ? event.PhysicalResourceId :
    `${physicalIdPrefix}${generateRandomStr(8, 'abcdefghijklmnopqrstuvwxyz0123456789')}`;
  const biUsername = `${(event.ResourceProperties as ResourcePropertiesType).redshiftBIUsernamePrefix}${physicalId.substring(physicalIdPrefix.length)}`;
  const response: CdkCustomResourceResponse = {
    PhysicalResourceId: physicalId,
    Data: {
      DatabaseName: event.ResourceProperties.databaseName,
      RedshiftBIUsername: biUsername,
    },
    Status: 'SUCCESS',
  };

  try {
    await _handler(event, biUsername, context);
  } catch (e) {
    if (e instanceof Error) {
      logger.error('Error when creating database and schema in redshift', e);
    }
    throw e;
  }
  return response;
};

async function _handler(event: CdkCustomResourceEvent, biUsername: string, context: Context) {
  const requestType = event.RequestType;

  logger.info('RequestType: ' + requestType);
  if (requestType == 'Create') {
    const funcTags = await getFunctionTags(context);
    const tags: Tag[] = [];
    for (let [key, value] of Object.entries(funcTags as any)) {
      tags.push({
        Key: key,
        Value: value as string,
      });
    }
    logger.info('tags', { tags });

    await onCreate(event, biUsername, tags);
  }

  if (requestType == 'Update') {
    await onUpdate(event, biUsername);
  }

  if (requestType == 'Delete') {
    await onDelete(event, biUsername);
  }
}

async function onCreate(event: CdkCustomResourceEvent, biUsername: string, tags: Tag[]) {
  logger.info('onCreate()');

  const props = event.ResourceProperties as ResourcePropertiesType;

  // 0. generate password and save to parameter store
  const credential = await createBIUserCredentialSecret(props.redshiftBIUserParameter, biUsername, props.projectId, tags);

  // 1. create database in Redshift
  const client = getRedshiftClient(props.dataAPIRole);
  if (props.serverlessRedshiftProps || props.provisionedRedshiftProps) {
    await createDatabaseInRedshift(client, props.databaseName, props);
    await createDatabaseBIUser(client, credential, props);
  } else {
    throw new Error('Can\'t identity the mode Redshift cluster!');
  }

  // 2. create schemas in Redshift for applications
  await createSchemas(props, biUsername);

  // 3. create views for reporting
  await createViewForReporting(props, biUsername);
}

async function createBIUserCredentialSecret(secretName: string, biUsername: string, projectId: string, tags: Tag[]): Promise<BIUserCredential> {
  const credential: BIUserCredential = {
    username: biUsername,
    password: generateRedshiftUserPassword(32),
  };

  const readParams: DescribeSecretCommandInput = {
    SecretId: secretName,
  };

  try {
    await secretManagerClient.send(new DescribeSecretCommand(readParams));

    const params: UpdateSecretCommandInput = {
      SecretId: secretName,
      SecretString: JSON.stringify(credential),
      Description: `Managed by Clickstream for storing credential of Quicksight reporting user for project ${projectId}.`,
    };
    logger.info(`Updating the credential of BI user '${biUsername}' of Redshift to parameter ${secretName}.`);

    await secretManagerClient.send(new UpdateSecretCommand(params));

  } catch (err: any) {
    if (err as Error instanceof ResourceNotFoundException) {
      await _createBIUserCredentialSecret(secretName, biUsername, projectId, credential);
    } else {
      throw err;
    }
  }

  await secretManagerClient.send(new TagResourceCommand({
    SecretId: secretName,
    Tags: tags,
  }));
  logger.info(`add tag ${secretName}`, { tags });

  return credential;
}


async function _createBIUserCredentialSecret(secretName: string, biUsername: string, projectId: string,
  credential: BIUserCredential): Promise<BIUserCredential> {
  const params: CreateSecretCommandInput = {
    Name: secretName,
    SecretString: JSON.stringify(credential),
    Description: `Managed by Clickstream for storing credential of Quicksight reporting user for project ${projectId}.`,
  };
  logger.info(`Creating the credential of BI user '${biUsername}' of Redshift to parameter ${secretName}.`);

  await secretManagerClient.send(new CreateSecretCommand(params));

  return credential;
}


async function deleteBIUserCredentialSecret(secretName: string, biUsername: string) {
  const params: DeleteSecretCommandInput = {
    SecretId: secretName,
    ForceDeleteWithoutRecovery: true,
  };

  logger.info(`Deleting the credential of BI user '${biUsername}' of Redshift to parameter ${secretName}.`);
  await secretManagerClient.send(new DeleteSecretCommand(params));
}

async function onUpdate(event: CloudFormationCustomResourceUpdateEvent, biUsername: string) {
  logger.info('onUpdate()');

  const oldProps = event.OldResourceProperties as ResourcePropertiesType;
  const props = event.ResourceProperties as ResourcePropertiesType;

  await updateSchemas(props, biUsername, oldProps);

  await updateViewForReporting(props, oldProps, biUsername);

}

async function onDelete(event: CdkCustomResourceEvent, biUsername: string) {
  logger.info('onDelete()');
  const props = event.ResourceProperties as ResourcePropertiesType;
  try {
    await deleteBIUserCredentialSecret(props.redshiftBIUserParameter, biUsername);
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      logger.warn(`The parameter ${props.redshiftBIUserParameter} already deleted.`);
    }
  }
  logger.info('doNothing to keep the database and schema');
}

function splitString(str: string): string[] {
  if (!str.trim()) { // checks if string is blank or only whitespace characters
    return []; // return an empty array
  } else {
    return str.split(','); // split the string by comma
  }
}

async function createSchemas(props: ResourcePropertiesType, biUsername: string) {
  const odsTableNames = props.odsTableNames;

  const appIds = splitString(props.appIds);
  const sqlStatementsByApp = new Map<string, string[]>();

  for (const app of appIds) {
    const sqlStatements: string[] = [];
    const mustacheParam: MustacheParamType = {
      database_name: props.projectId,
      schema: app,
      table_ods_events: LEGACY_REDSHIFT_ODS_EVENTS_TABLE_NAME,
      table_event: odsTableNames.event,
      table_event_parameter: odsTableNames.event_parameter,
      table_user: odsTableNames.user,
      table_item: odsTableNames.item,
      user_bi: biUsername,
      ...SQL_TEMPLATE_PARAMETER,
    };

    sqlStatements.push(`CREATE SCHEMA IF NOT EXISTS ${app}`);
    for (const sqlDef of props.schemaDefs) {
      if (sqlDef.multipleLine !== undefined && sqlDef.multipleLine === 'true') {
        logger.info('multipleLine SQL: ', sqlDef.sqlFile);
        sqlStatements.push(...getSqlContents(sqlDef, mustacheParam));
      } else {
        sqlStatements.push(getSqlContent(sqlDef, mustacheParam));
      }
    }
    sqlStatementsByApp.set(app, sqlStatements);
  };

  if (sqlStatementsByApp.size == 0) {
    logger.info('Ignore creating schema in Redshift due to there is no application.');
  } else {
    const redShiftClient = getRedshiftClient(props.dataAPIRole);
    await createSchemasInRedshift(redShiftClient, sqlStatementsByApp, props);
  }
}

async function updateSchemas(props: ResourcePropertiesType, biUsername: string, oldProps: ResourcePropertiesType) {
  const odsTableNames = props.odsTableNames;
  const appUpdateProps = getAppUpdateProps(props, oldProps);

  logger.info('updateSchemas', { props, oldProps, appUpdateProps });

  const sqlStatementsByApp = new Map<string, string[]>();
  for (const app of appUpdateProps.createAppIds) {
    const sqlStatements: string[] = [];
    const mustacheParam: MustacheParamType = {
      database_name: props.projectId,
      schema: app,
      table_ods_events: LEGACY_REDSHIFT_ODS_EVENTS_TABLE_NAME,
      table_event: odsTableNames.event,
      table_event_parameter: odsTableNames.event_parameter,
      table_user: odsTableNames.user,
      table_item: odsTableNames.item,
      user_bi: biUsername,
      ...SQL_TEMPLATE_PARAMETER,
    };
    sqlStatements.push(`CREATE SCHEMA IF NOT EXISTS ${app}`);
    for (const sqlDef of props.schemaDefs) {
      if (sqlDef.multipleLine !== undefined && sqlDef.multipleLine === 'true') {
        logger.info('multipleLine SQL: ', sqlDef.sqlFile);
        sqlStatements.push(...getSqlContents(sqlDef, mustacheParam));
        continue;
      }
      sqlStatements.push(getSqlContent(sqlDef, mustacheParam));
    }
    sqlStatementsByApp.set(app, sqlStatements);
  };

  for (const app of appUpdateProps.updateAppIds) {
    const mustacheParam: MustacheParamType = {
      database_name: props.projectId,
      schema: app,
      table_ods_events: LEGACY_REDSHIFT_ODS_EVENTS_TABLE_NAME,
      table_event: odsTableNames.event,
      table_event_parameter: odsTableNames.event_parameter,
      table_user: odsTableNames.user,
      table_item: odsTableNames.item,
      user_bi: biUsername,
      ...SQL_TEMPLATE_PARAMETER,
    };

    const sqlStatements2 = getUpdatableSql(props.schemaDefs, appUpdateProps.oldSchemaSqlArray, appUpdateProps.oldViewSqls, mustacheParam);

    logger.info('updateSchemas- sqlStatements2, app=' + app, { app, sqlStatements2 });

    if (sqlStatementsByApp.has(app)) {
      sqlStatementsByApp.get(app)?.push(...sqlStatements2);
    } else {
      sqlStatementsByApp.set(app, sqlStatements2);
    }

  };
  await doUpdate(sqlStatementsByApp, props);
}

function _viewNameExist(sqlArray: string[], viewName: string): boolean {
  for (const sql of sqlArray) {
    if (sql.includes(viewName)) {
      return true;
    }
  }
  return false;
}

function getUpdatableSql(sqlOrViewDefs: SQLDef[] | SQLViewDef[], oldSqlArray: string[], oldViewSqlArray: string[], mustacheParam: MustacheParamType, path: string = '/opt') {
  logger.info('getUpdatableSql', { sqlOrViewDefs, oldSqlArray });
  const newFilesInfo = [];
  const updateFilesInfo = [];
  const sqlStatements: string[] = [];
  for (const schemaOrViewDef of sqlOrViewDefs) {
    logger.info(`schemaOrViewDef.updatable: ${schemaOrViewDef.updatable}`);

    if ('sqlFile' in schemaOrViewDef && !oldSqlArray.includes(schemaOrViewDef.sqlFile)) {
      logger.info('new sql: ', { schemaOrViewDef });
      sqlStatements.push(getSqlContent(schemaOrViewDef, mustacheParam, path));
      newFilesInfo.push(schemaOrViewDef);
    } else if (schemaOrViewDef.updatable === 'true'
      || ('viewName' in schemaOrViewDef
         && (!_viewNameExist(oldSqlArray, schemaOrViewDef.viewName)) //all view sqls is contained in oldSqlArray when upgrade from 1.0.x
         && (!_viewNameExist(oldViewSqlArray, schemaOrViewDef.viewName))
      )
    ) {
      logger.info('update sql: ', { schemaOrViewDef });
      sqlStatements.push(getSqlContent(schemaOrViewDef, mustacheParam, path));
      updateFilesInfo.push(schemaOrViewDef);
    } else {
      logger.info('skip update sql due to it is not updatable.', { schemaOrViewDef });
    }
  }

  logger.info('getUpdatableSql: new and update files info', { newFilesInfo, updateFilesInfo });

  return sqlStatements;
}

async function doUpdate(sqlStatementsByApp: Map<string, string[]>, props: ResourcePropertiesType) {
  if (sqlStatementsByApp.size == 0) {
    logger.info('Ignore creating schema in Redshift due to there is no application.');
  } else {
    const redShiftClient = getRedshiftClient(props.dataAPIRole);
    await createSchemasInRedshift(redShiftClient, sqlStatementsByApp, props);
  }
}

export const TABLES_VIEWS_FOR_REPORTING = ['event', 'event_parameter', 'user', 'item', 'user_m_view', 'item_m_view'];
function _buildGrantSqlStatements(views: string[], schema: string, biUser: string): string[] {

  const statements: string[] = [];

  //grant select permission on base base tables to BI user for explore analysis
  views.push(...TABLES_VIEWS_FOR_REPORTING);

  for (const view of views) {
    statements.push(`GRANT SELECT ON ${schema}.${view} TO ${biUser};`);
  }

  return statements;
}

async function createViewForReporting(props: ResourcePropertiesType, biUser: string) {
  const odsTableNames = props.odsTableNames;
  const appIds = splitString(props.appIds);

  const sqlStatementsByApp = new Map<string, string[]>();
  for (const app of appIds) {
    const sqlStatements: string[] = [];
    const views: string[] = [];
    const mustacheParam: MustacheParamType = {
      database_name: props.projectId,
      schema: app,
      table_ods_events: LEGACY_REDSHIFT_ODS_EVENTS_TABLE_NAME,
      table_event: odsTableNames.event,
      table_event_parameter: odsTableNames.event_parameter,
      table_user: odsTableNames.user,
      table_item: odsTableNames.item,
      ...SQL_TEMPLATE_PARAMETER,
    };

    for (const viewDef of props.reportingViewsDef) {
      views.push(viewDef.viewName);
      sqlStatements.push(getSqlContent(viewDef, mustacheParam, '/opt/dashboard'));
    }
    sqlStatements.push(..._buildGrantSqlStatements(views, app, biUser));
    sqlStatementsByApp.set(app, sqlStatements);
  };

  if (sqlStatementsByApp.size == 0) {
    logger.info('Ignore creating reporting views in Redshift due to there is no application.');
  } else {
    const redShiftClient = getRedshiftClient(props.dataAPIRole);
    await createSchemasInRedshift(redShiftClient, sqlStatementsByApp, props);
  }
}

async function updateViewForReporting(props: ResourcePropertiesType, oldProps: ResourcePropertiesType, biUser: string) {
  const odsTableNames = props.odsTableNames;

  const appUpdateProps = getAppUpdateProps(props, oldProps);

  const sqlStatementsByApp = new Map<string, string[]>();
  for (const app of appUpdateProps.createAppIds) {
    const sqlStatements: string[] = [];
    const mustacheParam: MustacheParamType = {
      database_name: props.projectId,
      schema: app,
      table_ods_events: LEGACY_REDSHIFT_ODS_EVENTS_TABLE_NAME,
      table_event: odsTableNames.event,
      table_event_parameter: odsTableNames.event_parameter,
      table_user: odsTableNames.user,
      table_item: odsTableNames.item,
      ...SQL_TEMPLATE_PARAMETER,
    };
    const views: string[] = [];
    for (const viewDef of props.reportingViewsDef) {
      views.push(viewDef.viewName);
      sqlStatements.push(getSqlContent(viewDef, mustacheParam, '/opt/dashboard'));
    }
    sqlStatements.push(..._buildGrantSqlStatements(views, app, biUser));

    sqlStatementsByApp.set(app, sqlStatements);
  };

  for (const app of appUpdateProps.updateAppIds) {
    const mustacheParam: MustacheParamType = {
      database_name: props.projectId,
      schema: app,
      table_ods_events: LEGACY_REDSHIFT_ODS_EVENTS_TABLE_NAME,
      table_event: odsTableNames.event,
      table_event_parameter: odsTableNames.event_parameter,
      table_user: odsTableNames.user,
      table_item: odsTableNames.item,
      ...SQL_TEMPLATE_PARAMETER,
    };

    const sqlStatements2 = getUpdatableSql(props.reportingViewsDef, appUpdateProps.oldViewSqls, appUpdateProps.oldViewSqls, mustacheParam, '/opt/dashboard');

    //grant select on views to bi user.
    const views: string[] = [];
    for (const sqlDef of props.reportingViewsDef) {
      views.push(sqlDef.viewName);
    }
    sqlStatements2.push(..._buildGrantSqlStatements(views, app, biUser));

    if (sqlStatementsByApp.has(app)) {
      sqlStatementsByApp.get(app)?.push(...sqlStatements2);
    } else {
      sqlStatementsByApp.set(app, sqlStatements2);
    }
  };

  if (sqlStatementsByApp.size == 0) {
    logger.info('Ignore creating reporting views in Redshift due to there is no application.');
  } else {
    const redShiftClient = getRedshiftClient(props.dataAPIRole);
    await createSchemasInRedshift(redShiftClient, sqlStatementsByApp, props);
  }

}

const createDatabaseInRedshift = async (redshiftClient: RedshiftDataClient, databaseName: string,
  props: CreateDatabaseAndSchemas, owner?: string) => {
  try {
    const ownerStatement = owner ? ` WITH OWNER "${owner}"` : '';
    await executeStatementsWithWait(redshiftClient, [`CREATE DATABASE ${databaseName}${ownerStatement};`],
      props.serverlessRedshiftProps, props.provisionedRedshiftProps);
  } catch (err) {
    if (err instanceof Error) {
      logger.error(`Error happened when creating database '${databaseName}' in Redshift.`, err);
    }
    throw err;
  }
};

const createDatabaseBIUser = async (redshiftClient: RedshiftDataClient, credential: BIUserCredential,
  props: CreateDatabaseAndSchemas) => {
  try {
    await executeStatementsWithWait(redshiftClient, [
      `CREATE USER ${credential.username} PASSWORD '${credential.password}'`,
    ], props.serverlessRedshiftProps, props.provisionedRedshiftProps,
    props.serverlessRedshiftProps?.databaseName ?? props.provisionedRedshiftProps?.databaseName, false);
  } catch (err) {
    if (err instanceof Error) {
      logger.error(`Error when creating BI user '${credential.username}' in Redshift.`, err);
    }
    throw err;
  }
};

const createSchemasInRedshift = async (redshiftClient: RedshiftDataClient,
  sqlStatementsByApp: Map<string, string[]>, props: CreateDatabaseAndSchemas) => {

  for (const [appId, sqlStatements] of sqlStatementsByApp) {
    logger.info(`creating schema in serverless Redshift for ${appId}`);
    try {
      await executeStatementsWithWait(redshiftClient, sqlStatements,
        props.serverlessRedshiftProps, props.provisionedRedshiftProps, props.databaseName);
    } catch (err) {
      if (err instanceof Error) {
        logger.error('Error when creating schema in serverless Redshift, appId=' + appId, err);
      }
      throw err;
    }
  }
};

function generateRedshiftUserPassword(length: number): string {
  const password = generateRandomStr(length);
  return password;
}

export type AppUpdateProps = {
  createAppIds: string[];
  updateAppIds: string[];
  oldViewSqls: string[];
  oldSchemaSqlArray: string[];
}

function getAppUpdateProps(props: ResourcePropertiesType, oldProps: ResourcePropertiesType): AppUpdateProps {

  const oldAppIdArray: string[] = [];
  const oldViewSqlArray: string[] = [];
  const oldSchemaSqlArray: string[] = [];
  if (oldProps.appIds.trim().length > 0) {
    oldAppIdArray.push(...oldProps.appIds.trim().split(','));
  };
  for (const view of oldProps.reportingViewsDef) {
    oldViewSqlArray.push(`${view.viewName}.sql`);
  }
  logger.info(`old sql array: ${oldViewSqlArray}`);

  for (const schema of oldProps.schemaDefs) {
    oldSchemaSqlArray.push(schema.sqlFile);
  }
  logger.info(`old schema sql array: ${oldSchemaSqlArray}`);

  const appIdArray: string[] = [];
  if (props.appIds.trim().length > 0) {
    appIdArray.push(...props.appIds.trim().split(','));
  };

  logger.info(`props.appIds: ${props.appIds}`);
  logger.info(`oldProps.appIds: ${oldProps.appIds}`);
  logger.info(`appIdArray: ${appIdArray}`);
  logger.info(`oldAppIdArray: ${oldAppIdArray}`);

  const needCreateAppIds = appIdArray.filter(item => !oldAppIdArray.includes(item));
  logger.info(`apps need to be create: ${needCreateAppIds}`);

  const needUpdateAppIds = appIdArray.filter(item => oldAppIdArray.includes(item));
  logger.info(`apps need to be update: ${needUpdateAppIds}`);

  return {
    createAppIds: needCreateAppIds,
    updateAppIds: needUpdateAppIds,
    oldViewSqls: oldViewSqlArray,
    oldSchemaSqlArray: oldSchemaSqlArray,
  };
}