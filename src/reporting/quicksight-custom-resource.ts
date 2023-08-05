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

import { join } from 'path';
import { Aws, CustomResource, Duration } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import {
  CLICKSTREAM_DEVICE_VIEW_PLACEHOLDER,
  CLICKSTREAM_EVENT_PARAMETER_RT_VIEW_PLACEHOLDER,
  CLICKSTREAM_EVENT_PARAMETER_VIEW_PLACEHOLDER,
  CLICKSTREAM_LIFECYCLE_DAILY_VIEW_PLACEHOLDER,
  CLICKSTREAM_LIFECYCLE_WEEKLY_VIEW_PLACEHOLDER,
  CLICKSTREAM_ODS_EVENT_RT_VIEW_PLACEHOLDER,
  CLICKSTREAM_ODS_EVENT_VIEW_PLACEHOLDER,
  CLICKSTREAM_PATH_VIEW_PLACEHOLDER,
  CLICKSTREAM_RETENTION_VIEW_PLACEHOLDER,
  CLICKSTREAM_SESSION_VIEW_PLACEHOLDER,
  CLICKSTREAM_USER_ATTR_VIEW_PLACEHOLDER,
  CLICKSTREAM_USER_DIM_VIEW_PLACEHOLDER,
  QuickSightDashboardDefProps,
  QuicksightCustomResourceProps,
  QuicksightInternalUserCustomResourceProps,
} from './private/dashboard';
import {
  clickstream_device_view_columns,
  clickstream_event_parameter_view_columns,
  clickstream_lifecycle_daily_view_columns,
  clickstream_lifecycle_weekly_view_columns,
  clickstream_ods_events_view_columns,
  clickstream_path_view_columns,
  clickstream_retention_view_columns,
  clickstream_session_view_columns,
  clickstream_user_attr_view_columns,
  clickstream_user_dim_view_columns,
} from './private/dataset-col-def';
import { createRoleForQuicksightCustomResourceLambda, createRoleForQuicksightInternalCustomResourceLambda } from './private/iam';
import { POWERTOOLS_ENVS } from '../common/powertools';

export function createQuicksightCustomResource(
  scope: Construct,
  props: QuicksightCustomResourceProps,
): CustomResource {
  const fn = createQuicksightLambda(scope, props.templateArn);
  const provider = new Provider(
    scope,
    'QuicksightCustomResourceProvider',
    {
      onEventHandler: fn,
      logRetention: RetentionDays.ONE_WEEK,
    },
  );

  const databaseName = props.databaseName;
  const dashboardDefProps: QuickSightDashboardDefProps = {
    analysisName: 'Clickstream Analysis',
    dashboardName: 'Clickstream Dashboard',
    templateArn: props.templateArn,
    dataSourceArn: props.dataSourceArn,
    databaseName: databaseName,
    dataSets: [
      {
        name: '',
        tableName: CLICKSTREAM_USER_DIM_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        columns: clickstream_user_dim_view_columns,
        // customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_USER_DIM_VIEW_PLACEHOLDER} where first_visit_date > <<$EventStartDate>>`,
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_USER_DIM_VIEW_PLACEHOLDER}`,
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
        datasetParameters: [
          {
            DateTimeDatasetParameter: {
              Id: 'a05a5ad5-c6b1-40de-9f96-f2bfcc5d2c21',
              Name: 'EventStartDate',
              ValueType: 'SINGLE_VALUED',
              TimeGranularity: 'DAY',
            },
          },
        ],
      },
      {
        name: '',
        tableName: CLICKSTREAM_RETENTION_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_RETENTION_VIEW_PLACEHOLDER}`,
        columns: clickstream_retention_view_columns,
        projectedColumns: [
          'first_date',
          'day_diff',
          'returned_user_count',
          'total_users',
        ],
      },
      {
        name: '',
        tableName: CLICKSTREAM_SESSION_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        // customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_SESSION_VIEW_PLACEHOLDER} where session_date > <<$SessionDate>>`,
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_SESSION_VIEW_PLACEHOLDER}`,
        columns: clickstream_session_view_columns,
        projectedColumns: [
          'session_id',
          'user_pseudo_id',
          'platform',
          'session_duration',
          'session_views',
          'engaged_session',
          'bounced_session',
          'session_start_timestamp',
          'session_engagement_time',
          'session_date',
          'session_date_hour',
          'entry_view',
          'exit_view',
        ],
        datasetParameters: [
          {
            DateTimeDatasetParameter: {
              Id: '2a008707-fa82-44b8-ad3a-452fd9d3ca40',
              Name: 'SessionDate',
              ValueType: 'SINGLE_VALUED',
              TimeGranularity: 'DAY',
              DefaultValues: {
                StaticValues: [getDate(-31)],
              },
            },
          },
        ],
      },
      {
        name: '',
        tableName: CLICKSTREAM_USER_ATTR_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_USER_ATTR_VIEW_PLACEHOLDER}`,
        columns: clickstream_user_attr_view_columns,
        projectedColumns: [
          'user_pseudo_id',
          'user_id',
          'custom_attr_key',
          'custom_attr_value',
        ],
      },
      {
        name: '',
        tableName: CLICKSTREAM_ODS_EVENT_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        // customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_ODS_EVENT_VIEW_PLACEHOLDER}  where event_date > <<$EventDate>>`,
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_ODS_EVENT_RT_VIEW_PLACEHOLDER}`,
        columns: clickstream_ods_events_view_columns,
        tagColumnOperations: [
          {
            columnName: 'geo_country',
            columnGeographicRoles: ['COUNTRY'],
          },
          {
            columnName: 'geo_city',
            columnGeographicRoles: ['CITY'],
          },
          {
            columnName: 'geo_region',
            columnGeographicRoles: ['STATE'],
          },
        ],
        projectedColumns: [
          'event_date',
          'event_name',
          'event_id',
          'event_bundle_sequence_id',
          'event_previous_timestamp',
          'event_server_timestamp_offset',
          'event_timestamp',
          'ingest_timestamp',
          'event_value_in_usd',
          'app_info_app_id',
          'app_info_package_id',
          'app_info_install_source',
          'app_info_version',
          'device_mobile_brand_name',
          'device_mobile_model_name',
          'device_manufacturer',
          'device_screen_width',
          'device_screen_height',
          'device_carrier',
          'device_network_type',
          'device_operating_system',
          'device_operating_system_version',
          'ua_browser',
          'ua_browser_version',
          'ua_os',
          'ua_os_version',
          'ua_device',
          'ua_device_category',
          'device_system_language',
          'device_time_zone_offset_seconds',
          'geo_continent',
          'geo_country',
          'geo_city',
          'geo_metro',
          'geo_region',
          'geo_sub_continent',
          'geo_locale',
          'platform',
          'project_id',
          'traffic_source_name',
          'traffic_source_medium',
          'traffic_source_source',
          'user_first_touch_timestamp',
          'user_id',
          'user_pseudo_id',
        ],
        datasetParameters: [
          {
            DateTimeDatasetParameter: {
              Id: 'b4738678-5d1a-4bfc-b297-152fac95bcd4',
              Name: 'EventDate',
              ValueType: 'SINGLE_VALUED',
              TimeGranularity: 'DAY',
              DefaultValues: {
                StaticValues: [getDate(-31)],
              },
            },
          },
        ],
      },
      {
        name: '',
        tableName: CLICKSTREAM_DEVICE_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        // customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_DEVICE_VIEW_PLACEHOLDER} where event_date > <<$EventDate>>`,
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_DEVICE_VIEW_PLACEHOLDER}`,
        columns: clickstream_device_view_columns,
        projectedColumns: [
          'device_id',
          'event_date',
          'mobile_brand_name',
          'mobile_model_name',
          'manufacturer',
          'screen_width',
          'screen_height',
          'carrier',
          'network_type',
          'operating_system',
          'operating_system_version',
          'ua_browser',
          'ua_browser_version',
          'ua_os',
          'ua_os_version',
          'ua_device',
          'ua_device_category',
          'system_language',
          'time_zone_offset_seconds',
          'advertising_id',
          'user_pseudo_id',
          'user_id',
          'usage_num',
        ],
        datasetParameters: [
          {
            DateTimeDatasetParameter: {
              Id: 'f89d74cb-bff7-44d3-8e84-7332c1543d91',
              Name: 'EventDate',
              ValueType: 'SINGLE_VALUED',
              TimeGranularity: 'DAY',
              DefaultValues: {
                StaticValues: [getDate(-31)],
              },
            },
          },
        ],
      },
      {
        name: '',
        tableName: CLICKSTREAM_EVENT_PARAMETER_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        // customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_EVENT_PARAMETER_VIEW_PLACEHOLDER} where event_date > <<$EventDate>>`,
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_EVENT_PARAMETER_RT_VIEW_PLACEHOLDER} `,
        columns: clickstream_event_parameter_view_columns,
        projectedColumns: [
          'event_id',
          'event_name',
          'event_date',
          'event_parameter_key',
          'event_parameter_value',
        ],
        datasetParameters: [
          {
            DateTimeDatasetParameter: {
              Id: 'c5a69e41-ac17-40e1-b633-ff6927db97d2',
              Name: 'EventDate',
              ValueType: 'SINGLE_VALUED',
              TimeGranularity: 'DAY',
              DefaultValues: {
                StaticValues: [getDate(-31)],
              },
            },
          },
        ],
      },
      {
        name: '',
        tableName: CLICKSTREAM_LIFECYCLE_DAILY_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        // customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_LIFECYCLE_DAILY_VIEW_PLACEHOLDER} where time_period > <<$EventDate>>`,
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_LIFECYCLE_DAILY_VIEW_PLACEHOLDER}`,
        columns: clickstream_lifecycle_daily_view_columns,
        projectedColumns: [
          'time_period',
          'this_day_value',
          'sum',
        ],
        datasetParameters: [
          {
            DateTimeDatasetParameter: {
              Id: '6147bdf0-9c71-4adf-98ce-4c99245af724',
              Name: 'EventDate',
              ValueType: 'SINGLE_VALUED',
              TimeGranularity: 'DAY',
              DefaultValues: {
                StaticValues: [getDate(-31)],
              },
            },
          },
        ],
      },
      {
        name: '',
        tableName: CLICKSTREAM_LIFECYCLE_WEEKLY_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_LIFECYCLE_WEEKLY_VIEW_PLACEHOLDER}`,
        columns: clickstream_lifecycle_weekly_view_columns,
        projectedColumns: [
          'time_period',
          'this_week_value',
          'sum',
        ],
      },
      {
        name: '',
        tableName: CLICKSTREAM_PATH_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        // customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_PATH_VIEW_PLACEHOLDER} where event_date > <<$EventDate>>`,
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_PATH_VIEW_PLACEHOLDER}`,
        columns: clickstream_path_view_columns,
        projectedColumns: [
          'user_pseudo_id',
          'event_date',
          'event_id',
          'event_name',
          'event_timestamp',
          'platform',
          'session_id',
          'current_screen',
          'event_rank',
          'previous_event',
          'next_event',
          'previous_screen',
          'next_screen',
        ],
        datasetParameters: [
          {
            DateTimeDatasetParameter: {
              Id: '2ca7f3a1-f58d-4ee9-a6b0-6fdc63df6ee3',
              Name: 'EventDate',
              ValueType: 'SINGLE_VALUED',
              TimeGranularity: 'DAY',
              DefaultValues: {
                StaticValues: [getDate(-31)],
              },
            },
          },
        ],
      },
    ],
  };

  const cr = new CustomResource(scope, 'QuicksightCustomResource', {
    serviceToken: provider.serviceToken,
    properties: {
      awsAccountId: Aws.ACCOUNT_ID,
      awsRegion: Aws.REGION,
      awsPartition: Aws.PARTITION,
      quickSightNamespace: props.quickSightProps.namespace,
      quickSightUser: props.quickSightProps.userName,
      quickSightPrincipalArn: props.quickSightProps.principalArn,
      schemas: props.redshiftProps.databaseSchemaNames,
      dashboardDefProps,
    },
  });
  return cr;
}

function createQuicksightLambda(
  scope: Construct,
  templateArn: string,
): NodejsFunction {
  const role = createRoleForQuicksightCustomResourceLambda(scope, templateArn);
  const fn = new NodejsFunction(scope, 'QuicksightCustomResourceLambda', {
    runtime: Runtime.NODEJS_18_X,
    entry: join(
      __dirname,
      'lambda',
      'custom-resource/quicksight',
      'index.ts',
    ),
    handler: 'handler',
    memorySize: 256,
    timeout: Duration.minutes(15),
    logRetention: RetentionDays.ONE_WEEK,
    role,
    environment: {
      ...POWERTOOLS_ENVS,
    },
  });

  return fn;
}


export function createInternelUserCustomResource(
  scope: Construct,
  props: QuicksightInternalUserCustomResourceProps,
): CustomResource {
  const fn = createQuicksightInternelUserLambda(scope, props.quickSightNamespace);
  const provider = new Provider(
    scope,
    'QuicksightInternalUserCustomResourceProvider',
    {
      onEventHandler: fn,
      logRetention: RetentionDays.ONE_WEEK,
    },
  );

  const cr = new CustomResource(scope, 'QuicksightInternalUserCustomResource', {
    serviceToken: provider.serviceToken,
    properties: {
      awsAccountId: Aws.ACCOUNT_ID,
      awsRegion: Aws.REGION,
      awsPartition: Aws.PARTITION,
      quickSightNamespace: props.quickSightNamespace,
      email: props.email,
    },
  });
  return cr;
}

function createQuicksightInternelUserLambda(
  scope: Construct,
  namespace: string,
): NodejsFunction {
  const role = createRoleForQuicksightInternalCustomResourceLambda(scope, namespace);
  const fn = new NodejsFunction(scope, 'QuicksightInternalUserCustomResourceLambda', {
    runtime: Runtime.NODEJS_18_X,
    entry: join(
      __dirname,
      'lambda',
      'custom-resource/user',
      'index.ts',
    ),
    handler: 'handler',
    memorySize: 256,
    timeout: Duration.minutes(15),
    logRetention: RetentionDays.ONE_WEEK,
    role,
    environment: {
      ...POWERTOOLS_ENVS,
    },
  });

  return fn;
}
function getDate(index: number) {
  const newDate = new Date();
  newDate.setDate(new Date().getDate() + index);
  return newDate;
}
