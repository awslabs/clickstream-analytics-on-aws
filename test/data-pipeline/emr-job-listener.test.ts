
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

import { CopyObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { EventBridgeEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

const s3ClientMock = mockClient(S3Client);

process.env.EMR_SERVERLESS_APPLICATION_ID = 'test_id';
process.env.STACK_ID = 'test-stack-id';
process.env.PROJECT_ID = 'project_id1';
process.env.PIPELINE_S3_BUCKET_NAME = 'bucket1';
process.env.PIPELINE_S3_PREFIX = 'prefix1/';

import { handler } from '../../src/data-pipeline/lambda/emr-job-state-listener';

beforeEach(() => {
  s3ClientMock.reset();
});

test('lambda should record SUBMITTED job', async () => {
  const event: EventBridgeEvent<string, any> = {
    'version': '0',
    'id': '25613b91-cf44-49a4-41f8-4d4205a28994',
    'detail-type': 'EMR Serverless Job Run State Change',
    'source': 'aws.emr-serverless',
    'account': 'xxxxxxxxxx',
    'time': '2023-03-31T07:27:40Z',
    'region': 'us-east-1',
    'resources': [],
    'detail': {
      jobRunId: 'job_run_id1',
      applicationId: 'test_id',
      state: 'SUBMITTED',
    },
  };
  await handler(event);
  expect(s3ClientMock).toHaveReceivedCommandTimes(CopyObjectCommand, 1);
});


test('lambda should record SUCCESS job state', async () => {
  const event: EventBridgeEvent<string, any> = {
    'version': '0',
    'id': '25613b91-cf44-49a4-41f8-4d4205a28994',
    'detail-type': 'EMR Serverless Job Run State Change',
    'source': 'aws.emr-serverless',
    'account': 'xxxxxxxxxx',
    'time': '2023-03-31T07:27:40Z',
    'region': 'us-east-1',
    'resources': [],
    'detail': {
      jobRunId: 'job_run_id1',
      applicationId: 'test_id',
      state: 'SUCCESS',
    },
  };

  const keys: string[] = [
    'prefix1/job-info/test-stack-id/project_id1/job-latest.json',
    'prefix1/job-info/test-stack-id/project_id1/job-job_run_id1-SUCCESS.json',
  ];

  s3ClientMock.on(CopyObjectCommand).callsFake((input: {Key: string; Bucket: string}) => {
    expect(keys.includes(input.Key)).toBeTruthy();
    expect(input.Bucket).toEqual('bucket1');
  });

  await handler(event);

  expect(s3ClientMock).toHaveReceivedCommandTimes(CopyObjectCommand, 2);
});


test('lambda should not record job from other emr application', async () => {
  const event: EventBridgeEvent<string, any> = {
    'version': '0',
    'id': '25613b91-cf44-49a4-41f8-4d4205a28994',
    'detail-type': 'EMR Serverless Job Run State Change',
    'source': 'aws.emr-serverless',
    'account': 'xxxxxxxxxx',
    'time': '2023-03-31T07:27:40Z',
    'region': 'us-east-1',
    'resources': [],
    'detail': {
      jobRunId: 'job_run_id1',
      applicationId: 'other_id',
      state: 'SUCCESS',
    },
  };
  await handler(event);
  expect(s3ClientMock).toHaveReceivedCommandTimes(CopyObjectCommand, 0);
});


test('lambda should not record PENDING job', async () => {
  const event: EventBridgeEvent<string, any> = {
    'version': '0',
    'id': '25613b91-cf44-49a4-41f8-4d4205a28994',
    'detail-type': 'EMR Serverless Job Run State Change',
    'source': 'aws.emr-serverless',
    'account': 'xxxxxxxxxx',
    'time': '2023-03-31T07:27:40Z',
    'region': 'us-east-1',
    'resources': [],
    'detail': {
      jobRunId: 'job_run_id1',
      applicationId: 'test_id',
      state: 'PENDING',
    },
  };
  await handler(event);
  expect(s3ClientMock).toHaveReceivedCommandTimes(CopyObjectCommand, 0);
});

