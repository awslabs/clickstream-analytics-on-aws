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
import { DescribeStatementCommand, RedshiftDataClient, StatusString } from '@aws-sdk/client-redshift-data';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { handler, CheckLoadStatusEvent } from '../../../../../src/analytics/lambdas/load-data-workflow/check-load-status';
import { REDSHIFT_MODE } from '../../../../../src/common/model';
import { WaitTimeInfo } from '../../../../../src/common/workflow';
import { getMockContext } from '../../../../common/lambda-context';
import 'aws-sdk-client-mock-jest';

const loadStatusEvent: CheckLoadStatusEvent & { waitTimeInfo: WaitTimeInfo } = {
  detail: {
    id: '70bfb836-c7d5-7cab-75b0-5222e78194ac',
    status: '',
    appId: 'app1',
    manifestFileName: 's3://DOC-EXAMPLE-BUCKET/manifest/app150be34be-fdec-4b45-8b14-63c38f910a56.manifest',
    retryCount: 0,
    jobList: {
      entries:
      [{
        url: 's3://DOC-EXAMPLE-BUCKET/project1/ods_external_events/partition_app=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy',
        meta: {
          content_length: 10324001,
        },
      }],
    },
  },
  odsTableName: 'test_me_table',
  odsSourceBucket: 'DOC-EXAMPLE-BUCKET',
  odsSourcePrefix: 'project1/ods_external_events',
  waitTimeInfo: {
    waitTime: 10,
    loopCount: 1,
  },
};


const loadStatusEvent2: CheckLoadStatusEvent & { waitTimeInfo: WaitTimeInfo } = {
  detail: {
    id: '70bfb836-c7d5-7cab-75b0-5222e78194ac',
    status: '',
    appId: 'app1',
    manifestFileName: 's3://DOC-EXAMPLE-BUCKET/manifest/app150be34be-fdec-4b45-8b14-63c38f910a56.manifest',
    retryCount: 3,
    jobList: {
      entries:
      [{
        url: 's3://DOC-EXAMPLE-BUCKET/project1/ods_external_events/partition_app=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy',
        meta: {
          content_length: 10324001,
        },
      }],
    },
  },
  odsTableName: 'test_me_table',
  odsSourceBucket: 'DOC-EXAMPLE-BUCKET',
  odsSourcePrefix: 'project1/ods_external_events',
  waitTimeInfo: {
    waitTime: 10,
    loopCount: 1,
  },
};


const loadStatusEvent3: CheckLoadStatusEvent & { waitTimeInfo: WaitTimeInfo } = {
  detail: {
    id: '70bfb836-c7d5-7cab-75b0-5222e78194ac',
    status: '',
    appId: 'app1',
    manifestFileName: 's3://DOC-EXAMPLE-BUCKET/manifest/app150be34be-fdec-4b45-8b14-63c38f910a56.manifest',
    retryCount: 5,
    jobList: {
      entries:
      [{
        url: 's3://DOC-EXAMPLE-BUCKET/project1/ods_external_events/partition_app=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy',
        meta: {
          content_length: 10324001,
        },
      }],
    },
  },
  odsTableName: 'test_me_table',
  odsSourceBucket: 'DOC-EXAMPLE-BUCKET',
  odsSourcePrefix: 'project1/ods_external_events',
  waitTimeInfo: {
    waitTime: 10,
    loopCount: 1,
  },
};

const context = getMockContext();

describe('Lambda - check the COPY query status in Redshift Serverless', () => {

  const redshiftDataMock = mockClient(RedshiftDataClient);
  const dynamoDBClientMock = mockClient(DynamoDBClient);
  const s3ClientMock = mockClient(S3Client);

  const workGroupName = 'demo';

  beforeEach(() => {
    redshiftDataMock.reset();
    dynamoDBClientMock.reset();
    s3ClientMock.reset();

    // set the env before loading the source
    process.env.REDSHIFT_MODE = REDSHIFT_MODE.SERVERLESS;
    process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME = workGroupName;
  });

  test('Check load status with response FINISHED', async () => {
    redshiftDataMock.on(DescribeStatementCommand).resolves({
      Status: StatusString.FINISHED,
    });
    dynamoDBClientMock.on(DeleteCommand).resolves({});
    s3ClientMock.on(DeleteObjectCommand).resolvesOnce({});
    const resp = await handler(loadStatusEvent, context);
    expect(resp).toEqual({
      detail: {
        status: StatusString.FINISHED,
      },
    });
    expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
      Id: loadStatusEvent.detail.id,
    });
    expect(dynamoDBClientMock).toHaveReceivedCommandWith(DeleteCommand, {
      Key: {
        s3_uri: loadStatusEvent.detail.jobList.entries[0].url,
      },
    });
    expect(s3ClientMock).toHaveReceivedCommandWith(DeleteObjectCommand, {
      Key: 'manifest/app150be34be-fdec-4b45-8b14-63c38f910a56.manifest',
    });
  });

  test('Check load status with response STARTED', async () => {
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.STARTED,
    });
    dynamoDBClientMock.on(DeleteCommand).resolvesOnce({});
    s3ClientMock.on(DeleteObjectCommand).resolvesOnce({});
    const resp = await handler(loadStatusEvent, context);
    expect(resp).toEqual({
      detail: expect.objectContaining({
        status: StatusString.STARTED,
      }),
      odsTableName: loadStatusEvent.odsTableName,
      odsSourceBucket: loadStatusEvent.odsSourceBucket,
      odsSourcePrefix: loadStatusEvent.odsSourcePrefix,
      waitTimeInfo: expect.objectContaining({
        waitTime: 10,
        loopCount: 2,
      }),
    });
    expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
      Id: loadStatusEvent.detail.id,
    });
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(DeleteCommand, 0);
    expect(s3ClientMock).toHaveReceivedCommandTimes(DeleteObjectCommand, 0);
  });

  test('Check load status with response FAILED', async () => {
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.FAILED,
    });
    dynamoDBClientMock.on(DeleteCommand).resolves({});
    s3ClientMock.on(DeleteObjectCommand).resolves({});

    const resp = await handler(loadStatusEvent, context);

    expect(resp).toEqual(expect.objectContaining({
      detail: expect.objectContaining({
        status: StatusString.FAILED,
        retryCount: 1,
        retry: false,
      }),
    }));
    expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
      Id: loadStatusEvent.detail.id,
    });
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(DeleteCommand, 0);
    expect(s3ClientMock).toHaveReceivedCommandTimes(DeleteObjectCommand, 0);
  });


  test('Check load status with response FAILED and retry', async () => {
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.FAILED,
      Error: 'Error: could not complete because of conflict with concurrent transaction',
    });
    dynamoDBClientMock.on(DeleteCommand).resolves({});
    s3ClientMock.on(DeleteObjectCommand).resolves({});
    const resp = await handler(loadStatusEvent2, context);

    expect(resp).toEqual(expect.objectContaining({
      detail: expect.objectContaining({
        status: StatusString.FAILED,
        retryCount: 4,
        retry: true,
      }),
    }));
  });


  test('Check load status with response FAILED with max retry count', async () => {
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.FAILED,
      Error: 'Error: could not complete because of conflict with concurrent transaction',
    });
    dynamoDBClientMock.on(DeleteCommand).resolves({});
    s3ClientMock.on(DeleteObjectCommand).resolves({});
    const resp = await handler(loadStatusEvent3, context);

    expect(resp).toEqual(expect.objectContaining({
      detail: expect.objectContaining({
        status: StatusString.FAILED,
        retryCount: 6,
        retry: false,
      }),
    }));
  });

  test('Check load status with response ABORTED', async () => {
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.ABORTED,
    });
    dynamoDBClientMock.on(DeleteCommand).resolves({});
    s3ClientMock.on(DeleteObjectCommand).resolves({});
    const resp = await handler(loadStatusEvent, context);
    expect(resp).toEqual(expect.objectContaining({
      detail: expect.objectContaining({
        status: StatusString.ABORTED,
      }),
    }));
    expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
      Id: loadStatusEvent.detail.id,
    });
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(DeleteCommand, 0);
    expect(s3ClientMock).toHaveReceivedCommandTimes(DeleteObjectCommand, 0);
  });

  test('Check load status with response FINISHED and DDB delete error', async () => {
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.FINISHED,
    });
    dynamoDBClientMock.on(DeleteCommand).rejects();
    try {
      await handler(loadStatusEvent, context);
      fail('DDB error was caught in handler');
    } catch (error) {
      expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
        Id: loadStatusEvent.detail.id,
      });
      expect(dynamoDBClientMock).toHaveReceivedCommandWith(DeleteCommand, {
        Key: {
          s3_uri: loadStatusEvent.detail.jobList.entries[0].url,
        },
      });
      expect(s3ClientMock).toHaveReceivedCommandTimes(DeleteObjectCommand, 0);
    }
  });

  test('Check load status with response FINISHED and s3 delete error', async () => {
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.FINISHED,
    });
    dynamoDBClientMock.on(DeleteCommand).resolvesOnce({});
    s3ClientMock.on(DeleteObjectCommand).rejects();
    const resp = await handler(loadStatusEvent, context);
    expect(resp).toEqual({
      detail: {
        status: StatusString.FINISHED,
      },
    });
    expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
      Id: loadStatusEvent.detail.id,
    });
    expect(dynamoDBClientMock).toHaveReceivedCommandWith(DeleteCommand, {
      Key: {
        s3_uri: loadStatusEvent.detail.jobList.entries[0].url,
      },
    });
    expect(s3ClientMock).toHaveReceivedCommandWith(DeleteObjectCommand, {
      Bucket: 'DOC-EXAMPLE-BUCKET',
      Key: 'manifest/app150be34be-fdec-4b45-8b14-63c38f910a56.manifest',
    });
  });

  test('Check load status with redshift data API error', async () => {
    redshiftDataMock.on(DescribeStatementCommand).rejectsOnce();
    try {
      await handler(loadStatusEvent, context);
      fail('Redshift data api error was caught in handler');
    } catch (error) {
      expect(redshiftDataMock).toHaveReceivedCommandWith(DescribeStatementCommand, {
        Id: loadStatusEvent.detail.id,
      });
      expect(dynamoDBClientMock).toHaveReceivedCommandTimes(DeleteCommand, 0);
      expect(s3ClientMock).toHaveReceivedCommandTimes(DeleteObjectCommand, 0);
    }
  });
});