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

import { CloudFormationClient, DescribeStacksCommand, StackStatus } from '@aws-sdk/client-cloudformation';
import { ExecutionStatus, SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  GetCommand, GetCommandInput, UpdateCommand, QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import { appExistedMock, MOCK_APP_ID, MOCK_PROJECT_ID, MOCK_TOKEN, projectExistedMock, tokenMock } from './ddb-mock';
import { clickStreamTableName } from '../../common/constants';
import { PipelineStatusType } from '../../common/types';
import { app, server } from '../../index';
import 'aws-sdk-client-mock-jest';

const ddbMock = mockClient(DynamoDBDocumentClient);
const sfnMock = mockClient(SFNClient);
const cloudFormationClient = mockClient(CloudFormationClient);

describe('Application test', () => {
  beforeEach(() => {
    ddbMock.reset();
    sfnMock.reset();
    cloudFormationClient.reset();
  });
  it('Create application', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand)
      .resolvesOnce({
        Items: [
          {
            name: 'Pipeline-01',
            pipelineId: MOCK_PROJECT_ID,
            status: {
              status: PipelineStatusType.ACTIVE,
            },
            ingestionServer: {
              sinkType: 's3',
            },
            executionArn: 'arn:aws:states:us-east-1:555555555555:execution:clickstream-stack-workflow:111-111-111',
          },
        ],
      })
      .resolvesOnce({
        Items: [
          {
            name: 'App-01',
            appId: MOCK_APP_ID,
          },
        ],
      });
    sfnMock.on(StartExecutionCommand).resolves({});
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/app')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        name: 'App-01',
        description: 'Description of App-01',
        platform: 'Web',
        sdk: 'Clickstream SDK',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toEqual('Application created.');
    expect(res.body.success).toEqual(true);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 2);
  });
  it('Create application with mock ddb error', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand)
      .resolvesOnce({
        Items: [
          {
            name: 'Pipeline-01',
            pipelineId: MOCK_PROJECT_ID,
            status: {
              status: PipelineStatusType.ACTIVE,
            },
            ingestionServer: {
              sinkType: 's3',
            },
            executionArn: 'arn:aws:states:us-east-1:555555555555:execution:clickstream-stack-workflow:111-111-111',
          },
        ],
      })
      .resolvesOnce({
        Items: [
          {
            name: 'App-01',
            appId: MOCK_APP_ID,
          },
        ],
      });
    sfnMock.on(StartExecutionCommand).resolves({});
    // Mock DynamoDB error
    ddbMock.on(PutCommand).rejects(new Error('Mock DynamoDB error'));;
    const res = await request(app)
      .post('/api/app')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        name: 'App-01',
        description: 'Description of App-01',
        platform: 'Web',
        sdk: 'Clickstream SDK',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
  });
  it('Create application with mock stack status error', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand)
      .resolvesOnce({
        Items: [
          {
            name: 'Pipeline-01',
            pipelineId: MOCK_PROJECT_ID,
            status: {
              status: PipelineStatusType.FAILED,
            },
            ingestionServer: {
              sinkType: 's3',
            },
            executionArn: 'arn:aws:states:us-east-1:555555555555:execution:clickstream-stack-workflow:111-111-111',
          },
        ],
      })
      .resolvesOnce({
        Items: [
          {
            name: 'App-01',
            appId: MOCK_APP_ID,
          },
        ],
      });
    sfnMock.on(StartExecutionCommand).resolves({});
    // Mock DynamoDB error
    ddbMock.on(PutCommand).resolvesOnce({})
      .rejects(new Error('Mock DynamoDB error'));;
    const res = await request(app)
      .post('/api/app')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        name: 'App-01',
        description: 'Description of App-01',
        platform: 'Web',
        sdk: 'Clickstream SDK',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'The pipeline current status does not allow update.',
    });
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });
  it('Create application with mock pipeline error', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand).resolves({
      Items: [],
    });
    const res = await request(app)
      .post('/api/app')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        name: 'App-01',
        description: 'Description of App-01',
        platform: 'Web',
        sdk: 'Clickstream SDK',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'The latest pipeline not found.',
    });
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });
  it('Create application 400', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/app');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'body',
          msg: 'Value is empty.',
          param: '',
          value: {},
        },
        {
          location: 'body',
          msg: 'Value is empty.',
          param: 'projectId',
        },
        {
          location: 'headers',
          msg: 'Value is empty.',
          param: 'x-click-stream-request-id',
        },
      ],
    });
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });
  it('Create application Not Modified', async () => {
    tokenMock(ddbMock, true);
    projectExistedMock(ddbMock, true);
    const res = await request(app)
      .post('/api/app')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        name: 'App-01',
        description: 'Description of App-01',
        platform: 'Web',
        sdk: 'Clickstream SDK',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'headers',
          msg: 'Not Modified.',
          param: 'x-click-stream-request-id',
          value: '0000-0000',
        },
      ],
    });
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });
  it('Create application with non-existent project', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, false);
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/app')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        name: 'App-01',
        description: 'Description of App-01',
        platform: 'Web',
        sdk: 'Clickstream SDK',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'body',
          msg: 'Project resource does not exist.',
          param: 'projectId',
          value: MOCK_PROJECT_ID,
        },
      ],
    });
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });
  it('Get application by ID', async () => {
    projectExistedMock(ddbMock, true);
    ddbMock.on(GetCommand).resolves({
      Item: {
        deleted: false,
        updateAt: 1674202173912,
        createAt: 1674202173912,
        type: 'APP#e250bc17-405f-4473-862d-2346d6cefb49',
        sdk: 'Clickstream SDK',
        operator: '',
        description: 'Description of App-01',
        appId: MOCK_APP_ID,
        projectId: MOCK_PROJECT_ID,
        id: MOCK_PROJECT_ID,
        name: 'App-01',
        androidPackage: 'androidPackage',
        iosBundleId: 'iosBundleId',
        iosAppStoreId: 'iosAppStoreId',
      },
    });
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          name: 'Pipeline-01',
          pipelineId: MOCK_PROJECT_ID,
          status: ExecutionStatus.RUNNING,
          ingestionServer: {
            sinkType: 's3',
          },
          executionArn: 'arn:aws:states:us-east-1:555555555555:execution:clickstream-stack-workflow:111-111-111',
        },
      ],
    });
    cloudFormationClient.on(DescribeStacksCommand).resolves({
      Stacks: [
        {
          StackName: 'xxx',
          Outputs: [
            {
              OutputKey: 'IngestionServerC000ingestionServerUrl',
              OutputValue: 'http://xxx/xxx',
            },
          ],
          StackStatus: StackStatus.CREATE_COMPLETE,
          CreationTime: new Date(),
        },
      ],
    });
    let res = await request(app)
      .get(`/api/app/${MOCK_APP_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        description: 'Description of App-01',
        appId: MOCK_APP_ID,
        projectId: MOCK_PROJECT_ID,
        name: 'App-01',
        androidPackage: 'androidPackage',
        iosAppStoreId: 'iosAppStoreId',
        iosBundleId: 'iosBundleId',
        pipeline: {
          endpoint: 'http://xxx/xxx',
          id: MOCK_PROJECT_ID,
          name: 'Pipeline-01',
          status: 'RUNNING',
        },
      },
    });
  });
  it('Get application by ID with mock error', async () => {
    projectExistedMock(ddbMock, true);
    // Mock DynamoDB error
    const input: GetCommandInput = {
      TableName: clickStreamTableName,
      Key: {
        id: MOCK_PROJECT_ID,
        type: `APP#${MOCK_APP_ID}`,
      },
    };
    // Mock DynamoDB error
    ddbMock.on(GetCommand, input).rejects(new Error('Mock DynamoDB error'));
    const res = await request(app)
      .get(`/api/app/${MOCK_APP_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Get application with no pid', async () => {
    projectExistedMock(ddbMock, true);
    const res = await request(app)
      .get(`/api/app/${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'query',
          msg: 'Value is empty.',
          param: 'pid',
        },
      ],
    });
  });
  it('Get non-existent application', async () => {
    projectExistedMock(ddbMock, true);
    appExistedMock(ddbMock, false);
    const res = await request(app)
      .get(`/api/app/${MOCK_APP_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'Application not found',
    });
  });
  it('Get application list', async () => {
    projectExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { name: 'Application-01' },
        { name: 'Application-02' },
        { name: 'Application-03' },
        { name: 'Application-04' },
        { name: 'Application-05' },
      ],
    });
    let res = await request(app)
      .get(`/api/app?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        items: [
          { name: 'Application-01' },
          { name: 'Application-02' },
          { name: 'Application-03' },
          { name: 'Application-04' },
          { name: 'Application-05' },
        ],
        totalCount: 5,
      },
    });

    // Mock DynamoDB error
    ddbMock.on(QueryCommand).rejects(new Error('Mock DynamoDB error'));
    res = await request(app)
      .get(`/api/app?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Get application list with page', async () => {
    projectExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { name: 'Application-01' },
        { name: 'Application-02' },
        { name: 'Application-03' },
        { name: 'Application-04' },
        { name: 'Application-05' },
      ],
    });
    const res = await request(app)
      .get(`/api/app?pid=${MOCK_PROJECT_ID}&pageNumber=2&pageSize=2`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        items: [
          { name: 'Application-03' },
          { name: 'Application-04' },
        ],
        totalCount: 5,
      },
    });
  });
  it('Get application list with no pid', async () => {
    projectExistedMock(ddbMock, true);
    ddbMock.on(ScanCommand).resolves({});
    const res = await request(app)
      .get('/api/app');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'query',
          msg: 'Value is empty.',
          param: 'pid',
        },
      ],
    });
  });
  it('Update application', async () => {
    projectExistedMock(ddbMock, true);
    appExistedMock(ddbMock, true);
    ddbMock.on(UpdateCommand).resolves({});
    let res = await request(app)
      .put(`/api/app/${MOCK_APP_ID}`)
      .send({
        appId: MOCK_APP_ID,
        projectId: MOCK_PROJECT_ID,
        description: 'Update Description of App-01',
        androidPackage: 'Update androidPackage',
        iosBundleId: 'Update iosBundleId',
        iosAppStoreId: 'Update iosAppStoreId',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      data: null,
      success: true,
      message: 'Application updated.',
    });

    // Mock DynamoDB error
    ddbMock.on(UpdateCommand).rejects(new Error('Mock DynamoDB error'));
    res = await request(app)
      .put(`/api/app/${MOCK_APP_ID}`)
      .send({
        appId: MOCK_APP_ID,
        projectId: MOCK_PROJECT_ID,
        description: 'Update Description of App-01',
        androidPackage: 'Update androidPackage',
        iosBundleId: 'Update iosBundleId',
        iosAppStoreId: 'Update iosAppStoreId',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Update application with not match id', async () => {
    projectExistedMock(ddbMock, true);
    appExistedMock(ddbMock, true);
    const res = await request(app)
      .put(`/api/app/${MOCK_APP_ID}1`)
      .send({
        appId: MOCK_APP_ID,
        projectId: MOCK_PROJECT_ID,
        description: 'Update Description of App-01',
        androidPackage: 'Update androidPackage',
        iosBundleId: 'Update iosBundleId',
        iosAppStoreId: 'Update iosAppStoreId',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'body',
          msg: 'ID in path does not match ID in body.',
          param: 'appId',
          value: MOCK_APP_ID,
        },
      ],
    });
  });
  it('Update application with not body', async () => {
    projectExistedMock(ddbMock, true);
    appExistedMock(ddbMock, true);
    const res = await request(app)
      .put(`/api/app/${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'body',
          msg: 'Value is empty.',
          param: 'projectId',
        },
        {
          location: 'body',
          msg: 'ID in path does not match ID in body.',
          param: 'appId',
        },
        {
          location: 'body',
          msg: 'Value is empty.',
          param: 'appId',
        },
      ],
    });
  });
  it('Update application with no existed', async () => {
    projectExistedMock(ddbMock, true);
    appExistedMock(ddbMock, false);
    const res = await request(app)
      .put(`/api/app/${MOCK_APP_ID}`)
      .send({
        appId: MOCK_APP_ID,
        projectId: MOCK_PROJECT_ID,
        description: 'Update Description of App-01',
        androidPackage: 'Update androidPackage',
        iosBundleId: 'Update iosBundleId',
        iosAppStoreId: 'Update iosAppStoreId',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'body',
          msg: 'Application resource does not exist.',
          param: 'appId',
          value: MOCK_APP_ID,
        },
      ],
    });
  });
  it('Delete application', async () => {
    projectExistedMock(ddbMock, true);
    appExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          name: 'Pipeline-01',
          pipelineId: MOCK_PROJECT_ID,
          status: {
            status: PipelineStatusType.ACTIVE,
          },
          ingestionServer: {
            sinkType: 's3',
          },
          executionArn: 'arn:aws:states:us-east-1:555555555555:execution:clickstream-stack-workflow:111-111-111',
        },
      ],
    });
    ddbMock.on(UpdateCommand).resolves({});
    let res = await request(app)
      .delete(`/api/app/${MOCK_APP_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      data: null,
      success: true,
      message: 'Application deleted.',
    });

    // Mock DynamoDB error
    ddbMock.on(UpdateCommand).rejects(new Error('Mock DynamoDB error'));
    res = await request(app)
      .delete(`/api/app/${MOCK_APP_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Delete application with error pipeline status', async () => {
    projectExistedMock(ddbMock, true);
    appExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          name: 'Pipeline-01',
          pipelineId: MOCK_PROJECT_ID,
          status: ExecutionStatus.RUNNING,
          ingestionServer: {
            sinkType: 's3',
          },
          executionArn: 'arn:aws:states:us-east-1:555555555555:execution:clickstream-stack-workflow:111-111-111',
        },
      ],
    });
    let res = await request(app)
      .delete(`/api/app/${MOCK_APP_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'The pipeline current status does not allow update.',
    });
  });
  it('Delete application with no pid', async () => {
    projectExistedMock(ddbMock, true);
    appExistedMock(ddbMock, true);
    const res = await request(app)
      .delete(`/api/app/${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'params',
          msg: 'query.pid value is empty.',
          param: 'id',
          value: MOCK_APP_ID,
        },
        {
          location: 'query',
          msg: 'Value is empty.',
          param: 'pid',
        },
      ],
    });
  });
  it('Delete application with no existed', async () => {
    projectExistedMock(ddbMock, true);
    appExistedMock(ddbMock, false);
    const res = await request(app)
      .delete(`/api/app/${MOCK_APP_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'params',
          msg: 'Application resource does not exist.',
          param: 'id',
          value: MOCK_APP_ID,
        },
      ],
    });
  });
  afterAll((done) => {
    server.close();
    done();
  });
});