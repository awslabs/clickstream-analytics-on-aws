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

import { logger } from '@aws/clickstream-base-lib';
import { StatusString } from '@aws-sdk/client-redshift-data';
import { Context } from 'aws-lambda';
import { handleBackoffTimeInfo } from '../../../common/workflow';
import { describeStatement, getRedshiftClient, executeStatements, getRedshiftProps } from '../redshift-data';

const REDSHIFT_DATA_API_ROLE_ARN = process.env.REDSHIFT_DATA_API_ROLE!;
const REDSHIFT_DATABASE = process.env.REDSHIFT_DATABASE!;

// Create an Amazon service client object.
const redshiftDataApiClient = getRedshiftClient(REDSHIFT_DATA_API_ROLE_ARN);

const redshiftProps = getRedshiftProps(
  process.env.REDSHIFT_MODE!,
  REDSHIFT_DATABASE,
  REDSHIFT_DATA_API_ROLE_ARN,
  process.env.REDSHIFT_DB_USER!,
  process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME!,
  process.env.REDSHIFT_CLUSTER_IDENTIFIER!,
);

export interface CheckRefreshSpStatusEvent {
  detail: {
    queryId: string;
    spName: string;
    refreshDate: string;
  };
  originalInput: {
    forceRefresh: string;
    appId: string;
  };
}

/**
 * The lambda function get refresh sp status in Redshift by query_id.
 * @param event CheckRefreshSpStatusEvent.
 * @returns {
 * detail: {
 *  status: string,
 *  completeRefreshSp: string,
 * }
 * }
 */
export const _handler = async (event: CheckRefreshSpStatusEvent, context: Context) => {
  logger.debug(`context.awsRequestId:${context.awsRequestId}`);
  const queryId = event.detail.queryId;
  const appId = event.originalInput.appId;
  const refreshDate = event.detail.refreshDate;
  const forceRefresh = event.originalInput.forceRefresh;
  const spName = event.detail.spName;
  logger.debug(`query_id:${queryId}`);

  const response = await describeStatement(redshiftDataApiClient, queryId);

  if (response.Status == StatusString.FINISHED) {
    if (forceRefresh !== 'true') {
      const sqlStatements: string[] = [];

      sqlStatements.push(`INSERT INTO ${appId}.refresh_mv_sp_status (refresh_name, refresh_type, refresh_date, triggerred_by) VALUES ('${spName}', 'SP', '${refreshDate}', 'WORK_FLOW');`);
      await executeStatements(redshiftDataApiClient, sqlStatements, redshiftProps.serverlessRedshiftProps, redshiftProps.provisionedRedshiftProps);
    } else {
      const sqlStatements: string[] = [];
      sqlStatements.push(`INSERT INTO ${appId}.refresh_mv_sp_status (refresh_name, refresh_type, refresh_date, triggerred_by) VALUES ('${spName}', 'SP', '${refreshDate}', 'MANUALLY');`);
      await executeStatements(redshiftDataApiClient, sqlStatements, redshiftProps.serverlessRedshiftProps, redshiftProps.provisionedRedshiftProps);
    }
    return {
      detail: {
        status: response.Status,
        completeRefreshSp: spName,
      },
    };
  } else if (response.Status == StatusString.FAILED || response.Status == StatusString.ABORTED) {
    logger.error(`Executing ${queryId} ,status of statement is ${response.Status}`);
    return {
      detail: {
        queryId: queryId,
        status: response.Status,
        spName: spName,
        message: `Error: ${response.Error}`,
      },
    };
  } else {
    logger.info(`Executing ${queryId} status of statement is ${response.Status}`);
    return {
      detail: {
        queryId: queryId,
        spName: spName,
        refreshDate: refreshDate,
        status: response.Status,
      },
    };
  }
};

export const handler = handleBackoffTimeInfo(_handler);