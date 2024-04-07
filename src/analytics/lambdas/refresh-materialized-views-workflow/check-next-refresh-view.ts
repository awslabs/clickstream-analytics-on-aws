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

import { REFRESH_MV_STEP, END_STEP } from '@aws/clickstream-base-lib';
import { reportingViewsDef, schemaDefs } from '../../private/sql-def';

interface RefreshViewOrSp {
  name: string;
  type: string;
}

export interface CheckNextRefreshViewEvent {
  detail: {
    completeRefreshView: string;
  };
  timeZoneWithAppId: {
    appId: string;
    timezone: string;
  };
  originalInput: {
    startRefreshViewOrSp: string;
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
  const timeZoneWithAppId = event.timeZoneWithAppId;
  let nextView: RefreshViewOrSp | undefined;
  if (event.detail.completeRefreshView) {
    const index = mvViews.findIndex((viewInfo) => viewInfo.name === event.detail.completeRefreshView);
    if (index !== -1 && index + 1 < mvViews.length) {
      nextView = mvViews[index + 1];
    } else {
      return {
        detail: {
          nextStep: END_STEP,
        },
        timeZoneWithAppId,
      };
    }
  } else {
    if (event.originalInput.startRefreshViewOrSp && event.originalInput.forceRefresh === 'true') {
      const index = mvViews.findIndex((viewInfo) => viewInfo.name === event.originalInput.startRefreshViewOrSp);
      const spIndex = spViews.findIndex((spInfo) => spInfo.name === event.originalInput.startRefreshViewOrSp);
      if (index !== -1) {
        nextView = mvViews[index];
      } else if (spIndex !== -1) {
        nextView = mvViews[0];
      } else {
        throw new Error(`View ${event.originalInput.startRefreshViewOrSp} not found in the list of views or sp to refresh`);
      }
    } else {
      nextView = mvViews[0];
    }
  }

  return {
    detail: {
      nextStep: REFRESH_MV_STEP,
      viewName: nextView?.name,
    },
    timeZoneWithAppId,
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
      });
    }
  });

  reportingViewsDef.forEach((def) => {
    if (def.scheduleRefresh === 'true') {
      if (def.type === 'mv') {
        mvViews.push({
          name: def.viewName,
          type: def.type,
        });
      } else if (def.type === 'sp') {
        spViews.push({
          name: def.spName!,
          type: def.type,
        });
      }
    }
  });
  return { mvViews, spViews };
}

function convertSqlFileToViewName(viewSql: string) {
  return viewSql.replace(/-/g, '_').replace(/\.sql$/, '');
};