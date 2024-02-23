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
  CreateFolderCommand,
  CreateFolderMembershipCommand,
  DeleteAnalysisCommand,
  DeleteDashboardCommand,
  DeleteDataSetCommand,
  DeleteFolderCommand,
  DescribeAnalysisCommand,
  DescribeAnalysisDefinitionCommand,
  DescribeDashboardCommand,
  DescribeDashboardDefinitionCommand,
  DescribeDataSetCommand,
  DescribeDataSourceCommand,
  DescribeFolderCommand,
  DescribeTemplateDefinitionCommand,
  ListAnalysesCommand,
  ListDashboardsCommand,
  ListFolderMembersCommand,
  ListTemplateVersionsCommand,
  QuickSightClient,
  ResourceExistsException,
  ResourceNotFoundException,
  ResourceStatus,
  TimeGranularity,
  UpdateAnalysisCommand,
  UpdateAnalysisPermissionsCommand,
  UpdateDashboardCommand,
  UpdateDashboardPermissionsCommand,
  UpdateDashboardPermissionsCommandInput,
  UpdateDashboardPublishedVersionCommand,
  UpdateDataSetCommand,
  UpdateDataSetPermissionsCommand,
  UpdateDataSourcePermissionsCommand,
  UpdateFolderPermissionsCommand,
} from '@aws-sdk/client-quicksight';
import { CdkCustomResourceResponse } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { CLICKSTREAM_SESSION_VIEW_PLACEHOLDER, CLICKSTREAM_USER_DIM_VIEW_PLACEHOLDER, CLICKSTREAM_USER_DIM_VIEW_NAME, CLICKSTREAM_LIFECYCLE_DAILY_VIEW_PLACEHOLDER, CLICKSTREAM_LIFECYCLE_DAILY_VIEW_NAME, CLICKSTREAM_SESSION_VIEW_NAME } from '../../../../src/common/constant';
import { logger } from '../../../../src/common/powertools';
import { handler } from '../../../../src/reporting/lambda/custom-resource/quicksight/index';
import { clickstream_lifecycle_daily_view_columns, clickstream_session_view_columns, clickstream_user_dim_view_columns } from '../../../../src/reporting/private/dataset-col-def';
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
  const tenYearsAgo = new Date('2013-12-12');
  const futureDate = new Date('2033-12-12');

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
    quickSightSharePrincipalArn: 'test-principal-arn',
    quickSightOwnerPrincipalArn: 'test-owner-principal-arn',
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
          customSql: `select * from {{schema}}.${CLICKSTREAM_USER_DIM_VIEW_NAME}`,
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
            'registration_status',
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
          columns: clickstream_session_view_columns,
          customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_SESSION_VIEW_NAME} where session_date >= <<$startDate>> and session_date < DATEADD(DAY, 1, date_trunc('day', <<$endDate>>))`,
          dateTimeDatasetParameter: [
            {
              name: 'startDate',
              timeGranularity: TimeGranularity.DAY,
              defaultValue: tenYearsAgo,
            },
            {
              name: 'endDate',
              timeGranularity: TimeGranularity.DAY,
              defaultValue: futureDate,
            },
          ],
        },
      ],
    },
  };

  const testProps2 = {
    awsAccountId: 'xxxxxxxxxx',
    awsRegion: 'us-east-1',
    awsPartition: 'aws',
    quickSightNamespace: 'default',
    quickSightUser: 'clickstream',
    quickSightSharePrincipalArn: 'test-principal-arn',
    quickSightOwnerPrincipalArn: 'test-owner-principal-arn',
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
          tableName: CLICKSTREAM_USER_DIM_VIEW_PLACEHOLDER,
          importMode: 'DIRECT_QUERY',
          columns: clickstream_user_dim_view_columns,
          customSql: `select * from {{schema}}.${CLICKSTREAM_USER_DIM_VIEW_NAME}`,
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
            'registration_status',
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
          tableName: CLICKSTREAM_SESSION_VIEW_PLACEHOLDER,
          importMode: 'DIRECT_QUERY',
          customSql: `select * from {{schema}}.${CLICKSTREAM_SESSION_VIEW_NAME} where session_date >= <<$startDate>> and session_date < DATEADD(DAY, 1, date_trunc('day', <<$endDate>>))`,
          columns: clickstream_session_view_columns,
          dateTimeDatasetParameter: [
            {
              name: 'startDate',
              timeGranularity: TimeGranularity.DAY,
              defaultValue: tenYearsAgo,
            },
            {
              name: 'endDate',
              timeGranularity: TimeGranularity.DAY,
              defaultValue: futureDate,
            },
          ],
        },
        {
          tableName: CLICKSTREAM_LIFECYCLE_DAILY_VIEW_PLACEHOLDER,
          importMode: 'DIRECT_QUERY',
          customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_LIFECYCLE_DAILY_VIEW_NAME}`,
          columns: clickstream_lifecycle_daily_view_columns,
          projectedColumns: [
            'time_period',
            'this_day_value',
            'sum',
          ],
        },
      ],
    },
  };

  const testProps3 = {
    awsAccountId: 'xxxxxxxxxx',
    awsRegion: 'us-east-1',
    awsPartition: 'aws',
    quickSightNamespace: 'default',
    quickSightUser: 'clickstream',
    quickSightSharePrincipalArn: 'test-principal-arn',
    quickSightOwnerPrincipalArn: 'test-owner-principal-arn',
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
          tableName: 'clickstream_user_dim_view',
          importMode: 'DIRECT_QUERY',
          columns: clickstream_user_dim_view_columns,
          customSql: `select * from {{schema}}.${CLICKSTREAM_USER_DIM_VIEW_NAME}`,
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
            'registration_status',
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
          tableName: CLICKSTREAM_LIFECYCLE_DAILY_VIEW_PLACEHOLDER,
          importMode: 'DIRECT_QUERY',
          customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_LIFECYCLE_DAILY_VIEW_NAME}`,
          columns: clickstream_lifecycle_daily_view_columns,
          projectedColumns: [
            'time_period',
            'this_day_value',
            'sum',
          ],
        },
      ],
    },
  };

  const commonPropsUserChange = {
    awsAccountId: 'xxxxxxxxxx',
    awsRegion: 'us-east-1',
    awsPartition: 'aws',
    quickSightNamespace: 'default',
    quickSightUser: 'clickstream-change',
    quickSightSharePrincipalArn: 'test-principal-arn-change',
    quickSightOwnerPrincipalArn: 'test-principal-arn-change',
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
          customSql: `select * from {{schema}}.${CLICKSTREAM_SESSION_VIEW_PLACEHOLDER} where session_date >= <<$startDate>> and session_date < DATEADD(DAY, 1, date_trunc('day', <<$endDate>>))`,
          columns: clickstream_session_view_columns,
          dateTimeDatasetParameter: [
            {
              name: 'startDate',
              timeGranularity: TimeGranularity.DAY,
              defaultValue: tenYearsAgo,
            },
            {
              name: 'endDate',
              timeGranularity: TimeGranularity.DAY,
              defaultValue: futureDate,
            },
          ],
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

  const oneQuickSightUserEvent = {
    ...basicEvent,
    ResourceProperties: {
      ...basicEvent.ResourceProperties,
      ...commonPropsUserChange,
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

  const updateEventChangePermission = {
    ...basicCloudFormationUpdateEvent,
    ResourceProperties: {
      ...basicCloudFormationUpdateEvent.ResourceProperties,
      ...commonPropsUserChange,
      schemas: 'test1',
    },
    OldResourceProperties: {
      ...basicCloudFormationUpdateEvent.ResourceProperties,
      ...commonProps,
      schemas: 'test1',
    },
  };

  const updateEventWithNewDataSet = {
    ...basicCloudFormationUpdateEvent,
    ResourceProperties: {
      ...basicCloudFormationUpdateEvent.ResourceProperties,
      ...testProps2,
      schemas: 'test1',
    },
    OldResourceProperties: {
      ...basicCloudFormationUpdateEvent.ResourceProperties,
      ...testProps3,
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

    quickSightClientMock.on(DescribeDataSourceCommand).resolves({
      DataSource: {
        Status: ResourceStatus.CREATION_SUCCESSFUL,
      },
    });
    quickSightClientMock.on(UpdateDataSourcePermissionsCommand).resolves({});

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

    quickSightClientMock.on(DescribeAnalysisDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.CREATION_SUCCESSFUL,
    });
    quickSightClientMock.on(CreateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      Status: 200,
    });

    quickSightClientMock.on(DescribeDashboardDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.CREATION_SUCCESSFUL,
    });
    quickSightClientMock.on(CreateDashboardCommand).resolvesOnce({
      DashboardId: 'dashboard_0',
      Status: 200,
    });

    quickSightClientMock.on(DescribeFolderCommand).rejectsOnce(notExistError);

    quickSightClientMock.on(CreateFolderCommand).resolvesOnce({
      FolderId: 'folder_0',
      Status: 200,
    });

    const resp = await handler(basicEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisDefinitionCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardDefinitionCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 2);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 1);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeFolderCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateFolderCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateFolderMembershipCommand, 1);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(JSON.parse(resp.Data?.dashboards)).toHaveLength(1);
    logger.info(`#dashboards#:${resp.Data?.dashboards}`);
    expect(JSON.parse(resp.Data?.dashboards)[0].dashboardId).toEqual('dashboard_0');

  });

  test('Create QuickSight dashboard - folder exists', async () => {

    quickSightClientMock.on(DescribeDataSourceCommand).resolves({
      DataSource: {
        Status: ResourceStatus.CREATION_SUCCESSFUL,
      },
    });
    quickSightClientMock.on(UpdateDataSourcePermissionsCommand).resolves({});

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

    quickSightClientMock.on(DescribeAnalysisDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.CREATION_SUCCESSFUL,
    });
    quickSightClientMock.on(CreateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      Status: 200,
    });

    quickSightClientMock.on(DescribeDashboardDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.CREATION_SUCCESSFUL,
    });
    quickSightClientMock.on(CreateDashboardCommand).resolvesOnce({
      DashboardId: 'dashboard_0',
      Status: 200,
    });

    quickSightClientMock.on(DescribeFolderCommand).resolvesOnce({
      Folder: {
        Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:folder/folder_0',
      },
    });

    quickSightClientMock.on(CreateFolderCommand).resolvesOnce({
      FolderId: 'folder_0',
      Status: 200,
    });

    const resp = await handler(basicEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisDefinitionCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardDefinitionCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 2);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 1);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 0);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeFolderCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateFolderCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateFolderMembershipCommand, 1);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(JSON.parse(resp.Data?.dashboards)).toHaveLength(1);
    logger.info(`#dashboards#:${resp.Data?.dashboards}`);
    expect(JSON.parse(resp.Data?.dashboards)[0].dashboardId).toEqual('dashboard_0');

  });

  test('Create QuickSight dashboard - Multiple app id', async () => {

    quickSightClientMock.on(DescribeDataSourceCommand).resolves({
      DataSource: {
        Status: ResourceStatus.CREATION_SUCCESSFUL,
      },
    });
    quickSightClientMock.on(UpdateDataSourcePermissionsCommand).resolves({});

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

    quickSightClientMock.on(DescribeAnalysisDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.CREATION_SUCCESSFUL,
    });

    quickSightClientMock.on(CreateAnalysisCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_1',
      Status: 200,
    });

    quickSightClientMock.on(DescribeDashboardDefinitionCommand).resolvesOnce({
      ResourceStatus: ResourceStatus.CREATION_SUCCESSFUL,
    }).resolvesOnce({
      ResourceStatus: ResourceStatus.CREATION_SUCCESSFUL,
    });
    quickSightClientMock.on(CreateDashboardCommand).resolvesOnce({
      DashboardId: 'dashboard_0',
      Status: 200,
    }).resolvesOnce({
      DashboardId: 'dashboard_1',
      Status: 200,
    });

    quickSightClientMock.on(CreateFolderCommand).resolvesOnce({
      FolderId: 'folder_0',
      Status: 200,
    }).resolvesOnce({
      FolderId: 'folder_1',
      Status: 200,
    });

    quickSightClientMock.on(DescribeFolderCommand).rejects(notExistError);

    const resp = await handler(multiAppIdEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisDefinitionCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardDefinitionCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 4);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 4);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 2);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeFolderCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateFolderCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateFolderMembershipCommand, 2);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(JSON.parse(resp.Data?.dashboards)).toHaveLength(2);
    logger.info(`#dashboards#:${resp.Data?.dashboards}`);
    expect(JSON.parse(resp.Data?.dashboards)[0].dashboardId).toEqual('dashboard_0');
    expect(JSON.parse(resp.Data?.dashboards)[1].dashboardId).toEqual('dashboard_1');

  });

  test('Create QuickSight dashboard - dataset already exist', async () => {
    quickSightClientMock.on(DescribeDataSourceCommand).resolves({
      DataSource: {
        Status: ResourceStatus.CREATION_SUCCESSFUL,
      },
    });
    quickSightClientMock.on(UpdateDataSourcePermissionsCommand).resolves({});
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

    quickSightClientMock.on(DescribeDataSourceCommand).resolves({
      DataSource: {
        Status: ResourceStatus.CREATION_SUCCESSFUL,
      },
    });
    quickSightClientMock.on(UpdateDataSourcePermissionsCommand).resolves({});
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
    quickSightClientMock.on(DescribeDataSourceCommand).resolves({
      DataSource: {
        Status: ResourceStatus.CREATION_SUCCESSFUL,
      },
    });
    quickSightClientMock.on(UpdateDataSourcePermissionsCommand).resolves({});
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

    quickSightClientMock.on(DescribeAnalysisDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.CREATION_SUCCESSFUL,
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
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisDefinitionCommand, 1);
      return;
    }
    fail('No exception happened when create dashboard when it is already exists');

  });

  test('Delete QuickSight dashboard', async () => {

    quickSightClientMock.on(DescribeDataSetCommand).rejects(notExistError);
    quickSightClientMock.on(DeleteDataSetCommand).resolves({});

    quickSightClientMock.on(DescribeAnalysisDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.DELETED,
    });

    quickSightClientMock.on(DeleteAnalysisCommand).resolves({});

    quickSightClientMock.on(DescribeDashboardDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.DELETED,
    });
    quickSightClientMock.on(DeleteDashboardCommand).resolves({});

    const resp = await handler(deleteEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisDefinitionCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardDefinitionCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 0);

    expect(resp).toBeUndefined();
  });

  test('Update QuickSight dashboard - One app id', async () => {

    quickSightClientMock.on(DescribeDataSourceCommand).resolves({
      DataSource: {
        Status: ResourceStatus.UPDATE_SUCCESSFUL,
      },
    });
    quickSightClientMock.on(UpdateDataSourcePermissionsCommand).resolves({});

    quickSightClientMock.on(UpdateDataSetCommand).resolvesOnce({
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

    quickSightClientMock.on(UpdateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      Status: 200,
    });

    quickSightClientMock.on(UpdateDashboardCommand).resolvesOnce({
      DashboardId: 'dashboard_0',
      Status: 200,
    });

    quickSightClientMock.on(DescribeAnalysisDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    });
    quickSightClientMock.on(DescribeDashboardDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    });
    quickSightClientMock.on(UpdateDataSetPermissionsCommand).resolves({});
    quickSightClientMock.on(UpdateAnalysisPermissionsCommand).resolves({});
    quickSightClientMock.on(UpdateDashboardPermissionsCommand).resolves({});

    quickSightClientMock.on(DescribeTemplateDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    });

    quickSightClientMock.on(ListTemplateVersionsCommand).resolves({
      TemplateVersionSummaryList: [
        {
          VersionNumber: 1,
        },
      ],
    });

    quickSightClientMock.on(UpdateDashboardPublishedVersionCommand).resolves({
      DashboardId: 'dashboard_0',
    });

    const resp = await handler(updateEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisDefinitionCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardDefinitionCommand, 1);

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

  test('Update QuickSight dashboard - template change', async () => {

    quickSightClientMock.on(DescribeDataSourceCommand).resolves({
      DataSource: {
        Status: ResourceStatus.UPDATE_SUCCESSFUL,
      },
    });
    quickSightClientMock.on(UpdateDataSourcePermissionsCommand).resolves({});

    quickSightClientMock.on(UpdateDataSetCommand).resolvesOnce({
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

    quickSightClientMock.on(UpdateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      Status: 200,
    });

    quickSightClientMock.on(UpdateDashboardCommand).callsFakeOnce(input => {
      if (input.SourceEntity.SourceTemplate.Arn !== 'test-template-arn/version/10') {
        throw new Error('template new version is not used.');
      }
      return {
        DashboardId: 'dashboard_0',
        Status: 200,
      };
    });

    quickSightClientMock.on(DescribeAnalysisDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    });
    quickSightClientMock.on(DescribeDashboardDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    });
    quickSightClientMock.on(UpdateDataSetPermissionsCommand).resolves({});
    quickSightClientMock.on(UpdateAnalysisPermissionsCommand).resolves({});
    quickSightClientMock.on(UpdateDashboardPermissionsCommand).resolves({});

    quickSightClientMock.on(DescribeTemplateDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    });

    quickSightClientMock.on(ListTemplateVersionsCommand).resolves({
      TemplateVersionSummaryList: [
        {
          VersionNumber: 10,
        },
      ],
    });

    quickSightClientMock.on(UpdateDashboardPublishedVersionCommand).resolves({
      DashboardId: 'dashboard_0',
    });

    const resp = await handler(updateEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisDefinitionCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardDefinitionCommand, 1);

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

  test('Update QuickSight dashboard - permission update', async () => {

    quickSightClientMock.on(DescribeDataSourceCommand).resolves({
      DataSource: {
        Status: ResourceStatus.UPDATE_SUCCESSFUL,
      },
    });
    quickSightClientMock.on(UpdateDataSourcePermissionsCommand).resolves({});

    quickSightClientMock.on(UpdateDataSetCommand).resolvesOnce({
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

    quickSightClientMock.on(UpdateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      Status: 200,
    });

    quickSightClientMock.on(UpdateDashboardCommand).resolvesOnce({
      DashboardId: 'dashboard_0',
      Status: 200,
    });

    quickSightClientMock.on(DescribeAnalysisDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    });
    quickSightClientMock.on(DescribeDashboardDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    });
    quickSightClientMock.on(UpdateDataSetPermissionsCommand).resolves({});
    quickSightClientMock.on(UpdateAnalysisPermissionsCommand).resolves({});
    quickSightClientMock.on(UpdateDashboardPermissionsCommand).callsFakeOnce(input => {
      if ((input as UpdateDashboardPermissionsCommandInput).GrantPermissions![0].Principal === 'test-principal-arn-change') {
        return {};
      }
      throw new Error('New principal is not take effect.');
    });

    quickSightClientMock.on(DescribeTemplateDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    });

    quickSightClientMock.on(ListTemplateVersionsCommand).resolves({
      TemplateVersionSummaryList: [
        {
          VersionNumber: 1,
        },
      ],
    });

    quickSightClientMock.on(UpdateDashboardPublishedVersionCommand).resolves({
      DashboardId: 'dashboard_0',
    });

    const resp = await handler(updateEventChangePermission, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisDefinitionCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardDefinitionCommand, 1);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDashboardCommand, 1);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 0);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDataSetPermissionsCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateAnalysisPermissionsCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDashboardPermissionsCommand, 1);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(JSON.parse(resp.Data?.dashboards)).toHaveLength(1);
    logger.info(`#dashboards#:${resp.Data?.dashboards}`);
    expect(JSON.parse(resp.Data?.dashboards)[0].dashboardId).toEqual('dashboard_0');

  });

  test('Update QuickSight dashboard - dataset not exist.', async () => {

    quickSightClientMock.on(DescribeDataSourceCommand).resolves({
      DataSource: {
        Status: ResourceStatus.UPDATE_SUCCESSFUL,
      },
    });
    quickSightClientMock.on(UpdateDataSourcePermissionsCommand).resolves({});

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

    quickSightClientMock.on(DescribeDataSourceCommand).resolves({
      DataSource: {
        Status: ResourceStatus.UPDATE_SUCCESSFUL,
      },
    });
    quickSightClientMock.on(UpdateDataSourcePermissionsCommand).resolves({});

    quickSightClientMock.on(UpdateDataSetCommand).resolvesOnce({
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

    quickSightClientMock.on(UpdateAnalysisCommand).rejectsOnce(existError);

    quickSightClientMock.on(DescribeTemplateDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    });

    quickSightClientMock.on(ListTemplateVersionsCommand).resolves({
      TemplateVersionSummaryList: [
        {
          VersionNumber: 1,
        },
      ],
    });

    quickSightClientMock.on(UpdateDashboardPublishedVersionCommand).resolves({
      DashboardId: 'dashboard_0',
    });

    try {
      await handler(updateEvent, context);
    } catch (err: any) {
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 1);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 0);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 2);

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

    quickSightClientMock.on(DescribeDataSourceCommand).resolves({
      DataSource: {
        Status: ResourceStatus.UPDATE_SUCCESSFUL,
      },
    });
    quickSightClientMock.on(UpdateDataSourcePermissionsCommand).resolves({});

    quickSightClientMock.on(UpdateDataSetCommand).resolvesOnce({
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

    quickSightClientMock.on(UpdateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      Status: 200,
    });

    quickSightClientMock.on(DescribeTemplateDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    });

    quickSightClientMock.on(DescribeAnalysisDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    });

    quickSightClientMock.on(ListTemplateVersionsCommand).resolves({
      TemplateVersionSummaryList: [
        {
          VersionNumber: 1,
        },
      ],
    });

    quickSightClientMock.on(UpdateDashboardPublishedVersionCommand).resolves({
      DashboardId: 'dashboard_0',
    });

    quickSightClientMock.on(UpdateDashboardCommand).rejectsOnce(existError);

    try {
      await handler(updateEvent, context);
    } catch (err: any) {
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 1);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 1);
      expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 2);

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

    quickSightClientMock.on(DescribeDataSourceCommand).resolves({
      DataSource: {
        Status: ResourceStatus.UPDATE_SUCCESSFUL,
      },
    });
    quickSightClientMock.on(UpdateDataSourcePermissionsCommand).resolves({});

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
    quickSightClientMock.on(DescribeAnalysisDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    });

    quickSightClientMock.on(CreateDashboardCommand).resolvesOnce({
      DashboardId: 'dashboard_0',
      Status: 200,
    });
    quickSightClientMock.on(DescribeDashboardDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    });

    quickSightClientMock.on(CreateFolderCommand).resolvesOnce({
      FolderId: 'folder_0',
      Status: 200,
    });

    quickSightClientMock.on(DescribeFolderCommand).rejects(notExistError);

    const resp = await handler(updateFromEmptyEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisDefinitionCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardDefinitionCommand, 1);
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

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeFolderCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateFolderCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateFolderMembershipCommand, 1);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(JSON.parse(resp.Data?.dashboards)).toHaveLength(1);
    logger.info(`#dashboards#:${resp.Data?.dashboards}`);
    expect(JSON.parse(resp.Data?.dashboards)[0].dashboardId).toEqual('dashboard_0');

  });

  test('Update QuickSight dashboard - Multiple app id', async () => {

    quickSightClientMock.on(DescribeDataSourceCommand).resolves({
      DataSource: {
        Status: ResourceStatus.UPDATE_SUCCESSFUL,
      },
    });
    quickSightClientMock.on(UpdateDataSourcePermissionsCommand).resolves({});

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
        DataSetId: 'dataset_0',
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: 'dataset_1',
      },
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

    quickSightClientMock.on(DescribeAnalysisDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    });

    quickSightClientMock.on(DescribeDashboardDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    });

    quickSightClientMock.on(DescribeTemplateDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    });

    quickSightClientMock.on(ListTemplateVersionsCommand).resolves({
      TemplateVersionSummaryList: [
        {
          VersionNumber: 1,
        },
      ],
    });

    quickSightClientMock.on(UpdateDashboardPublishedVersionCommand).resolves({
      DashboardId: 'dashboard_0',
    });

    const resp = await handler(multiSchemaUpdateEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardDefinitionCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisDefinitionCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 4);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDataSetCommand, 4);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateAnalysisCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDashboardCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateFolderPermissionsCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSourceCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDataSourcePermissionsCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDataSetPermissionsCommand, 4);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateAnalysisPermissionsCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDashboardPermissionsCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeTemplateDefinitionCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(ListTemplateVersionsCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDashboardPublishedVersionCommand, 2);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(JSON.parse(resp.Data?.dashboards)).toHaveLength(2);
    logger.info(`#dashboards#:${resp.Data?.dashboards}`);
    expect(JSON.parse(resp.Data?.dashboards)[0].dashboardId).toEqual('dashboard_0');
    expect(JSON.parse(resp.Data?.dashboards)[1].dashboardId).toEqual('dashboard_1');
  });

  test('Update QuickSight dashboard - Multiple app id with delete app', async () => {

    quickSightClientMock.on(DescribeDataSourceCommand).resolves({
      DataSource: {
        Status: ResourceStatus.UPDATE_SUCCESSFUL,
      },
    });
    quickSightClientMock.on(UpdateDataSourcePermissionsCommand).resolves({});

    quickSightClientMock.on(UpdateDataSetCommand).resolvesOnce({
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

    quickSightClientMock.on(DeleteDataSetCommand).rejects(notExistError);

    quickSightClientMock.on(UpdateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      Status: 200,
    });

    quickSightClientMock.on(DeleteAnalysisCommand).resolvesOnce({});
    quickSightClientMock.on(DescribeAnalysisDefinitionCommand)
      .resolvesOnce({
        ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
      })
      .rejects(notExistError);

    quickSightClientMock.on(UpdateDashboardCommand).resolvesOnce({
      DashboardId: 'dashboard_0',
      Status: 200,
    });
    quickSightClientMock.on(DeleteDashboardCommand).resolvesOnce({});
    quickSightClientMock.on(DescribeDashboardDefinitionCommand)
      .resolvesOnce({
        ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
      })
      .rejects(notExistError);

    quickSightClientMock.on(DescribeTemplateDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    });

    quickSightClientMock.on(ListTemplateVersionsCommand).resolves({
      TemplateVersionSummaryList: [
        {
          VersionNumber: 1,
        },
      ],
    });

    quickSightClientMock.on(UpdateDashboardPublishedVersionCommand).resolves({
      DashboardId: 'dashboard_0',
    });

    const resp = await handler(multiSchemaUpdateWithDeleteEvent, context) as CdkCustomResourceResponse;

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisDefinitionCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardDefinitionCommand, 2);
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

    quickSightClientMock.on(DescribeDataSourceCommand).resolves({
      DataSource: {
        Status: ResourceStatus.UPDATE_SUCCESSFUL,
      },
    });
    quickSightClientMock.on(UpdateDataSourcePermissionsCommand).resolves({});

    quickSightClientMock.on(UpdateDataSetCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_0',
      Status: 200,
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_1',
      Status: 200,
    });

    quickSightClientMock.on(UpdateAnalysisCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      AnalysisId: 'analysis_0',
      Status: 200,
    });

    quickSightClientMock.on(UpdateDashboardCommand).resolvesOnce({
      DashboardId: 'dashboard_0',
      Status: 200,
    });

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
    }).resolvesOnce({
      DataSet: {
        DataSetId: 'dataset_0',
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: 'dataset_1',
      },
    }).rejectsOnce(notExistError)
      .rejectsOnce(notExistError);;

    quickSightClientMock.on(CreateAnalysisCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      AnalysisId: 'analysis_1',
      Status: 200,
    });

    quickSightClientMock.on(CreateDashboardCommand).resolvesOnce({
      DashboardId: 'dashboard_1',
      Status: 200,
    });

    quickSightClientMock.on(DescribeAnalysisDefinitionCommand).resolvesOnce({
      ResourceStatus: ResourceStatus.CREATION_SUCCESSFUL,
    }).resolvesOnce({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    }).resolves({
      ResourceStatus: ResourceStatus.DELETED,
    });

    quickSightClientMock.on(CreateFolderCommand).resolvesOnce({
      FolderId: 'folder_0',
      Status: 200,
    });

    quickSightClientMock.on(DeleteDataSetCommand).rejects(notExistError);
    quickSightClientMock.on(DeleteAnalysisCommand).resolvesOnce({});

    quickSightClientMock.on(DeleteDashboardCommand).resolvesOnce({});
    quickSightClientMock.on(DescribeDashboardDefinitionCommand).resolvesOnce({
      ResourceStatus: ResourceStatus.CREATION_SUCCESSFUL,
    }).resolvesOnce({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    }).resolves({
      ResourceStatus: ResourceStatus.DELETED,
    });

    quickSightClientMock.on(UpdateDataSetPermissionsCommand).resolves({});
    quickSightClientMock.on(UpdateAnalysisPermissionsCommand).resolves({});
    quickSightClientMock.on(UpdateDashboardPermissionsCommand).resolves({});

    quickSightClientMock.on(DescribeTemplateDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    });

    quickSightClientMock.on(ListTemplateVersionsCommand).resolves({
      TemplateVersionSummaryList: [
        {
          VersionNumber: 1,
        },
      ],
    });

    quickSightClientMock.on(UpdateDashboardPublishedVersionCommand).resolves({
      DashboardId: 'dashboard_0',
    });

    const resp = await handler(multiSchemaUpdateWithDeleteAndCreateEvent, context) as CdkCustomResourceResponse;

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisDefinitionCommand, 3);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardDefinitionCommand, 3);
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

    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDataSetPermissionsCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateAnalysisPermissionsCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDashboardPermissionsCommand, 1);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(JSON.parse(resp.Data?.dashboards)).toHaveLength(2);
    logger.info(`#dashboards#:${resp.Data?.dashboards}`);
    expect(JSON.parse(resp.Data?.dashboards)[0].dashboardId).toEqual('dashboard_0');
    expect(JSON.parse(resp.Data?.dashboards)[1].dashboardId).toEqual('dashboard_1');
  });

  test('Update QuickSight dashboard - with new dateset or upgrade from older version', async () => {

    quickSightClientMock.on(DescribeDataSourceCommand).resolves({
      DataSource: {
        Status: ResourceStatus.UPDATE_SUCCESSFUL,
      },
    });
    quickSightClientMock.on(UpdateDataSourcePermissionsCommand).resolves({});

    quickSightClientMock.on(UpdateDataSetCommand).callsFakeOnce(input => {
      if (input.DataSetId !== 'clickstream_dataset_test-database-n_test1_Lifecycle_Daily_View_c0f9155d') {
        throw new Error('update data set id is not the expected one.');
      }
      return {
        Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_0',
        Status: 200,
      };
    });

    quickSightClientMock.on(CreateDataSetCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_1',
      Status: 200,
    }).on(CreateDataSetCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_1',
      Status: 200,
    });

    quickSightClientMock.on(DeleteDataSetCommand).callsFakeOnce(input => {
      if (input.DataSetId !== 'clickstream_dataset_test-database-n_test1_user_dim_view_83ab211d') {
        throw new Error('delete data set id is not the expected one.');
      }
      return {};
    });

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
        DataSetId: 'dataset_2',
      },
    }).rejectsOnce(notExistError);

    quickSightClientMock.on(UpdateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      Status: 200,
    });

    quickSightClientMock.on(UpdateDashboardCommand).resolvesOnce({
      DashboardId: 'dashboard_0',
      Status: 200,
    });

    quickSightClientMock.on(DescribeAnalysisDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    });
    quickSightClientMock.on(DescribeDashboardDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    });
    quickSightClientMock.on(UpdateDataSetPermissionsCommand).resolves({});
    quickSightClientMock.on(UpdateAnalysisPermissionsCommand).resolves({});
    quickSightClientMock.on(UpdateDashboardPermissionsCommand).resolves({});

    quickSightClientMock.on(DescribeTemplateDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    });

    quickSightClientMock.on(ListTemplateVersionsCommand).resolves({
      TemplateVersionSummaryList: [
        {
          VersionNumber: 1,
        },
      ],
    });

    quickSightClientMock.on(UpdateDashboardPublishedVersionCommand).resolves({
      DashboardId: 'dashboard_0',
    });

    quickSightClientMock.on(DescribeAnalysisCommand).resolves({
      Analysis: {
        AnalysisId: 'analysis_0',
      },
    });

    quickSightClientMock.on(DescribeDashboardCommand).resolves({
      Dashboard: {
        DashboardId: 'dashboard_0',
      },
    });


    const resp = await handler(updateEventWithNewDataSet, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 4);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisDefinitionCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardDefinitionCommand, 1);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 1);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDataSetCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDashboardCommand, 1);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 0);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(JSON.parse(resp.Data?.dashboards)).toHaveLength(1);
    logger.info(`#dashboards#:${resp.Data?.dashboards}`);
    expect(JSON.parse(resp.Data?.dashboards)[0].dashboardId).toEqual('dashboard_0');

  });

  test('Update QuickSight dashboard - with analysis id and dashboard id changed', async () => {

    quickSightClientMock.on(DescribeDataSourceCommand).resolves({
      DataSource: {
        Status: ResourceStatus.UPDATE_SUCCESSFUL,
      },
    });
    quickSightClientMock.on(UpdateDataSourcePermissionsCommand).resolves({});

    quickSightClientMock.on(UpdateDataSetCommand).callsFakeOnce(input => {
      if (input.DataSetId !== 'clickstream_dataset_test-database-n_test1_Lifecycle_Daily_View_c0f9155d') {
        throw new Error('update data set id is not the expected one.');
      }
      return {
        Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_0',
        Status: 200,
      };
    });

    quickSightClientMock.on(CreateDataSetCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_1',
      Status: 200,
    }).on(CreateDataSetCommand).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_1',
      Status: 200,
    });

    quickSightClientMock.on(DeleteDataSetCommand).callsFakeOnce(input => {
      if (input.DataSetId !== 'clickstream_dataset_test-database-n_test1_user_dim_view_83ab211d') {
        throw new Error('delete data set id is not the expected one.');
      }
      return {};
    });

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
        DataSetId: 'dataset_2',
      },
    }).rejectsOnce(notExistError);

    quickSightClientMock.on(CreateAnalysisCommand).resolves({
      AnalysisId: 'clickstream_analysis_test-database-name_test1_6c5318b3',
      Status: 200,
    });

    quickSightClientMock.on(CreateDashboardCommand).resolvesOnce({
      DashboardId: 'dashboard_0',
      Status: 200,
    });

    quickSightClientMock.on(DescribeAnalysisDefinitionCommand).resolvesOnce({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    }).rejectsOnce(notExistError);
    quickSightClientMock.on(DescribeDashboardDefinitionCommand).resolvesOnce({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    }).rejectsOnce(notExistError);
    quickSightClientMock.on(UpdateDataSetPermissionsCommand).resolves({});
    quickSightClientMock.on(UpdateAnalysisPermissionsCommand).resolves({});
    quickSightClientMock.on(UpdateDashboardPermissionsCommand).resolves({});

    quickSightClientMock.on(DescribeTemplateDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    });

    quickSightClientMock.on(ListTemplateVersionsCommand).resolves({
      TemplateVersionSummaryList: [
        {
          VersionNumber: 1,
        },
      ],
    });

    quickSightClientMock.on(UpdateDashboardPublishedVersionCommand).resolves({
      DashboardId: 'dashboard_0',
    });

    quickSightClientMock.on(DescribeAnalysisCommand).rejectsOnce(notExistError);
    quickSightClientMock.on(DescribeDashboardCommand).rejectsOnce(notExistError);

    quickSightClientMock.on(ListAnalysesCommand).resolvesOnce({
      AnalysisSummaryList: [
        {
          AnalysisId: 'clickstream_analysis_test-database-name_test1_6c5318b3_tttttt',
        },
      ],
    });

    quickSightClientMock.on(ListDashboardsCommand).resolvesOnce({
      DashboardSummaryList: [
        {
          DashboardId: 'clickstream_dashboard_test-database-name_test1_6c5318b3_tttttt',
        },
      ],
    });

    quickSightClientMock.on(DeleteAnalysisCommand).resolvesOnce({

    });
    quickSightClientMock.on(DeleteDashboardCommand).resolvesOnce({

    });

    const resp = await handler(updateEventWithNewDataSet, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 4);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisDefinitionCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardDefinitionCommand, 2);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardCommand, 1);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDataSetCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDashboardCommand, 0);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 1);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(JSON.parse(resp.Data?.dashboards)).toHaveLength(1);
    logger.info(`#dashboards#:${resp.Data?.dashboards}`);
    expect(JSON.parse(resp.Data?.dashboards)[0].dashboardId).toEqual('dashboard_0');

  });

  test('Create QuickSight dashboard - data set parameter default value', async () => {

    quickSightClientMock.on(DescribeDataSourceCommand).resolves({
      DataSource: {
        Status: ResourceStatus.CREATION_SUCCESSFUL,
      },
    });
    quickSightClientMock.on(UpdateDataSourcePermissionsCommand).resolves({});

    quickSightClientMock.on(DescribeDataSetCommand).resolvesOnce({
      DataSet: {
        DataSetId: 'dataset_0',
      },
    }).resolvesOnce({
      DataSet: {
        DataSetId: 'dataset_1',
      },
    });

    quickSightClientMock.on(CreateDataSetCommand).callsFakeOnce(input => {
      input;
      return {
        Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_0',
        Status: 200,
      };
    }).callsFakeOnce(input => {
      if ( new Date(input.DatasetParameters[0].DateTimeDatasetParameter.DefaultValues.StaticValues[0]).getTime() === 1386806400000
       && new Date(input.DatasetParameters[1].DateTimeDatasetParameter.DefaultValues.StaticValues[0]).getTime() === 2017958400000
      ) {
        return {
          Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_1',
          Status: 200,
        };
      } else {
        throw new Error('unexpected parameter');
      }
    });

    quickSightClientMock.on(DescribeAnalysisDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.CREATION_SUCCESSFUL,
    });
    quickSightClientMock.on(CreateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      Status: 200,
    });

    quickSightClientMock.on(DescribeDashboardDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.CREATION_SUCCESSFUL,
    });
    quickSightClientMock.on(CreateDashboardCommand).resolvesOnce({
      DashboardId: 'dashboard_0',
      Status: 200,
    });

    quickSightClientMock.on(DescribeFolderCommand).rejects(notExistError);

    quickSightClientMock.on(CreateFolderCommand).resolvesOnce({
      FolderId: 'folder_0',
      Status: 200,
    });

    const resp = await handler(basicEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisDefinitionCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardDefinitionCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 2);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 1);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 0);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeFolderCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateFolderCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateFolderMembershipCommand, 1);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(JSON.parse(resp.Data?.dashboards)).toHaveLength(1);
    logger.info(`#dashboards#:${resp.Data?.dashboards}`);
    expect(JSON.parse(resp.Data?.dashboards)[0].dashboardId).toEqual('dashboard_0');

  });

  test('Create QuickSight dashboard - check permission', async () => {

    quickSightClientMock.on(DescribeDataSourceCommand).resolves({
      DataSource: {
        Status: ResourceStatus.CREATION_SUCCESSFUL,
      },
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

    quickSightClientMock.on(CreateDataSetCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_1',
      Status: 200,
    });

    quickSightClientMock.on(CreateDataSetCommand).callsFakeOnce(input => {
      if ( input.Permissions[0].Principal === 'test-owner-principal-arn'
        && input.Permissions[1].Principal === 'test-principal-arn'
        && input.Permissions[0].Actions[9] === 'quicksight:CancelIngestion'
        && input.Permissions[1].Actions[4] === 'quicksight:ListIngestions'
      ) {
        return {
          Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_0',
          Status: 200,
        };
      } else {
        throw new Error('data set permission is not the expected one.');
      }
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_1',
      Status: 200,
    });

    quickSightClientMock.on(UpdateDataSourcePermissionsCommand).callsFakeOnce(input => {
      if ( input.GrantPermissions[0].Principal === 'test-owner-principal-arn'
        && input.GrantPermissions[1].Principal === 'test-principal-arn') {
        return {
          DataSourceArn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:datasource/datasource_1',
          DataSourceId: 'datasource_1',
          Status: 200,
        };
      } else {
        throw new Error('data source permission is not the expected one.');
      }
    });

    quickSightClientMock.on(DescribeAnalysisDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.CREATION_SUCCESSFUL,
    });

    quickSightClientMock.on(CreateAnalysisCommand).callsFakeOnce(input => {
      if ( input.Permissions.length === 1
        && input.Permissions[0].Principal === 'test-owner-principal-arn'
        && input.Permissions[0].Actions[3] === 'quicksight:UpdateAnalysis'
      ) {
        return {
          Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
          Status: 200,
        };
      } else {
        throw new Error('analysis permission is not the expected one.');
      }
    });

    quickSightClientMock.on(DescribeDashboardDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.CREATION_SUCCESSFUL,
    });

    quickSightClientMock.on(CreateDashboardCommand).callsFakeOnce(input => {
      if ( input.Permissions.length === 2
        && input.Permissions[0].Principal === 'test-owner-principal-arn'
        && input.Permissions[1].Principal === 'test-principal-arn'
        && input.Permissions[0].Actions[0] === 'quicksight:DescribeDashboard'
        && input.Permissions[1].Actions[3] === 'quicksight:UpdateDashboard'
      ) {
        return {
          DashboardId: 'dashboard_0',
          Status: 200,
        };
      } else {
        throw new Error('dashboard permission is not the expected one.');
      }
    });

    quickSightClientMock.on(CreateFolderCommand).resolvesOnce({
      FolderId: 'folder_0',
      Status: 200,
    });

    const resp = await handler(basicEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisDefinitionCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardDefinitionCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 2);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 1);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDataSourcePermissionsCommand, 1);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(JSON.parse(resp.Data?.dashboards)).toHaveLength(1);
    logger.info(`#dashboards#:${resp.Data?.dashboards}`);
    expect(JSON.parse(resp.Data?.dashboards)[0].dashboardId).toEqual('dashboard_0');

  });

  test('Create QuickSight dashboard - check permission - One QuickSight user', async () => {

    quickSightClientMock.on(DescribeDataSourceCommand).resolves({
      DataSource: {
        Status: ResourceStatus.CREATION_SUCCESSFUL,
      },
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

    quickSightClientMock.on(CreateDataSetCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_1',
      Status: 200,
    });

    quickSightClientMock.on(CreateDataSetCommand).callsFakeOnce(input => {
      if ( input.Permissions.length === 1
        && input.Permissions[0].Principal === 'test-principal-arn-change'
        && input.Permissions[0].Actions[9] === 'quicksight:CancelIngestion'
      ) {
        return {
          Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_0',
          Status: 200,
        };
      } else {
        throw new Error('data set permission is not the expected one.');
      }
    }).resolvesOnce({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dataset/dataset_1',
      Status: 200,
    });

    quickSightClientMock.on(UpdateDataSourcePermissionsCommand).callsFakeOnce(input => {
      if ( input.GrantPermissions.length === 1
        && input.GrantPermissions[0].Principal === 'test-principal-arn-change') {
        return {
          DataSourceArn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:datasource/datasource_1',
          DataSourceId: 'datasource_1',
          Status: 200,
        };
      } else {
        throw new Error('data source permission is not the expected one.');
      }
    });

    quickSightClientMock.on(DescribeAnalysisDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.CREATION_SUCCESSFUL,
    });

    quickSightClientMock.on(CreateAnalysisCommand).callsFakeOnce(input => {
      if ( input.Permissions.length === 1
        && input.Permissions[0].Principal === 'test-principal-arn-change'
        && input.Permissions[0].Actions[3] === 'quicksight:UpdateAnalysis'
      ) {
        return {
          Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
          Status: 200,
        };
      } else {
        throw new Error('analysis permission is not the expected one.');
      }
    });

    quickSightClientMock.on(DescribeDashboardDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.CREATION_SUCCESSFUL,
    });

    quickSightClientMock.on(CreateDashboardCommand).callsFakeOnce(input => {
      if ( input.Permissions.length === 1
        && input.Permissions[0].Principal === 'test-principal-arn-change'
        && input.Permissions[0].Actions[0] === 'quicksight:DescribeDashboard'
      ) {
        return {
          DashboardId: 'dashboard_0',
          Status: 200,
        };
      } else {
        throw new Error('dashboard permission is not the expected one.');
      }
    });

    quickSightClientMock.on(CreateFolderCommand).resolvesOnce({
      FolderId: 'folder_0',
      Status: 200,
    });

    const resp = await handler(oneQuickSightUserEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisDefinitionCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardDefinitionCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 2);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 1);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(UpdateDataSourcePermissionsCommand, 1);

    expect(resp.Data?.dashboards).toBeDefined();
    expect(JSON.parse(resp.Data?.dashboards)).toHaveLength(1);
    logger.info(`#dashboards#:${resp.Data?.dashboards}`);
    expect(JSON.parse(resp.Data?.dashboards)[0].dashboardId).toEqual('dashboard_0');

  });

  test('Update QuickSight dashboard - check permission', async () => {

    quickSightClientMock.on(DescribeDataSourceCommand).resolves({
      DataSource: {
        Status: ResourceStatus.UPDATE_SUCCESSFUL,
      },
    });

    quickSightClientMock.on(UpdateDataSourcePermissionsCommand).callsFakeOnce(input => {
      if ( input.GrantPermissions[0].Principal === 'test-owner-principal-arn'
        && input.GrantPermissions[1].Principal === 'test-principal-arn'
        && input.GrantPermissions[0].Actions[5] === 'quicksight:UpdateDataSource'
        && input.GrantPermissions[1].Actions[5] === 'quicksight:UpdateDataSource'

      ) {
        return {
          DataSourceArn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:datasource/datasource_1',
          DataSourceId: 'datasource_1',
          Status: 200,
        };
      } else {
        throw new Error('data source permission is not the expected one.');
      }
    });

    quickSightClientMock.on(UpdateDataSetCommand).resolvesOnce({
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

    quickSightClientMock.on(UpdateAnalysisCommand).resolves({
      Arn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:analysis/analysis_0',
      Status: 200,
    });

    quickSightClientMock.on(UpdateDashboardCommand).resolvesOnce({
      DashboardId: 'dashboard_0',
      Status: 200,
    });

    quickSightClientMock.on(DescribeAnalysisDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    });
    quickSightClientMock.on(DescribeDashboardDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    });

    quickSightClientMock.on(UpdateDataSetPermissionsCommand).callsFakeOnce(input => {
      if ( input.GrantPermissions.length === 2
        && input.GrantPermissions[0].Principal === 'test-owner-principal-arn'
        && input.GrantPermissions[1].Principal === 'test-principal-arn'
        && input.GrantPermissions[0].Actions[9] === 'quicksight:CancelIngestion'
        && input.GrantPermissions[1].Actions[4] === 'quicksight:ListIngestions'
      ) {
        return {};
      } else {
        throw new Error('data set permission is not the expected one.');
      }
    }).resolvesOnce({});

    quickSightClientMock.on(UpdateAnalysisPermissionsCommand).callsFakeOnce(input => {
      if ( input.GrantPermissions.length === 1
        && input.GrantPermissions[0].Principal === 'test-owner-principal-arn'
        && input.GrantPermissions[0].Actions[6] === 'quicksight:DescribeAnalysisPermissions'
      ) {
        return {};
      } else {
        throw new Error('analysis permission is not the expected one.');
      }
    });

    quickSightClientMock.on(UpdateDashboardPermissionsCommand).callsFakeOnce(input => {
      if ( input.GrantPermissions.length === 2
        && input.GrantPermissions[0].Principal === 'test-owner-principal-arn'
        && input.GrantPermissions[1].Principal === 'test-principal-arn'
        && input.GrantPermissions[0].Actions[0] === 'quicksight:DescribeDashboard'
        && input.GrantPermissions[1].Actions[3] === 'quicksight:UpdateDashboard') {
        return {};
      } else {
        throw new Error('dashboard permission is not the expected one.');
      }
    });

    quickSightClientMock.on(DescribeTemplateDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.UPDATE_SUCCESSFUL,
    });

    quickSightClientMock.on(ListTemplateVersionsCommand).resolves({
      TemplateVersionSummaryList: [
        {
          VersionNumber: 1,
        },
      ],
    });

    quickSightClientMock.on(UpdateDashboardPublishedVersionCommand).resolves({
      DashboardId: 'dashboard_0',
    });

    const resp = await handler(updateEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisDefinitionCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardDefinitionCommand, 1);

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

  test('Delete QuickSight dashboard - folder', async () => {

    quickSightClientMock.on(DescribeDataSetCommand).rejects(notExistError);
    quickSightClientMock.on(DeleteDataSetCommand).resolves({});

    quickSightClientMock.on(DescribeAnalysisDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.DELETED,
    });

    quickSightClientMock.on(DeleteAnalysisCommand).resolves({});

    quickSightClientMock.on(DescribeDashboardDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.DELETED,
    });
    quickSightClientMock.on(DeleteDashboardCommand).resolves({});

    quickSightClientMock.on(ListFolderMembersCommand).resolvesOnce({
      FolderMemberList: [
        {
          MemberId: 'clickstream_dashboard_0',
          MemberArn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dashboard/clickstream_dashboard_0',
        },
        {
          MemberId: 'clickstream_dashboard_1',
          MemberArn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dashboard/clickstream_dashboard_1',
        },
      ],
    });

    const resp = await handler(deleteEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisDefinitionCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardDefinitionCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 0);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteFolderCommand, 1);

    expect(resp).toBeUndefined();
  });


  test('Delete QuickSight dashboard - folder contains custom resources', async () => {

    quickSightClientMock.on(DescribeDataSetCommand).rejects(notExistError);
    quickSightClientMock.on(DeleteDataSetCommand).resolves({});

    quickSightClientMock.on(DescribeAnalysisDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.DELETED,
    });

    quickSightClientMock.on(DeleteAnalysisCommand).resolves({});

    quickSightClientMock.on(DescribeDashboardDefinitionCommand).resolves({
      ResourceStatus: ResourceStatus.DELETED,
    });
    quickSightClientMock.on(DeleteDashboardCommand).resolves({});

    quickSightClientMock.on(ListFolderMembersCommand).resolvesOnce({
      FolderMemberList: [
        {
          MemberId: 'member_0',
          MemberArn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dashboard/dashboard_0',
        },
        {
          MemberId: 'member_0',
          MemberArn: 'arn:aws:quicksight:us-east-1:xxxxxxxxxx:dashboard/clickstream_dashboard_0',
        },
      ],
    });

    const resp = await handler(deleteEvent, context) as CdkCustomResourceResponse;
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDataSetCommand, 2);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDataSetCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeAnalysisDefinitionCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteAnalysisCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateAnalysisCommand, 0);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DescribeDashboardDefinitionCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteDashboardCommand, 1);
    expect(quickSightClientMock).toHaveReceivedCommandTimes(CreateDashboardCommand, 0);

    expect(quickSightClientMock).toHaveReceivedCommandTimes(DeleteFolderCommand, 0);

    expect(resp).toBeUndefined();
  });

});
