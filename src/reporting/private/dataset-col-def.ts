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

import { InputColumn } from '@aws-sdk/client-quicksight';

export const clickstream_retention_view_columns: InputColumn[] = [
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
];

export const clickstream_event_view_columns: InputColumn[] = [
  {
    Name: 'event_date',
    Type: 'DATETIME',
  },
  {
    Name: 'event_name',
    Type: 'STRING',
  },
  {
    Name: 'event_id',
    Type: 'STRING',
  },
  {
    Name: 'event_bundle_sequence_id',
    Type: 'INTEGER',
  },
  {
    Name: 'event_previous_timestamp',
    Type: 'INTEGER',
  },
  {
    Name: 'event_timestamp',
    Type: 'INTEGER',
  },
  {
    Name: 'event_value_in_usd',
    Type: 'DECIMAL',
  },
  {
    Name: 'app_info_app_id',
    Type: 'STRING',
  },
  {
    Name: 'app_info_package_id',
    Type: 'STRING',
  },
  {
    Name: 'app_info_install_source',
    Type: 'STRING',
  },
  {
    Name: 'app_info_version',
    Type: 'STRING',
  },
  {
    Name: 'app_info_sdk_name',
    Type: 'STRING',
  },
  {
    Name: 'app_info_sdk_version',
    Type: 'STRING',
  },
  {
    Name: 'device_mobile_brand_name',
    Type: 'STRING',
  },
  {
    Name: 'device_mobile_model_name',
    Type: 'STRING',
  },
  {
    Name: 'device_manufacturer',
    Type: 'STRING',
  },
  {
    Name: 'device_screen_width',
    Type: 'INTEGER',
  },
  {
    Name: 'device_screen_height',
    Type: 'INTEGER',
  },
  {
    Name: 'device_carrier',
    Type: 'STRING',
  },
  {
    Name: 'device_network_type',
    Type: 'STRING',
  },
  {
    Name: 'device_operating_system',
    Type: 'STRING',
  },
  {
    Name: 'device_operating_system_version',
    Type: 'STRING',
  },
  {
    Name: 'host_name',
    Type: 'STRING',
  },
  {
    Name: 'ua_browser',
    Type: 'STRING',
  },
  {
    Name: 'ua_browser_version',
    Type: 'STRING',
  },
  {
    Name: 'ua_os',
    Type: 'STRING',
  },
  {
    Name: 'ua_os_version',
    Type: 'STRING',
  },
  {
    Name: 'ua_device',
    Type: 'STRING',
  },
  {
    Name: 'ua_device_category',
    Type: 'STRING',
  },
  {
    Name: 'device_system_language',
    Type: 'STRING',
  },
  {
    Name: 'device_time_zone_offset_seconds',
    Type: 'INTEGER',
  },
  {
    Name: 'geo_continent',
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
    Name: 'geo_metro',
    Type: 'STRING',
  },
  {
    Name: 'geo_region',
    Type: 'STRING',
  },
  {
    Name: 'geo_sub_continent',
    Type: 'STRING',
  },
  {
    Name: 'geo_locale',
    Type: 'STRING',
  },
  {
    Name: 'platform',
    Type: 'STRING',
  },
  {
    Name: 'project_id',
    Type: 'STRING',
  },
  {
    Name: 'traffic_source_name',
    Type: 'STRING',
  },
  {
    Name: 'traffic_source_medium',
    Type: 'STRING',
  },
  {
    Name: 'traffic_source_source',
    Type: 'STRING',
  },
  {
    Name: 'user_first_touch_timestamp',
    Type: 'INTEGER',
  },
  {
    Name: 'user_id',
    Type: 'STRING',
  },
  {
    Name: 'user_pseudo_id',
    Type: 'STRING',
  },
];

export const clickstream_event_parameter_view_columns: InputColumn[] = [
  {
    Name: 'event_id',
    Type: 'STRING',
  },
  {
    Name: 'event_name',
    Type: 'STRING',
  },
  {
    Name: 'event_date',
    Type: 'DATETIME',
  },
  {
    Name: 'event_param_key',
    Type: 'STRING',
  },
  {
    Name: 'event_param_double_value',
    Type: 'DECIMAL',
  },
  {
    Name: 'event_param_float_value',
    Type: 'DECIMAL',
  },
  {
    Name: 'event_param_int_value',
    Type: 'INTEGER',
  },
  {
    Name: 'event_param_string_value',
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
  {
    Name: 'user_pseudo_id',
    Type: 'STRING',
  },
  {
    Name: 'event_timestamp',
    Type: 'INTEGER',
  },
];

export const clickstream_lifecycle_daily_view_columns: InputColumn[] = [
  {
    Name: 'time_period',
    Type: 'DATETIME',
  },
  {
    Name: 'this_day_value',
    Type: 'STRING',
  },
  {
    Name: 'sum',
    Type: 'INTEGER',
  },
];

export const clickstream_lifecycle_weekly_view_columns: InputColumn[] = [
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
];

export const clickstream_device_view_columns: InputColumn[] = [
  {
    Name: 'device_id',
    Type: 'STRING',
  },
  {
    Name: 'event_date',
    Type: 'DATETIME',
  },
  {
    Name: 'mobile_brand_name',
    Type: 'STRING',
  },
  {
    Name: 'mobile_model_name',
    Type: 'STRING',
  },
  {
    Name: 'manufacturer',
    Type: 'STRING',
  },
  {
    Name: 'screen_width',
    Type: 'INTEGER',
  },
  {
    Name: 'screen_height',
    Type: 'INTEGER',
  },
  {
    Name: 'carrier',
    Type: 'STRING',
  },
  {
    Name: 'network_type',
    Type: 'STRING',
  },
  {
    Name: 'operating_system',
    Type: 'STRING',
  },
  {
    Name: 'operating_system_version',
    Type: 'STRING',
  },
  {
    Name: 'host_name',
    Type: 'STRING',
  },
  {
    Name: 'ua_browser',
    Type: 'STRING',
  },
  {
    Name: 'ua_browser_version',
    Type: 'STRING',
  },
  {
    Name: 'ua_os',
    Type: 'STRING',
  },
  {
    Name: 'ua_os_version',
    Type: 'STRING',
  },
  {
    Name: 'ua_device',
    Type: 'STRING',
  },
  {
    Name: 'ua_device_category',
    Type: 'STRING',
  },
  {
    Name: 'system_language',
    Type: 'STRING',
  },
  {
    Name: 'time_zone_offset_seconds',
    Type: 'INTEGER',
  },
  {
    Name: 'advertising_id',
    Type: 'STRING',
  },
  {
    Name: 'user_pseudo_id',
    Type: 'STRING',
  },
  {
    Name: 'user_id',
    Type: 'STRING',
  },
  {
    Name: 'usage_num',
    Type: 'INTEGER',
  },
];

export const clickstream_session_view_columns: InputColumn[] = [
  {
    Name: 'session_id',
    Type: 'STRING',
  },
  {
    Name: 'user_pseudo_id',
    Type: 'STRING',
  },
  {
    Name: 'platform',
    Type: 'STRING',
  },
  {
    Name: 'session_duration',
    Type: 'INTEGER',
  },
  {
    Name: 'session_views',
    Type: 'INTEGER',
  },
  {
    Name: 'engaged_session',
    Type: 'INTEGER',
  },
  {
    Name: 'bounced_session',
    Type: 'INTEGER',
  },
  {
    Name: 'session_start_timestamp',
    Type: 'INTEGER',
  },
  {
    Name: 'session_engagement_time',
    Type: 'INTEGER',
  },
  {
    Name: 'session_date',
    Type: 'DATETIME',
  },
  {
    Name: 'session_date_hour',
    Type: 'DATETIME',
  },
  {
    Name: 'entry_view',
    Type: 'STRING',
  },
  {
    Name: 'exit_view',
    Type: 'STRING',
  },
];

export const clickstream_user_attr_view_columns: InputColumn[] = [
  {
    Name: 'user_pseudo_id',
    Type: 'STRING',
  },
  {
    Name: 'user_id',
    Type: 'STRING',
  },
  {
    Name: 'custom_attr_key',
    Type: 'STRING',
  },
  {
    Name: 'custom_attr_value',
    Type: 'STRING',
  },
  {
    Name: 'user_first_touch_timestamp',
    Type: 'INTEGER',
  },
  {
    Name: '_first_visit_date',
    Type: 'DATETIME',
  },
  {
    Name: '_first_referer',
    Type: 'STRING',
  },
  {
    Name: '_first_traffic_source_type',
    Type: 'STRING',
  },
  {
    Name: '_first_traffic_medium',
    Type: 'STRING',
  },
  {
    Name: '_first_traffic_source',
    Type: 'STRING',
  },
  {
    Name: '_channel',
    Type: 'STRING',
  },
];

export const clickstream_user_dim_view_columns: InputColumn[] = [
  {
    Name: 'user_pseudo_id',
    Type: 'STRING',
  },
  {
    Name: 'user_id',
    Type: 'STRING',
  },
  {
    Name: 'first_visit_date',
    Type: 'DATETIME',
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
    Name: 'first_platform',
    Type: 'STRING',
  },
  {
    Name: 'first_visit_country',
    Type: 'STRING',
  },
  {
    Name: 'first_visit_city',
    Type: 'STRING',
  },
  {
    Name: 'first_traffic_source_source',
    Type: 'STRING',
  },
  {
    Name: 'first_traffic_source_medium',
    Type: 'STRING',
  },
  {
    Name: 'first_traffic_source_name',
    Type: 'STRING',
  },
  {
    Name: 'first_referer',
    Type: 'STRING',
  },
  {
    Name: 'first_visit_channel',
    Type: 'STRING',
  },
  {
    Name: 'device_id',
    Type: 'STRING',
  },
  {
    Name: 'registration_status',
    Type: 'STRING',
  },
];