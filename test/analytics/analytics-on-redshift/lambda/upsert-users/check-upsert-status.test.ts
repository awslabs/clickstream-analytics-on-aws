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
import { handler, CheckUpsertStatusEvent } from '../../../../../src/analytics/lambdas/upsert-users-workflow/check-upsert-status';
import { RedshiftMode } from '../../../../../src/analytics/private/constant';
import { CheckUpsertStatusEventDetail } from '../../../../../src/analytics/private/model';
import 'aws-sdk-client-mock-jest';

const checkUpsertStatusEventDetail: CheckUpsertStatusEventDetail = {
  id: 'id-1',
  appId: 'app1',
  status: '',
};

const checkUpsertStatusEvent: CheckUpsertStatusEvent = {
  detail: checkUpsertStatusEventDetail,
};

describe('Lambda - check the upsert status in Redshift Serverless', () => {

  const redshiftDataMock = mockClient(RedshiftDataClient);

  const workGroupName = 'demo';

  beforeEach(() => {
    redshiftDataMock.reset();

    // set the env before loading the source
    process.env.REDSHIFT_MODE = RedshiftMode.SERVERLESS;
    process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME = workGroupName;
  });

  test('Check upsert status with response FINISHED', async () => {
    const exeuteId = 'Id-1';
    redshiftDataMock.on(DescribeStatementCommand).resolves({
      Status: StatusString.FINISHED,
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: exeuteId });
    redshiftDataMock.on(GetStatementResultCommand).resolvesOnce({ Records: [] });
    const resp = await handler(checkUpsertStatusEvent);
    expect(resp).toEqual({
      detail: {
        appId: 'app1',
        status: StatusString.FINISHED,
        message: [],
      },
    });
    expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
      Id: checkUpsertStatusEvent.detail.id,
    });
  });

  test('Check upsert status with response STARTED', async () => {
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.STARTED,
    });
    const resp = await handler(checkUpsertStatusEvent);
    expect(resp).toEqual({
      detail: expect.objectContaining({
        status: StatusString.STARTED,
      }),
    });
    expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
      Id: checkUpsertStatusEvent.detail.id,
    });
  });

  test('Check upsert status with response FAILED', async () => {
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
    const resp = await handler(checkUpsertStatusEvent);
    expect(resp).toEqual(expect.objectContaining({
      detail: expect.objectContaining({
        status: StatusString.FAILED,
      }),
    }));
    expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
      Id: checkUpsertStatusEvent.detail.id,
    });
  });

  test('Execute command error in Redshift when checking upsert status', async () => {
    redshiftDataMock.on(DescribeStatementCommand).rejectsOnce();
    try {
      await handler(checkUpsertStatusEvent);
      fail('The error in executing statement of Redshift data was caught');
    } catch (error) {
      expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
        Id: 'id-1',
      });
    }
  });

  test('Execute command error in Redshift when query upsert log', async () => {
    const exeuteId = 'Id-1';
    redshiftDataMock.on(DescribeStatementCommand).resolves({
      Status: StatusString.FINISHED,
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: exeuteId });
    redshiftDataMock.on(GetStatementResultCommand).rejectsOnce();
    try {
      await handler(checkUpsertStatusEvent);
      fail('The error in executing statement of Redshift data was caught');
    } catch (error) {
      expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
        Id: 'id-1',
      });
    }
  });
});

describe('Lambda - check the upsert status in Redshift Provisioned', () => {

  const redshiftDataMock = mockClient(RedshiftDataClient);

  const clusterIdentifier = 'cluster-1';
  const dbUser = 'aUser';

  beforeEach(() => {
    redshiftDataMock.reset();

    // set the env before loading the source
    process.env.REDSHIFT_MODE = RedshiftMode.PROVISIONED;
    process.env.REDSHIFT_CLUSTER_IDENTIFIER = clusterIdentifier;
    process.env.REDSHIFT_DB_USER = dbUser;
  });

  test('Check upsert status with response FINISHED', async () => {
    const exeuteId = 'Id-1';
    redshiftDataMock.on(DescribeStatementCommand).resolves({
      Status: StatusString.FINISHED,
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: exeuteId });
    redshiftDataMock.on(GetStatementResultCommand).resolvesOnce({ Records: [] });
    const resp = await handler(checkUpsertStatusEvent);
    expect(resp).toEqual({
      detail: {
        appId: 'app1',
        status: StatusString.FINISHED,
        message: [],
      },
    });
    expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
      Id: checkUpsertStatusEvent.detail.id,
    });
  });

  test('Check upsert status with response STARTED', async () => {
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.STARTED,
    });
    const resp = await handler(checkUpsertStatusEvent);
    expect(resp).toEqual({
      detail: expect.objectContaining({
        status: StatusString.STARTED,
      }),
    });
    expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
      Id: checkUpsertStatusEvent.detail.id,
    });
  });

  test('Check upsert status with response FAILED', async () => {
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
    const resp = await handler(checkUpsertStatusEvent);
    expect(resp).toEqual(expect.objectContaining({
      detail: expect.objectContaining({
        status: StatusString.FAILED,
      }),
    }));
    expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
      Id: checkUpsertStatusEvent.detail.id,
    });
  });
});