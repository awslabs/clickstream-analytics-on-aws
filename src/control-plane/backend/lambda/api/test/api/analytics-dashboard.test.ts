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

import { DEFAULT_DASHBOARD_NAME_PREFIX } from '@aws/clickstream-base-lib';
import { CreateAnalysisCommand, CreateDashboardCommand, CreateDataSetCommand, CreateFolderCommand, CreateFolderMembershipCommand, DeleteAnalysisCommand, DeleteDashboardCommand, DeleteDataSetCommand, DescribeDashboardCommand, DescribeDashboardDefinitionCommand, DescribeFolderCommand, ListFolderMembersCommand, QuickSightClient, ResourceNotFoundException } from '@aws-sdk/client-quicksight';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import { MOCK_APP_ID, MOCK_DASHBOARD_ID, MOCK_PROJECT_ID, MOCK_TOKEN, projectExistedMock, tokenMock } from './ddb-mock';
import { KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW } from './pipeline-mock';
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
    ddbMock.on(QueryCommand).resolves({
      Items: [{ ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW }],
    });
    ddbMock.on(PutCommand).resolvesOnce({});
    quickSightMock.on(CreateDataSetCommand).resolvesOnce({});
    quickSightMock.on(CreateDashboardCommand).resolvesOnce({});
    quickSightMock.on(CreateDashboardCommand).resolves({});
    quickSightMock.on(CreateAnalysisCommand).resolves({});
    quickSightMock.on(CreateFolderMembershipCommand).resolves({});
    const res = await request(app)
      .post(`/api/project/${MOCK_PROJECT_ID}/app/${MOCK_APP_ID}/dashboard`)
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
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toEqual('Dashboard created.');
    expect(res.body.success).toEqual(true);
    expect(quickSightMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(CreateFolderMembershipCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
  });

  it('Create dashboard with empty parameters', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand).resolves({
      Items: [{
        ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW,
        stackDetails: [],
      }],
    });
    ddbMock.on(PutCommand).resolvesOnce({});
    quickSightMock.on(CreateDataSetCommand).resolvesOnce({});
    quickSightMock.on(CreateDashboardCommand).resolvesOnce({});
    quickSightMock.on(CreateDashboardCommand).resolves({});
    quickSightMock.on(CreateAnalysisCommand).resolves({});
    const res = await request(app)
      .post(`/api/project/${MOCK_PROJECT_ID}/app/${MOCK_APP_ID}/dashboard`)
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
    expect(res.body.message).toEqual('Default data source ARN and owner principal is required.');
    expect(quickSightMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 0);
    expect(quickSightMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 0);
    expect(quickSightMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
  });

  it('Create dashboard name is too long', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    let res = await request(app)
      .post(`/api/project/${MOCK_PROJECT_ID}/app/${MOCK_APP_ID}/dashboard`)
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        name: `${'a'.repeat(256)}`,
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
    expect(res.body.message).toEqual('Parameter verification failed.');

    res = await request(app)
      .post(`/api/project/${MOCK_PROJECT_ID}/app/${MOCK_APP_ID}/dashboard`)
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        name: 'name1',
        appId: 'app1',
        description: `${'a'.repeat(1025)}`,
        region: 'ap-southeast-1',
        sheets: [
          { id: 's1', name: 'sheet1' },
          { id: 's2', name: 'sheet2' },
        ],
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toEqual('Parameter verification failed.');
  });

  it('List dashboards of project', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [{ ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW }],
    });
    quickSightMock.on(DescribeFolderCommand).resolves({
      Folder: {
        Arn: 'arn:aws:quicksight:us-west-2:5555555555555:folder/folder1',
        FolderId: 'folder1',
        Name: 'folder1',
        FolderType: 'SHARED',
        CreatedTime: new Date('2023-08-01T08:00:00.000Z'),
        LastUpdatedTime: new Date('2023-08-01T08:00:00.000Z'),
      },
    });
    quickSightMock.on(ListFolderMembersCommand).resolves({
      FolderMemberList: [
        {
          MemberId: 'dashboard1',
          MemberArn: 'arn:aws:quicksight:us-west-2:5555555555555:dashboard/dashboard1',
        },
        {
          MemberId: 'dashboard2',
          MemberArn: 'arn:aws:quicksight:us-west-2:5555555555555:dashboard/dashboard2',
        },
      ],
    });
    quickSightMock.on(DescribeDashboardCommand).resolvesOnce({
      Dashboard: {
        DashboardId: 'preset_dashboard',
        Name: `${DEFAULT_DASHBOARD_NAME_PREFIX}preset dashboard`,
        Arn: 'arn:aws:quicksight:us-west-2:5555555555555:dashboard/preset_dashboard',
        Version: {
          Description: 'Description of preset dashboard',
          Sheets: [
            { SheetId: 'sheet1', Name: 'sheet1' },
            { SheetId: 'sheet2', Name: 'sheet2' },
          ],
        },
        CreatedTime: new Date('2023-08-01T08:00:00.000Z'),
        LastUpdatedTime: new Date('2023-08-01T08:00:00.000Z'),
      },
    }).resolves({
      Dashboard: {
        DashboardId: 'dashboard1',
        Name: 'dashboard1',
        Arn: 'arn:aws:quicksight:us-west-2:5555555555555:dashboard/dashboard1',
        Version: {
          Description: 'Description of dashboard1',
          Sheets: [
            { SheetId: 'sheet1', Name: 'sheet1' },
            { SheetId: 'sheet2', Name: 'sheet2' },
          ],
        },
        CreatedTime: new Date('2023-08-10T08:00:00.000Z'),
        LastUpdatedTime: new Date('2023-08-10T08:00:00.000Z'),
      },
    });
    const res = await request(app)
      .get(`/api/project/${MOCK_PROJECT_ID}/app/${MOCK_APP_ID}/dashboards`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(
      {
        data: {
          items: [{
            id: 'preset_dashboard',
            description: 'Description of preset dashboard',
            name: 'Clickstream Dashboard preset dashboard',
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            region: 'ap-southeast-1',
            sheets: [
              { id: 'sheet1', name: 'sheet1' },
              { id: 'sheet2', name: 'sheet2' },
            ],
            createAt: 1690876800000,
            updateAt: 1690876800000,
          },
          {
            id: 'dashboard1',
            description: 'Description of dashboard1',
            name: 'dashboard1',
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            region: 'ap-southeast-1',
            sheets: [
              { id: 'sheet1', name: 'sheet1' },
              { id: 'sheet2', name: 'sheet2' },
            ],
            createAt: 1691654400000,
            updateAt: 1691654400000,
          }],
          totalCount: 2,
        },
        message: '',
        success: true,
      },
    );
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeFolderCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(ListFolderMembersCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 2);
  });

  it('List dashboards of project when folder is non-existent', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [{ ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW }],
    });
    quickSightMock.on(DescribeFolderCommand).resolves({
      Folder: {},
    });
    quickSightMock.on(CreateFolderCommand).resolves({});
    quickSightMock.on(CreateFolderMembershipCommand).resolves({});
    quickSightMock.on(ListFolderMembersCommand).resolves({
      FolderMemberList: [
        {
          MemberId: 'dashboard1',
          MemberArn: 'arn:aws:quicksight:us-west-2:5555555555555:dashboard/dashboard1',
        },
        {
          MemberId: 'dashboard2',
          MemberArn: 'arn:aws:quicksight:us-west-2:5555555555555:dashboard/dashboard2',
        },
      ],
    });
    quickSightMock.on(DescribeDashboardCommand).resolvesOnce({
      Dashboard: {
        DashboardId: 'preset_dashboard',
        Name: `${DEFAULT_DASHBOARD_NAME_PREFIX}preset dashboard`,
        Arn: 'arn:aws:quicksight:us-west-2:5555555555555:dashboard/preset_dashboard',
        Version: {
          Description: 'Description of preset dashboard',
          Sheets: [
            { SheetId: 'sheet1', Name: 'sheet1' },
            { SheetId: 'sheet2', Name: 'sheet2' },
          ],
        },
        CreatedTime: new Date('2023-08-01T08:00:00.000Z'),
        LastUpdatedTime: new Date('2023-08-01T08:00:00.000Z'),
      },
    }).resolves({
      Dashboard: {
        DashboardId: 'dashboard1',
        Name: 'dashboard1',
        Arn: 'arn:aws:quicksight:us-west-2:5555555555555:dashboard/dashboard1',
        Version: {
          Description: 'Description of dashboard1',
          Sheets: [
            { SheetId: 'sheet1', Name: 'sheet1' },
            { SheetId: 'sheet2', Name: 'sheet2' },
          ],
        },
        CreatedTime: new Date('2023-08-10T08:00:00.000Z'),
        LastUpdatedTime: new Date('2023-08-10T08:00:00.000Z'),
      },
    });
    const res = await request(app)
      .get(`/api/project/${MOCK_PROJECT_ID}/app/app1/dashboards`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(
      {
        data: {
          items: [{
            id: 'preset_dashboard',
            description: 'Description of preset dashboard',
            name: 'Clickstream Dashboard preset dashboard',
            projectId: MOCK_PROJECT_ID,
            appId: 'app1',
            region: 'ap-southeast-1',
            sheets: [
              { id: 'sheet1', name: 'sheet1' },
              { id: 'sheet2', name: 'sheet2' },
            ],
            createAt: 1690876800000,
            updateAt: 1690876800000,
          },
          {
            id: 'dashboard1',
            description: 'Description of dashboard1',
            name: 'dashboard1',
            projectId: MOCK_PROJECT_ID,
            appId: 'app1',
            region: 'ap-southeast-1',
            sheets: [
              { id: 'sheet1', name: 'sheet1' },
              { id: 'sheet2', name: 'sheet2' },
            ],
            createAt: 1691654400000,
            updateAt: 1691654400000,
          }],
          totalCount: 2,
        },
        message: '',
        success: true,
      },
    );
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeFolderCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(CreateFolderCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(CreateFolderMembershipCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(ListFolderMembersCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 2);
  });

  it('get dashboard details', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [{ ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW }],
    });
    quickSightMock.on(DescribeDashboardCommand).resolves({
      Dashboard: {
        DashboardId: 'dashboard1',
        Name: 'dashboard1',
        Arn: 'arn:aws:quicksight:us-west-2:5555555555555:dashboard/dashboard1',
        Version: {
          Description: 'Description of dashboard1',
          Sheets: [
            { SheetId: 'sheet1', Name: 'sheet1' },
            { SheetId: 'sheet2', Name: 'sheet2' },
          ],
        },
        CreatedTime: new Date('2023-08-10T08:00:00.000Z'),
        LastUpdatedTime: new Date('2023-08-10T08:00:00.000Z'),
      },
    });
    const res = await request(app)
      .get(`/api/project/${MOCK_PROJECT_ID}/app/${MOCK_APP_ID}/dashboard/${MOCK_DASHBOARD_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(
      {
        data: {
          id: 'dashboard1',
          description: 'Description of dashboard1',
          name: 'dashboard1',
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          region: 'ap-southeast-1',
          sheets: [
            { id: 'sheet1', name: 'sheet1' },
            { id: 'sheet2', name: 'sheet2' },
          ],
          createAt: 1691654400000,
          updateAt: 1691654400000,
        },
        message: '',
        success: true,
      },
    );
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 1);
  });

  it('delete dashboard', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [{ ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW }],
    });

    quickSightMock.on(DeleteDashboardCommand).resolves({});
    quickSightMock.on(DeleteAnalysisCommand).resolves({});

    const dashboardDef =
    {
      DataSetIdentifierDeclarations: [
        {
          Identifier: 'test-dataset-name1',
          DataSetArn: 'arn:aws:quicksight:ap-northeast-1:555555555555:dataset/0042ffe51',
        },
        {
          Identifier: 'test-dataset-name2',
          DataSetArn: 'arn:aws:quicksight:ap-northeast-1:555555555555:dataset/0042ffe52',
        },
      ],
      Sheets: [],
      CalculatedFields: [],
      ParameterDeclarations: [],
      FilterGroups: [],
    };
    quickSightMock.on(DescribeDashboardDefinitionCommand).resolves({
      Definition: dashboardDef,
    });
    quickSightMock.on(DeleteDataSetCommand).resolves({});

    const res = await request(app)
      .delete(`/api/project/${MOCK_PROJECT_ID}/app/${MOCK_APP_ID}/dashboard/${MOCK_DASHBOARD_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(
      { data: null, message: 'Dashboard deleted.', success: true });
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeDashboardDefinitionCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 2);
  });

  it('Delete dashboard - dashboard not exist', async () => {
    projectExistedMock(ddbMock, false);
    ddbMock.on(QueryCommand).resolves({
      Items: [{ ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW }],
    });

    quickSightMock.on(DeleteDashboardCommand).rejects(
      new ResourceNotFoundException({
        message: 'resource not exist.',
        $metadata: {},
      }),
    );

    quickSightMock.on(DescribeDashboardDefinitionCommand).rejects(
      new ResourceNotFoundException({
        message: 'resource not exist.',
        $metadata: {},
      }),
    );
    quickSightMock.on(DeleteDataSetCommand).resolves({});

    const res = await request(app)
      .delete(`/api/project/${MOCK_PROJECT_ID}/app/${MOCK_APP_ID}/dashboard/${MOCK_DASHBOARD_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(DeleteCommand, 0);
    expect(quickSightMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 0);
    expect(quickSightMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 0);
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeDashboardDefinitionCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 0);
  });

  afterAll((done) => {
    server.close();
    done();
  });
});

