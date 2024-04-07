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

import { CLICKSTREAM_ACQUISITION_COUNTRY_NEW_USER_SP, REFRESH_SP_STEP, END_STEP } from '@aws/clickstream-base-lib';
import { RedshiftDataClient } from '@aws-sdk/client-redshift-data';
import { mockClient } from 'aws-sdk-client-mock';
import { handler, CheckNextRefreshSpEvent } from '../../../../../src/analytics/lambdas/refresh-materialized-views-workflow/check-next-refresh-sp';
import 'aws-sdk-client-mock-jest';


describe('Lambda - check next refresh task', () => {
  const redshiftDataMock = mockClient(RedshiftDataClient);

  let checkNextRefreshViewEvent: CheckNextRefreshSpEvent = {
    detail: {
      completeRefreshSp: '',
    },
    originalInput: {
      startRefreshViewOrSp: '',
      refreshDate: '',
      appId: '',
      timeZone: '',
    },
  };

  beforeEach(() => {
    checkNextRefreshViewEvent = {
      detail: {
        completeRefreshSp: '',
      },
      originalInput: {
        startRefreshViewOrSp: '',
        refreshDate: '2024-03-10',
        appId: 'app1',
        timeZone: 'Asia/Shanghai',
      },
    };
    redshiftDataMock.reset();
  });

  test('it is first time to refresh', async () => {
    const resp = await handler(checkNextRefreshViewEvent);
    expect(resp).toEqual({
      detail: {
        nextStep: REFRESH_SP_STEP,
        spName: CLICKSTREAM_ACQUISITION_COUNTRY_NEW_USER_SP,
        refreshDate: '2024-03-10',
      },
    });
  });

  test('there is startRefreshViewOrSp', async () => {
    checkNextRefreshViewEvent.originalInput.startRefreshViewOrSp = CLICKSTREAM_ACQUISITION_COUNTRY_NEW_USER_SP;
    const resp = await handler(checkNextRefreshViewEvent);
    expect(resp).toEqual({
      detail: {
        nextStep: REFRESH_SP_STEP,
        spName: CLICKSTREAM_ACQUISITION_COUNTRY_NEW_USER_SP,
        refreshDate: '2024-03-10',
      },
    });
  });

  test('it is not the first time to refresh', async () => {
    checkNextRefreshViewEvent.detail.completeRefreshSp = CLICKSTREAM_ACQUISITION_COUNTRY_NEW_USER_SP;
    const resp = await handler(checkNextRefreshViewEvent);
    expect(resp).toEqual({
      detail: {
        nextStep: REFRESH_SP_STEP,
        spName: 'clickstream_acquisition_day_traffic_source_user_sp',
        refreshDate: '2024-03-10',
      },
    });
  });

  test('it is the end, no sp need to be refreshed', async () => {
    checkNextRefreshViewEvent.detail.completeRefreshSp = 'clickstream_device_crash_rate_sp';
    const resp = await handler(checkNextRefreshViewEvent);
    expect(resp).toEqual({
      detail: {
        nextStep: END_STEP,
        completeRefreshDate: '2024-03-10',
      },
      timeZoneWithAppId: {
        appId: 'app1',
        timezone: 'Asia/Shanghai',
      },
    });
  });
});