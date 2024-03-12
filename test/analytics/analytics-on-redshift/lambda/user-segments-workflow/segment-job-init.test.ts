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

import { DisableRuleCommand, EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { handler } from '../../../../../src/analytics/lambdas/user-segments-workflow/segment-job-init';
import 'aws-sdk-client-mock-jest';
import { SegmentJobStatus, SegmentJobTriggerType } from '../../../../../src/analytics/private/segments/segments-model';
import { formatDate } from '../../../../../src/common/utils';

describe('User segments workflow segment-job-init lambda tests', () => {
  const ddbDocClientMock = mockClient(DynamoDBDocumentClient);
  const eventBridgeClientMock = mockClient(EventBridgeClient);
  const event = {
    appId: 'app-id',
    segmentId: 'segment-id',
    trigger: SegmentJobTriggerType.MANUALLY,
  };
  const segmentSettingItem = {
    id: 'app-id',
    type: 'SEGMENT_SETTING#segment-id',
    appId: 'app-id',
    segmentId: 'segment-id',
    name: 'User segment test',
    segmentType: 'User',
    projectId: 'project-id',
    refreshSchedule: {
      expireAfter: 1709705841300,
    },
    eventBridgeRuleArn: 'arn:aws:events:us-east-1:account:rule/segment-111-scheduler',
  };
  const jobStatusItem = {
    id: 'segment-id',
    type: expect.stringMatching(/^SEGMENT_JOB#/),
    jobRunId: expect.any(String),
    segmentId: 'segment-id',
    date: formatDate(new Date()),
    jobStartTime: expect.any(Number),
    jobEndTime: 0,
    jobStatus: SegmentJobStatus.PENDING,
    segmentUserNumber: 0,
    totalUserNumber: 0,
    segmentSessionNumber: 0,
    totalSessionNumber: 0,
    sampleData: [],
  };

  beforeEach(() => {
    ddbDocClientMock.reset();
    eventBridgeClientMock.reset();

    ddbDocClientMock.on(GetCommand).resolves({
      Item: segmentSettingItem,
    });
    eventBridgeClientMock.on(DisableRuleCommand).resolves({});
  });

  test('Segment job init, triggered manually', async () => {
    const resp = await handler(event);

    expect(resp).toEqual({
      appId: event.appId,
      segmentId: event.segmentId,
      jobRunId: expect.any(String),
      scheduleIsExpired: false,
    });
    expect(ddbDocClientMock).not.toHaveReceivedCommandWith(GetCommand, {
      TableName: 'ClickStreamApiClickstreamMetadata',
      Key: {
        id: 'app-id',
        type: 'SEGMENT_SETTING#segment-id',
      },
    });
    expect(ddbDocClientMock).toHaveReceivedCommandWith(PutCommand, {
      TableName: 'ClickStreamApiClickstreamMetadata',
      Item: jobStatusItem,
    });
    expect(eventBridgeClientMock).not.toHaveReceivedCommandWith(DisableRuleCommand, {
      Name: 'segment-111-scheduler',
    });
  });

  test('Segment job init, triggered by EventBridge', async () => {
    event.trigger = SegmentJobTriggerType.SCHEDULED;
    segmentSettingItem.refreshSchedule.expireAfter = Date.now() + 1000000;
    const resp = await handler(event);

    expect(resp).toEqual({
      appId: event.appId,
      segmentId: event.segmentId,
      jobRunId: expect.any(String),
      scheduleIsExpired: false,
    });
    expect(ddbDocClientMock).toHaveReceivedCommandWith(GetCommand, {
      TableName: 'ClickStreamApiClickstreamMetadata',
      Key: {
        id: 'app-id',
        type: 'SEGMENT_SETTING#segment-id',
      },
    });
    expect(ddbDocClientMock).toHaveReceivedCommandWith(PutCommand, {
      TableName: 'ClickStreamApiClickstreamMetadata',
      Item: jobStatusItem,
    });
    expect(eventBridgeClientMock).not.toHaveReceivedCommandWith(DisableRuleCommand, {
      Name: 'segment-111-scheduler',
    });
  });

  test('Segment job has expired', async () => {
    event.trigger = SegmentJobTriggerType.SCHEDULED;
    segmentSettingItem.refreshSchedule.expireAfter = Date.now() - 1000000;
    const resp = await handler(event);

    expect(resp).toEqual({
      scheduleIsExpired: true,
    });
    expect(ddbDocClientMock).toHaveReceivedCommandWith(GetCommand, {
      TableName: 'ClickStreamApiClickstreamMetadata',
      Key: {
        id: 'app-id',
        type: 'SEGMENT_SETTING#segment-id',
      },
    });
    expect(ddbDocClientMock).not.toHaveReceivedCommandWith(PutCommand, {
      TableName: 'ClickStreamApiClickstreamMetadata',
      Item: jobStatusItem,
    });
    expect(eventBridgeClientMock).toHaveReceivedCommandWith(DisableRuleCommand, {
      Name: 'segment-111-scheduler',
    });
  });
});
