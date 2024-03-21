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


import { DescribeStatementCommand, ExecuteStatementCommand, GetStatementResultCommand, RedshiftDataClient, StatusString } from '@aws-sdk/client-redshift-data';
import { mockClient } from 'aws-sdk-client-mock';
import mockfs from 'mock-fs';
import { handler, CheckNextRefreshViewEvent } from '../../../../../src/analytics/lambdas/refresh-materialized-views-workflow/check-next-refresh-view';
import { loadFileFromFS } from '../../../../fs-utils';
import 'aws-sdk-client-mock-jest';


describe('Lambda - check next refresh task', () => {

  const rootPath = __dirname + '/../../../../../src/analytics/lambdas/refresh-materialized-views-workflow/';
  const redshiftDataMock = mockClient(RedshiftDataClient);
  let checkNextRefreshViewEvent: CheckNextRefreshViewEvent = {
    detail: {
      completeRefreshView: '',
    },
    originalInput: {
      startRefreshView: '',
      refreshDate: '2023-10-20',
      forceRefresh: '',
    },
    appId: 'app1',
  };

  beforeEach(() => {
    checkNextRefreshViewEvent = {
      detail: {
        completeRefreshView: '',
      },
      originalInput: {
        startRefreshView: '',
        refreshDate: '2023-10-20',
        forceRefresh: '',
      },
      appId: 'app1',
    };
    redshiftDataMock.reset();
    mockfs({
      ...loadFileFromFS('refresh-view-sp-list.json', rootPath),
    });
  });

  afterEach(mockfs.restore);

  test('workflow is triggered from upstream step function and first time', async () => {
    const resp = await handler(checkNextRefreshViewEvent);
    expect(resp).toEqual({
      detail: {
        taskName: 'user_m_max_view',
        appId: 'app1',
        taskType: 'MV',
      },
    });
  });

  test('workflow is triggered from upstream step function and not first time', async () => {
    checkNextRefreshViewEvent.detail.completeRefreshView = 'user_m_max_view';

    const resp = await handler(checkNextRefreshViewEvent);
    expect(resp).toEqual({
      detail: {
        taskName: 'user_m_view',
        appId: 'app1',
        taskType: 'MV',
      },
    });
  });

  test('workflow is triggered from upstream step function, the next task is SP', async () => {
    checkNextRefreshViewEvent.detail.completeRefreshView = 'user_m_view';

    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.FINISHED,
    });

    const exeuteId = 'Id-1';
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: exeuteId });

    redshiftDataMock.on(GetStatementResultCommand).resolvesOnce({
      Records: [
        [{ stringValue: '2023-10-19' }],
      ],
    });

    const resp = await handler(checkNextRefreshViewEvent);
    expect(resp).toEqual({
      detail: {
        taskName: 'item_m_view',
        appId: 'app1',
        taskType: 'SP',
        refreshDate: '2023-10-20',
      },
    });
  });

  test('workflow is triggered, force refresh SP by date which earlier than latest refresh', async () => {
    checkNextRefreshViewEvent.originalInput.startRefreshView = 'item_m_view';
    checkNextRefreshViewEvent.originalInput.forceRefresh = 'true';

    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.FINISHED,
    });
    const exeuteId = 'Id-1';
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: exeuteId });

    redshiftDataMock.on(GetStatementResultCommand).resolvesOnce({
      Records: [
        [{ stringValue: '2023-10-25' }],
      ],
    });

    const resp = await handler(checkNextRefreshViewEvent);
    expect(resp).toEqual({
      detail: {
        taskName: 'item_m_view',
        appId: 'app1',
        taskType: 'SP',
        refreshDate: '2023-10-20',
      },
    });
  });

  test('workflow is triggered, the last SP has been refreshed', async () => {
    checkNextRefreshViewEvent.detail.completeRefreshView = 'item_m_view';

    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.FINISHED,
    });
    const exeuteId = 'Id-1';
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: exeuteId });

    redshiftDataMock.on(GetStatementResultCommand).resolvesOnce({
      Records: [
        [{ stringValue: '2023-10-25' }],
      ],
    });

    const resp = await handler(checkNextRefreshViewEvent);
    expect(resp).toEqual({
      detail: {
        taskType: 'END',
      },
    });
  });

  test('workflow is triggered, refreshDate is earlier than latest refresh', async () => {
    checkNextRefreshViewEvent.detail.completeRefreshView = 'user_m_view';

    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.FINISHED,
    });
    const exeuteId = 'Id-1';
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: exeuteId });

    redshiftDataMock.on(GetStatementResultCommand).resolvesOnce({
      Records: [
        [{ stringValue: '2023-10-25' }],
      ],
    });

    const resp = await handler(checkNextRefreshViewEvent);
    expect(resp).toEqual({
      detail: {
        taskType: 'END',
      },
    });
  });
});