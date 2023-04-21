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

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ScheduledEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { handler, ODSEventItem } from '../../../../../src/analytics/lambdas/load-data-workflow/create-load-manifest';
import { JobStatus } from '../../../../../src/analytics/private/constant';
import 'aws-sdk-client-mock-jest';
import { PARTITION_APP } from '../../../../../src/common/constant';
import { getMockContext } from '../../../../common/lambda-context';

describe('Lambda - Create manifest for Redshift COPY', () => {

  const dynamoDBClientMock = mockClient(DynamoDBClient);
  const s3ClientMock = mockClient(S3Client);

  const scheduleEvent: ScheduledEvent = {
    'version': '0',
    'id': 'e073f888-c8d4-67ac-2b2c-f858903d4e7c',
    'detail-type': 'Scheduled Event',
    'source': 'aws.events',
    'account': 'xxxxxxxxxxxx',
    'time': '2023-02-24T13:14:18Z',
    'region': 'us-east-2',
    'resources': [
      'arn:aws:events:us-east-2:xxxxxxxxxxxx:rule/load-data-to-redshift-loaddatatoredshiftManifestOn-RQHE7PBBA2KD',
    ],
    'detail': {},
  };

  const context = getMockContext();

  beforeEach(() => {
    dynamoDBClientMock.reset();
    s3ClientMock.reset();
  });

  test('Get 1 new item from store then create manifest', async () => {
    dynamoDBClientMock.on(QueryCommand).resolvesOnce({
      Count: 0,
      Items: [],
    }).resolvesOnce({
      Count: 1,
      Items: [
        {
          s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
          s3_object_size: 1823224,
          job_status: JobStatus.JOB_NEW,
        },
      ],
    });
    dynamoDBClientMock.on(UpdateCommand).resolvesOnce({});
    s3ClientMock.on(PutObjectCommand).resolvesOnce({});
    const response = await handler(scheduleEvent, context);
    expect(response).toEqual(expect.objectContaining({
      manifestList: [
        {
          appId: 'app1',
          jobList: {
            entries: [
              {
                meta: {
                  content_length: 1823224,
                },
                url: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
              },
            ],
          },
          manifestFileName: `s3://${process.env.MANIFEST_BUCKET}/${process.env.MANIFEST_BUCKET_PREFIX}manifest/app1-${context.awsRequestId}.manifest`,
        },
      ],
      count: 1,
    }));

    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(QueryCommand, 2);
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 1);
  });

  test('Get 4 new items with different applications from store then create three manifest', async () => {
    dynamoDBClientMock.on(QueryCommand).resolvesOnce({
      Count: 0,
      Items: [],
    }).resolvesOnce({
      Count: 4,
      Items: [
        {
          s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
          s3_object_size: 1823224,
          job_status: JobStatus.JOB_NEW,
        },
        {
          s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00001.parquet.snappy`,
          s3_object_size: 232322,
          job_status: JobStatus.JOB_NEW,
        },
        {
          s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app2/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
          s3_object_size: 200200,
          job_status: JobStatus.JOB_NEW,
        },
        {
          s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app3/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
          s3_object_size: 1233232,
          job_status: JobStatus.JOB_NEW,
        },
      ],
    });
    dynamoDBClientMock.on(UpdateCommand).resolvesOnce({});
    s3ClientMock.on(PutObjectCommand).resolvesOnce({});
    const response = await handler(scheduleEvent, context);
    expect(response).toEqual(expect.objectContaining({
      manifestList: expect.arrayContaining([
        expect.objectContaining({
          appId: 'app1',
          jobList: {
            entries: expect.arrayContaining([
              expect.objectContaining({
                url: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
              }),
              expect.objectContaining({
                url: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00001.parquet.snappy`,
              }),
            ]),
          },
          manifestFileName: `s3://${process.env.MANIFEST_BUCKET}/${process.env.MANIFEST_BUCKET_PREFIX}manifest/app1-${context.awsRequestId}.manifest`,
        }),
        expect.objectContaining({
          appId: 'app2',
          manifestFileName: `s3://${process.env.MANIFEST_BUCKET}/${process.env.MANIFEST_BUCKET_PREFIX}manifest/app2-${context.awsRequestId}.manifest`,
        }),
        expect.objectContaining({
          appId: 'app3',
          manifestFileName: `s3://${process.env.MANIFEST_BUCKET}/${process.env.MANIFEST_BUCKET_PREFIX}manifest/app3-${context.awsRequestId}.manifest`,
        }),
      ]),
      count: 3,
    }));

    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(QueryCommand, 2);
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(UpdateCommand, 4);
    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 3);
  });

  test('Get 8 processing items from store that equals or greater than the PROCESSING_LIMIT', async () => {
    const items: ODSEventItem[] = [];
    Array(8).fill(0).map((_, i) => items.push(
      {
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part0000${i}.parquet.snappy`,
        s3_object_size: '1823224',
        job_status: JobStatus.JOB_PROCESSING,
      },
    ));
    dynamoDBClientMock.on(QueryCommand).resolvesOnce({
      Count: items.length,
      Items: items,
    });
    const response = await handler(scheduleEvent, context);
    expect(response).toEqual(expect.objectContaining({
      count: 0,
      manifestList: [],
    }));
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(QueryCommand, 1);
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(UpdateCommand, 0);
    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 0);
  });

  test('Get more processing items from store processing with paging', async () => {
    const firstBatchItems: ODSEventItem[] = [];
    Array(3).fill(0).map((_, i) => firstBatchItems.push(
      {
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part0000${i}.parquet.snappy`,
        s3_object_size: '1823224',
        job_status: JobStatus.JOB_PROCESSING,
      },
    ));
    const secondBatchItems: ODSEventItem[] = [];
    Array(6).fill(0).map((_, i) => secondBatchItems.push(
      {
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part1000${i}.parquet.snappy`,
        s3_object_size: '1823224',
        job_status: JobStatus.JOB_PROCESSING,
      },
    ));
    const lastEvaluatedKey = {
      s3_uri: 'nextToken',
    };
    dynamoDBClientMock.on(QueryCommand).resolvesOnce({
      Count: firstBatchItems.length,
      Items: firstBatchItems,
      LastEvaluatedKey: lastEvaluatedKey,
    }).on(QueryCommand, {
      ExclusiveStartKey: lastEvaluatedKey,
    }).resolves({
      Count: secondBatchItems.length,
      Items: secondBatchItems,
    });
    const response = await handler(scheduleEvent, context);
    expect(response).toEqual(expect.objectContaining({
      count: 0,
      manifestList: [],
    }));
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(QueryCommand, 2);
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(UpdateCommand, 0);
    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 0);
  });

  test('Get 5 new items from store with paging that the processing items are less than queryResultLimit', async () => {
    const processingItems: ODSEventItem[] = [];
    const processingCount = 2;
    Array(processingCount).fill(0).map((_, i) => processingItems.push(
      {
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part0030${i}.parquet.snappy`,
        s3_object_size: '1823224',
        job_status: JobStatus.JOB_PROCESSING,
      },
    ));
    const firstBatchNewItems: ODSEventItem[] = [];
    Array(3).fill(0).map((_, i) => firstBatchNewItems.push(
      {
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part0000${i}.parquet.snappy`,
        s3_object_size: '1823224',
        job_status: JobStatus.JOB_NEW,
      },
    ));
    const secondBatchNewItems: ODSEventItem[] = [];
    Array(3).fill(0).map((_, i) => secondBatchNewItems.push(
      {
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part1000${i}.parquet.snappy`,
        s3_object_size: '1823224',
        job_status: JobStatus.JOB_NEW,
      },
    ));
    const lastEvaluatedKey = {
      s3_uri: 'nextToken',
    };
    dynamoDBClientMock.on(QueryCommand)
      .resolvesOnce({
        Count: processingItems.length,
        Items: processingItems,
      })
      .resolvesOnce({
        Count: firstBatchNewItems.length,
        Items: firstBatchNewItems,
        LastEvaluatedKey: lastEvaluatedKey,
      }).on(QueryCommand, {
        ExclusiveStartKey: lastEvaluatedKey,
      }).resolves({
        Count: secondBatchNewItems.length,
        Items: secondBatchNewItems,
      });
    const response = await handler(scheduleEvent, context);
    expect(response).toEqual(expect.objectContaining({
      manifestList: expect.arrayContaining([
        expect.objectContaining({
          appId: 'app1',
          manifestFileName: `s3://${process.env.MANIFEST_BUCKET}/${process.env.MANIFEST_BUCKET_PREFIX}manifest/app1-${context.awsRequestId}.manifest`,
        }),
      ]),
      count: 1,
    }));
    expect(response.manifestList[0].jobList.entries).toHaveLength(parseInt(process.env.PROCESSING_LIMIT!) - processingCount);
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(QueryCommand, 3);
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(UpdateCommand, parseInt(process.env.PROCESSING_LIMIT!) - processingCount);
    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 1);
  });

  test('No processing or new items from store', async () => {
    dynamoDBClientMock.on(QueryCommand, {
      ExpressionAttributeValues: {
        ':s3_uri': `s3://${process.env.ODS_EVENT_BUCKET}/${process.env.ODS_EVENT_BUCKET_PREFIX}`,
        ':job_status': JobStatus.JOB_PROCESSING,
      },
    }).resolves({
      Count: 0,
      Items: [],
    }).on(QueryCommand, {
      ExpressionAttributeValues: {
        ':s3_uri': `s3://${process.env.ODS_EVENT_BUCKET}/${process.env.ODS_EVENT_BUCKET_PREFIX}`,
        ':job_status': JobStatus.JOB_NEW,
      },
    }).resolvesOnce({
      Count: 0,
      Items: [],
    });
    const response = await handler(scheduleEvent, context);
    expect(response).toEqual(expect.objectContaining({
      count: 0,
      manifestList: [],
    }));
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(QueryCommand, 2);
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(UpdateCommand, 0);
    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 0);
  });

  test('Get items from store with DDB error', async () => {
    dynamoDBClientMock.on(QueryCommand).rejectsOnce();
    try {
      await handler(scheduleEvent, context);
      fail('The error of DDB update was caught');
    } catch (error) {
      expect(dynamoDBClientMock).toHaveReceivedCommandTimes(QueryCommand, 1);
      expect(dynamoDBClientMock).toHaveReceivedCommandTimes(UpdateCommand, 0);
      expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 0);
    }
  });

  // TODO: redesign the error handling with the partial failure of updating the status of item
  test('Update item status in store with DDB error', async () => {
    dynamoDBClientMock.on(QueryCommand, {
      ExpressionAttributeValues: {
        ':s3_uri': `s3://${process.env.ODS_EVENT_BUCKET}/${process.env.ODS_EVENT_BUCKET_PREFIX}`,
        ':job_status': JobStatus.JOB_PROCESSING,
      },
    }).resolves({
      Count: 0,
      Items: [],
    }).on(QueryCommand).resolves({
      Count: 1,
      Items: [
        {
          s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
          s3_object_size: 1823224,
          job_status: JobStatus.JOB_NEW,
        },
      ],
    });
    dynamoDBClientMock.on(UpdateCommand).rejectsOnce();
    try {
      await handler(scheduleEvent, context);
      fail('The error of DDB query was caught');
    } catch (error) {
      expect(dynamoDBClientMock).toHaveReceivedCommandTimes(QueryCommand, 2);
      expect(dynamoDBClientMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
      expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 0);
    }
  });

  // TODO: redesign the error handling with the failure of putting manifest
  test('Put the manifest to S3 error after finding new items', async () => {
    dynamoDBClientMock.on(QueryCommand).resolvesOnce({
      Count: 0,
      Items: [],
    }).resolvesOnce({
      Count: 1,
      Items: [
        {
          s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
          s3_object_size: 1823224,
          job_status: JobStatus.JOB_NEW,
        },
      ],
    });
    dynamoDBClientMock.on(UpdateCommand).resolvesOnce({});
    s3ClientMock.on(PutObjectCommand).rejectsOnce({});
    try {
      await handler(scheduleEvent, context);
      fail('The error of S3 put manifest was caught');
    } catch (error) {
      expect(dynamoDBClientMock).toHaveReceivedCommandTimes(QueryCommand, 2);
      expect(dynamoDBClientMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
      expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 1);
    }
  });

});