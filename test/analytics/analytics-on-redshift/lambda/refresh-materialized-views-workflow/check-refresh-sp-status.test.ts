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

import { CLICKSTREAM_DEVICE_USER_DEVICE_SP } from '@aws/clickstream-base-lib';
import { DescribeStatementCommand, ExecuteStatementCommand, GetStatementResultCommand, RedshiftDataClient, StatusString } from '@aws-sdk/client-redshift-data';
import { mockClient } from 'aws-sdk-client-mock';
import { handler, CheckRefreshSpStatusEvent } from '../../../../../src/analytics/lambdas/refresh-materialized-views-workflow/check-refresh-sp-status';
import { REDSHIFT_MODE } from '../../../../../src/common/model';
import { getMockContext } from '../../../../common/lambda-context';
import 'aws-sdk-client-mock-jest';

let checkRefreshSpStatusEvent: CheckRefreshSpStatusEvent = {
  detail: {
    queryId: 'id-1',
    spName: 'sp1',
    refreshDate: '2024-01-01',
  },
  originalInput: {
    forceRefresh: '',
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
    checkRefreshSpStatusEvent = {
      detail: {
        queryId: 'id-1',
        spName: 'sp1',
        refreshDate: '2024-01-01',
      },
      originalInput: {
        forceRefresh: '',
      },
      timezoneWithAppId: {
        appId: 'app1',
        timezone: 'Asia/Shanghai',
      },
    };
    redshiftDataMock.reset();

    // set the env before loading the source
    process.env.REDSHIFT_MODE = REDSHIFT_MODE.SERVERLESS;
    process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME = workGroupName;
  });

  test('Check refresh status with response FINISHED, and the force is true and is last sp', async () => {
    checkRefreshSpStatusEvent.originalInput.forceRefresh = 'true';
    checkRefreshSpStatusEvent.detail.spName = CLICKSTREAM_DEVICE_USER_DEVICE_SP;
    const exeuteId = 'Id-1';
    redshiftDataMock.on(DescribeStatementCommand).resolves({
      Status: StatusString.FINISHED,
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: exeuteId });
    redshiftDataMock.on(GetStatementResultCommand).resolvesOnce({ Records: [] });
    const resp = await handler(checkRefreshSpStatusEvent, context);
    expect(resp).toEqual({
      detail: {
        status: StatusString.FINISHED,
        completeRefreshSp: checkRefreshSpStatusEvent.detail.spName,
      },
      waitTimeInfo: {
        loopCount: 1,
        waitTime: 30,
      },
    });

    expect(redshiftDataMock).toHaveReceivedNthCommandWith(1, DescribeStatementCommand, {
      Id: checkRefreshSpStatusEvent.detail.queryId,
    });

    expect(redshiftDataMock).toHaveReceivedNthCommandWith(2, ExecuteStatementCommand, {
      Sql: `INSERT INTO ${checkRefreshSpStatusEvent.timezoneWithAppId.appId}.refresh_mv_sp_status (refresh_name, refresh_type, refresh_date, triggerred_by)\
 VALUES ('${checkRefreshSpStatusEvent.detail.spName}', 'SP', '${checkRefreshSpStatusEvent.detail.refreshDate}', 'MANUALLY');`,
    });
  });

  test('Check refresh status with response FINISHED, and the force is false and is last sp', async () => {
    checkRefreshSpStatusEvent.originalInput.forceRefresh = 'false';
    checkRefreshSpStatusEvent.detail.spName = CLICKSTREAM_DEVICE_USER_DEVICE_SP;
    const exeuteId = 'Id-1';
    redshiftDataMock.on(DescribeStatementCommand).resolves({
      Status: StatusString.FINISHED,
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: exeuteId });
    redshiftDataMock.on(GetStatementResultCommand).resolvesOnce({ Records: [] });
    const resp = await handler(checkRefreshSpStatusEvent, context);
    expect(resp).toEqual({
      detail: {
        status: StatusString.FINISHED,
        completeRefreshSp: checkRefreshSpStatusEvent.detail.spName,
      },
      waitTimeInfo: {
        loopCount: 1,
        waitTime: 30,
      },
    });

    expect(redshiftDataMock).toHaveReceivedNthCommandWith(1, DescribeStatementCommand, {
      Id: checkRefreshSpStatusEvent.detail.queryId,
    });

    expect(redshiftDataMock).toHaveReceivedNthCommandWith(2, ExecuteStatementCommand, {
      Sql: `INSERT INTO ${checkRefreshSpStatusEvent.timezoneWithAppId.appId}.refresh_mv_sp_status (refresh_name, refresh_type, refresh_date, triggerred_by)\
 VALUES ('${checkRefreshSpStatusEvent.detail.spName}', 'SP', '${checkRefreshSpStatusEvent.detail.refreshDate}', 'WORK_FLOW');`,
    });
  });

  test('Check refresh status with response FINISHED, and is not last sp', async () => {
    checkRefreshSpStatusEvent.originalInput.forceRefresh = 'false';
    const exeuteId = 'Id-1';
    redshiftDataMock.on(DescribeStatementCommand).resolves({
      Status: StatusString.FINISHED,
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: exeuteId });
    redshiftDataMock.on(GetStatementResultCommand).resolvesOnce({ Records: [] });
    const resp = await handler(checkRefreshSpStatusEvent, context);
    expect(resp).toEqual({
      detail: {
        status: StatusString.FINISHED,
        completeRefreshSp: checkRefreshSpStatusEvent.detail.spName,
      },
      waitTimeInfo: {
        loopCount: 1,
        waitTime: 30,
      },
    });

    expect(redshiftDataMock).toHaveReceivedNthCommandWith(1, DescribeStatementCommand, {
      Id: checkRefreshSpStatusEvent.detail.queryId,
    });
  });

  test('Check refresh sp with response FAILED', async () => {
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
    const resp = await handler(checkRefreshSpStatusEvent, context);
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
      Id: checkRefreshSpStatusEvent.detail.queryId,
    });
  });

  test('Check scan metadata status with response ABORTED', async () => {
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
    const resp = await handler(checkRefreshSpStatusEvent, context);
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
      Id: checkRefreshSpStatusEvent.detail.queryId,
    });
  });
});