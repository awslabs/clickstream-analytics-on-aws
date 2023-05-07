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
  CreateAnalysisCommand,
  CreateDashboardCommand,
  CreateDataSetCommand,
  CreateDataSourceCommand,
  CreateTemplateCommand,
  DeleteAnalysisCommand,
  DeleteDashboardCommand,
  DeleteDataSetCommand,
  DeleteDataSourceCommand,
  DeleteTemplateCommand,
  DescribeAnalysisCommand,
  DescribeDashboardCommand,
  DescribeDataSetCommand,
  DescribeDataSourceCommand,
  DescribeTemplateCommand,
  QuickSightClient,
  ResourceNotFoundException,
} from '@aws-sdk/client-quicksight';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { CdkCustomResourceResponse } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { handler } from '../../../../src/reporting/lambda/custom-resource/quicksight/index';
import {
  clickstream_daily_active_user_view_columns,
  clickstream_dau_wau_view_columns,
  clickstream_ods_flattened_view_columns,
  clickstream_retention_view_columns,
  clickstream_session_view_columns,
} from '../../../../src/reporting/lambda/custom-resource/quicksight/resources-def';
import {
  CLICKSTREAM_DAILY_ACTIVE_USER_VIEW_PLACEHOLDER,
  CLICKSTREAM_DAU_WAU_VIEW_PLACEHOLDER,
  CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER,
  CLICKSTREAM_RETENTION_VIEW_PLACEHOLDER,
  CLICKSTREAM_SESSION_VIEW_PLACEHOLDER,
} from '../../../../src/reporting/private/dashboard';
import { getMockContext } from '../../../common/lambda-context';
import 'aws-sdk-client-mock-jest';
import {
  basicCloudFormationDeleteEvent,
  basicCloudFormationEvent,
  basicCloudFormationUpdateEvent,
} from '../../../common/lambda-events';
// import { logger } from '../../../../src/common/powertools';


describe('QuickSight Lambda function', () => {

  const context = getMockContext();
  const quickSightClientMock = mockClient(QuickSightClient);
  const ssmClientMock = mockClient(SSMClient);
  const suffix = 'test-database-name';
  const arnPrefix = 'test';

  const commonProps = {
    awsAccountId: 'xxxxxxxxxx',
    awsRegion: 'us-east-1',
    awsPartition: 'aws',
    quickSightNamespace: 'default',
    quickSightUser: 'clickstream',
    quickSightPrincipalArn: 'test-principal-arn',
    dashboardDefProps: {
      analysisId: `clickstream_analysis_v1_${suffix}_##SCHEMA##`,
      analysisName: `Clickstream Analysis ${suffix}_##SCHEMA##`,
      dashboardId: `clickstream_dashboard_v1_${suffix}_##SCHEMA##`,
      dashboardName: `Clickstream Dashboard ${suffix}_##SCHEMA##`,
      template: {
        id: `clickstream_quicksight_template_v1_${suffix}_##SCHEMA##`,
        name: `Clickstream Quicksight Template ${suffix}_##SCHEMA##`,
        templateArn: 'test-template-arn',
        // templateDefinition?: templeteDef, //keep for future use.
      },
      data: {
        dataSource: {
          id: `clickstream_quicksight_data_source_v1_${suffix}_##SCHEMA##`,
          name: `Clickstream Quicksight Data Source ${suffix}_##SCHEMA##`,
          endpoint: 'test.example.com',
          port: 5439,
          databaseName: ['test-database'],
          credentialParameter: 'test-parameter',
          vpcConnectionArn: 'test-vpc-connection',
        },
        dataSets: [
          {
            id: `dataset_${CLICKSTREAM_DAILY_ACTIVE_USER_VIEW_PLACEHOLDER}_v1_${suffix}_##SCHEMA##`,
            name: `Daily Active User Dataset ${suffix}_##SCHEMA##`,
            importMode: 'DIRECT_QUERY',
            physicalTableMap: {
              DailyActiveUserTable: {
                CustomSql: {
                  DataSourceArn: `${arnPrefix}datasource/clickstream_quicksight_data_source_v1_${suffix}_##SCHEMA##`,
                  Name: CLICKSTREAM_DAILY_ACTIVE_USER_VIEW_PLACEHOLDER,
                  SqlQuery: `SELECT * FROM ##SCHEMA##.${CLICKSTREAM_DAILY_ACTIVE_USER_VIEW_PLACEHOLDER}`,
                  Columns: clickstream_daily_active_user_view_columns,
                },
              },
            },
            logicalTableMap: {
              DailyActiveUserLogicTable: {
                Alias: 'DailyActiveUserTableAlias',
                Source: {
                  PhysicalTableId: 'DailyActiveUserTable',
                },
                DataTransforms: [{
                  TagColumnOperation: {
                    ColumnName: 'country',
                    Tags: [
                      {
                        ColumnGeographicRole: 'COUNTRY',
                      },
                    ],
                  },
                }],
              },
            },
          },
          {
            id: `dataset_${CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER}_v1_${suffix}_##SCHEMA##`,
            name: `ODS Flattened Dataset ${suffix}_##SCHEMA##`,
            importMode: 'DIRECT_QUERY',
            physicalTableMap: {
              ODSFalttenedTable: {
                CustomSql: {
                  DataSourceArn: `${arnPrefix}datasource/clickstream_quicksight_data_source_v1_${suffix}_##SCHEMA##`,
                  Name: CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER,
                  SqlQuery: `SELECT * FROM ##SCHEMA##.${CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER}`,
                  Columns: clickstream_ods_flattened_view_columns,
                },
              },
            },
          },
          {
            id: `dataset_${CLICKSTREAM_SESSION_VIEW_PLACEHOLDER}_v1_${suffix}_##SCHEMA##`,
            name: `Session Dataset ${suffix}_##SCHEMA##`,
            importMode: 'DIRECT_QUERY',
            physicalTableMap: {
              SessionTable: {
                CustomSql: {
                  DataSourceArn: `${arnPrefix}datasource/clickstream_quicksight_data_source_v1_${suffix}_##SCHEMA##`,
                  Name: CLICKSTREAM_SESSION_VIEW_PLACEHOLDER,
                  SqlQuery: `SELECT * FROM ##SCHEMA##.${CLICKSTREAM_SESSION_VIEW_PLACEHOLDER}`,
                  Columns: clickstream_session_view_columns,
                },
              },
            },
          },
          {
            id: `dataset_${CLICKSTREAM_RETENTION_VIEW_PLACEHOLDER}_v1_${suffix}_##SCHEMA##`,
            name: `Retention Dataset ${suffix}_##SCHEMA##`,
            importMode: 'DIRECT_QUERY',
            physicalTableMap: {
              RetentionTable: {
                CustomSql: {
                  DataSourceArn: `${arnPrefix}datasource/clickstream_quicksight_data_source_v1_${suffix}_##SCHEMA##`,
                  Name: CLICKSTREAM_RETENTION_VIEW_PLACEHOLDER,
                  SqlQuery: `SELECT * FROM ##SCHEMA##.${CLICKSTREAM_RETENTION_VIEW_PLACEHOLDER}`,
                  Columns: clickstream_retention_view_columns,
                },
              },
            },
          },
          {
            id: `dataset_${CLICKSTREAM_DAU_WAU_VIEW_PLACEHOLDER}_v1_${suffix}_##SCHEMA##`,
            name: `Dau Wau Dataset ${suffix}_##SCHEMA##`,
            importMode: 'DIRECT_QUERY',
            physicalTableMap: {
              DauWauTable: {
                CustomSql: {
                  DataSourceArn: `${arnPrefix}datasource/clickstream_quicksight_data_source_v1_${suffix}_##SCHEMA##`,
                  Name: CLICKSTREAM_DAU_WAU_VIEW_PLACEHOLDER,
                  SqlQuery: `SELECT * FROM ##SCHEMA##.${CLICKSTREAM_DAU_WAU_VIEW_PLACEHOLDER}`,
                  Columns: clickstream_dau_wau_view_columns,
                },
              },
            },
          },
        ],
        dataSetReferences: [
          {
            DataSetPlaceholder: CLICKSTREAM_DAILY_ACTIVE_USER_VIEW_PLACEHOLDER,
            DataSetArn: `${arnPrefix}dataset/dataset_${CLICKSTREAM_DAILY_ACTIVE_USER_VIEW_PLACEHOLDER}_v1_${suffix}_##SCHEMA##`,
          },
          {
            DataSetPlaceholder: CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER,
            DataSetArn: `${arnPrefix}dataset/dataset_${CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER}_v1_${suffix}_##SCHEMA##`,
          },
          {
            DataSetPlaceholder: CLICKSTREAM_DAU_WAU_VIEW_PLACEHOLDER,
            DataSetArn: `${arnPrefix}dataset/dataset_${CLICKSTREAM_DAU_WAU_VIEW_PLACEHOLDER}_v1_${suffix}_##SCHEMA##`,
          },
          {
            DataSetPlaceholder: CLICKSTREAM_SESSION_VIEW_PLACEHOLDER,
            DataSetArn: `${arnPrefix}dataset/dataset_${CLICKSTREAM_SESSION_VIEW_PLACEHOLDER}_v1_${suffix}_##SCHEMA##`,
          },
          {
            DataSetPlaceholder: CLICKSTREAM_RETENTION_VIEW_PLACEHOLDER,
            DataSetArn: `${arnPrefix}dataset/dataset_${CLICKSTREAM_RETENTION_VIEW_PLACEHOLDER}_v1_${suffix}_##SCHEMA##`,
          },
        ],
      },
    },
  };

  const basicEvent = {
    ...basicCloudFormationEvent,
    ResourceProperties: {
      ...basicCloudFormationEvent.ResourceProperties,
      ...commonProps,
      schemas: ['test1'],
    },

  };

  const updateEvent = {
    ...basicCloudFormationUpdateEvent,
    ResourceProperties: {
      ...basicCloudFormationUpdateEvent.ResourceProperties,
      ...commonProps,
      schemas: ['test1'],
    },
  };

  const multiUpdateEvent = {
    ...basicCloudFormationUpdateEvent,
    ResourceProperties: {
      ...basicCloudFormationUpdateEvent.ResourceProperties,
      ...commonProps,
      schemas: ['test1', 'zzzz'],
    },
  };

  const deleteEvent = {
    ...basicCloudFormationDeleteEvent,
    ResourceProperties: {
      ...basicCloudFormationDeleteEvent.ResourceProperties,
      ...commonProps,
      schemas: ['test1'],
    },
  };

  const publicAccessEvent = {
    ...basicEvent,
    ResourceProperties: {
      ...basicEvent.ResourceProperties,
      vpcConnectionArn: 'public',
    },
  };

  const vpcConnectionAccessEvent = {
    ...basicEvent,
    ResourceProperties: {
      ...basicEvent.ResourceProperties,
      vpcConnectionArn: 'arn:aws:quicksight:ap-southeast-1:xxxxxxxxxx:vpcConnection/test',
    },
  };

  beforeEach(() => {
    quickSightClientMock.reset();
    ssmClientMock.reset();
    ssmClientMock.on(GetParameterCommand).resolves({
      Parameter: {
        Value: '{"userName": "clickstream", "password":"Test12345678"}',
      },
    });

  });

  test('Create QuichSight dashboard', async () => {

    quickSightClientMock.on(DescribeDataSourceCommand).resolves({
      DataSource: {
        DataSourceId: 'datasource_123456',
      },
      RequestId: 'request-123',
      Status: 200,
    });

    quickSightClientMock.on(DeleteDataSourceCommand).resolves({
    });

    quickSightClientMock.on(CreateDataSourceCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:datasource/test_datasource',
      Status: 200,
    });

    quickSightClientMock.on(DescribeTemplateCommand).resolves({
      Template: {
        TemplateId: 'template_123456',
      },
    });

    quickSightClientMock.on(DeleteTemplateCommand).resolves({
    });

    quickSightClientMock.on(CreateTemplateCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:template/test_template',
      Status: 200,
    });


    quickSightClientMock.on(DescribeDataSetCommand).resolves({
      DataSet: {
        DataSetId: 'dataset_0',
      },
    });
    quickSightClientMock.on(DeleteDataSetCommand).resolves({
    });

    quickSightClientMock.on(CreateDataSetCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_0',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_1',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_2',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_3',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_4',
      Status: 200,
    });

    quickSightClientMock.on(DescribeAnalysisCommand).resolves({
      Analysis: {
        AnalysisId: 'analysis_0',
      },
    });
    quickSightClientMock.on(DeleteAnalysisCommand).resolves({
    });

    quickSightClientMock.on(CreateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      Status: 200,
    });

    quickSightClientMock.on(DescribeDashboardCommand).resolves({
      Dashboard: {
        DashboardId: 'dashboard_0',
      },
    });
    quickSightClientMock.on(DeleteDashboardCommand).resolves({
    });

    quickSightClientMock.on(CreateDashboardCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dashboard/dashboard_0',
      Status: 200,
    });

    const resp = await handler(vpcConnectionAccessEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSourceCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSourceCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSourceCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeTemplateCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteTemplateCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateTemplateCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 10);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 5);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 1);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 0);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(resp.Data?.dashboards).toHaveLength(1);
    expect(resp.Data?.dashboards[0]).toEqual('arn:aws:quicksight:us-east-1:xxxxxxxxxx:dashboard/dashboard_0');

  });


  test('Create QuichSight dashboard - public access', async () => {

    quickSightClientMock.on(DescribeDataSourceCommand).resolves({
      DataSource: {
        DataSourceId: 'datasource_123456',
      },
      RequestId: 'request-123',
      Status: 200,
    });

    quickSightClientMock.on(DeleteDataSourceCommand).resolves({
    });

    quickSightClientMock.on(CreateDataSourceCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:datasource/test_datasource',
      Status: 200,
    });

    quickSightClientMock.on(DescribeTemplateCommand).resolves({
      Template: {
        TemplateId: 'template_123456',
      },
    });

    quickSightClientMock.on(DeleteTemplateCommand).resolves({
    });

    quickSightClientMock.on(CreateTemplateCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:template/test_template',
      Status: 200,
    });


    quickSightClientMock.on(DescribeDataSetCommand).resolves({
      DataSet: {
        DataSetId: 'dataset_0',
      },
    });
    quickSightClientMock.on(DeleteDataSetCommand).resolves({
    });

    quickSightClientMock.on(CreateDataSetCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_0',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_1',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_2',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_3',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_4',
      Status: 200,
    });

    quickSightClientMock.on(DescribeAnalysisCommand).resolves({
      Analysis: {
        AnalysisId: 'analysis_0',
      },
    });
    quickSightClientMock.on(DeleteAnalysisCommand).resolves({
    });

    quickSightClientMock.on(CreateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      Status: 200,
    });

    quickSightClientMock.on(DescribeDashboardCommand).resolves({
      Dashboard: {
        DashboardId: 'dashboard_0',
      },
    });
    quickSightClientMock.on(DeleteDashboardCommand).resolves({
    });

    quickSightClientMock.on(CreateDashboardCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dashboard/dashboard_0',
      Status: 200,
    });

    const resp = await handler(publicAccessEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSourceCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSourceCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSourceCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeTemplateCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteTemplateCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateTemplateCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 10);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 5);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 1);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 0);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(resp.Data?.dashboards).toHaveLength(1);
    expect(resp.Data?.dashboards).toContain('arn:aws:quicksight:us-east-1:xxxxxxxxxx:dashboard/dashboard_0');

  });


  test('Create QuichSight dashboard - resource already exist', async () => {

    const error = new ResourceNotFoundException({
      message: 'ResourceNotFoundException',
      $metadata: {},
    });

    quickSightClientMock.on(DescribeDataSourceCommand).resolvesOnce({
      DataSource: {
        DataSourceId: 'clickstream_quicksight_data_source_v1_test-database-name_test1',
      },
      RequestId: 'request-123',
      Status: 200,
    }).rejectsOnce(error).resolvesOnce({
      DataSource: {
        DataSourceId: 'clickstream_quicksight_data_source_v1_test-database-name_test1',
      },
      RequestId: 'request-123',
      Status: 200,
    });

    quickSightClientMock.on(DeleteDataSourceCommand).resolves({
    });

    quickSightClientMock.on(CreateDataSourceCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:datasource/test_datasource',
      Status: 200,
    });

    quickSightClientMock.on(DescribeTemplateCommand).resolvesOnce({
      Template: {
        TemplateId: 'clickstream_quicksight_template_v1_test-database-name_test1',
      },
    }).rejectsOnce(error).resolvesOnce({
      Template: {
        TemplateId: 'clickstream_quicksight_template_v1_test-database-name_test1',
      },
      RequestId: 'request-123',
      Status: 200,
    });

    quickSightClientMock.on(DeleteTemplateCommand).resolves({
    });

    quickSightClientMock.on(CreateTemplateCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:template/test_template',
      Status: 200,
    });

    quickSightClientMock.on(DescribeDataSetCommand).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_DAILY_ACTIVE_USER_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).rejectsOnce(error).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_DAILY_ACTIVE_USER_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).rejectsOnce(error).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_SESSION_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).rejectsOnce(error).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_SESSION_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_RETENTION_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).rejectsOnce(error).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_RETENTION_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_DAU_WAU_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).rejectsOnce(error).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_DAU_WAU_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    });


    quickSightClientMock.on(DeleteDataSetCommand).resolves({
    });

    quickSightClientMock.on(CreateDataSetCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_0',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_1',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_2',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_3',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_4',
      Status: 200,
    });

    quickSightClientMock.on(DescribeAnalysisCommand).resolvesOnce({
      Analysis: {
        AnalysisId: 'clickstream_analysis_v1_test-database-name_test1',
      },
    }).rejectsOnce(error).resolvesOnce({
      Analysis: {
        AnalysisId: 'clickstream_analysis_v1_test-database-name_test1',
      },
    });

    quickSightClientMock.on(DeleteAnalysisCommand).resolves({
    });

    quickSightClientMock.on(CreateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      Status: 200,
    });

    quickSightClientMock.on(DescribeDashboardCommand).resolvesOnce({
      Dashboard: {
        DashboardId: 'clickstream_dashboard_v1_test-database-name_test1',
      },
    }).rejectsOnce(error).resolvesOnce({
      Dashboard: {
        DashboardId: 'clickstream_dashboard_v1_test-database-name_test1',
      },
    });

    quickSightClientMock.on(DeleteDashboardCommand).resolves({
    });

    quickSightClientMock.on(CreateDashboardCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dashboard/clickstream_dashboard_v1_test-database-name_test1',
      Status: 200,
    });

    const resp = await handler(publicAccessEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSourceCommand, 3);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSourceCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSourceCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeTemplateCommand, 3);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteTemplateCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateTemplateCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 3);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 3);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 15);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 5);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 1);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 5);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 1);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(resp.Data?.dashboards).toHaveLength(1);
    expect(resp.Data?.dashboards[0]).toEqual('arn:aws:quicksight:us-east-1:xxxxxxxxxx:dashboard/clickstream_dashboard_v1_test-database-name_test1');

  }, 10000);

  test('Create QuichSight datasource - create data source exception', async () => {

    quickSightClientMock.on(DescribeDataSourceCommand).resolvesOnce({
      DataSource: {
        DataSourceId: 'datasource_123456',
      },
      RequestId: 'request-123',
      Status: 200,
    });

    quickSightClientMock.on(DeleteDataSourceCommand).resolvesOnce({
    });

    quickSightClientMock.on(CreateDataSourceCommand).rejects();

    quickSightClientMock.on(DescribeTemplateCommand).resolves({
      Template: {
        TemplateId: 'template_123456',
      },
    });

    quickSightClientMock.on(DeleteTemplateCommand).resolvesOnce({
    });

    quickSightClientMock.on(CreateTemplateCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:template/test_template',
      Status: 200,
    });

    try {
      await handler(vpcConnectionAccessEvent, context) as CdkCustomResourceResponse;
    } catch (e) {
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSourceCommand, 1);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSourceCommand, 0);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSourceCommand, 1);
      return;
    }

    fail('No exception happened when CreateDataSourceCommand failed');

  });

  test('Create QuichSight datasource - create template exception', async () => {

    quickSightClientMock.on(DescribeDataSourceCommand).resolves({
      DataSource: {
        DataSourceId: 'datasource_123456',
      },
      RequestId: 'request-123',
      Status: 200,
    });

    quickSightClientMock.on(DeleteDataSourceCommand).resolves({
    });

    quickSightClientMock.on(CreateDataSourceCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:datasource/test_datasource',
      Status: 200,
    });

    quickSightClientMock.on(DescribeTemplateCommand).resolves({
      Template: {
        TemplateId: 'template_123456',
      },
    });

    quickSightClientMock.on(DeleteTemplateCommand).resolvesOnce({
    });

    quickSightClientMock.on(CreateTemplateCommand).rejects();

    try {
      await handler(vpcConnectionAccessEvent, context) as CdkCustomResourceResponse;
    } catch (e) {
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeTemplateCommand, 1);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteTemplateCommand, 0);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateTemplateCommand, 1);
      return;
    }

    fail('No exception happened when CreateTemplateCommand failed');
  });

  test('Custom resource update', async () => {

    quickSightClientMock.on(DescribeDataSourceCommand).resolves({
      DataSource: {
        DataSourceId: 'datasource_123456',
      },
      RequestId: 'request-123',
      Status: 200,
    });

    quickSightClientMock.on(DeleteDataSourceCommand).resolves({
    });

    quickSightClientMock.on(CreateDataSourceCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:datasource/test_datasource',
      Status: 200,
    });

    quickSightClientMock.on(DescribeTemplateCommand).resolves({
      Template: {
        TemplateId: 'template_123456',
      },
    });

    quickSightClientMock.on(DeleteTemplateCommand).resolves({
    });

    quickSightClientMock.on(CreateTemplateCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:template/test_template',
      Status: 200,
    });


    quickSightClientMock.on(DescribeDataSetCommand).resolves({
      DataSet: {
        DataSetId: 'dataset_0',
      },
    });
    quickSightClientMock.on(DeleteDataSetCommand).resolves({
    });

    quickSightClientMock.on(CreateDataSetCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_0',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_1',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_2',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_3',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_4',
      Status: 200,
    });

    quickSightClientMock.on(DescribeAnalysisCommand).resolves({
      Analysis: {
        AnalysisId: 'analysis_0',
      },
    });
    quickSightClientMock.on(DeleteAnalysisCommand).resolves({
    });

    quickSightClientMock.on(CreateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      Status: 200,
    });

    quickSightClientMock.on(DescribeDashboardCommand).resolves({
      Dashboard: {
        DashboardId: 'dashboard_0',
      },
    });
    quickSightClientMock.on(DeleteDashboardCommand).resolves({
    });

    quickSightClientMock.on(CreateDashboardCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dashboard/dashboard_0',
      Status: 200,
    });

    const resp = await handler(updateEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSourceCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSourceCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSourceCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeTemplateCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteTemplateCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateTemplateCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 10);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 5);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 1);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 0);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(resp.Data?.dashboards[0]).toEqual('arn:aws:quicksight:us-east-1:xxxxxxxxxx:dashboard/dashboard_0');

  });

  test('Custom resource delete', async () => {

    const resp = await handler(deleteEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSourceCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSourceCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSourceCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeTemplateCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteTemplateCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateTemplateCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 0);

    expect(resp.Data!.dashboards).toHaveLength(0);
  });

  test('Custom resource multi update', async () => {

    const error = new ResourceNotFoundException({
      message: 'ResourceNotFoundException',
      $metadata: {},
    });

    quickSightClientMock.on(DescribeDataSourceCommand).resolvesOnce({
      DataSource: {
        DataSourceId: 'clickstream_quicksight_data_source_v1_test-database-name_test1',
      },
      RequestId: 'request-123',
      Status: 200,
    }).rejectsOnce(error).resolvesOnce({
      DataSource: {
        DataSourceId: 'clickstream_quicksight_data_source_v1_test-database-name_test1',
      },
      RequestId: 'request-123',
      Status: 200,
    }).resolvesOnce({
      DataSource: {
        DataSourceId: 'datasource_123456',
      },
      RequestId: 'request-123',
      Status: 200,
    }).resolvesOnce({
      DataSource: {
        DataSourceId: 'datasource_123456',
      },
      RequestId: 'request-123',
      Status: 200,
    });

    quickSightClientMock.on(DeleteDataSourceCommand).resolves({
    });

    quickSightClientMock.on(CreateDataSourceCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:datasource/test_datasource',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:datasource/zzzz',
      Status: 200,
    });

    quickSightClientMock.on(DescribeTemplateCommand).resolvesOnce({
      Template: {
        TemplateId: 'clickstream_quicksight_template_v1_test-database-name_test1',
      },
    }).rejectsOnce(error).resolvesOnce({
      Template: {
        TemplateId: 'clickstream_quicksight_template_v1_test-database-name_test1',
      },
      RequestId: 'request-123',
      Status: 200,
    }).resolvesOnce({
      Template: {
        TemplateId: 'clickstream_quicksight_template_v1_test-database-name_0000',
      },
    }).resolvesOnce({
      Template: {
        TemplateId: 'clickstream_quicksight_template_v1_test-database-name_0000',
      },
    });

    quickSightClientMock.on(DeleteTemplateCommand).resolves({
    });

    quickSightClientMock.on(CreateTemplateCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:template/test_template',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:template/zzzz',
      Status: 200,
    });

    quickSightClientMock.on(DescribeDataSetCommand).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_DAILY_ACTIVE_USER_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).rejectsOnce(error).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_DAILY_ACTIVE_USER_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).rejectsOnce(error).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_SESSION_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).rejectsOnce(error).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_SESSION_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_RETENTION_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).rejectsOnce(error).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_RETENTION_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_DAU_WAU_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).rejectsOnce(error).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_DAU_WAU_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_DAILY_ACTIVE_USER_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_DAILY_ACTIVE_USER_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_SESSION_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_SESSION_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_RETENTION_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_RETENTION_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_DAU_WAU_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: `dataset_${CLICKSTREAM_DAU_WAU_VIEW_PLACEHOLDER}_v1_test-database-name_test1`,
      },
    });

    quickSightClientMock.on(DeleteDataSetCommand).resolves({
    });

    quickSightClientMock.on(CreateDataSetCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_0',
      Status: 200,
    });

    quickSightClientMock.on(DescribeAnalysisCommand).resolvesOnce({
      Analysis: {
        AnalysisId: 'clickstream_analysis_v1_test-database-name_test1',
      },
    }).rejectsOnce(error).resolvesOnce({
      Analysis: {
        AnalysisId: 'clickstream_analysis_v1_test-database-name_test1',
      },
    }).resolvesOnce({
      Analysis: {
        AnalysisId: 'zzzz',
      },
    }).resolvesOnce({
      Analysis: {
        AnalysisId: 'zzzz',
      },
    });

    quickSightClientMock.on(DeleteAnalysisCommand).resolves({
    });

    quickSightClientMock.on(CreateAnalysisCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/zzzz',
      Status: 200,
    });

    quickSightClientMock.on(DescribeDashboardCommand).resolvesOnce({
      Dashboard: {
        DashboardId: 'clickstream_dashboard_v1_test-database-name_test1',
      },
    }).rejectsOnce(error).resolvesOnce({
      Dashboard: {
        DashboardId: 'clickstream_dashboard_v1_test-database-name_test1',
      },
    }).resolvesOnce({
      Dashboard: {
        DashboardId: 'zzzz',
      },
    }).resolvesOnce({
      Dashboard: {
        DashboardId: 'zzzz',
      },
    });

    quickSightClientMock.on(DeleteDashboardCommand).resolves({
    });

    quickSightClientMock.on(CreateDashboardCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dashboard/clickstream_dashboard_v1_test-database-name_test1',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dashboard/clickstream_dashboard_v1_test-database-name_zzzz',
      Status: 200,
    });

    const resp = await handler(multiUpdateEvent, context) as CdkCustomResourceResponse;

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSourceCommand, 5);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSourceCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSourceCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeTemplateCommand, 5);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteTemplateCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateTemplateCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 5);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 5);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 25);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 10);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 2);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 5);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 1);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(resp.Data?.dashboards[0]).toEqual('arn:aws:quicksight:us-east-1:xxxxxxxxxx:dashboard/clickstream_dashboard_v1_test-database-name_test1');
    expect(resp.Data?.dashboards[1]).toEqual('arn:aws:quicksight:us-east-1:xxxxxxxxxx:dashboard/clickstream_dashboard_v1_test-database-name_zzzz');
  });

});
