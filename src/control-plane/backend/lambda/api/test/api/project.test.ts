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

import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import { MOCK_PROJECT_ID, MOCK_TOKEN, projectExistedMock, tokenMock } from './ddb-mock';
import { app, server } from '../../index';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('Project test', () => {
  beforeEach(() => {
    ddbMock.reset();
  });
  it('Create project', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, false);
    ddbMock.on(PutCommand).resolvesOnce({});
    const res = await request(app)
      .post('/api/project')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        name: 'Project-01',
        tableName: 'Project-01',
        description: 'Description of Project-01',
        emails: 'u1@example.com,u2@example.com,u3@example.com',
        platform: 'Web',
        region: 'us-east-1',
        environment: 'Dev',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toEqual('Project created.');
    expect(res.body.success).toEqual(true);
  });
  it('Create project with mock error', async () => {
    projectExistedMock(ddbMock, false);
    // Mock DynamoDB error
    ddbMock.on(PutCommand).resolvesOnce({})
      .rejects(new Error('Mock DynamoDB error'));;
    const res = await request(app)
      .post('/api/project')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        name: 'Project-01',
        tableName: 'Project-01',
        description: 'Description of Project-01',
        emails: 'u1@example.com,u2@example.com,u3@example.com',
        platform: 'Web',
        region: 'us-east-1',
        environment: 'Dev',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Create project 400', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, false);
    const res = await request(app)
      .post('/api/project');
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
          location: 'headers',
          msg: 'Value is empty.',
          param: 'x-click-stream-request-id',
        },
      ],
    });
  });
  it('Create project Not Modified', async () => {
    tokenMock(ddbMock, true);
    const res = await request(app)
      .post('/api/project')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        name: 'Project-01',
        tableName: 'Project-01',
        description: 'Description of Project-01',
        emails: 'u1@example.com,u2@example.com,u3@example.com',
        platform: 'Web',
        region: 'us-east-1',
        environment: 'Dev',
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
  });
  it('Get project by ID', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        environment: 'Dev',
        updateAt: 1675321494735,
        operator: '',
        name: 'Project-01',
        deleted: false,
        platform: 'Web',
        createAt: 1675321494735,
        emails: 'u1@example.com,u2@example.com,u3@example.com',
        tableName: 't1',
        type: 'METADATA#a806ebb1-6f35-4132-b5c9-efa7e7e9033c',
        region: 'us-east-1',
        status: 'UNKNOW',
        description: 'Description of Project-01',
        id: 'a806ebb1-6f35-4132-b5c9-efa7e7e9033c',
      },
    });
    let res = await request(app)
      .get(`/api/project/${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        environment: 'Dev',
        updateAt: 1675321494735,
        operator: '',
        name: 'Project-01',
        deleted: false,
        platform: 'Web',
        createAt: 1675321494735,
        emails: 'u1@example.com,u2@example.com,u3@example.com',
        tableName: 't1',
        type: 'METADATA#a806ebb1-6f35-4132-b5c9-efa7e7e9033c',
        region: 'us-east-1',
        status: 'UNKNOW',
        description: 'Description of Project-01',
        id: 'a806ebb1-6f35-4132-b5c9-efa7e7e9033c',
      },
    });

    // Mock DynamoDB error
    ddbMock.on(GetCommand).rejects(new Error('Mock DynamoDB error'));
    res = await request(app)
      .get(`/api/project/${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);

    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Get non-existent project', async () => {
    projectExistedMock(ddbMock, false);
    const res = await request(app)
      .get(`/api/project/${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'Project not found',
    });
  });
  it('Get project list', async () => {
    ddbMock.on(ScanCommand).resolves({
      Items: [
        { name: 'Project-01' },
        { name: 'Project-02' },
        { name: 'Project-03' },
        { name: 'Project-04' },
        { name: 'Project-05' },
      ],
    });
    let res = await request(app)
      .get('/api/project');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        items: [
          { name: 'Project-01' },
          { name: 'Project-02' },
          { name: 'Project-03' },
          { name: 'Project-04' },
          { name: 'Project-05' },
        ],
        totalCount: 5,
      },
    });

    // Mock DynamoDB error
    ddbMock.on(ScanCommand).rejects(new Error('Mock DynamoDB error'));
    res = await request(app)
      .get('/api/project');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);

    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Get project list with page', async () => {
    ddbMock.on(ScanCommand).resolves({
      Items: [
        { name: 'Project-01' },
        { name: 'Project-02' },
        { name: 'Project-03' },
        { name: 'Project-04' },
        { name: 'Project-05' },
      ],
    });
    const res = await request(app)
      .get('/api/project?pageNumber=2&pageSize=2');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        items: [
          { name: 'Project-03' },
          { name: 'Project-04' },
        ],
        totalCount: 5,
      },
    });
  });
  it('Update project', async () => {
    projectExistedMock(ddbMock, true);
    ddbMock.on(UpdateCommand).resolves({});
    let res = await request(app)
      .put(`/api/project/${MOCK_PROJECT_ID}`)
      .send({
        id: MOCK_PROJECT_ID,
        environment: '1Dev',
        updateAt: 1676261555751,
        operator: '',
        name: '1Project-01',
        deleted: false,
        createAt: 1676259929614,
        emails: '1update@example.com',
        platform: '1Web',
        tableName: '1t1',
        region: '1us-east-1',
        description: '1update Description of Project-01',
        status: '1UNKNOW',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      data: null,
      success: true,
      message: 'Project updated.',
    });
  });
  it('Update project mock error', async () => {
    // Mock DynamoDB error
    projectExistedMock(ddbMock, true);
    ddbMock.on(UpdateCommand).rejects(new Error('Mock DynamoDB error'));
    const res = await request(app)
      .put(`/api/project/${MOCK_PROJECT_ID}`)
      .send({
        id: MOCK_PROJECT_ID,
        description: 'Update Description',
        emails: 'update@example.com',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);

    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Update project with not match id', async () => {
    projectExistedMock(ddbMock, true);
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .put(`/api/project/${MOCK_PROJECT_ID}1`)
      .send({
        id: MOCK_PROJECT_ID,
        description: 'Update Description',
        emails: 'update@example.com',
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
          param: 'id',
          value: MOCK_PROJECT_ID,
        },
      ],
    });
  });
  it('Update project with not body', async () => {
    projectExistedMock(ddbMock, true);
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .put(`/api/project/${MOCK_PROJECT_ID}`);
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
          param: 'id',
        },
        {
          location: 'body',
          msg: 'ID in path does not match ID in body.',
          param: 'id',
        },
      ],
    });
  });
  it('Update project with no existed', async () => {
    projectExistedMock(ddbMock, false);
    const res = await request(app)
      .put(`/api/project/${MOCK_PROJECT_ID}`)
      .send({
        id: MOCK_PROJECT_ID,
        description: 'Update Description',
        emails: 'update@example.com',
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
          param: 'id',
          value: MOCK_PROJECT_ID,
        },
      ],
    });
  });
  it('Delete project', async () => {
    projectExistedMock(ddbMock, true);
    ddbMock.on(ScanCommand).resolves({
      Items: [
        { type: 'project-01' },
      ],
    });
    ddbMock.on(UpdateCommand).resolves({});
    let res = await request(app)
      .delete(`/api/project/${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      data: null,
      success: true,
      message: 'Project deleted.',
    });

    // Mock DynamoDB error
    ddbMock.on(ScanCommand).rejects(new Error('Mock DynamoDB error'));
    res = await request(app)
      .delete(`/api/project/${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);

    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Delete project with no existed', async () => {
    projectExistedMock(ddbMock, false);
    ddbMock.on(UpdateCommand).resolves({});
    const res = await request(app)
      .delete(`/api/project/${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'params',
          msg: 'Project resource does not exist.',
          param: 'id',
          value: MOCK_PROJECT_ID,
        },
      ],
    });
  });
  it('Verification project table name existed', async () => {
    ddbMock.on(ScanCommand).resolves({
      Items: [
        { name: 'Project-01', tableName: 't1' },
        { name: 'Project-02', tableName: 't2' },
        { name: 'Project-03', tableName: 't3' },
        { name: 'Project-04', tableName: 't4' },
        { name: 'Project-05', tableName: 't5' },
      ],
    });
    const res = await request(app)
      .get('/api/project/verification/t1');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: { exist: true },
    });
  });
  it('Verification project with mock error', async () => {
    ddbMock.on(ScanCommand).rejects(new Error('Mock DynamoDB error'));
    const res = await request(app)
      .get('/api/project/verification/t1');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);

    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });

  afterAll((done) => {
    server.close();
    done();
  });
});