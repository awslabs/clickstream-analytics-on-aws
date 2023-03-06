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

const PutObjectCommandMock = jest.fn(() => {});
const sendMock = jest.fn(() => {});

const S3ClientMock = {
  send: sendMock,
};

jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn(() => S3ClientMock),
    PutObjectCommand: PutObjectCommandMock,
  };
});

const event: KinesisStreamEvent = {
  Records: [
    {
      kinesis: {
        partitionKey: 'partitionKey-01',
        kinesisSchemaVersion: '1.0',
        data: 'eyJ0ZXN0IjogImhlbGxvIn0=', //{"test": "hello"}
        sequenceNumber: '49545115243490985018280067714973144582180062593244200961',
        approximateArrivalTimestamp: 1428537600,
      },
      eventSource: 'aws:kinesis',
      eventID: 'shardId-000000000000:49545115243490985018280067714973144582180062593244200961',
      invokeIdentityArn: 'arn:aws:iam::EXAMPLE',
      eventVersion: '1.0',
      eventName: 'aws:kinesis:record',
      eventSourceARN: 'arn:aws:kinesis:EXAMPLE',
      awsRegion: 'us-east-1',
    },

    {
      kinesis: {
        partitionKey: 'partitionKey-02',
        kinesisSchemaVersion: '1.0',
        data: 'eyJ0ZXN0IjogImhlbGxvIn0=', //{"test": "hello"}
        sequenceNumber: '49545115243490985018280067714973144582180062593244200961',
        approximateArrivalTimestamp: 1428537600,
      },
      eventSource: 'aws:kinesis',
      eventID: 'shardId-000000000000:49545115243490985018280067714973144582180062593244200961',
      invokeIdentityArn: 'arn:aws:iam::EXAMPLE',
      eventVersion: '1.0',
      eventName: 'aws:kinesis:record',
      eventSourceARN: 'arn:aws:kinesis:EXAMPLE',
      awsRegion: 'us-east-1',
    },
  ],
};


const eventError: KinesisStreamEvent = {
  Records: [
    {
      kinesis: {
        partitionKey: 'partitionKey-01',
        kinesisSchemaVersion: '1.0',
        data: 'test',
        sequenceNumber: '49545115243490985018280067714973144582180062593244200961',
        approximateArrivalTimestamp: 1428537600,
      },
      eventSource: 'aws:kinesis',
      eventID: 'shardId-000000000000:49545115243490985018280067714973144582180062593244200961',
      invokeIdentityArn: 'arn:aws:iam::EXAMPLE',
      eventVersion: '1.0',
      eventName: 'aws:kinesis:record',
      eventSourceARN: 'arn:aws:kinesis:EXAMPLE',
      awsRegion: 'us-east-1',
    },
  ],
};

process.env.S3_BUCKET = 'test-bucket';
process.env.S3_PREFIX = 'test-prefix';
process.env.LOG_LEVEL = 'WARN';

import { KinesisStreamEvent } from 'aws-lambda';
import { handler } from '../../../src/ingestion-server/kinesis-data-stream/kinesis-to-s3-lambda';

test('Object is put to S3', async ()=> {
  await handler(event);
  expect(sendMock.mock.calls).toHaveLength(1);
});

test('No Object is put to S3 for error', async ()=> {
  await handler(eventError);
  expect(sendMock.mock.calls).toHaveLength(0);
});

test('Bucket and Key are as expected in S3', async ()=> {
  await handler(event);
  const putProps = (PutObjectCommandMock.mock.calls[0] as any[])[0];
  expect(putProps.Bucket).toEqual('test-bucket');
  expect(putProps.Key).toMatch(new RegExp('test-prefix\/year=\\d\\d\\d\\d\/month=\\d\\d\/day=\\d\\d\/hour=\\d\\d\/[a-z0-9-]+\\.gz'));
});


