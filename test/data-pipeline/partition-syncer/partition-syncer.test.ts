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

import { BatchCreatePartitionCommand, GlueClient } from '@aws-sdk/client-glue';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { CloudFormationCustomResourceEvent, Context, EventBridgeEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

const schedulerEvent = {
  'id': '9363f74d-c003-47c7-816c-1c480ea1d907',
  'version': '0',
  'account': '12345678901',
  'time': '2023-02-23T11:28:00Z',
  'region': 'ap-southeast-1',
  'resources': ['arn:aws:scheduler:ap-southeast-1:12345678901:schedule/default/test'],
  'source': 'aws.scheduler',
  'detail-type': 'Scheduled Event',
  'detail': {},
};

const dateEvent = {
  year: 2023,
  month: 2,
  day: 22,
};

const cloudFormationCreateEvent: CloudFormationCustomResourceEvent = {
  RequestType: 'Create',
  ServiceToken: 'token',
  ResponseURL: 'test_url',
  StackId: 'test',
  RequestId: 'test',
  LogicalResourceId: 'test',
  ResourceType: 'test',
  ResourceProperties: {
    ServiceToken: 'testtoken',
    sourceS3BucketName: 'src-test-cf',
    sourceS3Prefix: 'src-test-prefix-cf/',
    sinkS3BucketName: 'sink-test-cf',
    sinkS3Prefix: 'sink-test-prefix-cf/',
    pipelineS3BucketName: 'etl-test-cf',
    pipelineS3Prefix: 'etl-test-prefix-cf/',
    projectId: 'test_proj_id_cf',
    appIds: 'appCf1,appCf2',
    databaseName: 'testDB_cf',
    sourceTableName: 'ingestion_events',
    sinkTableName: 'event',
  },
};

const c: Context = {
  callbackWaitsForEmptyEventLoop: true,
  functionVersion: '$LATEST',
  functionName: 'testFn',
  memoryLimitInMB: '512',
  logGroupName: '/aws/lambda/testFn',
  logStreamName: 'testFn',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
  awsRequestId: '0d93e702-57ad-40e6-a1c2-9f95a0087d44',
  getRemainingTimeInMillis: function (): number {
    return 1;
  },
  done: function (): void {
  },
  fail: function (): void {
  },
  succeed: function (): void {
  },
};

// @ts-ignore
const glueClientMock = mockClient(GlueClient);
const s3ClientMock = mockClient(S3Client);

process.env.SOURCE_S3_BUCKET_NAME = 'bucket1';
process.env.SOURCE_S3_PREFIX = 'prefix1/';
process.env.SINK_S3_BUCKET_NAME = 'bucket2';
process.env.SINK_S3_PREFIX = 'prefix2/';
process.env.PROJECT_ID = 'test_proj_id';
process.env.DATABASE_NAME = 'database1';
process.env.SOURCE_TABLE_NAME = 'table1';

import { handler as add_partition_handler } from '../../../src/data-pipeline/lambda/partition-syncer';


describe('Glue catalog add partition test', () => {

  beforeEach(() => {
    glueClientMock.reset();
    s3ClientMock.reset();
  });

  it('Should Add partition both for sink and source when EventBridge triggered - success', async () => {
    process.env.APP_IDS = 'app1';
    const response = await add_partition_handler(
      schedulerEvent as EventBridgeEvent<'Scheduled Event', any>,
      c,
    );
    s3ClientMock.on(PutObjectCommand).callsFake(input => {
      expect(
        (input.Key.startsWith('prefix1/year=') && input.Bucket == 'bucket1') ||
        (input.Key.startsWith('prefix2/test_proj_id/table2/partition_app=') && input.Bucket == 'bucket2'),
      ).toBeTruthy();
    });

    expect(response.Status).toEqual('SUCCESS');
    // @ts-ignore
    expect(glueClientMock).toHaveReceivedCommandTimes(BatchCreatePartitionCommand, 5);
    expect(s3ClientMock).toHaveReceivedCommand(PutObjectCommand);
  });


  it('Should Add partition only for source table when appId is empty', async () => {
    process.env.APP_IDS = '';
    const response = await add_partition_handler(
      schedulerEvent as EventBridgeEvent<'Scheduled Event', any>,
      c,
    );
    s3ClientMock.on(PutObjectCommand).callsFake(input => {
      expect(
        (input.Key.startsWith('prefix1/year=') && input.Bucket == 'bucket1'),
      ).toBeTruthy();
    });

    expect(response.Status).toEqual('SUCCESS');
    // @ts-ignore
    expect(glueClientMock).toHaveReceivedCommandTimes(BatchCreatePartitionCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommand(PutObjectCommand);
  });


  it('Should Add partition for both source and sink table when has appIds - success', async () => {
    process.env.APP_IDS = 'id1,id2';

    const response = await add_partition_handler(
      schedulerEvent as EventBridgeEvent<'Scheduled Event', any>,
      c,
    );
    expect(response.Status).toEqual('SUCCESS');
    // @ts-ignore
    expect(glueClientMock).toHaveReceivedCommandTimes(BatchCreatePartitionCommand, 5);
    expect(s3ClientMock).toHaveReceivedCommand(PutObjectCommand);
  });

  it('Should Add partition when passing date - success', async () => {
    process.env.APP_IDS = 'id1,id2';
    const response = await add_partition_handler(
      dateEvent,
      c,
    );
    expect(response.Status).toEqual('SUCCESS');
    // @ts-ignore
    expect(glueClientMock).toHaveReceivedCommandTimes(BatchCreatePartitionCommand, 5);
  });


  it('Add partition should be triggered by custom resource - create', async () => {
    process.env.APP_IDS = 'id1,id2';
    //@ts-ignore
    cloudFormationCreateEvent.RequestType = 'Create';
    const response = await add_partition_handler(
      cloudFormationCreateEvent,
      c,
    );
    expect(response.Status).toEqual('SUCCESS');
    // @ts-ignore
    expect(glueClientMock).toHaveReceivedCommandTimes(BatchCreatePartitionCommand, 5);
    expect(s3ClientMock).toHaveReceivedCommand(PutObjectCommand);
  });

  it('Add partition should not be triggered by custom resource - delete', async () => {
    process.env.APP_IDS = 'id1,id2';

    // @ts-ignore
    cloudFormationCreateEvent.RequestType = 'Delete';

    const response = await add_partition_handler(
      cloudFormationCreateEvent,
      c,
    );
    expect(response.Status).toEqual('SUCCESS');
    // @ts-ignore
    expect(glueClientMock).toHaveReceivedCommandTimes(BatchCreatePartitionCommand, 0);
  });


  it('Add partition should be triggered by custom resource - update', async () => {
    process.env.APP_IDS = 'id1,id2';
    // @ts-ignore
    cloudFormationCreateEvent.RequestType = 'Update';

    const d = new Date().toISOString();
    const yyyy = d.split('-')[0];
    const MM = d.split('-')[1];
    const dd = d.split('-')[2].split('T')[0];

    const response = await add_partition_handler(
      cloudFormationCreateEvent,
      c,
    );

    s3ClientMock.on(PutObjectCommand).callsFake(input => {
      expect(
        input.Bucket == 'src-test-cf' || input.Bucket == 'sink-test-cf',
      ).toBeTruthy();
    });

    expect(response.Status).toEqual('SUCCESS');
    // @ts-ignore
    expect(glueClientMock).toHaveReceivedCommandTimes(BatchCreatePartitionCommand, 5);
    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 32);

    expect(s3ClientMock).toHaveReceivedNthSpecificCommandWith(1, PutObjectCommand, {
      Body: '',
      Bucket: 'src-test-cf',
      Key: `src-test-prefix-cf/year=${yyyy}/month=${MM}/day=${dd}/hour=00/_.json`,
    });

    expect(s3ClientMock).toHaveReceivedNthSpecificCommandWith(26, PutObjectCommand, {
      Body: '',
      Bucket: 'sink-test-cf',
      Key: `sink-test-prefix-cf/test_proj_id_cf/event_v2/partition_app=appCf2/partition_year=${yyyy}/partition_month=${MM}/partition_day=${dd}/_.json`,
    });
    expect(s3ClientMock).toHaveReceivedNthSpecificCommandWith(28, PutObjectCommand, {
      Body: '',
      Bucket: 'sink-test-cf',
      Key: `sink-test-prefix-cf/test_proj_id_cf/session/partition_app=appCf2/partition_year=${yyyy}/partition_month=${MM}/partition_day=${dd}/_.json`,
    });
    expect(s3ClientMock).toHaveReceivedNthSpecificCommandWith(30, PutObjectCommand, {
      Body: '',
      Bucket: 'sink-test-cf',
      Key: `sink-test-prefix-cf/test_proj_id_cf/user_v2/partition_app=appCf2/partition_year=${yyyy}/partition_month=${MM}/partition_day=${dd}/_.json`,
    });
    expect(s3ClientMock).toHaveReceivedNthSpecificCommandWith(32, PutObjectCommand, {
      Body: '',
      Bucket: 'sink-test-cf',
      Key: `sink-test-prefix-cf/test_proj_id_cf/item_v2/partition_app=appCf2/partition_year=${yyyy}/partition_month=${MM}/partition_day=${dd}/_.json`,
    });
  });
});