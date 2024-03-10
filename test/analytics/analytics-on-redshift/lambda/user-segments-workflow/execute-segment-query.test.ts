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

import { ExecuteStatementCommand, RedshiftDataClient } from '@aws-sdk/client-redshift-data';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import {
  ExecuteSegmentQueryEvent,
  handler,
} from '../../../../../src/analytics/lambdas/user-segments-workflow/execute-segment-query';
import { StateMachineStatus } from '../../../../../src/analytics/lambdas/user-segments-workflow/state-machine-status';
import 'aws-sdk-client-mock-jest';

describe('User segments workflow execute-segment-query lambda tests', () => {
  const ddbDocClientMock = mockClient(DynamoDBDocumentClient);
  const redshiftDataClientMock = mockClient(RedshiftDataClient);
  const event: ExecuteSegmentQueryEvent = {
    appId: 'app-id',
    segmentId: 'segment-id',
    jobRunId: 'job-run-id',
    stateMachineStatus: StateMachineStatus.IDLE,
  };

  test('Execute segment query', async () => {
    ddbDocClientMock.on(UpdateCommand).resolvesOnce({});
    redshiftDataClientMock.on(ExecuteStatementCommand).resolvesOnce({ Id: 'query-id-1' });

    const resp = await handler(event);

    expect(resp).toEqual({
      appId: event.appId,
      segmentId: event.segmentId,
      jobRunId: event.jobRunId,
      queryId: 'query-id-1',
    });
    expect(ddbDocClientMock).toHaveReceivedCommandWith(UpdateCommand, {
      TableName: 'ClickStreamApiClickstreamMetadata',
      Key: {
        id: 'segment-id',
        type: 'SEGMENT_JOB#job-run-id',
      },
      UpdateExpression: 'set jobStatus = :js',
      ExpressionAttributeValues: {
        ':js': 'In Progress',
      },
      ReturnValues: 'ALL_NEW',
    });
    expect(redshiftDataClientMock).toHaveReceivedCommandWith(ExecuteStatementCommand, {
      WorkgroupName: 'workgroup-test',
      Sql: expect.any(String),
    });
  });

  test('Execute segment query failed due to execute command error', async () => {
    ddbDocClientMock.on(UpdateCommand).resolvesOnce({});
    redshiftDataClientMock.on(ExecuteStatementCommand).rejectsOnce();

    try {
      await handler(event);
    } catch (error) {
      expect(redshiftDataClientMock).toHaveReceivedCommandWith(ExecuteStatementCommand, {
        WorkgroupName: 'workgroup-test',
        Sql: expect.any(String),
      });
    }
  });
});
