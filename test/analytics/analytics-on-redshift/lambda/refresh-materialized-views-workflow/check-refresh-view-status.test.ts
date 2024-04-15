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
import { handler, CheckRefreshViewStatusEvent } from '../../../../../src/analytics/lambdas/refresh-materialized-views-workflow/check-refresh-mv-status';
import { REDSHIFT_MODE } from '../../../../../src/common/model';
import { getMockContext } from '../../../../common/lambda-context';
import 'aws-sdk-client-mock-jest';

const checkRefreshViewStatusEvent: CheckRefreshViewStatusEvent = {
  detail: {
    queryId: 'id-1',
    viewName: 'user_m_max_view',
  },
  timezoneWithAppId: {
    appId: 'app1',
    timezone: 'Asia/Shanghai',
  },
};

const context = getMockContext();

describe('Lambda - check the refresh status in Redshift Serverless', () => {

  const redshiftDataMock = mockClient(RedshiftDataClient);

  const workGroupName = 'demo';

  beforeEach(() => {
    redshiftDataMock.reset();

    // set the env before loading the source
    process.env.REDSHIFT_MODE = REDSHIFT_MODE.SERVERLESS;
    process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME = workGroupName;
  });

  test('Check refresh status with response FINISHED', async () => {
    const exeuteId = 'Id-1';
    redshiftDataMock.on(DescribeStatementCommand).resolves({
      Status: StatusString.FINISHED,
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: exeuteId });
    redshiftDataMock.on(GetStatementResultCommand).resolvesOnce({ Records: [] });
    const resp = await handler(checkRefreshViewStatusEvent, context);
    expect(resp).toEqual({
      detail: {
        status: StatusString.FINISHED,
        completeRefreshView: checkRefreshViewStatusEvent.detail.viewName,
      },
      timezoneWithAppId: checkRefreshViewStatusEvent.timezoneWithAppId,
      waitTimeInfo: {
        loopCount: 1,
        waitTime: 30,
      },
    });
    expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
      Id: checkRefreshViewStatusEvent.detail.queryId,
    });
  });

  test('Check scan metadata status with response STARTED', async () => {
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.STARTED,
    });
    const resp = await handler(checkRefreshViewStatusEvent, context);
    expect(resp).toEqual({
      detail: expect.objectContaining({
        status: StatusString.STARTED,
      }),
      timezoneWithAppId: checkRefreshViewStatusEvent.timezoneWithAppId,
      waitTimeInfo: {
        loopCount: 1,
        waitTime: 30,
      },
    });
    expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
      Id: checkRefreshViewStatusEvent.detail.queryId,
    });
  });

  test('Check refresh with response FAILED', async () => {
    const exeuteId = 'Id-1';
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.FAILED,
    }).resolvesOnce({
      Status: StatusString.FINISHED,
    }).resolvesOnce({
      Status: StatusString.FINISHED,
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: exeuteId });
    redshiftDataMock.on(GetStatementResultCommand).resolvesOnce({ Records: [] });
    const resp = await handler(checkRefreshViewStatusEvent, context);
    expect(resp).toEqual(expect.objectContaining({
      detail: expect.objectContaining({
        status: StatusString.FAILED,
      }),
      waitTimeInfo: {
        loopCount: 1,
        waitTime: 30,
      },
    }));
    expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
      Id: checkRefreshViewStatusEvent.detail.queryId,
    });
  });

  test('Check refresh status with response ABORTED', async () => {
    const exeuteId = 'Id-1';
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.ABORTED,
    }).resolvesOnce({
      Status: StatusString.FINISHED,
    }).resolvesOnce({
      Status: StatusString.FINISHED,
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: exeuteId });
    redshiftDataMock.on(GetStatementResultCommand).resolvesOnce({ Records: [] });
    const resp = await handler(checkRefreshViewStatusEvent, context);
    expect(resp).toEqual(expect.objectContaining({
      detail: expect.objectContaining({
        status: StatusString.ABORTED,
      }),
      waitTimeInfo: {
        loopCount: 1,
        waitTime: 30,
      },
    }));
    expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
      Id: checkRefreshViewStatusEvent.detail.queryId,
    });
  });

  test('Execute command error in Redshift when checking refresh status', async () => {
    redshiftDataMock.on(DescribeStatementCommand).rejectsOnce();
    try {
      await handler(checkRefreshViewStatusEvent, context);
      fail('The error in executing statement of Redshift data was caught');
    } catch (error) {
      expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
        Id: 'id-1',
      });
    }
  });
});