
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

import { PassThrough } from 'stream';
import util from 'util';
import zlib from 'zlib';

import { EMRServerlessClient, GetJobRunCommand } from '@aws-sdk/client-emr-serverless';
import { CopyObjectCommand, DeleteObjectsCommand, GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

import { EventBridgeEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

const gzip = util.promisify(zlib.gzip);

const s3ClientMock = mockClient(S3Client);

//@ts-ignore
const emrClientMock = mockClient(EMRServerlessClient);
//@ts-ignore
const sqsClientMock = mockClient(SQSClient);

process.env.EMR_SERVERLESS_APPLICATION_ID = 'test_id';
process.env.STACK_ID = 'test-stack-id';
process.env.PROJECT_ID = 'project_id1';
process.env.PIPELINE_S3_BUCKET_NAME = 'bucket1';
process.env.PIPELINE_S3_PREFIX = 'prefix1/';
process.env.DL_QUEUE_URL = 'dl_sqs_url';

const addMetricMock = jest.fn(() => { });
const publishStoredMetricsMock = jest.fn(() => { });

const MetricsMock = jest.fn(() => {
  return {
    addMetric: addMetricMock,
    addDimensions: jest.fn(() => { }),
    publishStoredMetrics: publishStoredMetricsMock,
  };
});

jest.mock('@aws-lambda-powertools/metrics', () => {
  return {
    Metrics: MetricsMock,
    MetricUnits: {
      Count: 'Count',
      Seconds: 'Seconds',
    },
  };
});

import { DataPipelineCustomMetricsName, MetricsNamespace, MetricsService } from '../../src/common/model';
import { handler } from '../../src/data-pipeline/lambda/emr-job-state-listener';

//@ts-ignore
expect(MetricsMock.mock.calls[0][0]).toEqual(
  {
    namespace: MetricsNamespace.DATAPIPELINE,
    serviceName: MetricsService.EMR_SERVERLESS,
  });

beforeEach(() => {
  s3ClientMock.reset();
  emrClientMock.reset();
  sqsClientMock.reset();
  MetricsMock.mockReset();
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
    '23/09/15 06:34:30 INFO ETLRunner: [ETLMetric]loaded input files dataset count:41',
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
    '23/04/04 02:44:05 INFO ETLRunner: [ETLMetric]after software.aws.solution.clickstream.TransformerV2 dataset count:123',
    '23/04/04 02:44:20 INFO ETLRunner: [ETLMetric]writeResult dataset count:1000',
    '23/04/04 02:44:32 INFO ETLRunner: [ETLMetric]sink dataset count:3',
    '23/09/15 06:37:01 INFO RepairTableCommand: Recovered all partitions: added (1), dropped (0).',
    '23/09/15 06:37:01 INFO TransformerV2: DROP TABLE IF EXISTS test_project_007_13158910.etl_user_device_id_430162815_tmp_w_ PURGE',
    '23/09/15 06:37:04 INFO TransformerV2: DROP TABLE IF EXISTS test_project_007_13158910.etl_user_device_id_430162815_tmp_ PURGE',
    '23/09/15 06:36:17 INFO ETLRunner: [ETLMetric]sink event_parameter dataset count:55305',
    '23/09/15 06:36:17 INFO ETLRunner: [ETLMetric]sink item dataset count:37119',
    '23/09/15 06:36:17 INFO ETLRunner: [ETLMetric]sink user dataset count:7818',

  ].join('\n');

  const zipBuff = await gzip(logText);
  const bufferStream = new PassThrough();
  s3ClientMock.on(GetObjectCommand).resolves({
    Body: bufferStream.end(zipBuff),
  } as any);

  s3ClientMock.on(CopyObjectCommand).callsFake((input: { Key: string; Bucket: string }) => {
    expect(keys.includes(input.Key)).toBeTruthy();
    expect(input.Bucket).toEqual('bucket1');
  });

  s3ClientMock.on(ListObjectsV2Command).resolvesOnce({
    IsTruncated: true,
    NextContinuationToken: 'next',
    Contents: [{
      Key: 'test/key1-1',
    },
    {
      Key: 'test/key1-2',
    }],
  } as any).resolves({
    IsTruncated: false,
    Contents: [{
      Key: 'test/key2-1',
    },
    {
      Key: 'test/key2-2',
    }],
  });

  emrClientMock.on(GetJobRunCommand).resolves({
    jobRun: {
      createdAt: new Date('2023-04-04T06:00:00.000Z'),
      updatedAt: new Date('2023-04-04T07:00:00.000Z'),
    },
  } as any);

  await handler(event);

  expect(s3ClientMock).toHaveReceivedCommandTimes(CopyObjectCommand, 1);
  expect(s3ClientMock).toHaveReceivedCommandTimes(DeleteObjectsCommand, 3);
  expect(s3ClientMock).toHaveReceivedNthCommandWith(3, ListObjectsV2Command,
    {
      Bucket: 'bucket1',
      Prefix: 'prefix1/project_id1/job-data/etl_user_device_id_430162815_tmp_w_',
    });

  expect(s3ClientMock).toHaveReceivedNthCommandWith(5, ListObjectsV2Command,
    {
      Bucket: 'bucket1',
      ContinuationToken: 'next',
      Prefix: 'prefix1/project_id1/job-data/etl_user_device_id_430162815_tmp_w_',
    },
  );

  expect(s3ClientMock).toHaveReceivedNthCommandWith(7, ListObjectsV2Command,
    {
      Bucket: 'bucket1',
      Prefix: 'prefix1/project_id1/job-data/etl_user_device_id_430162815_tmp_',
    },
  );

  expect(addMetricMock.mock.calls).toEqual(
    [
      [DataPipelineCustomMetricsName.SOURCE, 'Count', 1],
      [DataPipelineCustomMetricsName.FLATTED_SOURCE, 'Count', 2],
      [DataPipelineCustomMetricsName.SINK, 'Count', 3],
      [DataPipelineCustomMetricsName.CORRUPTED, 'Count', 4],
      [DataPipelineCustomMetricsName.RUN_TIME, 'Seconds', 3600],
      [DataPipelineCustomMetricsName.INPUT_FILE_COUNT, 'Count', 41],
    ],
  );
  expect(publishStoredMetricsMock).toBeCalledTimes(1);

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

  expect(addMetricMock).toBeCalledTimes(0);

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
  expect(addMetricMock).toBeCalledTimes(0);

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

  expect(addMetricMock).toBeCalledTimes(0);


});


