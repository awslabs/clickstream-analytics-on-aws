/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { BatchCreatePartitionCommand, GlueClient } from '@aws-sdk/client-glue';
import { Context, EventBridgeEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { handler as add_partition_handler } from '../../../src/data-pipeline/lambda/partition-syncer';
import 'aws-sdk-client-mock-jest';

const schedulerEvent = {
  'id': '9363f74d-c003-47c7-816c-1c480ea1d907',
  'version': '0',
  'account': '12345678901',
  'time': '2023-02-23T11:28:00Z',
  'region': 'ap-southeast-1',
  'resources': ['arn:aws:scheduler:ap-southeast-1:12345678901:schedule/default/Spark-ETL-Stack-DataETLpartitionSyncerScheduler3E5-1W6PLORURCXWY'],
  'source': 'aws.scheduler',
  'detail-type': 'Scheduled Event',
  'detail': {},
};

const dateEvent = {
  year: 2023,
  month: 2,
  day: 22,
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

process.env.SOURCE_S3_BUCKET_NAME = 'bucket1';
process.env.SOURCE_S3_PREFIX = 'prefix1';
process.env.SINK_S3_BUCKET_NAME = 'bucket2';
process.env.SINK_S3_PREFIX = 'prefix2 ';
process.env.DATABASE_NAME = 'database1';
process.env.SOURCE_TABLE_NAME = 'table1';
process.env.SINK_TABLE_NAME = 'table2';

describe('Glue catalog add partition test', () => {

  beforeEach(() => {
    glueClientMock.reset();
  });

  it('Should Add partition when EventBridge triggered - success', async () => {
    process.env.APP_IDS = '';
    const response = await add_partition_handler(
      schedulerEvent as EventBridgeEvent<'Scheduled Event', any>,
      c,
    );
    expect(response.Status).toEqual('SUCCESS');
    // @ts-ignore
    expect(glueClientMock).toHaveReceivedCommandTimes(BatchCreatePartitionCommand, 1);
  });

  it('Should Add partition for both source and sink table when has appIds - success', async () => {
    process.env.APP_IDS = 'id1,id2';

    const response = await add_partition_handler(
      schedulerEvent as EventBridgeEvent<'Scheduled Event', any>,
      c,
    );
    expect(response.Status).toEqual('SUCCESS');
    // @ts-ignore
    expect(glueClientMock).toHaveReceivedCommandTimes(BatchCreatePartitionCommand, 2);
  });

  it('Should Add partition when passing date - success', async () => {
    process.env.APP_IDS = 'id1,id2';
    const response = await add_partition_handler(
      dateEvent,
      c,
    );
    expect(response.Status).toEqual('SUCCESS');
    // @ts-ignore
    expect(glueClientMock).toHaveReceivedCommandTimes(BatchCreatePartitionCommand, 2);
  });
});