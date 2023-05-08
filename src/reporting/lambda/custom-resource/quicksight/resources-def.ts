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

export const clickstream_daily_active_user_view_columns = [
  {
    Name: 'user_type',
    Type: 'STRING',
  },
  {
    Name: 'mobile_brand',
    Type: 'STRING',
  },
  {
    Name: 'country',
    Type: 'STRING',
  },
  {
    Name: 'event_create_day',
    Type: 'DATETIME',
  },
];

export const clickstream_dau_wau_view_columns = [
  {
    Name: 'today_active_user_num',
    Type: 'INTEGER',
  },
  {
    Name: 'active_user_numer_last_7_days',
    Type: 'INTEGER',
  },
  {
    Name: 'event_create_day',
    Type: 'DATETIME',
  },
];

export const clickstream_retention_view_columns = [
  {
    Name: 'day_cohort',
    Type: 'DATETIME',
  },
  {
    Name: 'day_3',
    Type: 'INTEGER',
  },
  {
    Name: 'day_1',
    Type: 'INTEGER',
  },
  {
    Name: 'day_2',
    Type: 'INTEGER',
  },
];

export const clickstream_ods_events_view_columns = [

  {
    Name: 'event_id',
    Type: 'STRING',
  },
  {
    Name: 'event_date_d',
    Type: 'DATETIME',
  },

];

export const clickstream_ods_flattened_view_columns = [

  {
    Name: 'event_parameter_value',
    Type: 'STRING',
  },
  {
    Name: 'event_name',
    Type: 'STRING',
  },
  {
    Name: 'platform',
    Type: 'STRING',
  },
  {
    Name: 'event_date',
    Type: 'DATETIME',
  },
  {
    Name: 'event_id',
    Type: 'STRING',
  },
  {
    Name: 'user_pseudo_id',
    Type: 'STRING',
  },
  {
    Name: 'app_info_version',
    Type: 'STRING',
  },
  {
    Name: 'geo_country',
    Type: 'STRING',
  },
  {
    Name: 'event_parameter_key',
    Type: 'STRING',
  },

];

export const clickstream_session_view_columns = [

  {
    Name: 'session_engagement_time_min',
    Type: 'DECIMAL',
  },
  {
    Name: 'exit_view',
    Type: 'STRING',
  },
  {
    Name: 'session_date',
    Type: 'DATETIME',
  },
  {
    Name: 'platform',
    Type: 'STRING',
  },
  {
    Name: 'session_views',
    Type: 'INTEGER',
  },
  {
    Name: 'session_id',
    Type: 'STRING',
  },
  {
    Name: 'user_pseudo_id',
    Type: 'STRING',
  },
  {
    Name: 'engaged_session',
    Type: 'INTEGER',
  },
  {
    Name: 'entry_view',
    Type: 'STRING',
  },

];

export const clickstream_user_dim_view_columns = [

  {
    Name: 'user_id',
    Type: 'STRING',
  },
  {
    Name: 'custom_attr_value',
    Type: 'STRING',
  },
  {
    Name: 'is_registered',
    Type: 'STRING',
  },
  {
    Name: 'first_visit_country',
    Type: 'STRING',
  },
  {
    Name: 'first_traffic_source_source',
    Type: 'STRING',
  },
  {
    Name: 'first_traffic_source_name',
    Type: 'STRING',
  },
  {
    Name: 'custom_attr_key',
    Type: 'STRING',
  },
  {
    Name: 'first_visit_city',
    Type: 'STRING',
  },
  {
    Name: 'first_traffic_source_medium',
    Type: 'STRING',
  },
  {
    Name: 'first_visit_install_source',
    Type: 'STRING',
  },
  {
    Name: 'first_visit_device_language',
    Type: 'STRING',
  },
  {
    Name: 'user_pseudo_id',
    Type: 'STRING',
  },
  {
    Name: 'first_visit_date',
    Type: 'DATETIME',
  },
  {
    Name: 'first_platform',
    Type: 'STRING',
  },

];