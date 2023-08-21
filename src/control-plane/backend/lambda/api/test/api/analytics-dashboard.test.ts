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

import { CreateDashboardCommand, CreateDataSetCommand, QuickSightClient } from '@aws-sdk/client-quicksight';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import { MOCK_PROJECT_ID, MOCK_TOKEN, projectExistedMock, tokenMock } from './ddb-mock';
import { app, server } from '../../index';
import 'aws-sdk-client-mock-jest';

const ddbMock = mockClient(DynamoDBDocumentClient);
const quickSightMock = mockClient(QuickSightClient);

describe('Analytics dashboard test', () => {
  beforeEach(() => {
    ddbMock.reset();
    quickSightMock.reset();
  });
  it('Create dashboard', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    ddbMock.on(PutCommand).resolvesOnce({});
    quickSightMock.on(CreateDataSetCommand).resolvesOnce({});
    quickSightMock.on(CreateDashboardCommand).resolvesOnce({});
    const res = await request(app)
      .post(`/api/project/${MOCK_PROJECT_ID}/dashboard`)
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        name: 'd11',
        appId: 'app1',
        description: 'Description of dd-01',
        region: 'ap-southeast-1',
        sheetNames: ['s1', 's2'],
        ownerPrincipal: 'arn:aws:quicksight:us-west-2:5555555555555:user/default/user',
        defaultDataSourceArn: 'arn:aws:quicksight:ap-southeast-1:5555555555555:datasource/clickstream_datasource_project_1',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toEqual('Dashboard created.');
    expect(res.body.success).toEqual(true);
    expect(quickSightMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 2);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 2);
  });

  afterAll((done) => {
    server.close();
    done();
  });
});