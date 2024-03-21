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

import { readFileSync } from 'fs';
import { getRedshiftClient, executeStatementsWithWait, getRedshiftProps, getStatementResult } from '../redshift-data';

const REDSHIFT_DATA_API_ROLE_ARN = process.env.REDSHIFT_DATA_API_ROLE!;
const REDSHIFT_DATABASE = process.env.REDSHIFT_DATABASE!;

// Create an Amazon service client object.
const redshiftDataApiClient = getRedshiftClient(REDSHIFT_DATA_API_ROLE_ARN);

interface Parameter {
  name: string;
  type: string;
}

interface RefreshView {
  name: string;
  type: string;
  parameters: Parameter[];
}

export interface CheckNextRefreshViewEvent {
  detail: {
    completeRefreshView: string;
  };
  originalInput: {
    startRefreshView: string;
    refreshDate: string;
    forceRefresh: string;
  };
  appId: string;
}

export const handler = async (event: CheckNextRefreshViewEvent) => {
  const viewAndSpList = parseJsonFile('/opt/refresh-view-sp-list.json');

  const redshiftProps = getRedshiftProps(
    process.env.REDSHIFT_MODE!,
    REDSHIFT_DATABASE,
    REDSHIFT_DATA_API_ROLE_ARN,
    process.env.REDSHIFT_DB_USER!,
    process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME!,
    process.env.REDSHIFT_CLUSTER_IDENTIFIER!,
  );

  // check if CompleteRefreshView is not null, get the next view to refresh after the CompleteRefreshView
  let nextView: RefreshView | undefined;
  if (event.detail.completeRefreshView) {
    const index = viewAndSpList.findIndex((viewAndSp) => viewAndSp.name === event.detail.completeRefreshView);
    if (index !== -1 && index + 1 < viewAndSpList.length) {
      nextView = viewAndSpList[index + 1];
    } else {
      return {
        detail: {
          taskType: 'END',
        },
      };
    }
  } else {
    if (event.originalInput.startRefreshView) {
      const index = viewAndSpList.findIndex((viewAndSp) => viewAndSp.name === event.originalInput.startRefreshView);
      if (index !== -1) {
        nextView = viewAndSpList[index];
      }
    } else {
      nextView = viewAndSpList[0];
    }
  }

  // If nextView type is SP, check last SP refresh date is less than the view RefreshDate
  if (nextView && nextView.type === 'SP') {
    if (event.originalInput.forceRefresh === 'true') {
      return {
        detail: {
          taskType: 'SP',
          taskName: nextView?.name,
          refreshDate: event.originalInput.refreshDate,
          appId: event.appId,
        },
      };
    } else {
      const propertyListSqlStatements: string[] = [];
      propertyListSqlStatements.push(`SELECT MAX(refresh_date) FROM ${event.appId}.refresh_mv_sp_status where refresh_name = '${nextView.name}';`);
      const propertyListQueryId = await executeStatementsWithWait(
        redshiftDataApiClient, propertyListSqlStatements, redshiftProps.serverlessRedshiftProps, redshiftProps.provisionedRedshiftProps);
      const response = await getStatementResult(redshiftDataApiClient, propertyListQueryId!);
      let lastRefreshDateStr;
      if (response.Records) {
        lastRefreshDateStr = response.Records[0][0]?.stringValue;
      }
      // If last refresh date is NULL or last refresh date is less than the input refresh date, return the next view to refresh
      if (!lastRefreshDateStr || new Date(lastRefreshDateStr) < new Date(event.originalInput.refreshDate)) {
        return {
          detail: {
            taskType: 'SP',
            taskName: nextView?.name,
            refreshDate: event.originalInput.refreshDate,
            appId: event.appId,
          },
        };
      } else {
        return {
          detail: {
            taskType: 'END',
          },
        };
      }
    }
  }

  return {
    detail: {
      taskType: 'MV',
      taskName: nextView?.name,
      appId: event.appId,
    },
  };
};

function parseJsonFile(filePath: string) {

  const fileContent = readFileSync(filePath, 'utf8');

  // Parse the JSON content
  const entities: RefreshView[] = JSON.parse(fileContent);

  return entities;
};