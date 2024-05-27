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
import { ClearExpiredEventsEventDetail } from '../../private/model';
import { describeStatement, getRedshiftClient } from '../redshift-data';

const REDSHIFT_DATA_API_ROLE_ARN = process.env.REDSHIFT_DATA_API_ROLE!;

// Create an Amazon service client object.
const redshiftDataApiClient = getRedshiftClient(REDSHIFT_DATA_API_ROLE_ARN);

export interface ClearExpiredEventsEvent {
  detail: ClearExpiredEventsEventDetail;
}

/**
 * The lambda function get clear expired events status in Redshift by query_id.
 * @param event ScheduleEvent.
 * @returns The clear expired events results of query_id.
 */
export const handler = async (event: ClearExpiredEventsEvent) => {
  logger.debug('request event:', { event });

  const queryId = event.detail.id;
  const appId = event.detail.appId;
  logger.debug(`query_id:${queryId}`);
  // There is a clear job need to check result.
  const response = await describeStatement(redshiftDataApiClient, queryId);

  if (response.Status == StatusString.FINISHED) {
    logger.info('Clear expired events success.');
    return {
      detail: {
        appId: appId,
        status: response.Status,
        message: 'clearing expired events ran successfully.',
      },
    };
  } else if (response.Status == StatusString.FAILED || response.Status == StatusString.ABORTED) {
    logger.info(`Executing ${queryId} status of statement is ${response.Status}`);
    return {
      detail: {
        id: queryId,
        appId: appId,
        status: response.Status,
        message: 'Error:' + response.Error,
      },
    };
  } else {
    logger.info(`Executing ${queryId} status of statement is ${response.Status}`);
    return {
      detail: {
        id: queryId,
        appId: appId,
        status: response.Status,
      },
    };
  }
};
