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

import { DescribeStatementCommand, RedshiftDataClient } from '@aws-sdk/client-redshift-data';
import { logger } from '../../../common/powertools';
import { readS3ObjectAsString } from '../../../common/s3';
import { executeStatements, getRedshiftClient } from '../redshift-data';

export interface EventType {
  queryId?: string;
  sql?: string;
}

export interface SubmitSqlResponse {
  queryId: string;
}

export interface QueryResponse {
  status: string;
  queryId: string;
  reason?: string;
}

export type ResponseType = SubmitSqlResponse | QueryResponse;

const databaseName = process.env.REDSHIFT_DATABASE!;
const clusterIdentifier = process.env.REDSHIFT_CLUSTER_IDENTIFIER ?? '';
const dbUser = process.env.REDSHIFT_DB_USER ?? '';
const workgroupName = process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME ?? '';
const dataAPIRole = process.env.REDSHIFT_DATA_API_ROLE!;

export const handler = async (event: EventType): Promise<ResponseType> => {
  try {
    return await _handler(event);
  } catch (e) {
    if (e instanceof Error) {
      logger.error(e.message, e);
    }
    throw e;
  }
};

async function _handler(event: EventType): Promise<ResponseType> {

  const redShiftClient = getRedshiftClient(dataAPIRole);

  if (event.sql) {
    return submitSql(event.sql, redShiftClient);
  } else if (event.queryId) {
    return queryStatus(event.queryId, redShiftClient);
  } else {
    logger.error('event', { event });
    throw new Error('Invalid event');
  }
}

async function submitSql(sql: string, redShiftClient: RedshiftDataClient): Promise<SubmitSqlResponse> {
  logger.info('submitSql() sql: ' + sql);

  const provisionedRedshiftProps = {
    clusterIdentifier,
    databaseName,
    dbUser: dbUser,
  };

  const serverlessRedshiftProps = {
    workgroupName,
    databaseName,
  };

  const sqlStatements = await getSqlStatement(sql);

  const queryId = await executeStatements(redShiftClient, sqlStatements, serverlessRedshiftProps, provisionedRedshiftProps, databaseName, true);
  logger.info('submitSql() get queryId: ' + queryId);

  return {
    queryId: queryId!,
  };
}

async function queryStatus(queryId: string, redShiftClient: RedshiftDataClient): Promise<QueryResponse> {
  logger.info('queryStatus() queryId: ' + queryId);

  const checkParams = new DescribeStatementCommand({
    Id: queryId,
  });
  let response = await redShiftClient.send(checkParams);
  logger.info(`queryId '${queryId}', status: ${response.Status}`);
  let errorMsg = response.Error;
  if (response.Status == 'FAILED') {
    logger.error(`Error: ${response.Error}`);

    if (errorMsg?.includes('already exists')) {
      logger.info(`queryId '${queryId}' object already exists, return success`);
      return {
        status: 'FINISHED',
        queryId: queryId,
        reason: errorMsg,
      };
    }
  }

  return {
    status: response.Status!,
    queryId: queryId,
    reason: errorMsg,
  };
}

async function getSqlStatement(sqlOrFile: string): Promise<string[]> {
  logger.info('getSqlStatement() sqlOrFile: ' + sqlOrFile);

  let sql = sqlOrFile;
  if (sqlOrFile.startsWith('s3://')) {
    sql = await readSqlFileFromS3(sqlOrFile);
  }
  return [sql];
}

async function readSqlFileFromS3(s3Path: string): Promise<string> {
  logger.info('readSqlFileFromS3() s3Path: ' + s3Path);

  const params = {
    Bucket: s3Path.split('/')[2],
    Key: s3Path.split('/').slice(3).join('/'),
  };

  const sqlString = await readS3ObjectAsString(params.Bucket, params.Key);
  if (!sqlString) {
    throw new Error('Failed to read sql file from s3: ' + s3Path);
  }
  return sqlString;
}
