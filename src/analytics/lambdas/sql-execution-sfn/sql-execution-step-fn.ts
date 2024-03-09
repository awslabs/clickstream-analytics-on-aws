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
import { exeucteBySqlorS3File, getRedshiftClient } from '../redshift-data';
import { handleBackoffTimeInfo } from '../../../common/workflow';

interface EventType {
  queryId?: string;
  sql?: string;
}

interface SubmitSqlResponse {
  queryId: string;
}

interface QueryResponse {
  status: string;
  queryId: string;
  reason?: string;
}

type ResponseType = SubmitSqlResponse | QueryResponse;

const databaseName = process.env.REDSHIFT_DATABASE!;
const clusterIdentifier = process.env.REDSHIFT_CLUSTER_IDENTIFIER ?? '';
const dbUser = process.env.REDSHIFT_DB_USER ?? '';
const workgroupName = process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME ?? '';
const dataAPIRole = process.env.REDSHIFT_DATA_API_ROLE!;

export const handler = handleBackoffTimeInfo(_handler);

async function _handler(event: EventType): Promise<ResponseType> {
  try {
    return await _handlerImpl(event);
  } catch (e) {
    if (e instanceof Error) {
      logger.error(e.message, e);
    }
    throw e;
  }
};

async function _handlerImpl(event: EventType): Promise<ResponseType> {

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

async function submitSql(sqlOrs3File: string, redShiftClient: RedshiftDataClient): Promise<SubmitSqlResponse> {
  logger.info('submitSql() sqlOrs3File: ' + sqlOrs3File);

  let provisionedRedshiftProps = undefined;
  let serverlessRedshiftProps = undefined;

  if (clusterIdentifier) {
    provisionedRedshiftProps = {
      clusterIdentifier,
      databaseName,
      dbUser: dbUser,
    };
  }

  if (workgroupName) {
    serverlessRedshiftProps = {
      workgroupName,
      databaseName,
    };
  }
  const res = await exeucteBySqlorS3File(sqlOrs3File, redShiftClient, serverlessRedshiftProps, provisionedRedshiftProps, databaseName);
  logger.info('submitSql() return queryId: ' + res.queryId);
  return {
    queryId: res.queryId,
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