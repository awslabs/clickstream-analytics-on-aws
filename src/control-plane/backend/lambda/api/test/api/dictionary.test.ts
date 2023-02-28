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

import { DynamoDBDocumentClient, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import { app, server } from '../../index';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('Dictionary test', () => {
  beforeEach(() => {
    ddbMock.reset();
  });
  it('get dictionary list', async () => {
    ddbMock.on(ScanCommand).resolves({
      Items: [
        {
          name: 'D1',
          data: '{"solution_template_url":"https://xxxx/xxxx/......","solution_name":"click stream","solution_version":"v1.0.1"}',
        },
        { name: 'D2', data: 'd2' },
      ],
    });
    let res = await request(app)
      .get('/api/dictionary');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          name: 'D1',
          data: {
            solution_template_url: 'https://xxxx/xxxx/......',
            solution_name: 'click stream',
            solution_version: 'v1.0.1',
          },
        },
        { name: 'D2', data: 'd2' },
      ],
    });

    // Mock DynamoDB error
    ddbMock.on(ScanCommand).rejects(new Error('Mock DynamoDB error'));
    res = await request(app)
      .get('/api/dictionary');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('get dictionary by name', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: { name: 'D1', data: 'd1' },
    });
    let res = await request(app)
      .get('/api/dictionary/D1');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: { name: 'D1', data: 'd1' },
    });

    // Mock DynamoDB error
    ddbMock.on(GetCommand).rejects(new Error('Mock DynamoDB error'));
    res = await request(app)
      .get('/api/dictionary/D1');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('get non-existent dictionary', async () => {
    ddbMock.on(GetCommand).resolves({});
    const res = await request(app)
      .get('/api/dictionary/Dx');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'Dictionary not found',
    });
  });

  afterAll((done) => {
    server.close();
    done();
  });
});