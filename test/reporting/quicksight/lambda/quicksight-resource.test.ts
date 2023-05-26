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
  DeleteAnalysisCommand,
  DeleteDashboardCommand,
  DeleteDataSetCommand,
  DescribeAnalysisCommand,
  DescribeDashboardCommand,
  DescribeDataSetCommand,
  QuickSightClient,
  ResourceExistsException,
  ResourceNotFoundException,
  UpdateAnalysisCommand,
  UpdateDashboardCommand,
  UpdateDataSetCommand,
} from '@aws-sdk/client-quicksight';
import { CdkCustomResourceResponse } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { logger } from '../../../../src/common/powertools';
import { handler } from '../../../../src/reporting/lambda/custom-resource/quicksight/index';
import {
  CLICKSTREAM_SESSION_VIEW_PLACEHOLDER,
  CLICKSTREAM_USER_DIM_VIEW_PLACEHOLDER,
} from '../../../../src/reporting/private/dashboard';
import { clickstream_session_view_columns, clickstream_user_dim_view_columns } from '../../../../src/reporting/private/template-def';
import { getMockContext } from '../../../common/lambda-context';
import 'aws-sdk-client-mock-jest';
import {
  basicCloudFormationDeleteEvent,
  basicCloudFormationEvent,
  basicCloudFormationUpdateEvent,
} from '../../../common/lambda-events';

describe('QuickSight Lambda function', () => {

  const context = getMockContext();
  const quickSightClientMock = mockClient(QuickSightClient);

  const existError = new ResourceExistsException({
    message: 'ResourceExistsException',
    $metadata: {},
  });
  const notExistError = new ResourceNotFoundException({
    message: 'ResourceNotFoundException',
    $metadata: {},
  });

  const commonProps = {
    awsAccountId: 'xxxxxxxxxx',
    awsRegion: 'us-east-1',
    awsPartition: 'aws',
    quickSightNamespace: 'default',
    quickSightUser: 'clickstream',
    quickSightPrincipalArn: 'test-principal-arn',
    databaseName: 'test-database',
    templateArn: 'test-template-arn',
    vpcConnectionArn: 'arn:aws:quicksight:ap-southeast-1:xxxxxxxxxx:vpcConnection/test',

    dashboardDefProps: {
      analysisName: 'Clickstream Analysis',
      dashboardName: 'Clickstream Dashboard',
      templateArn: 'test-template-arn',
      databaseName: 'test-database-name',
      dataSourceArn: 'test-datasource',
      dataSets: [
        {
          name: 'User Dim Data Set',
          tableName: CLICKSTREAM_USER_DIM_VIEW_PLACEHOLDER,
          importMode: 'DIRECT_QUERY',
          columns: clickstream_user_dim_view_columns,
          customSql: `select * from {{schema}}.${CLICKSTREAM_USER_DIM_VIEW_PLACEHOLDER}`,
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
          tableName: CLICKSTREAM_SESSION_VIEW_PLACEHOLDER,
          importMode: 'DIRECT_QUERY',
          customSql: `select * from {{schema}}.${CLICKSTREAM_SESSION_VIEW_PLACEHOLDER}`,
          columns: clickstream_session_view_columns,
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

  const multiAppIdEvent = {
    ...basicCloudFormationEvent,
    ResourceProperties: {
      ...basicCloudFormationEvent.ResourceProperties,
      ...commonProps,
      schemas: 'test1,zzzz',
    },
  };

  const updateEvent = {
    ...basicCloudFormationUpdateEvent,
    ResourceProperties: {
      ...basicCloudFormationUpdateEvent.ResourceProperties,
      ...commonProps,
      schemas: 'test1',
    },
    OldResourceProperties: {
      ...basicCloudFormationUpdateEvent.ResourceProperties,
      ...commonProps,
      schemas: 'test1',
    },
  };

  const updateFromEmptyEvent = {
    ...basicCloudFormationUpdateEvent,
    ResourceProperties: {
      ...basicCloudFormationUpdateEvent.ResourceProperties,
      ...commonProps,
      schemas: 'test1',
    },
    OldResourceProperties: {
      ...basicCloudFormationUpdateEvent.ResourceProperties,
      ...commonProps,
      schemas: '',
    },
  };

  const multiSchemaUpdateEvent = {
    ...basicCloudFormationUpdateEvent,
    ResourceProperties: {
      ...basicCloudFormationUpdateEvent.ResourceProperties,
      ...commonProps,
      schemas: 'test1,zzzz',
    },
    OldResourceProperties: {
      ...basicCloudFormationUpdateEvent.ResourceProperties,
      ...commonProps,
      schemas: 'test1,zzzz',
    },
  };

  const multiSchemaUpdateWithDeleteEvent = {
    ...basicCloudFormationUpdateEvent,
    ResourceProperties: {
      ...basicCloudFormationUpdateEvent.ResourceProperties,
      ...commonProps,
      schemas: 'test1',
    },
    OldResourceProperties: {
      ...basicCloudFormationUpdateEvent.ResourceProperties,
      ...commonProps,
      schemas: 'test1,tttt',
    },
  };

  const multiSchemaUpdateWithDeleteAndCreateEvent = {
    ...basicCloudFormationUpdateEvent,
    ResourceProperties: {
      ...basicCloudFormationUpdateEvent.ResourceProperties,
      ...commonProps,
      schemas: 'test1,zzzz',
    },
    OldResourceProperties: {
      ...basicCloudFormationUpdateEvent.ResourceProperties,
      ...commonProps,
      schemas: 'test1,tttt',
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

  beforeEach(() => {
    quickSightClientMock.reset();
  });

  test('Create QuickSight dashboard - Empty app ids', async () => {
    const resp = await handler(emptyAppIdEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 0);

    expect(JSON.parse(resp.Data?.dashboards)).toHaveLength(0);
  });

  test('Create QuickSight dashboard - One app id', async () => {

    quickSightClientMock.on(DescribeDataSetCommand).resolvesOnce({
      DataSet: {
        DataSetId: 'dataset_0',
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: 'dataset_1',
      },
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
    quickSightClientMock.on(CreateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      Status: 200,
    });

    quickSightClientMock.on(DescribeDashboardCommand).resolves({
      Dashboard: {
        DashboardId: 'dashboard_0',
      },
    });
    quickSightClientMock.on(CreateDashboardCommand).resolvesOnce({
      DashboardId: 'dashboard_0',
      Status: 200,
    });

    const resp = await handler(basicEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 2);

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

  test('Create QuickSight dashboard - Multiple app id', async () => {

    quickSightClientMock.on(DescribeDataSetCommand).resolvesOnce({
      DataSet: {
        DataSetId: 'dataset_0',
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: 'dataset_1',
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: 'dataset_3',
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: 'dataset_4',
      },
    });

    quickSightClientMock.on(CreateDataSetCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_0',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_1',
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
        AnalysisId: 'analysis_0',
      },
    }).resolvesOnce({
      Analysis: {
        AnalysisId: 'analysis_1',
      },
    });

    quickSightClientMock.on(CreateAnalysisCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_1',
      Status: 200,
    });

    quickSightClientMock.on(DescribeDashboardCommand).resolvesOnce({
      Dashboard: {
        DashboardId: 'dashboard_0',
      },
    }).resolvesOnce({
      Dashboard: {
        DashboardId: 'dashboard_1',
      },
    });
    quickSightClientMock.on(CreateDashboardCommand).resolvesOnce({
      DashboardId: 'dashboard_0',
      Status: 200,
    }).resolvesOnce({
      DashboardId: 'dashboard_1',
      Status: 200,
    });

    const resp = await handler(multiAppIdEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 4);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 4);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 2);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 0);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(JSON.parse(resp.Data?.dashboards)).toHaveLength(2);
    logger.info(`#dashboards#:${resp.Data?.dashboards}`);
    expect(JSON.parse(resp.Data?.dashboards)[0].dashboardId).toEqual('dashboard_0');
    expect(JSON.parse(resp.Data?.dashboards)[1].dashboardId).toEqual('dashboard_1');

  });

  test('Create QuickSight dashboard - dataset already exist', async () => {

    quickSightClientMock.on(CreateDataSetCommand).rejectsOnce(existError);
    try {
      await handler(basicEvent, context);
    } catch (e) {
      expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 1);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 0);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 0);
      return;
    }
    fail('No exception happened when create data set when it is already exists');

  });

  test('Create QuickSight dashboard - analysis already exist', async () => {

    quickSightClientMock.on(DescribeDataSetCommand).resolvesOnce({
      DataSet: {
        DataSetId: 'dataset_0',
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: 'dataset_1',
      },
    });

    quickSightClientMock.on(CreateDataSetCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_0',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_1',
      Status: 200,
    });

    quickSightClientMock.on(CreateAnalysisCommand).rejectsOnce(existError);

    try {
      await handler(basicEvent, context);
    } catch (e) {
      expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 2);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 1);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 0);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 2);
      return;
    }
    fail('No exception happened when create analysis when it is already exists');

  });

  test('Create QuickSight dashboard - dashboard already exist', async () => {

    quickSightClientMock.on(DescribeDataSetCommand).resolvesOnce({
      DataSet: {
        DataSetId: 'dataset_0',
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: 'dataset_1',
      },
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
    quickSightClientMock.on(CreateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      Status: 200,
    });

    quickSightClientMock.on(CreateDashboardCommand).rejectsOnce(existError);

    try {
      await handler(basicEvent, context);
    } catch (e) {
      expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 2);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 1);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 1);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 2);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 1);
      return;
    }
    fail('No exception happened when create dashboard when it is already exists');

  });

  test('Delete QuickSight dashboard', async () => {

    quickSightClientMock.on(DescribeDataSetCommand).rejects(notExistError);
    quickSightClientMock.on(DeleteDataSetCommand).resolves({});

    quickSightClientMock.on(DescribeAnalysisCommand).rejects(notExistError);

    quickSightClientMock.on(DeleteAnalysisCommand).resolves({});

    quickSightClientMock.on(DescribeDashboardCommand).rejects(notExistError);
    quickSightClientMock.on(DeleteDashboardCommand).resolves({});

    const resp = await handler(deleteEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 0);

    expect(resp).toBeUndefined();
  });

  test('Update QuickSight dashboard - One app id', async () => {

    quickSightClientMock.on(UpdateDataSetCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_0',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_1',
      Status: 200,
    });

    quickSightClientMock.on(UpdateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      Status: 200,
    });

    quickSightClientMock.on(UpdateDashboardCommand).resolvesOnce({
      DashboardId: 'dashboard_0',
      Status: 200,
    });

    const resp = await handler(updateEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 0);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDashboardCommand, 1);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 0);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(JSON.parse(resp.Data?.dashboards)).toHaveLength(1);
    logger.info(`#dashboards#:${resp.Data?.dashboards}`);
    expect(JSON.parse(resp.Data?.dashboards)[0].dashboardId).toEqual('dashboard_0');

  });

  test('Update QuickSight dashboard - dataset not exist.', async () => {

    quickSightClientMock.on(UpdateDataSetCommand).rejectsOnce(existError);

    try {
      await handler(updateEvent, context);
    } catch (err: any) {
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 0);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 0);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 0);

      expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 0);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 0);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 0);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDataSetCommand, 1);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateAnalysisCommand, 0);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDashboardCommand, 0);

      expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 0);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 0);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 0);

      return;
    }

    fail('No exception happened when update not existing data set');

  });

  test('Update QuickSight dashboard - analysis not exist.', async () => {

    quickSightClientMock.on(UpdateDataSetCommand).rejectsOnce(existError);
    quickSightClientMock.on(UpdateDataSetCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_0',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_1',
      Status: 200,
    });

    quickSightClientMock.on(UpdateAnalysisCommand).rejectsOnce(existError);

    try {
      await handler(updateEvent, context);
    } catch (err: any) {
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 0);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 0);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 0);

      expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 0);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 0);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 0);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDataSetCommand, 2);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateAnalysisCommand, 1);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDashboardCommand, 0);

      expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 0);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 0);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 0);

      return;
    }

    fail('No exception happened when update not existing analysis');

  });

  test('Update QuickSight dashboard - dashboard not exist.', async () => {

    quickSightClientMock.on(UpdateDataSetCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_0',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_1',
      Status: 200,
    });

    quickSightClientMock.on(UpdateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      Status: 200,
    });

    quickSightClientMock.on(UpdateDashboardCommand).rejectsOnce(existError);

    try {
      await handler(updateEvent, context);
    } catch (err: any) {
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 0);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 0);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 0);

      expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 0);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 0);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 0);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDataSetCommand, 2);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateAnalysisCommand, 1);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDashboardCommand, 1);

      expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 0);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 0);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 0);

      return;
    }

    fail('No exception happened when update not existing dashboard');

  });

  test('Update QuickSight dashboard - One app id from empty app id', async () => {

    quickSightClientMock.on(CreateDataSetCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_0',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_1',
      Status: 200,
    });

    quickSightClientMock.on(DescribeDataSetCommand).resolvesOnce({
      DataSet: {
        DataSetId: 'dataset_0',
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: 'dataset_1',
      },
    });

    quickSightClientMock.on(CreateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      Status: 200,
    });
    quickSightClientMock.on(DescribeAnalysisCommand).resolves({
      Analysis: {
        AnalysisId: 'analysis_0',
      },
    });

    quickSightClientMock.on(CreateDashboardCommand).resolvesOnce({
      DashboardId: 'dashboard_0',
      Status: 200,
    });
    quickSightClientMock.on(DescribeDashboardCommand).resolves({
      Dashboard: {
        DashboardId: 'dashboard_0',
      },
    });


    const resp = await handler(updateFromEmptyEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 2);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDashboardCommand, 0);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 0);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(JSON.parse(resp.Data?.dashboards)).toHaveLength(1);
    logger.info(`#dashboards#:${resp.Data?.dashboards}`);
    expect(JSON.parse(resp.Data?.dashboards)[0].dashboardId).toEqual('dashboard_0');

  });

  test('Update QuickSight dashboard - Multiple app id', async () => {

    quickSightClientMock.on(UpdateDataSetCommand).resolvesOnce({
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
    });

    quickSightClientMock.on(UpdateAnalysisCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_1',
      Status: 200,
    });

    quickSightClientMock.on(UpdateDashboardCommand).resolvesOnce({
      DashboardId: 'dashboard_0',
      Status: 200,
    }).resolvesOnce({
      DashboardId: 'dashboard_1',
      Status: 200,
    });

    const resp = await handler(multiSchemaUpdateEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 0);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDataSetCommand, 4);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateAnalysisCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDashboardCommand, 2);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 0);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(JSON.parse(resp.Data?.dashboards)).toHaveLength(2);
    logger.info(`#dashboards#:${resp.Data?.dashboards}`);
    expect(JSON.parse(resp.Data?.dashboards)[0].dashboardId).toEqual('dashboard_0');
    expect(JSON.parse(resp.Data?.dashboards)[1].dashboardId).toEqual('dashboard_1');
  });

  test('Update QuickSight dashboard - Multiple app id with delete app', async () => {

    quickSightClientMock.on(UpdateDataSetCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_0',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_1',
      Status: 200,
    });

    quickSightClientMock.on(CreateDataSetCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_0',
      DataSetId: 'dataset_0',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_1',
      DataSetId: 'dataset_1',
      Status: 200,
    });

    quickSightClientMock.on(DeleteDataSetCommand).resolves({});
    quickSightClientMock.on(DescribeDataSetCommand).rejects(notExistError);

    quickSightClientMock.on(UpdateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      Status: 200,
    });

    quickSightClientMock.on(DeleteAnalysisCommand).resolvesOnce({});
    quickSightClientMock.on(DescribeAnalysisCommand).rejectsOnce(notExistError);

    quickSightClientMock.on(UpdateDashboardCommand).resolvesOnce({
      DashboardId: 'dashboard_0',
      Status: 200,
    });
    quickSightClientMock.on(DeleteDashboardCommand).resolvesOnce({});
    quickSightClientMock.on(DescribeDashboardCommand).rejectsOnce(notExistError);

    const resp = await handler(multiSchemaUpdateWithDeleteEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 2);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDashboardCommand, 1);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 1);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(JSON.parse(resp.Data?.dashboards)).toHaveLength(1);
    logger.info(`#dashboards#:${resp.Data?.dashboards}`);
    expect(JSON.parse(resp.Data?.dashboards)[0].dashboardId).toEqual('dashboard_0');
  });

  test('Update QuickSight dashboard - Multiple app id with delete and create app', async () => {

    quickSightClientMock.on(UpdateDataSetCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_0',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_1',
      Status: 200,
    });

    quickSightClientMock.on(DeleteDataSetCommand).resolves({});
    quickSightClientMock.on(DescribeDataSetCommand)
      .resolvesOnce({
        DataSet: {
          DataSetId: 'dataset_0',
        },
      }).resolvesOnce({
        DataSet: {
          DataSetId: 'dataset_1',
        },
      })
      .rejectsOnce(notExistError)
      .rejectsOnce(notExistError);

    quickSightClientMock.on(UpdateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      AnalysisId: 'analysis_0',
      Status: 200,
    });
    quickSightClientMock.on(CreateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      AnalysisId: 'analysis_1',
      Status: 200,
    });

    quickSightClientMock.on(DeleteAnalysisCommand).resolvesOnce({});
    quickSightClientMock.on(DescribeAnalysisCommand).resolvesOnce({
      Analysis: {
        AnalysisId: 'analysis_0',
      },
    })
      .rejectsOnce(notExistError);

    quickSightClientMock.on(UpdateDashboardCommand).resolvesOnce({
      DashboardId: 'dashboard_0',
      Status: 200,
    });
    quickSightClientMock.on(CreateDashboardCommand).resolvesOnce({
      DashboardId: 'dashboard_1',
      Status: 200,
    });

    quickSightClientMock.on(DeleteDashboardCommand).resolvesOnce({});
    quickSightClientMock.on(DescribeDashboardCommand)
      .resolvesOnce({
        Dashboard: {
          DashboardId: 'dashboard_1',
        },
      })
      .rejectsOnce(notExistError);

    const resp = await handler(multiSchemaUpdateWithDeleteAndCreateEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 4);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDashboardCommand, 1);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 1);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(JSON.parse(resp.Data?.dashboards)).toHaveLength(2);
    logger.info(`#dashboards#:${resp.Data?.dashboards}`);
    expect(JSON.parse(resp.Data?.dashboards)[0].dashboardId).toEqual('dashboard_0');
    expect(JSON.parse(resp.Data?.dashboards)[1].dashboardId).toEqual('dashboard_1');
  });

});
