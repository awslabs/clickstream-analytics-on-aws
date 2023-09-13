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

import { CdkCustomResourceHandler, CdkCustomResourceEvent, CdkCustomResourceResponse, CloudFormationCustomResourceEvent, Context, CloudFormationCustomResourceUpdateEvent } from 'aws-lambda';
import { executeStatementsWithWait, getRedshiftClient } from '../../../analytics/lambdas/redshift-data';
import { ExistingRedshiftServerlessCustomProps, ProvisionedRedshiftProps } from '../../../analytics/private/model';
import { getSqlContent, getSqlContents } from '../../../analytics/private/utils';
import { logger } from '../../../common/powertools';
import { getSinkStreamName, splitString, waitForRedshiftIAMRolesUpdating, getMVName } from '../../common/utils';
import { CreateStreamingIngestionSchemas, MustacheParamType } from '../../redshift/model';

type SchemasInRedshiftProps = {
  dataAPIRole: string;
  serverlessRedshiftProps?: ExistingRedshiftServerlessCustomProps;
  provisionedRedshiftProps?: ProvisionedRedshiftProps;
  databaseName: string;
}

const createSchemasInRedshift = async (
  sqlStatements: string[],
  props: SchemasInRedshiftProps) => {
  try {
    const redshiftClient = getRedshiftClient(props.dataAPIRole);
    await executeStatementsWithWait(redshiftClient, sqlStatements,
      props.serverlessRedshiftProps, props.provisionedRedshiftProps, props.databaseName);
  } catch (err) {
    if (err instanceof Error) {
      logger.error('Error when creating schema in serverless Redshift.', err);
    }
    throw err;
  }
};

export type ResourcePropertiesType = CreateStreamingIngestionSchemas & {
  readonly ServiceToken: string;
}

export const handler: CdkCustomResourceHandler = async (event: CloudFormationCustomResourceEvent, context: Context) => {
  const response: CdkCustomResourceResponse = {
    Data: {
      DatabaseName: event.ResourceProperties.databaseName,
    },
    Status: 'SUCCESS',
  };

  try {
    await _handler(event, context);
  } catch (e) {
    if (e instanceof Error) {
      logger.error('Error when creating streaming ingestion schema in redshift', e);
    }
    throw e;
  }
  return response;
};

async function _handler(event: CdkCustomResourceEvent, context: Context) {
  const requestType = event.RequestType;

  logger.info('RequestType: ' + requestType + ' ' + context.awsRequestId);
  if (requestType == 'Create') {
    await onCreate(event);
  }

  if (requestType == 'Update') {
    await onUpdate(event);
  }

  if (requestType == 'Delete') {
    await onDelete(event);
  }
}

async function onCreate(event: CdkCustomResourceEvent) {
  logger.info('onCreate()');

  const props = event.ResourceProperties as ResourcePropertiesType;
  await waitForRedshiftIAMRolesUpdating(60);

  // 1. create schemas in Redshift for streaming ingestion
  await createSchemas(props);

  // 2. create views for reporting
  await createViewForReporting(props);
}

async function onUpdate(event: CloudFormationCustomResourceUpdateEvent) {
  logger.info('onUpdate()');

  const oldProps = event.OldResourceProperties as ResourcePropertiesType;
  const props = event.ResourceProperties as ResourcePropertiesType;
  await waitForRedshiftIAMRolesUpdating(60);

  await updateSchemas(props, oldProps);

  await updateViewForReporting(props, oldProps);

}

async function onDelete(event: CdkCustomResourceEvent) {
  logger.info('onDelete()' + event.RequestType);
  const props = event.ResourceProperties as ResourcePropertiesType;
  await deleteSchemas(props);
  logger.info('Delete schema and keep the database');
}

async function createSchemas(props: ResourcePropertiesType) {

  const appIds = splitString(props.appIds);

  const sqlStatements : string[] = [];
  sqlStatements.push(`CREATE EXTERNAL SCHEMA IF NOT EXISTS kds FROM KINESIS IAM_ROLE '${props.streamingIngestionProps.streamingIngestionRoleArn}'`);
  for (const app of appIds) {
    const mustacheParam: MustacheParamType = {
      schema: app,
      kinesis_data_stream_name: getSinkStreamName(props.projectId, app, props.stackShortId),
    };

    for (const sqlDef of props.schemaDefs) {
      if (sqlDef.multipleLine === 'true' ) {
        logger.info('multipleLine SQL: ', sqlDef.sqlFile);
        sqlStatements.push(...getSqlContents(sqlDef, mustacheParam));
      } else {
        sqlStatements.push(getSqlContent(sqlDef, mustacheParam));
      }
    }
  };

  if (sqlStatements.length == 0) {
    logger.info('Ignore creating schema in Redshift due to there is no application.');
  } else {
    const schemasInRedshiftProps: SchemasInRedshiftProps = {
      serverlessRedshiftProps: props.serverlessRedshiftProps,
      provisionedRedshiftProps: props.provisionedRedshiftProps,
      databaseName: props.databaseName,
      dataAPIRole: props.dataAPIRole,
    };
    for (const sql of sqlStatements) {
      try {
        await createSchemasInRedshift([sql], schemasInRedshiftProps);
      } catch (err) {
        if (sql.startsWith('CREATE MATERIALIZED VIEW ')) {
          const mvName = getMVName(sql);
          await createSchemasInRedshift([`SHOW VIEW ${mvName}`], schemasInRedshiftProps);
          logger.info(`Ignore the error if MATERIALIZED VIEW ${mvName} already exists.`);
        } else {
          throw err;
        }
      }
    }
  }
}

async function updateSchemas(props: ResourcePropertiesType, oldProps: ResourcePropertiesType) {
  const appUpdateProps = getAppUpdateProps(props, oldProps);

  const sqlStatements : string[] = [];
  sqlStatements.push(`CREATE EXTERNAL SCHEMA IF NOT EXISTS kds FROM KINESIS IAM_ROLE '${props.streamingIngestionProps.streamingIngestionRoleArn}'`);
  let createIndex = 0;
  for (const app of appUpdateProps.createAppIds) {
    const mustacheParam: MustacheParamType = {
      schema: app,
      kinesis_data_stream_name: appUpdateProps.createStreamNames[createIndex++],
    };

    for (const sqlDef of props.schemaDefs) {
      if (sqlDef.multipleLine === 'true' ) {
        logger.info('multipleLine SQL: ', sqlDef.sqlFile);
        sqlStatements.push(...getSqlContents(sqlDef, mustacheParam));
        continue;
      }
      sqlStatements.push(getSqlContent(sqlDef, mustacheParam));
    }
  };

  let updateIndex = 0;
  for (const app of appUpdateProps.updateAppIds) {
    const mustacheParam: MustacheParamType = {
      schema: app,
      kinesis_data_stream_name: appUpdateProps.updateStreamNames[updateIndex++],
    };
    for (const schemaDef of props.schemaDefs) {

      logger.info(`viewDef.updatable: ${schemaDef}`);

      if (!appUpdateProps.oldSchemaSqlArray.includes(schemaDef.sqlFile)) {
        logger.info(`new sql: ${schemaDef.sqlFile}`);
        sqlStatements.push(getSqlContent(schemaDef, mustacheParam));
      } else {
        logger.info(`skip update ${schemaDef.sqlFile} due to it is not updatable.`);
      }
    }
  };
  await doUpdate(sqlStatements, props);
}

async function doUpdate(sqlStatements: string[], props: ResourcePropertiesType) {
  if (sqlStatements.length == 0) {
    logger.info('Ignore creating schema in Redshift due to there is no application.');
  } else {
    const schemasInRedshiftProps: SchemasInRedshiftProps = {
      serverlessRedshiftProps: props.serverlessRedshiftProps,
      provisionedRedshiftProps: props.provisionedRedshiftProps,
      databaseName: props.databaseName,
      dataAPIRole: props.dataAPIRole,
    };
    await createSchemasInRedshift(sqlStatements, schemasInRedshiftProps);
  }
}

async function deleteSchemas(props: ResourcePropertiesType) {
  const schemasInRedshiftProps: SchemasInRedshiftProps = {
    serverlessRedshiftProps: props.serverlessRedshiftProps,
    provisionedRedshiftProps: props.provisionedRedshiftProps,
    databaseName: props.databaseName,
    dataAPIRole: props.dataAPIRole,
  };
  const sqlStatements : string[] = [];
  sqlStatements.push('DROP SCHEMA IF EXISTS kds CASCADE');
  try {
    await createSchemasInRedshift(sqlStatements, schemasInRedshiftProps);
  } catch (err) {
    logger.info('Ignore the Error when try to delete the schema.');
  }
}

async function createViewForReporting(props: ResourcePropertiesType) {
  const appIds = splitString(props.appIds);

  const sqlStatements : string[] = [];
  for (const app of appIds) {
    const mustacheParam: MustacheParamType = {
      schema: app,
      kinesis_data_stream_name: getSinkStreamName(props.projectId, app, props.stackShortId),
    };

    for (const viewDef of props.reportingViewsDef) {
      sqlStatements.push(getSqlContent(viewDef, mustacheParam));
    }
  };

  if (sqlStatements.length == 0) {
    logger.info('Ignore creating reporting views in Redshift due to there is no application.');
  } else {
    const schemasInRedshiftProps: SchemasInRedshiftProps = {
      serverlessRedshiftProps: props.serverlessRedshiftProps,
      provisionedRedshiftProps: props.provisionedRedshiftProps,
      databaseName: props.databaseName,
      dataAPIRole: props.dataAPIRole,
    };
    await createSchemasInRedshift(sqlStatements, schemasInRedshiftProps);
  }
}

async function updateViewForReporting(props: ResourcePropertiesType, oldProps: ResourcePropertiesType) {

  const appUpdateProps = getAppUpdateProps(props, oldProps);
  const sqlStatements : string[] = [];

  let createIndex = 0;
  for (const app of appUpdateProps.createAppIds) {
    const mustacheParam: MustacheParamType = {
      schema: app,
      kinesis_data_stream_name: appUpdateProps.createStreamNames[createIndex++],
    };
    for (const viewDef of props.reportingViewsDef) {
      sqlStatements.push(getSqlContent(viewDef, mustacheParam));
    }
  };

  let updateIndex = 0;
  for (const app of appUpdateProps.updateAppIds) {
    const mustacheParam: MustacheParamType = {
      schema: app,
      kinesis_data_stream_name: appUpdateProps.updateStreamNames[updateIndex++],
    };
    for (const viewDef of props.reportingViewsDef) {

      logger.info(`viewDef.updatable: ${viewDef}`);

      if (!appUpdateProps.oldViewSqls.includes(viewDef.sqlFile)) {
        logger.info(`new view: ${viewDef.sqlFile}`);
        sqlStatements.push(getSqlContent(viewDef, mustacheParam));
      } else {
        logger.info(`skip update ${viewDef.sqlFile} due to it is not updatable.`);
      }
    }
  };

  if (sqlStatements.length == 0) {
    logger.info('Ignore creating reporting views in Redshift due to there is no application.');
  } else {
    const schemasInRedshiftProps: SchemasInRedshiftProps = {
      serverlessRedshiftProps: props.serverlessRedshiftProps,
      provisionedRedshiftProps: props.provisionedRedshiftProps,
      databaseName: props.databaseName,
      dataAPIRole: props.dataAPIRole,
    };
    await createSchemasInRedshift(sqlStatements, schemasInRedshiftProps);
  }

}

export type AppUpdateProps = {
  createAppIds: string[];
  updateAppIds: string[];
  oldViewSqls: string[];
  oldSchemaSqlArray: string[];
  createStreamNames: string[];
  updateStreamNames: string[];
}

function getAppUpdateProps(props: ResourcePropertiesType, oldProps: ResourcePropertiesType): AppUpdateProps {

  const oldAppIdArray: string[] = [];
  const oldViewSqlArray: string[] = [];
  const oldSchemaSqlArray: string[] = [];
  const oldStreamNameArray: string[] = [];
  if ( oldProps.appIds.trim().length > 0 ) {
    oldAppIdArray.push(...oldProps.appIds.trim().split(','));
  };
  for (const view of oldProps.reportingViewsDef) {
    oldViewSqlArray.push(view.sqlFile);
  }
  logger.info(`old sql array: ${oldViewSqlArray}`);

  for (const schema of oldProps.schemaDefs) {
    oldSchemaSqlArray.push(schema.sqlFile);
  }
  logger.info(`old schema sql array: ${oldSchemaSqlArray}`);

  if (oldProps.appIds) {
    const appIds = splitString(oldProps.appIds);
    for (const app of appIds) {
      oldStreamNameArray.push(getSinkStreamName(oldProps.projectId, app, oldProps.stackShortId));
    }
  }

  const appIdArray: string[] = [];
  if ( props.appIds.trim().length > 0 ) {
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

  const streamNameArray: string[] = [];
  let needCreateStreamNames: string[] = [];
  let needUpdateStreamNames: string[] = [];
  if (props.appIds) {
    const appIds = splitString(props.appIds);
    for (const app of appIds) {
      streamNameArray.push(getSinkStreamName(props.projectId, app, props.stackShortId));
    }
    logger.info(`old stream name array: ${oldStreamNameArray}`);
    logger.info(`stream name array: ${streamNameArray}`);

    needCreateStreamNames = streamNameArray.filter(item => !oldStreamNameArray.includes(item));
    logger.info(`stream name need to be create: ${needCreateStreamNames}`);

    needUpdateStreamNames = streamNameArray.filter(item => oldStreamNameArray.includes(item));
    logger.info(`stream need to be update: ${needUpdateStreamNames}`);
  }

  return {
    createAppIds: needCreateAppIds,
    updateAppIds: needUpdateAppIds,
    oldViewSqls: oldViewSqlArray,
    oldSchemaSqlArray: oldSchemaSqlArray,
    createStreamNames: needCreateStreamNames,
    updateStreamNames: needUpdateStreamNames,
  };
}
