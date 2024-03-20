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
import {
  CLICKSTREAM_EVENT_VIEW_PLACEHOLDER,
  CLICKSTREAM_EVENT_VIEW_NAME,
  CLICKSTREAM_ITEM_VIEW_PLACEHOLDER,
  CLICKSTREAM_ITEM_VIEW_NAME,
  CLICKSTREAM_ACQUISITION_DAY_USER_VIEW_CNT_MV,
  CLICKSTREAM_ACQUISITION_DAY_USER_VIEW_CNT_MV_PLACEHOLDER,
  CLICKSTREAM_ACQUISITION_ACTIVE_USER_COMPARE_MV,
  CLICKSTREAM_ACQUISITION_ACTIVE_USER_COMPARE_MV_PLACEHOLDER,
  CLICKSTREAM_ACQUISITION_NEW_USER_COMPARE_MV_PLACEHOLDER,
  CLICKSTREAM_ACQUISITION_NEW_USER_COMPARE_MV,
  CLICKSTREAM_ACQUISITION_DAY_TRAFFIC_SOURCE_USER,
  CLICKSTREAM_ACQUISITION_DAY_TRAFFIC_SOURCE_USER_PLACEHOLDER,
  CLICKSTREAM_ACQUISITION_MONTH_TRAFFIC_SOURCE_USER_MV,
  CLICKSTREAM_ACQUISITION_MONTH_TRAFFIC_SOURCE_USER_MV_PLACEHOLDER,
  CLICKSTREAM_ACQUISITION_DAY_USER_ACQUISITION,
  CLICKSTREAM_ACQUISITION_DAY_USER_ACQUISITION_PLACEHOLDER,
  CLICKSTREAM_ACQUISITION_COUNTRY_NEW_USER_PLACEHOLDER,
  CLICKSTREAM_ACQUISITION_COUNTRY_NEW_USER,
  CLICKSTREAM_ENGAGEMENT_DAY_USER_VIEW,
  CLICKSTREAM_ENGAGEMENT_DAY_USER_VIEW_PLACEHOLDER,
  CLICKSTREAM_ENGAGEMENT_KPI,
  CLICKSTREAM_ENGAGEMENT_KPI_PLACEHOLDER,
  CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW,
  CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW_PLACEHOLDER,
  CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW_DETAIL_PLACEHOLDER,
  CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW_DETAIL,
  CLICKSTREAM_ENGAGEMENT_ENTRANCE,
  CLICKSTREAM_ENGAGEMENT_ENTRANCE_PLACEHOLDER,
  CLICKSTREAM_ENGAGEMENT_EXIT,
  CLICKSTREAM_ENGAGEMENT_EXIT_PLACEHOLDER,
} from '@aws/clickstream-base-lib';
import { TimeGranularity } from '@aws-sdk/client-quicksight';
import { Aws, CustomResource, Duration } from 'aws-cdk-lib';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { QuickSightDashboardDefProps, QuicksightCustomResourceProps } from './private/dashboard';
import {
  clickstream_event_view_columns,
  clickstream_item_view_columns,
} from './private/dataset-col-def';
import { createRoleForQuicksightCustomResourceLambda } from './private/iam';

import { SolutionNodejsFunction } from '../private/function';

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

  const currentDate = new Date();
  const tenYearsAgo = new Date(currentDate);
  tenYearsAgo.setFullYear(currentDate.getFullYear() - 10);
  const futureDate = new Date(currentDate);
  futureDate.setFullYear(currentDate.getFullYear() + 10);

  const databaseName = props.databaseName;
  const eventViewProjectedColumns: string[] = [];
  const itemViewProjectedColumns: string[] = [];
  clickstream_event_view_columns.map( item => eventViewProjectedColumns.push(item.Name!));
  clickstream_item_view_columns.map( item => itemViewProjectedColumns.push(item.Name!));
  
  const dashboardDefProps: QuickSightDashboardDefProps = {
    analysisName: 'Clickstream Analysis',
    dashboardName: 'Clickstream Dashboard',
    templateArn: props.templateArn,
    templateId: props.templateId,
    dataSourceArn: props.dataSourceArn,
    databaseName: databaseName,
    dataSets: [
      //Base View
      {
        tableName: CLICKSTREAM_EVENT_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_EVENT_VIEW_NAME} where event_date >= <<$startDate01>> and event_date < DATEADD(DAY, 1, date_trunc('day', <<$endDate01>>))`,
        columns: clickstream_event_view_columns,
        dateTimeDatasetParameter: [
          {
            name: 'startDate01',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: tenYearsAgo,
          },
          {
            name: 'endDate01',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
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
        projectedColumns: eventViewProjectedColumns,
      },
      {
        tableName: CLICKSTREAM_ITEM_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_ITEM_VIEW_NAME}`,
        columns: clickstream_item_view_columns,
        projectedColumns: itemViewProjectedColumns,
      },
      {
        tableName: CLICKSTREAM_ACQUISITION_DAY_USER_VIEW_CNT_MV_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_ACQUISITION_DAY_USER_VIEW_CNT_MV} where event_date >= <<$startDate02>> and event_date < DATEADD(DAY, 1, date_trunc('day', <<$endDate02>>))`,
        columns: [
          {
            Name: 'event_date',
            Type: 'DATETIME',
          },
          {
            Name: 'platform',
            Type: 'STRING',
          },
          {
            Name: 'merged_user_id',
            Type: 'STRING',
          },
          {
            Name: 'new_user_count',
            Type: 'INTEGER',
          },
          {
            Name: 'view_count',
            Type: 'INTEGER',
          }
        ],
        dateTimeDatasetParameter: [
          {
            name: 'startDate02',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: tenYearsAgo,
          },
          {
            name: 'endDate02',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        projectedColumns: [
          'event_date',
          'platform',
          'merged_user_id',
          'new_user_count',
          'view_count',
        ],
      },

      //Acquisition Sheet
      {
        tableName: CLICKSTREAM_ACQUISITION_ACTIVE_USER_COMPARE_MV_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_ACQUISITION_ACTIVE_USER_COMPARE_MV} where event_date_hour >= <<$startDate03>> and event_date_hour < DATEADD(DAY, 1, date_trunc('day', <<$endDate03>>))`,
        columns: [
          {
            Name: 'event_date_hour',
            Type: 'DATETIME',
          },
          {
            Name: 'platform',
            Type: 'STRING',
          },
          {
            Name: 'active_user_count',
            Type: 'INTEGER',
          }
        ],
        dateTimeDatasetParameter: [
          {
            name: 'startDate03',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: tenYearsAgo,
          },
          {
            name: 'endDate03',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        projectedColumns: [
          'event_date_hour',
          'platform',
          'active_user_count',
        ],
      },
      {
        tableName: CLICKSTREAM_ACQUISITION_NEW_USER_COMPARE_MV_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_ACQUISITION_NEW_USER_COMPARE_MV} where event_date_hour >= <<$startDate04>> and event_date_hour < DATEADD(DAY, 1, date_trunc('day', <<$endDate04>>))`,
        columns: [
          {
            Name: 'event_date_hour',
            Type: 'DATETIME',
          },
          {
            Name: 'platform',
            Type: 'STRING',
          },
          {
            Name: 'new_user_count',
            Type: 'INTEGER',
          }
        ],
        dateTimeDatasetParameter: [
          {
            name: 'startDate04',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: tenYearsAgo,
          },
          {
            name: 'endDate04',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        projectedColumns: [
          'event_date_hour',
          'platform',
          'new_user_count',
        ],
      },
      {
        tableName: CLICKSTREAM_ACQUISITION_DAY_TRAFFIC_SOURCE_USER_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_ACQUISITION_DAY_TRAFFIC_SOURCE_USER} where event_date >= <<$startDate05>> and event_date < DATEADD(DAY, 1, date_trunc('day', <<$endDate05>>))`,
        columns: [
          {
            Name: 'event_date',
            Type: 'DATETIME',
          },
          {
            Name: 'platform',
            Type: 'STRING',
          },
          {
            Name: 'first_traffic_source',
            Type: 'STRING',
          },
          {
            Name: 'user_count',
            Type: 'INTEGER',
          }
        ],
        dateTimeDatasetParameter: [
          {
            name: 'startDate05',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: tenYearsAgo,
          },
          {
            name: 'endDate05',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        projectedColumns: [
          'event_date',
          'platform',
          'first_traffic_source',
          'user_count',
        ],
      },
      {
        tableName: CLICKSTREAM_ACQUISITION_MONTH_TRAFFIC_SOURCE_USER_MV_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_ACQUISITION_MONTH_TRAFFIC_SOURCE_USER_MV} where event_date >= DATEADD(DAY, -30, date_trunc('day', <<$endDate06>>)) and event_date < DATEADD(DAY, 1, date_trunc('day', <<$endDate06>>))`,
        columns: [
          {
            Name: 'event_date',
            Type: 'DATETIME',
          },
          {
            Name: 'platform',
            Type: 'STRING',
          },
          {
            Name: 'first_traffic_source',
            Type: 'STRING',
          },
          {
            Name: 'merged_user_id',
            Type: 'STRING',
          }
        ],
        dateTimeDatasetParameter: [
          {
            name: 'endDate06',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        projectedColumns: [
          'event_date',
          'platform',
          'first_traffic_source',
          'merged_user_id',
        ],
      },
      {
        tableName: CLICKSTREAM_ACQUISITION_DAY_USER_ACQUISITION_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_ACQUISITION_DAY_USER_ACQUISITION} where event_date >= <<$startDate07>> and event_date < DATEADD(DAY, 1, date_trunc('day', <<$endDate07>>))`,
        columns: [
          {
            Name: 'event_date',
            Type: 'DATETIME',
          },
          {
            Name: 'aggregation_type',
            Type: 'STRING',
          },
          {
            Name: 'aggregation_dim',
            Type: 'STRING',
          },
          {
            Name: 'platform',
            Type: 'STRING',
          },
          {
            Name: 'new_user_cnt',
            Type: 'INTEGER',
          },
          {
            Name: 'session_cnt',
            Type: 'INTEGER',
          },
          {
            Name: 'engagement_session_cnt',
            Type: 'INTEGER',
          },
          {
            Name: 'engagement_rate',
            Type: 'DECIMAL',
          },
          {
            Name: 'avg_user_engagement_time_msec',
            Type: 'DECIMAL',
          },
          {
            Name: 'event_cnt',
            Type: 'INTEGER',
          }
        ],
        dateTimeDatasetParameter: [
          {
            name: 'startDate07',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: tenYearsAgo,
          },
          {
            name: 'endDate07',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        projectedColumns: [
          'event_date',
          'aggregation_type',
          'aggregation_dim',
          'platform',
          'new_user_cnt',
          'session_cnt',
          'engagement_session_cnt',
          'engagement_rate',
          'avg_user_engagement_time_msec',
          'event_cnt',
        ],
      },
      {
        tableName: CLICKSTREAM_ACQUISITION_COUNTRY_NEW_USER_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_ACQUISITION_COUNTRY_NEW_USER} where event_date >= <<$startDate08>> and event_date < DATEADD(DAY, 1, date_trunc('day', <<$endDate08>>))`,
        columns: [
          {
            Name: 'event_date',
            Type: 'DATETIME',
          },
          {
            Name: 'geo_country',
            Type: 'STRING',
          },
          {
            Name: 'user_cnt',
            Type: 'INTEGER',
          }
        ],
        dateTimeDatasetParameter: [
          {
            name: 'startDate08',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
          {
            name: 'endDate08',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        projectedColumns: [
          'event_date',
          'geo_country',
          'user_cnt',
        ],
      },

      //Engagement Sheet
      {
        tableName: CLICKSTREAM_ENGAGEMENT_DAY_USER_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_ENGAGEMENT_DAY_USER_VIEW} where event_date >= <<$endDate09>> and event_date < DATEADD(DAY, 1, date_trunc('day', <<$endDate09>>))`,
        columns: [
          {
            Name: 'event_date',
            Type: 'DATETIME',
          },
          {
            Name: 'event_cnt',
            Type: 'INTEGER',
          },
          {
            Name: 'view_cnt',
            Type: 'INTEGER',
          }
        ],
        dateTimeDatasetParameter: [
          {
            name: 'startDate09',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
          {
            name: 'endDate09',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        projectedColumns: [
          'event_date',
          'event_cnt',
          'view_cnt',
        ],
      },
      {
        tableName: CLICKSTREAM_ENGAGEMENT_KPI_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_ENGAGEMENT_KPI} where event_date >= <<$endDate10>> and event_date < DATEADD(DAY, 1, date_trunc('day', <<$endDate10>>))`,
        columns: [
          {
            Name: 'event_date',
            Type: 'DATETIME',
          },
          {
            Name: 'avg_session_per_user',
            Type: 'INTEGER',
          },
          {
            Name: 'avg_engagement_time_per_session',
            Type: 'DECIMAL',
          },
          {
            Name: 'avg_engagement_time_per_user',
            Type: 'DECIMAL',
          }
        ],
        dateTimeDatasetParameter: [
          {
            name: 'startDate10',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
          {
            name: 'endDate10',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        projectedColumns: [
          'event_date',
          'avg_session_per_user',
          'avg_engagement_time_per_session',
          'avg_engagement_time_per_user',
        ],
      },
      {
        tableName: CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW} where event_date >= <<$endDate11>> and event_date < DATEADD(DAY, 1, date_trunc('day', <<$endDate11>>))`,
        columns: [
          {
            Name: 'event_date',
            Type: 'DATETIME',
          },
          {
            Name: 'aggregation_type',
            Type: 'STRING',
          },
          {
            Name: 'aggregation_dim',
            Type: 'STRING',
          },
          {
            Name: 'view_cnt',
            Type: 'INTEGER',
          }
        ],
        dateTimeDatasetParameter: [
          {
            name: 'startDate11',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
          {
            name: 'endDate11',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        projectedColumns: [
          'event_date',
          'aggregation_type',
          'aggregation_dim',
          'view_cnt',
        ],
      },
      {
        tableName: CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW_DETAIL_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW_DETAIL} where event_date >= DATEADD(DAY, -30, date_trunc('day', <<$endDate12>>)) and event_date < DATEADD(DAY, 1, date_trunc('day', <<$endDate12>>))`,
        columns: [
          {
            Name: 'event_date',
            Type: 'DATETIME',
          },
          {
            Name: 'aggregation_type',
            Type: 'STRING',
          },
          {
            Name: 'aggregation_dim',
            Type: 'STRING',
          },
          {
            Name: 'user_id',
            Type: 'STRING',
          },
          {
            Name: 'user_engagement_time_msec',
            Type: 'INTEGER',
          },
          {
            Name: 'event_id',
            Type: 'STRING',
          }
        ],
        dateTimeDatasetParameter: [
          {
            name: 'endDate12',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        projectedColumns: [
          'event_date',
          'aggregation_type',
          'aggregation_dim',
          'user_id',
          'user_engagement_time_msec',
          'event_id',
        ],
      },
      {
        tableName: CLICKSTREAM_ENGAGEMENT_ENTRANCE_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_ENGAGEMENT_ENTRANCE} where event_date >= <<$endDate13>> and event_date < DATEADD(DAY, 1, date_trunc('day', <<$endDate13>>))`,
        columns: [
          {
            Name: 'event_date',
            Type: 'DATETIME',
          },
          {
            Name: 'aggregation_type',
            Type: 'STRING',
          },
          {
            Name: 'aggregation_dim',
            Type: 'STRING',
          },
          {
            Name: 'entrance_cnt',
            Type: 'INTEGER',
          }
        ],
        dateTimeDatasetParameter: [
          {
            name: 'startDate13',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
          {
            name: 'endDate13',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        projectedColumns: [
          'event_date',
          'aggregation_type',
          'aggregation_dim',
          'entrance_cnt',
        ],
      },
      {
        tableName: CLICKSTREAM_ENGAGEMENT_EXIT_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_ENGAGEMENT_EXIT} where event_date >= <<$endDate14>> and event_date < DATEADD(DAY, 1, date_trunc('day', <<$endDate14>>))`,
        columns: [
          {
            Name: 'event_date',
            Type: 'DATETIME',
          },
          {
            Name: 'aggregation_type',
            Type: 'STRING',
          },
          {
            Name: 'aggregation_dim',
            Type: 'STRING',
          },
          {
            Name: 'exit_cnt',
            Type: 'INTEGER',
          }
        ],
        dateTimeDatasetParameter: [
          {
            name: 'startDate13',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
          {
            name: 'endDate13',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        projectedColumns: [
          'event_date',
          'aggregation_type',
          'aggregation_dim',
          'exit_cnt',
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
    entry: join(
      __dirname,
      'lambda',
      'custom-resource/quicksight',
      'index.ts',
    ),
    handler: 'handler',
    memorySize: 256,
    timeout: Duration.minutes(15),
    logConf: {
      retention: RetentionDays.ONE_WEEK,
    },
    role,
  });

  return fn;
}
