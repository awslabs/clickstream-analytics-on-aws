/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  GetCommand, GetCommandInput, UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import { app, server } from '../../';
import { clickStreamTableName } from '../../common/constants';
import { appExistedMock, MOCK_APP_ID, MOCK_PROJECT_ID, MOCK_TOKEN, projectExistedMock, tokenMock } from './ddb-mock';

const ddbMock = mockClient(DynamoDBDocumentClient);


describe('Application test', () => {
  beforeEach(() => {
    ddbMock.reset();
  });
  it('Create application', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
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
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toEqual('Application created.');
    expect(res.body.success).toEqual(true);
  });
  it('Create application with mock error', async () => {
    projectExistedMock(ddbMock, true);
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
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Create application 400', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/app');
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
  });
  it('Get application by ID', async () => {
    projectExistedMock(ddbMock, true);
    ddbMock.on(GetCommand).resolves({
      Item: {
        deleted: false,
        updateAt: 1674202173912,
        platform: 'Web',
        createAt: 1674202173912,
        type: 'APP#e250bc17-405f-4473-862d-2346d6cefb49',
        sdk: 'Clickstream SDK',
        operator: '',
        description: 'Description of App-01',
        appId: 'e250bc17-405f-4473-862d-2346d6cefb49',
        projectId: 'a806ebb1-6f35-4132-b5c9-efa7e7e9033c',
        name: 'App-01',
      },
    });
    let res = await request(app)
      .get(`/api/app/${MOCK_APP_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        deleted: false,
        updateAt: 1674202173912,
        platform: 'Web',
        createAt: 1674202173912,
        type: 'APP#e250bc17-405f-4473-862d-2346d6cefb49',
        sdk: 'Clickstream SDK',
        operator: '',
        description: 'Description of App-01',
        appId: 'e250bc17-405f-4473-862d-2346d6cefb49',
        projectId: 'a806ebb1-6f35-4132-b5c9-efa7e7e9033c',
        name: 'App-01',
      },
    });
  });
  it('Get application by ID with mock error', async () => {
    projectExistedMock(ddbMock, true);
    // Mock DynamoDB error
    const input: GetCommandInput = {
      TableName: clickStreamTableName,
      Key: {
        projectId: MOCK_PROJECT_ID,
        type: `APP#${MOCK_APP_ID}`,
      },
    };
    // Mock DynamoDB error
    ddbMock.on(GetCommand, input).rejects(new Error('Mock DynamoDB error'));
    const res = await request(app)
      .get(`/api/app/${MOCK_APP_ID}?pid=${MOCK_PROJECT_ID}`);
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
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'Application not found',
    });
  });
  it('Get application list', async () => {
    projectExistedMock(ddbMock, true);
    ddbMock.on(ScanCommand).resolves({
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
    ddbMock.on(ScanCommand).rejects(new Error('Mock DynamoDB error'));
    res = await request(app)
      .get(`/api/app?pid=${MOCK_PROJECT_ID}`);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Get application list with page', async () => {
    projectExistedMock(ddbMock, true);
    ddbMock.on(ScanCommand).resolves({
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
      });
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
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
      });
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
      });
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
      });
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
    ddbMock.on(UpdateCommand).resolves({});
    let res = await request(app)
      .delete(`/api/app/${MOCK_APP_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Application deleted.',
    });

    // Mock DynamoDB error
    ddbMock.on(UpdateCommand).rejects(new Error('Mock DynamoDB error'));
    res = await request(app)
      .delete(`/api/app/${MOCK_APP_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Delete application with no pid', async () => {
    projectExistedMock(ddbMock, true);
    appExistedMock(ddbMock, true);
    const res = await request(app)
      .delete(`/api/app/${MOCK_APP_ID}`);
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