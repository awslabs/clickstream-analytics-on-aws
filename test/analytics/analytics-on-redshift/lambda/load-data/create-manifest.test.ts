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

import {
  PARTITION_APP,
} from '@aws/clickstream-base-lib';
import {
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import {
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  mockClient,
} from 'aws-sdk-client-mock';

// must keep it before some imports
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

import {
  handler,
  ODSEventItem,
  CreateLoadManifestEvent,
} from '../../../../../src/analytics/lambdas/load-data-workflow/create-load-manifest';
import {
  JobStatus,
} from '../../../../../src/analytics/private/constant';
import 'aws-sdk-client-mock-jest';
import {
  AnalyticsCustomMetricsName,
  MetricsNamespace,
  MetricsService,
} from '../../../../../src/common/model';
import {
  getMockContext,
} from '../../../../common/lambda-context';


//@ts-ignore
expect(MetricsMock.mock.calls[0][0]).toEqual({
  namespace: MetricsNamespace.REDSHIFT_ANALYTICS,
  serviceName: MetricsService.WORKFLOW,
});


describe('Lambda - Create manifest for Redshift COPY', () => {

  const dynamoDBClientMock = mockClient(DynamoDBClient);
  const s3ClientMock = mockClient(S3Client);

  const scheduleEvent: CreateLoadManifestEvent = {
    odsTableName: 'test_me_table',
    odsSourceBucket: 'DOC-EXAMPLE-BUCKET',
    odsSourcePrefix: 'project1/ods_external_events',
  };

  const context = getMockContext();

  beforeEach(() => {
    dynamoDBClientMock.reset();
    s3ClientMock.reset();
    MetricsMock.mockReset();
  });

  test('Get 1 new item from store then create manifest', async () => {
    dynamoDBClientMock.on(QueryCommand).resolvesOnce({
      Count: 1,
      Items: [{
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
        s3_object_size: 1823224,
        job_status: JobStatus.JOB_NEW,
      }],

    }).resolves({
      Count: 0,
      Items: [],
    });
    dynamoDBClientMock.on(UpdateCommand).resolvesOnce({});
    s3ClientMock.on(PutObjectCommand).resolvesOnce({});

    const response = await handler(scheduleEvent, context);
    expect(response).toEqual(expect.objectContaining({
      manifestList: [{
        appId: 'app1',
        jobList: {
          entries: [{
            meta: {
              content_length: 1823224,
            },
            url: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
          }],
        },
        manifestFileName: `s3://${process.env.MANIFEST_BUCKET}/${process.env.MANIFEST_BUCKET_PREFIX}${scheduleEvent.odsTableName}/manifest/app1-${context.awsRequestId}.manifest`,
        retryCount: 0,
      }],
      count: 1,
      odsTableName: 'test_me_table',
    }));

    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(QueryCommand, 4);
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 1);
    expect(addMetricMock).toBeCalledTimes(4);
    expect(publishStoredMetricsMock).toBeCalledTimes(1);
  });


  test('Get 4 new items with different applications from store then create three manifest', async () => {
    dynamoDBClientMock.on(QueryCommand).resolvesOnce({
      Count: 4,
      Items: [{
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
        s3_object_size: 1823224,
        job_status: JobStatus.JOB_NEW,
        timestamp: new Date(new Date().getTime() - 4 * 3600 * 1000).getTime(),
      },
      {
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00001.parquet.snappy`,
        s3_object_size: 232322,
        job_status: JobStatus.JOB_NEW,
        timestamp: new Date(new Date().getTime() - 3 * 3600 * 1000).getTime(),
      },
      {
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app2/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
        s3_object_size: 200200,
        job_status: JobStatus.JOB_NEW,
        timestamp: new Date(new Date().getTime() - 2 * 3600 * 1000).getTime(),
      },
      {
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app3/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
        s3_object_size: 1233232,
        job_status: JobStatus.JOB_NEW,
        timestamp: new Date(new Date().getTime() - 1 * 3600 * 1000).getTime(),
      }],
    }).resolvesOnce({
      Count: 1,
      Items: [{
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app3/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
        s3_object_size: 1233232,
        job_status: JobStatus.JOB_PROCESSING,
        timestamp: new Date(new Date().getTime() - 5 * 3600 * 1000).getTime(),
      }],
    })
      .resolvesOnce({
        Count: 1,
        Items: [{
          s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app3/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
          s3_object_size: 1233232,
          job_status: JobStatus.JOB_ENQUEUE,
          timestamp: new Date(new Date().getTime() - 1 * 3600 * 1000).getTime(),
        }],
      }).resolves({
        Count: 1,
        Items: [{
          s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app3/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part9999.parquet.snappy`,
          s3_object_size: 1233232,
          job_status: JobStatus.JOB_ENQUEUE,
          timestamp: new Date(new Date().getTime() - 5 * 3600 * 1000).getTime(),
        }],
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
          manifestFileName: `s3://${process.env.MANIFEST_BUCKET}/${process.env.MANIFEST_BUCKET_PREFIX}${scheduleEvent.odsTableName}/manifest/app1-${context.awsRequestId}.manifest`,
          retryCount: 0,
        }),
        expect.objectContaining({
          appId: 'app2',
          manifestFileName: `s3://${process.env.MANIFEST_BUCKET}/${process.env.MANIFEST_BUCKET_PREFIX}${scheduleEvent.odsTableName}/manifest/app2-${context.awsRequestId}.manifest`,
          retryCount: 0,
        }),
        expect.objectContaining({
          appId: 'app3',
          manifestFileName: `s3://${process.env.MANIFEST_BUCKET}/${process.env.MANIFEST_BUCKET_PREFIX}${scheduleEvent.odsTableName}/manifest/app3-${context.awsRequestId}.manifest`,
          retryCount: 0,
        }),
      ]),
      count: 3,
      odsTableName: scheduleEvent.odsTableName,
    }));
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(QueryCommand, 4);
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(UpdateCommand, 5);
    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 3);
    expect(addMetricMock).toBeCalledTimes(4);
    expect(addMetricMock.mock.calls[0]).toEqual([AnalyticsCustomMetricsName.FILE_NEW, 'Count', 4]);
    expect(addMetricMock.mock.calls[1]).toEqual([AnalyticsCustomMetricsName.FILE_PROCESSING, 'Count', 1]);
    expect(addMetricMock.mock.calls[2]).toEqual([AnalyticsCustomMetricsName.FILE_ENQUEUE, 'Count', 1]);

    //@ts-ignore
    expect(addMetricMock.mock.calls[3][0]).toEqual(AnalyticsCustomMetricsName.FILE_MAX_AGE);
    //@ts-ignore
    expect(addMetricMock.mock.calls[3][1]).toEqual('Seconds');
    //@ts-ignore
    expect(addMetricMock.mock.calls[3][2] - 5 * 3600).toBeLessThan(1);
    //@ts-ignore
    expect(addMetricMock.mock.calls[3][2] - 5 * 3600).toBeGreaterThanOrEqual(0);

  });

  test('Get 8 processing items from store that equals or greater than the QUERY_RESULT_LIMIT', async () => {
    const items: ODSEventItem[] = [];
    Array(8).fill(0).map((_, i) => items.push({
      s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part0000${i}.parquet.snappy`,
      s3_object_size: '1823224',
      job_status: JobStatus.JOB_PROCESSING,
      timestamp: new Date(new Date().getTime() - 3600 * 1000).getTime(),
    }));
    dynamoDBClientMock.on(QueryCommand)
      .resolvesOnce({
        Count: 0,
        Items: [],
      }).resolvesOnce({
        Count: 0,
        Items: [],
      }).resolvesOnce({
        Count: items.length,
        Items: items,
      }).resolvesOnce({
        Count: 0,
        Items: [],
      });

    const response = await handler(scheduleEvent, context);
    expect(response).toEqual(expect.objectContaining({
      count: 0,
      manifestList: [],
    }));
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(QueryCommand, 4);
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(UpdateCommand, 0);
    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 0);
    expect(addMetricMock).toBeCalledTimes(4);
  });

  test('Get more processing items from store processing with paging', async () => {
    const firstBatchItems: ODSEventItem[] = [];
    Array(3).fill(0).map((_, i) => firstBatchItems.push({
      s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part0000${i}.parquet.snappy`,
      s3_object_size: '1823224',
      job_status: JobStatus.JOB_PROCESSING,
      timestamp: new Date(new Date().getTime() - 3600 * 1000).getTime(),
    }));
    const secondBatchItems: ODSEventItem[] = [];
    Array(6).fill(0).map((_, i) => secondBatchItems.push({
      s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part1000${i}.parquet.snappy`,
      s3_object_size: '1823224',
      job_status: JobStatus.JOB_PROCESSING,
      timestamp: new Date(new Date().getTime() - 3600 * 1000).getTime(),
    }));
    const lastEvaluatedKey = {
      s3_uri: 'nextToken',
    };
    dynamoDBClientMock.on(QueryCommand)
      .resolvesOnce({
        Count: 0,
        Items: [],
      }).resolvesOnce({
        Count: 0,
        Items: [],
      })
      .resolvesOnce({
        Count: firstBatchItems.length,
        Items: firstBatchItems,
        LastEvaluatedKey: lastEvaluatedKey,
      }).resolvesOnce({
        Count: secondBatchItems.length,
        Items: secondBatchItems,
      }).resolvesOnce({
        Count: 0,
        Items: [],
      });

    const response = await handler(scheduleEvent, context);
    expect(response).toEqual(expect.objectContaining({
      count: 0,
      manifestList: [],
    }));
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(QueryCommand, 5);
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(UpdateCommand, 0);
    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 0);
    expect(addMetricMock).toBeCalledTimes(4);
  });

  test('Get 6 new items from store with paging that the processing items are less than queryResultLimit', async () => {
    const processingItems: ODSEventItem[] = [];
    const processingCount = 2;
    Array(processingCount).fill(0).map((_, i) => processingItems.push({
      s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part0030${i}.parquet.snappy`,
      s3_object_size: '1823224',
      job_status: JobStatus.JOB_PROCESSING,
      timestamp: new Date(new Date().getTime() - 3600 * 1000).getTime(),
    }));
    const firstBatchNewItems: ODSEventItem[] = [];
    Array(3).fill(0).map((_, i) => firstBatchNewItems.push({
      s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part0000${i}.parquet.snappy`,
      s3_object_size: '1823224',
      job_status: JobStatus.JOB_NEW,
      timestamp: new Date(new Date().getTime() - 3600 * 1000).getTime(),
    }));
    const secondBatchNewItems: ODSEventItem[] = [];
    Array(3).fill(0).map((_, i) => secondBatchNewItems.push({
      s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part1000${i}.parquet.snappy`,
      s3_object_size: '1823224',
      job_status: JobStatus.JOB_NEW,
      timestamp: new Date(new Date().getTime() - 3600 * 1000).getTime(),
    }));
    const lastEvaluatedKey = {
      s3_uri: 'nextToken',
    };
    dynamoDBClientMock.on(QueryCommand)
      .resolvesOnce({
        Count: firstBatchNewItems.length,
        Items: firstBatchNewItems,
        LastEvaluatedKey: lastEvaluatedKey,
      }).resolvesOnce({
        Count: secondBatchNewItems.length,
        Items: secondBatchNewItems,
      }).resolvesOnce({
        Count: processingItems.length,
        Items: processingItems,
      }).resolves({
        Count: 0,
        Items: [],
      });;

    const response = await handler(scheduleEvent, context);
    expect(response).toEqual(expect.objectContaining({
      manifestList: expect.arrayContaining([
        expect.objectContaining({
          appId: 'app1',
          manifestFileName: `s3://${process.env.MANIFEST_BUCKET}/${process.env.MANIFEST_BUCKET_PREFIX}${scheduleEvent.odsTableName}/manifest/app1-${context.awsRequestId}.manifest`,
        }),
      ]),
      count: 1,
      odsTableName: scheduleEvent.odsTableName,
    }));
    expect(response.manifestList[0].jobList.entries).toHaveLength(parseInt(process.env.QUERY_RESULT_LIMIT!));
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(QueryCommand, 5);
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(UpdateCommand, parseInt(process.env.QUERY_RESULT_LIMIT!));
    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 1);
    expect(addMetricMock).toBeCalledTimes(4);

  });

  test('No processing or new items from store', async () => {
    dynamoDBClientMock.on(QueryCommand, {
      ExpressionAttributeValues: {
        ':s3_uri': `s3://${process.env.ODS_EVENT_BUCKET}/${process.env.ODS_EVENT_BUCKET_PREFIX}`,
        ':job_status': JobStatus.JOB_PROCESSING,
      },
    }).resolvesOnce({
      Count: 0,
      Items: [],
    }).on(QueryCommand, {
      ExpressionAttributeValues: {
        ':s3_uri': `s3://${process.env.ODS_EVENT_BUCKET}/${process.env.ODS_EVENT_BUCKET_PREFIX}`,
        ':job_status': JobStatus.JOB_NEW,
      },
    }).resolves({
      Count: 0,
      Items: [],
    }).on(QueryCommand).resolves({
      Count: 0,
      Items: [],
    });


    const response = await handler(scheduleEvent, context);
    expect(response).toEqual(expect.objectContaining({
      count: 0,
      manifestList: [],
    }));
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(QueryCommand, 4);
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(UpdateCommand, 0);
    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 0);
    expect(addMetricMock).toBeCalledTimes(4);
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
    dynamoDBClientMock.on(QueryCommand).resolvesOnce({
      Count: 0,
      Items: [],
    }).resolves({
      Count: 0,
      Items: [],
    }).resolvesOnce({
      Count: 1,
      Items: [{
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
        s3_object_size: 1823224,
        job_status: JobStatus.JOB_PROCESSING,
      } as any],
    }).resolves({
      Count: 0,
      Items: [],
    });

    dynamoDBClientMock.on(UpdateCommand).rejects();
    try {
      await handler(scheduleEvent, context);
      fail('The error of DDB query was caught');
    } catch (error) {
      expect(dynamoDBClientMock).toHaveReceivedCommandTimes(QueryCommand, 2);
      expect(dynamoDBClientMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
      expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 0);
      expect(addMetricMock).toBeCalledTimes(0);
    }
  });

  // TODO: redesign the error handling with the failure of putting manifest
  test('Put the manifest to S3 error after finding new items', async () => {
    dynamoDBClientMock.on(QueryCommand).resolvesOnce({
      Count: 1,
      Items: [{
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
        s3_object_size: 1823224,
        job_status: JobStatus.JOB_NEW,
      }],
    }).resolves({
      Count: 0,
      Items: [],
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
      expect(addMetricMock).toBeCalledTimes(0);
    }
  });


  test('QueryCommand LastEvaluatedKey is set correctly', async () => {
    dynamoDBClientMock.on(QueryCommand).resolvesOnce({
      LastEvaluatedKey: {
        key1: 'NextKey1',
      },
      Count: 2,
      Items: [{
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
        s3_object_size: 1823224,
        job_status: JobStatus.JOB_NEW,
        timestamp: new Date().getTime(),
      },
      {
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00001.parquet.snappy`,
        s3_object_size: 232322,
        job_status: JobStatus.JOB_NEW,
        timestamp: new Date().getTime(),
      }],
    }).resolvesOnce({
      LastEvaluatedKey: {
        key1: 'NextKey2',
      },
      Count: 1,
      Items: [{
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app3/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
        s3_object_size: 1233232,
        job_status: JobStatus.JOB_NEW,
        timestamp: new Date().getTime(),
      }],
    }).resolvesOnce({
      Count: 1,
      Items: [{
        s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app3/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
        s3_object_size: 1233232,
        job_status: JobStatus.JOB_NEW,
        timestamp: new Date().getTime(),
      }],
      LastEvaluatedKey: {
        key1: 'NextKey3',
      },
    }).resolvesOnce({
      Count: 0,
      Items: [],
    })
      .resolvesOnce({
        Count: 0,
        Items: [],
      })
      .resolvesOnce({
        Count: 1,
        Items: [{
          s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app3/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
          s3_object_size: 1233232,
          job_status: JobStatus.JOB_PROCESSING,
          timestamp: new Date().getTime(),
        }],
      })
      .resolvesOnce({
        Count: 1,
        Items: [{
          s3_uri: `s3://${process.env.ODS_EVENT_BUCKET}/project1/ods_external_events/${PARTITION_APP}=app3/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy`,
          s3_object_size: 1233232,
          job_status: JobStatus.JOB_ENQUEUE,
          timestamp: new Date().getTime(),
        }],
      });

    dynamoDBClientMock.on(UpdateCommand).resolvesOnce({});
    s3ClientMock.on(PutObjectCommand).resolvesOnce({});

    await handler(scheduleEvent, context);

    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(QueryCommand, 7);
    expect(dynamoDBClientMock).toHaveReceivedNthCommandWith(1, QueryCommand, {
      ExclusiveStartKey: undefined,
      ExpressionAttributeNames: { '#job_status': 'job_status', '#s3_uri': 's3_uri' },
      ExpressionAttributeValues: { ':job_status': `${scheduleEvent.odsTableName}#NEW`, ':s3_uri': `s3://${scheduleEvent.odsSourceBucket}/${scheduleEvent.odsSourcePrefix}` },
      FilterExpression: 'begins_with(#s3_uri, :s3_uri)',
      IndexName: 'by_status',
      KeyConditionExpression: '#job_status = :job_status',
      ScanIndexForward: true,
      TableName: 'project1_ods_events_trigger',
    });
    expect(dynamoDBClientMock).toHaveReceivedNthCommandWith(2, QueryCommand, {
      ExclusiveStartKey: { key1: 'NextKey1' },
      ExpressionAttributeNames: { '#job_status': 'job_status', '#s3_uri': 's3_uri' },
      ExpressionAttributeValues: { ':job_status': `${scheduleEvent.odsTableName}#NEW`, ':s3_uri': `s3://${scheduleEvent.odsSourceBucket}/${scheduleEvent.odsSourcePrefix}` },
      FilterExpression: 'begins_with(#s3_uri, :s3_uri)',
      IndexName: 'by_status',
      KeyConditionExpression: '#job_status = :job_status',
      ScanIndexForward: true,
      TableName: 'project1_ods_events_trigger',
    });
    expect(dynamoDBClientMock).toHaveReceivedNthCommandWith(3, QueryCommand, {
      ExclusiveStartKey: { key1: 'NextKey2' },
      ExpressionAttributeNames: { '#job_status': 'job_status', '#s3_uri': 's3_uri' },
      ExpressionAttributeValues: { ':job_status': `${scheduleEvent.odsTableName}#NEW`, ':s3_uri': `s3://${scheduleEvent.odsSourceBucket}/${scheduleEvent.odsSourcePrefix}` },
      FilterExpression: 'begins_with(#s3_uri, :s3_uri)',
      IndexName: 'by_status',
      KeyConditionExpression: '#job_status = :job_status',
      ScanIndexForward: true,
      TableName: 'project1_ods_events_trigger',
    });
    expect(dynamoDBClientMock).toHaveReceivedNthCommandWith(4, QueryCommand, {
      ExclusiveStartKey: { key1: 'NextKey3' },
      ExpressionAttributeNames: { '#job_status': 'job_status', '#s3_uri': 's3_uri' },
      ExpressionAttributeValues: { ':job_status': `${scheduleEvent.odsTableName}#NEW`, ':s3_uri': `s3://${scheduleEvent.odsSourceBucket}/${scheduleEvent.odsSourcePrefix}` },
      FilterExpression: 'begins_with(#s3_uri, :s3_uri)',
      IndexName: 'by_status',
      KeyConditionExpression: '#job_status = :job_status',
      ScanIndexForward: true,
      TableName: 'project1_ods_events_trigger',
    });

    expect(dynamoDBClientMock).toHaveReceivedNthCommandWith(6, UpdateCommand, {
      ConditionExpression: 'attribute_exists(s3_uri)',
      ExpressionAttributeNames: { '#execution_id': 'execution_id', '#job_status': 'job_status' },
      ExpressionAttributeValues: { ':p1': `${scheduleEvent.odsTableName}#ENQUEUE`, ':p2': 'request-id-1' },
      Key: { s3_uri: 's3://EXAMPLE-BUCKET-2/project1/ods_external_events/partition_app=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy' },
      TableName: 'project1_ods_events_trigger',
      UpdateExpression: 'SET #job_status= :p1, #execution_id= :p2',
    });


    expect(dynamoDBClientMock).toHaveReceivedNthCommandWith(11, QueryCommand,
      {
        ExclusiveStartKey: undefined,
        ExpressionAttributeNames: { '#job_status': 'job_status', '#s3_uri': 's3_uri' },
        ExpressionAttributeValues: { ':job_status': `${scheduleEvent.odsTableName}#ENQUEUE`, ':s3_uri': `s3://${scheduleEvent.odsSourceBucket}/${scheduleEvent.odsSourcePrefix}` },
        FilterExpression: 'begins_with(#s3_uri, :s3_uri)',
        IndexName: 'by_status',
        KeyConditionExpression: '#job_status = :job_status',
        ScanIndexForward: true,
        TableName: 'project1_ods_events_trigger',
      });
  });

});