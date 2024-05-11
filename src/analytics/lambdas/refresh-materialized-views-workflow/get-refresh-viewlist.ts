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

import { RefreshWorkflowSteps } from '../../private/constant';
import { reportingViewsDef, schemaDefs } from '../../private/sql-def';

export interface RefreshViewOrSp {
  name: string;
  type: string;
  timezoneSensitive: string;
  viewName?: string;
}

export interface GetRefreshViewListEvent {
  timezoneWithAppId: {
    appId: string;
    timezone: string;
  };
  originalInput: {
    refreshMode: string;
  };
}

/**
 * The lambda function to check the next view should be refreshed
 * @param event GetRefreshViewListEvent
 * @returns {
  *  detail: {
  *   nextStep: 'REFRESH_MV' | 'END',
  *   viewName: string
  *  },
 * }
 */

export const handler = async (event: GetRefreshViewListEvent) => {
  let refreshMode = event.originalInput.refreshMode;
  if (!refreshMode) {
    refreshMode = process.env.REFRESH_MODE!;
  }
  if (refreshMode === 'none') {
    return {
      nextStep: RefreshWorkflowSteps.END_STEP,
    };
  }

  const viewList = getRefreshList().viewList;
  const timezoneWithAppId = event.timezoneWithAppId;

  return {
    nextStep: RefreshWorkflowSteps.REFRESH_MV_STEP,
    viewList: viewList,
    timezoneWithAppId,
  };
};

export function getRefreshList() {
  const viewList: RefreshViewOrSp[] = [];
  const spList: RefreshViewOrSp[] = [];

  schemaDefs.forEach((def) => {
    if (def.scheduleRefresh === 'true' && def.type === 'mv') {
      viewList.push({
        name: convertSqlFileToViewName(def.sqlFile),
        type: def.type,
        timezoneSensitive: def.timezoneSensitive || 'false',
      });
    }
  });

  reportingViewsDef.forEach((def) => {
    if (def.scheduleRefresh === 'true') {
      if (def.type === 'mv' || def.type === 'custom-mv') {
        viewList.push({
          name: def.viewName,
          type: def.type,
          timezoneSensitive: def.timezoneSensitive || 'false',
        });
      } else if (def.type === 'sp') {
        spList.push({
          name: def.spName!,
          viewName: def.viewName,
          type: def.type,
          timezoneSensitive: def.timezoneSensitive || 'false',
        });
      }
    }
  });
  return { viewList, spList };
}

function convertSqlFileToViewName(viewSql: string) {
  return viewSql.replace(/-/g, '_').replace(/\.sql$/, '');
};