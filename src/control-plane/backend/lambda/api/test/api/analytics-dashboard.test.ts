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
import { CreateAnalysisCommand, CreateDashboardCommand, CreateDataSetCommand, DeleteAnalysisCommand, DeleteDashboardCommand, DeleteDataSetCommand, DescribeDashboardDefinitionCommand, QuickSightClient, ResourceNotFoundException } from '@aws-sdk/client-quicksight';
import { DescribeExecutionCommand, ExecutionStatus, SFNClient } from '@aws-sdk/client-sfn';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import { MOCK_APP_ID, MOCK_DASHBOARD_ID, MOCK_EXECUTION_ID, MOCK_PROJECT_ID, MOCK_SOLUTION_VERSION, MOCK_TOKEN, projectExistedMock, tokenMock } from './ddb-mock';
import { KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW } from './pipeline-mock';
import { OUTPUT_REPORT_DASHBOARDS_SUFFIX } from '../../common/constants-ln';
import { BuiltInTagKeys } from '../../common/model-ln';
import { app, server } from '../../index';
import 'aws-sdk-client-mock-jest';

const ddbMock = mockClient(DynamoDBDocumentClient);
const quickSightMock = mockClient(QuickSightClient);
const cloudFormationMock = mockClient(CloudFormationClient);
const sfnMock = mockClient(SFNClient);

describe('Analytics dashboard test', () => {
  beforeEach(() => {
    ddbMock.reset();
    quickSightMock.reset();
    cloudFormationMock.reset();
    sfnMock.reset();
  });

  it('Create dashboard', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand).resolves({
      Items: [{ ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW }],
    });
    const mockOutputs = [
      {
        OutputKey: 'Dashboards',
        OutputValue: '[{"appId":"app1","dashboardId":"clickstream_dashboard_v1_notepad_mtzfsocy_app1"},{"appId":"app2","dashboardId":"clickstream_dashboard_v1_notepad_mtzfsocy_app2"}]',
      },
      {
        OutputKey: 'DataSourceArn',
        OutputValue: 'arn:aws:quicksight:ap-northeast-1:555555555555:datasource/clickstream_datasource_adfsd_uqqk_d84e29f0',
      },
    ];
    cloudFormationMock.on(DescribeStacksCommand).resolves({
      Stacks: [
        {
          StackName: 'xxx',
          Outputs: mockOutputs,
          Tags: [{ Key: BuiltInTagKeys.AWS_SOLUTION_VERSION, Value: MOCK_SOLUTION_VERSION }],
          StackStatus: StackStatus.CREATE_COMPLETE,
          CreationTime: new Date(),
        },
      ],
    });
    sfnMock.on(DescribeExecutionCommand).resolves({
      executionArn: 'xx',
      stateMachineArn: 'yy',
      name: MOCK_EXECUTION_ID,
      status: ExecutionStatus.SUCCEEDED,
      output: 'SUCCEEDED',
    });
    ddbMock.on(PutCommand).resolvesOnce({});
    quickSightMock.on(CreateDataSetCommand).resolvesOnce({});
    quickSightMock.on(CreateDashboardCommand).resolvesOnce({});
    quickSightMock.on(CreateDashboardCommand).resolves({});
    quickSightMock.on(CreateAnalysisCommand).resolves({});
    const res = await request(app)
      .post(`/api/project/${MOCK_PROJECT_ID}/${MOCK_APP_ID}/dashboard`)
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
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 2);
  });

  it('Create dashboard with empty parameters', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand).resolves({
      Items: [{ ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW }],
    });
    const mockOutputs = [
      {
        OutputKey: 'Dashboards',
        OutputValue: '[{"appId":"app1","dashboardId":"clickstream_dashboard_v1_notepad_mtzfsocy_app1"},{"appId":"app2","dashboardId":"clickstream_dashboard_v1_notepad_mtzfsocy_app2"}]',
      },
      {
        OutputKey: 'DataSourceArn',
        OutputValue: '',
      },
    ];
    cloudFormationMock.on(DescribeStacksCommand).resolves({
      Stacks: [
        {
          StackName: 'xxx',
          Outputs: mockOutputs,
          Tags: [{ Key: BuiltInTagKeys.AWS_SOLUTION_VERSION, Value: MOCK_SOLUTION_VERSION }],
          StackStatus: StackStatus.CREATE_COMPLETE,
          CreationTime: new Date(),
        },
      ],
    });
    sfnMock.on(DescribeExecutionCommand).resolves({
      executionArn: 'xx',
      stateMachineArn: 'yy',
      name: MOCK_EXECUTION_ID,
      status: ExecutionStatus.SUCCEEDED,
      output: 'SUCCEEDED',
    });
    ddbMock.on(PutCommand).resolvesOnce({});
    quickSightMock.on(CreateDataSetCommand).resolvesOnce({});
    quickSightMock.on(CreateDashboardCommand).resolvesOnce({});
    quickSightMock.on(CreateDashboardCommand).resolves({});
    quickSightMock.on(CreateAnalysisCommand).resolves({});
    const res = await request(app)
      .post(`/api/project/${MOCK_PROJECT_ID}/${MOCK_APP_ID}/dashboard`)
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

  it('List dashboards of project', async () => {
    ddbMock.on(QueryCommand).resolvesOnce({
      Items: [
        {
          dashboardId: 'dashboard-1',
          name: 'dashboard-1',
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
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
      ],
    }).resolves({
      Items: [{ ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW }],
    });
    const res = await request(app)
      .get(`/api/project/${MOCK_PROJECT_ID}/${MOCK_APP_ID}/dashboard`);
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
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
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
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 2);
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
    ddbMock.on(QueryCommand).resolves({
      Items: [{ ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW }],
    });
    const res = await request(app)
      .get(`/api/project/${MOCK_PROJECT_ID}/${MOCK_APP_ID}/dashboard/${MOCK_DASHBOARD_ID}`);
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
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          status: {
            stackDetails: [
              {
                stackType: 'Reporting',
                outputs: [
                  {
                    OutputKey: 'aaaaaaa' + OUTPUT_REPORT_DASHBOARDS_SUFFIX,
                    OutputValue: `[{
                      "appId": "${MOCK_APP_ID}",
                      "dashboardId": "builtin-dashboard"
                    }]`,
                  },
                ],
              },
            ],
          },
        },
      ],
    });

    ddbMock.on(GetCommand).resolves({
      Item: {
        region: 'us-east-1',
      },
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
      .delete(`/api/project/${MOCK_PROJECT_ID}/${MOCK_APP_ID}/dashboard/${MOCK_DASHBOARD_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(
      { data: null, message: 'Dashboard deleted.', success: true });
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeDashboardDefinitionCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 2);
  });

  it('Delete dashboard - dashboard not exist', async () => {
    projectExistedMock(ddbMock, false);

    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          status: {
            stackDetails: [
              {
                stackType: 'Reporting',
                outputs: [
                  {
                    OutputKey: 'aaaaaaa' + OUTPUT_REPORT_DASHBOARDS_SUFFIX,
                    OutputValue: `[{
                      "appId": "${MOCK_APP_ID}",
                      "dashboardId": "builtin-dashboard"
                    }]`,
                  },
                ],
              },
            ],
          },
        },
      ],
    });

    ddbMock.on(GetCommand).resolves({
      Item: {
        region: 'us-east-1',
      },
    });

    ddbMock.on(DeleteCommand).resolves({});

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
      .delete(`/api/project/${MOCK_PROJECT_ID}/${MOCK_APP_ID}/dashboard/${MOCK_DASHBOARD_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
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

