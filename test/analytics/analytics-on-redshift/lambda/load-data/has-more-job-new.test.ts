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

process.env.ODS_EVENT_BUCKET_PREFIX = 'project1/test/';

import { PARTITION_APP } from '@aws/clickstream-base-lib';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import { handler, HasMoreWorkEvent } from '../../../../../src/analytics/lambdas/load-data-workflow/has-more-job-new';
import { JobStatus } from '../../../../../src/analytics/private/constant';
import { getMockContext } from '../../../../common/lambda-context';


const ddbClientMock = mockClient(DynamoDBClient);
const context = getMockContext();

const inputEvent: HasMoreWorkEvent = {
  odsTableName: 'test_me_table',
  odsSourceBucket: 's3://EXAMPLE-BUCKET-2',
  odsSourcePrefix: 'project1/test/test_me_table/',
};

beforeEach(() => {
  ddbClientMock.reset();

});

test('Should get all JOB_NEW files', async () => {
  ddbClientMock.on(QueryCommand).resolvesOnce({
    //@ts-ignore
    LastEvaluatedKey: 'next1',
    Count: 3,
    Items: [
      {
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
        s3_object_size: 1823224,
        job_status: JobStatus.JOB_NEW,
        timestamp: new Date().getTime(),
      },
      {
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00001.parquet.snappy`,
        s3_object_size: 1823224,
        job_status: JobStatus.JOB_NEW,
        timestamp: new Date().getTime(),
      },
      {
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00002.parquet.snappy`,
        s3_object_size: 1823224,
        job_status: JobStatus.JOB_NEW,
        timestamp: new Date().getTime(),
      },
    ],
  }).resolvesOnce({
    Count: 2,
    Items: [
      {
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00004.parquet.snappy`,
        s3_object_size: 1823224,
        job_status: JobStatus.JOB_NEW,
        timestamp: new Date().getTime(),
      },

    ],
  }).resolves({
    Count: 1,
    Items: [
      {
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00004.parquet.snappy`,
        s3_object_size: 1823224,
        job_status: JobStatus.JOB_NEW,
        timestamp: new Date().getTime(),
      },

    ],
  });

  const response = await handler(inputEvent, context);
  expect(response).toEqual({
    processingFilesCount: {
      event: 1,
      event_parameter: 1,
      item: 1,
      user: 1,
    },
    jobNewCount: 5,
    hasMoreWork: true,
    odsTableName: inputEvent.odsTableName,
    odsSourceBucket: inputEvent.odsSourceBucket,
    odsSourcePrefix: inputEvent.odsSourcePrefix,
  });

  expect(ddbClientMock).toHaveReceivedNthCommandWith(2, QueryCommand, {
    ExclusiveStartKey: 'next1',
    ExpressionAttributeNames:
     { '#job_status': 'job_status', '#s3_uri': 's3_uri' },
    ExpressionAttributeValues: { ':job_status': 'test_me_table#NEW', ':s3_uri': `s3://${inputEvent.odsSourceBucket}/${inputEvent.odsSourcePrefix}` },
    FilterExpression: 'begins_with(#s3_uri, :s3_uri)',
    IndexName: 'by_status',
    KeyConditionExpression: '#job_status = :job_status',
    ScanIndexForward: true,
    TableName: 'project1_ods_events_trigger',
  } as any);

  expect(ddbClientMock).toHaveReceivedNthCommandWith(6, QueryCommand, {
    ExclusiveStartKey: undefined,
    ExpressionAttributeNames:
     { '#job_status': 'job_status', '#s3_uri': 's3_uri' },
    ExpressionAttributeValues: { ':job_status': 'user#PROCESSING', ':s3_uri': `s3://${inputEvent.odsSourceBucket}/project1/test/user/` },
    FilterExpression: 'begins_with(#s3_uri, :s3_uri)',
    IndexName: 'by_status',
    KeyConditionExpression: '#job_status = :job_status',
    ScanIndexForward: true,
    TableName: 'project1_ods_events_trigger',
  } as any);
});