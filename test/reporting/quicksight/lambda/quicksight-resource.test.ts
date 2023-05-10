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
  DeleteAnalysisCommand,
  DeleteDashboardCommand,
  DeleteDataSetCommand,
  DeleteDataSourceCommand,
  DescribeAnalysisCommand,
  DescribeDashboardCommand,
  DescribeDataSetCommand,
  DescribeDataSourceCommand,
  QuickSightClient,
  ResourceNotFoundException,
} from '@aws-sdk/client-quicksight';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { CdkCustomResourceResponse } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { logger } from '../../../../src/common/powertools';
import { handler } from '../../../../src/reporting/lambda/custom-resource/quicksight/index';
import {
  clickstream_ods_flattened_view_columns,
  clickstream_user_dim_view_columns,
} from '../../../../src/reporting/lambda/custom-resource/quicksight/resources-def';
import {
  CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER,
  CLICKSTREAM_USER_DIM_VIEW_PLACEHOLDER,
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
  const suffix = 'test1';

  const commonProps = {
    awsAccountId: 'xxxxxxxxxx',
    awsRegion: 'us-east-1',
    awsPartition: 'aws',
    quickSightNamespace: 'default',
    quickSightUser: 'clickstream',
    quickSightPrincipalArn: 'test-principal-arn',
    databaseName: 'test-database',
    templateArn: 'test-template-arn',

    dashboardDefProps: {
      analysisName: 'Clickstream Analysis',
      dashboardName: 'Clickstream Dashboard',
      templateArn: 'test-template-arn',
      databaseName: 'test-database-name',
      dataSource: {
        name: 'Clickstream Quicksight Data Source',
        suffix,
        endpoint: 'test.example.com',
        port: 5439,
        databaseName: ['test-database-name'],
        credentialParameter: 'test-parameter',
        vpcConnectionArn: 'test-vpc-connection',
      },
      dataSets: [
        {
          name: 'User Dim Data Set',
          tableName: CLICKSTREAM_USER_DIM_VIEW_PLACEHOLDER,
          importMode: 'DIRECT_QUERY',
          columns: clickstream_user_dim_view_columns,
          columnGroups: [
            {
              geoSpatialColumnGroupName: 'geo',
              geoSpatialColumnGroupColumns: [
                'first_visit_country',
                'first_visit_city',
              ],
            },
          ],
          projectedColumns: [
            'user_pseudo_id',
            'user_id',
            'first_visit_date',
            'first_visit_install_source',
            'first_visit_device_language',
            'first_platform',
            'first_visit_country',
            'first_visit_city',
            'first_traffic_source_source',
            'first_traffic_source_medium',
            'first_traffic_source_name',
            'custom_attr_key',
            'custom_attr_value',
            'is_registered',
          ],
          tagColumnOperations: [
            {
              columnName: 'first_visit_city',
              columnGeographicRoles: ['CITY'],
            },
            {
              columnName: 'first_visit_country',
              columnGeographicRoles: ['COUNTRY'],
            },
          ],
        },
        {
          name: 'ODS Flattened Data Set',
          tableName: CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER,
          importMode: 'DIRECT_QUERY',
          columns: clickstream_ods_flattened_view_columns,
        },
      ],
    },
  };

  const basicEvent = {
    ...basicCloudFormationEvent,
    ResourceProperties: {
      ...basicCloudFormationEvent.ResourceProperties,
      ...commonProps,
      schemas: 'test1',
    },

  };

  const emptyAppIdEvent = {
    ...basicCloudFormationEvent,
    ResourceProperties: {
      ...basicCloudFormationEvent.ResourceProperties,
      ...commonProps,
      schemas: '',
    },

  };

  const updateEvent = {
    ...basicCloudFormationUpdateEvent,
    ResourceProperties: {
      ...basicCloudFormationUpdateEvent.ResourceProperties,
      ...commonProps,
      schemas: 'test1',
    },
  };

  const multiUpdateEvent = {
    ...basicCloudFormationUpdateEvent,
    ResourceProperties: {
      ...basicCloudFormationUpdateEvent.ResourceProperties,
      ...commonProps,
      schemas: 'test1,zzzz',
    },
  };

  const deleteEvent = {
    ...basicCloudFormationDeleteEvent,
    ResourceProperties: {
      ...basicCloudFormationDeleteEvent.ResourceProperties,
      ...commonProps,
      schemas: 'test1',
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
      DashboardId: 'dashboard_0',
      Status: 200,
    });

    const resp = await handler(vpcConnectionAccessEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSourceCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSourceCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSourceCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 4);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 1);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 0);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(JSON.parse(resp.Data?.dashboards)).toHaveLength(1);
    logger.info(`#dashboards#:${resp.Data?.dashboards}`);
    expect(JSON.parse(resp.Data?.dashboards)[0].dashboardId).toEqual('dashboard_0');

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
      DashboardId: 'dashboard_0',
      Status: 200,
    });

    const resp = await handler(publicAccessEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSourceCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSourceCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSourceCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 4);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 1);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 0);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(JSON.parse(resp.Data?.dashboards)).toHaveLength(1);
    logger.info(`#dashboards#:${resp.Data?.dashboards}`);
    expect(JSON.parse(resp.Data?.dashboards)[0].dashboardId).toEqual('dashboard_0');

  });


  test('Create QuichSight dashboard - resource already exist', async () => {

    const error = new ResourceNotFoundException({
      message: 'ResourceNotFoundException',
      $metadata: {},
    });

    quickSightClientMock.on(DescribeDataSourceCommand).resolvesOnce({
      DataSource: {
        DataSourceId: 'clickstream_datasource_v1_test-database-name_test1',
      },
      RequestId: 'request-123',
      Status: 200,
    }).rejectsOnce(error).resolvesOnce({
      DataSource: {
        DataSourceId: 'clickstream_datasource_v1_test-database-name_test1',
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

    quickSightClientMock.on(DescribeDataSetCommand).resolvesOnce({
      DataSet: {
        DataSetId: `clickstream_dataset_v1_${CLICKSTREAM_USER_DIM_VIEW_PLACEHOLDER}_test-database-name_test1`,
      },
    }).rejectsOnce(error).resolvesOnce({
      DataSet: {
        DataSetId: `clickstream_dataset_v1_${CLICKSTREAM_USER_DIM_VIEW_PLACEHOLDER}_test-database-name_test1`,
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: `clickstream_dataset_v1_${CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER}_test-database-name_test1`,
      },
    }).rejectsOnce(error).resolvesOnce({
      DataSet: {
        DataSetId: `clickstream_dataset_v1_${CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER}_test-database-name_test1`,
      },
    });


    quickSightClientMock.on(DeleteDataSetCommand).resolves({
    });

    quickSightClientMock.on(CreateDataSetCommand).resolvesOnce({
      Arn: `arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/clickstream_dataset_v1_${CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER}_test-database-name_test1`,
      Status: 200,
    }).resolvesOnce({
      Arn: `arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/clickstream_dataset_v1_${CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER}_test-database-name_test1`,
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
      DashboardId: 'clickstream_dashboard_v1_test-database-name_test1',
      Status: 200,
    });

    const resp = await handler(publicAccessEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSourceCommand, 3);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSourceCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSourceCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 3);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 3);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 6);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 1);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 1);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(JSON.parse(resp.Data?.dashboards)).toHaveLength(1);
    logger.info(`#dashboards#:${resp.Data?.dashboards}`);
    expect(JSON.parse(resp.Data?.dashboards)[0].dashboardId).toEqual('clickstream_dashboard_v1_test-database-name_test1');


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
      DashboardId: 'dashboard_0',
      Status: 200,
    });

    const resp = await handler(updateEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSourceCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSourceCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSourceCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 4);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 1);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 0);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(JSON.parse(resp.Data?.dashboards)).toHaveLength(1);
    logger.info(`#dashboards#:${resp.Data?.dashboards}`);
    expect(JSON.parse(resp.Data?.dashboards)[0].dashboardId).toEqual('dashboard_0');

  });

  test('Custom resource delete', async () => {

    const resp = await handler(deleteEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSourceCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSourceCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSourceCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 0);

    expect(JSON.parse(resp.Data?.dashboards)).toHaveLength(0);
  });

  test('Empty app ids', async () => {

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

    const resp = await handler(emptyAppIdEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSourceCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSourceCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSourceCommand, 1);

    expect(JSON.parse(resp.Data?.dashboards)).toHaveLength(0);
  });

  test('Custom resource multi update', async () => {

    const error = new ResourceNotFoundException({
      message: 'ResourceNotFoundException',
      $metadata: {},
    });

    quickSightClientMock.on(DescribeDataSourceCommand).resolvesOnce({
      DataSource: {
        DataSourceId: 'clickstream_datasource_v1_test-database-name_test1',
      },
      RequestId: 'request-123',
      Status: 200,
    }).rejectsOnce(error).resolvesOnce({
      DataSource: {
        DataSourceId: 'clickstream_datasource_v1_test-database-name_test1',
      },
      RequestId: 'request-123',
      Status: 200,
    });

    quickSightClientMock.on(DeleteDataSourceCommand).resolves({
    });

    quickSightClientMock.on(CreateDataSourceCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:datasource/clickstream_datasource_v1_test-database-name_test1',
      Status: 200,
    });

    quickSightClientMock.on(DescribeDataSetCommand).resolvesOnce({
      DataSet: {
        DataSetId: `clickstream_dataset_v1_${CLICKSTREAM_USER_DIM_VIEW_PLACEHOLDER}_test-database-name_test1`,
      },
    }).rejectsOnce(error).resolvesOnce({
      DataSet: {
        DataSetId: `clickstream_dataset_v1_${CLICKSTREAM_USER_DIM_VIEW_PLACEHOLDER}_test-database-name_test1`,
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: `clickstream_dataset_v1_${CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER}_test-database-name_test1`,
      },
    }).rejectsOnce(error).resolvesOnce({
      DataSet: {
        DataSetId: `clickstream_dataset_v1_${CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER}_test-database-name_test1`,
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: 'zzzz',
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: 'zzzz',
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: 'zzzz',
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: 'zzzz',
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
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/clickstream_analysis_v1_test-database-name_test1',
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
      DashboardId: 'clickstream_dashboard_v1_test-database-name_test1',
      Status: 200,
    }).resolvesOnce({
      DashboardId: 'zzzz',
      Status: 200,
    });

    const resp = await handler(multiUpdateEvent, context) as CdkCustomResourceResponse;

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSourceCommand, 3);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSourceCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSourceCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 5);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 5);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 10);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 4);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 2);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 1);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(JSON.parse(resp.Data?.dashboards)[0].dashboardId).toEqual('clickstream_dashboard_v1_test-database-name_test1');
    expect(JSON.parse(resp.Data?.dashboards)[1].dashboardId).toEqual('zzzz');
  });

});
