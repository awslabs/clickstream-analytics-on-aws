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
import { describeStatement, getRedshiftClient } from '../redshift-data';

const REDSHIFT_DATA_API_ROLE_ARN = process.env.REDSHIFT_DATA_API_ROLE!;

// Create an Amazon service client object.
const redshiftDataApiClient = getRedshiftClient(REDSHIFT_DATA_API_ROLE_ARN);

export interface CheckRefreshViewStatusEvent {
  detail: {
    queryId: string;
    viewName: string;
  };
  timezoneWithAppId: {
    appId: string;
    timezone: string;
  };
}

/**
 * The lambda function get refresh mv status in Redshift by query_id.
 * @param event CheckRefreshViewStatusEvent.
 * @returns {
 *  detail: {
 *    status: string,
 *    completeRefreshView: string,
 *  }
 * }
 */
export const _handler = async (event: CheckRefreshViewStatusEvent, context: Context) => {
  logger.debug(`context.awsRequestId:${context.awsRequestId}`);
  const timezoneWithAppId = event.timezoneWithAppId;
  const queryId = event.detail.queryId;
  const viewName = event.detail.viewName;
  logger.debug(`query_id:${queryId}`);
  const response = await describeStatement(redshiftDataApiClient, queryId);

  if (response.Status == StatusString.FINISHED) {
    logger.info('Refresh view status is FINISHED, view name: ', { viewName });
    return {
      detail: {
        status: response.Status,
        completeRefreshView: viewName,
      },
      timezoneWithAppId,
    };
  } else if (response.Status == StatusString.FAILED || response.Status == StatusString.ABORTED) {
    logger.error(`Executing ${queryId} , view: ${viewName},  status of statement is ${response.Status}`);
    return {
      detail: {
        queryId: queryId,
        status: response.Status,
        viewName: viewName,
        message: `Error: ${response.Error} , view: ${viewName}`,
      },
      timezoneWithAppId,
    };
  } else {
    logger.info(`Executing ${queryId} status of statement is ${response.Status}`);
    return {
      detail: {
        queryId: queryId,
        viewName: viewName,
        status: response.Status,
      },
      timezoneWithAppId,
    };
  }
};

export const handler = handleBackoffTimeInfo(_handler);