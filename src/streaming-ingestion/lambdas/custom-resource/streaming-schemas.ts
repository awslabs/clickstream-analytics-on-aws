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

import { generateRandomStr, logger } from '@aws/clickstream-base-lib';
import { CdkCustomResourceHandler, CdkCustomResourceResponse, CloudFormationCustomResourceEvent, Context } from 'aws-lambda';
import { executeStatementsWithWait, getRedshiftClient } from '../../../analytics/lambdas/redshift-data';
import { SQLDef } from '../../../analytics/private/model';
import { getSqlContent, getSqlContents } from '../../../analytics/private/utils';
import { createSchemasInRedshiftAsync } from '../../../common/custom-resource-exec-in-redshift';
import { planAppChanges } from '../../../common/custom-resources';
import { STREAMING_SCHEMA_SUFFIX } from '../../private/constant';
import { getSinkStreamName } from '../../private/utils';
import { StreamingIngestionSchemas, MustacheParamType } from '../../redshift/model';

export type ResourcePropertiesType = StreamingIngestionSchemas & {
  readonly ServiceToken: string;
}

export const physicalIdPrefix = 'streaming-ingestion-redshift-schemas-custom-resource-';
export const handler: CdkCustomResourceHandler = async (event: CloudFormationCustomResourceEvent, _context: Context) => {
  const physicalId = ('PhysicalResourceId' in event) ? event.PhysicalResourceId :
    `${physicalIdPrefix}${generateRandomStr(8, 'abcdefghijklmnopqrstuvwxyz0123456789')}`;
  const response: CdkCustomResourceResponse = {
    PhysicalResourceId: physicalId,
    Data: {
    },
    Status: 'SUCCESS',
  };

  const props = event.ResourceProperties as ResourcePropertiesType;

  try {
    const { toBeAdded, toBeUpdated, toBeDeleted } = planAppChanges(event);

    logger.info('App changing info: ', {
      toBeAdded,
      toBeUpdated,
      toBeDeleted,
    });

    if (toBeAdded.length > 0 || toBeUpdated.length > 0) {
      const addedOrUpdated = [
        ...toBeAdded,
        ...toBeUpdated,
      ];

      const schemaSqlsByAppId: Map<string, string[]> = getCreateOrUpdateStreamingSchemasSQL(
        props.projectId, props.streamingRoleArn, addedOrUpdated, props.schemaDefs, props.identifier, props.biUsername);

      await createSchemasInRedshiftAsync(props.projectId, schemaSqlsByAppId);
    }

    if (toBeDeleted.length > 0) {
      const redshiftClient = getRedshiftClient(props.dataAPIRole);
      for (const app of toBeDeleted) {
        logger.info(`Removing views and schema of streaming for app '${app}'.`);
        const streamSchemaName = `${app}${STREAMING_SCHEMA_SUFFIX}`;
        try {
          await executeStatementsWithWait(redshiftClient, [`DROP SCHEMA IF EXISTS ${streamSchemaName} CASCADE;`],
            props.serverlessRedshiftProps, props.provisionedRedshiftProps, props.databaseName);
        } catch (err) {
          logger.error(`Error happened when drop streaming schema '${streamSchemaName}' in Redshift.`, { err });
          throw err;
        }
      }
    }
  } catch (e) {
    logger.error('Error when managing streaming schema in redshift', { e });
    throw e;
  }
  return response;
};

function getCreateOrUpdateStreamingSchemasSQL(
  projectId: string, streamingRoleArn: string,
  appIdList: string[], schemaDefs: SQLDef[],
  identifier: string, biUsername: string) {
  logger.info('getCreateOrUpdateStreamingSchemasSQL()', { appIdList });

  const sqlStatementsByApp = new Map<string, string[]>();

  for (const app of appIdList) {

    const streamSchemaName = `${app}${STREAMING_SCHEMA_SUFFIX}`;
    const sqlStatements: string[] = [];
    const mustacheParam: MustacheParamType = {
      stream_schema: streamSchemaName,
      app_schema: app,
      user_bi: biUsername,
      kinesis_data_stream_name: getSinkStreamName(projectId, app, identifier),
    };

    sqlStatements.push(`CREATE EXTERNAL SCHEMA IF NOT EXISTS ${streamSchemaName} FROM KINESIS IAM_ROLE '${streamingRoleArn}'`);
    for (const sqlDef of schemaDefs) {
      if (sqlDef.multipleLine !== undefined && sqlDef.multipleLine === 'true') {
        logger.info('multipleLine SQL: ', sqlDef.sqlFile);
        sqlStatements.push(...getSqlContents(sqlDef, mustacheParam));
      } else {
        sqlStatements.push(getSqlContent(sqlDef, mustacheParam));
      }
    }
    sqlStatementsByApp.set(app, sqlStatements);
    logger.info('set sqls for app', { app, sqlStatements });
  };

  return sqlStatementsByApp;
}