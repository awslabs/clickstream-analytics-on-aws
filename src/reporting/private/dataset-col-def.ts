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


export const clickstream_event_attr_view_columns: InputColumn[] = [
  {
    "Name": "event_timestamp",
    "Type": "DATETIME"
  },
  {
    "Name": "event_id",
    "Type": "STRING"
  },
  {
    "Name": "user_pseudo_id",
    "Type": "STRING"
  },
  {
    "Name": "session_id",
    "Type": "STRING"
  },
  {
    "Name": "event_time_msec",
    "Type": "INTEGER"
  },
  {
    "Name": "event_name",
    "Type": "STRING"
  },
  {
    "Name": "platform",
    "Type": "STRING"
  },
  {
    "Name": "event_value",
    "Type": "DECIMAL"
  },
  {
    "Name": "event_value_currency",
    "Type": "STRING"
  },
  {
    "Name": "event_bundle_sequence_id",
    "Type": "INTEGER"
  },
  {
    "Name": "ingest_time_msec",
    "Type": "INTEGER"
  },
  {
    "Name": "device_mobile_brand_name",
    "Type": "STRING"
  },
  {
    "Name": "device_mobile_model_name",
    "Type": "STRING"
  },
  {
    "Name": "device_manufacturer",
    "Type": "STRING"
  },
  {
    "Name": "device_carrier",
    "Type": "STRING"
  },
  {
    "Name": "device_network_type",
    "Type": "STRING"
  },
  {
    "Name": "device_operating_system",
    "Type": "STRING"
  },
  {
    "Name": "device_operating_system_version",
    "Type": "STRING"
  },
  {
    "Name": "device_vendor_id",
    "Type": "STRING"
  },
  {
    "Name": "device_advertising_id",
    "Type": "STRING"
  },
  {
    "Name": "device_system_language",
    "Type": "STRING"
  },
  {
    "Name": "device_time_zone_offset_seconds",
    "Type": "INTEGER"
  },
  {
    "Name": "device_ua_browser",
    "Type": "STRING"
  },
  {
    "Name": "device_ua_browser_version",
    "Type": "STRING"
  },
  {
    "Name": "device_ua_device",
    "Type": "STRING"
  },
  {
    "Name": "device_ua_device_category",
    "Type": "STRING"
  },
  {
    "Name": "device_screen_width",
    "Type": "INTEGER"
  },
  {
    "Name": "device_screen_height",
    "Type": "INTEGER"
  },
  {
    "Name": "device_viewport_width",
    "Type": "INTEGER"
  },
  {
    "Name": "device_viewport_height",
    "Type": "INTEGER"
  },
  {
    "Name": "geo_continent",
    "Type": "STRING"
  },
  {
    "Name": "geo_sub_continent",
    "Type": "STRING"
  },
  {
    "Name": "geo_country",
    "Type": "STRING"
  },
  {
    "Name": "geo_region",
    "Type": "STRING"
  },
  {
    "Name": "geo_metro",
    "Type": "STRING"
  },
  {
    "Name": "geo_city",
    "Type": "STRING"
  },
  {
    "Name": "geo_locale",
    "Type": "STRING"
  },
  {
    "Name": "traffic_source_source",
    "Type": "STRING"
  },
  {
    "Name": "traffic_source_medium",
    "Type": "STRING"
  },
  {
    "Name": "traffic_source_campaign",
    "Type": "STRING"
  },
  {
    "Name": "traffic_source_content",
    "Type": "STRING"
  },
  {
    "Name": "traffic_source_term",
    "Type": "STRING"
  },
  {
    "Name": "traffic_source_campaign_id",
    "Type": "STRING"
  },
  {
    "Name": "traffic_source_clid_platform",
    "Type": "STRING"
  },
  {
    "Name": "traffic_source_clid",
    "Type": "STRING"
  },
  {
    "Name": "traffic_source_channel_group",
    "Type": "STRING"
  },
  {
    "Name": "traffic_source_category",
    "Type": "STRING"
  },
  {
    "Name": "user_first_touch_time_msec",
    "Type": "INTEGER"
  },
  {
    "Name": "app_package_id",
    "Type": "STRING"
  },
  {
    "Name": "app_id",
    "Type": "STRING"
  },
  {
    "Name": "app_version",
    "Type": "STRING"
  },
  {
    "Name": "app_title",
    "Type": "STRING"
  },
  {
    "Name": "app_install_source",
    "Type": "STRING"
  },
  {
    "Name": "project_id",
    "Type": "STRING"
  },
  {
    "Name": "screen_name",
    "Type": "STRING"
  },
  {
    "Name": "screen_id",
    "Type": "STRING"
  },
  {
    "Name": "screen_unique_id",
    "Type": "STRING"
  },
  {
    "Name": "previous_screen_name",
    "Type": "STRING"
  },
  {
    "Name": "previous_screen_id",
    "Type": "STRING"
  },
  {
    "Name": "previous_screen_unique_id",
    "Type": "STRING"
  },
  {
    "Name": "page_referrer",
    "Type": "STRING"
  },
  {
    "Name": "page_referrer_title",
    "Type": "STRING"
  },
  {
    "Name": "page_title",
    "Type": "STRING"
  },
  {
    "Name": "page_url",
    "Type": "STRING"
  },
  {
    "Name": "page_url_path",
    "Type": "STRING"
  },
  {
    "Name": "hostname",
    "Type": "STRING"
  },
  {
    "Name": "latest_referrer",
    "Type": "STRING"
  },
  {
    "Name": "latest_referrer_host",
    "Type": "STRING"
  },
  {
    "Name": "app_start_is_first_time",
    "Type": "BOOLEAN"
  },
  {
    "Name": "previous_view_time_msec",
    "Type": "INTEGER"
  },
  {
    "Name": "previous_view_engagement_time_msec",
    "Type": "INTEGER"
  },
  {
    "Name": "entrances",
    "Type": "BOOLEAN"
  },
  {
    "Name": "previous_app_version",
    "Type": "STRING"
  },
  {
    "Name": "previous_os_version",
    "Type": "STRING"
  },
  {
    "Name": "search_key",
    "Type": "STRING"
  },
  {
    "Name": "search_term",
    "Type": "STRING"
  },
  {
    "Name": "outbound_link_classes",
    "Type": "STRING"
  },
  {
    "Name": "outbound_link_domain",
    "Type": "STRING"
  },
  {
    "Name": "outbound_link_id",
    "Type": "STRING"
  },
  {
    "Name": "outbound_link_url",
    "Type": "STRING"
  },
  {
    "Name": "outbound_link",
    "Type": "BOOLEAN"
  },
  {
    "Name": "user_engagement_time_msec",
    "Type": "INTEGER"
  },
  {
    "Name": "scroll_engagement_time_msec",
    "Type": "INTEGER"
  },
  {
    "Name": "sdk_error_code",
    "Type": "STRING"
  },
  {
    "Name": "sdk_error_message",
    "Type": "STRING"
  },
  {
    "Name": "sdk_exception_message",
    "Type": "STRING"
  },
  {
    "Name": "sdk_exception_stack",
    "Type": "STRING"
  },
  {
    "Name": "sdk_version",
    "Type": "STRING"
  },
  {
    "Name": "sdk_name",
    "Type": "STRING"
  },
  {
    "Name": "custom_parameters_json_str",
    "Type": "STRING"
  },
  {
    "Name": "session_duration",
    "Type": "INTEGER"
  },
  {
    "Name": "session_number",
    "Type": "INTEGER"
  },
  {
    "Name": "session_start_time_msec",
    "Type": "INTEGER"
  },
  {
    "Name": "session_source",
    "Type": "STRING"
  },
  {
    "Name": "session_medium",
    "Type": "STRING"
  },
  {
    "Name": "session_campaign",
    "Type": "STRING"
  },
  {
    "Name": "session_content",
    "Type": "STRING"
  },
  {
    "Name": "session_term",
    "Type": "STRING"
  },
  {
    "Name": "session_campaign_id",
    "Type": "STRING"
  },
  {
    "Name": "session_clid_platform",
    "Type": "STRING"
  },
  {
    "Name": "session_clid",
    "Type": "STRING"
  },
  {
    "Name": "session_channel_group",
    "Type": "STRING"
  },
  {
    "Name": "session_source_category",
    "Type": "STRING"
  }  

];

export const clickstream_event_view_columns: InputColumn[] = [
  ...clickstream_event_attr_view_columns,
  {
    "Name": "user_id",
    "Type": "STRING"
  },
  {
    "Name": "first_touch_time_msec",
    "Type": "INTEGER"
  },
  {
    "Name": "first_visit_date",
    "Type": "DATETIME"
  },
  {
    "Name": "first_referrer",
    "Type": "STRING"
  },
  {
    "Name": "first_traffic_category",
    "Type": "STRING"
  },
  {
    "Name": "first_traffic_source",
    "Type": "STRING"
  },
  {
    "Name": "first_traffic_medium",
    "Type": "STRING"
  },
  {
    "Name": "first_traffic_campaign",
    "Type": "STRING"
  },
  {
    "Name": "first_traffic_content",
    "Type": "STRING"
  },
  {
    "Name": "first_traffic_term",
    "Type": "STRING"
  },
  {
    "Name": "first_traffic_campaign_id",
    "Type": "STRING"
  },
  {
    "Name": "first_traffic_clid_platform",
    "Type": "STRING"
  },
  {
    "Name": "first_traffic_clid",
    "Type": "STRING"
  },
  {
    "Name": "first_traffic_channel_group",
    "Type": "STRING"
  },
  {
    "Name": "first_app_install_source",
    "Type": "STRING"
  },
  {
    "Name": "user_properties_json_str",
    "Type": "STRING"
  }  
];

export const clickstream_item_view_columns: InputColumn[] = [

  {
    "Name": "item_id",
    "Type": "STRING"
  },
  {
    "Name": "name",
    "Type": "STRING"
  },
  {
    "Name": "brand",
    "Type": "STRING"
  },
  {
    "Name": "currency",
    "Type": "STRING"
  },
  {
    "Name": "price",
    "Type": "DECIMAL"
  },
  {
    "Name": "quantity",
    "Type": "DECIMAL"
  },
  {
    "Name": "creative_name",
    "Type": "STRING"
  },
  {
    "Name": "creative_slot",
    "Type": "STRING"
  },
  {
    "Name": "location_id",
    "Type": "STRING"
  },
  {
    "Name": "category",
    "Type": "STRING"
  },
  {
    "Name": "category2",
    "Type": "STRING"
  },
  {
    "Name": "category3",
    "Type": "STRING"
  },
  {
    "Name": "category4",
    "Type": "STRING"
  },
  {
    "Name": "category5",
    "Type": "STRING"
  },
  {
    "Name": "custom_parameters_json_str",
    "Type": "STRING"
  }
  
]