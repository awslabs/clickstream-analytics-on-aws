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
import { handler, CheckScanMetadataStatusEvent } from '../../../../../src/analytics/lambdas/scan-metadata-workflow/check-scan-metadata-status';
import { CheckScanMetadataStatusEventDetail } from '../../../../../src/analytics/private/model';
import { REDSHIFT_MODE } from '../../../../../src/common/model';
import 'aws-sdk-client-mock-jest';

const checkScanMetadataStatusEventDetail: CheckScanMetadataStatusEventDetail = {
  id: 'id-1',
  appId: 'app1',
  status: '',
};

const checkScanMetadataStatusEvent: CheckScanMetadataStatusEvent = {
  detail: checkScanMetadataStatusEventDetail,
};

describe('Lambda - check the scan metadata status in Redshift Serverless', () => {

  const redshiftDataMock = mockClient(RedshiftDataClient);

  const workGroupName = 'demo';

  beforeEach(() => {
    redshiftDataMock.reset();

    // set the env before loading the source
    process.env.REDSHIFT_MODE = REDSHIFT_MODE.SERVERLESS;
    process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME = workGroupName;
  });

  test('Check scan metadata status with response FINISHED', async () => {
    const exeuteId = 'Id-1';
    redshiftDataMock.on(DescribeStatementCommand).resolves({
      Status: StatusString.FINISHED,
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: exeuteId });
    redshiftDataMock.on(GetStatementResultCommand).resolvesOnce({ Records: [] });
    const resp = await handler(checkScanMetadataStatusEvent);
    expect(resp).toEqual({
      detail: {
        appId: 'app1',
        status: StatusString.FINISHED,
        message: [],
      },
    });
    expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
      Id: checkScanMetadataStatusEvent.detail.id,
    });
  });

  test('Check scan metadata status with response STARTED', async () => {
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.STARTED,
    });
    const resp = await handler(checkScanMetadataStatusEvent);
    expect(resp).toEqual({
      detail: expect.objectContaining({
        status: StatusString.STARTED,
      }),
    });
    expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
      Id: checkScanMetadataStatusEvent.detail.id,
    });
  });

  test('Check scan metadata with response FAILED', async () => {
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
    const resp = await handler(checkScanMetadataStatusEvent);
    expect(resp).toEqual(expect.objectContaining({
      detail: expect.objectContaining({
        status: StatusString.FAILED,
      }),
    }));
    expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
      Id: checkScanMetadataStatusEvent.detail.id,
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
    const resp = await handler(checkScanMetadataStatusEvent);
    expect(resp).toEqual(expect.objectContaining({
      detail: expect.objectContaining({
        status: StatusString.ABORTED,
      }),
    }));
    expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
      Id: checkScanMetadataStatusEvent.detail.id,
    });
  });

  test('Execute command error in Redshift when checking scan metadata status', async () => {
    redshiftDataMock.on(DescribeStatementCommand).rejectsOnce();
    try {
      await handler(checkScanMetadataStatusEvent);
      fail('The error in executing statement of Redshift data was caught');
    } catch (error) {
      expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
        Id: 'id-1',
      });
    }
  });

  test('Execute command error in Redshift when query scan metadata log', async () => {
    const exeuteId = 'Id-1';
    redshiftDataMock.on(DescribeStatementCommand).resolves({
      Status: StatusString.FINISHED,
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: exeuteId });
    redshiftDataMock.on(GetStatementResultCommand).rejectsOnce();
    try {
      await handler(checkScanMetadataStatusEvent);
      fail('The error in executing statement of Redshift data was caught');
    } catch (error) {
      expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
        Id: 'id-1',
      });
    }
  });
});

describe('Lambda - check the scan metadata status in Redshift Provisioned', () => {

  const redshiftDataMock = mockClient(RedshiftDataClient);

  const clusterIdentifier = 'cluster-1';
  const dbUser = 'aUser';

  beforeEach(() => {
    redshiftDataMock.reset();

    // set the env before loading the source
    process.env.REDSHIFT_MODE = REDSHIFT_MODE.PROVISIONED;
    process.env.REDSHIFT_CLUSTER_IDENTIFIER = clusterIdentifier;
    process.env.REDSHIFT_DB_USER = dbUser;
  });

  test('Check scan metadata status with response FINISHED', async () => {
    const exeuteId = 'Id-1';
    redshiftDataMock.on(DescribeStatementCommand).resolves({
      Status: StatusString.FINISHED,
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: exeuteId });
    redshiftDataMock.on(GetStatementResultCommand).resolvesOnce({ Records: [] });
    const resp = await handler(checkScanMetadataStatusEvent);
    expect(resp).toEqual({
      detail: {
        appId: 'app1',
        status: StatusString.FINISHED,
        message: [],
      },
    });
    expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
      Id: checkScanMetadataStatusEvent.detail.id,
    });
  });

  test('Check scan metadata status with response STARTED', async () => {
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.STARTED,
    });
    const resp = await handler(checkScanMetadataStatusEvent);
    expect(resp).toEqual({
      detail: expect.objectContaining({
        status: StatusString.STARTED,
      }),
    });
    expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
      Id: checkScanMetadataStatusEvent.detail.id,
    });
  });

  test('Check scan metadata status with response FAILED', async () => {
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
    const resp = await handler(checkScanMetadataStatusEvent);
    expect(resp).toEqual(expect.objectContaining({
      detail: expect.objectContaining({
        status: StatusString.FAILED,
      }),
    }));
    expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
      Id: checkScanMetadataStatusEvent.detail.id,
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
    const resp = await handler(checkScanMetadataStatusEvent);
    expect(resp).toEqual(expect.objectContaining({
      detail: expect.objectContaining({
        status: StatusString.ABORTED,
      }),
    }));
    expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
      Id: checkScanMetadataStatusEvent.detail.id,
    });
  });
});