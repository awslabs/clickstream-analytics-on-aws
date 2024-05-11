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
import { getRefreshList } from './get-refresh-viewlist';
import { RefreshWorkflowSteps } from '../../private/constant';
import { getRedshiftClient, executeStatementsWithWait, getRedshiftProps, getStatementResult } from '../redshift-data';

const REDSHIFT_DATA_API_ROLE_ARN = process.env.REDSHIFT_DATA_API_ROLE!;
const REDSHIFT_DATABASE = process.env.REDSHIFT_DATABASE!;

// Create an Amazon service client object.
const redshiftDataApiClient = getRedshiftClient(REDSHIFT_DATA_API_ROLE_ARN);

export interface CheckStartRefreshSpEvent {
  originalInput: {
    refreshEndTime: string;
    refreshStartTime: string;
    forceRefresh: string;
    refreshMode: string;
  };
  timezoneWithAppId: {
    appId: string;
    timezone: string;
  };
}

/**
 * The lambda function to check reresh sp start or not.
 * @param event CheckStartRefreshSpEvent.
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
  let refreshMode = event.originalInput.refreshMode;
  if (!refreshMode) {
    refreshMode = process.env.REFRESH_MODE!;
  }
  if (refreshMode === 'no_report') {
    return {
      nextStep: RefreshWorkflowSteps.END_STEP,
    };
  }

  const timezoneWithAppId = event.timezoneWithAppId;
  const forceRefresh = event.originalInput.forceRefresh;
  const refreshDateString = getDateStringFromEndTimeAndTimezone(event.originalInput.refreshEndTime, timezoneWithAppId.timezone);

  let skipSpRefresh = false;
  if (forceRefresh && forceRefresh === 'false') {
    skipSpRefresh = await isSkipSpRefresh(timezoneWithAppId.appId, refreshDateString);
  }
  if (skipSpRefresh) {
    return {
      nextStep: RefreshWorkflowSteps.END_STEP,
    };
  }

  const refreshSpDays = getRrefreshSpDays(event.originalInput.refreshEndTime, event.originalInput.refreshStartTime, timezoneWithAppId.timezone);
  const spList = getRefreshList().spList;
  return {
    refreshDate: refreshDateString,
    refreshSpDays,
    nextStep: RefreshWorkflowSteps.REFRESH_SP_STEP,
    spList,
  };
};

function getDateStringFromEndTimeAndTimezone(timestamp: string, timezone: string): string {
  const utcMoment = utc(parseInt(timestamp));
  const dateTimezone = utcMoment.tz(timezone);

  return dateTimezone.format('YYYY-MM-DD');
}

function getRrefreshSpDays(endTime: string, startTime: string, timezone: string): number {
  let refreshSpDays: number = parseInt(process.env.REFRESH_SP_DAYS!);
  if (startTime) {
    const endMoment = utc(parseInt(endTime));
    const startMoment = utc(parseInt(startTime));
    const endDateTimezone = endMoment.tz(timezone);
    const startDateTimezone = startMoment.tz(timezone);

    refreshSpDays = endDateTimezone.diff(startDateTimezone, 'days') + 1;
  }
  return refreshSpDays;
}

async function isSkipSpRefresh(appId: string, refreshDateString: string) {

  const redshiftProps = getRedshiftProps(
    process.env.REDSHIFT_MODE!,
    REDSHIFT_DATABASE,
    REDSHIFT_DATA_API_ROLE_ARN,
    process.env.REDSHIFT_DB_USER!,
    process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME!,
    process.env.REDSHIFT_CLUSTER_IDENTIFIER!,
  );

  const propertyListSqlStatements: string[] = [];
  propertyListSqlStatements.push(`SELECT MAX(refresh_date) FROM ${appId}.refresh_mv_sp_status where triggerred_by = 'WORK_FLOW';`);
  const propertyListQueryId = await executeStatementsWithWait(
    redshiftDataApiClient, propertyListSqlStatements, redshiftProps.serverlessRedshiftProps, redshiftProps.provisionedRedshiftProps);
  const response = await getStatementResult(redshiftDataApiClient, propertyListQueryId!);
  let lastRefreshDateStr;
  if (response.Records) {
    lastRefreshDateStr = response.Records[0][0]?.stringValue;
  }
  if (!lastRefreshDateStr || new Date(lastRefreshDateStr) < new Date(refreshDateString)) {
    return false;
  }
  return true;
}