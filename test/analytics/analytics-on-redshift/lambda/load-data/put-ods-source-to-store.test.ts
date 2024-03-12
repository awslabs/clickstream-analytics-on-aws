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
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeEvent, S3ObjectCreatedNotificationEventDetail } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { handler } from '../../../../../src/analytics/lambdas/load-data-workflow/put-ods-source-to-store';
import 'aws-sdk-client-mock-jest';

describe('Lambda - put ODS event to DDB store', () => {

  const dynamoDBClientMock = mockClient(DynamoDBClient);

  const s3ObjectCreatedEvent: EventBridgeEvent<'Object Created', S3ObjectCreatedNotificationEventDetail> = {
    'version': '0',
    'id': 'e060e26a-21a1-0469-40ea-b96669a2c7f3',
    'detail-type': 'Object Created',
    'source': 'aws.s3',
    'account': 'xxxxxxxxxxxx',
    'time': '2022-11-30T06:54:33Z',
    'region': 'us-east-2',
    'resources': [
      'arn:aws:s3:::DOC-EXAMPLE-BUCKET',
    ],
    'detail': {
      'version': '0',
      'bucket': {
        name: 'DOC-EXAMPLE-BUCKET',
      },
      'object': {
        'key': 'project1/ods_external_events/partition_app=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy',
        'size': 8912078,
        'etag': '36f8b9f9eec955fb49a05237d43114a6-2',
        'version-id': 'a12fGHp9y0ec4Xwo6AIZnzvfPOr_mUmC',
        'sequencer': '006386FE29685D0356',
      },
      'request-id': '5J97ZG32D12H9QRX',
      'requester': 'xxxxxxxxxxxx',
      'source-ip-address': 'xx.xxx.xx.x',
      'reason': 'CompleteMultipartUpload',
    },
  };

  const s3ObjectCreatedEventWithUnsupportedSuffix: EventBridgeEvent<'Object Created', S3ObjectCreatedNotificationEventDetail> = {
    ...s3ObjectCreatedEvent,
    detail: {
      ...s3ObjectCreatedEvent.detail,
      object: {
        ...s3ObjectCreatedEvent.detail.object,
        key: 'project1/ods_external_events/partition_app=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.tmp',
      },
    },
  };

  const s3ObjectCreatedEventWithInvalidAppId: EventBridgeEvent<'Object Created', S3ObjectCreatedNotificationEventDetail> = {
    ...s3ObjectCreatedEvent,
    detail: {
      ...s3ObjectCreatedEvent.detail,
      object: {
        ...s3ObjectCreatedEvent.detail.object,
        key: 'project1/ods_external_events/partition_app=app3/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.tmp',
      },
    },
  };

  const s3ObjectCreatedEventWithInvalidPartition: EventBridgeEvent<'Object Created', S3ObjectCreatedNotificationEventDetail> = {
    ...s3ObjectCreatedEvent,
    detail: {
      ...s3ObjectCreatedEvent.detail,
      object: {
        ...s3ObjectCreatedEvent.detail.object,
        key: 'project1/ods_external_events/partition_app=app1/partition_ye=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.tmp',
      },
    },
  };

  beforeEach(() => {
    dynamoDBClientMock.reset();
  });

  test('Put ODS event source to dynamodb - success', async () => {
    dynamoDBClientMock.on(PutCommand).resolvesOnce({});
    await handler(s3ObjectCreatedEvent);
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(PutCommand, 1);
  });

  test('Don\'t put invalid ODS event source with unknown suffix to dynamodb', async () => {
    dynamoDBClientMock.on(PutCommand).resolvesOnce({});
    await handler(s3ObjectCreatedEventWithUnsupportedSuffix);
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });

  test('Don\'t put invalid ODS event source with invalid appId to dynamodb', async () => {
    dynamoDBClientMock.on(PutCommand).resolvesOnce({});
    await handler(s3ObjectCreatedEventWithInvalidAppId);
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });

  test('Don\'t put invalid ODS event source with invalid partition format to dynamodb', async () => {
    dynamoDBClientMock.on(PutCommand).resolvesOnce({});
    await handler(s3ObjectCreatedEventWithInvalidPartition);
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });

  test('Put item to dynamodb - failed', async () => {
    try {
      dynamoDBClientMock.on(PutCommand).rejectsOnce();
      await handler(s3ObjectCreatedEvent);
      fail('The error should be thrown when putItem to DDB with exception');
    } catch (error) {
      expect(dynamoDBClientMock).toHaveReceivedCommandTimes(PutCommand, 1);
    }
  });
});