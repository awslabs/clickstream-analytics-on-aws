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

import { ExploreComputeMethod, ExploreConversionIntervalType, ExploreGroupColumn, ExplorePathNodeType, ExplorePathSessionDef, ExploreTimeScopeType, MetadataPlatform, MetadataValueType } from '../../common/explore-types';
import { buildFunnelDataSql, buildFunnelView, buildEventPathAnalysisView, buildNodePathAnalysisView, buildEventAnalysisView, buildRetentionAnalysisView, ExploreAnalyticsOperators } from '../../service/quicksight/sql-builder';

describe('SQL Builder test', () => {

  beforeEach(() => {
  });

  test('funnel sql - user_cnt', () => {

    const sql = buildFunnelDataSql('app1', 'testview', {
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: 'add_button_click',

        },
        {
          eventName: 'note_share',

        },
        {
          eventName: 'note_export',

        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-04-30'),
      timeEnd: new Date('2023-06-30'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`CREATE OR REPLACE VIEW
    app1.testview AS
  with
    tmp_data as (
      select
        event_date,
        event_name,
        event_id,
        event_bundle_sequence_id::bigint as event_bundle_sequence_id,
        event_previous_timestamp::bigint as event_previous_timestamp,
        event_server_timestamp_offset::bigint as event_server_timestamp_offset,
        event_timestamp::bigint as event_timestamp,
        ingest_timestamp,
        event_value_in_usd,
        app_info.app_id::varchar as app_info_app_id,
        app_info.id::varchar as app_info_package_id,
        app_info.install_source::varchar as app_info_install_source,
        app_info.version::varchar as app_info_version,
        device.vendor_id::varchar as device_id,
        device.mobile_brand_name::varchar as device_mobile_brand_name,
        device.mobile_model_name::varchar as device_mobile_model_name,
        device.manufacturer::varchar as device_manufacturer,
        device.screen_width::bigint as device_screen_width,
        device.screen_height::bigint as device_screen_height,
        device.carrier::varchar as device_carrier,
        device.network_type::varchar as device_network_type,
        device.operating_system::varchar as device_operating_system,
        device.operating_system_version::varchar as device_operating_system_version,
        device.ua_browser::varchar as device_ua_browser,
        device.ua_browser_version::varchar as device_ua_browser_version,
        device.ua_os::varchar as device_ua_os,
        device.ua_os_version::varchar as device_ua_os_version,
        device.ua_device::varchar as device_ua_device,
        device.ua_device_category::varchar as device_ua_device_category,
        device.system_language::varchar as device_system_language,
        device.time_zone_offset_seconds::bigint as device_time_zone_offset_seconds,
        device.advertising_id::varchar as device_advertising_id,
        geo.continent::varchar as geo_continent,
        geo.country::varchar as geo_country,
        geo.city::varchar as geo_city,
        geo.metro::varchar as geo_metro,
        geo.region::varchar as geo_region,
        geo.sub_continent::varchar as geo_sub_continent,
        geo.locale::varchar as geo_locale,
        platform,
        project_id,
        traffic_source.name::varchar as traffic_source_name,
        traffic_source.medium::varchar as traffic_source_medium,
        traffic_source.source::varchar as traffic_source_source,
        user_first_touch_timestamp,
        user_id,
        user_pseudo_id,
        user_ltv,
        event_dimensions,
        ecommerce,
        items,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM'
        ) as month,
        TO_CHAR(
          date_trunc(
            'week',
            TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second'
          ),
          'YYYY-MM-DD'
        ) || ' - ' || TO_CHAR(
          date_trunc(
            'week',
            (
              TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second'
            ) + INTERVAL '6 days'
          ),
          'YYYY-MM-DD'
        ) as week,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD'
        ) as day,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD HH24'
        ) || '00:00' as hour,
        user_properties,
        event_params
      from
        app1.ods_events ods
      where
        event_date >= 'SunApr30202300:00:00GMT+0000(CoordinatedUniversalTime)'
        and event_date <= 'FriJun30202300:00:00GMT+0000(CoordinatedUniversalTime)'
        and event_name in ('add_button_click', 'note_share', 'note_export')
    ),
    tmp_base_data as (
      select
        *
      from
        tmp_data base
    ),
    base_data as (
      select
        *
      from
        tmp_base_data
      where
        1 = 1
        and (
          (event_name = 'add_button_click')
          or (event_name = 'note_share')
          or (event_name = 'note_export')
        )
    ),
    table_0 as (
      select
        month,
        week,
        day,
        hour,
        event_date as event_date_0,
        event_name as event_name_0,
        event_id as event_id_0,
        event_bundle_sequence_id as event_bundle_sequence_id_0,
        event_previous_timestamp as event_previous_timestamp_0,
        event_server_timestamp_offset as event_server_timestamp_offset_0,
        event_timestamp as event_timestamp_0,
        ingest_timestamp as ingest_timestamp_0,
        event_value_in_usd as event_value_in_usd_0,
        app_info_app_id as app_info_app_id_0,
        app_info_package_id as app_info_package_id_0,
        app_info_install_source as app_info_install_source_0,
        app_info_version as app_info_version_0,
        device_id as device_id_0,
        device_mobile_brand_name as device_mobile_brand_name_0,
        device_mobile_model_name as device_mobile_model_name_0,
        device_manufacturer as device_manufacturer_0,
        device_screen_width as device_screen_width_0,
        device_screen_height as device_screen_height_0,
        device_carrier as device_carrier_0,
        device_network_type as device_network_type_0,
        device_operating_system as device_operating_system_0,
        device_operating_system_version as device_operating_system_version_0,
        device_ua_browser as ua_browser_0,
        device_ua_browser_version as ua_browser_version_0,
        device_ua_os as ua_os_0,
        device_ua_os_version as ua_os_version_0,
        device_ua_device as ua_device_0,
        device_ua_device_category as ua_device_category_0,
        device_system_language as device_system_language_0,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_0,
        device_advertising_id as advertising_id_0,
        geo_continent as geo_continent_0,
        geo_country as geo_country_0,
        geo_city as geo_city_0,
        geo_metro as geo_metro_0,
        geo_region as geo_region_0,
        geo_sub_continent as geo_sub_continent_0,
        geo_locale as geo_locale_0,
        platform as platform_0,
        project_id as project_id_0,
        traffic_source_name as traffic_source_name_0,
        traffic_source_medium as traffic_source_medium_0,
        traffic_source_source as traffic_source_source_0,
        user_first_touch_timestamp as user_first_touch_timestamp_0,
        user_id as user_id_0,
        user_pseudo_id as user_pseudo_id_0,
        user_ltv as user_ltv_0,
        event_dimensions as event_dimensions_0,
        ecommerce as ecommerce_0,
        items as items_0
      from
        base_data base
      where
        event_name = 'add_button_click'
    ),
    table_1 as (
      select
        event_date as event_date_1,
        event_name as event_name_1,
        event_id as event_id_1,
        event_bundle_sequence_id as event_bundle_sequence_id_1,
        event_previous_timestamp as event_previous_timestamp_1,
        event_server_timestamp_offset as event_server_timestamp_offset_1,
        event_timestamp as event_timestamp_1,
        ingest_timestamp as ingest_timestamp_1,
        event_value_in_usd as event_value_in_usd_1,
        app_info_app_id as app_info_app_id_1,
        app_info_package_id as app_info_package_id_1,
        app_info_install_source as app_info_install_source_1,
        app_info_version as app_info_version_1,
        device_id as device_id_1,
        device_mobile_brand_name as device_mobile_brand_name_1,
        device_mobile_model_name as device_mobile_model_name_1,
        device_manufacturer as device_manufacturer_1,
        device_screen_width as device_screen_width_1,
        device_screen_height as device_screen_height_1,
        device_carrier as device_carrier_1,
        device_network_type as device_network_type_1,
        device_operating_system as device_operating_system_1,
        device_operating_system_version as device_operating_system_version_1,
        device_ua_browser as ua_browser_1,
        device_ua_browser_version as ua_browser_version_1,
        device_ua_os as ua_os_1,
        device_ua_os_version as ua_os_version_1,
        device_ua_device as ua_device_1,
        device_ua_device_category as ua_device_category_1,
        device_system_language as device_system_language_1,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_1,
        device_advertising_id as advertising_id_1,
        geo_continent as geo_continent_1,
        geo_country as geo_country_1,
        geo_city as geo_city_1,
        geo_metro as geo_metro_1,
        geo_region as geo_region_1,
        geo_sub_continent as geo_sub_continent_1,
        geo_locale as geo_locale_1,
        platform as platform_1,
        project_id as project_id_1,
        traffic_source_name as traffic_source_name_1,
        traffic_source_medium as traffic_source_medium_1,
        traffic_source_source as traffic_source_source_1,
        user_first_touch_timestamp as user_first_touch_timestamp_1,
        user_id as user_id_1,
        user_pseudo_id as user_pseudo_id_1,
        user_ltv as user_ltv_1,
        event_dimensions as event_dimensions_1,
        ecommerce as ecommerce_1,
        items as items_1
      from
        base_data base
      where
        event_name = 'note_share'
    ),
    table_2 as (
      select
        event_date as event_date_2,
        event_name as event_name_2,
        event_id as event_id_2,
        event_bundle_sequence_id as event_bundle_sequence_id_2,
        event_previous_timestamp as event_previous_timestamp_2,
        event_server_timestamp_offset as event_server_timestamp_offset_2,
        event_timestamp as event_timestamp_2,
        ingest_timestamp as ingest_timestamp_2,
        event_value_in_usd as event_value_in_usd_2,
        app_info_app_id as app_info_app_id_2,
        app_info_package_id as app_info_package_id_2,
        app_info_install_source as app_info_install_source_2,
        app_info_version as app_info_version_2,
        device_id as device_id_2,
        device_mobile_brand_name as device_mobile_brand_name_2,
        device_mobile_model_name as device_mobile_model_name_2,
        device_manufacturer as device_manufacturer_2,
        device_screen_width as device_screen_width_2,
        device_screen_height as device_screen_height_2,
        device_carrier as device_carrier_2,
        device_network_type as device_network_type_2,
        device_operating_system as device_operating_system_2,
        device_operating_system_version as device_operating_system_version_2,
        device_ua_browser as ua_browser_2,
        device_ua_browser_version as ua_browser_version_2,
        device_ua_os as ua_os_2,
        device_ua_os_version as ua_os_version_2,
        device_ua_device as ua_device_2,
        device_ua_device_category as ua_device_category_2,
        device_system_language as device_system_language_2,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_2,
        device_advertising_id as advertising_id_2,
        geo_continent as geo_continent_2,
        geo_country as geo_country_2,
        geo_city as geo_city_2,
        geo_metro as geo_metro_2,
        geo_region as geo_region_2,
        geo_sub_continent as geo_sub_continent_2,
        geo_locale as geo_locale_2,
        platform as platform_2,
        project_id as project_id_2,
        traffic_source_name as traffic_source_name_2,
        traffic_source_medium as traffic_source_medium_2,
        traffic_source_source as traffic_source_source_2,
        user_first_touch_timestamp as user_first_touch_timestamp_2,
        user_id as user_id_2,
        user_pseudo_id as user_pseudo_id_2,
        user_ltv as user_ltv_2,
        event_dimensions as event_dimensions_2,
        ecommerce as ecommerce_2,
        items as items_2
      from
        base_data base
      where
        event_name = 'note_export'
    ),
    join_table as (
      select
        table_0.*,
        table_1.event_id_1,
        table_1.event_name_1,
        table_1.user_pseudo_id_1,
        table_1.event_timestamp_1,
        table_2.event_id_2,
        table_2.event_name_2,
        table_2.user_pseudo_id_2,
        table_2.event_timestamp_2
      from
        table_0
        left outer join table_1 on table_0.user_pseudo_id_0 = table_1.user_pseudo_id_1
        and table_1.event_timestamp_1 - table_0.event_timestamp_0 > 0
        and table_1.event_timestamp_1 - table_0.event_timestamp_0 < 600 * 1000
        left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
        and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
        and table_2.event_timestamp_2 - table_1.event_timestamp_1 < 600 * 1000
    )
  select
    DAY,
    count(distinct user_pseudo_id_0) as add_button_click,
    (
      count(distinct user_pseudo_id_2)::decimal / NULLIF(count(distinct user_pseudo_id_0), 0)
    )::decimal(20, 4) as rate,
    count(distinct user_pseudo_id_1) as note_share,
    (
      count(distinct user_pseudo_id_1)::decimal / NULLIF(count(distinct user_pseudo_id_0), 0)
    )::decimal(20, 4) as note_share_rate,
    count(distinct user_pseudo_id_2) as note_export,
    (
      count(distinct user_pseudo_id_2)::decimal / NULLIF(count(distinct user_pseudo_id_1), 0)
    )::decimal(20, 4) as note_export_rate
  from
    join_table
  group by
    DAY
  `.trim().replace(/ /g, ''),
    );

  });

  test('funnel sql - event_cnt', () => {

    const sql = buildFunnelDataSql('app1', 'testview', {
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.EVENT_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: 'add_button_click',

        },
        {
          eventName: 'note_share',

        },
        {
          eventName: 'note_export',

        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-04-30'),
      timeEnd: new Date('2023-06-30'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`CREATE OR REPLACE VIEW
    app1.testview AS
  with
    tmp_data as (
      select
        event_date,
        event_name,
        event_id,
        event_bundle_sequence_id::bigint as event_bundle_sequence_id,
        event_previous_timestamp::bigint as event_previous_timestamp,
        event_server_timestamp_offset::bigint as event_server_timestamp_offset,
        event_timestamp::bigint as event_timestamp,
        ingest_timestamp,
        event_value_in_usd,
        app_info.app_id::varchar as app_info_app_id,
        app_info.id::varchar as app_info_package_id,
        app_info.install_source::varchar as app_info_install_source,
        app_info.version::varchar as app_info_version,
        device.vendor_id::varchar as device_id,
        device.mobile_brand_name::varchar as device_mobile_brand_name,
        device.mobile_model_name::varchar as device_mobile_model_name,
        device.manufacturer::varchar as device_manufacturer,
        device.screen_width::bigint as device_screen_width,
        device.screen_height::bigint as device_screen_height,
        device.carrier::varchar as device_carrier,
        device.network_type::varchar as device_network_type,
        device.operating_system::varchar as device_operating_system,
        device.operating_system_version::varchar as device_operating_system_version,
        device.ua_browser::varchar as device_ua_browser,
        device.ua_browser_version::varchar as device_ua_browser_version,
        device.ua_os::varchar as device_ua_os,
        device.ua_os_version::varchar as device_ua_os_version,
        device.ua_device::varchar as device_ua_device,
        device.ua_device_category::varchar as device_ua_device_category,
        device.system_language::varchar as device_system_language,
        device.time_zone_offset_seconds::bigint as device_time_zone_offset_seconds,
        device.advertising_id::varchar as device_advertising_id,
        geo.continent::varchar as geo_continent,
        geo.country::varchar as geo_country,
        geo.city::varchar as geo_city,
        geo.metro::varchar as geo_metro,
        geo.region::varchar as geo_region,
        geo.sub_continent::varchar as geo_sub_continent,
        geo.locale::varchar as geo_locale,
        platform,
        project_id,
        traffic_source.name::varchar as traffic_source_name,
        traffic_source.medium::varchar as traffic_source_medium,
        traffic_source.source::varchar as traffic_source_source,
        user_first_touch_timestamp,
        user_id,
        user_pseudo_id,
        user_ltv,
        event_dimensions,
        ecommerce,
        items,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM'
        ) as month,
        TO_CHAR(
          date_trunc(
            'week',
            TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second'
          ),
          'YYYY-MM-DD'
        ) || ' - ' || TO_CHAR(
          date_trunc(
            'week',
            (
              TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second'
            ) + INTERVAL '6 days'
          ),
          'YYYY-MM-DD'
        ) as week,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD'
        ) as day,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD HH24'
        ) || '00:00' as hour,
        user_properties,
        event_params
      from
        app1.ods_events ods
      where
        event_date >= 'SunApr30202300:00:00GMT+0000(CoordinatedUniversalTime)'
        and event_date <= 'FriJun30202300:00:00GMT+0000(CoordinatedUniversalTime)'
        and event_name in ('add_button_click', 'note_share', 'note_export')
    ),
    tmp_base_data as (
      select
        *
      from
        tmp_data base
    ),
    base_data as (
      select
        *
      from
        tmp_base_data
      where
        1 = 1
        and (
          (event_name = 'add_button_click')
          or (event_name = 'note_share')
          or (event_name = 'note_export')
        )
    ),
    table_0 as (
      select
        month,
        week,
        day,
        hour,
        event_date as event_date_0,
        event_name as event_name_0,
        event_id as event_id_0,
        event_bundle_sequence_id as event_bundle_sequence_id_0,
        event_previous_timestamp as event_previous_timestamp_0,
        event_server_timestamp_offset as event_server_timestamp_offset_0,
        event_timestamp as event_timestamp_0,
        ingest_timestamp as ingest_timestamp_0,
        event_value_in_usd as event_value_in_usd_0,
        app_info_app_id as app_info_app_id_0,
        app_info_package_id as app_info_package_id_0,
        app_info_install_source as app_info_install_source_0,
        app_info_version as app_info_version_0,
        device_id as device_id_0,
        device_mobile_brand_name as device_mobile_brand_name_0,
        device_mobile_model_name as device_mobile_model_name_0,
        device_manufacturer as device_manufacturer_0,
        device_screen_width as device_screen_width_0,
        device_screen_height as device_screen_height_0,
        device_carrier as device_carrier_0,
        device_network_type as device_network_type_0,
        device_operating_system as device_operating_system_0,
        device_operating_system_version as device_operating_system_version_0,
        device_ua_browser as ua_browser_0,
        device_ua_browser_version as ua_browser_version_0,
        device_ua_os as ua_os_0,
        device_ua_os_version as ua_os_version_0,
        device_ua_device as ua_device_0,
        device_ua_device_category as ua_device_category_0,
        device_system_language as device_system_language_0,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_0,
        device_advertising_id as advertising_id_0,
        geo_continent as geo_continent_0,
        geo_country as geo_country_0,
        geo_city as geo_city_0,
        geo_metro as geo_metro_0,
        geo_region as geo_region_0,
        geo_sub_continent as geo_sub_continent_0,
        geo_locale as geo_locale_0,
        platform as platform_0,
        project_id as project_id_0,
        traffic_source_name as traffic_source_name_0,
        traffic_source_medium as traffic_source_medium_0,
        traffic_source_source as traffic_source_source_0,
        user_first_touch_timestamp as user_first_touch_timestamp_0,
        user_id as user_id_0,
        user_pseudo_id as user_pseudo_id_0,
        user_ltv as user_ltv_0,
        event_dimensions as event_dimensions_0,
        ecommerce as ecommerce_0,
        items as items_0
      from
        base_data base
      where
        event_name = 'add_button_click'
    ),
    table_1 as (
      select
        event_date as event_date_1,
        event_name as event_name_1,
        event_id as event_id_1,
        event_bundle_sequence_id as event_bundle_sequence_id_1,
        event_previous_timestamp as event_previous_timestamp_1,
        event_server_timestamp_offset as event_server_timestamp_offset_1,
        event_timestamp as event_timestamp_1,
        ingest_timestamp as ingest_timestamp_1,
        event_value_in_usd as event_value_in_usd_1,
        app_info_app_id as app_info_app_id_1,
        app_info_package_id as app_info_package_id_1,
        app_info_install_source as app_info_install_source_1,
        app_info_version as app_info_version_1,
        device_id as device_id_1,
        device_mobile_brand_name as device_mobile_brand_name_1,
        device_mobile_model_name as device_mobile_model_name_1,
        device_manufacturer as device_manufacturer_1,
        device_screen_width as device_screen_width_1,
        device_screen_height as device_screen_height_1,
        device_carrier as device_carrier_1,
        device_network_type as device_network_type_1,
        device_operating_system as device_operating_system_1,
        device_operating_system_version as device_operating_system_version_1,
        device_ua_browser as ua_browser_1,
        device_ua_browser_version as ua_browser_version_1,
        device_ua_os as ua_os_1,
        device_ua_os_version as ua_os_version_1,
        device_ua_device as ua_device_1,
        device_ua_device_category as ua_device_category_1,
        device_system_language as device_system_language_1,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_1,
        device_advertising_id as advertising_id_1,
        geo_continent as geo_continent_1,
        geo_country as geo_country_1,
        geo_city as geo_city_1,
        geo_metro as geo_metro_1,
        geo_region as geo_region_1,
        geo_sub_continent as geo_sub_continent_1,
        geo_locale as geo_locale_1,
        platform as platform_1,
        project_id as project_id_1,
        traffic_source_name as traffic_source_name_1,
        traffic_source_medium as traffic_source_medium_1,
        traffic_source_source as traffic_source_source_1,
        user_first_touch_timestamp as user_first_touch_timestamp_1,
        user_id as user_id_1,
        user_pseudo_id as user_pseudo_id_1,
        user_ltv as user_ltv_1,
        event_dimensions as event_dimensions_1,
        ecommerce as ecommerce_1,
        items as items_1
      from
        base_data base
      where
        event_name = 'note_share'
    ),
    table_2 as (
      select
        event_date as event_date_2,
        event_name as event_name_2,
        event_id as event_id_2,
        event_bundle_sequence_id as event_bundle_sequence_id_2,
        event_previous_timestamp as event_previous_timestamp_2,
        event_server_timestamp_offset as event_server_timestamp_offset_2,
        event_timestamp as event_timestamp_2,
        ingest_timestamp as ingest_timestamp_2,
        event_value_in_usd as event_value_in_usd_2,
        app_info_app_id as app_info_app_id_2,
        app_info_package_id as app_info_package_id_2,
        app_info_install_source as app_info_install_source_2,
        app_info_version as app_info_version_2,
        device_id as device_id_2,
        device_mobile_brand_name as device_mobile_brand_name_2,
        device_mobile_model_name as device_mobile_model_name_2,
        device_manufacturer as device_manufacturer_2,
        device_screen_width as device_screen_width_2,
        device_screen_height as device_screen_height_2,
        device_carrier as device_carrier_2,
        device_network_type as device_network_type_2,
        device_operating_system as device_operating_system_2,
        device_operating_system_version as device_operating_system_version_2,
        device_ua_browser as ua_browser_2,
        device_ua_browser_version as ua_browser_version_2,
        device_ua_os as ua_os_2,
        device_ua_os_version as ua_os_version_2,
        device_ua_device as ua_device_2,
        device_ua_device_category as ua_device_category_2,
        device_system_language as device_system_language_2,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_2,
        device_advertising_id as advertising_id_2,
        geo_continent as geo_continent_2,
        geo_country as geo_country_2,
        geo_city as geo_city_2,
        geo_metro as geo_metro_2,
        geo_region as geo_region_2,
        geo_sub_continent as geo_sub_continent_2,
        geo_locale as geo_locale_2,
        platform as platform_2,
        project_id as project_id_2,
        traffic_source_name as traffic_source_name_2,
        traffic_source_medium as traffic_source_medium_2,
        traffic_source_source as traffic_source_source_2,
        user_first_touch_timestamp as user_first_touch_timestamp_2,
        user_id as user_id_2,
        user_pseudo_id as user_pseudo_id_2,
        user_ltv as user_ltv_2,
        event_dimensions as event_dimensions_2,
        ecommerce as ecommerce_2,
        items as items_2
      from
        base_data base
      where
        event_name = 'note_export'
    ),
    join_table as (
      select
        table_0.*,
        table_1.event_id_1,
        table_1.event_name_1,
        table_1.user_pseudo_id_1,
        table_1.event_timestamp_1,
        table_2.event_id_2,
        table_2.event_name_2,
        table_2.user_pseudo_id_2,
        table_2.event_timestamp_2
      from
        table_0
        left outer join table_1 on table_0.user_pseudo_id_0 = table_1.user_pseudo_id_1
        and table_1.event_timestamp_1 - table_0.event_timestamp_0 > 0
        and table_1.event_timestamp_1 - table_0.event_timestamp_0 < 600 * 1000
        left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
        and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
        and table_2.event_timestamp_2 - table_1.event_timestamp_1 < 600 * 1000
    )
  select
    DAY,
    count(distinct event_id_0) as add_button_click,
    (
      count(distinct event_id_2)::decimal / NULLIF(count(distinct event_id_0), 0)
    )::decimal(20, 4) as rate,
    count(distinct event_id_1) as note_share,
    (
      count(distinct event_id_1)::decimal / NULLIF(count(distinct event_id_0), 0)
    )::decimal(20, 4) as note_share_rate,
    count(distinct event_id_2) as note_export,
    (
      count(distinct event_id_2)::decimal / NULLIF(count(distinct event_id_1), 0)
    )::decimal(20, 4) as note_export_rate
  from
    join_table
  group by
    DAY
  `.trim().replace(/ /g, ''),
    );

  });

  test('funnel sql - conversionIntervalType', () => {

    const sql = buildFunnelDataSql('app1', 'testview', {
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.EVENT_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CURRENT_DAY,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: 'add_button_click',

        },
        {
          eventName: 'note_share',

        },
        {
          eventName: 'note_export',

        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-04-30'),
      timeEnd: new Date('2023-06-30'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`CREATE OR REPLACE VIEW
    app1.testview AS
  with
    tmp_data as (
      select
        event_date,
        event_name,
        event_id,
        event_bundle_sequence_id::bigint as event_bundle_sequence_id,
        event_previous_timestamp::bigint as event_previous_timestamp,
        event_server_timestamp_offset::bigint as event_server_timestamp_offset,
        event_timestamp::bigint as event_timestamp,
        ingest_timestamp,
        event_value_in_usd,
        app_info.app_id::varchar as app_info_app_id,
        app_info.id::varchar as app_info_package_id,
        app_info.install_source::varchar as app_info_install_source,
        app_info.version::varchar as app_info_version,
        device.vendor_id::varchar as device_id,
        device.mobile_brand_name::varchar as device_mobile_brand_name,
        device.mobile_model_name::varchar as device_mobile_model_name,
        device.manufacturer::varchar as device_manufacturer,
        device.screen_width::bigint as device_screen_width,
        device.screen_height::bigint as device_screen_height,
        device.carrier::varchar as device_carrier,
        device.network_type::varchar as device_network_type,
        device.operating_system::varchar as device_operating_system,
        device.operating_system_version::varchar as device_operating_system_version,
        device.ua_browser::varchar as device_ua_browser,
        device.ua_browser_version::varchar as device_ua_browser_version,
        device.ua_os::varchar as device_ua_os,
        device.ua_os_version::varchar as device_ua_os_version,
        device.ua_device::varchar as device_ua_device,
        device.ua_device_category::varchar as device_ua_device_category,
        device.system_language::varchar as device_system_language,
        device.time_zone_offset_seconds::bigint as device_time_zone_offset_seconds,
        device.advertising_id::varchar as device_advertising_id,
        geo.continent::varchar as geo_continent,
        geo.country::varchar as geo_country,
        geo.city::varchar as geo_city,
        geo.metro::varchar as geo_metro,
        geo.region::varchar as geo_region,
        geo.sub_continent::varchar as geo_sub_continent,
        geo.locale::varchar as geo_locale,
        platform,
        project_id,
        traffic_source.name::varchar as traffic_source_name,
        traffic_source.medium::varchar as traffic_source_medium,
        traffic_source.source::varchar as traffic_source_source,
        user_first_touch_timestamp,
        user_id,
        user_pseudo_id,
        user_ltv,
        event_dimensions,
        ecommerce,
        items,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM'
        ) as month,
        TO_CHAR(
          date_trunc(
            'week',
            TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second'
          ),
          'YYYY-MM-DD'
        ) || ' - ' || TO_CHAR(
          date_trunc(
            'week',
            (
              TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second'
            ) + INTERVAL '6 days'
          ),
          'YYYY-MM-DD'
        ) as week,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD'
        ) as day,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD HH24'
        ) || '00:00' as hour,
        user_properties,
        event_params
      from
        app1.ods_events ods
      where
        event_date >= 'SunApr30202300:00:00GMT+0000(CoordinatedUniversalTime)'
        and event_date <= 'FriJun30202300:00:00GMT+0000(CoordinatedUniversalTime)'
        and event_name in ('add_button_click', 'note_share', 'note_export')
    ),
    tmp_base_data as (
      select
        *
      from
        tmp_data base
    ),
    base_data as (
      select
        *
      from
        tmp_base_data
      where
        1 = 1
        and (
          (event_name = 'add_button_click')
          or (event_name = 'note_share')
          or (event_name = 'note_export')
        )
    ),
    table_0 as (
      select
        month,
        week,
        day,
        hour,
        event_date as event_date_0,
        event_name as event_name_0,
        event_id as event_id_0,
        event_bundle_sequence_id as event_bundle_sequence_id_0,
        event_previous_timestamp as event_previous_timestamp_0,
        event_server_timestamp_offset as event_server_timestamp_offset_0,
        event_timestamp as event_timestamp_0,
        ingest_timestamp as ingest_timestamp_0,
        event_value_in_usd as event_value_in_usd_0,
        app_info_app_id as app_info_app_id_0,
        app_info_package_id as app_info_package_id_0,
        app_info_install_source as app_info_install_source_0,
        app_info_version as app_info_version_0,
        device_id as device_id_0,
        device_mobile_brand_name as device_mobile_brand_name_0,
        device_mobile_model_name as device_mobile_model_name_0,
        device_manufacturer as device_manufacturer_0,
        device_screen_width as device_screen_width_0,
        device_screen_height as device_screen_height_0,
        device_carrier as device_carrier_0,
        device_network_type as device_network_type_0,
        device_operating_system as device_operating_system_0,
        device_operating_system_version as device_operating_system_version_0,
        device_ua_browser as ua_browser_0,
        device_ua_browser_version as ua_browser_version_0,
        device_ua_os as ua_os_0,
        device_ua_os_version as ua_os_version_0,
        device_ua_device as ua_device_0,
        device_ua_device_category as ua_device_category_0,
        device_system_language as device_system_language_0,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_0,
        device_advertising_id as advertising_id_0,
        geo_continent as geo_continent_0,
        geo_country as geo_country_0,
        geo_city as geo_city_0,
        geo_metro as geo_metro_0,
        geo_region as geo_region_0,
        geo_sub_continent as geo_sub_continent_0,
        geo_locale as geo_locale_0,
        platform as platform_0,
        project_id as project_id_0,
        traffic_source_name as traffic_source_name_0,
        traffic_source_medium as traffic_source_medium_0,
        traffic_source_source as traffic_source_source_0,
        user_first_touch_timestamp as user_first_touch_timestamp_0,
        user_id as user_id_0,
        user_pseudo_id as user_pseudo_id_0,
        user_ltv as user_ltv_0,
        event_dimensions as event_dimensions_0,
        ecommerce as ecommerce_0,
        items as items_0
      from
        base_data base
      where
        event_name = 'add_button_click'
    ),
    table_1 as (
      select
        event_date as event_date_1,
        event_name as event_name_1,
        event_id as event_id_1,
        event_bundle_sequence_id as event_bundle_sequence_id_1,
        event_previous_timestamp as event_previous_timestamp_1,
        event_server_timestamp_offset as event_server_timestamp_offset_1,
        event_timestamp as event_timestamp_1,
        ingest_timestamp as ingest_timestamp_1,
        event_value_in_usd as event_value_in_usd_1,
        app_info_app_id as app_info_app_id_1,
        app_info_package_id as app_info_package_id_1,
        app_info_install_source as app_info_install_source_1,
        app_info_version as app_info_version_1,
        device_id as device_id_1,
        device_mobile_brand_name as device_mobile_brand_name_1,
        device_mobile_model_name as device_mobile_model_name_1,
        device_manufacturer as device_manufacturer_1,
        device_screen_width as device_screen_width_1,
        device_screen_height as device_screen_height_1,
        device_carrier as device_carrier_1,
        device_network_type as device_network_type_1,
        device_operating_system as device_operating_system_1,
        device_operating_system_version as device_operating_system_version_1,
        device_ua_browser as ua_browser_1,
        device_ua_browser_version as ua_browser_version_1,
        device_ua_os as ua_os_1,
        device_ua_os_version as ua_os_version_1,
        device_ua_device as ua_device_1,
        device_ua_device_category as ua_device_category_1,
        device_system_language as device_system_language_1,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_1,
        device_advertising_id as advertising_id_1,
        geo_continent as geo_continent_1,
        geo_country as geo_country_1,
        geo_city as geo_city_1,
        geo_metro as geo_metro_1,
        geo_region as geo_region_1,
        geo_sub_continent as geo_sub_continent_1,
        geo_locale as geo_locale_1,
        platform as platform_1,
        project_id as project_id_1,
        traffic_source_name as traffic_source_name_1,
        traffic_source_medium as traffic_source_medium_1,
        traffic_source_source as traffic_source_source_1,
        user_first_touch_timestamp as user_first_touch_timestamp_1,
        user_id as user_id_1,
        user_pseudo_id as user_pseudo_id_1,
        user_ltv as user_ltv_1,
        event_dimensions as event_dimensions_1,
        ecommerce as ecommerce_1,
        items as items_1
      from
        base_data base
      where
        event_name = 'note_share'
    ),
    table_2 as (
      select
        event_date as event_date_2,
        event_name as event_name_2,
        event_id as event_id_2,
        event_bundle_sequence_id as event_bundle_sequence_id_2,
        event_previous_timestamp as event_previous_timestamp_2,
        event_server_timestamp_offset as event_server_timestamp_offset_2,
        event_timestamp as event_timestamp_2,
        ingest_timestamp as ingest_timestamp_2,
        event_value_in_usd as event_value_in_usd_2,
        app_info_app_id as app_info_app_id_2,
        app_info_package_id as app_info_package_id_2,
        app_info_install_source as app_info_install_source_2,
        app_info_version as app_info_version_2,
        device_id as device_id_2,
        device_mobile_brand_name as device_mobile_brand_name_2,
        device_mobile_model_name as device_mobile_model_name_2,
        device_manufacturer as device_manufacturer_2,
        device_screen_width as device_screen_width_2,
        device_screen_height as device_screen_height_2,
        device_carrier as device_carrier_2,
        device_network_type as device_network_type_2,
        device_operating_system as device_operating_system_2,
        device_operating_system_version as device_operating_system_version_2,
        device_ua_browser as ua_browser_2,
        device_ua_browser_version as ua_browser_version_2,
        device_ua_os as ua_os_2,
        device_ua_os_version as ua_os_version_2,
        device_ua_device as ua_device_2,
        device_ua_device_category as ua_device_category_2,
        device_system_language as device_system_language_2,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_2,
        device_advertising_id as advertising_id_2,
        geo_continent as geo_continent_2,
        geo_country as geo_country_2,
        geo_city as geo_city_2,
        geo_metro as geo_metro_2,
        geo_region as geo_region_2,
        geo_sub_continent as geo_sub_continent_2,
        geo_locale as geo_locale_2,
        platform as platform_2,
        project_id as project_id_2,
        traffic_source_name as traffic_source_name_2,
        traffic_source_medium as traffic_source_medium_2,
        traffic_source_source as traffic_source_source_2,
        user_first_touch_timestamp as user_first_touch_timestamp_2,
        user_id as user_id_2,
        user_pseudo_id as user_pseudo_id_2,
        user_ltv as user_ltv_2,
        event_dimensions as event_dimensions_2,
        ecommerce as ecommerce_2,
        items as items_2
      from
        base_data base
      where
        event_name = 'note_export'
    ),
    join_table as (
      select
        table_0.*,
        table_1.event_id_1,
        table_1.event_name_1,
        table_1.user_pseudo_id_1,
        table_1.event_timestamp_1,
        table_2.event_id_2,
        table_2.event_name_2,
        table_2.user_pseudo_id_2,
        table_2.event_timestamp_2
      from
        table_0
        left outer join table_1 on table_0.user_pseudo_id_0 = table_1.user_pseudo_id_1
        and TO_CHAR(
          TIMESTAMP 'epoch' + cast(table_0.event_timestamp_0 / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD'
        ) = TO_CHAR(
          TIMESTAMP 'epoch' + cast(table_1.event_timestamp_1 / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD'
        )
        left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
        and TO_CHAR(
          TIMESTAMP 'epoch' + cast(table_1.event_timestamp_1 / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD'
        ) = TO_CHAR(
          TIMESTAMP 'epoch' + cast(table_2.event_timestamp_2 / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD'
        )
    )
  select
    DAY,
    count(distinct event_id_0) as add_button_click,
    (
      count(distinct event_id_2)::decimal / NULLIF(count(distinct event_id_0), 0)
    )::decimal(20, 4) as rate,
    count(distinct event_id_1) as note_share,
    (
      count(distinct event_id_1)::decimal / NULLIF(count(distinct event_id_0), 0)
    )::decimal(20, 4) as note_share_rate,
    count(distinct event_id_2) as note_export,
    (
      count(distinct event_id_2)::decimal / NULLIF(count(distinct event_id_1), 0)
    )::decimal(20, 4) as note_export_rate
  from
    join_table
  group by
    DAY
  `.trim().replace(/ /g, ''),
    );

  });

  test('funnel sql - specifyJoinColumn', () => {

    const sql = buildFunnelDataSql('app1', 'testview', {
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.EVENT_CNT,
      specifyJoinColumn: false,
      conversionIntervalType: ExploreConversionIntervalType.CURRENT_DAY,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: 'add_button_click',

        },
        {
          eventName: 'note_share',

        },
        {
          eventName: 'note_export',

        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-04-30'),
      timeEnd: new Date('2023-06-30'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`CREATE OR REPLACE VIEW
    app1.testview AS
  with
    tmp_data as (
      select
        event_date,
        event_name,
        event_id,
        event_bundle_sequence_id::bigint as event_bundle_sequence_id,
        event_previous_timestamp::bigint as event_previous_timestamp,
        event_server_timestamp_offset::bigint as event_server_timestamp_offset,
        event_timestamp::bigint as event_timestamp,
        ingest_timestamp,
        event_value_in_usd,
        app_info.app_id::varchar as app_info_app_id,
        app_info.id::varchar as app_info_package_id,
        app_info.install_source::varchar as app_info_install_source,
        app_info.version::varchar as app_info_version,
        device.vendor_id::varchar as device_id,
        device.mobile_brand_name::varchar as device_mobile_brand_name,
        device.mobile_model_name::varchar as device_mobile_model_name,
        device.manufacturer::varchar as device_manufacturer,
        device.screen_width::bigint as device_screen_width,
        device.screen_height::bigint as device_screen_height,
        device.carrier::varchar as device_carrier,
        device.network_type::varchar as device_network_type,
        device.operating_system::varchar as device_operating_system,
        device.operating_system_version::varchar as device_operating_system_version,
        device.ua_browser::varchar as device_ua_browser,
        device.ua_browser_version::varchar as device_ua_browser_version,
        device.ua_os::varchar as device_ua_os,
        device.ua_os_version::varchar as device_ua_os_version,
        device.ua_device::varchar as device_ua_device,
        device.ua_device_category::varchar as device_ua_device_category,
        device.system_language::varchar as device_system_language,
        device.time_zone_offset_seconds::bigint as device_time_zone_offset_seconds,
        device.advertising_id::varchar as device_advertising_id,
        geo.continent::varchar as geo_continent,
        geo.country::varchar as geo_country,
        geo.city::varchar as geo_city,
        geo.metro::varchar as geo_metro,
        geo.region::varchar as geo_region,
        geo.sub_continent::varchar as geo_sub_continent,
        geo.locale::varchar as geo_locale,
        platform,
        project_id,
        traffic_source.name::varchar as traffic_source_name,
        traffic_source.medium::varchar as traffic_source_medium,
        traffic_source.source::varchar as traffic_source_source,
        user_first_touch_timestamp,
        user_id,
        user_pseudo_id,
        user_ltv,
        event_dimensions,
        ecommerce,
        items,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM'
        ) as month,
        TO_CHAR(
          date_trunc(
            'week',
            TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second'
          ),
          'YYYY-MM-DD'
        ) || ' - ' || TO_CHAR(
          date_trunc(
            'week',
            (
              TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second'
            ) + INTERVAL '6 days'
          ),
          'YYYY-MM-DD'
        ) as week,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD'
        ) as day,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD HH24'
        ) || '00:00' as hour,
        user_properties,
        event_params
      from
        app1.ods_events ods
      where
        event_date >= 'SunApr30202300:00:00GMT+0000(CoordinatedUniversalTime)'
        and event_date <= 'FriJun30202300:00:00GMT+0000(CoordinatedUniversalTime)'
        and event_name in ('add_button_click', 'note_share', 'note_export')
    ),
    tmp_base_data as (
      select
        *
      from
        tmp_data base
    ),
    base_data as (
      select
        *
      from
        tmp_base_data
      where
        1 = 1
        and (
          (event_name = 'add_button_click')
          or (event_name = 'note_share')
          or (event_name = 'note_export')
        )
    ),
    table_0 as (
      select
        month,
        week,
        day,
        hour,
        event_date as event_date_0,
        event_name as event_name_0,
        event_id as event_id_0,
        event_bundle_sequence_id as event_bundle_sequence_id_0,
        event_previous_timestamp as event_previous_timestamp_0,
        event_server_timestamp_offset as event_server_timestamp_offset_0,
        event_timestamp as event_timestamp_0,
        ingest_timestamp as ingest_timestamp_0,
        event_value_in_usd as event_value_in_usd_0,
        app_info_app_id as app_info_app_id_0,
        app_info_package_id as app_info_package_id_0,
        app_info_install_source as app_info_install_source_0,
        app_info_version as app_info_version_0,
        device_id as device_id_0,
        device_mobile_brand_name as device_mobile_brand_name_0,
        device_mobile_model_name as device_mobile_model_name_0,
        device_manufacturer as device_manufacturer_0,
        device_screen_width as device_screen_width_0,
        device_screen_height as device_screen_height_0,
        device_carrier as device_carrier_0,
        device_network_type as device_network_type_0,
        device_operating_system as device_operating_system_0,
        device_operating_system_version as device_operating_system_version_0,
        device_ua_browser as ua_browser_0,
        device_ua_browser_version as ua_browser_version_0,
        device_ua_os as ua_os_0,
        device_ua_os_version as ua_os_version_0,
        device_ua_device as ua_device_0,
        device_ua_device_category as ua_device_category_0,
        device_system_language as device_system_language_0,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_0,
        device_advertising_id as advertising_id_0,
        geo_continent as geo_continent_0,
        geo_country as geo_country_0,
        geo_city as geo_city_0,
        geo_metro as geo_metro_0,
        geo_region as geo_region_0,
        geo_sub_continent as geo_sub_continent_0,
        geo_locale as geo_locale_0,
        platform as platform_0,
        project_id as project_id_0,
        traffic_source_name as traffic_source_name_0,
        traffic_source_medium as traffic_source_medium_0,
        traffic_source_source as traffic_source_source_0,
        user_first_touch_timestamp as user_first_touch_timestamp_0,
        user_id as user_id_0,
        user_pseudo_id as user_pseudo_id_0,
        user_ltv as user_ltv_0,
        event_dimensions as event_dimensions_0,
        ecommerce as ecommerce_0,
        items as items_0
      from
        base_data base
      where
        event_name = 'add_button_click'
    ),
    table_1 as (
      select
        event_date as event_date_1,
        event_name as event_name_1,
        event_id as event_id_1,
        event_bundle_sequence_id as event_bundle_sequence_id_1,
        event_previous_timestamp as event_previous_timestamp_1,
        event_server_timestamp_offset as event_server_timestamp_offset_1,
        event_timestamp as event_timestamp_1,
        ingest_timestamp as ingest_timestamp_1,
        event_value_in_usd as event_value_in_usd_1,
        app_info_app_id as app_info_app_id_1,
        app_info_package_id as app_info_package_id_1,
        app_info_install_source as app_info_install_source_1,
        app_info_version as app_info_version_1,
        device_id as device_id_1,
        device_mobile_brand_name as device_mobile_brand_name_1,
        device_mobile_model_name as device_mobile_model_name_1,
        device_manufacturer as device_manufacturer_1,
        device_screen_width as device_screen_width_1,
        device_screen_height as device_screen_height_1,
        device_carrier as device_carrier_1,
        device_network_type as device_network_type_1,
        device_operating_system as device_operating_system_1,
        device_operating_system_version as device_operating_system_version_1,
        device_ua_browser as ua_browser_1,
        device_ua_browser_version as ua_browser_version_1,
        device_ua_os as ua_os_1,
        device_ua_os_version as ua_os_version_1,
        device_ua_device as ua_device_1,
        device_ua_device_category as ua_device_category_1,
        device_system_language as device_system_language_1,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_1,
        device_advertising_id as advertising_id_1,
        geo_continent as geo_continent_1,
        geo_country as geo_country_1,
        geo_city as geo_city_1,
        geo_metro as geo_metro_1,
        geo_region as geo_region_1,
        geo_sub_continent as geo_sub_continent_1,
        geo_locale as geo_locale_1,
        platform as platform_1,
        project_id as project_id_1,
        traffic_source_name as traffic_source_name_1,
        traffic_source_medium as traffic_source_medium_1,
        traffic_source_source as traffic_source_source_1,
        user_first_touch_timestamp as user_first_touch_timestamp_1,
        user_id as user_id_1,
        user_pseudo_id as user_pseudo_id_1,
        user_ltv as user_ltv_1,
        event_dimensions as event_dimensions_1,
        ecommerce as ecommerce_1,
        items as items_1
      from
        base_data base
      where
        event_name = 'note_share'
    ),
    table_2 as (
      select
        event_date as event_date_2,
        event_name as event_name_2,
        event_id as event_id_2,
        event_bundle_sequence_id as event_bundle_sequence_id_2,
        event_previous_timestamp as event_previous_timestamp_2,
        event_server_timestamp_offset as event_server_timestamp_offset_2,
        event_timestamp as event_timestamp_2,
        ingest_timestamp as ingest_timestamp_2,
        event_value_in_usd as event_value_in_usd_2,
        app_info_app_id as app_info_app_id_2,
        app_info_package_id as app_info_package_id_2,
        app_info_install_source as app_info_install_source_2,
        app_info_version as app_info_version_2,
        device_id as device_id_2,
        device_mobile_brand_name as device_mobile_brand_name_2,
        device_mobile_model_name as device_mobile_model_name_2,
        device_manufacturer as device_manufacturer_2,
        device_screen_width as device_screen_width_2,
        device_screen_height as device_screen_height_2,
        device_carrier as device_carrier_2,
        device_network_type as device_network_type_2,
        device_operating_system as device_operating_system_2,
        device_operating_system_version as device_operating_system_version_2,
        device_ua_browser as ua_browser_2,
        device_ua_browser_version as ua_browser_version_2,
        device_ua_os as ua_os_2,
        device_ua_os_version as ua_os_version_2,
        device_ua_device as ua_device_2,
        device_ua_device_category as ua_device_category_2,
        device_system_language as device_system_language_2,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_2,
        device_advertising_id as advertising_id_2,
        geo_continent as geo_continent_2,
        geo_country as geo_country_2,
        geo_city as geo_city_2,
        geo_metro as geo_metro_2,
        geo_region as geo_region_2,
        geo_sub_continent as geo_sub_continent_2,
        geo_locale as geo_locale_2,
        platform as platform_2,
        project_id as project_id_2,
        traffic_source_name as traffic_source_name_2,
        traffic_source_medium as traffic_source_medium_2,
        traffic_source_source as traffic_source_source_2,
        user_first_touch_timestamp as user_first_touch_timestamp_2,
        user_id as user_id_2,
        user_pseudo_id as user_pseudo_id_2,
        user_ltv as user_ltv_2,
        event_dimensions as event_dimensions_2,
        ecommerce as ecommerce_2,
        items as items_2
      from
        base_data base
      where
        event_name = 'note_export'
    ),
    join_table as (
      select
        table_0.*,
        table_1.event_id_1,
        table_1.event_name_1,
        table_1.user_pseudo_id_1,
        table_1.event_timestamp_1,
        table_2.event_id_2,
        table_2.event_name_2,
        table_2.user_pseudo_id_2,
        table_2.event_timestamp_2
      from
        table_0
        left outer join table_1 on 1 = 1
        and TO_CHAR(
          TIMESTAMP 'epoch' + cast(table_0.event_timestamp_0 / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD'
        ) = TO_CHAR(
          TIMESTAMP 'epoch' + cast(table_1.event_timestamp_1 / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD'
        )
        left outer join table_2 on 1 = 1
        and TO_CHAR(
          TIMESTAMP 'epoch' + cast(table_1.event_timestamp_1 / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD'
        ) = TO_CHAR(
          TIMESTAMP 'epoch' + cast(table_2.event_timestamp_2 / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD'
        )
    )
  select
    DAY,
    count(distinct event_id_0) as add_button_click,
    (
      count(distinct event_id_2)::decimal / NULLIF(count(distinct event_id_0), 0)
    )::decimal(20, 4) as rate,
    count(distinct event_id_1) as note_share,
    (
      count(distinct event_id_1)::decimal / NULLIF(count(distinct event_id_0), 0)
    )::decimal(20, 4) as note_share_rate,
    count(distinct event_id_2) as note_export,
    (
      count(distinct event_id_2)::decimal / NULLIF(count(distinct event_id_1), 0)
    )::decimal(20, 4) as note_export_rate
  from
    join_table
  group by
    DAY
  `.trim().replace(/ /g, ''),
    );

  });

  test('funnel table visual sql - conditions', () => {

    const sql = buildFunnelDataSql('app1', 'testview', {
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: 'add_button_click',
          sqlCondition: {
            conditions: [{
              category: 'other',
              property: 'platform',
              operator: '=',
              value: ['ANDROID'],
              dataType: MetadataValueType.STRING,
            },
            {
              category: 'device',
              property: 'screen_height',
              operator: '<>',
              value: [1400],
              dataType: MetadataValueType.INTEGER,
            }],
            conditionOperator: 'and',
          },
        },
        {
          eventName: 'note_share',
          sqlCondition: {
            conditions: [{
              category: 'other',
              property: 'platform',
              operator: '=',
              value: ['ANDROID'],
              dataType: MetadataValueType.STRING,
            },
            {
              category: 'device',
              property: 'screen_height',
              operator: '<>',
              value: [1400],
              dataType: MetadataValueType.INTEGER,
            }],
            conditionOperator: 'and',
          },

        },
        {
          eventName: 'note_export',
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-04-30'),
      timeEnd: new Date('2023-06-30'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`CREATE OR REPLACE VIEW
    app1.testview AS
  with
    tmp_data as (
      select
        event_date,
        event_name,
        event_id,
        event_bundle_sequence_id::bigint as event_bundle_sequence_id,
        event_previous_timestamp::bigint as event_previous_timestamp,
        event_server_timestamp_offset::bigint as event_server_timestamp_offset,
        event_timestamp::bigint as event_timestamp,
        ingest_timestamp,
        event_value_in_usd,
        app_info.app_id::varchar as app_info_app_id,
        app_info.id::varchar as app_info_package_id,
        app_info.install_source::varchar as app_info_install_source,
        app_info.version::varchar as app_info_version,
        device.vendor_id::varchar as device_id,
        device.mobile_brand_name::varchar as device_mobile_brand_name,
        device.mobile_model_name::varchar as device_mobile_model_name,
        device.manufacturer::varchar as device_manufacturer,
        device.screen_width::bigint as device_screen_width,
        device.screen_height::bigint as device_screen_height,
        device.carrier::varchar as device_carrier,
        device.network_type::varchar as device_network_type,
        device.operating_system::varchar as device_operating_system,
        device.operating_system_version::varchar as device_operating_system_version,
        device.ua_browser::varchar as device_ua_browser,
        device.ua_browser_version::varchar as device_ua_browser_version,
        device.ua_os::varchar as device_ua_os,
        device.ua_os_version::varchar as device_ua_os_version,
        device.ua_device::varchar as device_ua_device,
        device.ua_device_category::varchar as device_ua_device_category,
        device.system_language::varchar as device_system_language,
        device.time_zone_offset_seconds::bigint as device_time_zone_offset_seconds,
        device.advertising_id::varchar as device_advertising_id,
        geo.continent::varchar as geo_continent,
        geo.country::varchar as geo_country,
        geo.city::varchar as geo_city,
        geo.metro::varchar as geo_metro,
        geo.region::varchar as geo_region,
        geo.sub_continent::varchar as geo_sub_continent,
        geo.locale::varchar as geo_locale,
        platform,
        project_id,
        traffic_source.name::varchar as traffic_source_name,
        traffic_source.medium::varchar as traffic_source_medium,
        traffic_source.source::varchar as traffic_source_source,
        user_first_touch_timestamp,
        user_id,
        user_pseudo_id,
        user_ltv,
        event_dimensions,
        ecommerce,
        items,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM'
        ) as month,
        TO_CHAR(
          date_trunc(
            'week',
            TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second'
          ),
          'YYYY-MM-DD'
        ) || ' - ' || TO_CHAR(
          date_trunc(
            'week',
            (
              TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second'
            ) + INTERVAL '6 days'
          ),
          'YYYY-MM-DD'
        ) as week,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD'
        ) as day,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD HH24'
        ) || '00:00' as hour,
        user_properties,
        event_params
      from
        app1.ods_events ods
      where
        event_date >= 'SunApr30202300:00:00GMT+0000(CoordinatedUniversalTime)'
        and event_date <= 'FriJun30202300:00:00GMT+0000(CoordinatedUniversalTime)'
        and event_name in ('add_button_click', 'note_share', 'note_export')
    ),
    tmp_base_data as (
      select
        *
      from
        tmp_data base
    ),
    base_data as (
      select
        *
      from
        tmp_base_data
      where
        1 = 1
        and (
          (
            event_name = 'add_button_click'
            and (
              platform = 'ANDROID'
              and device_screen_height <> 1400
            )
          )
          or (
            event_name = 'note_share'
            and (
              platform = 'ANDROID'
              and device_screen_height <> 1400
            )
          )
          or (event_name = 'note_export')
        )
    ),
    table_0 as (
      select
        month,
        week,
        day,
        hour,
        event_date as event_date_0,
        event_name as event_name_0,
        event_id as event_id_0,
        event_bundle_sequence_id as event_bundle_sequence_id_0,
        event_previous_timestamp as event_previous_timestamp_0,
        event_server_timestamp_offset as event_server_timestamp_offset_0,
        event_timestamp as event_timestamp_0,
        ingest_timestamp as ingest_timestamp_0,
        event_value_in_usd as event_value_in_usd_0,
        app_info_app_id as app_info_app_id_0,
        app_info_package_id as app_info_package_id_0,
        app_info_install_source as app_info_install_source_0,
        app_info_version as app_info_version_0,
        device_id as device_id_0,
        device_mobile_brand_name as device_mobile_brand_name_0,
        device_mobile_model_name as device_mobile_model_name_0,
        device_manufacturer as device_manufacturer_0,
        device_screen_width as device_screen_width_0,
        device_screen_height as device_screen_height_0,
        device_carrier as device_carrier_0,
        device_network_type as device_network_type_0,
        device_operating_system as device_operating_system_0,
        device_operating_system_version as device_operating_system_version_0,
        device_ua_browser as ua_browser_0,
        device_ua_browser_version as ua_browser_version_0,
        device_ua_os as ua_os_0,
        device_ua_os_version as ua_os_version_0,
        device_ua_device as ua_device_0,
        device_ua_device_category as ua_device_category_0,
        device_system_language as device_system_language_0,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_0,
        device_advertising_id as advertising_id_0,
        geo_continent as geo_continent_0,
        geo_country as geo_country_0,
        geo_city as geo_city_0,
        geo_metro as geo_metro_0,
        geo_region as geo_region_0,
        geo_sub_continent as geo_sub_continent_0,
        geo_locale as geo_locale_0,
        platform as platform_0,
        project_id as project_id_0,
        traffic_source_name as traffic_source_name_0,
        traffic_source_medium as traffic_source_medium_0,
        traffic_source_source as traffic_source_source_0,
        user_first_touch_timestamp as user_first_touch_timestamp_0,
        user_id as user_id_0,
        user_pseudo_id as user_pseudo_id_0,
        user_ltv as user_ltv_0,
        event_dimensions as event_dimensions_0,
        ecommerce as ecommerce_0,
        items as items_0
      from
        base_data base
      where
        event_name = 'add_button_click'
    ),
    table_1 as (
      select
        event_date as event_date_1,
        event_name as event_name_1,
        event_id as event_id_1,
        event_bundle_sequence_id as event_bundle_sequence_id_1,
        event_previous_timestamp as event_previous_timestamp_1,
        event_server_timestamp_offset as event_server_timestamp_offset_1,
        event_timestamp as event_timestamp_1,
        ingest_timestamp as ingest_timestamp_1,
        event_value_in_usd as event_value_in_usd_1,
        app_info_app_id as app_info_app_id_1,
        app_info_package_id as app_info_package_id_1,
        app_info_install_source as app_info_install_source_1,
        app_info_version as app_info_version_1,
        device_id as device_id_1,
        device_mobile_brand_name as device_mobile_brand_name_1,
        device_mobile_model_name as device_mobile_model_name_1,
        device_manufacturer as device_manufacturer_1,
        device_screen_width as device_screen_width_1,
        device_screen_height as device_screen_height_1,
        device_carrier as device_carrier_1,
        device_network_type as device_network_type_1,
        device_operating_system as device_operating_system_1,
        device_operating_system_version as device_operating_system_version_1,
        device_ua_browser as ua_browser_1,
        device_ua_browser_version as ua_browser_version_1,
        device_ua_os as ua_os_1,
        device_ua_os_version as ua_os_version_1,
        device_ua_device as ua_device_1,
        device_ua_device_category as ua_device_category_1,
        device_system_language as device_system_language_1,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_1,
        device_advertising_id as advertising_id_1,
        geo_continent as geo_continent_1,
        geo_country as geo_country_1,
        geo_city as geo_city_1,
        geo_metro as geo_metro_1,
        geo_region as geo_region_1,
        geo_sub_continent as geo_sub_continent_1,
        geo_locale as geo_locale_1,
        platform as platform_1,
        project_id as project_id_1,
        traffic_source_name as traffic_source_name_1,
        traffic_source_medium as traffic_source_medium_1,
        traffic_source_source as traffic_source_source_1,
        user_first_touch_timestamp as user_first_touch_timestamp_1,
        user_id as user_id_1,
        user_pseudo_id as user_pseudo_id_1,
        user_ltv as user_ltv_1,
        event_dimensions as event_dimensions_1,
        ecommerce as ecommerce_1,
        items as items_1
      from
        base_data base
      where
        event_name = 'note_share'
    ),
    table_2 as (
      select
        event_date as event_date_2,
        event_name as event_name_2,
        event_id as event_id_2,
        event_bundle_sequence_id as event_bundle_sequence_id_2,
        event_previous_timestamp as event_previous_timestamp_2,
        event_server_timestamp_offset as event_server_timestamp_offset_2,
        event_timestamp as event_timestamp_2,
        ingest_timestamp as ingest_timestamp_2,
        event_value_in_usd as event_value_in_usd_2,
        app_info_app_id as app_info_app_id_2,
        app_info_package_id as app_info_package_id_2,
        app_info_install_source as app_info_install_source_2,
        app_info_version as app_info_version_2,
        device_id as device_id_2,
        device_mobile_brand_name as device_mobile_brand_name_2,
        device_mobile_model_name as device_mobile_model_name_2,
        device_manufacturer as device_manufacturer_2,
        device_screen_width as device_screen_width_2,
        device_screen_height as device_screen_height_2,
        device_carrier as device_carrier_2,
        device_network_type as device_network_type_2,
        device_operating_system as device_operating_system_2,
        device_operating_system_version as device_operating_system_version_2,
        device_ua_browser as ua_browser_2,
        device_ua_browser_version as ua_browser_version_2,
        device_ua_os as ua_os_2,
        device_ua_os_version as ua_os_version_2,
        device_ua_device as ua_device_2,
        device_ua_device_category as ua_device_category_2,
        device_system_language as device_system_language_2,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_2,
        device_advertising_id as advertising_id_2,
        geo_continent as geo_continent_2,
        geo_country as geo_country_2,
        geo_city as geo_city_2,
        geo_metro as geo_metro_2,
        geo_region as geo_region_2,
        geo_sub_continent as geo_sub_continent_2,
        geo_locale as geo_locale_2,
        platform as platform_2,
        project_id as project_id_2,
        traffic_source_name as traffic_source_name_2,
        traffic_source_medium as traffic_source_medium_2,
        traffic_source_source as traffic_source_source_2,
        user_first_touch_timestamp as user_first_touch_timestamp_2,
        user_id as user_id_2,
        user_pseudo_id as user_pseudo_id_2,
        user_ltv as user_ltv_2,
        event_dimensions as event_dimensions_2,
        ecommerce as ecommerce_2,
        items as items_2
      from
        base_data base
      where
        event_name = 'note_export'
    ),
    join_table as (
      select
        table_0.*,
        table_1.event_id_1,
        table_1.event_name_1,
        table_1.user_pseudo_id_1,
        table_1.event_timestamp_1,
        table_2.event_id_2,
        table_2.event_name_2,
        table_2.user_pseudo_id_2,
        table_2.event_timestamp_2
      from
        table_0
        left outer join table_1 on table_0.user_pseudo_id_0 = table_1.user_pseudo_id_1
        and table_1.event_timestamp_1 - table_0.event_timestamp_0 > 0
        and table_1.event_timestamp_1 - table_0.event_timestamp_0 < 600 * 1000
        left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
        and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
        and table_2.event_timestamp_2 - table_1.event_timestamp_1 < 600 * 1000
    )
  select
    DAY,
    count(distinct user_pseudo_id_0) as add_button_click,
    (
      count(distinct user_pseudo_id_2)::decimal / NULLIF(count(distinct user_pseudo_id_0), 0)
    )::decimal(20, 4) as rate,
    count(distinct user_pseudo_id_1) as note_share,
    (
      count(distinct user_pseudo_id_1)::decimal / NULLIF(count(distinct user_pseudo_id_0), 0)
    )::decimal(20, 4) as note_share_rate,
    count(distinct user_pseudo_id_2) as note_export,
    (
      count(distinct user_pseudo_id_2)::decimal / NULLIF(count(distinct user_pseudo_id_1), 0)
    )::decimal(20, 4) as note_export_rate
  from
    join_table
  group by
    DAY
  `.trim().replace(/ /g, ''),
    );

  });

  test('funnel sql - first event extra conditions', () => {

    const sql = buildFunnelDataSql('app1', 'testview', {
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: 'add_button_click',
          sqlCondition: {
            conditions: [{
              category: 'other',
              property: 'platform',
              operator: '=',
              value: ['ANDROID'],
              dataType: MetadataValueType.STRING,
            },
            {
              category: 'device',
              property: 'screen_height',
              operator: '<>',
              value: [1400],
              dataType: MetadataValueType.INTEGER,
            }],
            conditionOperator: 'and',
          },
        },
        {
          eventName: 'note_share',
          sqlCondition: {
            conditions: [{
              category: 'other',
              property: 'platform',
              operator: '=',
              value: ['ANDROID'],
              dataType: MetadataValueType.STRING,
            },
            {
              category: 'device',
              property: 'screen_height',
              operator: '<>',
              value: [1400],
              dataType: MetadataValueType.INTEGER,
            }],
            conditionOperator: 'and',
          },

        },
        {
          eventName: 'note_export',
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-04-30'),
      timeEnd: new Date('2023-06-30'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`CREATE OR REPLACE VIEW
    app1.testview AS
  with
    tmp_data as (
      select
        event_date,
        event_name,
        event_id,
        event_bundle_sequence_id::bigint as event_bundle_sequence_id,
        event_previous_timestamp::bigint as event_previous_timestamp,
        event_server_timestamp_offset::bigint as event_server_timestamp_offset,
        event_timestamp::bigint as event_timestamp,
        ingest_timestamp,
        event_value_in_usd,
        app_info.app_id::varchar as app_info_app_id,
        app_info.id::varchar as app_info_package_id,
        app_info.install_source::varchar as app_info_install_source,
        app_info.version::varchar as app_info_version,
        device.vendor_id::varchar as device_id,
        device.mobile_brand_name::varchar as device_mobile_brand_name,
        device.mobile_model_name::varchar as device_mobile_model_name,
        device.manufacturer::varchar as device_manufacturer,
        device.screen_width::bigint as device_screen_width,
        device.screen_height::bigint as device_screen_height,
        device.carrier::varchar as device_carrier,
        device.network_type::varchar as device_network_type,
        device.operating_system::varchar as device_operating_system,
        device.operating_system_version::varchar as device_operating_system_version,
        device.ua_browser::varchar as device_ua_browser,
        device.ua_browser_version::varchar as device_ua_browser_version,
        device.ua_os::varchar as device_ua_os,
        device.ua_os_version::varchar as device_ua_os_version,
        device.ua_device::varchar as device_ua_device,
        device.ua_device_category::varchar as device_ua_device_category,
        device.system_language::varchar as device_system_language,
        device.time_zone_offset_seconds::bigint as device_time_zone_offset_seconds,
        device.advertising_id::varchar as device_advertising_id,
        geo.continent::varchar as geo_continent,
        geo.country::varchar as geo_country,
        geo.city::varchar as geo_city,
        geo.metro::varchar as geo_metro,
        geo.region::varchar as geo_region,
        geo.sub_continent::varchar as geo_sub_continent,
        geo.locale::varchar as geo_locale,
        platform,
        project_id,
        traffic_source.name::varchar as traffic_source_name,
        traffic_source.medium::varchar as traffic_source_medium,
        traffic_source.source::varchar as traffic_source_source,
        user_first_touch_timestamp,
        user_id,
        user_pseudo_id,
        user_ltv,
        event_dimensions,
        ecommerce,
        items,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM'
        ) as month,
        TO_CHAR(
          date_trunc(
            'week',
            TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second'
          ),
          'YYYY-MM-DD'
        ) || ' - ' || TO_CHAR(
          date_trunc(
            'week',
            (
              TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second'
            ) + INTERVAL '6 days'
          ),
          'YYYY-MM-DD'
        ) as week,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD'
        ) as day,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD HH24'
        ) || '00:00' as hour,
        user_properties,
        event_params
      from
        app1.ods_events ods
      where
        event_date >= 'SunApr30202300:00:00GMT+0000(CoordinatedUniversalTime)'
        and event_date <= 'FriJun30202300:00:00GMT+0000(CoordinatedUniversalTime)'
        and event_name in ('add_button_click', 'note_share', 'note_export')
    ),
    tmp_base_data as (
      select
        *
      from
        tmp_data base
    ),
    base_data as (
      select
        *
      from
        tmp_base_data
      where
        1 = 1
        and (
          (
            event_name = 'add_button_click'
            and (
              platform = 'ANDROID'
              and device_screen_height <> 1400
            )
          )
          or (
            event_name = 'note_share'
            and (
              platform = 'ANDROID'
              and device_screen_height <> 1400
            )
          )
          or (event_name = 'note_export')
        )
    ),
    table_0 as (
      select
        month,
        week,
        day,
        hour,
        event_date as event_date_0,
        event_name as event_name_0,
        event_id as event_id_0,
        event_bundle_sequence_id as event_bundle_sequence_id_0,
        event_previous_timestamp as event_previous_timestamp_0,
        event_server_timestamp_offset as event_server_timestamp_offset_0,
        event_timestamp as event_timestamp_0,
        ingest_timestamp as ingest_timestamp_0,
        event_value_in_usd as event_value_in_usd_0,
        app_info_app_id as app_info_app_id_0,
        app_info_package_id as app_info_package_id_0,
        app_info_install_source as app_info_install_source_0,
        app_info_version as app_info_version_0,
        device_id as device_id_0,
        device_mobile_brand_name as device_mobile_brand_name_0,
        device_mobile_model_name as device_mobile_model_name_0,
        device_manufacturer as device_manufacturer_0,
        device_screen_width as device_screen_width_0,
        device_screen_height as device_screen_height_0,
        device_carrier as device_carrier_0,
        device_network_type as device_network_type_0,
        device_operating_system as device_operating_system_0,
        device_operating_system_version as device_operating_system_version_0,
        device_ua_browser as ua_browser_0,
        device_ua_browser_version as ua_browser_version_0,
        device_ua_os as ua_os_0,
        device_ua_os_version as ua_os_version_0,
        device_ua_device as ua_device_0,
        device_ua_device_category as ua_device_category_0,
        device_system_language as device_system_language_0,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_0,
        device_advertising_id as advertising_id_0,
        geo_continent as geo_continent_0,
        geo_country as geo_country_0,
        geo_city as geo_city_0,
        geo_metro as geo_metro_0,
        geo_region as geo_region_0,
        geo_sub_continent as geo_sub_continent_0,
        geo_locale as geo_locale_0,
        platform as platform_0,
        project_id as project_id_0,
        traffic_source_name as traffic_source_name_0,
        traffic_source_medium as traffic_source_medium_0,
        traffic_source_source as traffic_source_source_0,
        user_first_touch_timestamp as user_first_touch_timestamp_0,
        user_id as user_id_0,
        user_pseudo_id as user_pseudo_id_0,
        user_ltv as user_ltv_0,
        event_dimensions as event_dimensions_0,
        ecommerce as ecommerce_0,
        items as items_0
      from
        base_data base
      where
        event_name = 'add_button_click'
    ),
    table_1 as (
      select
        event_date as event_date_1,
        event_name as event_name_1,
        event_id as event_id_1,
        event_bundle_sequence_id as event_bundle_sequence_id_1,
        event_previous_timestamp as event_previous_timestamp_1,
        event_server_timestamp_offset as event_server_timestamp_offset_1,
        event_timestamp as event_timestamp_1,
        ingest_timestamp as ingest_timestamp_1,
        event_value_in_usd as event_value_in_usd_1,
        app_info_app_id as app_info_app_id_1,
        app_info_package_id as app_info_package_id_1,
        app_info_install_source as app_info_install_source_1,
        app_info_version as app_info_version_1,
        device_id as device_id_1,
        device_mobile_brand_name as device_mobile_brand_name_1,
        device_mobile_model_name as device_mobile_model_name_1,
        device_manufacturer as device_manufacturer_1,
        device_screen_width as device_screen_width_1,
        device_screen_height as device_screen_height_1,
        device_carrier as device_carrier_1,
        device_network_type as device_network_type_1,
        device_operating_system as device_operating_system_1,
        device_operating_system_version as device_operating_system_version_1,
        device_ua_browser as ua_browser_1,
        device_ua_browser_version as ua_browser_version_1,
        device_ua_os as ua_os_1,
        device_ua_os_version as ua_os_version_1,
        device_ua_device as ua_device_1,
        device_ua_device_category as ua_device_category_1,
        device_system_language as device_system_language_1,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_1,
        device_advertising_id as advertising_id_1,
        geo_continent as geo_continent_1,
        geo_country as geo_country_1,
        geo_city as geo_city_1,
        geo_metro as geo_metro_1,
        geo_region as geo_region_1,
        geo_sub_continent as geo_sub_continent_1,
        geo_locale as geo_locale_1,
        platform as platform_1,
        project_id as project_id_1,
        traffic_source_name as traffic_source_name_1,
        traffic_source_medium as traffic_source_medium_1,
        traffic_source_source as traffic_source_source_1,
        user_first_touch_timestamp as user_first_touch_timestamp_1,
        user_id as user_id_1,
        user_pseudo_id as user_pseudo_id_1,
        user_ltv as user_ltv_1,
        event_dimensions as event_dimensions_1,
        ecommerce as ecommerce_1,
        items as items_1
      from
        base_data base
      where
        event_name = 'note_share'
    ),
    table_2 as (
      select
        event_date as event_date_2,
        event_name as event_name_2,
        event_id as event_id_2,
        event_bundle_sequence_id as event_bundle_sequence_id_2,
        event_previous_timestamp as event_previous_timestamp_2,
        event_server_timestamp_offset as event_server_timestamp_offset_2,
        event_timestamp as event_timestamp_2,
        ingest_timestamp as ingest_timestamp_2,
        event_value_in_usd as event_value_in_usd_2,
        app_info_app_id as app_info_app_id_2,
        app_info_package_id as app_info_package_id_2,
        app_info_install_source as app_info_install_source_2,
        app_info_version as app_info_version_2,
        device_id as device_id_2,
        device_mobile_brand_name as device_mobile_brand_name_2,
        device_mobile_model_name as device_mobile_model_name_2,
        device_manufacturer as device_manufacturer_2,
        device_screen_width as device_screen_width_2,
        device_screen_height as device_screen_height_2,
        device_carrier as device_carrier_2,
        device_network_type as device_network_type_2,
        device_operating_system as device_operating_system_2,
        device_operating_system_version as device_operating_system_version_2,
        device_ua_browser as ua_browser_2,
        device_ua_browser_version as ua_browser_version_2,
        device_ua_os as ua_os_2,
        device_ua_os_version as ua_os_version_2,
        device_ua_device as ua_device_2,
        device_ua_device_category as ua_device_category_2,
        device_system_language as device_system_language_2,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_2,
        device_advertising_id as advertising_id_2,
        geo_continent as geo_continent_2,
        geo_country as geo_country_2,
        geo_city as geo_city_2,
        geo_metro as geo_metro_2,
        geo_region as geo_region_2,
        geo_sub_continent as geo_sub_continent_2,
        geo_locale as geo_locale_2,
        platform as platform_2,
        project_id as project_id_2,
        traffic_source_name as traffic_source_name_2,
        traffic_source_medium as traffic_source_medium_2,
        traffic_source_source as traffic_source_source_2,
        user_first_touch_timestamp as user_first_touch_timestamp_2,
        user_id as user_id_2,
        user_pseudo_id as user_pseudo_id_2,
        user_ltv as user_ltv_2,
        event_dimensions as event_dimensions_2,
        ecommerce as ecommerce_2,
        items as items_2
      from
        base_data base
      where
        event_name = 'note_export'
    ),
    join_table as (
      select
        table_0.*,
        table_1.event_id_1,
        table_1.event_name_1,
        table_1.user_pseudo_id_1,
        table_1.event_timestamp_1,
        table_2.event_id_2,
        table_2.event_name_2,
        table_2.user_pseudo_id_2,
        table_2.event_timestamp_2
      from
        table_0
        left outer join table_1 on table_0.user_pseudo_id_0 = table_1.user_pseudo_id_1
        and table_1.event_timestamp_1 - table_0.event_timestamp_0 > 0
        and table_1.event_timestamp_1 - table_0.event_timestamp_0 < 600 * 1000
        left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
        and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
        and table_2.event_timestamp_2 - table_1.event_timestamp_1 < 600 * 1000
    )
  select
    DAY,
    count(distinct user_pseudo_id_0) as add_button_click,
    (
      count(distinct user_pseudo_id_2)::decimal / NULLIF(count(distinct user_pseudo_id_0), 0)
    )::decimal(20, 4) as rate,
    count(distinct user_pseudo_id_1) as note_share,
    (
      count(distinct user_pseudo_id_1)::decimal / NULLIF(count(distinct user_pseudo_id_0), 0)
    )::decimal(20, 4) as note_share_rate,
    count(distinct user_pseudo_id_2) as note_export,
    (
      count(distinct user_pseudo_id_2)::decimal / NULLIF(count(distinct user_pseudo_id_1), 0)
    )::decimal(20, 4) as note_export_rate
  from
    join_table
  group by
    DAY
  `.trim().replace(/ /g, ''),
    );

  });

  test('funnel chart visual sql - conditions', () => {

    const sql = buildFunnelView('app1', 'testview', {
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: 'add_button_click',
          sqlCondition: {
            conditions: [{
              category: 'other',
              property: 'platform',
              operator: '=',
              value: ['ANDROID'],
              dataType: MetadataValueType.STRING,
            },
            {
              category: 'device',
              property: 'screen_height',
              operator: '<>',
              value: [1400],
              dataType: MetadataValueType.INTEGER,
            }],
            conditionOperator: 'and',
          },
        },
        {
          eventName: 'note_share',
          sqlCondition: {
            conditions: [{
              category: 'other',
              property: 'platform',
              operator: '=',
              value: ['ANDROID'],
              dataType: MetadataValueType.STRING,
            },
            {
              category: 'device',
              property: 'screen_height',
              operator: '<>',
              value: [1400],
              dataType: MetadataValueType.INTEGER,
            }],
            conditionOperator: 'and',
          },

        },
        {
          eventName: 'note_export',
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-04-30'),
      timeEnd: new Date('2023-06-30'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`CREATE OR REPLACE VIEW
    app1.testview AS
  with
    tmp_data as (
      select
        event_date,
        event_name,
        event_id,
        event_bundle_sequence_id::bigint as event_bundle_sequence_id,
        event_previous_timestamp::bigint as event_previous_timestamp,
        event_server_timestamp_offset::bigint as event_server_timestamp_offset,
        event_timestamp::bigint as event_timestamp,
        ingest_timestamp,
        event_value_in_usd,
        app_info.app_id::varchar as app_info_app_id,
        app_info.id::varchar as app_info_package_id,
        app_info.install_source::varchar as app_info_install_source,
        app_info.version::varchar as app_info_version,
        device.vendor_id::varchar as device_id,
        device.mobile_brand_name::varchar as device_mobile_brand_name,
        device.mobile_model_name::varchar as device_mobile_model_name,
        device.manufacturer::varchar as device_manufacturer,
        device.screen_width::bigint as device_screen_width,
        device.screen_height::bigint as device_screen_height,
        device.carrier::varchar as device_carrier,
        device.network_type::varchar as device_network_type,
        device.operating_system::varchar as device_operating_system,
        device.operating_system_version::varchar as device_operating_system_version,
        device.ua_browser::varchar as device_ua_browser,
        device.ua_browser_version::varchar as device_ua_browser_version,
        device.ua_os::varchar as device_ua_os,
        device.ua_os_version::varchar as device_ua_os_version,
        device.ua_device::varchar as device_ua_device,
        device.ua_device_category::varchar as device_ua_device_category,
        device.system_language::varchar as device_system_language,
        device.time_zone_offset_seconds::bigint as device_time_zone_offset_seconds,
        device.advertising_id::varchar as device_advertising_id,
        geo.continent::varchar as geo_continent,
        geo.country::varchar as geo_country,
        geo.city::varchar as geo_city,
        geo.metro::varchar as geo_metro,
        geo.region::varchar as geo_region,
        geo.sub_continent::varchar as geo_sub_continent,
        geo.locale::varchar as geo_locale,
        platform,
        project_id,
        traffic_source.name::varchar as traffic_source_name,
        traffic_source.medium::varchar as traffic_source_medium,
        traffic_source.source::varchar as traffic_source_source,
        user_first_touch_timestamp,
        user_id,
        user_pseudo_id,
        user_ltv,
        event_dimensions,
        ecommerce,
        items,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM'
        ) as month,
        TO_CHAR(
          date_trunc(
            'week',
            TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second'
          ),
          'YYYY-MM-DD'
        ) || ' - ' || TO_CHAR(
          date_trunc(
            'week',
            (
              TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second'
            ) + INTERVAL '6 days'
          ),
          'YYYY-MM-DD'
        ) as week,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD'
        ) as day,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD HH24'
        ) || '00:00' as hour,
        user_properties,
        event_params
      from
        app1.ods_events ods
      where
        event_date >= 'SunApr30202300:00:00GMT+0000(CoordinatedUniversalTime)'
        and event_date <= 'FriJun30202300:00:00GMT+0000(CoordinatedUniversalTime)'
        and event_name in ('add_button_click', 'note_share', 'note_export')
    ),
    tmp_base_data as (
      select
        *
      from
        tmp_data base
    ),
    base_data as (
      select
        *
      from
        tmp_base_data
      where
        1 = 1
        and (
          (
            event_name = 'add_button_click'
            and (
              platform = 'ANDROID'
              and device_screen_height <> 1400
            )
          )
          or (
            event_name = 'note_share'
            and (
              platform = 'ANDROID'
              and device_screen_height <> 1400
            )
          )
          or (event_name = 'note_export')
        )
    ),
    table_0 as (
      select
        month,
        week,
        day,
        hour,
        event_date as event_date_0,
        event_name as event_name_0,
        event_id as event_id_0,
        event_bundle_sequence_id as event_bundle_sequence_id_0,
        event_previous_timestamp as event_previous_timestamp_0,
        event_server_timestamp_offset as event_server_timestamp_offset_0,
        event_timestamp as event_timestamp_0,
        ingest_timestamp as ingest_timestamp_0,
        event_value_in_usd as event_value_in_usd_0,
        app_info_app_id as app_info_app_id_0,
        app_info_package_id as app_info_package_id_0,
        app_info_install_source as app_info_install_source_0,
        app_info_version as app_info_version_0,
        device_id as device_id_0,
        device_mobile_brand_name as device_mobile_brand_name_0,
        device_mobile_model_name as device_mobile_model_name_0,
        device_manufacturer as device_manufacturer_0,
        device_screen_width as device_screen_width_0,
        device_screen_height as device_screen_height_0,
        device_carrier as device_carrier_0,
        device_network_type as device_network_type_0,
        device_operating_system as device_operating_system_0,
        device_operating_system_version as device_operating_system_version_0,
        device_ua_browser as ua_browser_0,
        device_ua_browser_version as ua_browser_version_0,
        device_ua_os as ua_os_0,
        device_ua_os_version as ua_os_version_0,
        device_ua_device as ua_device_0,
        device_ua_device_category as ua_device_category_0,
        device_system_language as device_system_language_0,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_0,
        device_advertising_id as advertising_id_0,
        geo_continent as geo_continent_0,
        geo_country as geo_country_0,
        geo_city as geo_city_0,
        geo_metro as geo_metro_0,
        geo_region as geo_region_0,
        geo_sub_continent as geo_sub_continent_0,
        geo_locale as geo_locale_0,
        platform as platform_0,
        project_id as project_id_0,
        traffic_source_name as traffic_source_name_0,
        traffic_source_medium as traffic_source_medium_0,
        traffic_source_source as traffic_source_source_0,
        user_first_touch_timestamp as user_first_touch_timestamp_0,
        user_id as user_id_0,
        user_pseudo_id as user_pseudo_id_0,
        user_ltv as user_ltv_0,
        event_dimensions as event_dimensions_0,
        ecommerce as ecommerce_0,
        items as items_0
      from
        base_data base
      where
        event_name = 'add_button_click'
    ),
    table_1 as (
      select
        event_date as event_date_1,
        event_name as event_name_1,
        event_id as event_id_1,
        event_bundle_sequence_id as event_bundle_sequence_id_1,
        event_previous_timestamp as event_previous_timestamp_1,
        event_server_timestamp_offset as event_server_timestamp_offset_1,
        event_timestamp as event_timestamp_1,
        ingest_timestamp as ingest_timestamp_1,
        event_value_in_usd as event_value_in_usd_1,
        app_info_app_id as app_info_app_id_1,
        app_info_package_id as app_info_package_id_1,
        app_info_install_source as app_info_install_source_1,
        app_info_version as app_info_version_1,
        device_id as device_id_1,
        device_mobile_brand_name as device_mobile_brand_name_1,
        device_mobile_model_name as device_mobile_model_name_1,
        device_manufacturer as device_manufacturer_1,
        device_screen_width as device_screen_width_1,
        device_screen_height as device_screen_height_1,
        device_carrier as device_carrier_1,
        device_network_type as device_network_type_1,
        device_operating_system as device_operating_system_1,
        device_operating_system_version as device_operating_system_version_1,
        device_ua_browser as ua_browser_1,
        device_ua_browser_version as ua_browser_version_1,
        device_ua_os as ua_os_1,
        device_ua_os_version as ua_os_version_1,
        device_ua_device as ua_device_1,
        device_ua_device_category as ua_device_category_1,
        device_system_language as device_system_language_1,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_1,
        device_advertising_id as advertising_id_1,
        geo_continent as geo_continent_1,
        geo_country as geo_country_1,
        geo_city as geo_city_1,
        geo_metro as geo_metro_1,
        geo_region as geo_region_1,
        geo_sub_continent as geo_sub_continent_1,
        geo_locale as geo_locale_1,
        platform as platform_1,
        project_id as project_id_1,
        traffic_source_name as traffic_source_name_1,
        traffic_source_medium as traffic_source_medium_1,
        traffic_source_source as traffic_source_source_1,
        user_first_touch_timestamp as user_first_touch_timestamp_1,
        user_id as user_id_1,
        user_pseudo_id as user_pseudo_id_1,
        user_ltv as user_ltv_1,
        event_dimensions as event_dimensions_1,
        ecommerce as ecommerce_1,
        items as items_1
      from
        base_data base
      where
        event_name = 'note_share'
    ),
    table_2 as (
      select
        event_date as event_date_2,
        event_name as event_name_2,
        event_id as event_id_2,
        event_bundle_sequence_id as event_bundle_sequence_id_2,
        event_previous_timestamp as event_previous_timestamp_2,
        event_server_timestamp_offset as event_server_timestamp_offset_2,
        event_timestamp as event_timestamp_2,
        ingest_timestamp as ingest_timestamp_2,
        event_value_in_usd as event_value_in_usd_2,
        app_info_app_id as app_info_app_id_2,
        app_info_package_id as app_info_package_id_2,
        app_info_install_source as app_info_install_source_2,
        app_info_version as app_info_version_2,
        device_id as device_id_2,
        device_mobile_brand_name as device_mobile_brand_name_2,
        device_mobile_model_name as device_mobile_model_name_2,
        device_manufacturer as device_manufacturer_2,
        device_screen_width as device_screen_width_2,
        device_screen_height as device_screen_height_2,
        device_carrier as device_carrier_2,
        device_network_type as device_network_type_2,
        device_operating_system as device_operating_system_2,
        device_operating_system_version as device_operating_system_version_2,
        device_ua_browser as ua_browser_2,
        device_ua_browser_version as ua_browser_version_2,
        device_ua_os as ua_os_2,
        device_ua_os_version as ua_os_version_2,
        device_ua_device as ua_device_2,
        device_ua_device_category as ua_device_category_2,
        device_system_language as device_system_language_2,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_2,
        device_advertising_id as advertising_id_2,
        geo_continent as geo_continent_2,
        geo_country as geo_country_2,
        geo_city as geo_city_2,
        geo_metro as geo_metro_2,
        geo_region as geo_region_2,
        geo_sub_continent as geo_sub_continent_2,
        geo_locale as geo_locale_2,
        platform as platform_2,
        project_id as project_id_2,
        traffic_source_name as traffic_source_name_2,
        traffic_source_medium as traffic_source_medium_2,
        traffic_source_source as traffic_source_source_2,
        user_first_touch_timestamp as user_first_touch_timestamp_2,
        user_id as user_id_2,
        user_pseudo_id as user_pseudo_id_2,
        user_ltv as user_ltv_2,
        event_dimensions as event_dimensions_2,
        ecommerce as ecommerce_2,
        items as items_2
      from
        base_data base
      where
        event_name = 'note_export'
    ),
    join_table as (
      select
        table_0.*,
        table_1.event_id_1,
        table_1.event_name_1,
        table_1.user_pseudo_id_1,
        table_1.event_timestamp_1,
        table_2.event_id_2,
        table_2.event_name_2,
        table_2.user_pseudo_id_2,
        table_2.event_timestamp_2
      from
        table_0
        left outer join table_1 on table_0.user_pseudo_id_0 = table_1.user_pseudo_id_1
        and table_1.event_timestamp_1 - table_0.event_timestamp_0 > 0
        and table_1.event_timestamp_1 - table_0.event_timestamp_0 < 600 * 1000
        left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
        and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
        and table_2.event_timestamp_2 - table_1.event_timestamp_1 < 600 * 1000
    ),
    final_table as (
      select
        month,
        week,
        day,
        hour,
        event_id_0 as e_id_0,
        event_name_0 as e_name_0,
        user_pseudo_id_0 as u_id_0,
        event_id_1 as e_id_1,
        event_name_1 as e_name_1,
        user_pseudo_id_1 as u_id_1,
        event_id_2 as e_id_2,
        event_name_2 as e_name_2,
        user_pseudo_id_2 as u_id_2
      from
        join_table
      group by
        month,
        week,
        day,
        hour,
        event_id_0,
        event_name_0,
        user_pseudo_id_0,
        event_id_1,
        event_name_1,
        user_pseudo_id_1,
        event_id_2,
        event_name_2,
        user_pseudo_id_2
    )
  select
    day::date as event_date,
    e_name_0::varchar as event_name,
    u_id_0::varchar as x_id
  from
    final_table
  where
    u_id_0 is not null
  union all
  select
    day::date as event_date,
    e_name_1::varchar as event_name,
    u_id_1::varchar as x_id
  from
    final_table
  where
    u_id_1 is not null
  union all
  select
    day::date as event_date,
    e_name_2::varchar as event_name,
    u_id_2::varchar as x_id
  from
    final_table
  where
    u_id_2 is not null
  `.trim().replace(/ /g, ''),
    );

  });

  test('event analysis sql', () => {

    const sql = buildEventAnalysisView('app1', 'testview', {
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: false,
      eventAndConditions: [
        {
          eventName: 'add_button_click',
        },
        {
          eventName: 'note_share',
        },
        {
          eventName: 'note_export',
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-04-30'),
      timeEnd: new Date('2023-06-30'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`CREATE OR REPLACE VIEW
    app1.testview AS
  with
    base_data as (
      select
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM'
        ) as month,
        TO_CHAR(
          date_trunc(
            'week',
            TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second'
          ),
          'YYYY-MM-DD'
        ) || ' - ' || TO_CHAR(
          date_trunc(
            'week',
            (
              TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second'
            ) + INTERVAL '6 days'
          ),
          'YYYY-MM-DD'
        ) as week,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD'
        ) as day,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD HH24'
        ) || '00:00' as hour,
        event_params,
        user_properties,
        event_date,
        event_name,
        event_id,
        event_bundle_sequence_id::bigint as event_bundle_sequence_id,
        event_previous_timestamp::bigint as event_previous_timestamp,
        event_server_timestamp_offset::bigint as event_server_timestamp_offset,
        event_timestamp::bigint as event_timestamp,
        ingest_timestamp,
        event_value_in_usd,
        app_info.app_id::varchar as app_info_app_id,
        app_info.id::varchar as app_info_package_id,
        app_info.install_source::varchar as app_info_install_source,
        app_info.version::varchar as app_info_version,
        device.vendor_id::varchar as device_id,
        device.mobile_brand_name::varchar as device_mobile_brand_name,
        device.mobile_model_name::varchar as device_mobile_model_name,
        device.manufacturer::varchar as device_manufacturer,
        device.screen_width::bigint as device_screen_width,
        device.screen_height::bigint as device_screen_height,
        device.carrier::varchar as device_carrier,
        device.network_type::varchar as device_network_type,
        device.operating_system::varchar as device_operating_system,
        device.operating_system_version::varchar as device_operating_system_version,
        device.ua_browser::varchar as device_ua_browser,
        device.ua_browser_version::varchar as device_ua_browser_version,
        device.ua_os::varchar as device_ua_os,
        device.ua_os_version::varchar as device_ua_os_version,
        device.ua_device::varchar as device_ua_device,
        device.ua_device_category::varchar as device_ua_device_category,
        device.system_language::varchar as device_system_language,
        device.time_zone_offset_seconds::bigint as device_time_zone_offset_seconds,
        device.advertising_id::varchar as device_advertising_id,
        geo.continent::varchar as geo_continent,
        geo.country::varchar as geo_country,
        geo.city::varchar as geo_city,
        geo.metro::varchar as geo_metro,
        geo.region::varchar as geo_region,
        geo.sub_continent::varchar as geo_sub_continent,
        geo.locale::varchar as geo_locale,
        platform,
        project_id,
        traffic_source.name::varchar as traffic_source_name,
        traffic_source.medium::varchar as traffic_source_medium,
        traffic_source.source::varchar as traffic_source_source,
        user_first_touch_timestamp,
        user_id,
        user_pseudo_id,
        user_ltv,
        event_dimensions,
        ecommerce,
        items
      from
        app1.ods_events ods
      where
        event_date >= 'Sun Apr 30 2023 00:00:00 GMT+0000 (Coordinated Universal Time)'
        and event_date <= 'Fri Jun 30 2023 00:00:00 GMT+0000 (Coordinated Universal Time)'
        and event_name in ('add_button_click', 'note_share', 'note_export')
    ),
    table_0 as (
      select
        month,
        week,
        day,
        hour,
        event_date as event_date_0,
        event_name as event_name_0,
        event_id as event_id_0,
        event_bundle_sequence_id as event_bundle_sequence_id_0,
        event_previous_timestamp as event_previous_timestamp_0,
        event_server_timestamp_offset as event_server_timestamp_offset_0,
        event_timestamp as event_timestamp_0,
        ingest_timestamp as ingest_timestamp_0,
        event_value_in_usd as event_value_in_usd_0,
        app_info_app_id as app_info_app_id_0,
        app_info_package_id as app_info_package_id_0,
        app_info_install_source as app_info_install_source_0,
        app_info_version as app_info_version_0,
        device_id as device_id_0,
        device_mobile_brand_name as device_mobile_brand_name_0,
        device_mobile_model_name as device_mobile_model_name_0,
        device_manufacturer as device_manufacturer_0,
        device_screen_width as device_screen_width_0,
        device_screen_height as device_screen_height_0,
        device_carrier as device_carrier_0,
        device_network_type as device_network_type_0,
        device_operating_system as device_operating_system_0,
        device_operating_system_version as device_operating_system_version_0,
        device_ua_browser as ua_browser_0,
        device_ua_browser_version as ua_browser_version_0,
        device_ua_os as ua_os_0,
        device_ua_os_version as ua_os_version_0,
        device_ua_device as ua_device_0,
        device_ua_device_category as ua_device_category_0,
        device_system_language as device_system_language_0,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_0,
        device_advertising_id as advertising_id_0,
        geo_continent as geo_continent_0,
        geo_country as geo_country_0,
        geo_city as geo_city_0,
        geo_metro as geo_metro_0,
        geo_region as geo_region_0,
        geo_sub_continent as geo_sub_continent_0,
        geo_locale as geo_locale_0,
        platform as platform_0,
        project_id as project_id_0,
        traffic_source_name as traffic_source_name_0,
        traffic_source_medium as traffic_source_medium_0,
        traffic_source_source as traffic_source_source_0,
        user_first_touch_timestamp as user_first_touch_timestamp_0,
        user_id as user_id_0,
        user_pseudo_id as user_pseudo_id_0,
        user_ltv as user_ltv_0,
        event_dimensions as event_dimensions_0,
        ecommerce as ecommerce_0,
        items as items_0
      from
        base_data base
      where
        event_name = 'add_button_click'
    ),
    table_1 as (
      select
        month,
        week,
        day,
        hour,
        event_date as event_date_1,
        event_name as event_name_1,
        event_id as event_id_1,
        event_bundle_sequence_id as event_bundle_sequence_id_1,
        event_previous_timestamp as event_previous_timestamp_1,
        event_server_timestamp_offset as event_server_timestamp_offset_1,
        event_timestamp as event_timestamp_1,
        ingest_timestamp as ingest_timestamp_1,
        event_value_in_usd as event_value_in_usd_1,
        app_info_app_id as app_info_app_id_1,
        app_info_package_id as app_info_package_id_1,
        app_info_install_source as app_info_install_source_1,
        app_info_version as app_info_version_1,
        device_id as device_id_1,
        device_mobile_brand_name as device_mobile_brand_name_1,
        device_mobile_model_name as device_mobile_model_name_1,
        device_manufacturer as device_manufacturer_1,
        device_screen_width as device_screen_width_1,
        device_screen_height as device_screen_height_1,
        device_carrier as device_carrier_1,
        device_network_type as device_network_type_1,
        device_operating_system as device_operating_system_1,
        device_operating_system_version as device_operating_system_version_1,
        device_ua_browser as ua_browser_1,
        device_ua_browser_version as ua_browser_version_1,
        device_ua_os as ua_os_1,
        device_ua_os_version as ua_os_version_1,
        device_ua_device as ua_device_1,
        device_ua_device_category as ua_device_category_1,
        device_system_language as device_system_language_1,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_1,
        device_advertising_id as advertising_id_1,
        geo_continent as geo_continent_1,
        geo_country as geo_country_1,
        geo_city as geo_city_1,
        geo_metro as geo_metro_1,
        geo_region as geo_region_1,
        geo_sub_continent as geo_sub_continent_1,
        geo_locale as geo_locale_1,
        platform as platform_1,
        project_id as project_id_1,
        traffic_source_name as traffic_source_name_1,
        traffic_source_medium as traffic_source_medium_1,
        traffic_source_source as traffic_source_source_1,
        user_first_touch_timestamp as user_first_touch_timestamp_1,
        user_id as user_id_1,
        user_pseudo_id as user_pseudo_id_1,
        user_ltv as user_ltv_1,
        event_dimensions as event_dimensions_1,
        ecommerce as ecommerce_1,
        items as items_1
      from
        base_data base
      where
        event_name = 'note_share'
    ),
    table_2 as (
      select
        month,
        week,
        day,
        hour,
        event_date as event_date_2,
        event_name as event_name_2,
        event_id as event_id_2,
        event_bundle_sequence_id as event_bundle_sequence_id_2,
        event_previous_timestamp as event_previous_timestamp_2,
        event_server_timestamp_offset as event_server_timestamp_offset_2,
        event_timestamp as event_timestamp_2,
        ingest_timestamp as ingest_timestamp_2,
        event_value_in_usd as event_value_in_usd_2,
        app_info_app_id as app_info_app_id_2,
        app_info_package_id as app_info_package_id_2,
        app_info_install_source as app_info_install_source_2,
        app_info_version as app_info_version_2,
        device_id as device_id_2,
        device_mobile_brand_name as device_mobile_brand_name_2,
        device_mobile_model_name as device_mobile_model_name_2,
        device_manufacturer as device_manufacturer_2,
        device_screen_width as device_screen_width_2,
        device_screen_height as device_screen_height_2,
        device_carrier as device_carrier_2,
        device_network_type as device_network_type_2,
        device_operating_system as device_operating_system_2,
        device_operating_system_version as device_operating_system_version_2,
        device_ua_browser as ua_browser_2,
        device_ua_browser_version as ua_browser_version_2,
        device_ua_os as ua_os_2,
        device_ua_os_version as ua_os_version_2,
        device_ua_device as ua_device_2,
        device_ua_device_category as ua_device_category_2,
        device_system_language as device_system_language_2,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_2,
        device_advertising_id as advertising_id_2,
        geo_continent as geo_continent_2,
        geo_country as geo_country_2,
        geo_city as geo_city_2,
        geo_metro as geo_metro_2,
        geo_region as geo_region_2,
        geo_sub_continent as geo_sub_continent_2,
        geo_locale as geo_locale_2,
        platform as platform_2,
        project_id as project_id_2,
        traffic_source_name as traffic_source_name_2,
        traffic_source_medium as traffic_source_medium_2,
        traffic_source_source as traffic_source_source_2,
        user_first_touch_timestamp as user_first_touch_timestamp_2,
        user_id as user_id_2,
        user_pseudo_id as user_pseudo_id_2,
        user_ltv as user_ltv_2,
        event_dimensions as event_dimensions_2,
        ecommerce as ecommerce_2,
        items as items_2
      from
        base_data base
      where
        event_name = 'note_export'
    ),
    join_table as (
      select
        table_0.month,
        table_0.week,
        table_0.day,
        table_0.hour,
        table_0.event_id_0 as event_id,
        table_0.event_name_0 as event_name,
        table_0.user_pseudo_id_0 as user_pseudo_id,
        table_0.event_timestamp_0 as event_timestamp
      from
        table_0
      union all
      select
        table_1.month,
        table_1.week,
        table_1.day,
        table_1.hour,
        table_1.event_id_1 as event_id,
        table_1.event_name_1 as event_name,
        table_1.user_pseudo_id_1 as user_pseudo_id,
        table_1.event_timestamp_1 as event_timestamp
      from
        table_1
      union all
      select
        table_2.month,
        table_2.week,
        table_2.day,
        table_2.hour,
        table_2.event_id_2 as event_id,
        table_2.event_name_2 as event_name,
        table_2.user_pseudo_id_2 as user_pseudo_id,
        table_2.event_timestamp_2 as event_timestamp
      from
        table_2
    ),
    final_table as (
      select
        month,
        week,
        day,
        hour,
        event_id as e_id,
        event_name as e_name,
        user_pseudo_id as u_id
      from
        join_table
      group by
        month,
        week,
        day,
        hour,
        event_id,
        event_name,
        user_pseudo_id
    )
  select
    day::date as event_date,
    e_name::varchar as event_name,
    u_id::varchar as x_id
  from
    final_table
  where
    u_id is not null
  `.trim().replace(/ /g, ''),
    );

  });

  test('event path analysis view', () => {

    const sql = buildEventPathAnalysisView('app1', 'testview', {
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: 'add_button_click',
          sqlCondition: {
            conditions: [{
              category: 'other',
              property: 'platform',
              operator: '=',
              value: ['ANDROID'],
              dataType: MetadataValueType.STRING,
            },
            {
              category: 'device',
              property: 'screen_height',
              operator: '<>',
              value: [1400],
              dataType: MetadataValueType.INTEGER,
            }],
            conditionOperator: 'and',
          },
        },
        {
          eventName: 'note_share',
          sqlCondition: {
            conditions: [{
              category: 'other',
              property: 'platform',
              operator: '=',
              value: ['ANDROID'],
              dataType: MetadataValueType.STRING,
            },
            {
              category: 'device',
              property: 'screen_height',
              operator: '<>',
              value: [1400],
              dataType: MetadataValueType.INTEGER,
            }],
            conditionOperator: 'or',
          },

        },
        {
          eventName: 'note_export',
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      groupColumn: ExploreGroupColumn.DAY,
      timeStart: new Date('2023-04-30'),
      timeEnd: new Date('2023-06-30'),
      pathAnalysis: {
        sessionType: ExplorePathSessionDef.SESSION,
        nodeType: ExplorePathNodeType.EVENT,
        lagSeconds: 3600,
      },
    });

    const expectResult = `CREATE OR REPLACE VIEW
    app1.testview AS
  with
    tmp_data as (
      select
        event_date,
        event_name,
        event_id,
        event_bundle_sequence_id::bigint as event_bundle_sequence_id,
        event_previous_timestamp::bigint as event_previous_timestamp,
        event_server_timestamp_offset::bigint as event_server_timestamp_offset,
        event_timestamp::bigint as event_timestamp,
        ingest_timestamp,
        event_value_in_usd,
        app_info.app_id::varchar as app_info_app_id,
        app_info.id::varchar as app_info_package_id,
        app_info.install_source::varchar as app_info_install_source,
        app_info.version::varchar as app_info_version,
        device.vendor_id::varchar as device_id,
        device.mobile_brand_name::varchar as device_mobile_brand_name,
        device.mobile_model_name::varchar as device_mobile_model_name,
        device.manufacturer::varchar as device_manufacturer,
        device.screen_width::bigint as device_screen_width,
        device.screen_height::bigint as device_screen_height,
        device.carrier::varchar as device_carrier,
        device.network_type::varchar as device_network_type,
        device.operating_system::varchar as device_operating_system,
        device.operating_system_version::varchar as device_operating_system_version,
        device.ua_browser::varchar as device_ua_browser,
        device.ua_browser_version::varchar as device_ua_browser_version,
        device.ua_os::varchar as device_ua_os,
        device.ua_os_version::varchar as device_ua_os_version,
        device.ua_device::varchar as device_ua_device,
        device.ua_device_category::varchar as device_ua_device_category,
        device.system_language::varchar as device_system_language,
        device.time_zone_offset_seconds::bigint as device_time_zone_offset_seconds,
        device.advertising_id::varchar as device_advertising_id,
        geo.continent::varchar as geo_continent,
        geo.country::varchar as geo_country,
        geo.city::varchar as geo_city,
        geo.metro::varchar as geo_metro,
        geo.region::varchar as geo_region,
        geo.sub_continent::varchar as geo_sub_continent,
        geo.locale::varchar as geo_locale,
        platform,
        project_id,
        traffic_source.name::varchar as traffic_source_name,
        traffic_source.medium::varchar as traffic_source_medium,
        traffic_source.source::varchar as traffic_source_source,
        user_first_touch_timestamp,
        user_id,
        user_pseudo_id,
        user_ltv,
        event_dimensions,
        ecommerce,
        items,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM'
        ) as month,
        TO_CHAR(
          date_trunc(
            'week',
            TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second'
          ),
          'YYYY-MM-DD'
        ) || ' - ' || TO_CHAR(
          date_trunc(
            'week',
            (
              TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second'
            ) + INTERVAL '6 days'
          ),
          'YYYY-MM-DD'
        ) as week,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD'
        ) as day,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD HH24'
        ) || '00:00' as hour,
        user_properties,
        event_params
      from
        app1.ods_events ods
      where
        event_date >= 'Sun Apr 30 2023 00:00:00 GMT+0000 (Coordinated Universal Time)'
        and event_date <= 'Fri Jun 30 2023 00:00:00 GMT+0000 (Coordinated Universal Time)'
        and event_name in ('add_button_click', 'note_share', 'note_export')
    ),
    tmp_base_data as (
      select
        *
      from
        tmp_data base
    ),
    base_data as (
      select
        *
      from
        tmp_base_data
      where
        1 = 1
        and (
          (
            event_name = 'add_button_click'
            and (
              platform = 'ANDROID'
              and device_screen_height <> 1400
            )
          )
          or (
            event_name = 'note_share'
            and (
              platform = 'ANDROID'
              or device_screen_height <> 1400
            )
          )
          or (event_name = 'note_export')
        )
    ),
    mid_table as (
      select
        day::date as event_date,
        event_name,
        user_pseudo_id,
        event_id,
        event_timestamp,
        (
          select
            ep.value.string_value
          from
            base_data e,
            e.event_params ep
          where
            ep.key = '_session_id'
            and e.event_id = base.event_id
          limit
            1
        ) as session_id
      from
        base_data base
      where
        (
          event_name = 'add_button_click'
          and (
            platform = 'ANDROID'
            and device_screen_height <> 1400
          )
        )
        or (
          event_name = 'note_share'
          and (
            platform = 'ANDROID'
            or device_screen_height <> 1400
          )
        )
    ),
    data as (
      select
        *,
        ROW_NUMBER() OVER (
          PARTITION BY
            user_pseudo_id,
            session_id
          ORDER BY
            event_timestamp asc
        ) as step_1,
        ROW_NUMBER() OVER (
          PARTITION BY
            user_pseudo_id,
            session_id
          ORDER BY
            event_timestamp asc
        ) + 1 as step_2
      from
        mid_table
    )
  select
    a.event_date as event_date,
    a.event_name || '_' || a.step_1 as source,
    CASE
      WHEN b.event_name is not null THEN b.event_name || '_' || a.step_2
      ELSE 'other_' || a.step_2
    END as target,
    count(distinct a.user_pseudo_id) as weight
  from
    data a
    left join data b on a.user_pseudo_id = b.user_pseudo_id
    and a.session_id = b.session_id
    and a.step_2 = b.step_1
  where
    a.step_2 <= 10
  group by
    a.event_date,
    a.event_name || '_' || a.step_1,
    CASE
      WHEN b.event_name is not null THEN b.event_name || '_' || a.step_2
      ELSE 'other_' || a.step_2
    END`;

    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));
  });

  test('node path analysis view', () => {

    const sql = buildNodePathAnalysisView('app1', 'testview', {
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      timeScopeType: ExploreTimeScopeType.FIXED,
      groupColumn: ExploreGroupColumn.DAY,
      timeStart: new Date('2023-04-30'),
      timeEnd: new Date('2023-06-30'),
      pathAnalysis: {
        platform: MetadataPlatform.ANDROID,
        sessionType: ExplorePathSessionDef.SESSION,
        nodeType: ExplorePathNodeType.SCREEN_NAME,
        lagSeconds: 3600,
        nodes: ['NotepadActivity', 'NotepadExportActivity', 'NotepadShareActivity', 'NotepadPrintActivity'],
      },
    });

    const expectResult = `CREATE OR REPLACE VIEW
    app1.testview AS
  with
    base_data as (
      select
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM'
        ) as month,
        TO_CHAR(
          date_trunc(
            'week',
            TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second'
          ),
          'YYYY-MM-DD'
        ) || ' - ' || TO_CHAR(
          date_trunc(
            'week',
            (
              TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second'
            ) + INTERVAL '6 days'
          ),
          'YYYY-MM-DD'
        ) as week,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD'
        ) as day,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD HH24'
        ) || '00:00' as hour,
        event_params,
        user_properties,
        event_date,
        event_name,
        event_id,
        event_bundle_sequence_id::bigint as event_bundle_sequence_id,
        event_previous_timestamp::bigint as event_previous_timestamp,
        event_server_timestamp_offset::bigint as event_server_timestamp_offset,
        event_timestamp::bigint as event_timestamp,
        ingest_timestamp,
        event_value_in_usd,
        app_info.app_id::varchar as app_info_app_id,
        app_info.id::varchar as app_info_package_id,
        app_info.install_source::varchar as app_info_install_source,
        app_info.version::varchar as app_info_version,
        device.vendor_id::varchar as device_id,
        device.mobile_brand_name::varchar as device_mobile_brand_name,
        device.mobile_model_name::varchar as device_mobile_model_name,
        device.manufacturer::varchar as device_manufacturer,
        device.screen_width::bigint as device_screen_width,
        device.screen_height::bigint as device_screen_height,
        device.carrier::varchar as device_carrier,
        device.network_type::varchar as device_network_type,
        device.operating_system::varchar as device_operating_system,
        device.operating_system_version::varchar as device_operating_system_version,
        device.ua_browser::varchar as device_ua_browser,
        device.ua_browser_version::varchar as device_ua_browser_version,
        device.ua_os::varchar as device_ua_os,
        device.ua_os_version::varchar as device_ua_os_version,
        device.ua_device::varchar as device_ua_device,
        device.ua_device_category::varchar as device_ua_device_category,
        device.system_language::varchar as device_system_language,
        device.time_zone_offset_seconds::bigint as device_time_zone_offset_seconds,
        device.advertising_id::varchar as device_advertising_id,
        geo.continent::varchar as geo_continent,
        geo.country::varchar as geo_country,
        geo.city::varchar as geo_city,
        geo.metro::varchar as geo_metro,
        geo.region::varchar as geo_region,
        geo.sub_continent::varchar as geo_sub_continent,
        geo.locale::varchar as geo_locale,
        platform,
        project_id,
        traffic_source.name::varchar as traffic_source_name,
        traffic_source.medium::varchar as traffic_source_medium,
        traffic_source.source::varchar as traffic_source_source,
        user_first_touch_timestamp,
        user_id,
        user_pseudo_id,
        user_ltv,
        event_dimensions,
        ecommerce,
        items
      from
        app1.ods_events ods
      where
        event_date >= 'Sun Apr 30 2023 00:00:00 GMT+0000 (Coordinated Universal Time)'
        and event_date <= 'Fri Jun 30 2023 00:00:00 GMT+0000 (Coordinated Universal Time)'
        and event_name = '_screen_view'
        and platform = 'Android'
    ),
    mid_table as (
      select
        day::date as event_date,
        event_name,
        user_pseudo_id,
        event_id,
        event_timestamp,
        (
          select
            ep.value.string_value
          from
            base_data e,
            e.event_params ep
          where
            ep.key = '_session_id'
            and e.event_id = base.event_id
          limit
            1
        ) as session_id,
        (
          select
            ep.value.string_value
          from
            base_data e,
            e.event_params ep
          where
            ep.key = '_screen_name'
            and e.event_id = base.event_id
          limit
            1
        )::varchar as node
      from
        base_data base
      where
        node in (
          'NotepadActivity',
          'NotepadExportActivity',
          'NotepadShareActivity',
          'NotepadPrintActivity'
        )
    ),
    data as (
      select
        *,
        ROW_NUMBER() OVER (
          PARTITION BY
            user_pseudo_id,
            session_id
          ORDER BY
            event_timestamp asc
        ) as step_1,
        ROW_NUMBER() OVER (
          PARTITION BY
            user_pseudo_id,
            session_id
          ORDER BY
            event_timestamp asc
        ) + 1 as step_2
      from
        (
          select
            event_date,
            event_name,
            user_pseudo_id,
            event_id,
            event_timestamp,
            session_id,
            replace(node, '"', '') as node
          from
            mid_table
        ) t
    )
  select
    a.event_date as event_date,
    a.node || '_' || a.step_1 as source,
    CASE
      WHEN b.node is not null THEN b.node || '_' || a.step_2
      ELSE 'other_' || a.step_2
    END as target,
    count(distinct a.user_pseudo_id) as weight
  from
    data a
    left join data b on a.user_pseudo_id = b.user_pseudo_id
    and a.session_id = b.session_id
    and a.step_2 = b.step_1
  where
    a.step_2 <= 10
  group by
    a.event_date,
    a.node || '_' || a.step_1,
    CASE
      WHEN b.node is not null THEN b.node || '_' || a.step_2
      ELSE 'other_' || a.step_2
    END`;

    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));
  });

  test('retention view', () => {

    const sql = buildRetentionAnalysisView('app1', 'testview', {
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: 'add_button_click',
        },
        {
          eventName: 'note_share',
        },
        {
          eventName: 'note_export',
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      groupColumn: ExploreGroupColumn.DAY,
      timeStart: new Date('2023-06-19'),
      timeEnd: new Date('2023-06-22'),
      pairEventAndConditions: [
        {
          startEvent: {
            eventName: 'add_button_click',
          },
          backEvent: {
            eventName: 'note_share',
          },
        },
        {
          startEvent: {
            eventName: 'add_button_click',
          },
          backEvent: {
            eventName: 'note_export',
          },
        },
      ],

    });

    const expectResult = `CREATE OR REPLACE VIEW
    app1.testview AS
    with
    tmp_data as (
      select
        event_date,
        event_name,
        event_id,
        event_bundle_sequence_id::bigint as event_bundle_sequence_id,
        event_previous_timestamp::bigint as event_previous_timestamp,
        event_server_timestamp_offset::bigint as event_server_timestamp_offset,
        event_timestamp::bigint as event_timestamp,
        ingest_timestamp,
        event_value_in_usd,
        app_info.app_id::varchar as app_info_app_id,
        app_info.id::varchar as app_info_package_id,
        app_info.install_source::varchar as app_info_install_source,
        app_info.version::varchar as app_info_version,
        device.vendor_id::varchar as device_id,
        device.mobile_brand_name::varchar as device_mobile_brand_name,
        device.mobile_model_name::varchar as device_mobile_model_name,
        device.manufacturer::varchar as device_manufacturer,
        device.screen_width::bigint as device_screen_width,
        device.screen_height::bigint as device_screen_height,
        device.carrier::varchar as device_carrier,
        device.network_type::varchar as device_network_type,
        device.operating_system::varchar as device_operating_system,
        device.operating_system_version::varchar as device_operating_system_version,
        device.ua_browser::varchar as device_ua_browser,
        device.ua_browser_version::varchar as device_ua_browser_version,
        device.ua_os::varchar as device_ua_os,
        device.ua_os_version::varchar as device_ua_os_version,
        device.ua_device::varchar as device_ua_device,
        device.ua_device_category::varchar as device_ua_device_category,
        device.system_language::varchar as device_system_language,
        device.time_zone_offset_seconds::bigint as device_time_zone_offset_seconds,
        device.advertising_id::varchar as device_advertising_id,
        geo.continent::varchar as geo_continent,
        geo.country::varchar as geo_country,
        geo.city::varchar as geo_city,
        geo.metro::varchar as geo_metro,
        geo.region::varchar as geo_region,
        geo.sub_continent::varchar as geo_sub_continent,
        geo.locale::varchar as geo_locale,
        platform,
        project_id,
        traffic_source.name::varchar as traffic_source_name,
        traffic_source.medium::varchar as traffic_source_medium,
        traffic_source.source::varchar as traffic_source_source,
        user_first_touch_timestamp,
        user_id,
        user_pseudo_id,
        user_ltv,
        event_dimensions,
        ecommerce,
        items,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM'
        ) as month,
        TO_CHAR(
          date_trunc(
            'week',
            TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second'
          ),
          'YYYY-MM-DD'
        ) || ' - ' || TO_CHAR(
          date_trunc(
            'week',
            (
              TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second'
            ) + INTERVAL '6 days'
          ),
          'YYYY-MM-DD'
        ) as week,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD'
        ) as day,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD HH24'
        ) || '00:00' as hour,
        user_properties,
        event_params
      from
        app1.ods_events ods
      where
        event_date >= 'MonJun19202300:00:00GMT+0000(CoordinatedUniversalTime)'
        and event_date <= 'ThuJun22202300:00:00GMT+0000(CoordinatedUniversalTime)'
        and event_name in ('add_button_click', 'note_share', 'note_export')
    ),
    tmp_base_data as (
      select
        *
      from
        tmp_data base
    ),
    base_data as (
      select
        *
      from
        tmp_base_data
      where
        1 = 1
        and (
          (event_name = 'add_button_click')
          or (event_name = 'note_share')
          or (event_name = 'note_export')
        )
    ),
    data as (
      select
        event_date,
        event_name,
        user_pseudo_id
      from
        base_data
    ),
    first_date as (
      select
        min(event_date) as first_date
      from
        data
    ),
    date_list as (
      select
        '2023-06-20'::date as event_date
      union all
      select
        '2023-06-21'::date as event_date
      union all
      select
        '2023-06-22'::date as event_date
    ),
    first_table_0 as (
      select
        event_date,
        event_name,
        user_pseudo_id
      from
        data
        join first_date on data.event_date = first_date.first_date
      where
        data.event_name = 'add_button_click'
    ),
    second_table_0 as (
      select
        event_date,
        event_name,
        user_pseudo_id
      from
        data
        join first_date on data.event_date > first_date.first_date
      where
        data.event_name = 'note_share'
    ),
    first_table_1 as (
      select
        event_date,
        event_name,
        user_pseudo_id
      from
        data
        join first_date on data.event_date = first_date.first_date
      where
        data.event_name = 'add_button_click'
    ),
    second_table_1 as (
      select
        event_date,
        event_name,
        user_pseudo_id
      from
        data
        join first_date on data.event_date > first_date.first_date
      where
        data.event_name = 'note_export'
    ),
    result_table as (
      select
        first_table_0.event_name || '_' || 0 as grouping,
        first_table_0.event_date as start_event_date,
        first_table_0.user_pseudo_id as start_user_pseudo_id,
        date_list.event_date as event_date,
        second_table_0.user_pseudo_id as end_user_pseudo_id,
        second_table_0.event_date as end_event_date
      from
        first_table_0
        join date_list on 1 = 1
        left join second_table_0 on date_list.event_date = second_table_0.event_date
        and first_table_0.user_pseudo_id = second_table_0.user_pseudo_id
      union all
      select
        first_table_1.event_name || '_' || 1 as grouping,
        first_table_1.event_date as start_event_date,
        first_table_1.user_pseudo_id as start_user_pseudo_id,
        date_list.event_date as event_date,
        second_table_1.user_pseudo_id as end_user_pseudo_id,
        second_table_1.event_date as end_event_date
      from
        first_table_1
        join date_list on 1 = 1
        left join second_table_1 on date_list.event_date = second_table_1.event_date
        and first_table_1.user_pseudo_id = second_table_1.user_pseudo_id
    )
  select
    grouping,
    start_event_date,
    event_date,
    (
      count(distinct end_user_pseudo_id)::decimal / NULLIF(count(distinct start_user_pseudo_id), 0)
    )::decimal(20, 4) as retention
  from
    result_table
  group by
    grouping,
    start_event_date,
    event_date
  order by
    grouping,
    event_date`;

    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));

  });

  test('global condition and custom attribute', () => {

    const sql = buildFunnelDataSql('app1', 'testview', {
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      globalEventCondition: {
        conditions: [{
          category: 'other',
          property: 'platform',
          operator: '=',
          value: ['Android'],
          dataType: MetadataValueType.STRING,
        },
        {
          category: 'device',
          property: 'screen_height',
          operator: '<>',
          value: [1400],
          dataType: MetadataValueType.INTEGER,
        }],
        conditionOperator: 'or',
      },
      eventAndConditions: [
        {
          eventName: 'add_button_click',
          sqlCondition: {
            conditions: [
              {
                category: 'event',
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: 'user',
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
            ],
            conditionOperator: 'and',
          },
        },
        {
          eventName: 'note_share',
          sqlCondition: {
            conditions: [
              {
                category: 'event',
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: 'geo',
                property: 'city',
                operator: '=',
                value: ['Shanghai'],
                dataType: MetadataValueType.STRING,
              },
            ],
            conditionOperator: 'and',
          },
        },
        {
          eventName: 'note_export',
          sqlCondition: {
            conditions: [
              {
                category: 'device',
                property: 'mobile_brand_name',
                operator: '=',
                value: ['Samsung'],
                dataType: MetadataValueType.STRING,
              },
            ],
            conditionOperator: 'and',
          },
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-04-30'),
      timeEnd: new Date('2023-06-30'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`CREATE OR REPLACE VIEW
    app1.testview AS
  with
    tmp_data as (
      select
        event_date,
        event_name,
        event_id,
        event_bundle_sequence_id::bigint as event_bundle_sequence_id,
        event_previous_timestamp::bigint as event_previous_timestamp,
        event_server_timestamp_offset::bigint as event_server_timestamp_offset,
        event_timestamp::bigint as event_timestamp,
        ingest_timestamp,
        event_value_in_usd,
        app_info.app_id::varchar as app_info_app_id,
        app_info.id::varchar as app_info_package_id,
        app_info.install_source::varchar as app_info_install_source,
        app_info.version::varchar as app_info_version,
        device.vendor_id::varchar as device_id,
        device.mobile_brand_name::varchar as device_mobile_brand_name,
        device.mobile_model_name::varchar as device_mobile_model_name,
        device.manufacturer::varchar as device_manufacturer,
        device.screen_width::bigint as device_screen_width,
        device.screen_height::bigint as device_screen_height,
        device.carrier::varchar as device_carrier,
        device.network_type::varchar as device_network_type,
        device.operating_system::varchar as device_operating_system,
        device.operating_system_version::varchar as device_operating_system_version,
        device.ua_browser::varchar as device_ua_browser,
        device.ua_browser_version::varchar as device_ua_browser_version,
        device.ua_os::varchar as device_ua_os,
        device.ua_os_version::varchar as device_ua_os_version,
        device.ua_device::varchar as device_ua_device,
        device.ua_device_category::varchar as device_ua_device_category,
        device.system_language::varchar as device_system_language,
        device.time_zone_offset_seconds::bigint as device_time_zone_offset_seconds,
        device.advertising_id::varchar as device_advertising_id,
        geo.continent::varchar as geo_continent,
        geo.country::varchar as geo_country,
        geo.city::varchar as geo_city,
        geo.metro::varchar as geo_metro,
        geo.region::varchar as geo_region,
        geo.sub_continent::varchar as geo_sub_continent,
        geo.locale::varchar as geo_locale,
        platform,
        project_id,
        traffic_source.name::varchar as traffic_source_name,
        traffic_source.medium::varchar as traffic_source_medium,
        traffic_source.source::varchar as traffic_source_source,
        user_first_touch_timestamp,
        user_id,
        user_pseudo_id,
        user_ltv,
        event_dimensions,
        ecommerce,
        items,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM'
        ) as month,
        TO_CHAR(
          date_trunc(
            'week',
            TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second'
          ),
          'YYYY-MM-DD'
        ) || ' - ' || TO_CHAR(
          date_trunc(
            'week',
            (
              TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second'
            ) + INTERVAL '6 days'
          ),
          'YYYY-MM-DD'
        ) as week,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD'
        ) as day,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD HH24'
        ) || '00:00' as hour,
        user_properties,
        event_params
      from
        app1.ods_events ods
      where
        event_date >= 'Sun Apr 30 2023 00:00:00 GMT+0000 (Coordinated Universal Time)'
        and event_date <= 'Fri Jun 30 2023 00:00:00 GMT+0000 (Coordinated Universal Time)'
        and event_name in ('add_button_click', 'note_share', 'note_export')
        and (
          platform = 'Android'
          or device_screen_height <> 1400
        )
    ),
    tmp_base_data as (
      select
        *,
        (
          select
            ep.value.int_value
          from
            tmp_data e,
            e.event_params ep
          where
            ep.key = '_session_duration'
            and e.event_id = base.event_id
          limit
            1
        ) as event__session_duration,
        (
          select
            up.value.int_value
          from
            tmp_data e,
            e.user_properties up
          where
            up.key = '_user_first_touch_timestamp'
            and e.event_id = base.event_id
          limit
            1
        ) as user__user_first_touch_timestamp
      from
        tmp_data base
    ),
    base_data as (
      select
        *
      from
        tmp_base_data
      where
        1 = 1
        and (
          (
            event_name = 'add_button_click'
            and (
              event__session_duration > 200
              and user__user_first_touch_timestamp > 1686532526770
            )
          )
          or (
            event_name = 'note_share'
            and (geo_city = 'Shanghai')
            and (event__session_duration > 200)
          )
          or (
            event_name = 'note_export'
            and (device_mobile_brand_name = 'Samsung')
          )
        )
    ),
    table_0 as (
      select
        month,
        week,
        day,
        hour,
        event_date as event_date_0,
        event_name as event_name_0,
        event_id as event_id_0,
        event_bundle_sequence_id as event_bundle_sequence_id_0,
        event_previous_timestamp as event_previous_timestamp_0,
        event_server_timestamp_offset as event_server_timestamp_offset_0,
        event_timestamp as event_timestamp_0,
        ingest_timestamp as ingest_timestamp_0,
        event_value_in_usd as event_value_in_usd_0,
        app_info_app_id as app_info_app_id_0,
        app_info_package_id as app_info_package_id_0,
        app_info_install_source as app_info_install_source_0,
        app_info_version as app_info_version_0,
        device_id as device_id_0,
        device_mobile_brand_name as device_mobile_brand_name_0,
        device_mobile_model_name as device_mobile_model_name_0,
        device_manufacturer as device_manufacturer_0,
        device_screen_width as device_screen_width_0,
        device_screen_height as device_screen_height_0,
        device_carrier as device_carrier_0,
        device_network_type as device_network_type_0,
        device_operating_system as device_operating_system_0,
        device_operating_system_version as device_operating_system_version_0,
        device_ua_browser as ua_browser_0,
        device_ua_browser_version as ua_browser_version_0,
        device_ua_os as ua_os_0,
        device_ua_os_version as ua_os_version_0,
        device_ua_device as ua_device_0,
        device_ua_device_category as ua_device_category_0,
        device_system_language as device_system_language_0,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_0,
        device_advertising_id as advertising_id_0,
        geo_continent as geo_continent_0,
        geo_country as geo_country_0,
        geo_city as geo_city_0,
        geo_metro as geo_metro_0,
        geo_region as geo_region_0,
        geo_sub_continent as geo_sub_continent_0,
        geo_locale as geo_locale_0,
        platform as platform_0,
        project_id as project_id_0,
        traffic_source_name as traffic_source_name_0,
        traffic_source_medium as traffic_source_medium_0,
        traffic_source_source as traffic_source_source_0,
        user_first_touch_timestamp as user_first_touch_timestamp_0,
        user_id as user_id_0,
        user_pseudo_id as user_pseudo_id_0,
        user_ltv as user_ltv_0,
        event_dimensions as event_dimensions_0,
        ecommerce as ecommerce_0,
        items as items_0
      from
        base_data base
      where
        event_name = 'add_button_click'
    ),
    table_1 as (
      select
        event_date as event_date_1,
        event_name as event_name_1,
        event_id as event_id_1,
        event_bundle_sequence_id as event_bundle_sequence_id_1,
        event_previous_timestamp as event_previous_timestamp_1,
        event_server_timestamp_offset as event_server_timestamp_offset_1,
        event_timestamp as event_timestamp_1,
        ingest_timestamp as ingest_timestamp_1,
        event_value_in_usd as event_value_in_usd_1,
        app_info_app_id as app_info_app_id_1,
        app_info_package_id as app_info_package_id_1,
        app_info_install_source as app_info_install_source_1,
        app_info_version as app_info_version_1,
        device_id as device_id_1,
        device_mobile_brand_name as device_mobile_brand_name_1,
        device_mobile_model_name as device_mobile_model_name_1,
        device_manufacturer as device_manufacturer_1,
        device_screen_width as device_screen_width_1,
        device_screen_height as device_screen_height_1,
        device_carrier as device_carrier_1,
        device_network_type as device_network_type_1,
        device_operating_system as device_operating_system_1,
        device_operating_system_version as device_operating_system_version_1,
        device_ua_browser as ua_browser_1,
        device_ua_browser_version as ua_browser_version_1,
        device_ua_os as ua_os_1,
        device_ua_os_version as ua_os_version_1,
        device_ua_device as ua_device_1,
        device_ua_device_category as ua_device_category_1,
        device_system_language as device_system_language_1,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_1,
        device_advertising_id as advertising_id_1,
        geo_continent as geo_continent_1,
        geo_country as geo_country_1,
        geo_city as geo_city_1,
        geo_metro as geo_metro_1,
        geo_region as geo_region_1,
        geo_sub_continent as geo_sub_continent_1,
        geo_locale as geo_locale_1,
        platform as platform_1,
        project_id as project_id_1,
        traffic_source_name as traffic_source_name_1,
        traffic_source_medium as traffic_source_medium_1,
        traffic_source_source as traffic_source_source_1,
        user_first_touch_timestamp as user_first_touch_timestamp_1,
        user_id as user_id_1,
        user_pseudo_id as user_pseudo_id_1,
        user_ltv as user_ltv_1,
        event_dimensions as event_dimensions_1,
        ecommerce as ecommerce_1,
        items as items_1
      from
        base_data base
      where
        event_name = 'note_share'
    ),
    table_2 as (
      select
        event_date as event_date_2,
        event_name as event_name_2,
        event_id as event_id_2,
        event_bundle_sequence_id as event_bundle_sequence_id_2,
        event_previous_timestamp as event_previous_timestamp_2,
        event_server_timestamp_offset as event_server_timestamp_offset_2,
        event_timestamp as event_timestamp_2,
        ingest_timestamp as ingest_timestamp_2,
        event_value_in_usd as event_value_in_usd_2,
        app_info_app_id as app_info_app_id_2,
        app_info_package_id as app_info_package_id_2,
        app_info_install_source as app_info_install_source_2,
        app_info_version as app_info_version_2,
        device_id as device_id_2,
        device_mobile_brand_name as device_mobile_brand_name_2,
        device_mobile_model_name as device_mobile_model_name_2,
        device_manufacturer as device_manufacturer_2,
        device_screen_width as device_screen_width_2,
        device_screen_height as device_screen_height_2,
        device_carrier as device_carrier_2,
        device_network_type as device_network_type_2,
        device_operating_system as device_operating_system_2,
        device_operating_system_version as device_operating_system_version_2,
        device_ua_browser as ua_browser_2,
        device_ua_browser_version as ua_browser_version_2,
        device_ua_os as ua_os_2,
        device_ua_os_version as ua_os_version_2,
        device_ua_device as ua_device_2,
        device_ua_device_category as ua_device_category_2,
        device_system_language as device_system_language_2,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_2,
        device_advertising_id as advertising_id_2,
        geo_continent as geo_continent_2,
        geo_country as geo_country_2,
        geo_city as geo_city_2,
        geo_metro as geo_metro_2,
        geo_region as geo_region_2,
        geo_sub_continent as geo_sub_continent_2,
        geo_locale as geo_locale_2,
        platform as platform_2,
        project_id as project_id_2,
        traffic_source_name as traffic_source_name_2,
        traffic_source_medium as traffic_source_medium_2,
        traffic_source_source as traffic_source_source_2,
        user_first_touch_timestamp as user_first_touch_timestamp_2,
        user_id as user_id_2,
        user_pseudo_id as user_pseudo_id_2,
        user_ltv as user_ltv_2,
        event_dimensions as event_dimensions_2,
        ecommerce as ecommerce_2,
        items as items_2
      from
        base_data base
      where
        event_name = 'note_export'
    ),
    join_table as (
      select
        table_0.*,
        table_1.event_id_1,
        table_1.event_name_1,
        table_1.user_pseudo_id_1,
        table_1.event_timestamp_1,
        table_2.event_id_2,
        table_2.event_name_2,
        table_2.user_pseudo_id_2,
        table_2.event_timestamp_2
      from
        table_0
        left outer join table_1 on table_0.user_pseudo_id_0 = table_1.user_pseudo_id_1
        and table_1.event_timestamp_1 - table_0.event_timestamp_0 > 0
        and table_1.event_timestamp_1 - table_0.event_timestamp_0 < 600 * 1000
        left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
        and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
        and table_2.event_timestamp_2 - table_1.event_timestamp_1 < 600 * 1000
    )
  select
    DAY,
    count(distinct user_pseudo_id_0) as add_button_click,
    (
      count(distinct user_pseudo_id_2)::decimal / NULLIF(count(distinct user_pseudo_id_0), 0)
    )::decimal(20, 4) as rate,
    count(distinct user_pseudo_id_1) as note_share,
    (
      count(distinct user_pseudo_id_1)::decimal / NULLIF(count(distinct user_pseudo_id_0), 0)
    )::decimal(20, 4) as note_share_rate,
    count(distinct user_pseudo_id_2) as note_export,
    (
      count(distinct user_pseudo_id_2)::decimal / NULLIF(count(distinct user_pseudo_id_1), 0)
    )::decimal(20, 4) as note_export_rate
  from
    join_table
  group by
    DAY
  `.trim().replace(/ /g, ''),
    );

  });

  test('comput method - real user id', () => {

    const sql = buildFunnelDataSql('app1', 'testview', {
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      globalEventCondition: {
        conditions: [{
          category: 'other',
          property: 'platform',
          operator: '=',
          value: ['Android'],
          dataType: MetadataValueType.STRING,
        },
        {
          category: 'other',
          property: 'platform',
          operator: ExploreAnalyticsOperators.IN,
          value: ['Android', 'iOS'],
          dataType: MetadataValueType.STRING,
        },
        {
          category: 'other',
          property: 'platform',
          operator: ExploreAnalyticsOperators.NOT_CONTAINS,
          value: ['Web', 'WebchatMP'],
          dataType: MetadataValueType.STRING,
        },
        {
          category: 'other',
          property: 'platform',
          operator: ExploreAnalyticsOperators.NOT_IN,
          value: ['Web', 'WebchatMP'],
          dataType: MetadataValueType.STRING,
        },
        {
          category: 'device',
          property: 'screen_height',
          operator: '<>',
          value: [1400],
          dataType: MetadataValueType.INTEGER,
        }],
        conditionOperator: 'or',
      },
      eventAndConditions: [
        {
          eventName: 'add_button_click',
          sqlCondition: {
            conditions: [
              {
                category: 'event',
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: 'event',
                property: '_session_duration',
                operator: ExploreAnalyticsOperators.GREATER_THAN_OR_EQUAL,
                value: [250],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: 'user',
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: 'user',
                property: '_user_first_touch_timestamp',
                operator: ExploreAnalyticsOperators.NOT_NULL,
                value: [],
                dataType: MetadataValueType.INTEGER,
              },
            ],
            conditionOperator: 'and',
          },
        },
        {
          eventName: 'note_share',
          sqlCondition: {
            conditions: [
              {
                category: 'event',
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: 'geo',
                property: 'city',
                operator: '=',
                value: ['Shanghai'],
                dataType: MetadataValueType.STRING,
              },
            ],
            conditionOperator: 'and',
          },
        },
        {
          eventName: 'note_export',
          sqlCondition: {
            conditions: [
              {
                category: 'device',
                property: 'mobile_brand_name',
                operator: '=',
                value: ['Samsung'],
                dataType: MetadataValueType.STRING,
              },
            ],
            conditionOperator: 'and',
          },
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-04-30'),
      timeEnd: new Date('2023-06-30'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    console.log(sql);

    expect(sql.trim().replace(/ /g, '')).toEqual(`CREATE OR REPLACE VIEW
    app1.testview AS
  with
    tmp_data as (
      select
        event_date,
        event_name,
        event_id,
        event_bundle_sequence_id::bigint as event_bundle_sequence_id,
        event_previous_timestamp::bigint as event_previous_timestamp,
        event_server_timestamp_offset::bigint as event_server_timestamp_offset,
        event_timestamp::bigint as event_timestamp,
        ingest_timestamp,
        event_value_in_usd,
        app_info.app_id::varchar as app_info_app_id,
        app_info.id::varchar as app_info_package_id,
        app_info.install_source::varchar as app_info_install_source,
        app_info.version::varchar as app_info_version,
        device.vendor_id::varchar as device_id,
        device.mobile_brand_name::varchar as device_mobile_brand_name,
        device.mobile_model_name::varchar as device_mobile_model_name,
        device.manufacturer::varchar as device_manufacturer,
        device.screen_width::bigint as device_screen_width,
        device.screen_height::bigint as device_screen_height,
        device.carrier::varchar as device_carrier,
        device.network_type::varchar as device_network_type,
        device.operating_system::varchar as device_operating_system,
        device.operating_system_version::varchar as device_operating_system_version,
        device.ua_browser::varchar as device_ua_browser,
        device.ua_browser_version::varchar as device_ua_browser_version,
        device.ua_os::varchar as device_ua_os,
        device.ua_os_version::varchar as device_ua_os_version,
        device.ua_device::varchar as device_ua_device,
        device.ua_device_category::varchar as device_ua_device_category,
        device.system_language::varchar as device_system_language,
        device.time_zone_offset_seconds::bigint as device_time_zone_offset_seconds,
        device.advertising_id::varchar as device_advertising_id,
        geo.continent::varchar as geo_continent,
        geo.country::varchar as geo_country,
        geo.city::varchar as geo_city,
        geo.metro::varchar as geo_metro,
        geo.region::varchar as geo_region,
        geo.sub_continent::varchar as geo_sub_continent,
        geo.locale::varchar as geo_locale,
        platform,
        project_id,
        traffic_source.name::varchar as traffic_source_name,
        traffic_source.medium::varchar as traffic_source_medium,
        traffic_source.source::varchar as traffic_source_source,
        user_first_touch_timestamp,
        user_id,
        COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
        user_ltv,
        event_dimensions,
        ecommerce,
        items,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM'
        ) as month,
        TO_CHAR(
          date_trunc(
            'week',
            TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second'
          ),
          'YYYY-MM-DD'
        ) || ' - ' || TO_CHAR(
          date_trunc(
            'week',
            (
              TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second'
            ) + INTERVAL '6 days'
          ),
          'YYYY-MM-DD'
        ) as week,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD'
        ) as day,
        TO_CHAR(
          TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD HH24'
        ) || '00:00' as hour,
        user_properties,
        event_params
      from
        app1.ods_events ods
      where
        event_date >= 'Sun Apr 30 2023 00:00:00 GMT+0000 (Coordinated Universal Time)'
        and event_date <= 'Fri Jun 30 2023 00:00:00 GMT+0000 (Coordinated Universal Time)'
        and event_name in ('add_button_click', 'note_share', 'note_export')
        and (
          platform = 'Android'
          or platform in ('Android', 'iOS')
          or platform not like '%Web%'
          or platform not in ('Web', 'WebchatMP')
          or device_screen_height <> 1400
        )
    ),
    tmp_base_data as (
      select
        *,
        (
          select
            ep.value.int_value
          from
            tmp_data e,
            e.event_params ep
          where
            ep.key = '_session_duration'
            and e.event_id = base.event_id
          limit
            1
        ) as event__session_duration,
        (
          select
            up.value.int_value
          from
            tmp_data e,
            e.user_properties up
          where
            up.key = '_user_first_touch_timestamp'
            and e.event_id = base.event_id
          limit
            1
        ) as user__user_first_touch_timestamp
      from
        tmp_data base
    ),
    base_data as (
      select
        *
      from
        tmp_base_data
      where
        1 = 1
        and (
          (
            event_name = 'add_button_click'
            and (
              event__session_duration > 200
              and event__session_duration >= 250
              and user__user_first_touch_timestamp > 1686532526770
              and user__user_first_touch_timestamp is not null
            )
          )
          or (
            event_name = 'note_share'
            and (geo_city = 'Shanghai')
            and (event__session_duration > 200)
          )
          or (
            event_name = 'note_export'
            and (device_mobile_brand_name = 'Samsung')
          )
        )
    ),
    table_0 as (
      select
        month,
        week,
        day,
        hour,
        event_date as event_date_0,
        event_name as event_name_0,
        event_id as event_id_0,
        event_bundle_sequence_id as event_bundle_sequence_id_0,
        event_previous_timestamp as event_previous_timestamp_0,
        event_server_timestamp_offset as event_server_timestamp_offset_0,
        event_timestamp as event_timestamp_0,
        ingest_timestamp as ingest_timestamp_0,
        event_value_in_usd as event_value_in_usd_0,
        app_info_app_id as app_info_app_id_0,
        app_info_package_id as app_info_package_id_0,
        app_info_install_source as app_info_install_source_0,
        app_info_version as app_info_version_0,
        device_id as device_id_0,
        device_mobile_brand_name as device_mobile_brand_name_0,
        device_mobile_model_name as device_mobile_model_name_0,
        device_manufacturer as device_manufacturer_0,
        device_screen_width as device_screen_width_0,
        device_screen_height as device_screen_height_0,
        device_carrier as device_carrier_0,
        device_network_type as device_network_type_0,
        device_operating_system as device_operating_system_0,
        device_operating_system_version as device_operating_system_version_0,
        device_ua_browser as ua_browser_0,
        device_ua_browser_version as ua_browser_version_0,
        device_ua_os as ua_os_0,
        device_ua_os_version as ua_os_version_0,
        device_ua_device as ua_device_0,
        device_ua_device_category as ua_device_category_0,
        device_system_language as device_system_language_0,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_0,
        device_advertising_id as advertising_id_0,
        geo_continent as geo_continent_0,
        geo_country as geo_country_0,
        geo_city as geo_city_0,
        geo_metro as geo_metro_0,
        geo_region as geo_region_0,
        geo_sub_continent as geo_sub_continent_0,
        geo_locale as geo_locale_0,
        platform as platform_0,
        project_id as project_id_0,
        traffic_source_name as traffic_source_name_0,
        traffic_source_medium as traffic_source_medium_0,
        traffic_source_source as traffic_source_source_0,
        user_first_touch_timestamp as user_first_touch_timestamp_0,
        user_id as user_id_0,
        COALESCE(user_id, user_pseudo_id) as user_pseudo_id_0,
        user_ltv as user_ltv_0,
        event_dimensions as event_dimensions_0,
        ecommerce as ecommerce_0,
        items as items_0
      from
        base_data base
      where
        event_name = 'add_button_click'
    ),
    table_1 as (
      select
        event_date as event_date_1,
        event_name as event_name_1,
        event_id as event_id_1,
        event_bundle_sequence_id as event_bundle_sequence_id_1,
        event_previous_timestamp as event_previous_timestamp_1,
        event_server_timestamp_offset as event_server_timestamp_offset_1,
        event_timestamp as event_timestamp_1,
        ingest_timestamp as ingest_timestamp_1,
        event_value_in_usd as event_value_in_usd_1,
        app_info_app_id as app_info_app_id_1,
        app_info_package_id as app_info_package_id_1,
        app_info_install_source as app_info_install_source_1,
        app_info_version as app_info_version_1,
        device_id as device_id_1,
        device_mobile_brand_name as device_mobile_brand_name_1,
        device_mobile_model_name as device_mobile_model_name_1,
        device_manufacturer as device_manufacturer_1,
        device_screen_width as device_screen_width_1,
        device_screen_height as device_screen_height_1,
        device_carrier as device_carrier_1,
        device_network_type as device_network_type_1,
        device_operating_system as device_operating_system_1,
        device_operating_system_version as device_operating_system_version_1,
        device_ua_browser as ua_browser_1,
        device_ua_browser_version as ua_browser_version_1,
        device_ua_os as ua_os_1,
        device_ua_os_version as ua_os_version_1,
        device_ua_device as ua_device_1,
        device_ua_device_category as ua_device_category_1,
        device_system_language as device_system_language_1,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_1,
        device_advertising_id as advertising_id_1,
        geo_continent as geo_continent_1,
        geo_country as geo_country_1,
        geo_city as geo_city_1,
        geo_metro as geo_metro_1,
        geo_region as geo_region_1,
        geo_sub_continent as geo_sub_continent_1,
        geo_locale as geo_locale_1,
        platform as platform_1,
        project_id as project_id_1,
        traffic_source_name as traffic_source_name_1,
        traffic_source_medium as traffic_source_medium_1,
        traffic_source_source as traffic_source_source_1,
        user_first_touch_timestamp as user_first_touch_timestamp_1,
        user_id as user_id_1,
        COALESCE(user_id, user_pseudo_id) as user_pseudo_id_1,
        user_ltv as user_ltv_1,
        event_dimensions as event_dimensions_1,
        ecommerce as ecommerce_1,
        items as items_1
      from
        base_data base
      where
        event_name = 'note_share'
    ),
    table_2 as (
      select
        event_date as event_date_2,
        event_name as event_name_2,
        event_id as event_id_2,
        event_bundle_sequence_id as event_bundle_sequence_id_2,
        event_previous_timestamp as event_previous_timestamp_2,
        event_server_timestamp_offset as event_server_timestamp_offset_2,
        event_timestamp as event_timestamp_2,
        ingest_timestamp as ingest_timestamp_2,
        event_value_in_usd as event_value_in_usd_2,
        app_info_app_id as app_info_app_id_2,
        app_info_package_id as app_info_package_id_2,
        app_info_install_source as app_info_install_source_2,
        app_info_version as app_info_version_2,
        device_id as device_id_2,
        device_mobile_brand_name as device_mobile_brand_name_2,
        device_mobile_model_name as device_mobile_model_name_2,
        device_manufacturer as device_manufacturer_2,
        device_screen_width as device_screen_width_2,
        device_screen_height as device_screen_height_2,
        device_carrier as device_carrier_2,
        device_network_type as device_network_type_2,
        device_operating_system as device_operating_system_2,
        device_operating_system_version as device_operating_system_version_2,
        device_ua_browser as ua_browser_2,
        device_ua_browser_version as ua_browser_version_2,
        device_ua_os as ua_os_2,
        device_ua_os_version as ua_os_version_2,
        device_ua_device as ua_device_2,
        device_ua_device_category as ua_device_category_2,
        device_system_language as device_system_language_2,
        device_time_zone_offset_seconds as device_time_zone_offset_seconds_2,
        device_advertising_id as advertising_id_2,
        geo_continent as geo_continent_2,
        geo_country as geo_country_2,
        geo_city as geo_city_2,
        geo_metro as geo_metro_2,
        geo_region as geo_region_2,
        geo_sub_continent as geo_sub_continent_2,
        geo_locale as geo_locale_2,
        platform as platform_2,
        project_id as project_id_2,
        traffic_source_name as traffic_source_name_2,
        traffic_source_medium as traffic_source_medium_2,
        traffic_source_source as traffic_source_source_2,
        user_first_touch_timestamp as user_first_touch_timestamp_2,
        user_id as user_id_2,
        COALESCE(user_id, user_pseudo_id) as user_pseudo_id_2,
        user_ltv as user_ltv_2,
        event_dimensions as event_dimensions_2,
        ecommerce as ecommerce_2,
        items as items_2
      from
        base_data base
      where
        event_name = 'note_export'
    ),
    join_table as (
      select
        table_0.*,
        table_1.event_id_1,
        table_1.event_name_1,
        table_1.user_pseudo_id_1,
        table_1.event_timestamp_1,
        table_2.event_id_2,
        table_2.event_name_2,
        table_2.user_pseudo_id_2,
        table_2.event_timestamp_2
      from
        table_0
        left outer join table_1 on table_0.user_pseudo_id_0 = table_1.user_pseudo_id_1
        and table_1.event_timestamp_1 - table_0.event_timestamp_0 > 0
        and table_1.event_timestamp_1 - table_0.event_timestamp_0 < 600 * 1000
        left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
        and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
        and table_2.event_timestamp_2 - table_1.event_timestamp_1 < 600 * 1000
    )
  select
    DAY,
    count(distinct user_pseudo_id_0) as add_button_click,
    (
      count(distinct user_pseudo_id_2)::decimal / NULLIF(count(distinct user_pseudo_id_0), 0)
    )::decimal(20, 4) as rate,
    count(distinct user_pseudo_id_1) as note_share,
    (
      count(distinct user_pseudo_id_1)::decimal / NULLIF(count(distinct user_pseudo_id_0), 0)
    )::decimal(20, 4) as note_share_rate,
    count(distinct user_pseudo_id_2) as note_export,
    (
      count(distinct user_pseudo_id_2)::decimal / NULLIF(count(distinct user_pseudo_id_1), 0)
    )::decimal(20, 4) as note_export_rate
  from
    join_table
  group by
    DAY
  `.trim().replace(/ /g, ''),
    );

  });

});