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

import { AttributionModelType, ConditionCategory, ExploreAnalyticsOperators, ExploreAttributionTimeWindowType, ExploreComputeMethod, ExploreLocales, ExplorePathNodeType, ExplorePathSessionDef, MetadataPlatform, MetadataValueType, QuickSightChartType } from '@aws/clickstream-base-lib';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import {
  CreateAnalysisCommand,
  CreateDashboardCommand,
  DeleteAnalysisCommand,
  DeleteDashboardCommand,
  DeleteDataSetCommand,
  DescribeDashboardDefinitionCommand,
  ListAnalysesCommand,
  ListDashboardsCommand,
  ListDataSetsCommand,
  QuickSightClient,
  UpdateAnalysisCommand,
  UpdateDashboardCommand,
  UpdateDashboardPublishedVersionCommand,
  GenerateEmbedUrlForRegisteredUserCommand,
  ThrottlingException,
  CreateDataSetCommand,
  ResizeOption,
  SheetContentType,
  DescribeDashboardCommand,
  ResourceStatus,
  DescribeAnalysisCommand,
  DeleteUserCommand,
} from '@aws-sdk/client-quicksight';
import { BatchExecuteStatementCommand, DescribeStatementCommand, RedshiftDataClient, StatusString } from '@aws-sdk/client-redshift-data';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import { MOCK_TOKEN, quickSightUserMock, tokenMock } from './ddb-mock';
import { KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW } from './pipeline-mock';
import { clickStreamTableName } from '../../common/constants';
import { app, server } from '../../index';
import 'aws-sdk-client-mock-jest';
import { EventAndCondition, PairEventAndCondition, SQLCondition, buildRetentionAnalysisView } from '../../service/quicksight/sql-builder';

const ddbMock = mockClient(DynamoDBDocumentClient);
const cloudFormationMock = mockClient(CloudFormationClient);
const quickSightMock = mockClient(QuickSightClient);
const redshiftClientMock = mockClient(RedshiftDataClient);

jest.mock('../../service/quicksight/sql-builder', () => ({
  ...jest.requireActual('../../service/quicksight/sql-builder'),
  buildRetentionAnalysisView: jest.fn((_sqlParameters) => {
    return '';
  }),
}));

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
                    ResizeOption: ResizeOption.FIXED,
                    OptimizedViewPortWidth: '1600px',
                  },
                },
              },
            },
          },
        ],
        ContentType: SheetContentType.INTERACTIVE,
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
                ResizeOption: ResizeOption.FIXED,
                OptimizedViewPortWidth: '1600px',
              },
            },
          },
        },
        SheetContentType: SheetContentType.INTERACTIVE,
      },
    },
  };

describe('reporting test', () => {
  beforeEach(() => {
    ddbMock.reset();
    cloudFormationMock.reset();
    quickSightMock.reset();
    redshiftClientMock.reset();
    tokenMock(ddbMock, false);
    quickSightUserMock(ddbMock, false);

    ddbMock.on(QueryCommand).resolves({
      Items: [{
        ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW,
        timezone: [
          {
            timezone: 'Asia/Singapore',
            appId: 'app1',
          },
        ],
      }],
    });
  });

  it('funnel bar visual - preview', async () => {
    quickSightMock.on(CreateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:analysis/analysisaaaaaaaa',
    });
    quickSightMock.on(CreateDashboardCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa',
      VersionArn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa/1',
    });
    quickSightMock.on(GenerateEmbedUrlForRegisteredUserCommand).resolves({
      EmbedUrl: 'https://quicksight.aws.amazon.com/embed/4ui7xyvq73/studies/4a05631e-cbe6-477c-915d-1704aec9f101?isauthcode=true&identityprovider=quicksight&code=4a05631e-cbe6-477c-915d-1704aec9f101',
    });
    quickSightMock.on(DescribeDashboardCommand).resolvesOnce({
      Dashboard: {
        Version: {
          Status: ResourceStatus.CREATION_IN_PROGRESS,
        },
      },
    }).resolves({
      Dashboard: {
        Version: {
          Status: ResourceStatus.CREATION_SUCCESSFUL,
        },
      },
    });

    const res = await request(app)
      .post('/api/reporting/funnel')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PREVIEW',
        chartType: QuickSightChartType.BAR,
        viewName: 'testview0002',
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_ID_CNT',
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
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toEqual(true);
    expect(res.body.data.dashboardArn).toEqual('arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa');
    expect(res.body.data.dashboardName).toEqual('_tmp_testview0002');
    expect(res.body.data.analysisArn).toEqual('arn:aws:quicksight:us-east-1:11111111:analysis/analysisaaaaaaaa');
    expect(res.body.data.analysisName).toEqual('_tmp_testview0002');
    expect(res.body.data.analysisId).toBeDefined();
    expect(res.body.data.dashboardId).toBeDefined();
    expect(res.body.data.visualIds).toBeDefined();
    expect(res.body.data.visualIds.length).toEqual(2);
    expect(res.body.data.dashboardEmbedUrl).toEqual('https://quicksight.aws.amazon.com/embed/4ui7xyvq73/studies/4a05631e-cbe6-477c-915d-1704aec9f101?isauthcode=true&identityprovider=quicksight&code=4a05631e-cbe6-477c-915d-1704aec9f101');
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 2);
  });

  it('funnel visual - preview', async () => {
    quickSightMock.on(CreateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:analysis/analysisaaaaaaaa',
    });
    quickSightMock.on(CreateDashboardCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa',
      VersionArn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa/1',
    });
    quickSightMock.on(GenerateEmbedUrlForRegisteredUserCommand).resolves({
      EmbedUrl: 'https://quicksight.aws.amazon.com/embed/4ui7xyvq73/studies/4a05631e-cbe6-477c-915d-1704aec9f101?isauthcode=true&identityprovider=quicksight&code=4a05631e-cbe6-477c-915d-1704aec9f101',
    });
    quickSightMock.on(DescribeDashboardCommand).resolvesOnce({
      Dashboard: {
        Version: {
          Status: ResourceStatus.CREATION_IN_PROGRESS,
        },
      },
    }).resolves({
      Dashboard: {
        Version: {
          Status: ResourceStatus.CREATION_SUCCESSFUL,
        },
      },
    });

    const res = await request(app)
      .post('/api/reporting/funnel')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PREVIEW',

        locale: ExploreLocales.ZH_CN,
        chartType: QuickSightChartType.FUNNEL,
        viewName: 'testview0002',
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_ID_CNT',
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
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toEqual(true);
    expect(res.body.data.dashboardArn).toEqual('arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa');
    expect(res.body.data.dashboardName).toEqual('_tmp_testview0002');
    expect(res.body.data.analysisArn).toEqual('arn:aws:quicksight:us-east-1:11111111:analysis/analysisaaaaaaaa');
    expect(res.body.data.analysisName).toEqual('_tmp_testview0002');
    expect(res.body.data.analysisId).toBeDefined();
    expect(res.body.data.dashboardId).toBeDefined();
    expect(res.body.data.visualIds).toBeDefined();
    expect(res.body.data.visualIds.length).toEqual(2);
    expect(res.body.data.dashboardEmbedUrl).toEqual('https://quicksight.aws.amazon.com/embed/4ui7xyvq73/studies/4a05631e-cbe6-477c-915d-1704aec9f101?isauthcode=true&identityprovider=quicksight&code=4a05631e-cbe6-477c-915d-1704aec9f101');
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 2);
    expect(quickSightMock).toHaveReceivedCommandTimes(GenerateEmbedUrlForRegisteredUserCommand, 1);
  });

  it('funnel visual - preview - resources create failed', async () => {
    redshiftClientMock.on(BatchExecuteStatementCommand).resolves({
    });
    redshiftClientMock.on(DescribeStatementCommand).resolves({
      Status: StatusString.FINISHED,
    });

    redshiftClientMock.on(DescribeStatementCommand).resolves({
      Status: StatusString.FINISHED,
    });

    quickSightMock.on(CreateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:analysis/analysisaaaaaaaa',
    });
    quickSightMock.on(CreateDashboardCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa',
      VersionArn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa/1',
    });
    quickSightMock.on(GenerateEmbedUrlForRegisteredUserCommand).resolves({
      EmbedUrl: 'https://quicksight.aws.amazon.com/embed/4ui7xyvq73/studies/4a05631e-cbe6-477c-915d-1704aec9f101?isauthcode=true&identityprovider=quicksight&code=4a05631e-cbe6-477c-915d-1704aec9f101',
    });
    quickSightMock.on(DescribeDashboardCommand).resolvesOnce({
      Dashboard: {
        Version: {
          Status: ResourceStatus.CREATION_IN_PROGRESS,
        },
      },
    }).resolves({
      Dashboard: {
        Version: {
          Status: ResourceStatus.CREATION_FAILED,
        },
      },
    });

    const res = await request(app)
      .post('/api/reporting/funnel')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PREVIEW',

        locale: ExploreLocales.ZH_CN,
        chartType: QuickSightChartType.FUNNEL,
        viewName: 'testview0002',
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_ID_CNT',
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
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);
    expect(res.body.success).toEqual(false);
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 2);
    expect(quickSightMock).toHaveReceivedCommandTimes(GenerateEmbedUrlForRegisteredUserCommand, 0);
  });

  it('funnel visual - publish', async () => {
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
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PUBLISH',

        locale: ExploreLocales.ZH_CN,
        chartTitle: 'test-title',
        chartSubTitle: 'test-subtitle',
        chartType: QuickSightChartType.FUNNEL,
        viewName: 'testview00022',
        projectId: 'project01_wvzh',
        pipelineId: '87ea3d080cc34bb398275a27f4e8b113',
        appId: 'app1',
        sheetId: 'a410f75d-48d7-4699-83b8-283fce0f8f31',
        analysisId: 'analysis4e448d67-7c0d-4251-9f0f-45dc2c8dcb09',
        analysisName: 'analysis-aaaa',
        dashboardId: 'dashboard-37933899-0bb6-4e89-bced-cd8b17d3c160',
        computeMethod: 'USER_ID_CNT',
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
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toEqual(true);
    expect(res.body.data.dashboardArn).toEqual('arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa');
    expect(res.body.data.analysisArn).toEqual('');
    expect(res.body.data.analysisId).toBeDefined();
    expect(res.body.data.visualIds).toBeDefined();
    expect(res.body.data.dashboardVersion).toBeDefined();
    expect(res.body.data.dashboardEmbedUrl).toEqual('');
    expect(res.body.data.visualIds.length).toEqual(2);
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 0);
  });

  it('funnel visual - XSS check', async () => {
    const res = await request(app)
      .post('/api/reporting/funnel')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PREVIEW',

        locale: ExploreLocales.ZH_CN,
        chartType: QuickSightChartType.FUNNEL,
        viewName: 'testview0002',
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_ID_CNT',
        specifyJoinColumn: true,
        joinColumn: 'user_pseudo_id',
        conversionIntervalType: 'CUSTOMIZE',
        conversionIntervalInSeconds: 7200,
        eventAndConditions: [{
          eventName: '<script>alert(1)</script>',
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
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toEqual('Parameter verification failed.');
  });

  it('event visual - preview', async () => {
    quickSightMock.on(CreateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:analysis/analysisaaaaaaaa',
    });
    quickSightMock.on(CreateDashboardCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa',
      VersionArn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa/1',
    });
    quickSightMock.on(GenerateEmbedUrlForRegisteredUserCommand).resolves({
      EmbedUrl: 'https://quicksight.aws.amazon.com/embed/4ui7xyvq73/studies/4a05631e-cbe6-477c-915d-1704aec9f101?isauthcode=true&identityprovider=quicksight&code=4a05631e-cbe6-477c-915d-1704aec9f101',
    });
    quickSightMock.on(DescribeDashboardCommand).resolvesOnce({
      Dashboard: {
        Version: {
          Status: ResourceStatus.CREATION_IN_PROGRESS,
        },
      },
    }).resolves({
      Dashboard: {
        Version: {
          Status: ResourceStatus.CREATION_SUCCESSFUL,
        },
      },
    });

    const res = await request(app)
      .post('/api/reporting/event')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PREVIEW',

        locale: ExploreLocales.ZH_CN,
        chartType: QuickSightChartType.LINE,
        viewName: 'testview0002',
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_ID_CNT',
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
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toEqual(true);
    expect(res.body.data.dashboardArn).toEqual('arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa');
    expect(res.body.data.dashboardName).toEqual('_tmp_testview0002');
    expect(res.body.data.analysisArn).toEqual('arn:aws:quicksight:us-east-1:11111111:analysis/analysisaaaaaaaa');
    expect(res.body.data.analysisName).toEqual('_tmp_testview0002');
    expect(res.body.data.analysisId).toBeDefined();
    expect(res.body.data.dashboardId).toBeDefined();
    expect(res.body.data.visualIds).toBeDefined();
    expect(res.body.data.visualIds.length).toEqual(2);
    expect(res.body.data.dashboardEmbedUrl).toEqual('https://quicksight.aws.amazon.com/embed/4ui7xyvq73/studies/4a05631e-cbe6-477c-915d-1704aec9f101?isauthcode=true&identityprovider=quicksight&code=4a05631e-cbe6-477c-915d-1704aec9f101');
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 2);
  });

  it('event visual - preview - twice request with string group condition', async () => {
    quickSightMock.on(CreateDataSetCommand).callsFake(input => {
      expect(
        input.PhysicalTableMap.PhyTable1.CustomSql.Columns.length === 4,
      ).toBeTruthy();
    });
    quickSightMock.on(CreateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:analysis/analysisaaaaaaaa',
    });
    quickSightMock.on(CreateDashboardCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa',
      VersionArn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa/1',
    });
    quickSightMock.on(GenerateEmbedUrlForRegisteredUserCommand).resolves({
      EmbedUrl: 'https://quicksight.aws.amazon.com/embed/4ui7xyvq73/studies/4a05631e-cbe6-477c-915d-1704aec9f101?isauthcode=true&identityprovider=quicksight&code=4a05631e-cbe6-477c-915d-1704aec9f101',
    });
    quickSightMock.on(DescribeDashboardCommand).resolvesOnce({
      Dashboard: {
        Version: {
          Status: ResourceStatus.CREATION_IN_PROGRESS,
        },
      },
    }).resolves({
      Dashboard: {
        Version: {
          Status: ResourceStatus.CREATION_SUCCESSFUL,
        },
      },
    });

    ddbMock.on(GetCommand, {
      TableName: clickStreamTableName,
      Key: {
        id: MOCK_TOKEN,
        type: 'REQUESTID',
      },
    }, true).resolves({});

    const requestBody = {
      action: 'PREVIEW',

      locale: ExploreLocales.ZH_CN,
      chartType: QuickSightChartType.LINE,
      viewName: 'testview0002',
      projectId: 'project01_wvzh',
      pipelineId: 'pipeline-1111111',
      appId: 'app1',
      sheetName: 'sheet99',
      computeMethod: 'USER_ID_CNT',
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
      groupCondition: {
        category: ConditionCategory.EVENT_OUTER,
        property: 'platform',
        dataType: MetadataValueType.STRING,
      },
      dashboardCreateParameters: {
        region: 'us-east-1',
        allowedDomain: 'https://example.com',
        quickSight: {
          dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
        },
      },
    };
    const res = await request(app)
      .post('/api/reporting/event')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send(requestBody);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toEqual(true);

    const res2 = await request(app)
      .post('/api/reporting/event')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send(requestBody);
    expect(res2.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res2.statusCode).toBe(201);
    expect(res2.body.success).toEqual(true);
    expect(quickSightMock).toHaveReceivedNthSpecificCommandWith(2, CreateDataSetCommand, {});
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 3);
  });

  it('event visual - preview - twice request with boolean group condition', async () => {
    quickSightMock.on(CreateDataSetCommand).callsFake(input => {
      expect(
        input.PhysicalTableMap.PhyTable1.CustomSql.Columns.length === 4,
      ).toBeTruthy();
    });
    quickSightMock.on(CreateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:analysis/analysisaaaaaaaa',
    });
    quickSightMock.on(CreateDashboardCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa',
      VersionArn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa/1',
    });
    quickSightMock.on(GenerateEmbedUrlForRegisteredUserCommand).resolves({
      EmbedUrl: 'https://quicksight.aws.amazon.com/embed/4ui7xyvq73/studies/4a05631e-cbe6-477c-915d-1704aec9f101?isauthcode=true&identityprovider=quicksight&code=4a05631e-cbe6-477c-915d-1704aec9f101',
    });
    quickSightMock.on(DescribeDashboardCommand).resolvesOnce({
      Dashboard: {
        Version: {
          Status: ResourceStatus.CREATION_IN_PROGRESS,
        },
      },
    }).resolves({
      Dashboard: {
        Version: {
          Status: ResourceStatus.CREATION_SUCCESSFUL,
        },
      },
    });

    ddbMock.on(GetCommand, {
      TableName: clickStreamTableName,
      Key: {
        id: MOCK_TOKEN,
        type: 'REQUESTID',
      },
    }, true).resolves({});

    const requestBody = {
      action: 'PREVIEW',

      locale: ExploreLocales.ZH_CN,
      chartType: QuickSightChartType.LINE,
      viewName: 'testview0002',
      projectId: 'project01_wvzh',
      pipelineId: 'pipeline-1111111',
      appId: 'app1',
      sheetName: 'sheet99',
      computeMethod: 'USER_ID_CNT',
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
      groupCondition: {
        category: ConditionCategory.EVENT_OUTER,
        property: 'screen_view_entrances',
        dataType: MetadataValueType.BOOLEAN,
      },
      dashboardCreateParameters: {
        region: 'us-east-1',
        allowedDomain: 'https://example.com',
        quickSight: {
          dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
        },
      },
    };
    const res = await request(app)
      .post('/api/reporting/event')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send(requestBody);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toEqual(true);

    const res2 = await request(app)
      .post('/api/reporting/event')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send(requestBody);
    expect(res2.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res2.statusCode).toBe(201);
    expect(res2.body.success).toEqual(true);
    expect(quickSightMock).toHaveReceivedNthSpecificCommandWith(2, CreateDataSetCommand, {});
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 3);
  });

  it('event visual - publish', async () => {
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
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PUBLISH',

        locale: ExploreLocales.EN_US,
        chartTitle: 'test-title',
        chartSubTitle: 'test-subtitle',
        chartType: QuickSightChartType.LINE,
        viewName: 'testview00022',
        projectId: 'project01_wvzh',
        pipelineId: '87ea3d080cc34bb398275a27f4e8b113',
        appId: 'app1',
        sheetName: 'sheet99',
        sheetId: 'a410f75d-48d7-4699-83b8-283fce0f8f31',
        analysisId: 'analysis4e448d67-7c0d-4251-9f0f-45dc2c8dcb09',
        analysisName: 'analysis-testview0004',
        dashboardId: 'dashboard-37933899-0bb6-4e89-bced-cd8b17d3c160',
        computeMethod: 'USER_ID_CNT',
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
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toEqual(true);
    expect(res.body.data.dashboardArn).toEqual('arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa');
    expect(res.body.data.analysisArn).toEqual('');
    expect(res.body.data.analysisName).toEqual('analysis-testview0004');
    expect(res.body.data.analysisId).toBeDefined();
    expect(res.body.data.visualIds).toBeDefined();
    expect(res.body.data.visualIds.length).toEqual(2);
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 0);
  });

  it('path visual - preview', async () => {
    quickSightMock.on(CreateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:analysis/analysisaaaaaaaa',
    });
    quickSightMock.on(CreateDashboardCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa',
      VersionArn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa/1',
    });
    quickSightMock.on(GenerateEmbedUrlForRegisteredUserCommand).resolves({
      EmbedUrl: 'https://quicksight.aws.amazon.com/embed/4ui7xyvq73/studies/4a05631e-cbe6-477c-915d-1704aec9f101?isauthcode=true&identityprovider=quicksight&code=4a05631e-cbe6-477c-915d-1704aec9f101',
    });
    quickSightMock.on(DescribeDashboardCommand).resolvesOnce({
      Dashboard: {
        Version: {
          Status: ResourceStatus.CREATION_IN_PROGRESS,
        },
      },
    }).resolves({
      Dashboard: {
        Version: {
          Status: ResourceStatus.CREATION_SUCCESSFUL,
        },
      },
    });

    const res = await request(app)
      .post('/api/reporting/path')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PREVIEW',

        viewName: 'testview0002',
        chartType: QuickSightChartType.SANKEY,
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_ID_CNT',
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
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
        pathAnalysis: {
          sessionType: ExplorePathSessionDef.SESSION,
          nodeType: ExplorePathNodeType.EVENT,
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toEqual(true);
    expect(res.body.data.dashboardArn).toEqual('arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa');
    expect(res.body.data.dashboardName).toEqual('_tmp_testview0002');
    expect(res.body.data.analysisArn).toEqual('arn:aws:quicksight:us-east-1:11111111:analysis/analysisaaaaaaaa');
    expect(res.body.data.analysisName).toEqual('_tmp_testview0002');
    expect(res.body.data.analysisId).toBeDefined();
    expect(res.body.data.dashboardId).toBeDefined();
    expect(res.body.data.visualIds).toBeDefined();
    expect(res.body.data.visualIds.length).toEqual(1);
    expect(res.body.data.dashboardEmbedUrl).toEqual('https://quicksight.aws.amazon.com/embed/4ui7xyvq73/studies/4a05631e-cbe6-477c-915d-1704aec9f101?isauthcode=true&identityprovider=quicksight&code=4a05631e-cbe6-477c-915d-1704aec9f101');
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 2);
  });

  it('path visual - publish', async () => {
    quickSightMock.on(DescribeDashboardDefinitionCommand).resolves({
      Definition: dashboardDef,
      Name: 'dashboard-test',
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

    quickSightMock.on(DescribeAnalysisCommand).resolves({
      Analysis: {
        Name: 'test-analysis',
      },
    });

    const res = await request(app)
      .post('/api/reporting/path')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PUBLISH',

        locale: ExploreLocales.EN_US,
        chartTitle: 'test-title',
        chartType: QuickSightChartType.SANKEY,
        chartSubTitle: 'test-subtitle',
        viewName: 'testview0002',
        sheetId: 'a410f75d-48d7-4699-83b8-283fce0f8f31',
        dashboardId: 'dashboard-37933899-0bb6-4e89-bced-cd8b17d3c160',
        analysisId: 'analysis4e448d67-7c0d-4251-9f0f-45dc2c8dcb09',
        analysisName: 'analysis-testview0004',
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        computeMethod: 'USER_ID_CNT',
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
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
        pathAnalysis: {
          platform: MetadataPlatform.ANDROID,
          sessionType: ExplorePathSessionDef.SESSION,
          nodeType: ExplorePathNodeType.SCREEN_NAME,
          nodes: ['NotepadActivity', 'NotepadExportActivity', 'NotepadShareActivity', 'NotepadPrintActivity'],
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toEqual(true);
    expect(res.body.data.dashboardArn).toEqual('arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa');
    expect(res.body.data.analysisArn).toEqual('');
    expect(res.body.data.analysisId).toBeDefined();
    expect(res.body.data.dashboardId).toBeDefined();
    expect(res.body.data.visualIds).toBeDefined();
    expect(res.body.data.visualIds.length).toEqual(1);
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 0);

  });

  it('retention visual - publish', async () => {
    quickSightMock.on(DescribeDashboardDefinitionCommand).resolves({
      Definition: dashboardDef,
      Name: 'dashboard-test',
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
    quickSightMock.on(DescribeAnalysisCommand).resolves({
      Analysis: {
        Name: 'test-analysis',
      },
    });

    const res = await request(app)
      .post('/api/reporting/retention')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PUBLISH',

        locale: ExploreLocales.EN_US,
        chartTitle: 'test-title',
        chartSubTitle: 'test-subtitle',
        chartType: QuickSightChartType.LINE,
        viewName: 'testview0002',
        sheetId: 'a410f75d-48d7-4699-83b8-283fce0f8f31',
        dashboardId: 'dashboard-37933899-0bb6-4e89-bced-cd8b17d3c160',
        analysisId: 'analysis4e448d67-7c0d-4251-9f0f-45dc2c8dcb09',
        analysisName: 'analysis-aaaa',
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        computeMethod: 'USER_ID_CNT',
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
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
        pairEventAndConditions: [
          {
            startEvent: {
              eventName: 'add_button_click',
            },
            backEvent: {
              eventName: 'note_share',
            },
          },
          {
            startEvent: {
              eventName: 'add_button_click',
            },
            backEvent: {
              eventName: 'note_export',
            },
          },
        ],
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toEqual(true);
    expect(res.body.data.dashboardArn).toEqual('arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa');
    expect(res.body.data.analysisArn).toEqual('');
    expect(res.body.data.analysisId).toBeDefined();
    expect(res.body.data.dashboardId).toBeDefined();
    expect(res.body.data.visualIds).toBeDefined();
    expect(res.body.data.visualIds.length).toEqual(2);
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 0);

  });

  it('attribution visual - preview', async () => {
    quickSightMock.on(CreateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:analysis/analysisaaaaaaaa',
    });
    quickSightMock.on(CreateDashboardCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa',
      VersionArn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa/1',
    });
    quickSightMock.on(GenerateEmbedUrlForRegisteredUserCommand).resolves({
      EmbedUrl: 'https://quicksight.aws.amazon.com/embed/4ui7xyvq73/studies/4a05631e-cbe6-477c-915d-1704aec9f101?isauthcode=true&identityprovider=quicksight&code=4a05631e-cbe6-477c-915d-1704aec9f101',
    });
    quickSightMock.on(DescribeDashboardCommand).resolvesOnce({
      Dashboard: {
        Version: {
          Status: ResourceStatus.CREATION_IN_PROGRESS,
        },
      },
    }).resolves({
      Dashboard: {
        Version: {
          Status: ResourceStatus.CREATION_SUCCESSFUL,
        },
      },
    });

    const res = await request(app)
      .post('/api/reporting/attribution')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PREVIEW',

        locale: 'zh-CN',
        projectId: 'shop_11111',
        pipelineId: '0f51e904d3444cf2bd21bb423442ba6c',
        chartTitle: '归因分析',
        chartSubTitle: '详细-subtitle',
        appId: 'shop',
        sheetName: 'Sheet 1',
        viewName: 'attribution_view_11122',
        dashboardCreateParameters:
        {
          region: 'us-east-1',
          allowedDomain: 'http://localhost:7777',
          redshift:
            {
              user: 'clickstream_222222222',
              dataApiRole: 'arn:aws:iam::111111111:role/Clickstream-DataModelingR-RedshiftServerelssWorkgro-1111111111',
              newServerless:
                {
                  workgroupName: 'clickstream-shop_111111',
                },
            },
          quickSight:
            {
              dataSourceArn: 'arn:aws:quicksight:us-east-1:111111111:datasource/clickstream_datasource_shop_1111111111',
            },
        },
        computeMethod: ExploreComputeMethod.EVENT_CNT,
        globalEventCondition:
        {
          conditions:
            [
              {
                category: 'OTHER',
                property: 'platform',
                operator: '=',
                value:
                    [
                      'Android',
                    ],
                dataType: 'string',
              },
              {
                category: 'GEO',
                property: 'country',
                operator: '=',
                value:
                    [
                      'China',
                    ],
                dataType: 'string',
              },
            ],
        },
        targetEventAndCondition:
        {
          eventName: 'purchase',
          sqlCondition:
            {
              conditionOperator: 'and',
              conditions:
                [
                  {
                    category: 'OTHER',
                    property: 'platform',
                    operator: '=',
                    value:
                        [
                          'Android',
                        ],
                    dataType: 'string',
                  },
                  {
                    category: 'GEO',
                    property: 'country',
                    operator: '=',
                    value:
                        [
                          'China',
                        ],
                    dataType: 'string',
                  },
                  {
                    category: 'EVENT',
                    property: '_session_duration',
                    operator: '>',
                    value:
                        [
                          10,
                        ],
                    dataType: 'int',
                  },
                  {
                    category: 'USER_OUTER',
                    property: '_channel',
                    operator: '<>',
                    value:
                        [
                          'google',
                        ],
                    dataType: 'string',
                  },
                ],
            },
        },
        eventAndConditions:
        [
          {
            eventName: 'view_item',
            sqlCondition:
                {
                  conditionOperator: 'and',
                  conditions:
                    [
                      {
                        category: 'OTHER',
                        property: 'platform',
                        operator: '=',
                        value:
                            [
                              'Android',
                            ],
                        dataType: 'string',
                      },
                      {
                        category: 'GEO',
                        property: 'country',
                        operator: '=',
                        value:
                            [
                              'China',
                            ],
                        dataType: 'string',
                      },
                      {
                        category: 'EVENT',
                        property: '_session_duration',
                        operator: '>',
                        value:
                            [
                              10,
                            ],
                        dataType: 'int',
                      },
                    ],
                },
          },
          {
            eventName: 'add_to_cart',
            sqlCondition:
                {
                  conditionOperator: 'and',
                  conditions:
                    [
                      {
                        category: 'OTHER',
                        property: 'platform',
                        operator: '=',
                        value:
                            [
                              'Android',
                            ],
                        dataType: 'string',
                      },
                      {
                        category: 'GEO',
                        property: 'country',
                        operator: '=',
                        value:
                            [
                              'China',
                            ],
                        dataType: 'string',
                      },
                      {
                        category: 'USER',
                        property: '_user_first_touch_timestamp',
                        operator: '>',
                        value:
                            [
                              1686532526770,
                            ],
                        dataType: 'int',
                      },
                      {
                        category: 'EVENT',
                        property: '_session_duration',
                        operator: '>',
                        value:
                            [
                              200,
                            ],
                        dataType: 'int',
                      },
                    ],
                },
          },
        ],
        modelType: 'LAST_TOUCH',
        timeWindowType: ExploreAttributionTimeWindowType.CURRENT_DAY,
        timeScopeType: 'RELATIVE',
        lastN: 7,
        timeUnit: 'DD',
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toEqual(true);
    expect(res.body.data.dashboardArn).toEqual('arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa');
    expect(res.body.data.dashboardName).toEqual('_tmp_attribution_view_11122');
    expect(res.body.data.analysisArn).toEqual('arn:aws:quicksight:us-east-1:11111111:analysis/analysisaaaaaaaa');
    expect(res.body.data.analysisName).toEqual('_tmp_attribution_view_11122');
    expect(res.body.data.analysisId).toBeDefined();
    expect(res.body.data.dashboardId).toBeDefined();
    expect(res.body.data.visualIds).toBeDefined();
    expect(res.body.data.visualIds.length).toEqual(1);
    expect(res.body.data.dashboardEmbedUrl).toEqual('https://quicksight.aws.amazon.com/embed/4ui7xyvq73/studies/4a05631e-cbe6-477c-915d-1704aec9f101?isauthcode=true&identityprovider=quicksight&code=4a05631e-cbe6-477c-915d-1704aec9f101');
    expect(quickSightMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 2);
    expect(quickSightMock).toHaveReceivedCommandTimes(GenerateEmbedUrlForRegisteredUserCommand, 1);
  });

  it('attribution visual - publish', async () => {
    quickSightMock.on(DescribeDashboardDefinitionCommand).resolves({
      Definition: dashboardDef,
      Name: 'dashboard-test',
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
      .post('/api/reporting/attribution')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PUBLISH',

        locale: ExploreLocales.EN_US,
        chartTitle: 'attribution analysis',
        chartSubTitle: 'detail information',
        viewName: 'attribution_view_11122',
        sheetId: 'a410f75d-48d7-4699-83b8-283fce0f8f31',
        dashboardId: 'dashboard-37933899-0bb6-4e89-bced-cd8b17d3c160',
        analysisId: 'analysis4e448d67-7c0d-4251-9f0f-45dc2c8dcb09',
        analysisName: 'analysis-aaaa',
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        computeMethod: ExploreComputeMethod.EVENT_CNT,
        globalEventCondition:
        {
          conditions:
            [
              {
                category: 'OTHER',
                property: 'platform',
                operator: '=',
                value:
                    [
                      'Android',
                    ],
                dataType: 'string',
              },
              {
                category: 'GEO',
                property: 'country',
                operator: '=',
                value:
                    [
                      'China',
                    ],
                dataType: 'string',
              },
            ],
        },
        targetEventAndCondition:
        {
          eventName: 'purchase',
          sqlCondition:
            {
              conditionOperator: 'and',
              conditions:
                [
                  {
                    category: 'OTHER',
                    property: 'platform',
                    operator: '=',
                    value:
                        [
                          'Android',
                        ],
                    dataType: 'string',
                  },
                  {
                    category: 'GEO',
                    property: 'country',
                    operator: '=',
                    value:
                        [
                          'China',
                        ],
                    dataType: 'string',
                  },
                  {
                    category: 'EVENT',
                    property: '_session_duration',
                    operator: '>',
                    value:
                        [
                          10,
                        ],
                    dataType: 'int',
                  },
                  {
                    category: 'USER_OUTER',
                    property: '_channel',
                    operator: '<>',
                    value:
                        [
                          'google',
                        ],
                    dataType: 'string',
                  },
                ],
            },
        },
        eventAndConditions:
        [
          {
            eventName: 'view_item',
            sqlCondition:
                {
                  conditionOperator: 'and',
                  conditions:
                    [
                      {
                        category: 'OTHER',
                        property: 'platform',
                        operator: '=',
                        value:
                            [
                              'Android',
                            ],
                        dataType: 'string',
                      },
                      {
                        category: 'GEO',
                        property: 'country',
                        operator: '=',
                        value:
                            [
                              'China',
                            ],
                        dataType: 'string',
                      },
                      {
                        category: 'EVENT',
                        property: '_session_duration',
                        operator: '>',
                        value:
                            [
                              10,
                            ],
                        dataType: 'int',
                      },
                    ],
                },
          },
          {
            eventName: 'add_to_cart',
            sqlCondition:
                {
                  conditionOperator: 'and',
                  conditions:
                    [
                      {
                        category: 'OTHER',
                        property: 'platform',
                        operator: '=',
                        value:
                            [
                              'Android',
                            ],
                        dataType: 'string',
                      },
                      {
                        category: 'GEO',
                        property: 'country',
                        operator: '=',
                        value:
                            [
                              'China',
                            ],
                        dataType: 'string',
                      },
                      {
                        category: 'USER',
                        property: '_user_first_touch_timestamp',
                        operator: '>',
                        value:
                            [
                              1686532526770,
                            ],
                        dataType: 'int',
                      },
                      {
                        category: 'EVENT',
                        property: '_session_duration',
                        operator: '>',
                        value:
                            [
                              200,
                            ],
                        dataType: 'int',
                      },
                    ],
                },
          },
        ],
        modelType: 'LAST_TOUCH',
        timeWindowType: ExploreAttributionTimeWindowType.SESSION,
        timeScopeType: 'RELATIVE',
        lastN: 7,
        timeUnit: 'DD',
        dashboardCreateParameters: {
          region: 'us-east-1',
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toEqual(true);
    expect(res.body.data.dashboardArn).toEqual('arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa');
    expect(res.body.data.analysisArn).toEqual('');
    expect(res.body.data.analysisId).toBeDefined();
    expect(res.body.data.dashboardId).toBeDefined();
    expect(res.body.data.visualIds).toBeDefined();
    expect(res.body.data.visualIds.length).toEqual(1);
    expect(quickSightMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeDashboardDefinitionCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(UpdateAnalysisCommand, 0);
    expect(quickSightMock).toHaveReceivedCommandTimes(UpdateDashboardCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(UpdateDashboardPublishedVersionCommand, 1);

  });

  it('attribution visual - linear model', async () => {
    quickSightMock.on(CreateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:analysis/analysisaaaaaaaa',
    });
    quickSightMock.on(CreateDashboardCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa',
      VersionArn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa/1',
    });
    quickSightMock.on(GenerateEmbedUrlForRegisteredUserCommand).resolves({
      EmbedUrl: 'https://quicksight.aws.amazon.com/embed/4ui7xyvq73/studies/4a05631e-cbe6-477c-915d-1704aec9f101?isauthcode=true&identityprovider=quicksight&code=4a05631e-cbe6-477c-915d-1704aec9f101',
    });
    quickSightMock.on(DescribeDashboardCommand).resolvesOnce({
      Dashboard: {
        Version: {
          Status: ResourceStatus.CREATION_IN_PROGRESS,
        },
      },
    }).resolves({
      Dashboard: {
        Version: {
          Status: ResourceStatus.CREATION_SUCCESSFUL,
        },
      },
    });

    const res = await request(app)
      .post('/api/reporting/attribution')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PREVIEW',

        locale: 'zh-CN',
        projectId: 'shop_11111',
        pipelineId: '0f51e904d3444cf2bd21bb423442ba6c',
        chartTitle: '归因分析',
        chartSubTitle: '详细-subtitle',
        appId: 'shop',
        sheetName: 'Sheet 1',
        viewName: 'attribution_view_11122',
        dashboardCreateParameters:
        {
          region: 'us-east-1',
          allowedDomain: 'http://localhost:7777',
          redshift:
            {
              user: 'clickstream_222222222',
              dataApiRole: 'arn:aws:iam::111111111:role/Clickstream-DataModelingR-RedshiftServerelssWorkgro-1111111111',
              newServerless:
                {
                  workgroupName: 'clickstream-shop_111111',
                },
            },
          quickSight:
            {
              dataSourceArn: 'arn:aws:quicksight:us-east-1:111111111:datasource/clickstream_datasource_shop_1111111111',
            },
        },
        computeMethod: ExploreComputeMethod.EVENT_CNT,
        globalEventCondition:
        {
          conditions:
            [
              {
                category: 'OTHER',
                property: 'platform',
                operator: '=',
                value:
                    [
                      'Android',
                    ],
                dataType: 'string',
              },
              {
                category: 'GEO',
                property: 'country',
                operator: '=',
                value:
                    [
                      'China',
                    ],
                dataType: 'string',
              },
            ],
        },
        targetEventAndCondition:
        {
          eventName: 'purchase',
          sqlCondition:
            {
              conditionOperator: 'and',
              conditions:
                [
                  {
                    category: 'OTHER',
                    property: 'platform',
                    operator: '=',
                    value:
                        [
                          'Android',
                        ],
                    dataType: 'string',
                  },
                  {
                    category: 'GEO',
                    property: 'country',
                    operator: '=',
                    value:
                        [
                          'China',
                        ],
                    dataType: 'string',
                  },
                  {
                    category: 'EVENT',
                    property: '_session_duration',
                    operator: '>',
                    value:
                        [
                          10,
                        ],
                    dataType: 'int',
                  },
                  {
                    category: 'USER_OUTER',
                    property: '_channel',
                    operator: '<>',
                    value:
                        [
                          'google',
                        ],
                    dataType: 'string',
                  },
                ],
            },
        },
        eventAndConditions:
        [
          {
            eventName: 'view_item',
            sqlCondition:
                {
                  conditionOperator: 'and',
                  conditions:
                    [
                      {
                        category: 'OTHER',
                        property: 'platform',
                        operator: '=',
                        value:
                            [
                              'Android',
                            ],
                        dataType: 'string',
                      },
                      {
                        category: 'GEO',
                        property: 'country',
                        operator: '=',
                        value:
                            [
                              'China',
                            ],
                        dataType: 'string',
                      },
                      {
                        category: 'EVENT',
                        property: '_session_duration',
                        operator: '>',
                        value:
                            [
                              10,
                            ],
                        dataType: 'int',
                      },
                    ],
                },
          },
          {
            eventName: 'add_to_cart',
            sqlCondition:
                {
                  conditionOperator: 'and',
                  conditions:
                    [
                      {
                        category: 'OTHER',
                        property: 'platform',
                        operator: '=',
                        value:
                            [
                              'Android',
                            ],
                        dataType: 'string',
                      },
                      {
                        category: 'GEO',
                        property: 'country',
                        operator: '=',
                        value:
                            [
                              'China',
                            ],
                        dataType: 'string',
                      },
                      {
                        category: 'USER',
                        property: '_user_first_touch_timestamp',
                        operator: '>',
                        value:
                            [
                              1686532526770,
                            ],
                        dataType: 'int',
                      },
                      {
                        category: 'EVENT',
                        property: '_session_duration',
                        operator: '>',
                        value:
                            [
                              200,
                            ],
                        dataType: 'int',
                      },
                    ],
                },
          },
        ],
        modelType: AttributionModelType.LINEAR,
        timeWindowType: ExploreAttributionTimeWindowType.CURRENT_DAY,
        timeScopeType: 'RELATIVE',
        lastN: 7,
        timeUnit: 'DD',
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toEqual(true);
    expect(res.body.data.dashboardArn).toEqual('arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa');
    expect(res.body.data.dashboardName).toEqual('_tmp_attribution_view_11122');
    expect(res.body.data.analysisArn).toEqual('arn:aws:quicksight:us-east-1:11111111:analysis/analysisaaaaaaaa');
    expect(res.body.data.analysisName).toEqual('_tmp_attribution_view_11122');
    expect(res.body.data.analysisId).toBeDefined();
    expect(res.body.data.dashboardId).toBeDefined();
    expect(res.body.data.visualIds).toBeDefined();
    expect(res.body.data.visualIds.length).toEqual(1);
    expect(res.body.data.dashboardEmbedUrl).toEqual('https://quicksight.aws.amazon.com/embed/4ui7xyvq73/studies/4a05631e-cbe6-477c-915d-1704aec9f101?isauthcode=true&identityprovider=quicksight&code=4a05631e-cbe6-477c-915d-1704aec9f101');
    expect(quickSightMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 2);
    expect(quickSightMock).toHaveReceivedCommandTimes(GenerateEmbedUrlForRegisteredUserCommand, 1);
  });

  it('attribution visual - position model', async () => {
    quickSightMock.on(CreateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:analysis/analysisaaaaaaaa',
    });
    quickSightMock.on(CreateDashboardCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa',
      VersionArn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa/1',
    });
    quickSightMock.on(GenerateEmbedUrlForRegisteredUserCommand).resolves({
      EmbedUrl: 'https://quicksight.aws.amazon.com/embed/4ui7xyvq73/studies/4a05631e-cbe6-477c-915d-1704aec9f101?isauthcode=true&identityprovider=quicksight&code=4a05631e-cbe6-477c-915d-1704aec9f101',
    });
    quickSightMock.on(DescribeDashboardCommand).resolvesOnce({
      Dashboard: {
        Version: {
          Status: ResourceStatus.CREATION_IN_PROGRESS,
        },
      },
    }).resolves({
      Dashboard: {
        Version: {
          Status: ResourceStatus.CREATION_SUCCESSFUL,
        },
      },
    });

    const res = await request(app)
      .post('/api/reporting/attribution')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PREVIEW',

        locale: 'zh-CN',
        projectId: 'shop_11111',
        pipelineId: '0f51e904d3444cf2bd21bb423442ba6c',
        chartTitle: '归因分析',
        chartSubTitle: '详细-subtitle',
        appId: 'shop',
        sheetName: 'Sheet 1',
        viewName: 'attribution_view_11122',
        dashboardCreateParameters:
        {
          region: 'us-east-1',
          allowedDomain: 'http://localhost:7777',
          redshift:
            {
              user: 'clickstream_222222222',
              dataApiRole: 'arn:aws:iam::111111111:role/Clickstream-DataModelingR-RedshiftServerelssWorkgro-1111111111',
              newServerless:
                {
                  workgroupName: 'clickstream-shop_111111',
                },
            },
          quickSight:
            {
              dataSourceArn: 'arn:aws:quicksight:us-east-1:111111111:datasource/clickstream_datasource_shop_1111111111',
            },
        },
        computeMethod: ExploreComputeMethod.EVENT_CNT,
        globalEventCondition:
        {
          conditions:
            [
              {
                category: 'OTHER',
                property: 'platform',
                operator: '=',
                value:
                    [
                      'Android',
                    ],
                dataType: 'string',
              },
              {
                category: 'GEO',
                property: 'country',
                operator: '=',
                value:
                    [
                      'China',
                    ],
                dataType: 'string',
              },
            ],
        },
        targetEventAndCondition:
        {
          eventName: 'purchase',
          sqlCondition:
            {
              conditionOperator: 'and',
              conditions:
                [
                  {
                    category: 'OTHER',
                    property: 'platform',
                    operator: '=',
                    value:
                        [
                          'Android',
                        ],
                    dataType: 'string',
                  },
                  {
                    category: 'GEO',
                    property: 'country',
                    operator: '=',
                    value:
                        [
                          'China',
                        ],
                    dataType: 'string',
                  },
                  {
                    category: 'EVENT',
                    property: '_session_duration',
                    operator: '>',
                    value:
                        [
                          10,
                        ],
                    dataType: 'int',
                  },
                  {
                    category: 'USER_OUTER',
                    property: '_channel',
                    operator: '<>',
                    value:
                        [
                          'google',
                        ],
                    dataType: 'string',
                  },
                ],
            },
          groupColumn: {
            category: ConditionCategory.EVENT,
            property: '_session_duration',
            dataType: MetadataValueType.FLOAT,
          },
        },
        eventAndConditions:
        [
          {
            eventName: 'view_item',
            sqlCondition:
                {
                  conditionOperator: 'and',
                  conditions:
                    [
                      {
                        category: 'OTHER',
                        property: 'platform',
                        operator: '=',
                        value:
                            [
                              'Android',
                            ],
                        dataType: 'string',
                      },
                      {
                        category: 'GEO',
                        property: 'country',
                        operator: '=',
                        value:
                            [
                              'China',
                            ],
                        dataType: 'string',
                      },
                      {
                        category: 'EVENT',
                        property: '_session_duration',
                        operator: '>',
                        value:
                            [
                              10,
                            ],
                        dataType: 'int',
                      },
                    ],
                },
          },
          {
            eventName: 'add_to_cart',
            sqlCondition:
                {
                  conditionOperator: 'and',
                  conditions:
                    [
                      {
                        category: 'OTHER',
                        property: 'platform',
                        operator: '=',
                        value:
                            [
                              'Android',
                            ],
                        dataType: 'string',
                      },
                      {
                        category: 'GEO',
                        property: 'country',
                        operator: '=',
                        value:
                            [
                              'China',
                            ],
                        dataType: 'string',
                      },
                      {
                        category: 'USER',
                        property: '_user_first_touch_timestamp',
                        operator: '>',
                        value:
                            [
                              1686532526770,
                            ],
                        dataType: 'int',
                      },
                      {
                        category: 'EVENT',
                        property: '_session_duration',
                        operator: '>',
                        value:
                            [
                              200,
                            ],
                        dataType: 'int',
                      },
                    ],
                },
          },
        ],
        modelType: AttributionModelType.POSITION,
        modelWeights: [0.4, 0.2, 0.4],
        timeWindowType: ExploreAttributionTimeWindowType.CURRENT_DAY,
        timeScopeType: 'RELATIVE',
        lastN: 7,
        timeUnit: 'DD',
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toEqual(true);
    expect(res.body.data.dashboardArn).toEqual('arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa');
    expect(res.body.data.dashboardName).toEqual('_tmp_attribution_view_11122');
    expect(res.body.data.analysisArn).toEqual('arn:aws:quicksight:us-east-1:11111111:analysis/analysisaaaaaaaa');
    expect(res.body.data.analysisName).toEqual('_tmp_attribution_view_11122');
    expect(res.body.data.analysisId).toBeDefined();
    expect(res.body.data.dashboardId).toBeDefined();
    expect(res.body.data.visualIds).toBeDefined();
    expect(res.body.data.visualIds.length).toEqual(1);
    expect(res.body.data.dashboardEmbedUrl).toEqual('https://quicksight.aws.amazon.com/embed/4ui7xyvq73/studies/4a05631e-cbe6-477c-915d-1704aec9f101?isauthcode=true&identityprovider=quicksight&code=4a05631e-cbe6-477c-915d-1704aec9f101');
    expect(quickSightMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 2);
    expect(quickSightMock).toHaveReceivedCommandTimes(GenerateEmbedUrlForRegisteredUserCommand, 1);
  });

  it('warmup', async () => {
    redshiftClientMock.on(BatchExecuteStatementCommand).resolves({
    });
    redshiftClientMock.on(DescribeStatementCommand).resolves({
      Status: StatusString.FINISHED,
    });

    quickSightMock.on(ListDashboardsCommand).resolves({
      DashboardSummaryList: [{
        Arn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa',
      }],
    });

    const res = await request(app)
      .post('/api/reporting/warmup')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: 'project01_wvzh',
        appId: 'app1',
        region: 'us-east-1',
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toEqual(true);
    expect(res.body.data).toEqual('OK');
    expect(redshiftClientMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 1);
    expect(redshiftClientMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(ListDashboardsCommand, 1);
    expect(redshiftClientMock).toHaveReceivedNthSpecificCommandWith(1, BatchExecuteStatementCommand, {
      Sqls: expect.arrayContaining(['select * from app1.event limit 1']),
    });
  });

  it('warmup with error id', async () => {
    const res = await request(app)
      .post('/api/reporting/warmup')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: '\\x98',
        appId: 'app1',
        region: 'us-east-1',
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: [
        {
          location: 'body',
          msg: 'Validation error: projectId: \\x98 not match [a-z][a-z0-9_]{0,126}. Please check and try again.',
          param: 'projectId',
          value: '\\x98',
        },
      ],
      message: 'Parameter verification failed.',
      success: false,
    });
  });

  it('clean - ThrottlingException', async () => {
    quickSightMock.on(ListDashboardsCommand).resolves({
      DashboardSummaryList: [{
        Arn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa',
        Name: '_tmp_aaaaaaa',
        CreatedTime: new Date((new Date()).getTime() - 80*60*1000),
        DashboardId: 'dashboard-aaaaaaaa',
      }],
    });

    quickSightMock.on(DeleteDashboardCommand).resolves({
      Status: 200,
      DashboardId: 'dashboard-aaaaaaaa',
    });

    quickSightMock.on(ListAnalysesCommand).resolves({
      AnalysisSummaryList: [{
        Arn: 'arn:aws:quicksight:us-east-1:11111111:analysis/analysis-aaaaaaaa',
        Name: '_tmp_aaaaaaa',
        CreatedTime: new Date((new Date()).getTime() - 80*60*1000),
        AnalysisId: 'analysis_aaaaaaa',
      }],
    });

    quickSightMock.on(DeleteAnalysisCommand).resolves({
      Status: 200,
      AnalysisId: 'analysis-aaaaaaaa',
    });

    quickSightMock.on(ListDataSetsCommand).resolves({
      DataSetSummaries: [{
        Arn: 'arn:aws:quicksight:us-east-1:11111111:dataset/dataset-aaaaaaaa',
        Name: '_tmp_aaaaaaa',
        CreatedTime: new Date((new Date()).getTime() - 80*60*1000),
        DataSetId: 'dataset_aaaaaaa',
      }],
    });

    quickSightMock.on(DeleteDataSetCommand).rejectsOnce( new ThrottlingException({
      message: 'Rate exceeded',
      $metadata: {},
    }));

    quickSightMock.on(DeleteUserCommand).resolves({
      Status: 200,
    });

    ddbMock.on(QueryCommand).resolves({
      Items: [
        { templateVersion: 'v1.0.3' },
        { templateVersion: 'v1.2.0' },
      ],
    });

    const res = await request(app)
      .post('/api/reporting/clean')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        region: 'us-east-1',
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);

  });

  it('clean', async () => {

    quickSightMock.on(ListDashboardsCommand).resolves({
      DashboardSummaryList: [{
        Arn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/_tmp_aaaaaaa',
        Name: '_tmp_aaaaaaa',
        CreatedTime: new Date((new Date()).getTime() - 80*60*1000),
        DashboardId: '_tmp_aaaaaaaa',
      }],
    });

    quickSightMock.on(DeleteDashboardCommand).resolves({
      Status: 200,
      DashboardId: '_tmp_aaaaaaa',
    });

    quickSightMock.on(ListAnalysesCommand).resolves({
      AnalysisSummaryList: [
        {
          Arn: 'arn:aws:quicksight:us-east-1:11111111:analysis/_tmp_bbbbbbbb',
          Name: '_tmp_bbbbbbbb',
          CreatedTime: new Date((new Date()).getTime() - 80*60*1000),
          AnalysisId: '_tmp_bbbbbbbb',
          Status: ResourceStatus.UPDATE_SUCCESSFUL,
        },
        {
          Arn: 'arn:aws:quicksight:us-east-1:11111111:analysis/_tmp_cccccccc',
          Name: '_tmp_cccccccc',
          CreatedTime: new Date((new Date()).getTime() - 80*60*1000),
          AnalysisId: '_tmp_cccccccc',
          Status: ResourceStatus.DELETED,
        },
      ],
    });

    quickSightMock.on(DeleteAnalysisCommand).resolvesOnce({
      Status: 200,
      AnalysisId: '_tmp_bbbbbbbb',
    }).resolvesOnce({
      Status: 200,
      AnalysisId: '_tmp_cccccccc',
    });

    quickSightMock.on(ListDataSetsCommand).resolves({
      DataSetSummaries: [{
        Arn: 'arn:aws:quicksight:us-east-1:11111111:dataset/dataset-aaaaaaaa',
        Name: '_tmp_dddddddddd',
        CreatedTime: new Date((new Date()).getTime() - 80*60*1000),
        DataSetId: '_tmp_dddddddddd',
      }],
    });

    quickSightMock.on(DeleteDataSetCommand).resolves({
      Status: 200,
      DataSetId: '_tmp_dddddddddd',
    });

    quickSightMock.on(DeleteUserCommand).resolves({
      Status: 200,
    });

    ddbMock.on(QueryCommand).resolves({
      Items: [
        { templateVersion: 'v1.0.3' },
        { templateVersion: 'v1.2.0' },
      ],
    });

    const res = await request(app)
      .post('/api/reporting/clean')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        region: 'us-east-1',
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toEqual(true);
    expect(res.body.data.deletedDashBoards[0]).toEqual('_tmp_aaaaaaaa');
    expect(res.body.data.deletedAnalyses[0]).toEqual('_tmp_bbbbbbbb');
    expect(res.body.data.deletedDatasets[0]).toEqual('_tmp_dddddddddd');
    expect(quickSightMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(DeleteUserCommand, 1);
  });

  it('clean - include v1.1.4 pipeline', async () => {

    quickSightMock.on(ListDashboardsCommand).resolves({
      DashboardSummaryList: [{
        Arn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/_tmp_aaaaaaa',
        Name: '_tmp_aaaaaaa',
        CreatedTime: new Date((new Date()).getTime() - 80*60*1000),
        DashboardId: '_tmp_aaaaaaaa',
      }],
    });

    quickSightMock.on(DeleteDashboardCommand).resolves({
      Status: 200,
      DashboardId: '_tmp_aaaaaaa',
    });

    quickSightMock.on(ListAnalysesCommand).resolves({
      AnalysisSummaryList: [
        {
          Arn: 'arn:aws:quicksight:us-east-1:11111111:analysis/_tmp_bbbbbbbb',
          Name: '_tmp_bbbbbbbb',
          CreatedTime: new Date((new Date()).getTime() - 80*60*1000),
          AnalysisId: '_tmp_bbbbbbbb',
          Status: ResourceStatus.UPDATE_SUCCESSFUL,
        },
        {
          Arn: 'arn:aws:quicksight:us-east-1:11111111:analysis/_tmp_cccccccc',
          Name: '_tmp_cccccccc',
          CreatedTime: new Date((new Date()).getTime() - 80*60*1000),
          AnalysisId: '_tmp_cccccccc',
          Status: ResourceStatus.DELETED,
        },
      ],
    });

    quickSightMock.on(DeleteAnalysisCommand).resolvesOnce({
      Status: 200,
      AnalysisId: '_tmp_bbbbbbbb',
    }).resolvesOnce({
      Status: 200,
      AnalysisId: '_tmp_cccccccc',
    });

    quickSightMock.on(ListDataSetsCommand).resolves({
      DataSetSummaries: [{
        Arn: 'arn:aws:quicksight:us-east-1:11111111:dataset/dataset-aaaaaaaa',
        Name: '_tmp_dddddddddd',
        CreatedTime: new Date((new Date()).getTime() - 80*60*1000),
        DataSetId: '_tmp_dddddddddd',
      }],
    });

    quickSightMock.on(DeleteDataSetCommand).resolves({
      Status: 200,
      DataSetId: '_tmp_dddddddddd',
    });

    quickSightMock.on(DeleteUserCommand).resolves({
      Status: 200,
    });

    ddbMock.on(QueryCommand).resolves({
      Items: [
        { templateVersion: 'v1.1.4' },
        { templateVersion: 'v1.2.0' },
      ],
    });

    const res = await request(app)
      .post('/api/reporting/clean')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        region: 'us-east-1',
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toEqual(true);
    expect(res.body.data.deletedDashBoards[0]).toEqual('_tmp_aaaaaaaa');
    expect(res.body.data.deletedAnalyses[0]).toEqual('_tmp_bbbbbbbb');
    expect(res.body.data.deletedDatasets[0]).toEqual('_tmp_dddddddddd');
    expect(quickSightMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 1);
    expect(quickSightMock).toHaveReceivedCommandTimes(DeleteUserCommand, 0);
  });

  it('common parameter check - invalid parameter', async () => {
    const res = await request(app)
      .post('/api/reporting/funnel')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PREVIEW',

        chartType: QuickSightChartType.BAR,
        viewName: 'testview0002',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_ID_CNT',
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
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);

  });

  it('common parameter check - fixed timeScope', async () => {
    const res = await request(app)
      .post('/api/reporting/event')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PREVIEW',

        chartType: QuickSightChartType.FUNNEL,
        viewName: 'testview0002',
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_ID_CNT',
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
        lastN: 4,
        timeUnit: 'WK',
        groupColumn: 'week',
        dashboardCreateParameters: {
          region: 'us-east-1',
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);

  });

  it('common parameter check - relative timeScope', async () => {
    const res = await request(app)
      .post('/api/reporting/event')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PREVIEW',

        chartType: QuickSightChartType.FUNNEL,
        viewName: 'testview0002',
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_ID_CNT',
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
        groupColumn: 'week',
        dashboardCreateParameters: {
          region: 'us-east-1',
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);

  });

  it('common parameter check - limit conditions', async () => {
    const funnelBody = {
      action: 'PREVIEW',

      chartType: QuickSightChartType.BAR,
      viewName: 'testview0002',
      projectId: 'project01_wvzh',
      pipelineId: 'pipeline-1111111',
      appId: 'app1',
      sheetName: 'sheet99',
      computeMethod: 'USER_ID_CNT',
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: 'CUSTOMIZE',
      conversionIntervalInSeconds: 7200,
      eventAndConditions: [
        {
          eventName: 'add_button_click',
        },
        {
          eventName: 'note_share',
        },
        {
          eventName: 'note_export',
        },
      ],
      timeScopeType: 'RELATIVE',
      lastN: 4,
      timeUnit: 'WK',
      groupColumn: 'week',
      dashboardCreateParameters: {
        region: 'us-east-1',
        allowedDomain: 'https://example.com',
        quickSight: {
          dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
        },
      },
    };

    const eventAndConditions: EventAndCondition[] = [];

    const globalEventConditions: SQLCondition = {
      conditions: [],
      conditionOperator: 'and',
    };

    const pairEventAndConditions: PairEventAndCondition[] = [];

    for (let i = 0; i < 11; i++) {
      eventAndConditions.push({
        eventName: `event${i}`,
      });
      globalEventConditions.conditions.push({
        category: ConditionCategory.EVENT_OUTER,
        property: `atrri${i}`,
        operator: '=',
        value: ['Android'],
        dataType: MetadataValueType.STRING,
      });
      pairEventAndConditions.push({
        startEvent: {
          eventName: `eventStart${i}`,
        },
        backEvent: {
          eventName: `eventEnd${i}`,
        },
      });
    }

    ddbMock.on(GetCommand, {
      TableName: clickStreamTableName,
      Key: {
        id: MOCK_TOKEN,
        type: 'REQUESTID',
      },
    }, true).resolves({});

    const res1 = await request(app)
      .post('/api/reporting/funnel')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        ...funnelBody,
        eventAndConditions: eventAndConditions,
      });

    expect(res1.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res1.statusCode).toBe(400);
    expect(res1.body.message).toBe('The maximum number of event conditions is 10.');

    const res2 = await request(app)
      .post('/api/reporting/funnel')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        ...funnelBody,
        globalEventCondition: globalEventConditions,
      });

    expect(res2.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res2.statusCode).toBe(400);
    expect(res2.body.message).toBe('The maximum number of global filter conditions is 10.');

    const res3 = await request(app)
      .post('/api/reporting/funnel')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        ...funnelBody,
        pairEventAndConditions: pairEventAndConditions,
      });

    expect(res3.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res3.statusCode).toBe(400);
    expect(res3.body.message).toBe('The maximum number of pair event conditions is 5.');

  });

  it('funnel analysis - relative timeScope', async () => {
    const res = await request(app)
      .post('/api/reporting/event')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PREVIEW',

        chartType: QuickSightChartType.FUNNEL,
        viewName: 'testview0002',
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_ID_CNT',
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
        groupColumn: 'week',
        dashboardCreateParameters: {
          region: 'us-east-1',
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);

  });

  it('common parameter check - missing chart title', async () => {
    const res = await request(app)
      .post('/api/reporting/funnel')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PUBLISH',

        chartType: QuickSightChartType.BAR,
        sheetId: 'a410f75d-48d7-4699-83b8-283fce0f8f31',
        dashboardId: 'dashboard-37933899-0bb6-4e89-bced-cd8b17d3c160',
        viewName: 'testview0002',
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_ID_CNT',
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
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);

  });

  it('funnel analysis parameter check - unsupported chart type', async () => {
    const res = await request(app)
      .post('/api/reporting/funnel')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PREVIEW',

        chartType: QuickSightChartType.LINE,
        viewName: 'testview0002',
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_ID_CNT',
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
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);

  });

  it('funnel analysis parameter check - joinColumn', async () => {
    const res = await request(app)
      .post('/api/reporting/funnel')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PREVIEW',

        chartType: QuickSightChartType.FUNNEL,
        viewName: 'testview0002',
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_ID_CNT',
        specifyJoinColumn: true,
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
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);

  });

  it('funnel analysis parameter check - eventAndConditions', async () => {
    const res = await request(app)
      .post('/api/reporting/funnel')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PREVIEW',

        chartType: QuickSightChartType.FUNNEL,
        viewName: 'testview0002',
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_ID_CNT',
        specifyJoinColumn: true,
        joinColumn: 'user_pseudo_id',
        conversionIntervalType: 'CUSTOMIZE',
        conversionIntervalInSeconds: 7200,
        eventAndConditions: [],
        timeScopeType: 'RELATIVE',
        lastN: 4,
        timeUnit: 'WK',
        groupColumn: 'week',
        dashboardCreateParameters: {
          region: 'us-east-1',
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);

  });

  it('event analysis parameter check -invalid request action', async () => {
    const res = await request(app)
      .post('/api/reporting/event')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'SAVE',
        locale: ExploreLocales.ZH_CN,
        chartType: QuickSightChartType.BAR,
        viewName: 'testview0002',
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_ID_CNT',
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
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);

  });

  it('event analysis parameter check - unsupported chart type', async () => {
    const res = await request(app)
      .post('/api/reporting/event')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PREVIEW',

        locale: ExploreLocales.ZH_CN,
        viewName: 'testview0002',
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_ID_CNT',
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
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);

  });


  it('path analysis parameter check - pathAnalysis', async () => {
    const res = await request(app)
      .post('/api/reporting/path')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PREVIEW',

        viewName: 'testview0002',
        chartType: QuickSightChartType.SANKEY,
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_ID_CNT',
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
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
  });

  it('path analysis parameter check - lagSeconds', async () => {
    const res = await request(app)
      .post('/api/reporting/path')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PREVIEW',

        viewName: 'testview0002',
        chartType: QuickSightChartType.SANKEY,
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_ID_CNT',
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
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
        pathAnalysis: {
          sessionType: ExplorePathSessionDef.CUSTOMIZE,
          nodeType: ExplorePathNodeType.EVENT,
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
  });

  it('path analysis parameter check - nodes', async () => {
    const res = await request(app)
      .post('/api/reporting/path')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PREVIEW',

        viewName: 'testview0002',
        chartType: QuickSightChartType.SANKEY,
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_ID_CNT',
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
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
        pathAnalysis: {
          sessionType: ExplorePathSessionDef.SESSION,
          nodeType: ExplorePathNodeType.PAGE_TITLE,
          platform: 'Android',
          nodes: [],
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
  });

  it('path analysis parameter check - chart type', async () => {
    const res = await request(app)
      .post('/api/reporting/path')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PREVIEW',

        viewName: 'testview0002',
        chartType: QuickSightChartType.LINE,
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_ID_CNT',
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
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
        pathAnalysis: {
          sessionType: ExplorePathSessionDef.SESSION,
          nodeType: ExplorePathNodeType.EVENT,
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
  });

  it('path analysis parameter check - chart type', async () => {
    const res = await request(app)
      .post('/api/reporting/path')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PREVIEW',

        viewName: 'testview0002',
        chartType: QuickSightChartType.LINE,
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_ID_CNT',
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
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
        pathAnalysis: {
          sessionType: ExplorePathSessionDef.SESSION,
          nodeType: ExplorePathNodeType.PAGE_TITLE,
          nodes: ['NotepadActivity', 'NotepadExportActivity', 'NotepadShareActivity', 'NotepadPrintActivity'],
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
  });

  it('retention analysis parameter check - pairEventAndConditions', async () => {
    const res = await request(app)
      .post('/api/reporting/retention')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PUBLISH',

        locale: ExploreLocales.EN_US,
        chartTitle: 'test-title',
        chartSubTitle: 'test-subtitle',
        chartType: QuickSightChartType.LINE,
        viewName: 'testview0002',
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        sheetId: 'a410f75d-48d7-4699-83b8-283fce0f8f31',
        dashboardId: 'dashboard-37933899-0bb6-4e89-bced-cd8b17d3c160',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_ID_CNT',
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
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
        pairEventAndConditions: [
        ],
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);

  });

  it('retention analysis parameter check - unsupported chart type', async () => {
    const res = await request(app)
      .post('/api/reporting/retention')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PUBLISH',

        locale: ExploreLocales.EN_US,
        chartTitle: 'test-title',
        chartSubTitle: 'test-subtitle',
        chartType: QuickSightChartType.FUNNEL,
        sheetId: 'a410f75d-48d7-4699-83b8-283fce0f8f31',
        dashboardId: 'dashboard-37933899-0bb6-4e89-bced-cd8b17d3c160',
        viewName: 'testview0002',
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_ID_CNT',
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
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
        pairEventAndConditions: [
          {
            startEvent: {
              eventName: 'add_button_click',
            },
            backEvent: {
              eventName: 'note_share',
            },
          },
          {
            startEvent: {
              eventName: 'add_button_click',
            },
            backEvent: {
              eventName: 'note_export',
            },
          },
        ],
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);

  });

  it('event visual - preview - same event with different filter', async () => {
    quickSightMock.on(CreateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:analysis/analysisaaaaaaaa',
    });
    quickSightMock.on(CreateDashboardCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa',
      VersionArn: 'arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa/1',
    });
    quickSightMock.on(GenerateEmbedUrlForRegisteredUserCommand).resolves({
      EmbedUrl: 'https://quicksight.aws.amazon.com/embed/4ui7xyvq73/studies/4a05631e-cbe6-477c-915d-1704aec9f101?isauthcode=true&identityprovider=quicksight&code=4a05631e-cbe6-477c-915d-1704aec9f101',
    });
    quickSightMock.on(DescribeDashboardCommand).resolvesOnce({
      Dashboard: {
        Version: {
          Status: ResourceStatus.CREATION_IN_PROGRESS,
        },
      },
    }).resolves({
      Dashboard: {
        Version: {
          Status: ResourceStatus.CREATION_SUCCESSFUL,
        },
      },
    });

    const res = await request(app)
      .post('/api/reporting/event')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PREVIEW',

        locale: ExploreLocales.ZH_CN,
        chartType: QuickSightChartType.LINE,
        viewName: 'testview0002',
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_ID_CNT',
        specifyJoinColumn: true,
        joinColumn: 'user_pseudo_id',
        conversionIntervalType: 'CUSTOMIZE',
        conversionIntervalInSeconds: 7200,
        eventAndConditions: [
          {
            eventName: 'add_button_click',
            sqlConditions: {
              conditions: [
                {
                  category: ConditionCategory.EVENT_OUTER,
                  property: 'country',
                  operator: '=',
                  value: ['Japan'],
                  dataType: MetadataValueType.STRING,
                },
              ],
              conditionOperator: 'and',
            },
          },
          {
            eventName: 'add_button_click',
            sqlConditions: {
              conditions: [
                {
                  category: ConditionCategory.EVENT_OUTER,
                  property: 'country',
                  operator: '=',
                  value: ['China'],
                  dataType: MetadataValueType.STRING,
                },
              ],
              conditionOperator: 'and',
            },
          },
          {
            eventName: 'note_export',
          },
        ],
        timeScopeType: 'RELATIVE',
        lastN: 4,
        timeUnit: 'WK',
        groupColumn: 'week',
        dashboardCreateParameters: {
          region: 'us-east-1',
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toEqual(true);
    expect(res.body.data.dashboardArn).toEqual('arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa');
    expect(res.body.data.dashboardName).toEqual('_tmp_testview0002');
    expect(res.body.data.analysisArn).toEqual('arn:aws:quicksight:us-east-1:11111111:analysis/analysisaaaaaaaa');
    expect(res.body.data.analysisName).toEqual('_tmp_testview0002');
    expect(res.body.data.analysisId).toBeDefined();
    expect(res.body.data.dashboardId).toBeDefined();
    expect(res.body.data.visualIds).toBeDefined();
    expect(res.body.data.visualIds.length).toEqual(2);
    expect(res.body.data.dashboardEmbedUrl).toEqual('https://quicksight.aws.amazon.com/embed/4ui7xyvq73/studies/4a05631e-cbe6-477c-915d-1704aec9f101?isauthcode=true&identityprovider=quicksight&code=4a05631e-cbe6-477c-915d-1704aec9f101');
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 2);
  });

  it('retention visual - special chars', async () => {
    quickSightMock.on(DescribeDashboardDefinitionCommand).resolves({
      Definition: dashboardDef,
      Name: 'dashboard-test',
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
    quickSightMock.on(DescribeAnalysisCommand).resolves({
      Analysis: {
        Name: 'test-analysis',
      },
    });

    const res = await request(app)
      .post('/api/reporting/retention')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PUBLISH',
        locale: ExploreLocales.EN_US,
        chartTitle: 'test-title',
        chartSubTitle: 'test-subtitle',
        chartType: QuickSightChartType.LINE,
        viewName: 'testview0002',
        sheetId: 'a410f75d-48d7-4699-83b8-283fce0f8f31',
        dashboardId: 'dashboard-37933899-0bb6-4e89-bced-cd8b17d3c160',
        analysisId: 'analysis4e448d67-7c0d-4251-9f0f-45dc2c8dcb09',
        analysisName: 'analysis-aaaa',
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        computeMethod: 'USER_ID_CNT',
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
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
        pairEventAndConditions: [
          {
            startEvent: {
              eventName: 'add_button_click\'',
              sqlCondition: {
                conditions: [
                  {
                    category: ConditionCategory.EVENT_OUTER,
                    property: 'country',
                    operator: '=',
                    value: ['China\''],
                    dataType: MetadataValueType.STRING,
                  },
                ],
                conditionOperator: 'and',
              },
            },
            backEvent: {
              eventName: 'note_share\'',
            },
          },
          {
            startEvent: {
              eventName: 'add_button_click\'',
            },
            backEvent: {
              eventName: 'note_export\'',
              sqlCondition: {
                conditions: [
                  {
                    category: ConditionCategory.EVENT_OUTER,
                    property: 'country',
                    operator: '=',
                    value: ['China\''],
                    dataType: MetadataValueType.STRING,
                  },
                ],
                conditionOperator: 'and',
              },
            },
          },
        ],
      });

    expect(buildRetentionAnalysisView).toHaveBeenCalledWith(
      {
        dbName: 'project01_wvzh',
        schemaName: 'app1',
        computeMethod: 'USER_ID_CNT',
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
        globalEventCondition: undefined,
        groupCondition: undefined,
        timeScopeType: 'RELATIVE',
        lastN: 4,
        timeUnit: 'WK',
        timezone: 'Asia/Singapore',
        groupColumn: 'week',
        timeStart: undefined,
        timeEnd: undefined,
        pairEventAndConditions: [
          {
            startEvent: {
              eventName: 'add_button_click\'\'',
              sqlCondition: {
                conditions: [
                  {
                    category: ConditionCategory.EVENT_OUTER,
                    property: 'country',
                    operator: '=',
                    value: ['China\'\''],
                    dataType: MetadataValueType.STRING,
                  },
                ],
                conditionOperator: 'and',
              },
            },
            backEvent: {
              eventName: 'note_share\'\'',
            },
          },
          {
            startEvent: {
              eventName: 'add_button_click\'\'',
            },
            backEvent: {
              eventName: 'note_export\'\'',
              sqlCondition: {
                conditions: [
                  {
                    category: ConditionCategory.EVENT_OUTER,
                    property: 'country',
                    operator: '=',
                    value: ['China\'\''],
                    dataType: MetadataValueType.STRING,
                  },
                ],
                conditionOperator: 'and',
              },
            },
          },
        ],
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toEqual(true);
    expect(res.body.data.dashboardArn).toEqual('arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa');
    expect(res.body.data.analysisArn).toEqual('');
    expect(res.body.data.analysisId).toBeDefined();
    expect(res.body.data.dashboardId).toBeDefined();
    expect(res.body.data.visualIds).toBeDefined();
    expect(res.body.data.visualIds.length).toEqual(2);
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 0);

  });


  it('retention visual - special chars for like condition', async () => {
    quickSightMock.on(DescribeDashboardDefinitionCommand).resolves({
      Definition: dashboardDef,
      Name: 'dashboard-test',
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
    quickSightMock.on(DescribeAnalysisCommand).resolves({
      Analysis: {
        Name: 'test-analysis',
      },
    });

    const res = await request(app)
      .post('/api/reporting/retention')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PUBLISH',

        locale: ExploreLocales.EN_US,
        chartTitle: 'test-title',
        chartSubTitle: 'test-subtitle',
        chartType: QuickSightChartType.LINE,
        viewName: 'testview0002',
        sheetId: 'a410f75d-48d7-4699-83b8-283fce0f8f31',
        dashboardId: 'dashboard-37933899-0bb6-4e89-bced-cd8b17d3c160',
        analysisId: 'analysis4e448d67-7c0d-4251-9f0f-45dc2c8dcb09',
        analysisName: 'analysis-aaaa',
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        computeMethod: 'USER_ID_CNT',
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
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws:quicksight:us-east-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
        pairEventAndConditions: [
          {
            startEvent: {
              eventName: 'add_button_click\'',
              sqlCondition: {
                conditions: [
                  {
                    category: ConditionCategory.EVENT_OUTER,
                    property: 'platform',
                    operator: ExploreAnalyticsOperators.CONTAINS,
                    value: ['%'],
                    dataType: MetadataValueType.STRING,
                  },
                ],
                conditionOperator: 'and',
              },
            },
            backEvent: {
              eventName: 'note_share\'',
            },
          },
          {
            startEvent: {
              eventName: 'add_button_click\'',
            },
            backEvent: {
              eventName: 'note_export\'',
              sqlCondition: {
                conditions: [
                  {
                    category: ConditionCategory.EVENT_OUTER,
                    property: 'install_source',
                    operator: ExploreAnalyticsOperators.NOT_CONTAINS,
                    value: ['_'],
                    dataType: MetadataValueType.STRING,
                  },
                ],
                conditionOperator: 'and',
              },
            },
          },
        ],
      });

    expect(buildRetentionAnalysisView).toHaveBeenCalledWith(
      {
        dbName: 'project01_wvzh',
        schemaName: 'app1',
        computeMethod: 'USER_ID_CNT',
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
        globalEventCondition: undefined,
        groupCondition: undefined,
        timeScopeType: 'RELATIVE',
        lastN: 4,
        timeUnit: 'WK',
        timezone: 'Asia/Singapore',
        groupColumn: 'week',
        timeStart: undefined,
        timeEnd: undefined,
        pairEventAndConditions: [
          {
            startEvent: {
              eventName: 'add_button_click\'\'',
              sqlCondition: {
                conditions: [
                  {
                    category: ConditionCategory.EVENT_OUTER,
                    property: 'platform',
                    operator: 'contains',
                    value: ['%'],
                    dataType: MetadataValueType.STRING,
                  },
                ],
                conditionOperator: 'and',
              },
            },
            backEvent: {
              eventName: 'note_share\'\'',
            },
          },
          {
            startEvent: {
              eventName: 'add_button_click\'\'',
            },
            backEvent: {
              eventName: 'note_export\'\'',
              sqlCondition: {
                conditions: [
                  {
                    category: ConditionCategory.EVENT_OUTER,
                    property: 'install_source',
                    operator: 'not_contains',
                    value: ['_'],
                    dataType: MetadataValueType.STRING,
                  },
                ],
                conditionOperator: 'and',
              },
            },
          },
        ],
      });

    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toEqual(true);
    expect(res.body.data.dashboardArn).toEqual('arn:aws:quicksight:us-east-1:11111111:dashboard/dashboard-aaaaaaaa');
    expect(res.body.data.analysisArn).toEqual('');
    expect(res.body.data.analysisId).toBeDefined();
    expect(res.body.data.dashboardId).toBeDefined();
    expect(res.body.data.visualIds).toBeDefined();
    expect(res.body.data.visualIds.length).toEqual(2);
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 0);

  });

  afterAll((done) => {
    server.close();
    done();
  });
});

describe('reporting test in China region', () => {
  beforeEach(() => {
    ddbMock.reset();
    cloudFormationMock.reset();
    quickSightMock.reset();
    redshiftClientMock.reset();
    tokenMock(ddbMock, false);
    quickSightUserMock(ddbMock, true);
  });

  it('funnel bar visual - preview', async () => {
    quickSightMock.on(CreateAnalysisCommand).resolves({
      Arn: 'arn:aws-cn:quicksight:cn-north-1:11111111:analysis/analysisaaaaaaaa',
    });
    quickSightMock.on(CreateDashboardCommand).resolves({
      Arn: 'arn:aws-cn:quicksight:cn-north-1:11111111:dashboard/dashboard-aaaaaaaa',
      VersionArn: 'arn:aws-cn:quicksight:cn-north-1:11111111:dashboard/dashboard-aaaaaaaa/1',
    });
    quickSightMock.on(GenerateEmbedUrlForRegisteredUserCommand).resolves({
      EmbedUrl: 'https://cn-north-1.quicksight.aws.amazon.com/embed/4ui7xyvq73/studies/4a05631e-cbe6-477c-915d-1704aec9f101?isauthcode=true&identityprovider=quicksight&code=4a05631e-cbe6-477c-915d-1704aec9f101',
    });
    quickSightMock.on(DescribeDashboardCommand).resolvesOnce({
      Dashboard: {
        Version: {
          Status: ResourceStatus.CREATION_IN_PROGRESS,
        },
      },
    }).resolves({
      Dashboard: {
        Version: {
          Status: ResourceStatus.CREATION_SUCCESSFUL,
        },
      },
    });

    process.env.AWS_REGION = 'cn-north-1';
    const res = await request(app)
      .post('/api/reporting/funnel')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        action: 'PREVIEW',

        chartType: QuickSightChartType.BAR,
        viewName: 'testview0002',
        projectId: 'project01_wvzh',
        pipelineId: 'pipeline-1111111',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_ID_CNT',
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
          region: 'cn-north-1',
          allowedDomain: 'https://example.com',
          quickSight: {
            dataSourceArn: 'arn:aws-cn:quicksight:cn-north-1:11111111:datasource/clickstream_datasource_aaaaaaa',
          },
        },
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toEqual(true);
    expect(res.body.data.dashboardArn).toEqual('arn:aws-cn:quicksight:cn-north-1:11111111:dashboard/dashboard-aaaaaaaa');
    expect(res.body.data.dashboardName).toEqual('_tmp_testview0002');
    expect(res.body.data.analysisArn).toEqual('arn:aws-cn:quicksight:cn-north-1:11111111:analysis/analysisaaaaaaaa');
    expect(res.body.data.analysisName).toEqual('_tmp_testview0002');
    expect(res.body.data.analysisId).toBeDefined();
    expect(res.body.data.dashboardId).toBeDefined();
    expect(res.body.data.visualIds).toBeDefined();
    expect(res.body.data.visualIds.length).toEqual(2);
    expect(res.body.data.dashboardEmbedUrl).toEqual('https://cn-north-1.quicksight.aws.amazon.com/embed/4ui7xyvq73/studies/4a05631e-cbe6-477c-915d-1704aec9f101?isauthcode=true&identityprovider=quicksight&code=4a05631e-cbe6-477c-915d-1704aec9f101');
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 2);
    expect(quickSightMock).toHaveReceivedCommandTimes(GenerateEmbedUrlForRegisteredUserCommand, 1);
    process.env.AWS_REGION = undefined;
  });

  afterAll((done) => {
    server.close();
    done();
  });
});