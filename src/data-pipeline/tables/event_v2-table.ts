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
  Column,
  Schema,
} from '@aws-cdk/aws-glue-alpha';


export function getEventTableColumns(): Column[] {
  return [
    {
      name: 'event_timestamp',
      type: Schema.TIMESTAMP,
    },
    {
      name: 'event_id',
      type: Schema.STRING,
    },
    {
      name: 'event_time_msec',
      type: Schema.BIG_INT,
    },
    {
      name: 'event_name',
      type: Schema.STRING,
    },
    {
      name: 'event_value',
      type: Schema.DOUBLE,
    },
    {
      name: 'event_value_currency',
      type: Schema.STRING,
    },
    {
      name: 'event_bundle_sequence_id',
      type: Schema.BIG_INT,
    },
    {
      name: 'ingest_time_msec',
      type: Schema.BIG_INT,
    },
    {
      name: 'device_mobile_brand_name',
      type: Schema.STRING,
    },
    {
      name: 'device_mobile_model_name',
      type: Schema.STRING,
    },
    {
      name: 'device_manufacturer',
      type: Schema.STRING,
    },
    {
      name: 'device_carrier',
      type: Schema.STRING,
    },
    {
      name: 'device_network_type',
      type: Schema.STRING,
    },
    {
      name: 'device_operating_system',
      type: Schema.STRING,
    },
    {
      name: 'device_operating_system_version',
      type: Schema.STRING,
    },
    {
      name: 'device_vendor_id',
      type: Schema.STRING,
    },
    {
      name: 'device_advertising_id',
      type: Schema.STRING,
    },
    {
      name: 'device_system_language',
      type: Schema.STRING,
    },
    {
      name: 'device_time_zone_offset_seconds',
      type: Schema.INTEGER,
    },
    {
      name: 'device_ua_browser',
      type: Schema.STRING,
    },
    {
      name: 'device_ua_browser_version',
      type: Schema.STRING,
    },
    {
      name: 'device_ua_os',
      type: Schema.STRING,
    },
    {
      name: 'device_ua_os_version',
      type: Schema.STRING,
    },
    {
      name: 'device_ua_device',
      type: Schema.STRING,
    },
    {
      name: 'device_ua_device_category',
      type: Schema.STRING,
    },
    {
      name: 'device_ua',
      type: Schema.map(Schema.STRING, Schema.STRING),
    },
    {
      name: 'device_screen_width',
      type: Schema.INTEGER,
    },
    {
      name: 'device_screen_height',
      type: Schema.INTEGER,
    },
    {
      name: 'device_viewport_width',
      type: Schema.INTEGER,
    },
    {
      name: 'device_viewport_height',
      type: Schema.INTEGER,
    },
    {
      name: 'geo_continent',
      type: Schema.STRING,
    },
    {
      name: 'geo_sub_continent',
      type: Schema.STRING,
    },
    {
      name: 'geo_country',
      type: Schema.STRING,
    },
    {
      name: 'geo_region',
      type: Schema.STRING,
    },
    {
      name: 'geo_metro',
      type: Schema.STRING,
    },
    {
      name: 'geo_city',
      type: Schema.STRING,
    },
    {
      name: 'geo_locale',
      type: Schema.STRING,
    },
    {
      name: 'traffic_source_source',
      type: Schema.STRING,
    },
    {
      name: 'traffic_source_medium',
      type: Schema.STRING,
    },
    {
      name: 'traffic_source_campaign',
      type: Schema.STRING,
    },
    {
      name: 'traffic_source_content',
      type: Schema.STRING,
    },
    {
      name: 'traffic_source_term',
      type: Schema.STRING,
    },
    {
      name: 'traffic_source_campaign_id',
      type: Schema.STRING,
    },
    {
      name: 'traffic_source_clid_platform',
      type: Schema.STRING,
    },
    {
      name: 'traffic_source_clid',
      type: Schema.STRING,
    },
    {
      name: 'traffic_source_channel_group',
      type: Schema.STRING,
    },
    {
      name: 'traffic_source_category',
      type: Schema.STRING,
    },
    {
      name: 'user_first_touch_time_msec',
      type: Schema.BIG_INT,
    },
    {
      name: 'app_package_id',
      type: Schema.STRING,
    },
    {
      name: 'app_version',
      type: Schema.STRING,
    },
    {
      name: 'app_title',
      type: Schema.STRING,
    },
    {
      name: 'app_install_source',
      type: Schema.STRING,
    },
    {
      name: 'platform',
      type: Schema.STRING,
    },
    {
      name: 'project_id',
      type: Schema.STRING,
    },
    {
      name: 'app_id',
      type: Schema.STRING,
    },
    {
      name: 'screen_view_screen_name',
      type: Schema.STRING,
    },
    {
      name: 'screen_view_screen_id',
      type: Schema.STRING,
    },
    {
      name: 'screen_view_screen_unique_id',
      type: Schema.STRING,
    },
    {
      name: 'screen_view_previous_screen_name',
      type: Schema.STRING,
    },
    {
      name: 'screen_view_previous_screen_id',
      type: Schema.STRING,
    },
    {
      name: 'screen_view_previous_screen_unique_id',
      type: Schema.STRING,
    },
    {
      name: 'screen_view_previous_time_msec',
      type: Schema.BIG_INT,
    },
    {
      name: 'screen_view_engagement_time_msec',
      type: Schema.BIG_INT,
    },
    {
      name: 'screen_view_entrances',
      type: Schema.BOOLEAN,
    },
    {
      name: 'page_view_page_referrer',
      type: Schema.STRING,
    },
    {
      name: 'page_view_page_referrer_title',
      type: Schema.STRING,
    },
    {
      name: 'page_view_previous_time_msec',
      type: Schema.BIG_INT,
    },
    {
      name: 'page_view_engagement_time_msec',
      type: Schema.BIG_INT,
    },
    {
      name: 'page_view_page_title',
      type: Schema.STRING,
    },
    {
      name: 'page_view_page_url',
      type: Schema.STRING,
    },
    {
      name: 'page_view_page_url_path',
      type: Schema.STRING,
    },
    {
      name: 'page_view_page_url_query_parameters',
      type: Schema.map(Schema.STRING, Schema.STRING),
    },
    {
      name: 'page_view_hostname',
      type: Schema.STRING,
    },
    {
      name: 'page_view_latest_referrer',
      type: Schema.STRING,
    },
    {
      name: 'page_view_latest_referrer_host',
      type: Schema.STRING,
    },
    {
      name: 'page_view_entrances',
      type: Schema.BOOLEAN,
    },
    {
      name: 'app_start_is_first_time',
      type: Schema.BOOLEAN,
    },
    {
      name: 'upgrade_previous_app_version',
      type: Schema.STRING,
    },
    {
      name: 'upgrade_previous_os_version',
      type: Schema.STRING,
    },
    {
      name: 'search_key',
      type: Schema.STRING,
    },
    {
      name: 'search_term',
      type: Schema.STRING,
    },
    {
      name: 'outbound_link_classes',
      type: Schema.STRING,
    },
    {
      name: 'outbound_link_domain',
      type: Schema.STRING,
    },
    {
      name: 'outbound_link_id',
      type: Schema.STRING,
    },
    {
      name: 'outbound_link_url',
      type: Schema.STRING,
    },
    {
      name: 'outbound_link',
      type: Schema.BOOLEAN,
    },
    {
      name: 'user_engagement_time_msec',
      type: Schema.BIG_INT,
    },
    {
      name: 'user_id',
      type: Schema.STRING,
    },
    {
      name: 'user_pseudo_id',
      type: Schema.STRING,
    },
    {
      name: 'session_id',
      type: Schema.STRING,
    },
    {
      name: 'session_start_time_msec',
      type: Schema.BIG_INT,
    },
    {
      name: 'session_duration',
      type: Schema.BIG_INT,
    },
    {
      name: 'session_number',
      type: Schema.BIG_INT,
    },
    {
      name: 'scroll_engagement_time_msec',
      type: Schema.BIG_INT,
    },
    {
      name: 'sdk_error_code',
      type: Schema.STRING,
    },
    {
      name: 'sdk_error_message',
      type: Schema.STRING,
    },
    {
      name: 'sdk_version',
      type: Schema.STRING,
    },
    {
      name: 'sdk_name',
      type: Schema.STRING,
    },
    {
      name: 'app_exception_message',
      type: Schema.STRING,
    },
    {
      name: 'app_exception_stack',
      type: Schema.STRING,
    },
    {
      name: 'custom_parameters_json_str',
      type: Schema.STRING,
    },
    {
      name: 'custom_parameters',
      type: Schema.map(Schema.STRING, Schema.struct([{
        name: 'value',
        type: Schema.STRING,
      },
      {
        name: 'type',
        type: Schema.STRING,
      }])),
    },
    {
      name: 'process_info',
      type: Schema.map(Schema.STRING, Schema.STRING),
    },
    {
      name: 'created_time',
      type: Schema.TIMESTAMP,
    },
  ];
}