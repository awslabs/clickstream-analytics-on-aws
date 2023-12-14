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
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import { dictionaryMock, MOCK_PLUGIN_ID, MOCK_TOKEN, pluginExistedMock, tokenMock } from './ddb-mock';
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
        jarFile: 'jarFile.jar',
        dependencyFiles: ['dependencyFiles1.jar', 'dependencyFiles2.mmdb'],
        mainFunction: 'com.cn.sre.main',
        pluginType: 'Transform',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toEqual('Plugin created.');
    expect(res.body.success).toEqual(true);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 2);
  });
  it('Create plugin with not allow file type', async () => {
    tokenMock(ddbMock, false);
    ddbMock.on(PutCommand).resolvesOnce({});
    const res = await request(app)
      .post('/api/plugin')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        name: 'Plugin-01',
        description: 'Description of Plugin-01',
        jarFile: 'jarFile.sh',
        dependencyFiles: ['dependencyFiles1.exe', 'dependencyFiles2.mmdb'],
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
          msg: 'Bad request. The file type not allow upload.',
          param: 'dependencyFiles',
          value: ['dependencyFiles1.exe', 'dependencyFiles2.mmdb'],
        },
        {
          location: 'body',
          msg: 'Bad request. The file type not allow upload.',
          param: 'jarFile',
          value: 'jarFile.sh',
        },
      ],
    });
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
        jarFile: 'jarFile.jar',
        dependencyFiles: ['dependencyFiles1.jar', 'dependencyFiles2.mmdb'],
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
          msg: 'Bad request. Please check and try again.',
          param: '',
          value: {
            name: '<IMG SRC=javascript:alert(\'XSS\')><script>alert(234)</script>',
            description: 'Description of Plugin-01',
            jarFile: 'jarFile.jar',
            dependencyFiles: ['dependencyFiles1.jar', 'dependencyFiles2.mmdb'],
            mainFunction: 'com.cn.sre.main',
            pluginType: 'Transform',
          },
        },
      ],
    });
  });
  it('Create plugin with mock error', async () => {
    tokenMock(ddbMock, false).rejectsOnce(new Error('Mock DynamoDB error'));
    const res = await request(app)
      .post('/api/plugin')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        name: 'Plugin-01',
        description: 'Description of Plugin-01',
        jarFile: 'jarFile.jar',
        dependencyFiles: ['dependencyFiles1.jar', 'dependencyFiles2.mmdb'],
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
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 2);
    expect(ddbMock).toHaveReceivedCommandTimes(DeleteCommand, 1);
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
        {
          location: 'body',
          msg: 'Value is empty.',
          param: 'jarFile',
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
        jarFile: 'jarFile.jar',
        dependencyFiles: ['dependencyFiles1.jar', 'dependencyFiles2.mmdb'],
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
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
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
        dependencyFiles: ['dependencyFiles1.jar', 'dependencyFiles2.mmdb'],
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
          param: 'mainFunction',
        },
        {
          location: 'body',
          msg: 'Value is empty.',
          param: 'jarFile',
        },
      ],
    });
    expect(res.body.success).toEqual(false);
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
            description: {
              'en-US': 'Convert the data format reported by SDK into the data format in the data warehouse',
              'zh-CN': '把SDK上报的数据格式，转换成数据仓库中的数据格式',
            },
            builtIn: true,
            mainFunction: 'software.aws.solution.clickstream.TransformerV2',
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
            description: {
              'en-US': 'Derive OS, device, browser information from User Agent string from the HTTP request header',
              'zh-CN': '从 HTTP 请求标头的用户代理（User Agent)字符串中获取操作系统、设备和浏览器信息',
            },
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
            description: {
              'en-US': 'Derive location information (e.g., city, country, region) based on the request source IP',
              'zh-CN': '根据请求源 IP 获取位置信息（例如，城市、国家、地区）',
            },
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
          {
            id: 'BUILT-IN-4',
            type: 'PLUGIN#BUILT-IN-4',
            prefix: 'PLUGIN',
            name: 'GTMServerDataTransformer',
            description: {
              'en-US': 'Convert the GTM server data format into the data format in the data warehouse',
              'zh-CN': '把GTM服务的数据格式，转换成数据仓库中的数据格式',
            },
            builtIn: true,
            mainFunction: 'software.aws.solution.clickstream.gtm.GTMServerDataTransformer',
            jarFile: '',
            bindCount: 0,
            pluginType: 'Transform',
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
        totalCount: 9,
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
            description: {
              'en-US': 'Derive location information (e.g., city, country, region) based on the request source IP',
              'zh-CN': '根据请求源 IP 获取位置信息（例如，城市、国家、地区）',
            },
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
          {
            id: 'BUILT-IN-4',
            type: 'PLUGIN#BUILT-IN-4',
            prefix: 'PLUGIN',
            name: 'GTMServerDataTransformer',
            description: {
              'en-US': 'Convert the GTM server data format into the data format in the data warehouse',
              'zh-CN': '把GTM服务的数据格式，转换成数据仓库中的数据格式',
            },
            builtIn: true,
            mainFunction: 'software.aws.solution.clickstream.gtm.GTMServerDataTransformer',
            jarFile: '',
            bindCount: 0,
            pluginType: 'Transform',
            dependencyFiles: [],
            operator: '',
            deleted: false,
            createAt: 1667355960000,
            updateAt: 1667355960000,
          },
        ],
        totalCount: 9,
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
            description: {
              'en-US': 'Derive OS, device, browser information from User Agent string from the HTTP request header',
              'zh-CN': '从 HTTP 请求标头的用户代理（User Agent)字符串中获取操作系统、设备和浏览器信息',
            },
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
            description: {
              'en-US': 'Derive location information (e.g., city, country, region) based on the request source IP',
              'zh-CN': '根据请求源 IP 获取位置信息（例如，城市、国家、地区）',
            },
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
            description: {
              'en-US': 'Convert the data format reported by SDK into the data format in the data warehouse',
              'zh-CN': '把SDK上报的数据格式，转换成数据仓库中的数据格式',
            },
            builtIn: true,
            mainFunction: 'software.aws.solution.clickstream.TransformerV2',
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
            description: {
              'en-US': 'Derive OS, device, browser information from User Agent string from the HTTP request header',
              'zh-CN': '从 HTTP 请求标头的用户代理（User Agent)字符串中获取操作系统、设备和浏览器信息',
            },
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
            description: {
              'en-US': 'Derive location information (e.g., city, country, region) based on the request source IP',
              'zh-CN': '根据请求源 IP 获取位置信息（例如，城市、国家、地区）',
            },
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
          {
            id: 'BUILT-IN-4',
            type: 'PLUGIN#BUILT-IN-4',
            prefix: 'PLUGIN',
            name: 'GTMServerDataTransformer',
            description: {
              'en-US': 'Convert the GTM server data format into the data format in the data warehouse',
              'zh-CN': '把GTM服务的数据格式，转换成数据仓库中的数据格式',
            },
            builtIn: true,
            mainFunction: 'software.aws.solution.clickstream.gtm.GTMServerDataTransformer',
            jarFile: '',
            bindCount: 0,
            pluginType: 'Transform',
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
        totalCount: 7,
      },
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