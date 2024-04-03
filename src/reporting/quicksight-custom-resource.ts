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
  CLICKSTREAM_ACQUISITION_DAY_USER_VIEW_CNT_MV,
  CLICKSTREAM_ACQUISITION_DAY_USER_VIEW_CNT_MV_PLACEHOLDER,
  CLICKSTREAM_ACQUISITION_DAY_TRAFFIC_SOURCE_USER,
  CLICKSTREAM_ACQUISITION_DAY_TRAFFIC_SOURCE_USER_PLACEHOLDER,
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
  CLICKSTREAM_RETENTION_USER_NEW_RETURN_PLACEHOLDER,
  CLICKSTREAM_RETENTION_USER_NEW_RETURN,
  CLICKSTREAM_RETENTION_EVENT_OVERTIME_PLACEHOLDER,
  CLICKSTREAM_RETENTION_EVENT_OVERTIME,
  CLICKSTREAM_RETENTION_DAU_WAU,
  CLICKSTREAM_RETENTION_DAU_WAU_PLACEHOLDER,
  CLICKSTREAM_DEVICE_CRASH_RATE,
  CLICKSTREAM_DEVICE_CRASH_RATE_PLACEHOLDER,
  CLICKSTREAM_RETENTION_VIEW_NAME,
  CLICKSTREAM_RETENTION_VIEW_NAME_PLACEHOLDER,
  CLICKSTREAM_LIFECYCLE_WEEKLY_VIEW_PLACEHOLDER,
  CLICKSTREAM_LIFECYCLE_WEEKLY_VIEW_NAME,
} from '@aws/clickstream-base-lib';
import { TimeGranularity } from '@aws-sdk/client-quicksight';
import { Aws, CustomResource, Duration } from 'aws-cdk-lib';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { QuickSightDashboardDefProps, QuicksightCustomResourceProps } from './private/dashboard';
import {
  clickstream_event_view_columns,
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
  clickstream_event_view_columns.map( item => eventViewProjectedColumns.push(item.Name!));

  const eventViewColumns = `
    *, 
    DATE_TRUNC('second', CONVERT_TIMEZONE('${props.timezone}', event_timestamp)) ::timestamp AS event_timestamp_local,
    DATE_TRUNC('day', CONVERT_TIMEZONE('${props.timezone}', event_timestamp)) ::timestamp AS event_date
  `;

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
        customSql: `
          select 
            ${eventViewColumns} 
          from {{schema}}.${CLICKSTREAM_EVENT_VIEW_NAME}
          where DATE_TRUNC('day', CONVERT_TIMEZONE('${props.timezone}', event_timestamp)) >= <<$startDate01>>
          and DATE_TRUNC('day', CONVERT_TIMEZONE('${props.timezone}', event_timestamp)) < DATEADD(DAY, 1, date_trunc('day', <<$endDate01>>))
        `,
        columns: [
          ...clickstream_event_view_columns,
          {
            Name: 'event_timestamp_local',
            Type: 'DATETIME',
          },
          {
            Name: 'event_date',
            Type: 'DATETIME',
          },
        ],
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
        projectedColumns: [...eventViewProjectedColumns, 'event_timestamp_local', 'event_date'],
      },

      //Acquisition Sheet
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
            Name: 'Active users',
            Type: 'STRING',
          },
          {
            Name: 'New users',
            Type: 'INTEGER',
          },
          {
            Name: 'view_count',
            Type: 'INTEGER',
          },
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
          'Active users',
          'New users',
          'view_count',
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
            Name: 'user_id',
            Type: 'STRING',
          },
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
          'aggregation_dim',
          'aggregation_type',
          'user_id',
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
            Name: 'new_user_count',
            Type: 'INTEGER',
          },
          {
            Name: 'session_count',
            Type: 'INTEGER',
          },
          {
            Name: 'engagement_session_count',
            Type: 'INTEGER',
          },
          {
            Name: 'engagement_rate',
            Type: 'DECIMAL',
          },
          {
            Name: 'avg_user_engagement_time_minutes',
            Type: 'DECIMAL',
          },
          {
            Name: 'event_count',
            Type: 'INTEGER',
          },
          {
            Name: 'user_id',
            Type: 'STRING',
          },
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
          'new_user_count',
          'session_count',
          'engagement_session_count',
          'engagement_rate',
          'avg_user_engagement_time_minutes',
          'event_count',
          'user_id',
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
            Name: 'platform',
            Type: 'STRING',
          },
          {
            Name: 'geo_country',
            Type: 'STRING',
          },
          {
            Name: 'geo_city',
            Type: 'STRING',
          },
          {
            Name: 'user_count',
            Type: 'INTEGER',
          },
        ],
        dateTimeDatasetParameter: [
          {
            name: 'startDate08',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: tenYearsAgo,
          },
          {
            name: 'endDate08',
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
        ],
        projectedColumns: [
          'event_date',
          'platform',
          'geo_country',
          'geo_city',
          'user_count',
        ],
      },

      //Engagement Sheet
      {
        tableName: CLICKSTREAM_ENGAGEMENT_DAY_USER_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_ENGAGEMENT_DAY_USER_VIEW} where event_date >= <<$startDate09>> and event_date < DATEADD(DAY, 1, date_trunc('day', <<$endDate09>>))`,
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
            Name: 'event_count',
            Type: 'INTEGER',
          },
          {
            Name: 'view_count',
            Type: 'INTEGER',
          },
        ],
        dateTimeDatasetParameter: [
          {
            name: 'startDate09',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: tenYearsAgo,
          },
          {
            name: 'endDate09',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        projectedColumns: [
          'event_date',
          'platform',
          'event_count',
          'view_count',
        ],
      },
      {
        tableName: CLICKSTREAM_ENGAGEMENT_KPI_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_ENGAGEMENT_KPI} where event_date >= <<$startDate10>> and event_date < DATEADD(DAY, 1, date_trunc('day', <<$endDate10>>))`,
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
            Name: 'avg_session_per_user',
            Type: 'DECIMAL',
          },
          {
            Name: 'avg_engagement_time_per_session_minutes',
            Type: 'DECIMAL',
          },
          {
            Name: 'avg_engagement_time_per_user_minutes',
            Type: 'DECIMAL',
          },
        ],
        dateTimeDatasetParameter: [
          {
            name: 'startDate10',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: tenYearsAgo,
          },
          {
            name: 'endDate10',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        projectedColumns: [
          'event_date',
          'platform',
          'avg_session_per_user',
          'avg_engagement_time_per_session_minutes',
          'avg_engagement_time_per_user_minutes',
        ],
      },
      {
        tableName: CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW} where event_date >= <<$startDate11>> and event_date < DATEADD(DAY, 1, date_trunc('day', <<$endDate11>>))`,
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
            Name: 'aggregation_type',
            Type: 'STRING',
          },
          {
            Name: 'aggregation_dim',
            Type: 'STRING',
          },
          {
            Name: 'view_count',
            Type: 'INTEGER',
          },
        ],
        dateTimeDatasetParameter: [
          {
            name: 'startDate11',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: tenYearsAgo,
          },
          {
            name: 'endDate11',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        projectedColumns: [
          'event_date',
          'platform',
          'aggregation_type',
          'aggregation_dim',
          'view_count',
        ],
      },
      {
        tableName: CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW_DETAIL_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW_DETAIL} where event_date >= <<$startDate12>> and event_date < DATEADD(DAY, 1, date_trunc('day', <<$endDate12>>))`,
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
            Name: 'user_engagement_time_minutes',
            Type: 'DECIMAL',
          },
          {
            Name: 'event_id',
            Type: 'STRING',
          },
        ],
        dateTimeDatasetParameter: [
          {
            name: 'startDate12',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: tenYearsAgo,
          },
          {
            name: 'endDate12',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        projectedColumns: [
          'event_date',
          'platform',
          'aggregation_type',
          'aggregation_dim',
          'user_id',
          'user_engagement_time_minutes',
          'event_id',
        ],
      },
      {
        tableName: CLICKSTREAM_ENGAGEMENT_ENTRANCE_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_ENGAGEMENT_ENTRANCE} where event_date >= <<$startDate13>> and event_date < DATEADD(DAY, 1, date_trunc('day', <<$endDate13>>))`,
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
            Name: 'aggregation_type',
            Type: 'STRING',
          },
          {
            Name: 'aggregation_dim',
            Type: 'STRING',
          },
          {
            Name: 'entrance_count',
            Type: 'INTEGER',
          },
        ],
        dateTimeDatasetParameter: [
          {
            name: 'startDate13',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: tenYearsAgo,
          },
          {
            name: 'endDate13',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        projectedColumns: [
          'event_date',
          'platform',
          'aggregation_type',
          'aggregation_dim',
          'entrance_count',
        ],
      },
      {
        tableName: CLICKSTREAM_ENGAGEMENT_EXIT_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_ENGAGEMENT_EXIT} where event_date >= <<$startDate14>> and event_date < DATEADD(DAY, 1, date_trunc('day', <<$endDate14>>))`,
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
            Name: 'aggregation_type',
            Type: 'STRING',
          },
          {
            Name: 'aggregation_dim',
            Type: 'STRING',
          },
          {
            Name: 'exit_count',
            Type: 'INTEGER',
          },
        ],
        dateTimeDatasetParameter: [
          {
            name: 'startDate14',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: tenYearsAgo,
          },
          {
            name: 'endDate14',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        projectedColumns: [
          'event_date',
          'platform',
          'aggregation_type',
          'aggregation_dim',
          'exit_count',
        ],
      },

      //Retention Sheet
      {
        tableName: CLICKSTREAM_RETENTION_USER_NEW_RETURN_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_RETENTION_USER_NEW_RETURN} where event_date >= <<$startDate15>> and event_date < DATEADD(DAY, 1, date_trunc('day', <<$endDate15>>))`,
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
            Name: 'user_type',
            Type: 'STRING',
          },
          {
            Name: 'user_count',
            Type: 'INTEGER',
          },
        ],
        dateTimeDatasetParameter: [
          {
            name: 'startDate15',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: tenYearsAgo,
          },
          {
            name: 'endDate15',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        projectedColumns: [
          'event_date',
          'platform',
          'user_type',
          'user_count',
        ],
      },
      {
        tableName: CLICKSTREAM_RETENTION_EVENT_OVERTIME_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_RETENTION_EVENT_OVERTIME} where event_date >= <<$startDate16>> and event_date < DATEADD(DAY, 1, date_trunc('day', <<$endDate16>>))`,
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
            Name: 'event_count',
            Type: 'INTEGER',
          },
        ],
        dateTimeDatasetParameter: [
          {
            name: 'startDate16',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: tenYearsAgo,
          },
          {
            name: 'endDate16',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        projectedColumns: [
          'event_date',
          'platform',
          'event_count',
        ],
      },
      {
        tableName: CLICKSTREAM_RETENTION_DAU_WAU_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_RETENTION_DAU_WAU} where event_date >= <<$startDate17>> and event_date < DATEADD(DAY, 1, date_trunc('day', <<$endDate17>>))`,
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
        ],
        dateTimeDatasetParameter: [
          {
            name: 'startDate17',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: tenYearsAgo,
          },
          {
            name: 'endDate17',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        projectedColumns: [
          'event_date',
          'platform',
          'merged_user_id',
        ],
      },
      {
        tableName: CLICKSTREAM_RETENTION_VIEW_NAME_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_RETENTION_VIEW_NAME} where first_date >= <<$startDate19>> and first_date < DATEADD(DAY, 1, date_trunc('day', <<$endDate19>>))`,
        columns: [
          {
            Name: 'first_date',
            Type: 'DATETIME',
          },
          {
            Name: 'day_diff',
            Type: 'INTEGER',
          },
          {
            Name: 'returned_user_count',
            Type: 'INTEGER',
          },
          {
            Name: 'total_users',
            Type: 'INTEGER',
          },
        ],
        dateTimeDatasetParameter: [
          {
            name: 'startDate19',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: tenYearsAgo,
          },
          {
            name: 'endDate19',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        projectedColumns: [
          'first_date',
          'day_diff',
          'returned_user_count',
          'total_users',
        ],
      },
      {
        tableName: CLICKSTREAM_LIFECYCLE_WEEKLY_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_LIFECYCLE_WEEKLY_VIEW_NAME} where time_period >= <<$startDate20>> and time_period < DATEADD(DAY, 1, date_trunc('day', <<$endDate20>>))`,
        columns: [
          {
            Name: 'time_period',
            Type: 'DATETIME',
          },
          {
            Name: 'this_week_value',
            Type: 'STRING',
          },
          {
            Name: 'sum',
            Type: 'INTEGER',
          },
        ],
        dateTimeDatasetParameter: [
          {
            name: 'startDate20',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: tenYearsAgo,
          },
          {
            name: 'endDate20',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        projectedColumns: [
          'time_period',
          'this_week_value',
          'sum',
        ],
      },

      //Device Sheet
      {
        tableName: CLICKSTREAM_DEVICE_CRASH_RATE_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_DEVICE_CRASH_RATE} where event_date >= <<$startDate18>> and event_date < DATEADD(DAY, 1, date_trunc('day', <<$endDate18>>))`,
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
            Name: 'app_version',
            Type: 'STRING',
          },
          {
            Name: 'merged_user_id',
            Type: 'STRING',
          },
          {
            Name: 'crashed_user_id',
            Type: 'STRING',
          },
        ],
        dateTimeDatasetParameter: [
          {
            name: 'startDate18',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: tenYearsAgo,
          },
          {
            name: 'endDate18',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        projectedColumns: [
          'event_date',
          'platform',
          'app_version',
          'merged_user_id',
          'crashed_user_id',
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
