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
  PutCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import { MOCK_TOKEN, tokenMock } from './ddb-mock';
import { app, server } from '../../index';
import 'aws-sdk-client-mock-jest';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('Request Id test', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  it('Requests 201 + 400', async () => {
    tokenMock(ddbMock, false)
      .resolves({
        Item: { id: MOCK_TOKEN, type: 'REQUESTID' },
      });
    ddbMock.on(PutCommand).resolves({});
    let res = await request(app)
      .post('/api/plugin')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        name: 'Plugin-01',
        jarFile: 's3://xx/a.jar',
        mainFunction: 'a.b.c',
      });
    expect(res.statusCode).toBe(201);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 2);

    res = await request(app)
      .post('/api/plugin')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        name: 'Plugin-01',
        jarFile: 's3://xx/a.jar',
        mainFunction: 'a.b.c',
      });
    expect(res.statusCode).toBe(400);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 2);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 2);
  });
  it('Requests 400 + 201', async () => {
    tokenMock(ddbMock, false)
      .resolves({});
    ddbMock.on(PutCommand).resolves({});
    let res = await request(app)
      .post('/api/plugin')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({});
    expect(res.statusCode).toBe(400);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);

    res = await request(app)
      .post('/api/plugin')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        name: 'Plugin-01',
        jarFile: 's3://xx/a.jar',
        mainFunction: 'a.b.c',
      });
    expect(res.statusCode).toBe(201);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 2);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 2);
  });
  it('Requests 500 + 201', async () => {
    tokenMock(ddbMock, false)
      .resolves({});
    ddbMock.on(PutCommand).rejects(new Error('Mock DynamoDB error'));
    let res = await request(app)
      .post('/api/plugin')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        name: 'Plugin-01',
        jarFile: 's3://xx/a.jar',
        mainFunction: 'a.b.c',
      });
    expect(res.statusCode).toBe(500);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);

    ddbMock.on(PutCommand).resolves({});
    res = await request(app)
      .post('/api/plugin')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        name: 'Plugin-01',
        jarFile: 's3://xx/a.jar',
        mainFunction: 'a.b.c',
      });
    expect(res.statusCode).toBe(201);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 2);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 3);
  });

  afterAll((done) => {
    server.close();
    done();
  });
});