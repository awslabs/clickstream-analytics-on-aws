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

import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { CreateAnalysisCommand, CreateDashboardCommand, DescribeDashboardDefinitionCommand, QuickSightClient, UpdateAnalysisCommand, UpdateDashboardCommand, UpdateDashboardPublishedVersionCommand } from '@aws-sdk/client-quicksight';
import { BatchExecuteStatementCommand, RedshiftDataClient } from '@aws-sdk/client-redshift-data';
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import { tokenMock } from './ddb-mock';
import { app, server } from '../../index';
import 'aws-sdk-client-mock-jest';

const ddbMock = mockClient(DynamoDBDocumentClient);
const cloudFormationMock = mockClient(CloudFormationClient);
const quickSightMock = mockClient(QuickSightClient);
const stsClientMock = mockClient(STSClient);
const redshiftClientMock = mockClient(RedshiftDataClient);

const dashboardDef =
  {
    DataSetIdentifierDeclarations: [],
    Sheets: [
      {
        SheetId: 'f43cdc10-0f41-4ad1-bd42-deb0f6dbeb64',
        Name: 'sheet1',
        FilterControls: [],
        Visuals: [],
        Layouts: [
          {
            Configuration: {
              GridLayout: {
                Elements: [],
                CanvasSizeOptions: {
                  ScreenCanvasSizeOptions: {
                    ResizeOption: 'FIXED',
                    OptimizedViewPortWidth: '1600px',
                  },
                },
              },
            },
          },
        ],
        ContentType: 'INTERACTIVE',
      },
    ],
    CalculatedFields: [],
    ParameterDeclarations: [],
    FilterGroups: [],
    AnalysisDefaults: {
      DefaultNewSheetConfiguration: {
        InteractiveLayoutConfiguration: {
          Grid: {
            CanvasSizeOptions: {
              ScreenCanvasSizeOptions: {
                ResizeOption: 'FIXED',
                OptimizedViewPortWidth: '1600px',
              },
            },
          },
        },
        SheetContentType: 'INTERACTIVE',
      },
    },
  };

describe('reporting test', () => {
  beforeEach(() => {
    ddbMock.reset();
    cloudFormationMock.reset();
    quickSightMock.reset();
    redshiftClientMock.reset();
    stsClientMock.reset();
  });

  it('funnel visual - preview', async () => {
    tokenMock(ddbMock, false);
    stsClientMock.on(AssumeRoleCommand).resolves({
      Credentials: {
        AccessKeyId: '1111',
        SecretAccessKey: '22222',
        SessionToken: '33333',
        Expiration: new Date(),
      },
    });

    redshiftClientMock.on(BatchExecuteStatementCommand).resolves({
    });

    quickSightMock.on(CreateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:analysis/analysisaaaaaaaa',
    });
    quickSightMock.on(CreateDashboardCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa',
      VersionArn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa/1',
    });

    const res = await request(app)
      .post('/api/reporting/funnel')
      .send({
        action: 'PREVIEW',
        viewName: 'testview0002',
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_CNT',
        specifyJoinColumn: true,
        joinColumn: 'user_pseudo_id',
        conversionIntervalType: 'CUSTOMIZE',
        conversionIntervalInSeconds: 7200,
        eventAndConditions: [{
          eventName: 'add_button_click',
        },
        {
          eventName: 'note_share',
        },
        {
          eventName: 'note_export',
        }],
        timeScopeType: 'RELATIVE',
        lastN: 4,
        timeUnit: 'WK',
        groupColumn: 'week',
        dashboardCreateParameters: {
          region: 'us-east-1',
          quickSight: {
            principal: 'arn:aws:quicksight:us-east-1:11111:user/default/testuser',
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
            redshiftUser: 'test_redshift_user',
          },
          redshift: {
            dataApiRole: 'arn:aws:iam::11111111:role/test_api_role',
            newServerless: {
              workgroupName: 'clickstream-project01-wvzh',
            },
          },
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toEqual(true);
    expect(res.body.data.dashboardArn).toEqual('arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa');
    expect(res.body.data.dashboardName).toEqual('dashboard-testview0002');
    expect(res.body.data.analysisArn).toEqual('arn:aws:quicksight:us-east-1:11111111:analysis/analysisaaaaaaaa');
    expect(res.body.data.analysisName).toEqual('analysis-testview0002');
    expect(res.body.data.analysisId).toBeDefined();
    expect(res.body.data.dashboardId).toBeDefined();
    expect(res.body.data.visualIds).toBeDefined();
    expect(res.body.data.visualIds.length).toEqual(2);

  });

  it('funnel visual - publish', async () => {
    tokenMock(ddbMock, false);
    stsClientMock.on(AssumeRoleCommand).resolves({
      Credentials: {
        AccessKeyId: '1111',
        SecretAccessKey: '22222',
        SessionToken: '33333',
        Expiration: new Date(),
      },
    });

    redshiftClientMock.on(BatchExecuteStatementCommand).resolves({
    });

    quickSightMock.on(DescribeDashboardDefinitionCommand).resolves({
      Definition: dashboardDef,
    });

    quickSightMock.on(UpdateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:analysis/analysis-aaaaaaaa',
    });

    quickSightMock.on(UpdateDashboardCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa',
      VersionArn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa/1',
    });

    quickSightMock.on(UpdateDashboardPublishedVersionCommand).resolves({
      DashboardId: 'dashboard-aaaaaaaa',
    });

    const res = await request(app)
      .post('/api/reporting/funnel')
      .send({
        action: 'PUBLISH',
        viewName: 'testview00022',
        projectId: 'project01_wvzh',
        pipelineId: '87ea3d080cc34bb398275a27f4e8b113',
        appId: 'app1',
        sheetName: 'sheet99',
        sheetId: 'a410f75d-48d7-4699-83b8-283fce0f8f31',
        analysisId: 'analysis4e448d67-7c0d-4251-9f0f-45dc2c8dcb09',
        analysisName: 'analysis-testview0004',
        dashboardId: 'dashboard-37933899-0bb6-4e89-bced-cd8b17d3c160',
        dashboardName: 'dashboard-testview0003',
        computeMethod: 'USER_CNT',
        specifyJoinColumn: true,
        joinColumn: 'user_pseudo_id',
        conversionIntervalType: 'CUSTOMIZE',
        conversionIntervalInSeconds: 7200,
        eventAndConditions: [{
          eventName: 'add_button_click',
        },
        {
          eventName: 'note_share',
        },
        {
          eventName: 'note_export',
        }],
        timeScopeType: 'FIXED',
        timeStart: new Date('2023-06-30'),
        timeEnd: new Date('2023-08-30'),
        groupColumn: 'week',
        dashboardCreateParameters: {
          region: 'us-east-1',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
          redshift: {
            dataApiRole: 'arn:aws:iam::11111111:role/test_api_role',
            newServerless: {
              workgroupName: 'clickstream-project01-wvzh',
            },
          },
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toEqual(true);
    expect(res.body.data.dashboardArn).toEqual('arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa');
    expect(res.body.data.dashboardName).toEqual('dashboard-testview0003');
    expect(res.body.data.analysisArn).toEqual('arn:aws:quicksight:us-east-1:11111111:analysis/analysis-aaaaaaaa');
    expect(res.body.data.analysisName).toEqual('analysis-testview0004');
    expect(res.body.data.analysisId).toBeDefined();
    expect(res.body.data.visualIds).toBeDefined();
    expect(res.body.data.visualIds.length).toEqual(2);
  });

  it('event visual - preview', async () => {
    tokenMock(ddbMock, false);
    stsClientMock.on(AssumeRoleCommand).resolves({
      Credentials: {
        AccessKeyId: '1111',
        SecretAccessKey: '22222',
        SessionToken: '33333',
        Expiration: new Date(),
      },
    });

    redshiftClientMock.on(BatchExecuteStatementCommand).resolves({
    });

    quickSightMock.on(CreateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:analysis/analysisaaaaaaaa',
    });
    quickSightMock.on(CreateDashboardCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa',
      VersionArn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa/1',
    });

    const res = await request(app)
      .post('/api/reporting/event')
      .send({
        action: 'PREVIEW',
        viewName: 'testview0002',
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_CNT',
        specifyJoinColumn: true,
        joinColumn: 'user_pseudo_id',
        conversionIntervalType: 'CUSTOMIZE',
        conversionIntervalInSeconds: 7200,
        eventAndConditions: [{
          eventName: 'add_button_click',
        },
        {
          eventName: 'note_share',
        },
        {
          eventName: 'note_export',
        }],
        timeScopeType: 'RELATIVE',
        lastN: 4,
        timeUnit: 'WK',
        groupColumn: 'week',
        dashboardCreateParameters: {
          region: 'us-east-1',
          quickSight: {
            principal: 'arn:aws:quicksight:us-east-1:11111:user/default/testuser',
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
            redshiftUser: 'test_redshift_user',
          },
          redshift: {
            dataApiRole: 'arn:aws:iam::11111111:role/test_api_role',
            newServerless: {
              workgroupName: 'clickstream-project01-wvzh',
            },
          },
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toEqual(true);
    expect(res.body.data.dashboardArn).toEqual('arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa');
    expect(res.body.data.dashboardName).toEqual('dashboard-testview0002');
    expect(res.body.data.analysisArn).toEqual('arn:aws:quicksight:us-east-1:11111111:analysis/analysisaaaaaaaa');
    expect(res.body.data.analysisName).toEqual('analysis-testview0002');
    expect(res.body.data.analysisId).toBeDefined();
    expect(res.body.data.dashboardId).toBeDefined();
    expect(res.body.data.visualIds).toBeDefined();
    expect(res.body.data.visualIds.length).toEqual(2);

  });

  it('event visual - publish', async () => {
    tokenMock(ddbMock, false);
    stsClientMock.on(AssumeRoleCommand).resolves({
      Credentials: {
        AccessKeyId: '1111',
        SecretAccessKey: '22222',
        SessionToken: '33333',
        Expiration: new Date(),
      },
    });

    redshiftClientMock.on(BatchExecuteStatementCommand).resolves({
    });

    quickSightMock.on(DescribeDashboardDefinitionCommand).resolves({
      Definition: dashboardDef,
    });

    quickSightMock.on(UpdateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:analysis/analysis-aaaaaaaa',
    });

    quickSightMock.on(UpdateDashboardCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa',
      VersionArn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa/1',
    });

    quickSightMock.on(UpdateDashboardPublishedVersionCommand).resolves({
      DashboardId: 'dashboard-aaaaaaaa',
    });

    const res = await request(app)
      .post('/api/reporting/event')
      .send({
        action: 'PUBLISH',
        viewName: 'testview00022',
        projectId: 'project01_wvzh',
        pipelineId: '87ea3d080cc34bb398275a27f4e8b113',
        appId: 'app1',
        sheetName: 'sheet99',
        sheetId: 'a410f75d-48d7-4699-83b8-283fce0f8f31',
        analysisId: 'analysis4e448d67-7c0d-4251-9f0f-45dc2c8dcb09',
        analysisName: 'analysis-testview0004',
        dashboardId: 'dashboard-37933899-0bb6-4e89-bced-cd8b17d3c160',
        dashboardName: 'dashboard-testview0003',
        computeMethod: 'USER_CNT',
        specifyJoinColumn: true,
        joinColumn: 'user_pseudo_id',
        conversionIntervalType: 'CUSTOMIZE',
        conversionIntervalInSeconds: 7200,
        eventAndConditions: [{
          eventName: 'add_button_click',
        },
        {
          eventName: 'note_share',
        },
        {
          eventName: 'note_export',
        }],
        timeScopeType: 'FIXED',
        timeStart: new Date('2023-06-30'),
        timeEnd: new Date('2023-08-30'),
        groupColumn: 'week',
        dashboardCreateParameters: {
          region: 'us-east-1',
          quickSight: {
            principal: 'arn:aws:quicksight:us-east-1:11111:user/default/testuser',
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
            redshiftUser: 'test_redshift_user',
          },
          redshift: {
            dataApiRole: 'arn:aws:iam::11111111:role/test_api_role',
            newServerless: {
              workgroupName: 'clickstream-project01-wvzh',
            },
          },
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toEqual(true);
    expect(res.body.data.dashboardArn).toEqual('arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa');
    expect(res.body.data.dashboardName).toEqual('dashboard-testview0003');
    expect(res.body.data.analysisArn).toEqual('arn:aws:quicksight:us-east-1:11111111:analysis/analysis-aaaaaaaa');
    expect(res.body.data.analysisName).toEqual('analysis-testview0004');
    expect(res.body.data.analysisId).toBeDefined();
    expect(res.body.data.visualIds).toBeDefined();
    expect(res.body.data.visualIds.length).toEqual(2);
  });

  afterAll((done) => {
    server.close();
    done();
  });
});