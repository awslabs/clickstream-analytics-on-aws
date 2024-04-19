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


process.env.SLEEP_SEC = '1';
process.env.APP_IDS = 'app1,app2,app3';

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { mockClient } from 'aws-sdk-client-mock';
import { handler } from '../../../../../src/analytics/lambdas/load-data-workflow/refresh-views';
import { WorkflowStatus } from '../../../../../src/analytics/private/constant';
import { REDSHIFT_MODE } from '../../../../../src/common/model';
import { getMockContext } from '../../../../common/lambda-context';

import 'aws-sdk-client-mock-jest';

const context = getMockContext();

describe('Lambda - refresh MATERIALIZED views in Redshift Serverless', () => {
  const s3Mock = mockClient(S3Client);
  const sfnClientMock = mockClient(SFNClient);

  const workGroupName = 'demo';

  beforeEach(() => {
    sfnClientMock.reset();
    s3Mock.reset();
    process.env.REDSHIFT_MODE = REDSHIFT_MODE.SERVERLESS;
    process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME = workGroupName;
  });

  test('Should run refresh SQL by app', async () => {

    s3Mock.on(GetObjectCommand).resolves({
      Body: undefined,
    });

    s3Mock.on(PutObjectCommand).resolves({});

    process.env.ENABLE_REFRESH = 'true';
    const resp = await handler({}, context);
    expect(resp).toEqual({
      status: WorkflowStatus.SUCCEED,
    });
  });

  test('Should trigger to refresh - interval greater then 2 hours', async () => {

    const date = new Date();

    const info = JSON.stringify(
      {
        lastRefreshTime: date.getTime() - (2.1 * 60 * 60 * 1000),
        endTimestamp: date.getTime(),
      },
    );
    s3Mock.on(GetObjectCommand).resolves({
      Body: {
        transformToString: async () => {
          return info;
        },
      },
    } as any);

    s3Mock.on(PutObjectCommand).resolves({});

    process.env.ENABLE_REFRESH = 'true';
    const resp = await handler({}, context);
    expect(resp).toEqual({
      status: WorkflowStatus.SUCCEED,
    });

    date.setDate(date.getDate() - 1);
    const triggerTimestamp = date.getTime();

    expect(sfnClientMock).toHaveReceivedNthCommandWith(1, StartExecutionCommand, {
      stateMachineArn: 'arn:aws:states:us-east-1:111122223333:workflow/abc',
      input: JSON.stringify({ latestJobTimestamp: triggerTimestamp }),
    });

  });

  test('Should not be triggerred - interval less then 2 hours', async () => {

    const info = JSON.stringify({ lastRefreshTime: new Date().getTime() - 10 * 60 * 1000 });
    s3Mock.on(GetObjectCommand).resolves({
      Body: {
        transformToString: async () => {
          return info;
        },
      },
    } as any);

    s3Mock.on(PutObjectCommand).resolves({});

    process.env.ENABLE_REFRESH = 'true';
    const resp = await handler({}, context);
    expect(resp).toEqual({
      status: WorkflowStatus.SKIP,
    });
  });

  test('Should not be triggerred', async () => {
    process.env.ENABLE_REFRESH = 'false';
    const resp = await handler({}, context);
    expect(resp).toEqual({
      status: WorkflowStatus.SKIP,
    });
  });
});