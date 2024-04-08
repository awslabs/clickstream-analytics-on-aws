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

import { REFRESH_MV_STEP, END_STEP, CLICKSTREAM_ACQUISITION_COUNTRY_NEW_USER_SP } from '@aws/clickstream-base-lib';
import { handler, CheckNextRefreshViewEvent } from '../../../../../src/analytics/lambdas/refresh-materialized-views-workflow/check-next-refresh-view';
import 'aws-sdk-client-mock-jest';


describe('Lambda - check next refresh task', () => {
  let checkNextRefreshViewEvent: CheckNextRefreshViewEvent = {
    detail: {
      completeRefreshView: '',
    },
    originalInput: {
      startRefreshViewOrSp: '',
      forceRefresh: '',
    },
    timezoneWithAppId: {
      appId: 'app1',
      timezone: 'Asia/Shanghai',
    },
  };

  beforeEach(() => {
    checkNextRefreshViewEvent = {
      detail: {
        completeRefreshView: '',
      },
      originalInput: {
        startRefreshViewOrSp: '',
        forceRefresh: '',
      },
      timezoneWithAppId: {
        appId: 'app1',
        timezone: 'Asia/Shanghai',
      },
    };
  });

  test('workflow is triggered from upstream step function and first time', async () => {
    const resp = await handler(checkNextRefreshViewEvent);
    expect(resp).toEqual({
      detail: {
        viewName: 'user_m_max_view',
        nextStep: REFRESH_MV_STEP,
      },
      timezoneWithAppId: checkNextRefreshViewEvent.timezoneWithAppId,
    });
  });

  test('workflow is triggered from upstream step function and not first time', async () => {
    checkNextRefreshViewEvent.detail.completeRefreshView = 'user_m_max_view';
    const resp = await handler(checkNextRefreshViewEvent);
    expect(resp).toEqual({
      detail: {
        viewName: 'user_m_view_v2',
        nextStep: REFRESH_MV_STEP,
      },
      timezoneWithAppId: checkNextRefreshViewEvent.timezoneWithAppId,
    });
  });

  test('workflow is triggered from upstream step function, the next task is SP', async () => {
    checkNextRefreshViewEvent.detail.completeRefreshView = 'clickstream_retention_base_view';
    const resp = await handler(checkNextRefreshViewEvent);
    expect(resp).toEqual({
      detail: {
        nextStep: END_STEP,
      },
      timezoneWithAppId: checkNextRefreshViewEvent.timezoneWithAppId,
    });
  });

  test('forceRefresh is true and startRefreshViewOrSp is a correct view', async () => {
    checkNextRefreshViewEvent.originalInput.forceRefresh = 'true';
    checkNextRefreshViewEvent.originalInput.startRefreshViewOrSp = 'user_m_view_v2';
    const resp = await handler(checkNextRefreshViewEvent);
    expect(resp).toEqual({
      detail: {
        viewName: 'user_m_view_v2',
        nextStep: REFRESH_MV_STEP,
      },
      timezoneWithAppId: checkNextRefreshViewEvent.timezoneWithAppId,
    });
  });

  test('forceRefresh is true and startRefreshViewOrSp is a correct sp', async () => {
    checkNextRefreshViewEvent.originalInput.forceRefresh = 'true';
    checkNextRefreshViewEvent.originalInput.startRefreshViewOrSp = CLICKSTREAM_ACQUISITION_COUNTRY_NEW_USER_SP;
    const resp = await handler(checkNextRefreshViewEvent);
    expect(resp).toEqual({
      detail: {
        viewName: 'user_m_max_view',
        nextStep: REFRESH_MV_STEP,
      },
      timezoneWithAppId: checkNextRefreshViewEvent.timezoneWithAppId,
    });
  });

  test('forceRefresh is true and startRefreshViewOrSp is a invalid value', async () => {
    checkNextRefreshViewEvent.originalInput.forceRefresh = 'true';
    checkNextRefreshViewEvent.originalInput.startRefreshViewOrSp = 'invalid_value';
    await expect(handler(checkNextRefreshViewEvent)).rejects.toThrow(`View ${checkNextRefreshViewEvent.originalInput.startRefreshViewOrSp} not found in the list of views or sp to refresh`);
  });
});