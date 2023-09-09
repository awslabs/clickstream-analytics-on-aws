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
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import { MOCK_DASHBOARD_ID, MOCK_PROJECT_ID, MOCK_TOKEN, projectExistedMock, tokenMock } from './ddb-mock';
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
        sheets: [
          { id: 's1', name: 'sheet1' },
          { id: 's2', name: 'sheet2' },
        ],
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

  it('Create dashboard with empty parameters', async () => {
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
        sheets: [
          { id: 's1', name: 'sheet1' },
          { id: 's2', name: 'sheet2' },
        ],
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
          param: 'ownerPrincipal',
        },
        {
          location: 'body',
          msg: 'Value is empty.',
          param: 'defaultDataSourceArn',
        },
      ],
    });
    expect(quickSightMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 0);
    expect(quickSightMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 2);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });

  it('List dashboards of project', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          dashboardId: 'dashboard-1',
          name: 'dashboard-1',
          projectId: MOCK_PROJECT_ID,
          description: 'Description of dashboard-1',
          region: 'ap-southeast-1',
          sheets: [
            { id: 's1', name: 'sheet1' },
            { id: 's2', name: 'sheet2' },
          ],
          ownerPrincipal: 'arn:aws:quicksight:us-west-2:5555555555555:user/default/user',
          defaultDataSourceArn: 'arn:aws:quicksight:ap-southeast-1:5555555555555:datasource/clickstream_datasource_project_1',
          deleted: false,
        },
        {
          dashboardId: 'dashboard-2',
          name: 'dashboard-2',
          projectId: 'project-1',
          description: 'Description of dashboard-2',
          region: 'ap-southeast-1',
          sheets: [
            { id: 's1', name: 'sheet1' },
            { id: 's2', name: 'sheet2' },
          ],
          ownerPrincipal: 'arn:aws:quicksight:us-west-2:5555555555555:user/default/user',
          defaultDataSourceArn: 'arn:aws:quicksight:ap-southeast-1:5555555555555:datasource/clickstream_datasource_project_1',
          deleted: false,
        },
      ],
    });
    const res = await request(app)
      .get(`/api/project/${MOCK_PROJECT_ID}/dashboard`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(
      {
        data: {
          items: [{
            dashboardId: 'dashboard-1',
            defaultDataSourceArn: 'arn:aws:quicksight:ap-southeast-1:5555555555555:datasource/clickstream_datasource_project_1',
            deleted: false,
            description: 'Description of dashboard-1',
            name: 'dashboard-1',
            ownerPrincipal: 'arn:aws:quicksight:us-west-2:5555555555555:user/default/user',
            projectId: 'project_8888_8888',
            region: 'ap-southeast-1',
            sheets: [
              { id: 's1', name: 'sheet1' },
              { id: 's2', name: 'sheet2' },
            ],
          }],
          totalCount: 1,
        },
        message: '',
        success: true,
      },
    );
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 1);
  });

  it('get dashboard details', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        dashboardId: MOCK_DASHBOARD_ID,
        name: 'dashboard-1',
        projectId: MOCK_PROJECT_ID,
        description: 'Description of dashboard-1',
        region: 'ap-southeast-1',
        sheets: [
          { id: 's1', name: 'sheet1' },
          { id: 's2', name: 'sheet2' },
        ],
        ownerPrincipal: 'arn:aws:quicksight:us-west-2:5555555555555:user/default/user',
        defaultDataSourceArn: 'arn:aws:quicksight:ap-southeast-1:5555555555555:datasource/clickstream_datasource_project_1',
        deleted: false,
      },
    });
    const res = await request(app)
      .get(`/api/project/${MOCK_PROJECT_ID}/dashboard/${MOCK_DASHBOARD_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(
      {
        data: {
          dashboardId: MOCK_DASHBOARD_ID,
          defaultDataSourceArn: 'arn:aws:quicksight:ap-southeast-1:5555555555555:datasource/clickstream_datasource_project_1',
          deleted: false,
          description: 'Description of dashboard-1',
          name: 'dashboard-1',
          ownerPrincipal: 'arn:aws:quicksight:us-west-2:5555555555555:user/default/user',
          projectId: 'project_8888_8888',
          region: 'ap-southeast-1',
          sheets: [
            { id: 's1', name: 'sheet1' },
            { id: 's2', name: 'sheet2' },
          ],
        },
        message: '',
        success: true,
      },
    );
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
  });

  it('delete dashboard', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        dashboardId: MOCK_DASHBOARD_ID,
        name: 'dashboard-1',
        projectId: MOCK_PROJECT_ID,
        description: 'Description of dashboard-1',
        region: 'ap-southeast-1',
        sheets: [
          { id: 's1', name: 'sheet1' },
          { id: 's2', name: 'sheet2' },
        ],
        ownerPrincipal: 'arn:aws:quicksight:us-west-2:5555555555555:user/default/user',
        defaultDataSourceArn: 'arn:aws:quicksight:ap-southeast-1:5555555555555:datasource/clickstream_datasource_project_1',
        deleted: false,
      },
    });
    ddbMock.on(UpdateCommand).resolves({});
    const res = await request(app)
      .delete(`/api/project/${MOCK_PROJECT_ID}/dashboard/${MOCK_DASHBOARD_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(
      { data: null, message: 'Dashboard deleted.', success: true });
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
  });

  afterAll((done) => {
    server.close();
    done();
  });
});

