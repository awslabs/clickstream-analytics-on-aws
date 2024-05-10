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

import {
  CLICKSTREAM_ACQUISITION_COUNTRY_NEW_USER_SP,
  CLICKSTREAM_ACQUISITION_DAY_TRAFFIC_SOURCE_USER_SP,
  CLICKSTREAM_ACQUISITION_COUNTRY_NEW_USER,
  CLICKSTREAM_ACQUISITION_DAY_TRAFFIC_SOURCE_USER,
} from '@aws/clickstream-base-lib';
import { GetStatementResultCommand, ExecuteStatementCommand, DescribeStatementCommand, RedshiftDataClient, StatusString } from '@aws-sdk/client-redshift-data';
import { mockClient } from 'aws-sdk-client-mock';
import { handler, CheckStartRefreshSpEvent } from '../../../../../src/analytics/lambdas/refresh-materialized-views-workflow/check-start-sp-refresh';
import { RefreshWorkflowSteps } from '../../../../../src/analytics/private/constant';
import 'aws-sdk-client-mock-jest';


describe('Lambda - check next refresh task', () => {
  const redshiftDataMock = mockClient(RedshiftDataClient);

  let checkNextRefreshViewEvent: CheckStartRefreshSpEvent = {
    originalInput: {
      refreshEndTime: '1715123933000',
      refreshStartTime: '1714519133000',
      forceRefresh: 'false',
      refreshMode: 'all',
    },
    timezoneWithAppId: {
      appId: 'app1',
      timezone: 'Asia/Shanghai',
    },
  };

  beforeEach(() => {
    checkNextRefreshViewEvent = {
      originalInput: {
        refreshEndTime: '1715123933000',
        refreshStartTime: '1714519133000',
        forceRefresh: 'false',
        refreshMode: 'all',
      },
      timezoneWithAppId: {
        appId: 'app1',
        timezone: 'Asia/Shanghai',
      },
    };
    redshiftDataMock.reset();
  });

  test('this refresh mode is no_report', async () => {
    checkNextRefreshViewEvent.originalInput.refreshMode = 'no_report';
    const resp = await handler(checkNextRefreshViewEvent);
    expect(resp).toEqual({
      nextStep: RefreshWorkflowSteps.END_STEP,
    });
  });

  test('the end refresh time is not more than latest refresh time, but forceRefresh is true', async () => {
    checkNextRefreshViewEvent.originalInput.forceRefresh = 'true';
    redshiftDataMock.on(GetStatementResultCommand).resolvesOnce({
      Records: [
        [{ stringValue: '2024-05-08' }],
      ],
    });
    const resp = await handler(checkNextRefreshViewEvent);
    expect(resp).toEqual({
      nextStep: RefreshWorkflowSteps.REFRESH_SP_STEP,
      refreshDate: '2024-05-08',
      refreshSpDays: 8,
      spList: expect.arrayContaining([
        {
          name: CLICKSTREAM_ACQUISITION_COUNTRY_NEW_USER_SP,
          type: 'sp',
          timezoneSensitive: 'true',
          viewName: CLICKSTREAM_ACQUISITION_COUNTRY_NEW_USER,
        },
        {
          name: CLICKSTREAM_ACQUISITION_DAY_TRAFFIC_SOURCE_USER_SP,
          type: 'sp',
          timezoneSensitive: 'true',
          viewName: CLICKSTREAM_ACQUISITION_DAY_TRAFFIC_SOURCE_USER,
        },
      ]),
    });
  });

  test('the end refresh time is not more than latest refresh time', async () => {
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.FINISHED,
    });
    const exeuteId = 'Id-1';
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: exeuteId });

    redshiftDataMock.on(GetStatementResultCommand).resolvesOnce({
      Records: [
        [{ stringValue: '2024-05-08' }],
      ],
    });
    const resp = await handler(checkNextRefreshViewEvent);
    expect(resp).toEqual({
      nextStep: RefreshWorkflowSteps.END_STEP,
    });
  });

  test('the end refresh time is more than latest refresh time', async () => {
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.FINISHED,
    });
    const exeuteId = 'Id-1';
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: exeuteId });

    redshiftDataMock.on(GetStatementResultCommand).resolvesOnce({
      Records: [
        [{ stringValue: '2024-05-07' }],
      ],
    });

    const resp = await handler(checkNextRefreshViewEvent);
    expect(resp).toEqual({
      nextStep: RefreshWorkflowSteps.REFRESH_SP_STEP,
      refreshDate: '2024-05-08',
      refreshSpDays: 8,
      spList: expect.arrayContaining([
        {
          name: CLICKSTREAM_ACQUISITION_COUNTRY_NEW_USER_SP,
          type: 'sp',
          timezoneSensitive: 'true',
          viewName: CLICKSTREAM_ACQUISITION_COUNTRY_NEW_USER,
        },
        {
          name: CLICKSTREAM_ACQUISITION_DAY_TRAFFIC_SOURCE_USER_SP,
          type: 'sp',
          timezoneSensitive: 'true',
          viewName: CLICKSTREAM_ACQUISITION_DAY_TRAFFIC_SOURCE_USER,
        },
      ]),
    });
  });
});