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

import { StatusString } from '@aws-sdk/client-redshift-data';
import { Context } from 'aws-lambda';
import { logger } from '../../../common/powertools';
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

export interface CheckRefreshViewStatusEvent {
  detail: {
    queryId: string;
    appId: string;
    taskType: string;
    taskName: string;
  };
  originalInput: {
    forceRefresh: string;
    refreshDate: string;
  };
}

/**
 * The lambda function get scan metadata status in Redshift by query_id.
 * @param event CheckScanMetadataStatusEvent.
 * @returns The scan metadata results of query_id.
 */
export const _handler = async (event: CheckRefreshViewStatusEvent, context: Context) => {
  logger.debug(`context.awsRequestId:${context.awsRequestId}`);
  const queryId = event.detail.queryId;
  const appId = event.detail.appId;
  const taskType = event.detail.taskType;
  const refreshDate = event.originalInput.refreshDate;
  const forceRefresh = event.originalInput.forceRefresh;
  const taskName = event.detail.taskName;
  logger.debug(`query_id:${queryId}`);
  // There is a scan metadata job need to check result.
  const response = await describeStatement(redshiftDataApiClient, queryId);

  if (response.Status == StatusString.FINISHED) {
    logger.info('Refresh view status is FINISHED, view name: ', { taskType });
    if (forceRefresh !== 'true' && taskType === 'SP') {
      // insert table_refresh_mv_sp_status table
      const sqlStatements: string[] = [];

      sqlStatements.push(`INSERT INTO ${appId}.refresh_mv_sp_status (refresh_name, refresh_type, refresh_date) VALUES ('${taskName}', '${taskType}', '${refreshDate}');`);
      await executeStatements(redshiftDataApiClient, sqlStatements, redshiftProps.serverlessRedshiftProps, redshiftProps.provisionedRedshiftProps);
    }
    return {
      detail: {
        status: response.Status,
        completeRefreshView: taskName,
      },
      appId: appId,
    };
  } else if (response.Status == StatusString.FAILED || response.Status == StatusString.ABORTED) {
    logger.error(`Executing ${queryId} , view: ${taskType},  status of statement is ${response.Status}`);
    return {
      detail: {
        id: queryId,
        appId: appId,
        status: response.Status,
        taskType: taskType,
        taskName: taskName,
        message: `Error: ${response.Error} , view: ${taskType}`,
      },
    };
  } else {
    logger.info(`Executing ${queryId} status of statement is ${response.Status}`);
    return {
      detail: {
        id: queryId,
        appId: appId,
        taskType: taskType,
        taskName: taskName,
        status: response.Status,
      },
    };
  }
};

export const handler = handleBackoffTimeInfo(_handler);