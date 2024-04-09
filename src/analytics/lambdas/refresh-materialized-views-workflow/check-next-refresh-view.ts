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

interface RefreshViewOrSp {
  name: string;
  type: string;
  timezoneSensitive: string;
}

export interface CheckNextRefreshViewEvent {
  detail: {
    completeRefreshView: string;
  };
  timezoneWithAppId: {
    appId: string;
    timezone: string;
  };
  originalInput: {
    startRefreshViewNameOrSPName: string;
    forceRefresh: string;
  };
}

/**
 * The lambda function to check the next view should be refreshed
 * @param event CheckNextRefreshViewEvent
 * @returns {
  *  detail: {
  *   nextStep: 'REFRESH_MV' | 'END',
  *   viewName: string
  *  },
 * }
 */

export const handler = async (event: CheckNextRefreshViewEvent) => {
  const { mvViews, spViews } = getRefreshList();
  const timezoneWithAppId = event.timezoneWithAppId;
  let nextView: RefreshViewOrSp | undefined;
  if (event.detail.completeRefreshView) {
    const index = mvViews.findIndex((viewInfo) => viewInfo.name === event.detail.completeRefreshView);
    if (index !== -1 && index + 1 < mvViews.length) {
      nextView = mvViews[index + 1];
    } else {
      return {
        detail: {
          nextStep: RefreshWorkflowSteps.END_STEP,
        },
        timezoneWithAppId,
      };
    }
  } else {
    if (event.originalInput.startRefreshViewNameOrSPName && event.originalInput.forceRefresh === 'true') {
      const index = mvViews.findIndex((viewInfo) => viewInfo.name === event.originalInput.startRefreshViewNameOrSPName);
      const spIndex = spViews.findIndex((spInfo) => spInfo.name === event.originalInput.startRefreshViewNameOrSPName);
      if (index !== -1) {
        nextView = mvViews[index];
      } else if (spIndex !== -1) {
        nextView = mvViews[0];
      } else {
        throw new Error(`View ${event.originalInput.startRefreshViewNameOrSPName} not found in the list of views or sp to refresh`);
      }
    } else {
      nextView = mvViews[0];
    }
  }

  return {
    detail: {
      nextStep: RefreshWorkflowSteps.REFRESH_MV_STEP,
      viewName: nextView?.name,
    },
    timezoneWithAppId,
  };
};

export function getRefreshList() {
  const mvViews: RefreshViewOrSp[] = [];
  const spViews: RefreshViewOrSp[] = [];

  schemaDefs.forEach((def) => {
    if (def.scheduleRefresh === 'true' && def.type === 'mv') {
      mvViews.push({
        name: convertSqlFileToViewName(def.sqlFile),
        type: def.type,
        timezoneSensitive: def.timezoneSensitive || 'false',
      });
    }
  });

  reportingViewsDef.forEach((def) => {
    if (def.scheduleRefresh === 'true') {
      if (def.type === 'mv') {
        mvViews.push({
          name: def.viewName,
          type: def.type,
          timezoneSensitive: def.timezoneSensitive || 'false',
        });
      } else if (def.type === 'sp') {
        spViews.push({
          name: def.spName!,
          type: def.type,
          timezoneSensitive: def.timezoneSensitive || 'false',
        });
      }
    }
  });
  return { mvViews, spViews };
}

function convertSqlFileToViewName(viewSql: string) {
  return viewSql.replace(/-/g, '_').replace(/\.sql$/, '');
};