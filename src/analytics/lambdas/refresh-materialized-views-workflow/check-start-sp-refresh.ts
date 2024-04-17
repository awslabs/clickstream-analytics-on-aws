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

import { utc } from 'moment-timezone';
import { getRefreshList } from './check-next-refresh-view';
import { RefreshWorkflowSteps } from '../../private/constant';
import { getRedshiftClient, executeStatementsWithWait, getRedshiftProps, getStatementResult } from '../redshift-data';

const REDSHIFT_DATA_API_ROLE_ARN = process.env.REDSHIFT_DATA_API_ROLE!;
const REDSHIFT_DATABASE = process.env.REDSHIFT_DATABASE!;

// Create an Amazon service client object.
const redshiftDataApiClient = getRedshiftClient(REDSHIFT_DATA_API_ROLE_ARN);

export interface CheckStartRefreshSpEvent {
  detail: {
    completeRefreshDate: string;
  };
  originalInput: {
    startRefreshViewNameOrSPName: string;
    latestJobTimestamp: string;
    forceRefresh: string;
  };
  timezoneWithAppId: {
    appId: string;
    timezone: string;
  };
}

/**
 * The lambda function to check reresh sp start or not.
 * @param event CheckRefreshSpStatusEvent.
 * @returns {
* detail: {
*  startRefreshViewNameOrSPName: string,
*  refreshDate: string,
*  appId: string,
*  timezone: string,
*  forceRefresh: string,
*  nextStep: 'REFRESH_SP' | 'END',
* }
* }
*/
export const handler = async (event: CheckStartRefreshSpEvent) => {
  const spList = getRefreshList().spViews;

  const timezoneWithAppId = event.timezoneWithAppId;

  const redshiftProps = getRedshiftProps(
    process.env.REDSHIFT_MODE!,
    REDSHIFT_DATABASE,
    REDSHIFT_DATA_API_ROLE_ARN,
    process.env.REDSHIFT_DB_USER!,
    process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME!,
    process.env.REDSHIFT_CLUSTER_IDENTIFIER!,
  );

  const dataFreshnessInHour = process.env.DATA_REFRESHNESS_IN_HOUR!;

  const refreshDateString = getDateStringFromTimestampAndTimezone(event.originalInput.latestJobTimestamp, timezoneWithAppId.timezone);

  const refreshEarliestDate = getRefreshEarliestDate(dataFreshnessInHour, refreshDateString);

  // force is true, just refresh the date indicated
  if (event.originalInput.forceRefresh === 'true') {
    if (event.detail.completeRefreshDate) {
      // force refresh has been ended
      return {
        detail: {
          nextStep: RefreshWorkflowSteps.END_STEP,
        },
      };
    } else if (event.originalInput.startRefreshViewNameOrSPName) {
      const index = spList.findIndex((spInfo) => spInfo.name === event.originalInput.startRefreshViewNameOrSPName);
      if (index !== -1) {
        return {
          detail: {
            startRefreshViewNameOrSPName: event.originalInput.startRefreshViewNameOrSPName,
            refreshDate: refreshDateString,
            appId: timezoneWithAppId.appId,
            timezone: timezoneWithAppId.timezone,
            forceRefresh: event.originalInput.forceRefresh,
            nextStep: RefreshWorkflowSteps.REFRESH_SP_STEP,
          },
        };
      } else {
        // no sp need to be force refreshed
        return {
          detail: {
            nextStep: RefreshWorkflowSteps.END_STEP,
          },
        };
      }
    } else {
      throw new Error('forceRefresh is true, but no completeRefreshView or startRefreshView found');
    }
  } else {
    if (event.detail.completeRefreshDate) {
      // check whether there need to refresh earlier date
      const date = new Date(event.detail.completeRefreshDate);
      if (date > refreshEarliestDate) {
        date.setDate(date.getDate() - 1);
        return {
          detail: {
            refreshDate: date.toISOString().split('T')[0],
            appId: timezoneWithAppId.appId,
            timezone: timezoneWithAppId.timezone,
            nextStep: RefreshWorkflowSteps.REFRESH_SP_STEP,
          },
        };
      } else {
        return {
          detail: {
            nextStep: RefreshWorkflowSteps.END_STEP,
          },
        };
      }
    } else {
      // first time to refresh sp
      // check max refresh date
      const propertyListSqlStatements: string[] = [];
      propertyListSqlStatements.push(`SELECT MAX(refresh_date) FROM ${timezoneWithAppId.appId}.refresh_mv_sp_status where triggerred_by = 'WORK_FLOW';`);
      const propertyListQueryId = await executeStatementsWithWait(
        redshiftDataApiClient, propertyListSqlStatements, redshiftProps.serverlessRedshiftProps, redshiftProps.provisionedRedshiftProps);
      const response = await getStatementResult(redshiftDataApiClient, propertyListQueryId!);
      let lastRefreshDateStr;
      if (response.Records) {
        lastRefreshDateStr = response.Records[0][0]?.stringValue;
      }
      if (!lastRefreshDateStr || new Date(lastRefreshDateStr) < new Date(refreshDateString)) {
        return {
          detail: {
            refreshDate: refreshDateString,
            appId: timezoneWithAppId.appId,
            timezone: timezoneWithAppId.timezone,
            nextStep: RefreshWorkflowSteps.REFRESH_SP_STEP,
          },
        };
      } else {
        return {
          detail: {
            nextStep: RefreshWorkflowSteps.END_STEP,
          },
        };
      }
    }
  }
};

function getRefreshEarliestDate(dataFreshnessInHour: string, refreshDate: string): Date {
  const date = new Date(refreshDate);
  date.setHours(date.getHours() - parseInt(dataFreshnessInHour) + 24);
  return date;
}

function getDateStringFromTimestampAndTimezone(timestamp: string, timezone: string): string {
  const utcMoment = utc(parseInt(timestamp));
  const dateTimezone = utcMoment.tz(timezone);

  return dateTimezone.format('YYYY-MM-DD');
}