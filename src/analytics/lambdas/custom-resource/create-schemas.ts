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
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { CdkCustomResourceHandler, CdkCustomResourceEvent, CdkCustomResourceResponse, CloudFormationCustomResourceEvent, Context, CloudFormationCustomResourceUpdateEvent } from 'aws-lambda';
import { getFunctionTags } from '../../../common/lambda/tags';
import { BIUserCredential } from '../../../common/model';
import { logger } from '../../../common/powertools';
import { putStringToS3 } from '../../../common/s3';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';
import { generateRandomStr, sleep } from '../../../common/utils';
import { SQL_TEMPLATE_PARAMETER } from '../../private/constant';
import { CreateDatabaseAndSchemas, MustacheParamType } from '../../private/model';
import { getSqlContent, getSqlContents } from '../../private/utils';
import { getRedshiftClient, executeStatementsWithWait } from '../redshift-data';

export type ResourcePropertiesType = CreateDatabaseAndSchemas & {
  readonly ServiceToken: string;
}

const secretManagerClient = new SecretsManagerClient({
  ...aws_sdk_client_common_config,
});

const sfnClient = new SFNClient({
  ...aws_sdk_client_common_config,
});

const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN!;
const S3_BUCKET = process.env.S3_BUCKET!;
const S3_PREFIX = process.env.S3_PREFIX!;

export const physicalIdPrefix = 'create-redshift-db-schemas-custom-resource-';
export const handler: CdkCustomResourceHandler = async (event: CloudFormationCustomResourceEvent, context: Context) => {

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
      logger.error('Error when creating database and schema in redshift', { error: e.message });
    }
    if (!isSuppressALLError()) {
      throw e;
    }
  }
  return response;
};

async function _handler(event: CdkCustomResourceEvent, biUsername: string, context: Context) {
  const requestType = event.RequestType;

  logger.info('RequestType: ' + requestType);
  if (requestType == 'Create' || requestType == 'Update') {
    const funcTags = await getFunctionTags(context);
    const tags: Tag[] = [];
    for (let [key, value] of Object.entries(funcTags as any)) {
      tags.push({
        Key: key,
        Value: value as string,
      });
    }
    logger.info('tags', { tags });

    await onCreateOrUpdate(event, biUsername, tags);
  }

  if (requestType == 'Delete') {
    await onDelete(event, biUsername);
  }
}

async function onCreateOrUpdate(event: CdkCustomResourceEvent, biUsername: string, tags: Tag[]) {
  const requestType = event.RequestType;
  const isCreate = requestType == 'Create';
  const props = event.ResourceProperties as ResourcePropertiesType;

  const newAddedAppIdList = getNewAddedAppIdList(event);
  logger.info('onCreateOrUpdate()', { requestType, newAddedAppIdList });

  // 1. create database in Redshift
  const client = getRedshiftClient(props.dataAPIRole);
  if (props.serverlessRedshiftProps || props.provisionedRedshiftProps) {
    if (isCreate) {
      //generate password and save to parameter store
      const credential = await createBIUserCredentialSecret(props.redshiftBIUserParameter, biUsername, props.projectId, tags);
      await createDatabaseInRedshift(client, props.databaseName, props);
      await createDatabaseBIUser(client, credential, props);
    }
  } else {
    throw new Error('Can\'t identity the mode Redshift cluster!');
  }

  // 2. create schemas in Redshift for applications
  const schemaSqlsByAppId: Map<string, string[]> = getCreateOrUpdateSchemasSQL(newAddedAppIdList, props, biUsername);

  // 3. create views for reporting
  const viewSqlsByAppId: Map<string, string[]> = getCreateOrUpdateViewForReportingSQL(newAddedAppIdList, props, biUsername);

  const allSqlsByAppId = mergeMap(schemaSqlsByAppId, viewSqlsByAppId);

  await createSchemasInRedshiftAsync(props.projectId, allSqlsByAppId);

}


function getNewAddedAppIdList(event: CdkCustomResourceEvent): string[] {
  const requestType = event.RequestType;
  const props = event.ResourceProperties as ResourcePropertiesType;
  const appIdList = splitString(props.appIds ?? '');
  const lastModifiedTime = props.lastModifiedTime;
  const isUpdate = requestType == 'Update';

  const applyAllAppSql = process.env.APPLY_ALL_APP_SQL === 'true';
  logger.info('getNewAddedAppIdList()', { requestType, applyAllAppSql, isUpdate });

  let newAddedAppIdList = appIdList;
  if (isUpdate && !applyAllAppSql) {
    const oldAppIds = ((event as CloudFormationCustomResourceUpdateEvent).OldResourceProperties as ResourcePropertiesType).appIds;
    const oldAppIdList = splitString(oldAppIds ?? '');
    const oldLastModifiedTime = ((event as CloudFormationCustomResourceUpdateEvent).OldResourceProperties as ResourcePropertiesType).lastModifiedTime;
    logger.info('getNewAddedAppIdList()', { requestType, oldAppIdList, oldLastModifiedTime, appIdList, lastModifiedTime });
    if (lastModifiedTime === oldLastModifiedTime) {
      newAddedAppIdList = [];
      for (const appId of appIdList) {
        if (!oldAppIdList.includes(appId)) {
          logger.info(`appId ${appId} is not in oldAppIdList ${oldAppIdList}`);
          newAddedAppIdList.push(appId);
        }
      }
    }
  }
  return newAddedAppIdList;
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

function getCreateOrUpdateSchemasSQL(newAddedAppIdList: string[], props: ResourcePropertiesType, biUsername: string) {
  const odsTableNames = props.odsTableNames;

  logger.info('createOrUpdateSchemas()', { newAddedAppIdList });

  const sqlStatementsByApp = new Map<string, string[]>();

  for (const app of newAddedAppIdList) {
    const sqlStatements: string[] = [];
    const mustacheParam: MustacheParamType = {
      database_name: props.projectId,
      schema: app,
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

  return sqlStatementsByApp;
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

function getCreateOrUpdateViewForReportingSQL(newAddedAppIdList: string[], props: ResourcePropertiesType, biUser: string) {
  const odsTableNames = props.odsTableNames;

  logger.info('createOrUpdateViewForReporting()', { newAddedAppIdList });

  const sqlStatementsByApp = new Map<string, string[]>();
  for (const app of newAddedAppIdList) {
    const sqlStatements: string[] = [];
    const views: string[] = [];
    const mustacheParam: MustacheParamType = {
      database_name: props.projectId,
      schema: app,
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
  return sqlStatementsByApp;
}


const createDatabaseInRedshift = async (redshiftClient: RedshiftDataClient, databaseName: string,
  props: CreateDatabaseAndSchemas, owner?: string) => {
  try {
    const ownerStatement = owner ? ` WITH OWNER "${owner}"` : '';
    await executeStatementsWithWait(redshiftClient, [`CREATE DATABASE ${databaseName}${ownerStatement};`],
      props.serverlessRedshiftProps, props.provisionedRedshiftProps);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('already exists')) {
        logger.error(`Database '${databaseName}' already exists in Redshift.`);
      } else {
        logger.error(`Error happened when creating database '${databaseName}' in Redshift.`, err);
      }
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
      if (err.message.includes('already exists')) {
        logger.error(`BI user '${credential.username}' already exists in Redshift.`);
      } else {
        logger.error(`Error when creating BI user '${credential.username}' in Redshift.`, err);
      }
    }
    throw err;
  }
};

const createSchemasInRedshiftAsync = async (projectId: string, sqlStatementsByApp: Map<string, string[]>) => {

  const createSchemasInRedshiftForApp = async (appId: string, sqlStatements: string[]) => {
    logger.info(`creating schema in serverless Redshift for ${appId}`);
    await executeSqlsByStateMachine(sqlStatements, projectId, appId);
  };

  for (const [appId, sqlStatements] of sqlStatementsByApp) {
    await createSchemasInRedshiftForApp(appId, sqlStatements);
    await sleep(process.env.SUBMIT_SQL_INTERVAL_MS ? parseInt(process.env.SUBMIT_SQL_INTERVAL_MS) : 1000);
  }

};

const executeSqlsByStateMachine = async (sqlStatements: string[], projectId: string, appId: string) => {

  const s3Paths = [];
  let index = 0;
  const timestamp = new Date().toISOString().replace(/[:.-]/g, '');

  for (const sqlStatement of sqlStatements) {
    const bucketName = S3_BUCKET;
    const fileName = `${appId}-${timestamp}/${index++}.sql`;
    const key = `${S3_PREFIX}tmp/${projectId}/sqls/${fileName}`;

    await putStringToS3(sqlStatement, bucketName, key);

    const s3Path = `s3://${bucketName}/${key}`;
    s3Paths.push(s3Path);
  }

  const params = {
    stateMachineArn: STATE_MACHINE_ARN,
    name: `${appId}-${timestamp}-${index}`,
    input: JSON.stringify({
      sqls: s3Paths,
    }),
  };
  logger.info('executeSqlsByStateMachine()', { params });
  try {
    const res = await sfnClient.send(new StartExecutionCommand(params));
    logger.info('executeSqlsByStateMachine()', { res });
    return res;
  } catch (err) {
    if (err instanceof Error) {
      logger.error('Error happened when executing sqls in state machine.', err);
    }
    throw err;
  }
};


function mergeMap(map1: Map<string, string[]>, map2: Map<string, string[]>): Map<string, string[]> {
  const mergedMap = new Map<string, string[]>();
  for (const [key, value] of map1) {
    mergedMap.set(key, value);
  }
  for (const [key, value] of map2) {
    if (mergedMap.has(key)) {
      mergedMap.get(key)?.push(...value);
    } else {
      mergedMap.set(key, value);
    }
  }
  return mergedMap;
}

function generateRedshiftUserPassword(length: number): string {
  const password = generateRandomStr(length);
  return password;
}

function isSuppressALLError(): boolean {
  return process.env.SUPPRESS_ALL_ERROR === 'true';
}

