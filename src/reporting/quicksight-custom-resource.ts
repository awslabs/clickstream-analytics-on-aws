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
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { QuickSightDashboardDefProps, QuicksightCustomResourceProps } from './private/dashboard';
import {
  clickstream_device_view_columns,
  clickstream_event_parameter_view_columns,
  clickstream_lifecycle_daily_view_columns,
  clickstream_lifecycle_weekly_view_columns,
  clickstream_event_view_columns,
  clickstream_retention_view_columns,
  clickstream_session_view_columns,
  clickstream_user_attr_view_columns,
  clickstream_user_dim_view_columns,
} from './private/dataset-col-def';
import { createRoleForQuicksightCustomResourceLambda } from './private/iam';
import {
  CLICKSTREAM_DEVICE_VIEW_PLACEHOLDER,
  CLICKSTREAM_EVENT_PARAMETER_VIEW_PLACEHOLDER,
  CLICKSTREAM_LIFECYCLE_DAILY_VIEW_PLACEHOLDER,
  CLICKSTREAM_LIFECYCLE_WEEKLY_VIEW_PLACEHOLDER,
  CLICKSTREAM_EVENT_VIEW_PLACEHOLDER,
  CLICKSTREAM_RETENTION_VIEW_PLACEHOLDER,
  CLICKSTREAM_SESSION_VIEW_PLACEHOLDER,
  CLICKSTREAM_USER_ATTR_VIEW_PLACEHOLDER,
  CLICKSTREAM_USER_DIM_VIEW_PLACEHOLDER,
  CLICKSTREAM_USER_DIM_VIEW_NAME,
  CLICKSTREAM_RETENTION_VIEW_NAME,
  CLICKSTREAM_SESSION_VIEW_NAME,
  CLICKSTREAM_USER_ATTR_VIEW_NAME,
  CLICKSTREAM_EVENT_VIEW_NAME,
  CLICKSTREAM_DEVICE_VIEW_NAME,
  CLICKSTREAM_EVENT_PARAMETER_VIEW_NAME,
  CLICKSTREAM_LIFECYCLE_DAILY_VIEW_NAME,
  CLICKSTREAM_LIFECYCLE_WEEKLY_VIEW_NAME,
} from '../common/constant';

import { POWERTOOLS_ENVS } from '../common/powertools';
import { SolutionNodejsFunction } from '../private/function';
import { TimeGranularity } from '@aws-sdk/client-quicksight';

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
    templateId: props.templateId,
    dataSourceArn: props.dataSourceArn,
    databaseName: databaseName,
    dataSets: [
      {
        tableName: CLICKSTREAM_USER_DIM_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        columns: clickstream_user_dim_view_columns,
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_USER_DIM_VIEW_NAME}`,
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
          'first_referer',
          'registration_status',
          'device_id',
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
        tableName: CLICKSTREAM_RETENTION_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_RETENTION_VIEW_NAME}`,
        columns: clickstream_retention_view_columns,
        projectedColumns: [
          'first_date',
          'day_diff',
          'returned_user_count',
          'total_users',
        ],
      },
      {
        tableName: CLICKSTREAM_SESSION_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_SESSION_VIEW_NAME}`,
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
      },
      {
        tableName: CLICKSTREAM_USER_ATTR_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_USER_ATTR_VIEW_NAME}`,
        columns: clickstream_user_attr_view_columns,
        projectedColumns: [
          'user_pseudo_id',
          'user_id',
          'user_first_touch_timestamp',
          '_first_visit_date',
          '_first_referer',
          '_first_traffic_source_type',
          '_first_traffic_medium',
          '_first_traffic_source',
          '_channel',
          'custom_attr_key',
          'custom_attr_value',
        ],
      },
      {
        tableName: CLICKSTREAM_EVENT_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_EVENT_VIEW_NAME}`,
        columns: clickstream_event_view_columns,
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
          'event_timestamp',
          'event_value_in_usd',
          'app_info_app_id',
          'app_info_package_id',
          'app_info_install_source',
          'app_info_version',
          'app_info_sdk_name',
          'app_info_sdk_version',
          'device_id',
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
          'host_name',
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
      },
      {
        tableName: CLICKSTREAM_DEVICE_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_DEVICE_VIEW_NAME} where event_date >= <<$startDate>> and event_date <= <<$endDate>>`,
        columns: clickstream_device_view_columns,
        dateTimeDatasetParameter:[
          {
            name: 'startDate',
            timeGranularity: TimeGranularity.DAY,
          },
          {
            name: 'endDate',
            timeGranularity: TimeGranularity.DAY,
          },
        ],
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
          'host_name',
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
      },
      {
        tableName: CLICKSTREAM_EVENT_PARAMETER_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_EVENT_PARAMETER_VIEW_NAME}`,
        columns: clickstream_event_parameter_view_columns,
        projectedColumns: [
          'event_id',
          'event_name',
          'event_date',
          'platform',
          'user_id',
          'user_pseudo_id',
          'event_timestamp',
          'event_param_key',
          'event_param_double_value',
          'event_param_float_value',
          'event_param_int_value',
          'event_param_string_value',
          'event_param_value',
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
      {
        tableName: CLICKSTREAM_LIFECYCLE_WEEKLY_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_LIFECYCLE_WEEKLY_VIEW_NAME}`,
        columns: clickstream_lifecycle_weekly_view_columns,
        projectedColumns: [
          'time_period',
          'this_week_value',
          'sum',
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
      quickSightSharePrincipalArn: props.quickSightProps.sharePrincipalArn,
      quickSightOwnerPrincipalArn: props.quickSightProps.ownerPrincipalArn,
      schemas: props.redshiftProps.databaseSchemaNames,
      dashboardDefProps,
    },
  });
  return cr;
}

function createQuicksightLambda(
  scope: Construct,
  templateArn: string,
): SolutionNodejsFunction {
  const role = createRoleForQuicksightCustomResourceLambda(scope, templateArn);
  const fn = new SolutionNodejsFunction(scope, 'QuicksightCustomResourceLambda', {
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
