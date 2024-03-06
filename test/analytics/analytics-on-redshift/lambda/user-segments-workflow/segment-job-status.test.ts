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

import { DescribeStatementCommand, RedshiftDataClient, StatusString } from '@aws-sdk/client-redshift-data';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { handler } from '../../../../../src/analytics/lambdas/user-segments-workflow/segment-job-status';
import 'aws-sdk-client-mock-jest';
import { SegmentJobStatus } from '../../../../../src/analytics/private/segments/segments-model';

describe('User segments workflow segment-job-status lambda tests', () => {
  const ddbDocClientMock = mockClient(DynamoDBDocumentClient);
  const redshiftDataClientMock = mockClient(RedshiftDataClient);
  const event = {
    appId: 'app-id',
    segmentId: 'segment-id',
    jobRunId: 'job-run-id',
    queryId: 'query-id',
    jobStatus: SegmentJobStatus.IN_PROGRESS,
  };

  test('Segment job is running', async () => {
    redshiftDataClientMock.on(DescribeStatementCommand).resolves({ Status: StatusString.STARTED });

    const resp = await handler(event);

    expect(resp).toEqual({
      ...event,
      jobStatus: SegmentJobStatus.IN_PROGRESS,
    });
    expect(ddbDocClientMock).not.toHaveReceivedCommandWith(UpdateCommand, expect.any(Object));
  });

  test('Segment job is completed', async () => {
    redshiftDataClientMock.on(DescribeStatementCommand).resolves({ Status: StatusString.FINISHED });

    const resp = await handler(event);

    expect(resp).toEqual({
      ...event,
      jobStatus: SegmentJobStatus.COMPLETED,
    });
    expect(ddbDocClientMock).toHaveReceivedCommandWith(UpdateCommand, {
      TableName: 'ClickStreamApiClickstreamMetadata',
      Key: {
        id: event.segmentId,
        type: `SEGMENT_JOB#${event.jobRunId}`,
      },
      UpdateExpression: 'set jobStatus = :js, jobEndTime = :et',
      ExpressionAttributeValues: {
        ':js': SegmentJobStatus.COMPLETED,
        ':et': expect.any(Number),
      },
      ReturnValues: 'ALL_NEW',
    });
  });

  test('Segment job is failed', async () => {
    redshiftDataClientMock.on(DescribeStatementCommand).resolves({ Status: StatusString.FAILED });

    const resp = await handler(event);

    expect(resp).toEqual({
      ...event,
      jobStatus: SegmentJobStatus.FAILED,
    });
    expect(ddbDocClientMock).toHaveReceivedCommandWith(UpdateCommand, {
      TableName: 'ClickStreamApiClickstreamMetadata',
      Key: {
        id: event.segmentId,
        type: `SEGMENT_JOB#${event.jobRunId}`,
      },
      UpdateExpression: 'set jobStatus = :js, jobEndTime = :et',
      ExpressionAttributeValues: {
        ':js': SegmentJobStatus.FAILED,
        ':et': expect.any(Number),
      },
      ReturnValues: 'ALL_NEW',
    });
  });
});
