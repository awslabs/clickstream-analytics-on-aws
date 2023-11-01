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

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { handler, UpdateWorkflowInfoEvent } from '../../../../../src/analytics/lambdas/scan-metadata-workflow/update-workflow-info';
import 'aws-sdk-client-mock-jest';


const updateWorkflowInfoEvent: UpdateWorkflowInfoEvent = {
  lastJobStartTimestamp: 1698330523913,
  lastScanEndDate: '2023-10-26',
};

describe('Lambda - check workflow start', () => {
  const dynamoDBMock = mockClient(DynamoDBDocumentClient);
  const s3ClientMock = mockClient(S3Client);

  beforeEach(() => {
    dynamoDBMock.reset();
    s3ClientMock.reset();
  });

  test('update workflow information', async () => {
    dynamoDBMock.on(PutCommand).resolvesOnce({});
    s3ClientMock.on(PutObjectCommand).resolvesOnce({});
    await handler(updateWorkflowInfoEvent);
    expect(s3ClientMock).toHaveReceivedNthCommandWith(1, PutObjectCommand, {
      Bucket: 'test-pipe-line-bucket',
      Key: 'pipeline-prefix/scan-metadata-job-info/project1/workflow-job-info.json',
      Body: '{\"lastJobStartTimestamp\":1698330523913,\"lastScanEndDate\":\"2023-10-26\"}',
    });
    expect(dynamoDBMock).toHaveReceivedNthCommandWith(1, PutCommand, {
      TableName: 'ClickstreamAnalyticsMetadata',
      Item: {
        id: 'PROJECT_SUMMARY#project1',
        month: '#000000',
        latestScanDate: '2023-10-26T00:00:00.000Z',
        lastJobStartTimestamp: 1698330523913,
      },
    });
  });
});