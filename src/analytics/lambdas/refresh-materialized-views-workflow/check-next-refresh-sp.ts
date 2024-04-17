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

import { getRefreshList } from './check-next-refresh-view';
import { RefreshWorkflowSteps } from '../../private/constant';

export interface CheckNextRefreshSpEvent {
  detail: {
    completeRefreshSp: string;
  };
  originalInput: {
    startRefreshViewNameOrSPName: string;
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
  const startRefreshViewNameOrSPName = event.originalInput.startRefreshViewNameOrSPName;
  let nextSpName;
  let timezoneSensitive;
  if (event.detail.completeRefreshSp) {
    // it is not the first time to refresh, find the next view
    const index = spList.findIndex((spInfo) => spInfo.name === event.detail.completeRefreshSp);
    if (index !== -1 && index + 1 < spList.length) {
      nextSpName = spList[index + 1].name;
      timezoneSensitive = spList[index + 1].timezoneSensitive;
    } else {
      return {
        detail: {
          nextStep: RefreshWorkflowSteps.END_STEP,
          completeRefreshDate: event.originalInput.refreshDate,
        },
        timezoneWithAppId: {
          appId: event.originalInput.appId,
          timezone: event.originalInput.timezone,
        },
      };
    }
  } else {
    if (startRefreshViewNameOrSPName) {
      // refresh from the indicate sp
      const index = spList.findIndex((spInfo) => spInfo.name === startRefreshViewNameOrSPName);
      if (index === -1) {
        throw new Error(`The sp ${startRefreshViewNameOrSPName} is not found in the list.`);
      }
      nextSpName = spList[index].name;
      timezoneSensitive = spList[index].timezoneSensitive;
    } else {
      // it is the first time to refresh, find the first sp
      nextSpName = spList[0].name;
      timezoneSensitive = spList[0].timezoneSensitive;
    }
  }
  return {
    detail: {
      spName: nextSpName,
      timezoneSensitive,
      refreshDate: event.originalInput.refreshDate,
      nextStep: RefreshWorkflowSteps.REFRESH_SP_STEP,
    },
  };
};