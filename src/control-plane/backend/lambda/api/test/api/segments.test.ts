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
import {
  DeleteRuleCommand,
  EventBridgeClient,
  PutRuleCommand,
  PutTargetsCommand,
  RemoveTargetsCommand,
} from '@aws-sdk/client-eventbridge';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import request from 'supertest';
import { MOCK_APP_ID, MOCK_PROJECT_ID, MOCK_SEGMENT_ID, MOCK_SEGMENT_JOB_ID } from './ddb-mock';
import { KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW, stackDetailsWithOutputs } from './pipeline-mock';
import {
  MOCK_CREATE_USER_SEGMENT_SETTING_INPUT,
  MOCK_EVENTBRIDGE_RULE_ARN,
  MOCK_SEGMENT_JOB_STATUS_ITEM,
  MOCK_UPDATE_USER_SEGMENT_SETTING_INPUT,
  MOCK_USER_SEGMENT_DDB_ITEM,
} from './segments-mock';
import { clickStreamTableName } from '../../common/constants';
import { app } from '../../index';

const ddbMock = mockClient(DynamoDBDocumentClient);
const eventBridgeClientMock = mockClient(EventBridgeClient);
const sfnClientMock = mockClient(SFNClient);

describe('Segments test', () => {
  beforeEach(() => {
    ddbMock.reset();
    eventBridgeClientMock.reset();
    sfnClientMock.reset();
  });

  test('Create segment with scheduled cron job', async () => {
    mockPipeline();
    eventBridgeClientMock.on(PutRuleCommand).resolvesOnce({ RuleArn: MOCK_EVENTBRIDGE_RULE_ARN });

    const res = await request(app).post('/api/segments').send(MOCK_CREATE_USER_SEGMENT_SETTING_INPUT);

    expect(res.statusCode).toBe(201);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.body.success).toEqual(true);
    expect(res.body.message).toEqual('Segment created successfully.');
    expect(eventBridgeClientMock).toHaveReceivedCommandTimes(PutRuleCommand, 1);
    expect(eventBridgeClientMock).toHaveReceivedCommandTimes(PutTargetsCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 2);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
  });

  test('Create segment without scheduled cron job', async () => {
    // Manual refresh segment doesn't have EventBridge rule
    const input = {
      ...MOCK_CREATE_USER_SEGMENT_SETTING_INPUT,
      refreshSchedule: {
        cron: 'Manual',
      },
    };

    const res = await request(app).post('/api/segments').send(input);

    expect(res.statusCode).toBe(201);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.body.success).toEqual(true);
    expect(res.body.message).toEqual('Segment created successfully.');
    expect(eventBridgeClientMock).toHaveReceivedCommandTimes(PutRuleCommand, 0);
    expect(eventBridgeClientMock).toHaveReceivedCommandTimes(PutTargetsCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
  });

  test('Create segment request input is invalid', async () => {
    const input = {
      ...MOCK_CREATE_USER_SEGMENT_SETTING_INPUT,
      criteria: {
        operator: 'and',
        filterGroups: [],
      },
    };

    const res = await request(app).post('/api/segments').send(input);

    expect(res.statusCode).toBe(400);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.body.success).toEqual(false);
    expect(eventBridgeClientMock).toHaveReceivedCommandTimes(PutRuleCommand, 0);
    expect(eventBridgeClientMock).toHaveReceivedCommandTimes(PutTargetsCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });

  test('List segments', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [MOCK_USER_SEGMENT_DDB_ITEM],
    });

    const res = await request(app).get(`/api/segments?appId=${MOCK_APP_ID}`);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.body.success).toEqual(true);
    expect(res.body.data.length).toEqual(1);
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 1);
  });

  test('List segments request missing appId', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [MOCK_USER_SEGMENT_DDB_ITEM],
    });

    const res = await request(app).get('/api/segments');

    expect(res.statusCode).toBe(400);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.body.success).toEqual(false);
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 0);
  });

  test('Get segment by segmentId and appId', async () => {
    ddbMock.on(GetCommand, {
      TableName: clickStreamTableName,
      Key: {
        id: MOCK_APP_ID,
        type: `SEGMENT_SETTING#${MOCK_SEGMENT_ID}`,
      },
    }).resolves({
      Item: MOCK_USER_SEGMENT_DDB_ITEM,
    });

    const res = await request(app).get(`/api/segments/${MOCK_SEGMENT_ID}?appId=${MOCK_APP_ID}`);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.body.success).toEqual(true);
    expect(res.body.data).toEqual(MOCK_USER_SEGMENT_DDB_ITEM);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
  });

  test('Get segment request missing appId', async () => {
    const res = await request(app).get(`/api/segments/${MOCK_SEGMENT_ID}`);

    expect(res.statusCode).toBe(400);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.body.success).toEqual(false);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 0);
  });

  test('Update segment, change from auto refresh to manual trigger', async () => {
    mockPipeline();
    ddbMock.on(GetCommand, {
      TableName: clickStreamTableName,
      Key: {
        id: MOCK_APP_ID,
        type: `SEGMENT_SETTING#${MOCK_SEGMENT_ID}`,
      },
    }).resolves({
      Item: {
        ...MOCK_USER_SEGMENT_DDB_ITEM,
        eventBridgeRuleArn: MOCK_EVENTBRIDGE_RULE_ARN, // current segment is set to auto refresh
      },
    });

    const res = await request(app).patch(`/api/segments/${MOCK_SEGMENT_ID}`).send(MOCK_UPDATE_USER_SEGMENT_SETTING_INPUT);

    expect(res.statusCode).toBe(201);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.body.success).toEqual(true);
    expect(res.body.message).toEqual('Segment updated successfully.');
    expect(eventBridgeClientMock).toHaveReceivedCommandTimes(RemoveTargetsCommand, 1);
    expect(eventBridgeClientMock).toHaveReceivedCommandTimes(DeleteRuleCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
  });

  test('Update segment, change from manual to auto refresh', async () => {
    mockPipeline();
    ddbMock.on(GetCommand, {
      TableName: clickStreamTableName,
      Key: {
        id: MOCK_APP_ID,
        type: `SEGMENT_SETTING#${MOCK_SEGMENT_ID}`,
      },
    }).resolves({
      Item: {
        ...MOCK_USER_SEGMENT_DDB_ITEM,
        refreshSchedule: {
          cron: 'Manual',
        },
      },
    });
    eventBridgeClientMock.on(PutRuleCommand).resolvesOnce({ RuleArn: MOCK_EVENTBRIDGE_RULE_ARN });

    const res = await request(app).patch(`/api/segments/${MOCK_SEGMENT_ID}`).send({
      ...MOCK_UPDATE_USER_SEGMENT_SETTING_INPUT,
      refreshSchedule: {
        cron: 'Custom',
        cronExpression: 'rate(12 days)',
        expireAfter: 10000,
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.body.success).toEqual(true);
    expect(res.body.message).toEqual('Segment updated successfully.');
    expect(eventBridgeClientMock).toHaveReceivedCommandTimes(PutRuleCommand, 1);
    expect(eventBridgeClientMock).toHaveReceivedCommandTimes(PutTargetsCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 2);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
  });

  test('Update segment, modify auto refresh schedule', async () => {
    mockPipeline();
    ddbMock.on(GetCommand, {
      TableName: clickStreamTableName,
      Key: {
        id: MOCK_APP_ID,
        type: `SEGMENT_SETTING#${MOCK_SEGMENT_ID}`,
      },
    }).resolves({
      Item: MOCK_USER_SEGMENT_DDB_ITEM,
    });
    eventBridgeClientMock.on(PutRuleCommand).resolvesOnce({ RuleArn: MOCK_EVENTBRIDGE_RULE_ARN });

    const res = await request(app).patch(`/api/segments/${MOCK_SEGMENT_ID}`).send({
      ...MOCK_UPDATE_USER_SEGMENT_SETTING_INPUT,
      refreshSchedule: {
        cron: 'Custom',
        cronExpression: 'rate(1 day)',
        expireAfter: 1714521600000,
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.body.success).toEqual(true);
    expect(res.body.message).toEqual('Segment updated successfully.');
    expect(eventBridgeClientMock).toHaveReceivedCommandTimes(PutRuleCommand, 1);
    expect(eventBridgeClientMock).toHaveReceivedCommandTimes(PutTargetsCommand, 1);
    expect(eventBridgeClientMock).toHaveReceivedCommandTimes(RemoveTargetsCommand, 0);
    expect(eventBridgeClientMock).toHaveReceivedCommandTimes(DeleteRuleCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 2);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
  });

  test('Update segment, modify auto refresh schedule with invalid input', async () => {
    ddbMock.on(GetCommand, {
      TableName: clickStreamTableName,
      Key: {
        id: MOCK_APP_ID,
        type: `SEGMENT_SETTING#${MOCK_SEGMENT_ID}`,
      },
    }).resolves({
      Item: MOCK_USER_SEGMENT_DDB_ITEM,
    });

    const res = await request(app).patch(`/api/segments/${MOCK_SEGMENT_ID}`).send({
      ...MOCK_UPDATE_USER_SEGMENT_SETTING_INPUT,
      refreshSchedule: {
        cron: 'Custom',
        cronExpression: '1 day',
        expireAfter: 1714521600000,
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.body.success).toEqual(false);
    expect(eventBridgeClientMock).toHaveReceivedCommandTimes(PutRuleCommand, 0);
    expect(eventBridgeClientMock).toHaveReceivedCommandTimes(PutTargetsCommand, 0);
    expect(eventBridgeClientMock).toHaveReceivedCommandTimes(RemoveTargetsCommand, 0);
    expect(eventBridgeClientMock).toHaveReceivedCommandTimes(DeleteRuleCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });

  test('Update segment which does not exist', async () => {
    ddbMock.on(GetCommand, {
      TableName: clickStreamTableName,
      Key: {
        id: MOCK_APP_ID,
        type: `SEGMENT_SETTING#${MOCK_SEGMENT_ID}`,
      },
    }).resolves({
      Item: undefined,
    });

    const res = await request(app).patch(`/api/segments/${MOCK_SEGMENT_ID}`).send(MOCK_UPDATE_USER_SEGMENT_SETTING_INPUT);

    expect(res.statusCode).toBe(400);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.body.success).toEqual(false);
    expect(res.body.message).toEqual(`Segment with id ${MOCK_SEGMENT_ID} is not found`);
    expect(eventBridgeClientMock).toHaveReceivedCommandTimes(PutRuleCommand, 0);
    expect(eventBridgeClientMock).toHaveReceivedCommandTimes(PutTargetsCommand, 0);
    expect(eventBridgeClientMock).toHaveReceivedCommandTimes(RemoveTargetsCommand, 0);
    expect(eventBridgeClientMock).toHaveReceivedCommandTimes(DeleteRuleCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });

  test('Delete segment successfully', async () => {
    mockPipeline();
    ddbMock.on(GetCommand, {
      TableName: clickStreamTableName,
      Key: {
        id: MOCK_APP_ID,
        type: `SEGMENT_SETTING#${MOCK_SEGMENT_ID}`,
      },
    }).resolves({
      Item: MOCK_USER_SEGMENT_DDB_ITEM,
    });

    const res = await request(app).delete(`/api/segments/${MOCK_SEGMENT_ID}?appId=${MOCK_APP_ID}`);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.body.success).toEqual(true);
    expect(res.body.message).toEqual('Segment deleted successfully.');
    expect(eventBridgeClientMock).toHaveReceivedCommandTimes(RemoveTargetsCommand, 1);
    expect(eventBridgeClientMock).toHaveReceivedCommandTimes(DeleteRuleCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
  });

  test('Delete segment which does not exist', async () => {
    ddbMock.on(GetCommand, {
      TableName: clickStreamTableName,
      Key: {
        id: MOCK_APP_ID,
        type: `SEGMENT_SETTING#${MOCK_SEGMENT_ID}`,
      },
    }).resolves({
      Item: undefined,
    });

    const res = await request(app).delete(`/api/segments/${MOCK_SEGMENT_ID}?appId=${MOCK_APP_ID}`);

    expect(res.statusCode).toBe(400);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.body.success).toEqual(false);
    expect(res.body.message).toEqual(`Segment with id ${MOCK_SEGMENT_ID} is not found`);
    expect(eventBridgeClientMock).toHaveReceivedCommandTimes(RemoveTargetsCommand, 0);
    expect(eventBridgeClientMock).toHaveReceivedCommandTimes(DeleteRuleCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 0);
  });

  test('List segment jobs', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [MOCK_SEGMENT_JOB_STATUS_ITEM],
    });

    const res = await request(app).get(`/api/segments/${MOCK_SEGMENT_ID}/jobs`);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.body.success).toEqual(true);
    expect(res.body.data).toEqual([MOCK_SEGMENT_JOB_STATUS_ITEM]);
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 1);
  });

  test('Get segment sample data of last succeeded job', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [MOCK_SEGMENT_JOB_STATUS_ITEM],
    });

    const res = await request(app).get(`/api/segments/${MOCK_SEGMENT_ID}/sampleData`);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.body.success).toEqual(true);
    expect(res.body.data).toEqual(MOCK_SEGMENT_JOB_STATUS_ITEM);
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 1);
  });

  test('Get segment sample data of specific job', async () => {
    ddbMock.on(GetCommand, {
      TableName: clickStreamTableName,
      Key: {
        id: MOCK_SEGMENT_ID,
        type: `SEGMENT_JOB#${MOCK_SEGMENT_JOB_ID}`,
      },
    }).resolves({
      Item: MOCK_SEGMENT_JOB_STATUS_ITEM,
    });

    const res = await request(app).get(`/api/segments/${MOCK_SEGMENT_ID}/sampleData?jobRunId=${MOCK_SEGMENT_JOB_ID}`);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.body.success).toEqual(true);
    expect(res.body.data).toEqual(MOCK_SEGMENT_JOB_STATUS_ITEM);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
  });

  test('Refresh segment', async () => {
    mockPipeline();
    eventBridgeClientMock.on(PutRuleCommand).resolvesOnce({ RuleArn: MOCK_EVENTBRIDGE_RULE_ARN });
    ddbMock.on(GetCommand, {
      TableName: clickStreamTableName,
      Key: {
        id: MOCK_APP_ID,
        type: `SEGMENT_SETTING#${MOCK_SEGMENT_ID}`,
      },
    }).resolves({
      Item: MOCK_USER_SEGMENT_DDB_ITEM,
    });

    const res = await request(app).get(`/api/segments/${MOCK_SEGMENT_ID}/refresh?appId=${MOCK_APP_ID}`);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.body.success).toEqual(true);
    expect(res.body.message).toEqual('Run segment refresh job successfully.');
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 2);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
    expect(sfnClientMock).toHaveReceivedCommandTimes(StartExecutionCommand, 1);
  });

  test('Refresh segment which does not exist', async () => {
    ddbMock.on(GetCommand, {
      TableName: clickStreamTableName,
      Key: {
        id: MOCK_APP_ID,
        type: `SEGMENT_SETTING#${MOCK_SEGMENT_ID}`,
      },
    }).resolves({
      Item: undefined,
    });

    const res = await request(app).get(`/api/segments/${MOCK_SEGMENT_ID}/refresh?appId=${MOCK_APP_ID}`);

    expect(res.statusCode).toBe(400);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.body.success).toEqual(false);
    expect(res.body.message).toEqual(`Segment with id ${MOCK_SEGMENT_ID} is not found`);
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
    expect(sfnClientMock).toHaveReceivedCommandTimes(StartExecutionCommand, 0);
  });

  test('Get presigned url for segment export', async () => {
    mockPipeline();
    ddbMock.on(GetCommand, {
      TableName: clickStreamTableName,
      Key: {
        id: MOCK_SEGMENT_ID,
        type: `SEGMENT_JOB#${MOCK_SEGMENT_JOB_ID}`,
      },
    }).resolves({
      Item: MOCK_SEGMENT_JOB_STATUS_ITEM,
    });

    const res = await request(app).get(`/api/segments/${MOCK_SEGMENT_ID}/jobs/${MOCK_SEGMENT_JOB_ID}/exportS3Url?appId=${MOCK_APP_ID}&projectId=${MOCK_PROJECT_ID}`);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.body.success).toEqual(true);
    expect(res.body.message).toEqual('Generate presigned URL successfully.');
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 1);
  });

  test('Get presigned url for segment export, missing appId and projectId', async () => {
    const res = await request(app).get(`/api/segments/${MOCK_SEGMENT_ID}/jobs/${MOCK_SEGMENT_JOB_ID}/exportS3Url`);

    expect(res.statusCode).toBe(400);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.body.success).toEqual(false);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 0);
  });

  test('Get presigned url for segment job output which is not completed yet', async () => {
    mockPipeline();
    ddbMock.on(GetCommand, {
      TableName: clickStreamTableName,
      Key: {
        id: MOCK_SEGMENT_ID,
        type: `SEGMENT_JOB#${MOCK_SEGMENT_JOB_ID}`,
      },
    }).resolves({
      Item: {
        ...MOCK_SEGMENT_JOB_STATUS_ITEM,
        jobStatus: SegmentJobStatus.IN_PROGRESS,
      },
    });

    const res = await request(app).get(`/api/segments/${MOCK_SEGMENT_ID}/jobs/${MOCK_SEGMENT_JOB_ID}/exportS3Url?appId=${MOCK_APP_ID}&projectId=${MOCK_PROJECT_ID}`);

    expect(res.statusCode).toBe(400);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.body.success).toEqual(false);
    expect(res.body.message).toEqual(`Segment job for segmentId: ${MOCK_SEGMENT_ID}, jobRunId: ${MOCK_SEGMENT_JOB_ID} is not in COMPLETED status.`);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 0);
  });
});

function mockPipeline() {
  // Mock pipeline for segments workflow
  const stackDetails = [
    stackDetailsWithOutputs[0],
    stackDetailsWithOutputs[1],
    stackDetailsWithOutputs[2],
    {
      ...stackDetailsWithOutputs[3],
      outputs: [
        {
          OutputKey: 'UserSegmentsWorkflowArn',
          OutputValue: 'arn:aws:states:us-east-1:xxxxxxxxx:execution:name1:a2k3jkj0-1112',
        },
      ],
    },
    stackDetailsWithOutputs[4],
    stackDetailsWithOutputs[5],
  ];

  ddbMock.on(QueryCommand).resolves({
    Items: [{
      ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW,
      stackDetails: stackDetails,
    }],
  });
}