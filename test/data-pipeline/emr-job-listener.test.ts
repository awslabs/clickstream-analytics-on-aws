
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

import fs from 'fs';
import util from 'util';
import zlib from 'zlib';

import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { EMRServerlessClient, GetJobRunCommand } from '@aws-sdk/client-emr-serverless';
import { CopyObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

import { EventBridgeEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

const gzip = util.promisify(zlib.gzip);

const s3ClientMock = mockClient(S3Client);

//@ts-ignore
const cwClientMock = mockClient(CloudWatchClient);
const emrClientMock = mockClient(EMRServerlessClient);
//@ts-ignore
const sqsClientMock = mockClient(SQSClient);

process.env.EMR_SERVERLESS_APPLICATION_ID = 'test_id';
process.env.STACK_ID = 'test-stack-id';
process.env.PROJECT_ID = 'project_id1';
process.env.PIPELINE_S3_BUCKET_NAME = 'bucket1';
process.env.PIPELINE_S3_PREFIX = 'prefix1/';
process.env.DL_QUEUE_URL = 'dl_sqs_url';

import { handler } from '../../src/data-pipeline/lambda/emr-job-state-listener';

beforeEach(() => {
  s3ClientMock.reset();
  cwClientMock.reset();
  emrClientMock.reset();
  sqsClientMock.reset();
});

test('lambda should not record SUBMITTED job', async () => {
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
  expect(s3ClientMock).toHaveReceivedCommandTimes(CopyObjectCommand, 0);
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
    'prefix1/job-info/project_id1/job-latest.json',
    'prefix1/job-info/project_id1/job-job_run_id1-SUCCESS.json',
  ];
  const logText = [
    '23/04/04 02:43:02 INFO ETLRunner: [ETLMetric]source dataset count:1',
    '23/04/04 02:43:07 INFO Transformer: [ETLMetric]transform enter dataset count:123',
    '23/04/04 02:43:11 INFO Cleaner: [ETLMetric]clean enter dataset count:123',
    '23/04/04 02:43:11 INFO Cleaner: [ETLMetric]corrupted dataset count:4',
    '23/04/04 02:43:15 INFO Cleaner: [ETLMetric]after decodeDataColumn dataset count:123',
    '23/04/04 02:43:20 INFO Cleaner: [ETLMetric]flatted source dataset count:2',
    '23/04/04 02:43:24 INFO Cleaner: [ETLMetric]after load data schema dataset count:123',
    '23/04/04 02:43:33 INFO Cleaner: [ETLMetric]after processCorruptRecords dataset count:123',
    '23/04/04 02:43:36 INFO Cleaner: [ETLMetric]after processDataColumnSchema dataset count:123',
    '23/04/04 02:43:42 INFO Cleaner: [ETLMetric]after filterByDataFreshness dataset count:123',
    '23/04/04 02:43:46 INFO Cleaner: [ETLMetric]after filterByAppIds dataset count:123',
    '23/04/04 02:43:50 INFO Cleaner: [ETLMetric]after filter dataset count:123',
    '23/04/04 02:43:54 INFO Transformer: [ETLMetric]after clean dataset count:999',
    '23/04/04 02:43:59 INFO Transformer: [ETLMetric]transform return dataset count:123',
    '23/04/04 02:44:05 INFO ETLRunner: [ETLMetric]after software.aws.solution.clickstream.Transformer dataset count:123',
    '23/04/04 02:44:20 INFO ETLRunner: [ETLMetric]writeResult dataset count:1000',
    '23/04/04 02:44:32 INFO ETLRunner: [ETLMetric]sink dataset count:3',
  ].join('\n');

  const outStream = fs.createWriteStream('/tmp/test-log.gz');
  const zipBuff = await gzip(logText);
  outStream.write(zipBuff);
  outStream.close();

  s3ClientMock.on(GetObjectCommand).resolves({
    Body: fs.createReadStream('/tmp/test-log.gz'),
  } as any);

  s3ClientMock.on(CopyObjectCommand).callsFake((input: { Key: string; Bucket: string }) => {
    expect(keys.includes(input.Key)).toBeTruthy();
    expect(input.Bucket).toEqual('bucket1');
  });

  emrClientMock.on(GetJobRunCommand).resolves({
    jobRun: {
      createdAt: new Date('2023-04-04T06:00:00.000Z'),
      updatedAt: new Date('2023-04-04T07:00:00.000Z'),
    },
  } as any);

  //@ts-ignore
  cwClientMock.on(PutMetricDataCommand).callsFake((input: any) => {
    // [ETLMetric]source dataset count
    expect(input.MetricData![0].Value).toEqual(1);
    // [ETLMetric]flatted source dataset count
    expect(input.MetricData![1].Value).toEqual(2);
    // [ETLMetric]sink dataset count
    expect(input.MetricData![2].Value).toEqual(3);
    // [ETLMetric]corrupted dataset count
    expect(input.MetricData![3].Value).toEqual(4);
    // job run time
    expect(input.MetricData![4].Value).toEqual(3600);
  });

  await handler(event);

  expect(s3ClientMock).toHaveReceivedCommandTimes(CopyObjectCommand, 1);
  //@ts-ignore
  expect(cwClientMock).toHaveReceivedCommandTimes(PutMetricDataCommand, 1);

  fs.unlinkSync('/tmp/test-log.gz');
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
  //@ts-ignore
  expect(cwClientMock).toHaveReceivedCommandTimes(PutMetricDataCommand, 0);

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
  //@ts-ignore
  expect(cwClientMock).toHaveReceivedCommandTimes(PutMetricDataCommand, 0);

});


test('lambda should send FAILDE job info to dead letter queue', async () => {
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
      state: 'FAILED',
    },
  };

  const jobInfoMsg = JSON.stringify({ test: 'test Info' });

  s3ClientMock.on(GetObjectCommand).resolves({
    Body: {
      transformToString: () => jobInfoMsg,
    },
  } as any);

  await handler(event);
  expect(s3ClientMock).toHaveReceivedCommandTimes(CopyObjectCommand, 1);
  //@ts-ignore
  expect(sqsClientMock).toHaveReceivedCommandTimes(SendMessageCommand, 1);

  //@ts-ignore
  expect(sqsClientMock).toHaveReceivedNthCommandWith(1, SendMessageCommand, {
    QueueUrl: 'dl_sqs_url',
    MessageBody: jobInfoMsg,
  } as any);

});


