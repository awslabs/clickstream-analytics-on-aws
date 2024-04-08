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

import { REFRESH_SP_STEP, END_STEP } from '@aws/clickstream-base-lib';
import { getRefreshList } from './check-next-refresh-view';

export interface CheckNextRefreshSpEvent {
  detail: {
    completeRefreshSp: string;
  };
  originalInput: {
    startRefreshViewOrSp: string;
    refreshDate: string;
    appId: string;
    timezone: string;
  };
}

/**
 * The lambda function to check the next sp should be refreshed
 * @param event CheckNextRefreshSpEvent
 * @returns {
*  detail: {
*   completeRefreshSp: string;
*  },
* }
*/
export const handler = async (event: CheckNextRefreshSpEvent) => {
  const spList = getRefreshList().spViews;
  const startRefreshViewOrSp = event.originalInput.startRefreshViewOrSp;
  let nextSpName;
  if (event.detail.completeRefreshSp) {
    // it is not the first time to refresh, find the next view
    const index = spList.findIndex((spInfo) => spInfo.name === event.detail.completeRefreshSp);
    if (index !== -1 && index + 1 < spList.length) {
      nextSpName = spList[index + 1].name;
    } else {
      return {
        detail: {
          nextStep: END_STEP,
          completeRefreshDate: event.originalInput.refreshDate,
        },
        timezoneWithAppId: {
          appId: event.originalInput.appId,
          timezone: event.originalInput.timezone,
        },
      };
    }
  } else {
    if (startRefreshViewOrSp) {
      // refresh from the indicate sp
      nextSpName = startRefreshViewOrSp;
    } else {
      // it is the first time to refresh, find the first sp
      nextSpName = spList[0].name;
    }
  }
  return {
    detail: {
      spName: nextSpName,
      refreshDate: event.originalInput.refreshDate,
      nextStep: REFRESH_SP_STEP,
    },
  };
};