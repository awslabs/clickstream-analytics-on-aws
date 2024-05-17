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

import { handler, GetRefreshViewListEvent } from '../../../../../src/analytics/lambdas/refresh-materialized-views-workflow/get-refresh-viewlist';
import { RefreshWorkflowSteps } from '../../../../../src/analytics/private/constant';
import 'aws-sdk-client-mock-jest';


describe('Lambda - check next refresh task', () => {
  let checkNextRefreshViewEvent: GetRefreshViewListEvent = {
    originalInput: {
      refreshMode: '',
    },
    timezoneWithAppId: {
      appId: 'app1',
      timezone: 'Asia/Shanghai',
    },
  };

  beforeEach(() => {
    checkNextRefreshViewEvent = {
      originalInput: {
        refreshMode: '',
      },
      timezoneWithAppId: {
        appId: 'app1',
        timezone: 'Asia/Shanghai',
      },
    };
  });

  test('the refresh mode is none', async () => {
    checkNextRefreshViewEvent.originalInput.refreshMode = 'none';
    const resp = await handler(checkNextRefreshViewEvent);
    expect(resp).toEqual({
      nextStep: RefreshWorkflowSteps.END_STEP,
    });
  });

  test('normal case, the next task is REFRESH_MV', async () => {
    const resp = await handler(checkNextRefreshViewEvent);
    expect(resp).toEqual({
      nextStep: RefreshWorkflowSteps.REFRESH_MV_STEP,
      viewList: [
        {
          name: 'clickstream_event_base_view_sp',
          type: 'custom-mv',
          timezoneSensitive: 'false',
        },
        {
          name: 'clickstream_acquisition_intra_day_user_mv',
          timezoneSensitive: 'false',
          type: 'mv',
        },
        {
          name: 'clickstream_lifecycle_view_v2',
          timezoneSensitive: 'true',
          type: 'mv',
        },
        {
          name: 'clickstream_retention_base_view',
          timezoneSensitive: 'true',
          type: 'mv',
        },
      ],
      timezoneWithAppId: checkNextRefreshViewEvent.timezoneWithAppId,
    });
  });
});