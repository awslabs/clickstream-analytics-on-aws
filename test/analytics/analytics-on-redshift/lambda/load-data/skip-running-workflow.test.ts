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

import { PARTITION_APP } from '@aws/clickstream-base-lib';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SFNClient, ListExecutionsCommand, ExecutionStatus } from '@aws-sdk/client-sfn';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import { handler } from '../../../../../src/analytics/lambdas/load-data-workflow/skip-running-workflow';
import { JobStatus, REDSHIFT_TABLE_NAMES } from '../../../../../src/analytics/private/constant';
import { getMockContext } from '../../../../common/lambda-context';

const ddbClientMock = mockClient(DynamoDBClient);
const snfClientMock = mockClient(SFNClient);

const context = getMockContext();

beforeEach(() => {
  ddbClientMock.reset();
});

test('Should have other running workflow', async () => {
  ddbClientMock.on(QueryCommand).resolvesOnce({
    //@ts-ignore
    LastEvaluatedKey: 'next1',
    Count: 3,
    Items: [
      {
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
        s3_object_size: 1823224,
        job_status: JobStatus.JOB_ENQUEUE,
        timestamp: new Date().getTime(),
      },
      {
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00001.parquet.snappy`,
        s3_object_size: 1823224,
        job_status: JobStatus.JOB_ENQUEUE,
        timestamp: new Date().getTime(),
      },
      {
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00002.parquet.snappy`,
        s3_object_size: 1823224,
        job_status: JobStatus.JOB_ENQUEUE,
        timestamp: new Date().getTime(),
      },
    ],
  }).resolvesOnce({
    Count: 1,
    Items: [
      {
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00004.parquet.snappy`,
        s3_object_size: 1823224,
        job_status: JobStatus.JOB_ENQUEUE,
        timestamp: new Date().getTime(),
      },

    ],
  }).resolvesOnce({
    //@ts-ignore
    Count: 3,
    Items: [
      {
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
        s3_object_size: 1823224,
        job_status: JobStatus.JOB_PROCESSING,
        timestamp: new Date().getTime(),
      },
      {
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00001.parquet.snappy`,
        s3_object_size: 1823224,
        job_status: JobStatus.JOB_PROCESSING,
        timestamp: new Date().getTime(),
      },
      {
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00002.parquet.snappy`,
        s3_object_size: 1823224,
        job_status: JobStatus.JOB_PROCESSING,
        timestamp: new Date().getTime(),
      },
    ],
  }).resolves({
    Count: 1,
    Items: [
      {
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
        s3_object_size: 1823224,
        job_status: JobStatus.JOB_PROCESSING,
        timestamp: new Date().getTime(),
      },
    ],
  });

  snfClientMock.on(ListExecutionsCommand).resolves({
    executions: [
      //@ts-ignore
      {
        executionArn: 'arn:aws:states:us-east-1:xxxxxxxxx:execution:stateMachineNameTest:exec_id_1',
      },
      //@ts-ignore
      {
        executionArn: 'arn:aws:states:us-east-1:xxxxxxxxx:execution:stateMachineNameTest:exec_id_2',
      },
    ],
  });

  const event = {
    execution_id: 'arn:aws:states:us-east-1:xxxxxxxxx:execution:stateMachineNameTest:exec_id_1',
    eventBucketName: 'bucket_test',
    eventPrefix: 'test/prefix1/event',
  };

  const response = await handler(event, context);
  const tableNames = REDSHIFT_TABLE_NAMES;

  expect(response.FilesCountInfo).toEqual([
    { countEnQ: 4, countNew: 1, countProcessing: 3, tableName: tableNames[0] },
    { countEnQ: 1, countNew: 1, countProcessing: 1, tableName: tableNames[1] },
    { countEnQ: 1, countNew: 1, countProcessing: 1, tableName: tableNames[2] },
    { countEnQ: 1, countNew: 1, countProcessing: 1, tableName: tableNames[3] },
  ]);
  expect(response.HasRunningWorkflow).toBeTruthy();
  expect(response.SkipRunningWorkflow).toBeTruthy();
  expect(response.PendingCount).toEqual(17);
  expect(response.subExecutionNamePrefix).toEqual('exec_id_1');

  expect(snfClientMock).toReceiveNthCommandWith(1, ListExecutionsCommand, {
    stateMachineArn: 'arn:aws:states:us-east-1:xxxxxxxxx:stateMachine:stateMachineNameTest',
    statusFilter: ExecutionStatus.RUNNING,
  });
});


test('Should get no other running workflow', async () => {
  ddbClientMock.on(QueryCommand).resolvesOnce({
    Count: 1,
    Items: [
      {
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00004.parquet.snappy`,
        s3_object_size: 1823224,
        job_status: JobStatus.JOB_ENQUEUE,
        timestamp: new Date().getTime(),
      },

    ],
  }).resolvesOnce({
    //@ts-ignore
    Count: 1,
    Items: [
      {
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
        s3_object_size: 1823224,
        job_status: JobStatus.JOB_PROCESSING,
        timestamp: new Date().getTime(),
      },

    ],
  }).resolves({
    Count: 1,
    Items: [
      {
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
        s3_object_size: 1823224,
        job_status: JobStatus.JOB_PROCESSING,
        timestamp: new Date().getTime(),
      },
    ],
  });

  snfClientMock.on(ListExecutionsCommand).resolves({
    executions: [
      //@ts-ignore
      {
        executionArn: 'arn:aws:states:us-east-1:xxxxxxxxx:execution:stateMachineNameTest:exec_id_1',
      },
    ],
  });

  const event = {
    execution_id: 'arn:aws:states:us-east-1:xxxxxxxxx:execution:stateMachineNameTest:exec_id_1',
    eventBucketName: 'bucket_test',
    eventPrefix: 'test/prefix1/event',
  };

  const response = await handler(event, context);
  expect(response.FilesCountInfo.length).toEqual(4);
  expect(response.HasRunningWorkflow).toBeFalsy();
  expect(response.SkipRunningWorkflow).toBeFalsy();

  expect(ddbClientMock).toHaveReceivedNthCommandWith(1, QueryCommand, {
    ExpressionAttributeValues: { ':job_status': 'event#ENQUEUE', ':s3_uri': 's3://bucket_test/test/prefix1/event/' },
  });
  expect(ddbClientMock).toHaveReceivedNthCommandWith(2, QueryCommand, {
    ExpressionAttributeValues: { ':job_status': 'event#PROCESSING', ':s3_uri': 's3://bucket_test/test/prefix1/event/' },
  });
  expect(ddbClientMock).toHaveReceivedNthCommandWith(3, QueryCommand, {
    ExpressionAttributeValues: { ':job_status': 'event#NEW', ':s3_uri': 's3://bucket_test/test/prefix1/event/' },
  });
});

test('Should skip running workflow', async () => {
  ddbClientMock.on(QueryCommand).resolves({
    //@ts-ignore
    Count: 0,
    Items: [
    ],
  });
  snfClientMock.on(ListExecutionsCommand).resolves({
    executions: [
    ],
  });
  const event = {
    execution_id: 'arn:aws:states:us-east-1:xxxxxxxxx:execution:stateMachineNameTest:exec_id_0',
    eventBucketName: 'bucket_test',
    eventPrefix: 'test/prefix1/event',
  };

  const response = await handler(event, context);
  const tableNames = REDSHIFT_TABLE_NAMES;

  expect(response.FilesCountInfo).toEqual([
    { countEnQ: 0, countNew: 0, countProcessing: 0, tableName: tableNames[0] },
    { countEnQ: 0, countNew: 0, countProcessing: 0, tableName: tableNames[1] },
    { countEnQ: 0, countNew: 0, countProcessing: 0, tableName: tableNames[2] },
    { countEnQ: 0, countNew: 0, countProcessing: 0, tableName: tableNames[3] },
  ]);
  expect(response.HasRunningWorkflow).toBeFalsy();
  expect(response.SkipRunningWorkflow).toBeTruthy();
  expect(response.PendingCount).toEqual(0);
});