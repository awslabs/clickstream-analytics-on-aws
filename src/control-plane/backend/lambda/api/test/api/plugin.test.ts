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
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import { dictionaryMock, MOCK_BUILT_IN_PLUGIN_ID, MOCK_PLUGIN_ID, MOCK_TOKEN, pluginExistedMock, tokenMock } from './ddb-mock';
import { app, server } from '../../index';
import 'aws-sdk-client-mock-jest';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('Plugin test', () => {
  beforeEach(() => {
    ddbMock.reset();
  });
  it('Create plugin', async () => {
    tokenMock(ddbMock, false);
    ddbMock.on(PutCommand).resolvesOnce({});
    const res = await request(app)
      .post('/api/plugin')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        name: 'Plugin-01',
        description: 'Description of Plugin-01',
        jarFile: 'jarFile',
        dependencyFiles: ['dependencyFiles1', 'dependencyFiles2'],
        mainFunction: 'com.cn.sre.main',
        pluginType: 'Transform',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toEqual('Plugin created.');
    expect(res.body.success).toEqual(true);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 2);
  });
  it('Create plugin with XSS', async () => {
    tokenMock(ddbMock, false);
    ddbMock.on(PutCommand).resolvesOnce({});
    const res = await request(app)
      .post('/api/plugin')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        name: '<IMG SRC=javascript:alert(\'XSS\')><script>alert(234)</script>',
        description: 'Description of Plugin-01',
        jarFile: 'jarFile',
        dependencyFiles: ['dependencyFiles1', 'dependencyFiles2'],
        mainFunction: 'com.cn.sre.main',
        pluginType: 'Transform',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'body',
          msg: 'This request contains Cross-site scripting (XSS) cheat sheet. Please check and try again.',
          param: '',
          value: {
            name: '<IMG SRC=javascript:alert(\'XSS\')><script>alert(234)</script>',
            description: 'Description of Plugin-01',
            jarFile: 'jarFile',
            dependencyFiles: ['dependencyFiles1', 'dependencyFiles2'],
            mainFunction: 'com.cn.sre.main',
            pluginType: 'Transform',
          },
        },
      ],
    });
  });
  it('Create plugin with mock error', async () => {
    tokenMock(ddbMock, false);
    // Mock DynamoDB error
    ddbMock.on(PutCommand).rejects(new Error('Mock DynamoDB error'));;
    const res = await request(app)
      .post('/api/plugin')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        name: 'Plugin-01',
        description: 'Description of Plugin-01',
        jarFile: 'jarFile',
        dependencyFiles: ['dependencyFiles1', 'dependencyFiles2'],
        mainFunction: 'com.cn.sre.main',
        pluginType: 'Transform',
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
  it('Create plugin 400', async () => {
    tokenMock(ddbMock, false);
    const res = await request(app)
      .post('/api/plugin');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'body',
          msg: 'Value is empty.',
          param: 'jarFile',
        },
        {
          location: 'body',
          msg: 'Value is empty.',
          param: 'mainFunction',
        },
        {
          location: 'headers',
          msg: 'Value is empty.',
          param: 'x-click-stream-request-id',
        },
        {
          location: 'body',
          msg: 'Value is empty.',
          param: '',
          value: {},
        },
      ],
    });
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });
  it('Create plugin Not Modified', async () => {
    tokenMock(ddbMock, true);
    const res = await request(app)
      .post('/api/plugin')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        name: 'Plugin-01',
        description: 'Description of Plugin-01',
        jarFile: 'jarFile',
        dependencyFiles: ['dependencyFiles1', 'dependencyFiles2'],
        mainFunction: 'com.cn.sre.main',
        pluginType: 'Transform',
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
  it('Create plugin without jar or main function', async () => {
    tokenMock(ddbMock, false);
    ddbMock.on(PutCommand).resolvesOnce({});
    const res = await request(app)
      .post('/api/plugin')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        name: 'Plugin-01',
        description: 'Description of Plugin-01',
        dependencyFiles: ['dependencyFiles1', 'dependencyFiles2'],
        pluginType: 'Transform',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'body',
          msg: 'Value is empty.',
          param: 'jarFile',
        },
        {
          location: 'body',
          msg: 'Value is empty.',
          param: 'mainFunction',
        },
      ],
    });
    expect(res.body.success).toEqual(false);
  });
  it('Get plugin by ID', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        updateAt: 1678276073222,
        builtIn: false,
        status: 'Disabled',
        operator: '',
        mainFunction: 'com.cn.sre.main',
        name: 'Plugin-01',
        deleted: false,
        createAt: 1678275909650,
        jarFile: 'jarFile',
        typeName: 'PLUGIN',
        bindCount: 0,
        description: '3223 Description of Plugin-01',
        id: '674f5434-ffa0-4eda-8685-044af36548ad',
        dependencyFiles: [
          'dependencyFiles1',
          'dependencyFiles2',
        ],
        pluginType: 'Transform',
      },
    });
    let res = await request(app)
      .get(`/api/plugin/${MOCK_PLUGIN_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        updateAt: 1678276073222,
        builtIn: false,
        status: 'Disabled',
        operator: '',
        mainFunction: 'com.cn.sre.main',
        name: 'Plugin-01',
        deleted: false,
        createAt: 1678275909650,
        jarFile: 'jarFile',
        typeName: 'PLUGIN',
        bindCount: 0,
        description: '3223 Description of Plugin-01',
        id: '674f5434-ffa0-4eda-8685-044af36548ad',
        dependencyFiles: [
          'dependencyFiles1',
          'dependencyFiles2',
        ],
        pluginType: 'Transform',
      },
    });

    // Mock DynamoDB error
    ddbMock.on(GetCommand).rejects(new Error('Mock DynamoDB error'));
    res = await request(app)
      .get(`/api/plugin/${MOCK_PLUGIN_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);

    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Get non-existent plugin', async () => {
    pluginExistedMock(ddbMock, false);
    const res = await request(app)
      .get(`/api/plugin/${MOCK_PLUGIN_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'Plugin not found',
    });
  });
  it('Get build-in plugin by ID', async () => {
    dictionaryMock(ddbMock);
    let res = await request(app)
      .get(`/api/plugin/${MOCK_BUILT_IN_PLUGIN_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        id: 'BUILT-IN-1',
        type: 'PLUGIN#BUILT-IN-1',
        prefix: 'PLUGIN',
        name: 'Transformer',
        description: 'Description of Transformer',
        builtIn: true,
        mainFunction: 'software.aws.solution.clickstream.Transformer',
        jarFile: '',
        bindCount: 0,
        pluginType: 'Transform',
        dependencyFiles: [],
        operator: '',
        deleted: false,
        createAt: 1667355960000,
        updateAt: 1667355960000,
      },
    });

    // Mock DynamoDB error
    ddbMock.on(GetCommand).rejects(new Error('Mock DynamoDB error'));
    res = await request(app)
      .get(`/api/plugin/${MOCK_PLUGIN_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);

    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Get non-existent build-in plugin by ID', async () => {
    dictionaryMock(ddbMock);
    let res = await request(app)
      .get(`/api/plugin/${MOCK_BUILT_IN_PLUGIN_ID}1`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'Plugin not found',
    });
  });
  it('Get plugin list', async () => {
    dictionaryMock(ddbMock);
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { name: 'plugin-01' },
        { name: 'plugin-02' },
        { name: 'plugin-03' },
        { name: 'plugin-04' },
        { name: 'plugin-05' },
      ],
    });
    let res = await request(app)
      .get('/api/plugin');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        items: [
          {
            id: 'BUILT-IN-1',
            type: 'PLUGIN#BUILT-IN-1',
            prefix: 'PLUGIN',
            name: 'Transformer',
            description: 'Description of Transformer',
            builtIn: true,
            mainFunction: 'software.aws.solution.clickstream.Transformer',
            jarFile: '',
            bindCount: 0,
            pluginType: 'Transform',
            dependencyFiles: [],
            operator: '',
            deleted: false,
            createAt: 1667355960000,
            updateAt: 1667355960000,
          },
          {
            id: 'BUILT-IN-2',
            type: 'PLUGIN#BUILT-IN-2',
            prefix: 'PLUGIN',
            name: 'UAEnrichment',
            description: 'Description of UAEnrichment',
            builtIn: true,
            mainFunction: 'software.aws.solution.clickstream.UAEnrichment',
            jarFile: '',
            bindCount: 0,
            pluginType: 'Enrich',
            dependencyFiles: [],
            operator: '',
            deleted: false,
            createAt: 1667355960000,
            updateAt: 1667355960000,
          },
          {
            id: 'BUILT-IN-3',
            type: 'PLUGIN#BUILT-IN-3',
            prefix: 'PLUGIN',
            name: 'IPEnrichment',
            description: 'Description of IPEnrichment',
            builtIn: true,
            mainFunction: 'software.aws.solution.clickstream.IPEnrichment',
            jarFile: '',
            bindCount: 0,
            pluginType: 'Enrich',
            dependencyFiles: [],
            operator: '',
            deleted: false,
            createAt: 1667355960000,
            updateAt: 1667355960000,
          },
          { name: 'plugin-01' },
          { name: 'plugin-02' },
          { name: 'plugin-03' },
          { name: 'plugin-04' },
          { name: 'plugin-05' },
        ],
        totalCount: 8,
      },
    });

    // Mock DynamoDB error
    ddbMock.on(QueryCommand).rejects(new Error('Mock DynamoDB error'));
    res = await request(app)
      .get('/api/plugin');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);

    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Get plugin list with page', async () => {
    dictionaryMock(ddbMock);
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { name: 'plugin-01' },
        { name: 'plugin-02' },
        { name: 'plugin-03' },
        { name: 'plugin-04' },
        { name: 'plugin-05' },
      ],
    });
    const res = await request(app)
      .get('/api/plugin?pageNumber=2&pageSize=2');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        items: [
          {
            id: 'BUILT-IN-3',
            type: 'PLUGIN#BUILT-IN-3',
            prefix: 'PLUGIN',
            name: 'IPEnrichment',
            description: 'Description of IPEnrichment',
            builtIn: true,
            mainFunction: 'software.aws.solution.clickstream.IPEnrichment',
            jarFile: '',
            bindCount: 0,
            pluginType: 'Enrich',
            dependencyFiles: [],
            operator: '',
            deleted: false,
            createAt: 1667355960000,
            updateAt: 1667355960000,
          },
          { name: 'plugin-01' },
        ],
        totalCount: 8,
      },
    });
  });
  it('Get plugin list with type', async () => {
    dictionaryMock(ddbMock);
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { name: 'plugin-02', pluginType: 'Enrich' },
        { name: 'plugin-03', pluginType: 'Enrich' },
      ],
    });
    const res = await request(app)
      .get('/api/plugin?type=Enrich');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        items: [
          {
            id: 'BUILT-IN-2',
            type: 'PLUGIN#BUILT-IN-2',
            prefix: 'PLUGIN',
            name: 'UAEnrichment',
            description: 'Description of UAEnrichment',
            builtIn: true,
            mainFunction: 'software.aws.solution.clickstream.UAEnrichment',
            jarFile: '',
            bindCount: 0,
            pluginType: 'Enrich',
            dependencyFiles: [],
            operator: '',
            deleted: false,
            createAt: 1667355960000,
            updateAt: 1667355960000,
          },
          {
            id: 'BUILT-IN-3',
            type: 'PLUGIN#BUILT-IN-3',
            prefix: 'PLUGIN',
            name: 'IPEnrichment',
            description: 'Description of IPEnrichment',
            builtIn: true,
            mainFunction: 'software.aws.solution.clickstream.IPEnrichment',
            jarFile: '',
            bindCount: 0,
            pluginType: 'Enrich',
            dependencyFiles: [],
            operator: '',
            deleted: false,
            createAt: 1667355960000,
            updateAt: 1667355960000,
          },
          { name: 'plugin-02', pluginType: 'Enrich' },
          { name: 'plugin-03', pluginType: 'Enrich' },
        ],
        totalCount: 4,
      },
    });
  });
  it('Get plugin list with order', async () => {
    dictionaryMock(ddbMock);
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { name: 'plugin-01' },
        { name: 'plugin-02' },
        { name: 'plugin-03' },
      ],
    });
    const res = await request(app)
      .get('/api/plugin?order=desc');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        items: [
          {
            id: 'BUILT-IN-1',
            type: 'PLUGIN#BUILT-IN-1',
            prefix: 'PLUGIN',
            name: 'Transformer',
            description: 'Description of Transformer',
            builtIn: true,
            mainFunction: 'software.aws.solution.clickstream.Transformer',
            jarFile: '',
            bindCount: 0,
            pluginType: 'Transform',
            dependencyFiles: [],
            operator: '',
            deleted: false,
            createAt: 1667355960000,
            updateAt: 1667355960000,
          },
          {
            id: 'BUILT-IN-2',
            type: 'PLUGIN#BUILT-IN-2',
            prefix: 'PLUGIN',
            name: 'UAEnrichment',
            description: 'Description of UAEnrichment',
            builtIn: true,
            mainFunction: 'software.aws.solution.clickstream.UAEnrichment',
            jarFile: '',
            bindCount: 0,
            pluginType: 'Enrich',
            dependencyFiles: [],
            operator: '',
            deleted: false,
            createAt: 1667355960000,
            updateAt: 1667355960000,
          },
          {
            id: 'BUILT-IN-3',
            type: 'PLUGIN#BUILT-IN-3',
            prefix: 'PLUGIN',
            name: 'IPEnrichment',
            description: 'Description of IPEnrichment',
            builtIn: true,
            mainFunction: 'software.aws.solution.clickstream.IPEnrichment',
            jarFile: '',
            bindCount: 0,
            pluginType: 'Enrich',
            dependencyFiles: [],
            operator: '',
            deleted: false,
            createAt: 1667355960000,
            updateAt: 1667355960000,
          },
          { name: 'plugin-01' },
          { name: 'plugin-02' },
          { name: 'plugin-03' },
        ],
        totalCount: 6,
      },
    });
  });
  it('Update plugin', async () => {
    pluginExistedMock(ddbMock, true);
    ddbMock.on(UpdateCommand).resolves({});
    let res = await request(app)
      .put(`/api/plugin/${MOCK_PLUGIN_ID}`)
      .send({
        id: MOCK_PLUGIN_ID,
        updateAt: 1678276073222,
        builtIn: false,
        status: 'Disabled',
        operator: '',
        mainFunction: 'com.cn.sre.main',
        name: 'Plugin-01',
        deleted: false,
        createAt: 1678275909650,
        jarFile: 'jarFile',
        typeName: 'PLUGIN',
        bindCount: 0,
        description: '3223 Description of Plugin-01',
        dependencyFiles: [
          'dependencyFiles1',
          'dependencyFiles2',
        ],
        pluginType: 'Transform',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      data: null,
      success: true,
      message: 'Plugin updated.',
    });
  });
  it('Update plugin mock error', async () => {
    // Mock DynamoDB error
    pluginExistedMock(ddbMock, true);
    ddbMock.on(UpdateCommand).rejects(new Error('Mock DynamoDB error'));
    const res = await request(app)
      .put(`/api/plugin/${MOCK_PLUGIN_ID}`)
      .send({
        id: MOCK_PLUGIN_ID,
        description: 'Update Description',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);

    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Update plugin with not match id', async () => {
    pluginExistedMock(ddbMock, true);
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .put(`/api/plugin/${MOCK_PLUGIN_ID}1`)
      .send({
        id: MOCK_PLUGIN_ID,
        description: 'Update Description',
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
          value: MOCK_PLUGIN_ID,
        },
      ],
    });
  });
  it('Update plugin with not body', async () => {
    pluginExistedMock(ddbMock, true);
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .put(`/api/plugin/${MOCK_PLUGIN_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
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
  it('Update plugin with no existed', async () => {
    pluginExistedMock(ddbMock, false);
    const res = await request(app)
      .put(`/api/plugin/${MOCK_PLUGIN_ID}`)
      .send({
        id: MOCK_PLUGIN_ID,
        description: 'Update Description',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'body',
          msg: 'Plugin resource does not exist.',
          param: 'id',
          value: MOCK_PLUGIN_ID,
        },
      ],
    });
  });
  it('Delete plugin', async () => {
    pluginExistedMock(ddbMock, true);
    ddbMock.on(UpdateCommand).resolves({});
    let res = await request(app)
      .delete(`/api/plugin/${MOCK_PLUGIN_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      data: null,
      success: true,
      message: 'Plugin deleted.',
    });

    // Mock DynamoDB error
    ddbMock.on(UpdateCommand).rejects(new Error('Mock DynamoDB error'));
    res = await request(app)
      .delete(`/api/plugin/${MOCK_PLUGIN_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);

    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Delete plugin with no existed', async () => {
    pluginExistedMock(ddbMock, false);
    ddbMock.on(UpdateCommand).resolves({});
    const res = await request(app)
      .delete(`/api/plugin/${MOCK_PLUGIN_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'params',
          msg: 'Plugin resource does not exist.',
          param: 'id',
          value: MOCK_PLUGIN_ID,
        },
      ],
    });
  });

  afterAll((done) => {
    server.close();
    done();
  });
});