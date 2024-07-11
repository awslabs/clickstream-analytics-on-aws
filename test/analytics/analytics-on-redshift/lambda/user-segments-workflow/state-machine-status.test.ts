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

import { SegmentJobStatus } from '@aws/clickstream-base-lib';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

import {
  handler,
  StateMachineStatus,
  StateMachineStatusEvent,
} from '../../../../../src/analytics/lambdas/user-segments-workflow/state-machine-status';
import {
  MOCK_SEGMENT_JOB_STATUS_ITEM,
} from '../../../../../src/control-plane/backend/lambda/api/test/api/segments/segments-mock';
import { getMockContext } from '../../../../common/lambda-context';

describe('User segments workflow segment-job-status lambda tests', () => {
  const ddbDocClientMock = mockClient(DynamoDBDocumentClient);
  const contextMock = getMockContext();
  let event: StateMachineStatusEvent;

  beforeEach(() => {
    event = {
      appId: 'app-id',
      segmentId: 'segment-id',
      jobRunId: 'job-run-id',
      scheduleIsExpired: false,
    };
  });

  test('state machine is busy on the first invocation', async () => {
    ddbDocClientMock.on(QueryCommand).resolves({
      Items: [
        {
          ...MOCK_SEGMENT_JOB_STATUS_ITEM,
          jobStatus: SegmentJobStatus.IN_PROGRESS,
        },
      ],
    });

    const resp = await handler(event, contextMock);

    expect(resp).toEqual({
      appId: 'app-id',
      segmentId: 'segment-id',
      jobRunId: 'job-run-id',
      stateMachineStatus: StateMachineStatus.BUSY,
      waitTimeInfo: {
        waitTime: 30,
        loopCount: 1,
      },
    });
  });

  test('state machine is idle on the 5th invocation', async () => {
    ddbDocClientMock.on(QueryCommand).resolves({
      Items: [],
    });

    const resp = await handler({
      ...event,
      waitTimeInfo: {
        waitTime: 60,
        loopCount: 5,
      },
    }, contextMock);

    expect(resp).toEqual({
      appId: 'app-id',
      segmentId: 'segment-id',
      jobRunId: 'job-run-id',
      stateMachineStatus: StateMachineStatus.IDLE,
      waitTimeInfo: {
        waitTime: 70,
        loopCount: 6,
      },
    });
  });
});
