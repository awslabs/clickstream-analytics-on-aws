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

import { ConditionCategory, ExploreComputeMethod, ExploreConversionIntervalType, ExploreGroupColumn, ExplorePathNodeType, ExplorePathSessionDef, ExploreTimeScopeType, MetadataPlatform, MetadataValueType } from '../../common/explore-types';
import { buildFunnelTableView, buildFunnelView, buildEventPathAnalysisView, buildNodePathAnalysisView, buildEventAnalysisView, buildRetentionAnalysisView, ExploreAnalyticsOperators, _buildCommonPartSql } from '../../service/quicksight/sql-builder';

describe('SQL Builder test', () => {

  beforeEach(() => {
  });

  test('funnel sql - user_cnt', () => {

    const sql = buildFunnelTableView({
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
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('22023-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      base_data as (
        select
          event_base.*
        from
          (
            select
              event.event_date,
              event.event_name,
              event.event_id,
              event_bundle_sequence_id::bigint as event_bundle_sequence_id,
              event_previous_timestamp::bigint as event_previous_timestamp,
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
              device.viewport_height::bigint as device_viewport_height,
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
              COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
              event.user_id,
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
              ) || '00:00' as hour
            from
              app1.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '22023-10-10'
              and event.event_name in ('add_button_click', 'note_share', 'note_export')
          ) as event_base
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
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0
        from
          base_data base
        where
          event_name = 'add_button_click'
      ),
      table_1 as (
        select
          event_date as event_date_1,
          event_name as event_name_1,
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1
        from
          base_data base
        where
          event_name = 'note_share'
      ),
      table_2 as (
        select
          event_date as event_date_2,
          event_name as event_name_2,
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2
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
    `.trim().replace(/ /g, ''));

  });

  test('funnel sql - event_cnt', () => {

    const sql = buildFunnelTableView({
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
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('22023-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(
      `
      with
      base_data as (
        select
          event_base.*
        from
          (
            select
              event.event_date,
              event.event_name,
              event.event_id,
              event_bundle_sequence_id::bigint as event_bundle_sequence_id,
              event_previous_timestamp::bigint as event_previous_timestamp,
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
              device.viewport_height::bigint as device_viewport_height,
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
              COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
              event.user_id,
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
              ) || '00:00' as hour
            from
              app1.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '22023-10-10'
              and event.event_name in ('add_button_click', 'note_share', 'note_export')
          ) as event_base
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
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0
        from
          base_data base
        where
          event_name = 'add_button_click'
      ),
      table_1 as (
        select
          event_date as event_date_1,
          event_name as event_name_1,
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1
        from
          base_data base
        where
          event_name = 'note_share'
      ),
      table_2 as (
        select
          event_date as event_date_2,
          event_name as event_name_2,
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2
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

    const sql = buildFunnelTableView({
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
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('22023-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      base_data as (
        select
          event_base.*
        from
          (
            select
              event.event_date,
              event.event_name,
              event.event_id,
              event_bundle_sequence_id::bigint as event_bundle_sequence_id,
              event_previous_timestamp::bigint as event_previous_timestamp,
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
              device.viewport_height::bigint as device_viewport_height,
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
              COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
              event.user_id,
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
              ) || '00:00' as hour
            from
              app1.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '22023-10-10'
              and event.event_name in ('add_button_click', 'note_share', 'note_export')
          ) as event_base
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
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0
        from
          base_data base
        where
          event_name = 'add_button_click'
      ),
      table_1 as (
        select
          event_date as event_date_1,
          event_name as event_name_1,
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1
        from
          base_data base
        where
          event_name = 'note_share'
      ),
      table_2 as (
        select
          event_date as event_date_2,
          event_name as event_name_2,
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2
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

    const sql = buildFunnelTableView({
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
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('22023-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      base_data as (
        select
          event_base.*
        from
          (
            select
              event.event_date,
              event.event_name,
              event.event_id,
              event_bundle_sequence_id::bigint as event_bundle_sequence_id,
              event_previous_timestamp::bigint as event_previous_timestamp,
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
              device.viewport_height::bigint as device_viewport_height,
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
              COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
              event.user_id,
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
              ) || '00:00' as hour
            from
              app1.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '22023-10-10'
              and event.event_name in ('add_button_click', 'note_share', 'note_export')
          ) as event_base
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
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0
        from
          base_data base
        where
          event_name = 'add_button_click'
      ),
      table_1 as (
        select
          event_date as event_date_1,
          event_name as event_name_1,
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1
        from
          base_data base
        where
          event_name = 'note_share'
      ),
      table_2 as (
        select
          event_date as event_date_2,
          event_name as event_name_2,
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2
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

  test('funnel table visual sql - conditions', () => {

    const sql = buildFunnelTableView( {
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
              category: ConditionCategory.OTHER,
              property: 'platform',
              operator: '=',
              value: ['Android'],
              dataType: MetadataValueType.STRING,
            },
            {
              category: ConditionCategory.DEVICE,
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
              category: ConditionCategory.OTHER,
              property: 'platform',
              operator: '=',
              value: ['Android'],
              dataType: MetadataValueType.STRING,
            },
            {
              category: ConditionCategory.DEVICE,
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
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('22023-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      base_data as (
        select
          event_base.*
        from
          (
            select
              event.event_date,
              event.event_name,
              event.event_id,
              event_bundle_sequence_id::bigint as event_bundle_sequence_id,
              event_previous_timestamp::bigint as event_previous_timestamp,
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
              device.viewport_height::bigint as device_viewport_height,
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
              COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
              event.user_id,
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
              ) || '00:00' as hour
            from
              app1.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '22023-10-10'
              and event.event_name in ('add_button_click', 'note_share', 'note_export')
          ) as event_base
        where
          1 = 1
          and (
            (
              event_name = 'add_button_click'
              and (
                platform = 'Android'
                and device_screen_height <> 1400
              )
            )
            or (
              event_name = 'note_share'
              and (
                platform = 'Android'
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
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0
        from
          base_data base
        where
          event_name = 'add_button_click'
      ),
      table_1 as (
        select
          event_date as event_date_1,
          event_name as event_name_1,
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1
        from
          base_data base
        where
          event_name = 'note_share'
      ),
      table_2 as (
        select
          event_date as event_date_2,
          event_name as event_name_2,
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2
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

    const sql = buildFunnelView({
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
              category: ConditionCategory.OTHER,
              property: 'platform',
              operator: '=',
              value: ['Android'],
              dataType: MetadataValueType.STRING,
            },
            {
              category: ConditionCategory.DEVICE,
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
              category: ConditionCategory.OTHER,
              property: 'platform',
              operator: '=',
              value: ['Android'],
              dataType: MetadataValueType.STRING,
            },
            {
              category: ConditionCategory.DEVICE,
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
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('22023-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      base_data as (
        select
          event_base.*
        from
          (
            select
              event.event_date,
              event.event_name,
              event.event_id,
              event_bundle_sequence_id::bigint as event_bundle_sequence_id,
              event_previous_timestamp::bigint as event_previous_timestamp,
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
              device.viewport_height::bigint as device_viewport_height,
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
              COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
              event.user_id,
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
              ) || '00:00' as hour
            from
              app1.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '22023-10-10'
              and event.event_name in ('add_button_click', 'note_share', 'note_export')
          ) as event_base
        where
          1 = 1
          and (
            (
              event_name = 'add_button_click'
              and (
                platform = 'Android'
                and device_screen_height <> 1400
              )
            )
            or (
              event_name = 'note_share'
              and (
                platform = 'Android'
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
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0
        from
          base_data base
        where
          event_name = 'add_button_click'
      ),
      table_1 as (
        select
          event_date as event_date_1,
          event_name as event_name_1,
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1
        from
          base_data base
        where
          event_name = 'note_share'
      ),
      table_2 as (
        select
          event_date as event_date_2,
          event_name as event_name_2,
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2
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

    const sql = buildEventAnalysisView({
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: false,
      eventAndConditions: [
        {
          eventName: 'add_button_click',
          computeMethod: ExploreComputeMethod.USER_CNT,
        },
        {
          eventName: 'note_share',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'note_export',
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('22023-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      base_data as (
        select
          event_base.*
        from
          (
            select
              event.event_date,
              event.event_name,
              event.event_id,
              event_bundle_sequence_id::bigint as event_bundle_sequence_id,
              event_previous_timestamp::bigint as event_previous_timestamp,
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
              device.viewport_height::bigint as device_viewport_height,
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
              COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
              event.user_id,
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
              ) || '00:00' as hour
            from
              app1.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '22023-10-10'
              and event.event_name in ('add_button_click', 'note_share', 'note_export')
          ) as event_base
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
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0
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
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1
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
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2
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
          table_0.event_name_0 as event_name,
          table_0.event_timestamp_0 as event_timestamp,
          table_0.user_pseudo_id_0 as x_id
        from
          table_0
        union all
        select
          table_1.month,
          table_1.week,
          table_1.day,
          table_1.hour,
          table_1.event_name_1 as event_name,
          table_1.event_timestamp_1 as event_timestamp,
          table_1.event_id_1 as x_id
        from
          table_1
        union all
        select
          table_2.month,
          table_2.week,
          table_2.day,
          table_2.hour,
          table_2.event_name_2 as event_name,
          table_2.event_timestamp_2 as event_timestamp,
          table_2.event_id_2 as x_id
        from
          table_2
      )
    select
      day::date as event_date,
      event_name,
      x_id as count
    from
      join_table
    where
      x_id is not null
    group by
      day,
      event_name,
      x_id
  `.trim().replace(/ /g, ''),
    );

  });

  test('event path analysis view', () => {

    const sql = buildEventPathAnalysisView({
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
              category: ConditionCategory.OTHER,
              property: 'platform',
              operator: '=',
              value: ['Android'],
              dataType: MetadataValueType.STRING,
            },
            {
              category: ConditionCategory.DEVICE,
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
              category: ConditionCategory.OTHER,
              property: 'platform',
              operator: '=',
              value: ['Android'],
              dataType: MetadataValueType.STRING,
            },
            {
              category: ConditionCategory.DEVICE,
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
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('22023-10-10'),
      pathAnalysis: {
        sessionType: ExplorePathSessionDef.SESSION,
        nodeType: ExplorePathNodeType.EVENT,
        lagSeconds: 3600,
      },
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '22023-10-10'
          and event.event_name not in (
            '_session_start',
            '_session_stop',
            '_screen_view',
            '_app_exception',
            '_app_update',
            '_first_open',
            '_os_update',
            '_user_engagement',
            '_profile_set',
            '_page_view',
            '_app_start',
            '_scroll',
            '_search',
            '_click',
            '_clickstream_error',
            '_mp_share',
            '_mp_favorite',
            '_app_end'
          )
      ),
      base_data as (
        select
          _session_id,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = '_session_id' then event_param_string_value
                  else null
                end
              ) as _session_id
            from
              event_base
              join app1.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
        where
          1 = 1
          and (
            (
              event_name = 'add_button_click'
              and (
                platform = 'Android'
                and device_screen_height <> 1400
              )
            )
            or (
              event_name = 'note_share'
              and (
                platform = 'Android'
                or device_screen_height <> 1400
              )
            )
            or (event_name = 'note_export')
            or (
              event_name not in ('add_button_click', 'note_share', 'note_export')
            )
          )
      ),
      mid_table as (
        select
          CASE
            WHEN event_name in ('add_button_click', 'note_share', 'note_export') THEN event_name
            ELSE 'other'
          END as event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          _session_id
        from
          base_data
      ),
      data as (
        select
          *,
          ROW_NUMBER() OVER (
            PARTITION BY
              _session_id
            ORDER BY
              event_timestamp asc
          ) as step_1,
          ROW_NUMBER() OVER (
            PARTITION BY
              _session_id
            ORDER BY
              event_timestamp asc
          ) + 1 as step_2
        from
          mid_table
      ),
      step_table_1 as (
        select
          data.user_pseudo_id user_pseudo_id,
          data._session_id _session_id,
          min(step_1) min_step
        from
          data
        where
          event_name in ('add_button_click', 'note_share', 'note_export')
        group by
          user_pseudo_id,
          _session_id
      ),
      step_table_2 as (
        select
          data.*
        from
          data
          join step_table_1 on data.user_pseudo_id = step_table_1.user_pseudo_id
          and data._session_id = step_table_1._session_id
          and data.step_1 >= step_table_1.min_step
      ),
      data_final as (
        select
          event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          _session_id,
          ROW_NUMBER() OVER (
            PARTITION BY
              _session_id
            ORDER BY
              step_1 asc,
              step_2
          ) as step_1,
          ROW_NUMBER() OVER (
            PARTITION BY
              _session_id
            ORDER BY
              step_1 asc,
              step_2
          ) + 1 as step_2
        from
          step_table_2
      )
    select
      a.event_name || '_' || a.step_1 as source,
      CASE
        WHEN b.event_name is not null THEN b.event_name || '_' || a.step_2
        ELSE 'lost'
      END as target,
      a.user_pseudo_id as x_id
    from
      data_final a
      left join data_final b on a.step_2 = b.step_1
      and a._session_id = b._session_id
      and a.user_pseudo_id = b.user_pseudo_id
    where
      a.step_2 <= 10
  `.trim().replace(/ /g, ''),
    );

  });

  test('event path analysis view - sessionType=customize', () => {

    const sql = buildEventPathAnalysisView({
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
              category: ConditionCategory.OTHER,
              property: 'platform',
              operator: '=',
              value: ['Android'],
              dataType: MetadataValueType.STRING,
            },
            {
              category: ConditionCategory.DEVICE,
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
              category: ConditionCategory.OTHER,
              property: 'platform',
              operator: '=',
              value: ['Android'],
              dataType: MetadataValueType.STRING,
            },
            {
              category: ConditionCategory.DEVICE,
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
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('22023-10-10'),
      pathAnalysis: {
        sessionType: ExplorePathSessionDef.CUSTOMIZE,
        nodeType: ExplorePathNodeType.EVENT,
        lagSeconds: 3600,
      },
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      base_data as (
        select
          event_base.*
        from
          (
            select
              event.event_date,
              event.event_name,
              event.event_id,
              event_bundle_sequence_id::bigint as event_bundle_sequence_id,
              event_previous_timestamp::bigint as event_previous_timestamp,
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
              device.viewport_height::bigint as device_viewport_height,
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
              COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
              event.user_id,
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
              ) || '00:00' as hour
            from
              app1.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '22023-10-10'
              and event.event_name not in (
                '_session_start',
                '_session_stop',
                '_screen_view',
                '_app_exception',
                '_app_update',
                '_first_open',
                '_os_update',
                '_user_engagement',
                '_profile_set',
                '_page_view',
                '_app_start',
                '_scroll',
                '_search',
                '_click',
                '_clickstream_error',
                '_mp_share',
                '_mp_favorite',
                '_app_end'
              )
          ) as event_base
        where
          1 = 1
          and (
            (
              event_name = 'add_button_click'
              and (
                platform = 'Android'
                and device_screen_height <> 1400
              )
            )
            or (
              event_name = 'note_share'
              and (
                platform = 'Android'
                or device_screen_height <> 1400
              )
            )
            or (event_name = 'note_export')
            or (
              event_name not in ('add_button_click', 'note_share', 'note_export')
            )
          )
      ),
      mid_table as (
        select
          CASE
            WHEN event_name in ('add_button_click', 'note_share', 'note_export') THEN event_name
            ELSE 'other'
          END as event_name,
          user_pseudo_id,
          event_id,
          event_timestamp
        from
          base_data base
      ),
      data_1 as (
        select
          *,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id
            ORDER BY
              event_timestamp asc
          ) as step_1,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id
            ORDER BY
              event_timestamp asc
          ) + 1 as step_2
        from
          mid_table
      ),
      data_2 as (
        select
          a.event_name,
          a.user_pseudo_id,
          a.event_id,
          a.event_timestamp,
          case
            when (
              b.event_timestamp - a.event_timestamp < 3600000
              and b.event_timestamp - a.event_timestamp >= 0
            ) then 0
            else 1
          end as group_start
        from
          data_1 a
          left join data_1 b on a.user_pseudo_id = b.user_pseudo_id
          and a.step_2 = b.step_1
      ),
      data_3 AS (
        SELECT
          *,
          SUM(group_start) over (
            order by
              user_pseudo_id,
              event_timestamp ROWS BETWEEN UNBOUNDED PRECEDING
              AND CURRENT ROW
          ) AS group_id
        FROM
          data_2
      ),
      data as (
        select
          event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          group_id,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              group_id
            ORDER BY
              event_timestamp asc
          ) as step_1,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              group_id
            ORDER BY
              event_timestamp asc
          ) + 1 as step_2
        from
          data_3
      ),
      step_table_1 as (
        select
          data.user_pseudo_id user_pseudo_id,
          group_id,
          min(step_1) min_step
        from
          data
        where
          event_name in ('add_button_click', 'note_share', 'note_export')
        group by
          user_pseudo_id,
          group_id
      ),
      step_table_2 as (
        select
          data.*
        from
          data
          join step_table_1 on data.user_pseudo_id = step_table_1.user_pseudo_id
          and data.group_id = step_table_1.group_id
          and data.step_1 >= step_table_1.min_step
      ),
      data_final as (
        select
          event_name,
          user_pseudo_id,
          event_id,
          group_id,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              group_id
            ORDER BY
              step_1 asc,
              step_2
          ) as step_1,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              group_id
            ORDER BY
              step_1 asc,
              step_2
          ) + 1 as step_2
        from
          step_table_2
      )
    select
      a.event_name || '_' || a.step_1 as source,
      CASE
        WHEN b.event_name is not null THEN b.event_name || '_' || a.step_2
        ELSE 'lost'
      END as target,
      a.user_pseudo_id as x_id
    from
      data_final a
      left join data_final b on a.step_2 = b.step_1
      and a.group_id = b.group_id
      and a.user_pseudo_id = b.user_pseudo_id
    where
      a.step_2 <= 10
  `.trim().replace(/ /g, ''),
    );

  });

  test('node path analysis view', () => {

    const sql = buildNodePathAnalysisView({
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      timeScopeType: ExploreTimeScopeType.FIXED,
      groupColumn: ExploreGroupColumn.DAY,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('22023-10-10'),
      pathAnalysis: {
        platform: MetadataPlatform.ANDROID,
        sessionType: ExplorePathSessionDef.SESSION,
        nodeType: ExplorePathNodeType.SCREEN_NAME,
        lagSeconds: 3600,
        nodes: ['NotepadActivity', 'NotepadExportActivity', 'NotepadShareActivity', 'NotepadPrintActivity'],
      },
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '22023-10-10'
          and event.event_name = '_screen_view'
          and platform = 'Android'
      ),
      base_data as (
        select
          _session_id,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = '_session_id' then event_param_string_value
                  else null
                end
              ) as _session_id
            from
              event_base
              join app1.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
        where
          1 = 1
      ),
      mid_table_1 as (
        select
          event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          _session_id
        from
          base_data
      ),
      mid_table_2 as (
        select
          base_data.event_timestamp,
          base_data.event_id,
          max(event_param.event_param_string_value) as node
        from
          base_data
          join app1.event_parameter as event_param on base_data.event_timestamp = event_param.event_timestamp
          and base_data.event_id = event_param.event_id
        where
          event_param.event_param_key = '_screen_name'
        group by
          1,
          2
      ),
      mid_table as (
        select
          mid_table_1.*,
          mid_table_2.node
        from
          mid_table_1
          join mid_table_2 on mid_table_1.event_id = mid_table_2.event_id
      ),
      data as (
        select
          event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          _session_id,
          case
            when node in (
              'NotepadActivity',
              'NotepadExportActivity',
              'NotepadShareActivity',
              'NotepadPrintActivity'
            ) then node
            else 'other'
          end as node,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              _session_id
            ORDER BY
              event_timestamp asc
          ) as step_1,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              _session_id
            ORDER BY
              event_timestamp asc
          ) + 1 as step_2
        from
          mid_table
      ),
      step_table_1 as (
        select
          user_pseudo_id,
          _session_id,
          min(step_1) min_step
        from
          data
        where
          node in (
            'NotepadActivity',
            'NotepadExportActivity',
            'NotepadShareActivity',
            'NotepadPrintActivity'
          )
        group by
          user_pseudo_id,
          _session_id
      ),
      step_table_2 as (
        select
          data.*
        from
          data
          join step_table_1 on data.user_pseudo_id = step_table_1.user_pseudo_id
          and data._session_id = step_table_1._session_id
          and data.step_1 >= step_table_1.min_step
      ),
      data_final as (
        select
          event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          _session_id,
          node,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              _session_id
            ORDER BY
              step_1 asc,
              step_2
          ) as step_1,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              _session_id
            ORDER BY
              step_1 asc,
              step_2
          ) + 1 as step_2
        from
          step_table_2
      )
    select
      a.node || '_' || a.step_1 as source,
      CASE
        WHEN b.node is not null THEN b.node || '_' || a.step_2
        ELSE 'lost'
      END as target,
      a.user_pseudo_id as x_id
    from
      data_final a
      left join data_final b on a.user_pseudo_id = b.user_pseudo_id
      and a._session_id = b._session_id
      and a.step_2 = b.step_1
    where
      a.step_2 <= 10
  `.trim().replace(/ /g, ''),
    );
  });

  test('node path analysis view - sessionType=customize ', () => {

    const sql = buildNodePathAnalysisView({
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: false,
      timeScopeType: ExploreTimeScopeType.FIXED,
      groupColumn: ExploreGroupColumn.DAY,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('22023-10-10'),
      pathAnalysis: {
        platform: MetadataPlatform.ANDROID,
        sessionType: ExplorePathSessionDef.CUSTOMIZE,
        nodeType: ExplorePathNodeType.SCREEN_NAME,
        lagSeconds: 3600,
        nodes: ['NotepadActivity', 'NotepadExportActivity', 'NotepadShareActivity', 'NotepadPrintActivity'],
      },
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      base_data as (
        select
          event_base.*
        from
          (
            select
              event.event_date,
              event.event_name,
              event.event_id,
              event_bundle_sequence_id::bigint as event_bundle_sequence_id,
              event_previous_timestamp::bigint as event_previous_timestamp,
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
              device.viewport_height::bigint as device_viewport_height,
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
              COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
              event.user_id,
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
              ) || '00:00' as hour
            from
              app1.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '22023-10-10'
              and event.event_name = '_screen_view'
              and platform = 'Android'
          ) as event_base
        where
          1 = 1
      ),
      mid_table_1 as (
        select
          event_name,
          user_pseudo_id,
          event_id,
          event_timestamp
        from
          base_data
      ),
      mid_table_2 as (
        select
          base_data.event_timestamp,
          base_data.event_id,
          max(event_param.event_param_string_value) as node
        from
          base_data
          join app1.event_parameter as event_param on base_data.event_timestamp = event_param.event_timestamp
          and base_data.event_id = event_param.event_id
        where
          event_param.event_param_key = '_screen_name'
        group by
          1,
          2
      ),
      mid_table as (
        select
          mid_table_1.*,
          mid_table_2.node
        from
          mid_table_1
          join mid_table_2 on mid_table_1.event_id = mid_table_2.event_id
      ),
      data_1 as (
        select
          user_pseudo_id,
          event_id,
          event_timestamp,
          case
            when node in (
              'NotepadActivity',
              'NotepadExportActivity',
              'NotepadShareActivity',
              'NotepadPrintActivity'
            ) then node
            else 'other'
          end as node,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id
            ORDER BY
              event_timestamp asc
          ) as step_1,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id
            ORDER BY
              event_timestamp asc
          ) + 1 as step_2
        from
          mid_table
      ),
      data_2 as (
        select
          a.node,
          a.user_pseudo_id,
          a.event_id,
          a.event_timestamp,
          case
            when (
              b.event_timestamp - a.event_timestamp < 3600000
              and b.event_timestamp - a.event_timestamp >= 0
            ) then 0
            else 1
          end as group_start
        from
          data_1 a
          left join data_1 b on a.user_pseudo_id = b.user_pseudo_id
          and a.step_2 = b.step_1
      ),
      data_3 AS (
        select
          *,
          SUM(group_start) over (
            order by
              user_pseudo_id,
              event_timestamp ROWS BETWEEN UNBOUNDED PRECEDING
              AND CURRENT ROW
          ) AS group_id
        from
          data_2
      ),
      data as (
        select
          node,
          user_pseudo_id,
          event_id,
          event_timestamp,
          group_id,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              group_id
            ORDER BY
              event_timestamp asc
          ) as step_1,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              group_id
            ORDER BY
              event_timestamp asc
          ) + 1 as step_2
        from
          data_3
      ),
      step_table_1 as (
        select
          data.user_pseudo_id user_pseudo_id,
          group_id,
          min(step_1) min_step
        from
          data
        where
          node in (
            'NotepadActivity',
            'NotepadExportActivity',
            'NotepadShareActivity',
            'NotepadPrintActivity'
          )
        group by
          user_pseudo_id,
          group_id
      ),
      step_table_2 as (
        select
          data.*
        from
          data
          join step_table_1 on data.user_pseudo_id = step_table_1.user_pseudo_id
          and data.group_id = step_table_1.group_id
          and data.step_1 >= step_table_1.min_step
      ),
      data_final as (
        select
          node,
          user_pseudo_id,
          event_id,
          group_id,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              group_id
            ORDER BY
              step_1 asc,
              step_2
          ) as step_1,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              group_id
            ORDER BY
              step_1 asc,
              step_2
          ) + 1 as step_2
        from
          step_table_2
      )
    select
      a.node || '_' || a.step_1 as source,
      CASE
        WHEN b.node is not null THEN b.node || '_' || a.step_2
        ELSE 'lost'
      END as target,
      a.user_pseudo_id as x_id
    from
      data_final a
      left join data_final b on a.user_pseudo_id = b.user_pseudo_id
      and a.group_id = b.group_id
      and a.step_2 = b.step_1
    where
      a.step_2 <= 10
  `.trim().replace(/ /g, ''),
    );
  });

  test('retention view', () => {

    const sql = buildRetentionAnalysisView({
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      globalEventCondition: {
        conditions: [{
          category: ConditionCategory.OTHER,
          property: 'platform',
          operator: '=',
          value: ['Android'],
          dataType: MetadataValueType.STRING,
        },
        {
          category: ConditionCategory.DEVICE,
          property: 'screen_height',
          operator: '<>',
          value: [1400],
          dataType: MetadataValueType.INTEGER,
        }],
        conditionOperator: 'and',
      },
      timeScopeType: ExploreTimeScopeType.FIXED,
      groupColumn: ExploreGroupColumn.DAY,
      timeStart: new Date('2023-06-19'),
      timeEnd: new Date('2023-06-22'),
      pairEventAndConditions: [
        {
          startEvent: {
            eventName: 'add_button_click',
            sqlCondition: {
              conditions: [
                {
                  category: ConditionCategory.DEVICE,
                  property: 'screen_height',
                  operator: '>',
                  value: [1400],
                  dataType: MetadataValueType.INTEGER,
                },
                {
                  category: ConditionCategory.DEVICE,
                  property: 'screen_height',
                  operator: '>',
                  value: [1800],
                  dataType: MetadataValueType.INTEGER,
                },
              ],
              conditionOperator: 'or',
            },
          },
          backEvent: {
            eventName: 'note_share',
            sqlCondition: {
              conditions: [
                {
                  category: ConditionCategory.DEVICE,
                  property: 'screen_height',
                  operator: '>',
                  value: [1400],
                  dataType: MetadataValueType.INTEGER,
                },
              ],
              conditionOperator: 'or',
            },
          },
        },
        {
          startEvent: {
            eventName: 'add_button_click',
          },
          backEvent: {
            eventName: 'note_export',
            sqlCondition: {
              conditions: [
                {
                  category: ConditionCategory.DEVICE,
                  property: 'screen_height',
                  operator: '>',
                  value: [1400],
                  dataType: MetadataValueType.INTEGER,
                },
              ],
              conditionOperator: 'or',
            },
          },
        },
      ],

    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      base_data as (
        select
          event_base.*
        from
          (
            select
              event.event_date,
              event.event_name,
              event.event_id,
              event_bundle_sequence_id::bigint as event_bundle_sequence_id,
              event_previous_timestamp::bigint as event_previous_timestamp,
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
              device.viewport_height::bigint as device_viewport_height,
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
              COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
              event.user_id,
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
              ) || '00:00' as hour
            from
              app1.event as event
            where
              event.event_date >= date '2023-06-19'
              and event.event_date <= date '2023-06-22'
              and event.event_name in ('add_button_click', 'note_share', 'note_export')
          ) as event_base
        where
          1 = 1
          and (
            platform = 'Android'
            and device_screen_height <> 1400
          )
      ),
      first_date as (
        select
          min(event_date) as first_date
        from
          base_data
      ),
      date_list as (
        select
          '2023-06-19'::date as event_date
        union all
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
          base_data
          join first_date on base_data.event_date = first_date.first_date
        where
          event_name = 'add_button_click'
          and (
            device_screen_height > 1400
            or device_screen_height > 1800
          )
      ),
      second_table_0 as (
        select
          event_date,
          event_name,
          user_pseudo_id
        from
          base_data
          join first_date on base_data.event_date >= first_date.first_date
        where
          event_name = 'note_share'
          and (device_screen_height > 1400)
      ),
      first_table_1 as (
        select
          event_date,
          event_name,
          user_pseudo_id
        from
          base_data
          join first_date on base_data.event_date = first_date.first_date
        where
          event_name = 'add_button_click'
      ),
      second_table_1 as (
        select
          event_date,
          event_name,
          user_pseudo_id
        from
          base_data
          join first_date on base_data.event_date >= first_date.first_date
        where
          event_name = 'note_export'
          and (device_screen_height > 1400)
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
    ,
      grouping,
      start_event_date,
      event_date
    order by
      grouping,
      event_date
  `.trim().replace(/ /g, ''),
    );

  });

  test('retention view - join column', () => {

    const sql = buildRetentionAnalysisView({
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      globalEventCondition: {
        conditions: [{
          category: ConditionCategory.OTHER,
          property: 'platform',
          operator: '=',
          value: ['Android'],
          dataType: MetadataValueType.STRING,
        },
        {
          category: ConditionCategory.DEVICE,
          property: 'screen_height',
          operator: '<>',
          value: [1400],
          dataType: MetadataValueType.INTEGER,
        }],
        conditionOperator: 'and',
      },
      timeScopeType: ExploreTimeScopeType.FIXED,
      groupColumn: ExploreGroupColumn.DAY,
      timeStart: new Date('2023-06-19'),
      timeEnd: new Date('2023-06-22'),
      pairEventAndConditions: [
        {
          startEvent: {
            eventName: 'add_button_click',
            sqlCondition: {
              conditions: [
                {
                  category: ConditionCategory.DEVICE,
                  property: 'screen_height',
                  operator: '>',
                  value: [1400],
                  dataType: MetadataValueType.INTEGER,
                },
              ],
              conditionOperator: 'or',
            },
            retentionJoinColumn: {
              category: ConditionCategory.DEVICE,
              property: 'screen_height',
              dataType: MetadataValueType.STRING,
            },
          },
          backEvent: {
            eventName: 'note_share',
            sqlCondition: {
              conditions: [
                {
                  category: ConditionCategory.DEVICE,
                  property: 'screen_height',
                  operator: '>',
                  value: [1400],
                  dataType: MetadataValueType.INTEGER,
                },
              ],
              conditionOperator: 'or',
            },
            retentionJoinColumn: {
              category: ConditionCategory.DEVICE,
              property: 'screen_height',
              dataType: MetadataValueType.INTEGER,
            },
          },
        },
        {
          startEvent: {
            eventName: 'add_button_click',
          },
          backEvent: {
            eventName: 'note_export',
            sqlCondition: {
              conditions: [
                {
                  category: ConditionCategory.DEVICE,
                  property: 'screen_height',
                  operator: '>',
                  value: [1400],
                  dataType: MetadataValueType.INTEGER,
                },
              ],
              conditionOperator: 'or',
            },
          },
        },
      ],

    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      base_data as (
        select
          event_base.*
        from
          (
            select
              event.event_date,
              event.event_name,
              event.event_id,
              event_bundle_sequence_id::bigint as event_bundle_sequence_id,
              event_previous_timestamp::bigint as event_previous_timestamp,
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
              device.viewport_height::bigint as device_viewport_height,
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
              COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
              event.user_id,
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
              ) || '00:00' as hour
            from
              app1.event as event
            where
              event.event_date >= date '2023-06-19'
              and event.event_date <= date '2023-06-22'
              and event.event_name in ('add_button_click', 'note_share', 'note_export')
          ) as event_base
        where
          1 = 1
          and (
            platform = 'Android'
            and device_screen_height <> 1400
          )
      ),
      first_date as (
        select
          min(event_date) as first_date
        from
          base_data
      ),
      date_list as (
        select
          '2023-06-19'::date as event_date
        union all
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
          device_screen_height,
          user_pseudo_id
        from
          base_data
          join first_date on base_data.event_date = first_date.first_date
        where
          event_name = 'add_button_click'
          and (device_screen_height > 1400)
      ),
      second_table_0 as (
        select
          event_date,
          event_name,
          device_screen_height,
          user_pseudo_id
        from
          base_data
          join first_date on base_data.event_date >= first_date.first_date
        where
          event_name = 'note_share'
          and (device_screen_height > 1400)
      ),
      first_table_1 as (
        select
          event_date,
          event_name,
          user_pseudo_id
        from
          base_data
          join first_date on base_data.event_date = first_date.first_date
        where
          event_name = 'add_button_click'
      ),
      second_table_1 as (
        select
          event_date,
          event_name,
          user_pseudo_id
        from
          base_data
          join first_date on base_data.event_date >= first_date.first_date
        where
          event_name = 'note_export'
          and (device_screen_height > 1400)
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
          and first_table_0.device_screen_height = second_table_0.device_screen_height
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
    ,
      grouping,
      start_event_date,
      event_date
    order by
      grouping,
      event_date
  `.trim().replace(/ /g, ''),
    );

  });

  test('global condition and custom attribute', () => {

    const sql = buildFunnelTableView({
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      globalEventCondition: {
        conditions: [{
          category: ConditionCategory.OTHER,
          property: 'platform',
          operator: '=',
          value: ['Android'],
          dataType: MetadataValueType.STRING,
        },
        {
          category: ConditionCategory.DEVICE,
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
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER,
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
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.GEO,
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
                category: ConditionCategory.DEVICE,
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
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('22023-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id,
          user_first_touch_timestamp,
          _first_visit_date,
          _first_referer,
          _first_traffic_source_type,
          _first_traffic_medium,
          _first_traffic_source,
          _channel,
          user_properties.key::varchar as user_param_key,
          user_properties.value.string_value::varchar as user_param_string_value,
          user_properties.value.int_value::bigint as user_param_int_value,
          user_properties.value.float_value::double precision as user_param_float_value,
          user_properties.value.double_value::double precision as user_param_double_value
        from
          app1.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '22023-10-10'
          and event.event_name in ('add_button_click', 'note_share', 'note_export')
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          _session_duration,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = '_session_duration' then event_param_int_value
                  else null
                end
              ) as _session_duration
            from
              event_base
              join app1.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = '_user_first_touch_timestamp' then user_param_int_value
                  else null
                end
              ) as _user_first_touch_timestamp
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
          and (
            platform = 'Android'
            or device_screen_height <> 1400
          )
          and (
            (
              event_name = 'add_button_click'
              and (
                _session_duration > 200
                and _user_first_touch_timestamp > 1686532526770
              )
            )
            or (
              event_name = 'note_share'
              and (
                _session_duration > 200
                and geo_city = 'Shanghai'
              )
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
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0
        from
          base_data base
        where
          event_name = 'add_button_click'
      ),
      table_1 as (
        select
          event_date as event_date_1,
          event_name as event_name_1,
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1
        from
          base_data base
        where
          event_name = 'note_share'
      ),
      table_2 as (
        select
          event_date as event_date_2,
          event_name as event_name_2,
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2
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

  test('compute method - real user id', () => {

    const sql = buildFunnelTableView( {
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      globalEventCondition: {
        conditions: [{
          category: ConditionCategory.OTHER,
          property: 'platform',
          operator: '=',
          value: ['Android'],
          dataType: MetadataValueType.STRING,
        },
        {
          category: ConditionCategory.OTHER,
          property: 'platform',
          operator: ExploreAnalyticsOperators.IN,
          value: ['Android', 'iOS'],
          dataType: MetadataValueType.STRING,
        },
        {
          category: ConditionCategory.OTHER,
          property: 'platform',
          operator: ExploreAnalyticsOperators.NOT_CONTAINS,
          value: ['Web', 'WebchatMP'],
          dataType: MetadataValueType.STRING,
        },
        {
          category: ConditionCategory.OTHER,
          property: 'platform',
          operator: ExploreAnalyticsOperators.NOT_IN,
          value: ['Web', 'WebchatMP'],
          dataType: MetadataValueType.STRING,
        },
        {
          category: ConditionCategory.DEVICE,
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
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: ExploreAnalyticsOperators.GREATER_THAN_OR_EQUAL,
                value: [250],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER,
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
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.GEO,
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
                category: ConditionCategory.DEVICE,
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
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('22023-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id,
          user_first_touch_timestamp,
          _first_visit_date,
          _first_referer,
          _first_traffic_source_type,
          _first_traffic_medium,
          _first_traffic_source,
          _channel,
          user_properties.key::varchar as user_param_key,
          user_properties.value.string_value::varchar as user_param_string_value,
          user_properties.value.int_value::bigint as user_param_int_value,
          user_properties.value.float_value::double precision as user_param_float_value,
          user_properties.value.double_value::double precision as user_param_double_value
        from
          app1.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '22023-10-10'
          and event.event_name in ('add_button_click', 'note_share', 'note_export')
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          _session_duration,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = '_session_duration' then event_param_int_value
                  else null
                end
              ) as _session_duration
            from
              event_base
              join app1.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = '_user_first_touch_timestamp' then user_param_int_value
                  else null
                end
              ) as _user_first_touch_timestamp
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
          and (
            platform = 'Android'
            or platform in ('Android', 'iOS')
            or platform not like '%Web%'
            or platform not in ('Web', 'WebchatMP')
            or device_screen_height <> 1400
          )
          and (
            (
              event_name = 'add_button_click'
              and (
                _session_duration > 200
                and _session_duration >= 250
                and _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp is not null
              )
            )
            or (
              event_name = 'note_share'
              and (
                _session_duration > 200
                and geo_city = 'Shanghai'
              )
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
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0
        from
          base_data base
        where
          event_name = 'add_button_click'
      ),
      table_1 as (
        select
          event_date as event_date_1,
          event_name as event_name_1,
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1
        from
          base_data base
        where
          event_name = 'note_share'
      ),
      table_2 as (
        select
          event_date as event_date_2,
          event_name as event_name_2,
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2
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

  test('_buildCommonPartSql - global condition - two user condition', () => {

    const sql = _buildCommonPartSql(['add_button_click', 'note_share', 'note_export'],
      {
        schemaName: 'app1',
        computeMethod: ExploreComputeMethod.USER_CNT,
        specifyJoinColumn: true,
        joinColumn: 'user_pseudo_id',
        conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
        conversionIntervalInSeconds: 10*60,
        globalEventCondition: {
          conditions: [
            {
              category: ConditionCategory.USER,
              property: '_user_first_touch_timestamp',
              operator: '>',
              value: [1686532526770],
              dataType: MetadataValueType.INTEGER,
            },
            {
              category: ConditionCategory.USER,
              property: '_user_first_touch_timestamp',
              operator: '>',
              value: [1686532526780],
              dataType: MetadataValueType.INTEGER,
            },
          ],
        },
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
        timeStart: new Date('2023-10-01'),
        timeEnd: new Date('22023-10-10'),
        groupColumn: ExploreGroupColumn.DAY,
      }, false);

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id,
          user_first_touch_timestamp,
          _first_visit_date,
          _first_referer,
          _first_traffic_source_type,
          _first_traffic_medium,
          _first_traffic_source,
          _channel,
          user_properties.key::varchar as user_param_key,
          user_properties.value.string_value::varchar as user_param_string_value,
          user_properties.value.int_value::bigint as user_param_int_value,
          user_properties.value.float_value::double precision as user_param_float_value,
          user_properties.value.double_value::double precision as user_param_double_value
        from
          app1.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '22023-10-10'
          and event.event_name in ('add_button_click', 'note_share', 'note_export')
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          event_base.*
        from
          event_base
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = '_user_first_touch_timestamp' then user_param_int_value
                  else null
                end
              ) as _user_first_touch_timestamp
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
          and (
            _user_first_touch_timestamp > 1686532526770
            and _user_first_touch_timestamp > 1686532526780
          )
          and (
            (event_name = 'add_button_click')
            or (event_name = 'note_share')
            or (event_name = 'note_export')
          )
      ),
  `.trim().replace(/ /g, ''),
    );

  });

  test('_buildCommonPartSql - event condition - two event condition', () => {

    const sql = _buildCommonPartSql(['add_button_click', 'note_share', 'note_export'],
      {
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
              conditionOperator: 'and',
              conditions: [
                {
                  category: ConditionCategory.OTHER,
                  property: 'platform',
                  operator: '=',
                  value: ['Android'],
                  dataType: MetadataValueType.STRING,
                },
                {
                  category: ConditionCategory.GEO,
                  property: 'country',
                  operator: '=',
                  value: ['China'],
                  dataType: MetadataValueType.STRING,
                },
                {
                  category: ConditionCategory.EVENT,
                  property: '_session_duration',
                  operator: '>',
                  value: [200],
                  dataType: MetadataValueType.INTEGER,
                },
                {
                  category: ConditionCategory.EVENT,
                  property: '_session_duration',
                  operator: '>',
                  value: [220],
                  dataType: MetadataValueType.INTEGER,
                },
              ],
            },
          },
          {
            eventName: 'note_share',
          },
          {
            eventName: 'note_export',
          },
        ],
        timeScopeType: ExploreTimeScopeType.FIXED,
        timeStart: new Date('2023-10-01'),
        timeEnd: new Date('22023-10-10'),
        groupColumn: ExploreGroupColumn.DAY,
      },
      false);

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '22023-10-10'
          and event.event_name in ('add_button_click', 'note_share', 'note_export')
      ),
      base_data as (
        select
          _session_duration,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = '_session_duration' then event_param_int_value
                  else null
                end
              ) as _session_duration
            from
              event_base
              join app1.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
        where
          1 = 1
          and (
            (
              event_name = 'add_button_click'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _session_duration > 200
                and _session_duration > 220
              )
            )
            or (event_name = 'note_share')
            or (event_name = 'note_export')
          )
      ),
  `.trim().replace(/ /g, ''),
    );

  });

  test('buildFunnelView', () => {

    const sql = buildFunnelView({
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      globalEventCondition: {
        conditions: [
          {
            category: ConditionCategory.OTHER,
            property: 'platform',
            operator: '=',
            value: ['Android'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.GEO,
            property: 'country',
            operator: '=',
            value: ['China'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526770],
            dataType: MetadataValueType.INTEGER,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526780],
            dataType: MetadataValueType.INTEGER,
          },
        ],
      },
      eventAndConditions: [
        {
          eventName: 'add_button_click',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526780],
                dataType: MetadataValueType.INTEGER,
              },
            ],
          },
        },
        {
          eventName: 'note_share',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'note_export',
          computeMethod: ExploreComputeMethod.USER_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
            ],
          },
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('22023-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id,
          user_first_touch_timestamp,
          _first_visit_date,
          _first_referer,
          _first_traffic_source_type,
          _first_traffic_medium,
          _first_traffic_source,
          _channel,
          user_properties.key::varchar as user_param_key,
          user_properties.value.string_value::varchar as user_param_string_value,
          user_properties.value.int_value::bigint as user_param_int_value,
          user_properties.value.float_value::double precision as user_param_float_value,
          user_properties.value.double_value::double precision as user_param_double_value
        from
          app1.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '22023-10-10'
          and event.event_name in ('add_button_click', 'note_share', 'note_export')
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          _session_duration,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = '_session_duration' then event_param_int_value
                  else null
                end
              ) as _session_duration
            from
              event_base
              join app1.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = '_user_first_touch_timestamp' then user_param_int_value
                  else null
                end
              ) as _user_first_touch_timestamp
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _user_first_touch_timestamp > 1686532526780
          )
          and (
            (
              event_name = 'add_button_click'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp > 1686532526780
              )
            )
            or (event_name = 'note_share')
            or (
              event_name = 'note_export'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _session_duration > 200
              )
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
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0
        from
          base_data base
        where
          event_name = 'add_button_click'
      ),
      table_1 as (
        select
          event_date as event_date_1,
          event_name as event_name_1,
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1
        from
          base_data base
        where
          event_name = 'note_share'
      ),
      table_2 as (
        select
          event_date as event_date_2,
          event_name as event_name_2,
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2
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

  test('buildFunnelTableView', () => {

    const sql = buildFunnelTableView({
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      globalEventCondition: {
        conditions: [
          {
            category: ConditionCategory.OTHER,
            property: 'platform',
            operator: '=',
            value: ['Android'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.GEO,
            property: 'country',
            operator: '=',
            value: ['China'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526770],
            dataType: MetadataValueType.INTEGER,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526780],
            dataType: MetadataValueType.INTEGER,
          },
        ],
      },
      eventAndConditions: [
        {
          eventName: 'add_button_click',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526780],
                dataType: MetadataValueType.INTEGER,
              },
            ],
          },
        },
        {
          eventName: 'note_share',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'note_export',
          computeMethod: ExploreComputeMethod.USER_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
            ],
          },
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('22023-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id,
          user_first_touch_timestamp,
          _first_visit_date,
          _first_referer,
          _first_traffic_source_type,
          _first_traffic_medium,
          _first_traffic_source,
          _channel,
          user_properties.key::varchar as user_param_key,
          user_properties.value.string_value::varchar as user_param_string_value,
          user_properties.value.int_value::bigint as user_param_int_value,
          user_properties.value.float_value::double precision as user_param_float_value,
          user_properties.value.double_value::double precision as user_param_double_value
        from
          app1.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '22023-10-10'
          and event.event_name in ('add_button_click', 'note_share', 'note_export')
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          _session_duration,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = '_session_duration' then event_param_int_value
                  else null
                end
              ) as _session_duration
            from
              event_base
              join app1.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = '_user_first_touch_timestamp' then user_param_int_value
                  else null
                end
              ) as _user_first_touch_timestamp
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _user_first_touch_timestamp > 1686532526780
          )
          and (
            (
              event_name = 'add_button_click'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp > 1686532526780
              )
            )
            or (event_name = 'note_share')
            or (
              event_name = 'note_export'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _session_duration > 200
              )
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
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0
        from
          base_data base
        where
          event_name = 'add_button_click'
      ),
      table_1 as (
        select
          event_date as event_date_1,
          event_name as event_name_1,
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1
        from
          base_data base
        where
          event_name = 'note_share'
      ),
      table_2 as (
        select
          event_date as event_date_2,
          event_name as event_name_2,
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2
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

  test('buildEventAnalysisView', () => {

    const sql = buildEventAnalysisView({
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      globalEventCondition: {
        conditions: [
          {
            category: ConditionCategory.OTHER,
            property: 'platform',
            operator: '=',
            value: ['Android'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.GEO,
            property: 'country',
            operator: '=',
            value: ['China'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526770],
            dataType: MetadataValueType.INTEGER,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526780],
            dataType: MetadataValueType.INTEGER,
          },
        ],
      },
      eventAndConditions: [
        {
          eventName: 'add_button_click',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526780],
                dataType: MetadataValueType.INTEGER,
              },
            ],
          },
        },
        {
          eventName: 'note_share',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'note_export',
          computeMethod: ExploreComputeMethod.USER_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
            ],
          },
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('22023-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id,
          user_first_touch_timestamp,
          _first_visit_date,
          _first_referer,
          _first_traffic_source_type,
          _first_traffic_medium,
          _first_traffic_source,
          _channel,
          user_properties.key::varchar as user_param_key,
          user_properties.value.string_value::varchar as user_param_string_value,
          user_properties.value.int_value::bigint as user_param_int_value,
          user_properties.value.float_value::double precision as user_param_float_value,
          user_properties.value.double_value::double precision as user_param_double_value
        from
          app1.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '22023-10-10'
          and event.event_name in ('add_button_click', 'note_share', 'note_export')
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          _session_duration,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = '_session_duration' then event_param_int_value
                  else null
                end
              ) as _session_duration
            from
              event_base
              join app1.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = '_user_first_touch_timestamp' then user_param_int_value
                  else null
                end
              ) as _user_first_touch_timestamp
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _user_first_touch_timestamp > 1686532526780
          )
          and (
            (
              event_name = 'add_button_click'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp > 1686532526780
              )
            )
            or (event_name = 'note_share')
            or (
              event_name = 'note_export'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _session_duration > 200
              )
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
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0
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
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1
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
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2
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
          table_0.event_name_0 as event_name,
          table_0.event_timestamp_0 as event_timestamp,
          table_0.event_id_0 as x_id
        from
          table_0
        union all
        select
          table_1.month,
          table_1.week,
          table_1.day,
          table_1.hour,
          table_1.event_name_1 as event_name,
          table_1.event_timestamp_1 as event_timestamp,
          table_1.event_id_1 as x_id
        from
          table_1
        union all
        select
          table_2.month,
          table_2.week,
          table_2.day,
          table_2.hour,
          table_2.event_name_2 as event_name,
          table_2.event_timestamp_2 as event_timestamp,
          table_2.user_pseudo_id_2 as x_id
        from
          table_2
      )
    select
      day::date as event_date,
      event_name,
      x_id as count
    from
      join_table
    where
      x_id is not null
    group by
      day,
      event_name,
      x_id
  `.trim().replace(/ /g, ''),
    );

  });

  test('buildEventPathAnalysisView', () => {

    const sql = buildEventPathAnalysisView({
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      globalEventCondition: {
        conditions: [
          {
            category: ConditionCategory.OTHER,
            property: 'platform',
            operator: '=',
            value: ['Android'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.GEO,
            property: 'country',
            operator: '=',
            value: ['China'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526770],
            dataType: MetadataValueType.INTEGER,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526780],
            dataType: MetadataValueType.INTEGER,
          },
        ],
      },
      eventAndConditions: [
        {
          eventName: 'add_button_click',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526780],
                dataType: MetadataValueType.INTEGER,
              },
            ],
          },
        },
        {
          eventName: 'note_share',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'note_export',
          computeMethod: ExploreComputeMethod.USER_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
            ],
          },
        },
      ],
      pathAnalysis: {
        sessionType: ExplorePathSessionDef.SESSION,
        nodeType: ExplorePathNodeType.EVENT,
      },
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('22023-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id,
          user_first_touch_timestamp,
          _first_visit_date,
          _first_referer,
          _first_traffic_source_type,
          _first_traffic_medium,
          _first_traffic_source,
          _channel,
          user_properties.key::varchar as user_param_key,
          user_properties.value.string_value::varchar as user_param_string_value,
          user_properties.value.int_value::bigint as user_param_int_value,
          user_properties.value.float_value::double precision as user_param_float_value,
          user_properties.value.double_value::double precision as user_param_double_value
        from
          app1.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '22023-10-10'
          and event.event_name not in (
            '_session_start',
            '_session_stop',
            '_screen_view',
            '_app_exception',
            '_app_update',
            '_first_open',
            '_os_update',
            '_user_engagement',
            '_profile_set',
            '_page_view',
            '_app_start',
            '_scroll',
            '_search',
            '_click',
            '_clickstream_error',
            '_mp_share',
            '_mp_favorite',
            '_app_end'
          )
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          _session_duration,
          _session_id,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = '_session_duration' then event_param_int_value
                  else null
                end
              ) as _session_duration,
              max(
                case
                  when event_param_key = '_session_id' then event_param_int_value
                  else null
                end
              ) as _session_id
            from
              event_base
              join app1.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = '_user_first_touch_timestamp' then user_param_int_value
                  else null
                end
              ) as _user_first_touch_timestamp
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _user_first_touch_timestamp > 1686532526780
          )
          and (
            (
              event_name = 'add_button_click'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp > 1686532526780
              )
            )
            or (event_name = 'note_share')
            or (
              event_name = 'note_export'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _session_duration > 200
              )
            )
            or (
              event_name not in ('add_button_click', 'note_share', 'note_export')
            )
          )
      ),
      mid_table as (
        select
          CASE
            WHEN event_name in ('add_button_click', 'note_share', 'note_export') THEN event_name
            ELSE 'other'
          END as event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          _session_id
        from
          base_data
      ),
      data as (
        select
          *,
          ROW_NUMBER() OVER (
            PARTITION BY
              _session_id
            ORDER BY
              event_timestamp asc
          ) as step_1,
          ROW_NUMBER() OVER (
            PARTITION BY
              _session_id
            ORDER BY
              event_timestamp asc
          ) + 1 as step_2
        from
          mid_table
      ),
      step_table_1 as (
        select
          data.user_pseudo_id user_pseudo_id,
          data._session_id _session_id,
          min(step_1) min_step
        from
          data
        where
          event_name in ('add_button_click', 'note_share', 'note_export')
        group by
          user_pseudo_id,
          _session_id
      ),
      step_table_2 as (
        select
          data.*
        from
          data
          join step_table_1 on data.user_pseudo_id = step_table_1.user_pseudo_id
          and data._session_id = step_table_1._session_id
          and data.step_1 >= step_table_1.min_step
      ),
      data_final as (
        select
          event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          _session_id,
          ROW_NUMBER() OVER (
            PARTITION BY
              _session_id
            ORDER BY
              step_1 asc,
              step_2
          ) as step_1,
          ROW_NUMBER() OVER (
            PARTITION BY
              _session_id
            ORDER BY
              step_1 asc,
              step_2
          ) + 1 as step_2
        from
          step_table_2
      )
    select
      a.event_name || '_' || a.step_1 as source,
      CASE
        WHEN b.event_name is not null THEN b.event_name || '_' || a.step_2
        ELSE 'lost'
      END as target,
      a.user_pseudo_id as x_id
    from
      data_final a
      left join data_final b on a.step_2 = b.step_1
      and a._session_id = b._session_id
      and a.user_pseudo_id = b.user_pseudo_id
    where
      a.step_2 <= 10
  `.trim().replace(/ /g, ''),
    );

  });

  test('buildEventPathAnalysisView - custom join', () => {

    const sql = buildEventPathAnalysisView({
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      globalEventCondition: {
        conditions: [
          {
            category: ConditionCategory.OTHER,
            property: 'platform',
            operator: '=',
            value: ['Android'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.GEO,
            property: 'country',
            operator: '=',
            value: ['China'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526770],
            dataType: MetadataValueType.INTEGER,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526780],
            dataType: MetadataValueType.INTEGER,
          },
        ],
      },
      eventAndConditions: [
        {
          eventName: 'add_button_click',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526780],
                dataType: MetadataValueType.INTEGER,
              },
            ],
          },
        },
        {
          eventName: 'note_share',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'note_export',
          computeMethod: ExploreComputeMethod.USER_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
            ],
          },
        },
      ],
      pathAnalysis: {
        sessionType: ExplorePathSessionDef.CUSTOMIZE,
        nodeType: ExplorePathNodeType.EVENT,
        lagSeconds: 3600,
      },
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('22023-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id,
          user_first_touch_timestamp,
          _first_visit_date,
          _first_referer,
          _first_traffic_source_type,
          _first_traffic_medium,
          _first_traffic_source,
          _channel,
          user_properties.key::varchar as user_param_key,
          user_properties.value.string_value::varchar as user_param_string_value,
          user_properties.value.int_value::bigint as user_param_int_value,
          user_properties.value.float_value::double precision as user_param_float_value,
          user_properties.value.double_value::double precision as user_param_double_value
        from
          app1.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '22023-10-10'
          and event.event_name not in (
            '_session_start',
            '_session_stop',
            '_screen_view',
            '_app_exception',
            '_app_update',
            '_first_open',
            '_os_update',
            '_user_engagement',
            '_profile_set',
            '_page_view',
            '_app_start',
            '_scroll',
            '_search',
            '_click',
            '_clickstream_error',
            '_mp_share',
            '_mp_favorite',
            '_app_end'
          )
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          _session_duration,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = '_session_duration' then event_param_int_value
                  else null
                end
              ) as _session_duration
            from
              event_base
              join app1.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = '_user_first_touch_timestamp' then user_param_int_value
                  else null
                end
              ) as _user_first_touch_timestamp
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _user_first_touch_timestamp > 1686532526780
          )
          and (
            (
              event_name = 'add_button_click'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp > 1686532526780
              )
            )
            or (event_name = 'note_share')
            or (
              event_name = 'note_export'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _session_duration > 200
              )
            )
            or (
              event_name not in ('add_button_click', 'note_share', 'note_export')
            )
          )
      ),
      mid_table as (
        select
          CASE
            WHEN event_name in ('add_button_click', 'note_share', 'note_export') THEN event_name
            ELSE 'other'
          END as event_name,
          user_pseudo_id,
          event_id,
          event_timestamp
        from
          base_data base
      ),
      data_1 as (
        select
          *,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id
            ORDER BY
              event_timestamp asc
          ) as step_1,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id
            ORDER BY
              event_timestamp asc
          ) + 1 as step_2
        from
          mid_table
      ),
      data_2 as (
        select
          a.event_name,
          a.user_pseudo_id,
          a.event_id,
          a.event_timestamp,
          case
            when (
              b.event_timestamp - a.event_timestamp < 3600000
              and b.event_timestamp - a.event_timestamp >= 0
            ) then 0
            else 1
          end as group_start
        from
          data_1 a
          left join data_1 b on a.user_pseudo_id = b.user_pseudo_id
          and a.step_2 = b.step_1
      ),
      data_3 AS (
        SELECT
          *,
          SUM(group_start) over (
            order by
              user_pseudo_id,
              event_timestamp ROWS BETWEEN UNBOUNDED PRECEDING
              AND CURRENT ROW
          ) AS group_id
        FROM
          data_2
      ),
      data as (
        select
          event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          group_id,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              group_id
            ORDER BY
              event_timestamp asc
          ) as step_1,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              group_id
            ORDER BY
              event_timestamp asc
          ) + 1 as step_2
        from
          data_3
      ),
      step_table_1 as (
        select
          data.user_pseudo_id user_pseudo_id,
          group_id,
          min(step_1) min_step
        from
          data
        where
          event_name in ('add_button_click', 'note_share', 'note_export')
        group by
          user_pseudo_id,
          group_id
      ),
      step_table_2 as (
        select
          data.*
        from
          data
          join step_table_1 on data.user_pseudo_id = step_table_1.user_pseudo_id
          and data.group_id = step_table_1.group_id
          and data.step_1 >= step_table_1.min_step
      ),
      data_final as (
        select
          event_name,
          user_pseudo_id,
          event_id,
          group_id,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              group_id
            ORDER BY
              step_1 asc,
              step_2
          ) as step_1,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              group_id
            ORDER BY
              step_1 asc,
              step_2
          ) + 1 as step_2
        from
          step_table_2
      )
    select
      a.event_name || '_' || a.step_1 as source,
      CASE
        WHEN b.event_name is not null THEN b.event_name || '_' || a.step_2
        ELSE 'lost'
      END as target,
      a.user_pseudo_id as x_id
    from
      data_final a
      left join data_final b on a.step_2 = b.step_1
      and a.group_id = b.group_id
      and a.user_pseudo_id = b.user_pseudo_id
    where
      a.step_2 <= 10
  `.trim().replace(/ /g, ''),
    );

  });

  test('buildNodePathAnalysisView - custom join', () => {

    const sql = buildNodePathAnalysisView({
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      globalEventCondition: {
        conditions: [
          {
            category: ConditionCategory.OTHER,
            property: 'platform',
            operator: '=',
            value: ['Android'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.GEO,
            property: 'country',
            operator: '=',
            value: ['China'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526770],
            dataType: MetadataValueType.INTEGER,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526780],
            dataType: MetadataValueType.INTEGER,
          },
        ],
      },
      eventAndConditions: [
        {
          eventName: 'add_button_click',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526780],
                dataType: MetadataValueType.INTEGER,
              },
            ],
          },
        },
        {
          eventName: 'note_share',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'note_export',
          computeMethod: ExploreComputeMethod.USER_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
            ],
          },
        },
      ],
      pathAnalysis: {
        platform: MetadataPlatform.ANDROID,
        sessionType: ExplorePathSessionDef.CUSTOMIZE,
        lagSeconds: 3600,
        nodeType: ExplorePathNodeType.SCREEN_NAME,
        nodes: ['NotepadActivity', 'NotepadExportActivity', 'NotepadShareActivity', 'NotepadPrintActivity'],
      },
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('22023-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    const expectResult = `
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id,
          user_first_touch_timestamp,
          _first_visit_date,
          _first_referer,
          _first_traffic_source_type,
          _first_traffic_medium,
          _first_traffic_source,
          _channel,
          user_properties.key::varchar as user_param_key,
          user_properties.value.string_value::varchar as user_param_string_value,
          user_properties.value.int_value::bigint as user_param_int_value,
          user_properties.value.float_value::double precision as user_param_float_value,
          user_properties.value.double_value::double precision as user_param_double_value
        from
          app1.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '22023-10-10'
          and event.event_name = '_screen_view'
          and platform = 'Android'
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          _session_duration,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = '_session_duration' then event_param_int_value
                  else null
                end
              ) as _session_duration
            from
              event_base
              join app1.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = '_user_first_touch_timestamp' then user_param_int_value
                  else null
                end
              ) as _user_first_touch_timestamp
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _user_first_touch_timestamp > 1686532526780
          )
      ),
      mid_table_1 as (
        select
          event_name,
          user_pseudo_id,
          event_id,
          event_timestamp
        from
          base_data
      ),
      mid_table_2 as (
        select
          base_data.event_timestamp,
          base_data.event_id,
          max(event_param.event_param_string_value) as node
        from
          base_data
          join app1.event_parameter as event_param on base_data.event_timestamp = event_param.event_timestamp
          and base_data.event_id = event_param.event_id
        where
          event_param.event_param_key = '_screen_name'
        group by
          1,
          2
      ),
      mid_table as (
        select
          mid_table_1.*,
          mid_table_2.node
        from
          mid_table_1
          join mid_table_2 on mid_table_1.event_id = mid_table_2.event_id
      ),
      data_1 as (
        select
          user_pseudo_id,
          event_id,
          event_timestamp,
          case
            when node in (
              'NotepadActivity',
              'NotepadExportActivity',
              'NotepadShareActivity',
              'NotepadPrintActivity'
            ) then node
            else 'other'
          end as node,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id
            ORDER BY
              event_timestamp asc
          ) as step_1,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id
            ORDER BY
              event_timestamp asc
          ) + 1 as step_2
        from
          mid_table
      ),
      data_2 as (
        select
          a.node,
          a.user_pseudo_id,
          a.event_id,
          a.event_timestamp,
          case
            when (
              b.event_timestamp - a.event_timestamp < 3600000
              and b.event_timestamp - a.event_timestamp >= 0
            ) then 0
            else 1
          end as group_start
        from
          data_1 a
          left join data_1 b on a.user_pseudo_id = b.user_pseudo_id
          and a.step_2 = b.step_1
      ),
      data_3 AS (
        select
          *,
          SUM(group_start) over (
            order by
              user_pseudo_id,
              event_timestamp ROWS BETWEEN UNBOUNDED PRECEDING
              AND CURRENT ROW
          ) AS group_id
        from
          data_2
      ),
      data as (
        select
          node,
          user_pseudo_id,
          event_id,
          event_timestamp,
          group_id,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              group_id
            ORDER BY
              event_timestamp asc
          ) as step_1,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              group_id
            ORDER BY
              event_timestamp asc
          ) + 1 as step_2
        from
          data_3
      ),
      step_table_1 as (
        select
          data.user_pseudo_id user_pseudo_id,
          group_id,
          min(step_1) min_step
        from
          data
        where
          node in (
            'NotepadActivity',
            'NotepadExportActivity',
            'NotepadShareActivity',
            'NotepadPrintActivity'
          )
        group by
          user_pseudo_id,
          group_id
      ),
      step_table_2 as (
        select
          data.*
        from
          data
          join step_table_1 on data.user_pseudo_id = step_table_1.user_pseudo_id
          and data.group_id = step_table_1.group_id
          and data.step_1 >= step_table_1.min_step
      ),
      data_final as (
        select
          node,
          user_pseudo_id,
          event_id,
          group_id,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              group_id
            ORDER BY
              step_1 asc,
              step_2
          ) as step_1,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              group_id
            ORDER BY
              step_1 asc,
              step_2
          ) + 1 as step_2
        from
          step_table_2
      )
    select
      a.node || '_' || a.step_1 as source,
      CASE
        WHEN b.node is not null THEN b.node || '_' || a.step_2
        ELSE 'lost'
      END as target,
      a.user_pseudo_id as x_id
    from
      data_final a
      left join data_final b on a.user_pseudo_id = b.user_pseudo_id
      and a.group_id = b.group_id
      and a.step_2 = b.step_1
    where
      a.step_2 <= 10
    `;
    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));

  });

  test('event analysis sql - group condition - nest param', () => {

    const sql = buildEventAnalysisView({
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: false,
      groupCondition: {
        property: '_session_id',
        category: ConditionCategory.EVENT,
        dataType: MetadataValueType.STRING,
      },
      eventAndConditions: [
        {
          eventName: 'add_button_click',
          sqlCondition: {
            conditions: [
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526780],
                dataType: MetadataValueType.INTEGER,
              },

            ],
          },

        },
        {
          eventName: 'note_share',
        },
        {
          eventName: 'note_export',
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('22023-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id,
          user_first_touch_timestamp,
          _first_visit_date,
          _first_referer,
          _first_traffic_source_type,
          _first_traffic_medium,
          _first_traffic_source,
          _channel,
          user_properties.key::varchar as user_param_key,
          user_properties.value.string_value::varchar as user_param_string_value,
          user_properties.value.int_value::bigint as user_param_int_value,
          user_properties.value.float_value::double precision as user_param_float_value,
          user_properties.value.double_value::double precision as user_param_double_value
        from
          app1.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '22023-10-10'
          and event.event_name in ('add_button_click', 'note_share', 'note_export')
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          _session_id,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = '_session_id' then event_param_string_value
                  else null
                end
              ) as _session_id
            from
              event_base
              join app1.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = '_user_first_touch_timestamp' then user_param_int_value
                  else null
                end
              ) as _user_first_touch_timestamp
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
          and (
            (
              event_name = 'add_button_click'
              and (
                _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp > 1686532526780
              )
            )
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
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0,
          _session_id as _session_id_0
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
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1,
          _session_id as _session_id_1
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
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2,
          _session_id as _session_id_2
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
          table_0.event_name_0 as event_name,
          table_0.event_timestamp_0 as event_timestamp,
          table_0.event_id_0 as x_id,
          table_0._session_id_0 as _session_id
        from
          table_0
        union all
        select
          table_1.month,
          table_1.week,
          table_1.day,
          table_1.hour,
          table_1.event_name_1 as event_name,
          table_1.event_timestamp_1 as event_timestamp,
          table_1.event_id_1 as x_id,
          table_1._session_id_1 as _session_id
        from
          table_1
        union all
        select
          table_2.month,
          table_2.week,
          table_2.day,
          table_2.hour,
          table_2.event_name_2 as event_name,
          table_2.event_timestamp_2 as event_timestamp,
          table_2.event_id_2 as x_id,
          table_2._session_id_2 as _session_id
        from
          table_2
      )
    select
      day::date as event_date,
      event_name,
      _session_id as group_col,
      x_id as count
    from
      join_table
    where
      x_id is not null
    group by
      day,
      event_name,
      _session_id,
      x_id
  `.trim().replace(/ /g, ''),
    );

  });

  test('event analysis sql - group condition - public param', () => {

    const sql = buildEventAnalysisView({
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: false,
      groupCondition: {
        property: 'country',
        category: ConditionCategory.GEO,
        dataType: MetadataValueType.STRING,
      },
      eventAndConditions: [
        {
          eventName: 'add_button_click',
          sqlCondition: {
            conditions: [
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526780],
                dataType: MetadataValueType.INTEGER,
              },

            ],
          },

        },
        {
          eventName: 'note_share',
        },
        {
          eventName: 'note_export',
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('22023-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id,
          user_first_touch_timestamp,
          _first_visit_date,
          _first_referer,
          _first_traffic_source_type,
          _first_traffic_medium,
          _first_traffic_source,
          _channel,
          user_properties.key::varchar as user_param_key,
          user_properties.value.string_value::varchar as user_param_string_value,
          user_properties.value.int_value::bigint as user_param_int_value,
          user_properties.value.float_value::double precision as user_param_float_value,
          user_properties.value.double_value::double precision as user_param_double_value
        from
          app1.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '22023-10-10'
          and event.event_name in ('add_button_click', 'note_share', 'note_export')
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          event_base.*
        from
          event_base
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = '_user_first_touch_timestamp' then user_param_int_value
                  else null
                end
              ) as _user_first_touch_timestamp
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
          and (
            (
              event_name = 'add_button_click'
              and (
                _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp > 1686532526780
              )
            )
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
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0,
          geo_country as geo_country_0
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
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1,
          geo_country as geo_country_1
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
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2,
          geo_country as geo_country_2
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
          table_0.event_name_0 as event_name,
          table_0.event_timestamp_0 as event_timestamp,
          table_0.event_id_0 as x_id,
          table_0.geo_country_0 as geo_country
        from
          table_0
        union all
        select
          table_1.month,
          table_1.week,
          table_1.day,
          table_1.hour,
          table_1.event_name_1 as event_name,
          table_1.event_timestamp_1 as event_timestamp,
          table_1.event_id_1 as x_id,
          table_1.geo_country_1 as geo_country
        from
          table_1
        union all
        select
          table_2.month,
          table_2.week,
          table_2.day,
          table_2.hour,
          table_2.event_name_2 as event_name,
          table_2.event_timestamp_2 as event_timestamp,
          table_2.event_id_2 as x_id,
          table_2.geo_country_2 as geo_country
        from
          table_2
      )
    select
      day::date as event_date,
      event_name,
      geo_country as group_col,
      x_id as count
    from
      join_table
    where
      x_id is not null
    group by
      day,
      event_name,
      geo_country,
      x_id
  `.trim().replace(/ /g, ''),
    );

  });

  test('funnel analysis sql - group condition - nest param', () => {

    const sql = buildFunnelView({
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: false,
      groupCondition: {
        property: '_session_id',
        category: ConditionCategory.EVENT,
        dataType: MetadataValueType.STRING,
      },
      eventAndConditions: [
        {
          eventName: 'add_button_click',
          sqlCondition: {
            conditions: [
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526780],
                dataType: MetadataValueType.INTEGER,
              },

            ],
          },

        },
        {
          eventName: 'note_share',
        },
        {
          eventName: 'note_export',
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('22023-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    }, true);

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id,
          user_first_touch_timestamp,
          _first_visit_date,
          _first_referer,
          _first_traffic_source_type,
          _first_traffic_medium,
          _first_traffic_source,
          _channel,
          user_properties.key::varchar as user_param_key,
          user_properties.value.string_value::varchar as user_param_string_value,
          user_properties.value.int_value::bigint as user_param_int_value,
          user_properties.value.float_value::double precision as user_param_float_value,
          user_properties.value.double_value::double precision as user_param_double_value
        from
          app1.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '22023-10-10'
          and event.event_name in ('add_button_click', 'note_share', 'note_export')
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          _session_id,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = '_session_id' then event_param_string_value
                  else null
                end
              ) as _session_id
            from
              event_base
              join app1.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = '_user_first_touch_timestamp' then user_param_int_value
                  else null
                end
              ) as _user_first_touch_timestamp
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
          and (
            (
              event_name = 'add_button_click'
              and (
                _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp > 1686532526780
              )
            )
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
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0,
          _session_id as _session_id_0
        from
          base_data base
        where
          event_name = 'add_button_click'
      ),
      table_1 as (
        select
          event_date as event_date_1,
          event_name as event_name_1,
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1,
          _session_id as _session_id_1
        from
          base_data base
        where
          event_name = 'note_share'
      ),
      table_2 as (
        select
          event_date as event_date_2,
          event_name as event_name_2,
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2,
          _session_id as _session_id_2
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
          table_1._session_id_1,
          table_2.event_id_2,
          table_2.event_name_2,
          table_2.user_pseudo_id_2,
          table_2.event_timestamp_2,
          table_2._session_id_2
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
          _session_id_0 as group_col_0,
          event_id_1 as e_id_1,
          event_name_1 as e_name_1,
          user_pseudo_id_1 as u_id_1,
          _session_id_1 as group_col_1,
          event_id_2 as e_id_2,
          event_name_2 as e_name_2,
          user_pseudo_id_2 as u_id_2,
          _session_id_2 as group_col_2
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
          _session_id_0,
          event_id_1,
          event_name_1,
          user_pseudo_id_1,
          _session_id_1,
          event_id_2,
          event_name_2,
          user_pseudo_id_2,
          _session_id_2
      )
    select
      day::date as event_date,
      e_name_0::varchar as event_name,
      u_id_0::varchar as x_id,
      group_col_0::varchar as group_col
    from
      final_table
    where
      u_id_0 is not null
    union all
    select
      day::date as event_date,
      e_name_1::varchar as event_name,
      u_id_1::varchar as x_id,
      group_col_1::varchar as group_col
    from
      final_table
    where
      u_id_1 is not null
    union all
    select
      day::date as event_date,
      e_name_2::varchar as event_name,
      u_id_2::varchar as x_id,
      group_col_2::varchar as group_col
    from
      final_table
    where
      u_id_2 is not null
  `.trim().replace(/ /g, ''),
    );

  });

  test('funnel analysis sql - group condition - public param', () => {

    const sql = buildFunnelView({
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: false,
      groupCondition: {
        property: 'country',
        category: ConditionCategory.GEO,
        dataType: MetadataValueType.STRING,
      },
      eventAndConditions: [
        {
          eventName: 'add_button_click',
          sqlCondition: {
            conditions: [
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526780],
                dataType: MetadataValueType.INTEGER,
              },

            ],
          },

        },
        {
          eventName: 'note_share',
        },
        {
          eventName: 'note_export',
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('22023-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    }, true);

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id,
          user_first_touch_timestamp,
          _first_visit_date,
          _first_referer,
          _first_traffic_source_type,
          _first_traffic_medium,
          _first_traffic_source,
          _channel,
          user_properties.key::varchar as user_param_key,
          user_properties.value.string_value::varchar as user_param_string_value,
          user_properties.value.int_value::bigint as user_param_int_value,
          user_properties.value.float_value::double precision as user_param_float_value,
          user_properties.value.double_value::double precision as user_param_double_value
        from
          app1.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '22023-10-10'
          and event.event_name in ('add_button_click', 'note_share', 'note_export')
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          event_base.*
        from
          event_base
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = '_user_first_touch_timestamp' then user_param_int_value
                  else null
                end
              ) as _user_first_touch_timestamp
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
          and (
            (
              event_name = 'add_button_click'
              and (
                _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp > 1686532526780
              )
            )
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
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0,
          geo_country as geo_country_0
        from
          base_data base
        where
          event_name = 'add_button_click'
      ),
      table_1 as (
        select
          event_date as event_date_1,
          event_name as event_name_1,
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1,
          geo_country as geo_country_1
        from
          base_data base
        where
          event_name = 'note_share'
      ),
      table_2 as (
        select
          event_date as event_date_2,
          event_name as event_name_2,
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2,
          geo_country as geo_country_2
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
          table_1.geo_country_1,
          table_2.event_id_2,
          table_2.event_name_2,
          table_2.user_pseudo_id_2,
          table_2.event_timestamp_2,
          table_2.geo_country_2
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
          geo_country_0 as group_col_0,
          event_id_1 as e_id_1,
          event_name_1 as e_name_1,
          user_pseudo_id_1 as u_id_1,
          geo_country_1 as group_col_1,
          event_id_2 as e_id_2,
          event_name_2 as e_name_2,
          user_pseudo_id_2 as u_id_2,
          geo_country_2 as group_col_2
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
          geo_country_0,
          event_id_1,
          event_name_1,
          user_pseudo_id_1,
          geo_country_1,
          event_id_2,
          event_name_2,
          user_pseudo_id_2,
          geo_country_2
      )
    select
      day::date as event_date,
      e_name_0::varchar as event_name,
      u_id_0::varchar as x_id,
      group_col_0::varchar as group_col
    from
      final_table
    where
      u_id_0 is not null
    union all
    select
      day::date as event_date,
      e_name_1::varchar as event_name,
      u_id_1::varchar as x_id,
      group_col_1::varchar as group_col
    from
      final_table
    where
      u_id_1 is not null
    union all
    select
      day::date as event_date,
      e_name_2::varchar as event_name,
      u_id_2::varchar as x_id,
      group_col_2::varchar as group_col
    from
      final_table
    where
      u_id_2 is not null
  `.trim().replace(/ /g, ''),
    );

  });

  test('_buildCommonPartSql - no condition', () => {

    const sql = _buildCommonPartSql(['add_button_click', 'note_share', 'note_export'],
      {
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
        timeStart: new Date('2023-10-01'),
        timeEnd: new Date('2023-10-10'),
        groupColumn: ExploreGroupColumn.DAY,
      },
      false);

    const expectResult = `
    with
      base_data as (
        select
          event_base.*
        from
          (
            select
              event.event_date,
              event.event_name,
              event.event_id,
              event_bundle_sequence_id::bigint as event_bundle_sequence_id,
              event_previous_timestamp::bigint as event_previous_timestamp,
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
              device.viewport_height::bigint as device_viewport_height,
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
              COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
              event.user_id,
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
              ) || '00:00' as hour
            from
              app1.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2023-10-10'
              and event.event_name in ('add_button_click', 'note_share', 'note_export')
          ) as event_base
        where
          1 = 1
          and (
            (event_name = 'add_button_click')
            or (event_name = 'note_share')
            or (event_name = 'note_export')
          )
      ),
    `;
    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));
  });

  test('_buildCommonPartSql - geo and other condition', () => {

    const sql = _buildCommonPartSql(['add_button_click', 'note_share', 'note_export'],
      {
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
              conditionOperator: 'and',
              conditions: [
                {
                  category: ConditionCategory.OTHER,
                  property: 'platform',
                  operator: '=',
                  value: ['Android'],
                  dataType: MetadataValueType.STRING,
                },
                {
                  category: ConditionCategory.GEO,
                  property: 'country',
                  operator: '=',
                  value: ['China'],
                  dataType: MetadataValueType.STRING,
                },
              ],
            },
          },
          {
            eventName: 'note_share',
          },
          {
            eventName: 'note_export',
          },
        ],
        timeScopeType: ExploreTimeScopeType.FIXED,
        timeStart: new Date('2023-10-01'),
        timeEnd: new Date('2023-10-10'),
        groupColumn: ExploreGroupColumn.DAY,
      }, false);

    const expectResult = `
      with
      base_data as (
        select
          event_base.*
        from
          (
            select
              event.event_date,
              event.event_name,
              event.event_id,
              event_bundle_sequence_id::bigint as event_bundle_sequence_id,
              event_previous_timestamp::bigint as event_previous_timestamp,
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
              device.viewport_height::bigint as device_viewport_height,
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
              COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
              event.user_id,
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
              ) || '00:00' as hour
            from
              app1.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2023-10-10'
              and event.event_name in ('add_button_click', 'note_share', 'note_export')
          ) as event_base
        where
          1 = 1
          and (
            (
              event_name = 'add_button_click'
              and (
                platform = 'Android'
                and geo_country = 'China'
              )
            )
            or (event_name = 'note_share')
            or (event_name = 'note_export')
          )
      ),
      `;
    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));

  });

  test('_buildCommonPartSql - event,geo and other condition', () => {

    const sql = _buildCommonPartSql(['add_button_click', 'note_share', 'note_export'],
      {
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
              conditionOperator: 'and',
              conditions: [
                {
                  category: ConditionCategory.OTHER,
                  property: 'platform',
                  operator: '=',
                  value: ['Android'],
                  dataType: MetadataValueType.STRING,
                },
                {
                  category: ConditionCategory.GEO,
                  property: 'country',
                  operator: '=',
                  value: ['China'],
                  dataType: MetadataValueType.STRING,
                },
                {
                  category: ConditionCategory.EVENT,
                  property: '_session_duration',
                  operator: '>',
                  value: [220],
                  dataType: MetadataValueType.INTEGER,
                },
              ],
            },
          },
          {
            eventName: 'note_share',
          },
          {
            eventName: 'note_export',
          },
        ],
        timeScopeType: ExploreTimeScopeType.FIXED,
        timeStart: new Date('2023-10-01'),
        timeEnd: new Date('2023-10-10'),
        groupColumn: ExploreGroupColumn.DAY,
      },
      false);

    const expectResult = `
      with
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2023-10-10'
          and event.event_name in ('add_button_click', 'note_share', 'note_export')
      ),
      base_data as (
        select
          _session_duration,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = '_session_duration' then event_param_int_value
                  else null
                end
              ) as _session_duration
            from
              event_base
              join app1.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
        where
          1 = 1
          and (
            (
              event_name = 'add_button_click'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _session_duration > 220
              )
            )
            or (event_name = 'note_share')
            or (event_name = 'note_export')
          )
      ),
      `;
    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));

  });

  test('_buildCommonPartSql - user,geo and other condition', () => {

    const sql = _buildCommonPartSql(['add_button_click', 'note_share', 'note_export'],
      {
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
              conditionOperator: 'and',
              conditions: [
                {
                  category: ConditionCategory.OTHER,
                  property: 'platform',
                  operator: '=',
                  value: ['Android'],
                  dataType: MetadataValueType.STRING,
                },
                {
                  category: ConditionCategory.GEO,
                  property: 'country',
                  operator: '=',
                  value: ['China'],
                  dataType: MetadataValueType.STRING,
                },
                {
                  category: ConditionCategory.USER,
                  property: '_user_name',
                  operator: '=',
                  value: ['test_user'],
                  dataType: MetadataValueType.STRING,
                },
              ],
            },
          },
          {
            eventName: 'note_share',
          },
          {
            eventName: 'note_export',
          },
        ],
        timeScopeType: ExploreTimeScopeType.FIXED,
        timeStart: new Date('2023-10-01'),
        timeEnd: new Date('2023-10-10'),
        groupColumn: ExploreGroupColumn.DAY,
      },
      false);

    const expectResult = `
      with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id,
          user_first_touch_timestamp,
          _first_visit_date,
          _first_referer,
          _first_traffic_source_type,
          _first_traffic_medium,
          _first_traffic_source,
          _channel,
          user_properties.key::varchar as user_param_key,
          user_properties.value.string_value::varchar as user_param_string_value,
          user_properties.value.int_value::bigint as user_param_int_value,
          user_properties.value.float_value::double precision as user_param_float_value,
          user_properties.value.double_value::double precision as user_param_double_value
        from
          app1.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2023-10-10'
          and event.event_name in ('add_button_click', 'note_share', 'note_export')
      ),
      base_data as (
        select
          _user_name,
          event_base.*
        from
          event_base
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = '_user_name' then user_param_string_value
                  else null
                end
              ) as _user_name
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
          and (
            (
              event_name = 'add_button_click'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_name = 'test_user'
              )
            )
            or (event_name = 'note_share')
            or (event_name = 'note_export')
          )
      ),
      `;
    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));

  });

  test('_buildCommonPartSql - user,user_outer,event,geo and other condition', () => {

    const sql = _buildCommonPartSql(['add_button_click', 'note_share', 'note_export'],
      {
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
              conditionOperator: 'and',
              conditions: [
                {
                  category: ConditionCategory.OTHER,
                  property: 'platform',
                  operator: '=',
                  value: ['Android'],
                  dataType: MetadataValueType.STRING,
                },
                {
                  category: ConditionCategory.GEO,
                  property: 'country',
                  operator: '=',
                  value: ['China'],
                  dataType: MetadataValueType.STRING,
                },
                {
                  category: ConditionCategory.EVENT,
                  property: '_session_duration',
                  operator: '>',
                  value: [220],
                  dataType: MetadataValueType.INTEGER,
                },
                {
                  category: ConditionCategory.USER_OUTER,
                  property: 'user_first_touch_timestamp',
                  operator: '>',
                  value: [1686532526770],
                  dataType: MetadataValueType.INTEGER,
                },
                {
                  category: ConditionCategory.USER,
                  property: '_first_visit_date',
                  operator: '>',
                  value: [1686532526770],
                  dataType: MetadataValueType.INTEGER,
                },
              ],
            },
          },
          {
            eventName: 'note_share',
          },
          {
            eventName: 'note_export',
          },
        ],
        timeScopeType: ExploreTimeScopeType.FIXED,
        timeStart: new Date('2023-10-01'),
        timeEnd: new Date('2023-10-10'),
        groupColumn: ExploreGroupColumn.DAY,
      },
      false);

    const expectResult = `
      with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id,
          user_first_touch_timestamp,
          _first_visit_date,
          _first_referer,
          _first_traffic_source_type,
          _first_traffic_medium,
          _first_traffic_source,
          _channel,
          user_properties.key::varchar as user_param_key,
          user_properties.value.string_value::varchar as user_param_string_value,
          user_properties.value.int_value::bigint as user_param_int_value,
          user_properties.value.float_value::double precision as user_param_float_value,
          user_properties.value.double_value::double precision as user_param_double_value
        from
          app1.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2023-10-10'
          and event.event_name in ('add_button_click', 'note_share', 'note_export')
      ),
      base_data as (
        select
          _first_visit_date,
          user_first_touch_timestamp,
          _session_duration,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = '_session_duration' then event_param_int_value
                  else null
                end
              ) as _session_duration
            from
              event_base
              join app1.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = '_first_visit_date' then user_param_int_value
                  else null
                end
              ) as _first_visit_date,
              max(user_first_touch_timestamp) as user_first_touch_timestamp
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
          and (
            (
              event_name = 'add_button_click'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _session_duration > 220
                and user_first_touch_timestamp > 1686532526770
                and _first_visit_date > 1686532526770
              )
            )
            or (event_name = 'note_share')
            or (event_name = 'note_export')
          )
      ),
      `;
    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));

  });

  test('_buildCommonPartSql - grouping condition', () => {

    const sql = _buildCommonPartSql(['add_button_click', 'note_share', 'note_export'],
      {
        schemaName: 'app1',
        computeMethod: ExploreComputeMethod.USER_CNT,
        specifyJoinColumn: true,
        joinColumn: 'user_pseudo_id',
        conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
        conversionIntervalInSeconds: 10*60,
        groupCondition: {
          category: ConditionCategory.USER,
          property: '_user_name',
          dataType: MetadataValueType.STRING,
        },
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
        timeStart: new Date('2023-10-01'),
        timeEnd: new Date('2023-10-10'),
        groupColumn: ExploreGroupColumn.DAY,
      },
      false);

    const expectResult = `
      with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id,
          user_first_touch_timestamp,
          _first_visit_date,
          _first_referer,
          _first_traffic_source_type,
          _first_traffic_medium,
          _first_traffic_source,
          _channel,
          user_properties.key::varchar as user_param_key,
          user_properties.value.string_value::varchar as user_param_string_value,
          user_properties.value.int_value::bigint as user_param_int_value,
          user_properties.value.float_value::double precision as user_param_float_value,
          user_properties.value.double_value::double precision as user_param_double_value
        from
          app1.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2023-10-10'
          and event.event_name in ('add_button_click', 'note_share', 'note_export')
      ),
      base_data as (
        select
          _user_name,
          event_base.*
        from
          event_base
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = '_user_name' then user_param_string_value
                  else null
                end
              ) as _user_name
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
          and (
            (event_name = 'add_button_click')
            or (event_name = 'note_share')
            or (event_name = 'note_export')
          )
      ),
      `;
    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));

  });

  test('_buildCommonPartSql - global condition', () => {

    const sql = _buildCommonPartSql(['add_button_click', 'note_share', 'note_export'],
      {
        schemaName: 'app1',
        computeMethod: ExploreComputeMethod.USER_CNT,
        specifyJoinColumn: true,
        joinColumn: 'user_pseudo_id',
        conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
        conversionIntervalInSeconds: 10*60,
        globalEventCondition: {
          conditions: [
            {
              category: ConditionCategory.OTHER,
              property: 'platform',
              operator: '=',
              value: ['Android'],
              dataType: MetadataValueType.STRING,
            },
            {
              category: ConditionCategory.GEO,
              property: 'country',
              operator: '=',
              value: ['China'],
              dataType: MetadataValueType.STRING,
            },
            {
              category: ConditionCategory.USER,
              property: '_user_first_touch_timestamp',
              operator: '>',
              value: [1686532526770],
              dataType: MetadataValueType.INTEGER,
            },
            {
              category: ConditionCategory.EVENT,
              property: '_session_duration',
              operator: '>',
              value: [220],
              dataType: MetadataValueType.INTEGER,
            },
          ],
        },
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
        timeStart: new Date('2023-10-01'),
        timeEnd: new Date('2023-10-10'),
        groupColumn: ExploreGroupColumn.DAY,
      },
      false);

    const expectResult = `
      with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id,
          user_first_touch_timestamp,
          _first_visit_date,
          _first_referer,
          _first_traffic_source_type,
          _first_traffic_medium,
          _first_traffic_source,
          _channel,
          user_properties.key::varchar as user_param_key,
          user_properties.value.string_value::varchar as user_param_string_value,
          user_properties.value.int_value::bigint as user_param_int_value,
          user_properties.value.float_value::double precision as user_param_float_value,
          user_properties.value.double_value::double precision as user_param_double_value
        from
          app1.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2023-10-10'
          and event.event_name in ('add_button_click', 'note_share', 'note_export')
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          _session_duration,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = '_session_duration' then event_param_int_value
                  else null
                end
              ) as _session_duration
            from
              event_base
              join app1.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = '_user_first_touch_timestamp' then user_param_int_value
                  else null
                end
              ) as _user_first_touch_timestamp
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _session_duration > 220
          )
          and (
            (event_name = 'add_button_click')
            or (event_name = 'note_share')
            or (event_name = 'note_export')
          )
      ),
      `;
    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));

  });

  test('_buildCommonPartSql - global condition and grouping condition', () => {

    const sql = _buildCommonPartSql(['add_button_click', 'note_share', 'note_export'],
      {
        schemaName: 'app1',
        computeMethod: ExploreComputeMethod.USER_CNT,
        specifyJoinColumn: true,
        joinColumn: 'user_pseudo_id',
        conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
        conversionIntervalInSeconds: 10*60,
        groupCondition: {
          category: ConditionCategory.USER,
          property: '_user_name',
          dataType: MetadataValueType.STRING,
        },
        globalEventCondition: {
          conditions: [
            {
              category: ConditionCategory.OTHER,
              property: 'platform',
              operator: '=',
              value: ['Android'],
              dataType: MetadataValueType.STRING,
            },
            {
              category: ConditionCategory.GEO,
              property: 'country',
              operator: '=',
              value: ['China'],
              dataType: MetadataValueType.STRING,
            },
            {
              category: ConditionCategory.USER,
              property: '_user_first_touch_timestamp',
              operator: '>',
              value: [1686532526770],
              dataType: MetadataValueType.INTEGER,
            },
            {
              category: ConditionCategory.EVENT,
              property: '_session_duration',
              operator: '>',
              value: [220],
              dataType: MetadataValueType.INTEGER,
            },
          ],
        },
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
        timeStart: new Date('2023-10-01'),
        timeEnd: new Date('2023-10-10'),
        groupColumn: ExploreGroupColumn.DAY,
      },
      false);

    const expectResult = `
      with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id,
          user_first_touch_timestamp,
          _first_visit_date,
          _first_referer,
          _first_traffic_source_type,
          _first_traffic_medium,
          _first_traffic_source,
          _channel,
          user_properties.key::varchar as user_param_key,
          user_properties.value.string_value::varchar as user_param_string_value,
          user_properties.value.int_value::bigint as user_param_int_value,
          user_properties.value.float_value::double precision as user_param_float_value,
          user_properties.value.double_value::double precision as user_param_double_value
        from
          app1.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2023-10-10'
          and event.event_name in ('add_button_click', 'note_share', 'note_export')
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          _user_name,
          _session_duration,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = '_session_duration' then event_param_int_value
                  else null
                end
              ) as _session_duration
            from
              event_base
              join app1.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = '_user_first_touch_timestamp' then user_param_int_value
                  else null
                end
              ) as _user_first_touch_timestamp,
              max(
                case
                  when user_param_key = '_user_name' then user_param_int_value
                  else null
                end
              ) as _user_name
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _session_duration > 220
          )
          and (
            (event_name = 'add_button_click')
            or (event_name = 'note_share')
            or (event_name = 'note_export')
          )
      ),
      `;
    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));

  });

  test('_buildCommonPartSql - global condition and user,user_outer,event,geo and other condition', () => {

    const sql = _buildCommonPartSql(['add_button_click', 'note_share', 'note_export'],
      {
        schemaName: 'app1',
        computeMethod: ExploreComputeMethod.USER_CNT,
        specifyJoinColumn: true,
        joinColumn: 'user_pseudo_id',
        conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
        conversionIntervalInSeconds: 10*60,
        globalEventCondition: {
          conditions: [
            {
              category: ConditionCategory.OTHER,
              property: 'platform',
              operator: '=',
              value: ['Android'],
              dataType: MetadataValueType.STRING,
            },
            {
              category: ConditionCategory.GEO,
              property: 'country',
              operator: '=',
              value: ['China'],
              dataType: MetadataValueType.STRING,
            },
            {
              category: ConditionCategory.USER,
              property: '_user_first_touch_timestamp',
              operator: '>',
              value: [1686532526770],
              dataType: MetadataValueType.INTEGER,
            },
            {
              category: ConditionCategory.EVENT,
              property: '_session_duration',
              operator: '>',
              value: [220],
              dataType: MetadataValueType.INTEGER,
            },
          ],
        },
        eventAndConditions: [
          {
            eventName: 'add_button_click',
            sqlCondition: {
              conditionOperator: 'and',
              conditions: [
                {
                  category: ConditionCategory.OTHER,
                  property: 'platform',
                  operator: '=',
                  value: ['Android'],
                  dataType: MetadataValueType.STRING,
                },
                {
                  category: ConditionCategory.GEO,
                  property: 'country',
                  operator: '=',
                  value: ['China'],
                  dataType: MetadataValueType.STRING,
                },
                {
                  category: ConditionCategory.EVENT,
                  property: '_session_duration',
                  operator: '>',
                  value: [220],
                  dataType: MetadataValueType.INTEGER,
                },
                {
                  category: ConditionCategory.USER_OUTER,
                  property: 'user_first_touch_timestamp',
                  operator: '>',
                  value: [1686532526770],
                  dataType: MetadataValueType.INTEGER,
                },
                {
                  category: ConditionCategory.USER,
                  property: '_first_visit_date',
                  operator: '>',
                  value: [1686532526770],
                  dataType: MetadataValueType.INTEGER,
                },
              ],
            },
          },
          {
            eventName: 'note_share',
          },
          {
            eventName: 'note_export',
          },
        ],
        timeScopeType: ExploreTimeScopeType.FIXED,
        timeStart: new Date('2023-10-01'),
        timeEnd: new Date('2023-10-10'),
        groupColumn: ExploreGroupColumn.DAY,
      },
      false);

    const expectResult = `
      with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id,
          user_first_touch_timestamp,
          _first_visit_date,
          _first_referer,
          _first_traffic_source_type,
          _first_traffic_medium,
          _first_traffic_source,
          _channel,
          user_properties.key::varchar as user_param_key,
          user_properties.value.string_value::varchar as user_param_string_value,
          user_properties.value.int_value::bigint as user_param_int_value,
          user_properties.value.float_value::double precision as user_param_float_value,
          user_properties.value.double_value::double precision as user_param_double_value
        from
          app1.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2023-10-10'
          and event.event_name in ('add_button_click', 'note_share', 'note_export')
      ),
      base_data as (
        select
          _first_visit_date,
          user_first_touch_timestamp,
          _user_first_touch_timestamp,
          _session_duration,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = '_session_duration' then event_param_int_value
                  else null
                end
              ) as _session_duration
            from
              event_base
              join app1.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = '_first_visit_date' then user_param_int_value
                  else null
                end
              ) as _first_visit_date,
              max(user_first_touch_timestamp) as user_first_touch_timestamp,
              max(
                case
                  when user_param_key = '_user_first_touch_timestamp' then user_param_int_value
                  else null
                end
              ) as _user_first_touch_timestamp
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _session_duration > 220
          )
          and (
            (
              event_name = 'add_button_click'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _session_duration > 220
                and user_first_touch_timestamp > 1686532526770
                and _first_visit_date > 1686532526770
              )
            )
            or (event_name = 'note_share')
            or (event_name = 'note_export')
          )
      ),
      `;
    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));

  });

  test('_buildCommonPartSql - grouping condition and global condition and user,user_outer,event,geo and other condition', () => {

    const sql = _buildCommonPartSql(['add_button_click', 'note_share', 'note_export'],
      {
        schemaName: 'app1',
        computeMethod: ExploreComputeMethod.USER_CNT,
        specifyJoinColumn: true,
        joinColumn: 'user_pseudo_id',
        conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
        conversionIntervalInSeconds: 10*60,
        groupCondition: {
          category: ConditionCategory.USER,
          property: '_user_name',
          dataType: MetadataValueType.STRING,
        },
        globalEventCondition: {
          conditions: [
            {
              category: ConditionCategory.OTHER,
              property: 'platform',
              operator: '=',
              value: ['Android'],
              dataType: MetadataValueType.STRING,
            },
            {
              category: ConditionCategory.GEO,
              property: 'country',
              operator: '=',
              value: ['China'],
              dataType: MetadataValueType.STRING,
            },
            {
              category: ConditionCategory.USER,
              property: '_user_first_touch_timestamp',
              operator: '>',
              value: [1686532526770],
              dataType: MetadataValueType.INTEGER,
            },
            {
              category: ConditionCategory.EVENT,
              property: '_session_duration',
              operator: '>',
              value: [220],
              dataType: MetadataValueType.INTEGER,
            },
          ],
        },
        eventAndConditions: [
          {
            eventName: 'add_button_click',
            sqlCondition: {
              conditionOperator: 'and',
              conditions: [
                {
                  category: ConditionCategory.OTHER,
                  property: 'platform',
                  operator: '=',
                  value: ['Android'],
                  dataType: MetadataValueType.STRING,
                },
                {
                  category: ConditionCategory.GEO,
                  property: 'country',
                  operator: '=',
                  value: ['China'],
                  dataType: MetadataValueType.STRING,
                },
                {
                  category: ConditionCategory.EVENT,
                  property: '_session_duration',
                  operator: '>',
                  value: [220],
                  dataType: MetadataValueType.INTEGER,
                },
                {
                  category: ConditionCategory.USER_OUTER,
                  property: 'user_first_touch_timestamp',
                  operator: '>',
                  value: [1686532526770],
                  dataType: MetadataValueType.INTEGER,
                },
                {
                  category: ConditionCategory.USER,
                  property: '_first_visit_date',
                  operator: '>',
                  value: [1686532526770],
                  dataType: MetadataValueType.INTEGER,
                },
              ],
            },
          },
          {
            eventName: 'note_share',
          },
          {
            eventName: 'note_export',
          },
        ],
        timeScopeType: ExploreTimeScopeType.FIXED,
        timeStart: new Date('2023-10-01'),
        timeEnd: new Date('2023-10-10'),
        groupColumn: ExploreGroupColumn.DAY,
      },
      false);

    const expectResult = `
      with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id,
          user_first_touch_timestamp,
          _first_visit_date,
          _first_referer,
          _first_traffic_source_type,
          _first_traffic_medium,
          _first_traffic_source,
          _channel,
          user_properties.key::varchar as user_param_key,
          user_properties.value.string_value::varchar as user_param_string_value,
          user_properties.value.int_value::bigint as user_param_int_value,
          user_properties.value.float_value::double precision as user_param_float_value,
          user_properties.value.double_value::double precision as user_param_double_value
        from
          app1.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2023-10-10'
          and event.event_name in ('add_button_click', 'note_share', 'note_export')
      ),
      base_data as (
        select
          _first_visit_date,
          user_first_touch_timestamp,
          _user_first_touch_timestamp,
          _user_name,
          _session_duration,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = '_session_duration' then event_param_int_value
                  else null
                end
              ) as _session_duration
            from
              event_base
              join app1.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = '_first_visit_date' then user_param_int_value
                  else null
                end
              ) as _first_visit_date,
              max(user_first_touch_timestamp) as user_first_touch_timestamp,
              max(
                case
                  when user_param_key = '_user_first_touch_timestamp' then user_param_int_value
                  else null
                end
              ) as _user_first_touch_timestamp,
              max(
                case
                  when user_param_key = '_user_name' then user_param_int_value
                  else null
                end
              ) as _user_name
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _session_duration > 220
          )
          and (
            (
              event_name = 'add_button_click'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _session_duration > 220
                and user_first_touch_timestamp > 1686532526770
                and _first_visit_date > 1686532526770
              )
            )
            or (event_name = 'note_share')
            or (event_name = 'note_export')
          )
      ),
      `;
    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));

  });


  test('buildFunnelView', () => {

    const sql = buildFunnelView({
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      groupCondition: {
        category: ConditionCategory.GEO,
        property: 'country',
        dataType: MetadataValueType.STRING,
      },
      globalEventCondition: {
        conditions: [
          {
            category: ConditionCategory.OTHER,
            property: 'platform',
            operator: '=',
            value: ['Android'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.GEO,
            property: 'country',
            operator: '=',
            value: ['China'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526770],
            dataType: MetadataValueType.INTEGER,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526780],
            dataType: MetadataValueType.INTEGER,
          },
        ],
      },
      eventAndConditions: [
        {
          eventName: 'add_button_click',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526780],
                dataType: MetadataValueType.INTEGER,
              },
            ],
          },
        },
        {
          eventName: 'note_share',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'note_export',
          computeMethod: ExploreComputeMethod.USER_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
            ],
          },
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2023-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    }, true);

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id,
          user_first_touch_timestamp,
          _first_visit_date,
          _first_referer,
          _first_traffic_source_type,
          _first_traffic_medium,
          _first_traffic_source,
          _channel,
          user_properties.key::varchar as user_param_key,
          user_properties.value.string_value::varchar as user_param_string_value,
          user_properties.value.int_value::bigint as user_param_int_value,
          user_properties.value.float_value::double precision as user_param_float_value,
          user_properties.value.double_value::double precision as user_param_double_value
        from
          app1.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2023-10-10'
          and event.event_name in ('add_button_click', 'note_share', 'note_export')
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          _session_duration,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = '_session_duration' then event_param_int_value
                  else null
                end
              ) as _session_duration
            from
              event_base
              join app1.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = '_user_first_touch_timestamp' then user_param_int_value
                  else null
                end
              ) as _user_first_touch_timestamp
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _user_first_touch_timestamp > 1686532526780
          )
          and (
            (
              event_name = 'add_button_click'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp > 1686532526780
              )
            )
            or (event_name = 'note_share')
            or (
              event_name = 'note_export'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _session_duration > 200
              )
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
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0,
          geo_country as geo_country_0
        from
          base_data base
        where
          event_name = 'add_button_click'
      ),
      table_1 as (
        select
          event_date as event_date_1,
          event_name as event_name_1,
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1,
          geo_country as geo_country_1
        from
          base_data base
        where
          event_name = 'note_share'
      ),
      table_2 as (
        select
          event_date as event_date_2,
          event_name as event_name_2,
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2,
          geo_country as geo_country_2
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
          table_1.geo_country_1,
          table_2.event_id_2,
          table_2.event_name_2,
          table_2.user_pseudo_id_2,
          table_2.event_timestamp_2,
          table_2.geo_country_2
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
          geo_country_0 as group_col_0,
          event_id_1 as e_id_1,
          event_name_1 as e_name_1,
          user_pseudo_id_1 as u_id_1,
          geo_country_1 as group_col_1,
          event_id_2 as e_id_2,
          event_name_2 as e_name_2,
          user_pseudo_id_2 as u_id_2,
          geo_country_2 as group_col_2
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
          geo_country_0,
          event_id_1,
          event_name_1,
          user_pseudo_id_1,
          geo_country_1,
          event_id_2,
          event_name_2,
          user_pseudo_id_2,
          geo_country_2
      )
    select
      day::date as event_date,
      e_name_0::varchar as event_name,
      u_id_0::varchar as x_id,
      group_col_0::varchar as group_col
    from
      final_table
    where
      u_id_0 is not null
    union all
    select
      day::date as event_date,
      e_name_1::varchar as event_name,
      u_id_1::varchar as x_id,
      group_col_1::varchar as group_col
    from
      final_table
    where
      u_id_1 is not null
    union all
    select
      day::date as event_date,
      e_name_2::varchar as event_name,
      u_id_2::varchar as x_id,
      group_col_2::varchar as group_col
    from
      final_table
    where
      u_id_2 is not null
  `.trim().replace(/ /g, ''),
    );

  });

  test('buildFunnelTableView', () => {

    const sql = buildFunnelTableView({
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      globalEventCondition: {
        conditions: [
          {
            category: ConditionCategory.OTHER,
            property: 'platform',
            operator: '=',
            value: ['Android'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.GEO,
            property: 'country',
            operator: '=',
            value: ['China'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526770],
            dataType: MetadataValueType.INTEGER,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526780],
            dataType: MetadataValueType.INTEGER,
          },
        ],
      },
      eventAndConditions: [
        {
          eventName: 'add_button_click',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526780],
                dataType: MetadataValueType.INTEGER,
              },
            ],
          },
        },
        {
          eventName: 'note_share',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'note_export',
          computeMethod: ExploreComputeMethod.USER_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
            ],
          },
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2023-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id,
          user_first_touch_timestamp,
          _first_visit_date,
          _first_referer,
          _first_traffic_source_type,
          _first_traffic_medium,
          _first_traffic_source,
          _channel,
          user_properties.key::varchar as user_param_key,
          user_properties.value.string_value::varchar as user_param_string_value,
          user_properties.value.int_value::bigint as user_param_int_value,
          user_properties.value.float_value::double precision as user_param_float_value,
          user_properties.value.double_value::double precision as user_param_double_value
        from
          app1.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2023-10-10'
          and event.event_name in ('add_button_click', 'note_share', 'note_export')
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          _session_duration,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = '_session_duration' then event_param_int_value
                  else null
                end
              ) as _session_duration
            from
              event_base
              join app1.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = '_user_first_touch_timestamp' then user_param_int_value
                  else null
                end
              ) as _user_first_touch_timestamp
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _user_first_touch_timestamp > 1686532526780
          )
          and (
            (
              event_name = 'add_button_click'
              and (
                platform = 'Android'
                and _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp > 1686532526780
              )
            )
            or (event_name = 'note_share')
            or (
              event_name = 'note_export'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _session_duration > 200
              )
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
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0
        from
          base_data base
        where
          event_name = 'add_button_click'
      ),
      table_1 as (
        select
          event_date as event_date_1,
          event_name as event_name_1,
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1
        from
          base_data base
        where
          event_name = 'note_share'
      ),
      table_2 as (
        select
          event_date as event_date_2,
          event_name as event_name_2,
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2
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

  test('buildEventAnalysisView', () => {

    const sql = buildEventAnalysisView({
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      groupCondition: {
        category: ConditionCategory.GEO,
        property: 'country',
        dataType: MetadataValueType.STRING,
      },
      globalEventCondition: {
        conditions: [
          {
            category: ConditionCategory.OTHER,
            property: 'platform',
            operator: '=',
            value: ['Android'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.GEO,
            property: 'country',
            operator: '=',
            value: ['China'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526770],
            dataType: MetadataValueType.INTEGER,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526780],
            dataType: MetadataValueType.INTEGER,
          },
        ],
      },
      eventAndConditions: [
        {
          eventName: 'add_button_click',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526780],
                dataType: MetadataValueType.INTEGER,
              },
            ],
          },
        },
        {
          eventName: 'note_share',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'note_export',
          computeMethod: ExploreComputeMethod.USER_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
            ],
          },
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2023-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id,
          user_first_touch_timestamp,
          _first_visit_date,
          _first_referer,
          _first_traffic_source_type,
          _first_traffic_medium,
          _first_traffic_source,
          _channel,
          user_properties.key::varchar as user_param_key,
          user_properties.value.string_value::varchar as user_param_string_value,
          user_properties.value.int_value::bigint as user_param_int_value,
          user_properties.value.float_value::double precision as user_param_float_value,
          user_properties.value.double_value::double precision as user_param_double_value
        from
          app1.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2023-10-10'
          and event.event_name in ('add_button_click', 'note_share', 'note_export')
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          _session_duration,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = '_session_duration' then event_param_int_value
                  else null
                end
              ) as _session_duration
            from
              event_base
              join app1.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = '_user_first_touch_timestamp' then user_param_int_value
                  else null
                end
              ) as _user_first_touch_timestamp
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _user_first_touch_timestamp > 1686532526780
          )
          and (
            (
              event_name = 'add_button_click'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp > 1686532526780
              )
            )
            or (event_name = 'note_share')
            or (
              event_name = 'note_export'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _session_duration > 200
              )
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
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0,
          geo_country as geo_country_0
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
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1,
          geo_country as geo_country_1
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
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2,
          geo_country as geo_country_2
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
          table_0.event_name_0 as event_name,
          table_0.event_timestamp_0 as event_timestamp,
          table_0.event_id_0 as x_id,
          table_0.geo_country_0 as geo_country
        from
          table_0
        union all
        select
          table_1.month,
          table_1.week,
          table_1.day,
          table_1.hour,
          table_1.event_name_1 as event_name,
          table_1.event_timestamp_1 as event_timestamp,
          table_1.event_id_1 as x_id,
          table_1.geo_country_1 as geo_country
        from
          table_1
        union all
        select
          table_2.month,
          table_2.week,
          table_2.day,
          table_2.hour,
          table_2.event_name_2 as event_name,
          table_2.event_timestamp_2 as event_timestamp,
          table_2.user_pseudo_id_2 as x_id,
          table_2.geo_country_2 as geo_country
        from
          table_2
      )
    select
      day::date as event_date,
      event_name,
      geo_country as group_col,
      x_id as count
    from
      join_table
    where
      x_id is not null
    group by
      day,
      event_name,
      geo_country,
      x_id
  `.trim().replace(/ /g, ''),
    );

  });

  test('buildEventPathAnalysisView - session join', () => {

    const sql = buildEventPathAnalysisView({
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.EVENT_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      globalEventCondition: {
        conditions: [
          {
            category: ConditionCategory.OTHER,
            property: 'platform',
            operator: '=',
            value: ['Android'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.GEO,
            property: 'country',
            operator: '=',
            value: ['China'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526770],
            dataType: MetadataValueType.INTEGER,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526780],
            dataType: MetadataValueType.INTEGER,
          },
        ],
      },
      eventAndConditions: [
        {
          eventName: 'add_button_click',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526780],
                dataType: MetadataValueType.INTEGER,
              },
            ],
          },
        },
        {
          eventName: 'note_share',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'note_export',
          computeMethod: ExploreComputeMethod.USER_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
            ],
          },
        },
      ],
      pathAnalysis: {
        sessionType: ExplorePathSessionDef.SESSION,
        nodeType: ExplorePathNodeType.EVENT,
      },
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2023-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id,
          user_first_touch_timestamp,
          _first_visit_date,
          _first_referer,
          _first_traffic_source_type,
          _first_traffic_medium,
          _first_traffic_source,
          _channel,
          user_properties.key::varchar as user_param_key,
          user_properties.value.string_value::varchar as user_param_string_value,
          user_properties.value.int_value::bigint as user_param_int_value,
          user_properties.value.float_value::double precision as user_param_float_value,
          user_properties.value.double_value::double precision as user_param_double_value
        from
          app1.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2023-10-10'
          and event.event_name not in (
            '_session_start',
            '_session_stop',
            '_screen_view',
            '_app_exception',
            '_app_update',
            '_first_open',
            '_os_update',
            '_user_engagement',
            '_profile_set',
            '_page_view',
            '_app_start',
            '_scroll',
            '_search',
            '_click',
            '_clickstream_error',
            '_mp_share',
            '_mp_favorite',
            '_app_end'
          )
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          _session_duration,
          _session_id,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = '_session_duration' then event_param_int_value
                  else null
                end
              ) as _session_duration,
              max(
                case
                  when event_param_key = '_session_id' then event_param_int_value
                  else null
                end
              ) as _session_id
            from
              event_base
              join app1.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = '_user_first_touch_timestamp' then user_param_int_value
                  else null
                end
              ) as _user_first_touch_timestamp
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _user_first_touch_timestamp > 1686532526780
          )
          and (
            (
              event_name = 'add_button_click'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp > 1686532526780
              )
            )
            or (event_name = 'note_share')
            or (
              event_name = 'note_export'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _session_duration > 200
              )
            )
            or (
              event_name not in ('add_button_click', 'note_share', 'note_export')
            )
          )
      ),
      mid_table as (
        select
          CASE
            WHEN event_name in ('add_button_click', 'note_share', 'note_export') THEN event_name
            ELSE 'other'
          END as event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          _session_id
        from
          base_data
      ),
      data as (
        select
          *,
          ROW_NUMBER() OVER (
            PARTITION BY
              _session_id
            ORDER BY
              event_timestamp asc
          ) as step_1,
          ROW_NUMBER() OVER (
            PARTITION BY
              _session_id
            ORDER BY
              event_timestamp asc
          ) + 1 as step_2
        from
          mid_table
      ),
      step_table_1 as (
        select
          data.user_pseudo_id user_pseudo_id,
          data._session_id _session_id,
          min(step_1) min_step
        from
          data
        where
          event_name in ('add_button_click', 'note_share', 'note_export')
        group by
          user_pseudo_id,
          _session_id
      ),
      step_table_2 as (
        select
          data.*
        from
          data
          join step_table_1 on data.user_pseudo_id = step_table_1.user_pseudo_id
          and data._session_id = step_table_1._session_id
          and data.step_1 >= step_table_1.min_step
      ),
      data_final as (
        select
          event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          _session_id,
          ROW_NUMBER() OVER (
            PARTITION BY
              _session_id
            ORDER BY
              step_1 asc,
              step_2
          ) as step_1,
          ROW_NUMBER() OVER (
            PARTITION BY
              _session_id
            ORDER BY
              step_1 asc,
              step_2
          ) + 1 as step_2
        from
          step_table_2
      )
    select
      a.event_name || '_' || a.step_1 as source,
      CASE
        WHEN b.event_name is not null THEN b.event_name || '_' || a.step_2
        ELSE 'lost'
      END as target,
      a.event_id as x_id
    from
      data_final a
      left join data_final b on a.step_2 = b.step_1
      and a._session_id = b._session_id
      and a.user_pseudo_id = b.user_pseudo_id
    where
      a.step_2 <= 10
  `.trim().replace(/ /g, ''),
    );

  });

  test('buildEventPathAnalysisView - session join - not condition', () => {

    const sql = buildEventPathAnalysisView({
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.EVENT_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: 'add_button_click',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'note_share',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'note_export',
          computeMethod: ExploreComputeMethod.USER_CNT,
        },
      ],
      pathAnalysis: {
        sessionType: ExplorePathSessionDef.SESSION,
        nodeType: ExplorePathNodeType.EVENT,
      },
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2023-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2023-10-10'
          and event.event_name not in (
            '_session_start',
            '_session_stop',
            '_screen_view',
            '_app_exception',
            '_app_update',
            '_first_open',
            '_os_update',
            '_user_engagement',
            '_profile_set',
            '_page_view',
            '_app_start',
            '_scroll',
            '_search',
            '_click',
            '_clickstream_error',
            '_mp_share',
            '_mp_favorite',
            '_app_end'
          )
      ),
      base_data as (
        select
          _session_id,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = '_session_id' then event_param_string_value
                  else null
                end
              ) as _session_id
            from
              event_base
              join app1.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
        where
          1 = 1
          and (
            (event_name = 'add_button_click')
            or (event_name = 'note_share')
            or (event_name = 'note_export')
            or (
              event_name not in ('add_button_click', 'note_share', 'note_export')
            )
          )
      ),
      mid_table as (
        select
          CASE
            WHEN event_name in ('add_button_click', 'note_share', 'note_export') THEN event_name
            ELSE 'other'
          END as event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          _session_id
        from
          base_data
      ),
      data as (
        select
          *,
          ROW_NUMBER() OVER (
            PARTITION BY
              _session_id
            ORDER BY
              event_timestamp asc
          ) as step_1,
          ROW_NUMBER() OVER (
            PARTITION BY
              _session_id
            ORDER BY
              event_timestamp asc
          ) + 1 as step_2
        from
          mid_table
      ),
      step_table_1 as (
        select
          data.user_pseudo_id user_pseudo_id,
          data._session_id _session_id,
          min(step_1) min_step
        from
          data
        where
          event_name in ('add_button_click', 'note_share', 'note_export')
        group by
          user_pseudo_id,
          _session_id
      ),
      step_table_2 as (
        select
          data.*
        from
          data
          join step_table_1 on data.user_pseudo_id = step_table_1.user_pseudo_id
          and data._session_id = step_table_1._session_id
          and data.step_1 >= step_table_1.min_step
      ),
      data_final as (
        select
          event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          _session_id,
          ROW_NUMBER() OVER (
            PARTITION BY
              _session_id
            ORDER BY
              step_1 asc,
              step_2
          ) as step_1,
          ROW_NUMBER() OVER (
            PARTITION BY
              _session_id
            ORDER BY
              step_1 asc,
              step_2
          ) + 1 as step_2
        from
          step_table_2
      )
    select
      a.event_name || '_' || a.step_1 as source,
      CASE
        WHEN b.event_name is not null THEN b.event_name || '_' || a.step_2
        ELSE 'lost'
      END as target,
      a.event_id as x_id
    from
      data_final a
      left join data_final b on a.step_2 = b.step_1
      and a._session_id = b._session_id
      and a.user_pseudo_id = b.user_pseudo_id
    where
      a.step_2 <= 10
  `.trim().replace(/ /g, ''),
    );

  });

  test('buildNodePathAnalysisView', () => {

    const sql = buildNodePathAnalysisView({
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      globalEventCondition: {
        conditions: [
          {
            category: ConditionCategory.OTHER,
            property: 'platform',
            operator: '=',
            value: ['Android'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.GEO,
            property: 'country',
            operator: '=',
            value: ['China'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526770],
            dataType: MetadataValueType.INTEGER,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526780],
            dataType: MetadataValueType.INTEGER,
          },
        ],
      },
      eventAndConditions: [
        {
          eventName: 'add_button_click',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526780],
                dataType: MetadataValueType.INTEGER,
              },
            ],
          },
        },
        {
          eventName: 'note_share',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'note_export',
          computeMethod: ExploreComputeMethod.USER_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
            ],
          },
        },
      ],
      pathAnalysis: {
        platform: MetadataPlatform.ANDROID,
        sessionType: ExplorePathSessionDef.SESSION,
        nodeType: ExplorePathNodeType.SCREEN_NAME,
        nodes: ['NotepadActivity', 'NotepadExportActivity', 'NotepadShareActivity', 'NotepadPrintActivity'],
      },
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2023-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id,
          user_first_touch_timestamp,
          _first_visit_date,
          _first_referer,
          _first_traffic_source_type,
          _first_traffic_medium,
          _first_traffic_source,
          _channel,
          user_properties.key::varchar as user_param_key,
          user_properties.value.string_value::varchar as user_param_string_value,
          user_properties.value.int_value::bigint as user_param_int_value,
          user_properties.value.float_value::double precision as user_param_float_value,
          user_properties.value.double_value::double precision as user_param_double_value
        from
          app1.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2023-10-10'
          and event.event_name = '_screen_view'
          and platform = 'Android'
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          _session_duration,
          _session_id,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = '_session_duration' then event_param_int_value
                  else null
                end
              ) as _session_duration,
              max(
                case
                  when event_param_key = '_session_id' then event_param_int_value
                  else null
                end
              ) as _session_id
            from
              event_base
              join app1.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = '_user_first_touch_timestamp' then user_param_int_value
                  else null
                end
              ) as _user_first_touch_timestamp
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _user_first_touch_timestamp > 1686532526780
          )
      ),
      mid_table_1 as (
        select
          event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          _session_id
        from
          base_data
      ),
      mid_table_2 as (
        select
          base_data.event_timestamp,
          base_data.event_id,
          max(event_param.event_param_string_value) as node
        from
          base_data
          join app1.event_parameter as event_param on base_data.event_timestamp = event_param.event_timestamp
          and base_data.event_id = event_param.event_id
        where
          event_param.event_param_key = '_screen_name'
        group by
          1,
          2
      ),
      mid_table as (
        select
          mid_table_1.*,
          mid_table_2.node
        from
          mid_table_1
          join mid_table_2 on mid_table_1.event_id = mid_table_2.event_id
      ),
      data as (
        select
          event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          _session_id,
          case
            when node in (
              'NotepadActivity',
              'NotepadExportActivity',
              'NotepadShareActivity',
              'NotepadPrintActivity'
            ) then node
            else 'other'
          end as node,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              _session_id
            ORDER BY
              event_timestamp asc
          ) as step_1,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              _session_id
            ORDER BY
              event_timestamp asc
          ) + 1 as step_2
        from
          mid_table
      ),
      step_table_1 as (
        select
          user_pseudo_id,
          _session_id,
          min(step_1) min_step
        from
          data
        where
          node in (
            'NotepadActivity',
            'NotepadExportActivity',
            'NotepadShareActivity',
            'NotepadPrintActivity'
          )
        group by
          user_pseudo_id,
          _session_id
      ),
      step_table_2 as (
        select
          data.*
        from
          data
          join step_table_1 on data.user_pseudo_id = step_table_1.user_pseudo_id
          and data._session_id = step_table_1._session_id
          and data.step_1 >= step_table_1.min_step
      ),
      data_final as (
        select
          event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          _session_id,
          node,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              _session_id
            ORDER BY
              step_1 asc,
              step_2
          ) as step_1,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              _session_id
            ORDER BY
              step_1 asc,
              step_2
          ) + 1 as step_2
        from
          step_table_2
      )
    select
      a.node || '_' || a.step_1 as source,
      CASE
        WHEN b.node is not null THEN b.node || '_' || a.step_2
        ELSE 'lost'
      END as target,
      a.user_pseudo_id as x_id
    from
      data_final a
      left join data_final b on a.user_pseudo_id = b.user_pseudo_id
      and a._session_id = b._session_id
      and a.step_2 = b.step_1
    where
      a.step_2 <= 10
  `.trim().replace(/ /g, ''),
    );

  });

  test('buildNodePathAnalysisView - custom join', () => {

    const sql = buildNodePathAnalysisView({
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      globalEventCondition: {
        conditions: [
          {
            category: ConditionCategory.OTHER,
            property: 'platform',
            operator: '=',
            value: ['Android'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.GEO,
            property: 'country',
            operator: '=',
            value: ['China'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526770],
            dataType: MetadataValueType.INTEGER,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526780],
            dataType: MetadataValueType.INTEGER,
          },
        ],
      },
      eventAndConditions: [
        {
          eventName: 'add_button_click',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526780],
                dataType: MetadataValueType.INTEGER,
              },
            ],
          },
        },
        {
          eventName: 'note_share',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'note_export',
          computeMethod: ExploreComputeMethod.USER_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
            ],
          },
        },
      ],
      pathAnalysis: {
        platform: MetadataPlatform.ANDROID,
        sessionType: ExplorePathSessionDef.CUSTOMIZE,
        lagSeconds: 3600,
        nodeType: ExplorePathNodeType.SCREEN_NAME,
        nodes: ['NotepadActivity', 'NotepadExportActivity', 'NotepadShareActivity', 'NotepadPrintActivity'],
      },
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2023-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    const expectResult = `
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id,
          user_first_touch_timestamp,
          _first_visit_date,
          _first_referer,
          _first_traffic_source_type,
          _first_traffic_medium,
          _first_traffic_source,
          _channel,
          user_properties.key::varchar as user_param_key,
          user_properties.value.string_value::varchar as user_param_string_value,
          user_properties.value.int_value::bigint as user_param_int_value,
          user_properties.value.float_value::double precision as user_param_float_value,
          user_properties.value.double_value::double precision as user_param_double_value
        from
          app1.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event.event_date,
          event.event_name,
          event.event_id,
          event_bundle_sequence_id::bigint as event_bundle_sequence_id,
          event_previous_timestamp::bigint as event_previous_timestamp,
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
          device.viewport_height::bigint as device_viewport_height,
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
          COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
          event.user_id,
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
          ) || '00:00' as hour
        from
          app1.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2023-10-10'
          and event.event_name = '_screen_view'
          and platform = 'Android'
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          _session_duration,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = '_session_duration' then event_param_int_value
                  else null
                end
              ) as _session_duration
            from
              event_base
              join app1.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = '_user_first_touch_timestamp' then user_param_int_value
                  else null
                end
              ) as _user_first_touch_timestamp
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _user_first_touch_timestamp > 1686532526780
          )
      ),
      mid_table_1 as (
        select
          event_name,
          user_pseudo_id,
          event_id,
          event_timestamp
        from
          base_data
      ),
      mid_table_2 as (
        select
          base_data.event_timestamp,
          base_data.event_id,
          max(event_param.event_param_string_value) as node
        from
          base_data
          join app1.event_parameter as event_param on base_data.event_timestamp = event_param.event_timestamp
          and base_data.event_id = event_param.event_id
        where
          event_param.event_param_key = '_screen_name'
        group by
          1,
          2
      ),
      mid_table as (
        select
          mid_table_1.*,
          mid_table_2.node
        from
          mid_table_1
          join mid_table_2 on mid_table_1.event_id = mid_table_2.event_id
      ),
      data_1 as (
        select
          user_pseudo_id,
          event_id,
          event_timestamp,
          case
            when node in (
              'NotepadActivity',
              'NotepadExportActivity',
              'NotepadShareActivity',
              'NotepadPrintActivity'
            ) then node
            else 'other'
          end as node,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id
            ORDER BY
              event_timestamp asc
          ) as step_1,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id
            ORDER BY
              event_timestamp asc
          ) + 1 as step_2
        from
          mid_table
      ),
      data_2 as (
        select
          a.node,
          a.user_pseudo_id,
          a.event_id,
          a.event_timestamp,
          case
            when (
              b.event_timestamp - a.event_timestamp < 3600000
              and b.event_timestamp - a.event_timestamp >= 0
            ) then 0
            else 1
          end as group_start
        from
          data_1 a
          left join data_1 b on a.user_pseudo_id = b.user_pseudo_id
          and a.step_2 = b.step_1
      ),
      data_3 AS (
        select
          *,
          SUM(group_start) over (
            order by
              user_pseudo_id,
              event_timestamp ROWS BETWEEN UNBOUNDED PRECEDING
              AND CURRENT ROW
          ) AS group_id
        from
          data_2
      ),
      data as (
        select
          node,
          user_pseudo_id,
          event_id,
          event_timestamp,
          group_id,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              group_id
            ORDER BY
              event_timestamp asc
          ) as step_1,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              group_id
            ORDER BY
              event_timestamp asc
          ) + 1 as step_2
        from
          data_3
      ),
      step_table_1 as (
        select
          data.user_pseudo_id user_pseudo_id,
          group_id,
          min(step_1) min_step
        from
          data
        where
          node in (
            'NotepadActivity',
            'NotepadExportActivity',
            'NotepadShareActivity',
            'NotepadPrintActivity'
          )
        group by
          user_pseudo_id,
          group_id
      ),
      step_table_2 as (
        select
          data.*
        from
          data
          join step_table_1 on data.user_pseudo_id = step_table_1.user_pseudo_id
          and data.group_id = step_table_1.group_id
          and data.step_1 >= step_table_1.min_step
      ),
      data_final as (
        select
          node,
          user_pseudo_id,
          event_id,
          group_id,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              group_id
            ORDER BY
              step_1 asc,
              step_2
          ) as step_1,
          ROW_NUMBER() OVER (
            PARTITION BY
              user_pseudo_id,
              group_id
            ORDER BY
              step_1 asc,
              step_2
          ) + 1 as step_2
        from
          step_table_2
      )
    select
      a.node || '_' || a.step_1 as source,
      CASE
        WHEN b.node is not null THEN b.node || '_' || a.step_2
        ELSE 'lost'
      END as target,
      a.user_pseudo_id as x_id
    from
      data_final a
      left join data_final b on a.user_pseudo_id = b.user_pseudo_id
      and a.group_id = b.group_id
      and a.step_2 = b.step_1
    where
      a.step_2 <= 10
    `;
    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));

  });

  test('buildRetentionAnalysisView', () => {

    const sql = buildRetentionAnalysisView({
      schemaName: 'app1',
      computeMethod: ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      groupCondition: {
        category: ConditionCategory.GEO,
        property: 'country',
        dataType: MetadataValueType.STRING,

      },
      globalEventCondition: {
        conditions: [
          {
            category: ConditionCategory.OTHER,
            property: 'platform',
            operator: '=',
            value: ['Android'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.GEO,
            property: 'country',
            operator: '=',
            value: ['China'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526770],
            dataType: MetadataValueType.INTEGER,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526780],
            dataType: MetadataValueType.INTEGER,
          },
        ],
      },
      pairEventAndConditions: [
        {
          startEvent: {
            eventName: 'add_button_click',
            sqlCondition: {
              conditionOperator: 'and',
              conditions: [
                {
                  category: ConditionCategory.OTHER,
                  property: 'platform',
                  operator: '=',
                  value: ['Android'],
                  dataType: MetadataValueType.STRING,
                },
                {
                  category: ConditionCategory.GEO,
                  property: 'country',
                  operator: '=',
                  value: ['China'],
                  dataType: MetadataValueType.STRING,
                },
                {
                  category: ConditionCategory.USER,
                  property: '_user_first_touch_timestamp',
                  operator: '>',
                  value: [1686532526770],
                  dataType: MetadataValueType.INTEGER,
                },
                {
                  category: ConditionCategory.USER,
                  property: '_user_first_touch_timestamp',
                  operator: '>',
                  value: [1686532526780],
                  dataType: MetadataValueType.INTEGER,
                },
              ],
            },
          },
          backEvent: {
            eventName: 'note_export',
            sqlCondition: {
              conditionOperator: 'and',
              conditions: [
                {
                  category: ConditionCategory.OTHER,
                  property: 'platform',
                  operator: '=',
                  value: ['Android'],
                  dataType: MetadataValueType.STRING,
                },
                {
                  category: ConditionCategory.GEO,
                  property: 'country',
                  operator: '=',
                  value: ['China'],
                  dataType: MetadataValueType.STRING,
                },
                {
                  category: ConditionCategory.USER,
                  property: '_user_first_touch_timestamp',
                  operator: '>',
                  value: [1686532526770],
                  dataType: MetadataValueType.INTEGER,
                },
                {
                  category: ConditionCategory.EVENT,
                  property: '_session_duration',
                  operator: '>',
                  value: [200],
                  dataType: MetadataValueType.INTEGER,
                },
              ],
            },
          },
        },
        {
          startEvent: {
            eventName: 'add_button_click',
            sqlCondition: {
              conditionOperator: 'and',
              conditions: [
                {
                  category: ConditionCategory.OTHER,
                  property: 'platform',
                  operator: '=',
                  value: ['Android'],
                  dataType: MetadataValueType.STRING,
                },
                {
                  category: ConditionCategory.GEO,
                  property: 'country',
                  operator: '=',
                  value: ['China'],
                  dataType: MetadataValueType.STRING,
                },
                {
                  category: ConditionCategory.USER,
                  property: '_user_first_touch_timestamp',
                  operator: '>',
                  value: [1686532526770],
                  dataType: MetadataValueType.INTEGER,
                },
                {
                  category: ConditionCategory.USER,
                  property: '_user_first_touch_timestamp',
                  operator: '>',
                  value: [1686532526780],
                  dataType: MetadataValueType.INTEGER,
                },
              ],
            },
          },
          backEvent: {
            eventName: 'note_share',
            sqlCondition: {
              conditionOperator: 'and',
              conditions: [
                {
                  category: ConditionCategory.OTHER,
                  property: 'platform',
                  operator: '=',
                  value: ['Android'],
                  dataType: MetadataValueType.STRING,
                },
                {
                  category: ConditionCategory.GEO,
                  property: 'country',
                  operator: '=',
                  value: ['China'],
                  dataType: MetadataValueType.STRING,
                },
                {
                  category: ConditionCategory.USER,
                  property: '_user_first_touch_timestamp',
                  operator: '>',
                  value: [1686532526770],
                  dataType: MetadataValueType.INTEGER,
                },
                {
                  category: ConditionCategory.EVENT,
                  property: '_session_duration',
                  operator: '>',
                  value: [200],
                  dataType: MetadataValueType.INTEGER,
                },
              ],
            },
          },
        },

      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2023-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    const expectResult = `
    with
    user_base as (
      select
        COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
        user_id,
        user_first_touch_timestamp,
        _first_visit_date,
        _first_referer,
        _first_traffic_source_type,
        _first_traffic_medium,
        _first_traffic_source,
        _channel,
        user_properties.key::varchar as user_param_key,
        user_properties.value.string_value::varchar as user_param_string_value,
        user_properties.value.int_value::bigint as user_param_int_value,
        user_properties.value.float_value::double precision as user_param_float_value,
        user_properties.value.double_value::double precision as user_param_double_value
      from
        app1.user_m_view u,
        u.user_properties as user_properties
    ),
    event_base as (
      select
        event.event_date,
        event.event_name,
        event.event_id,
        event_bundle_sequence_id::bigint as event_bundle_sequence_id,
        event_previous_timestamp::bigint as event_previous_timestamp,
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
        device.viewport_height::bigint as device_viewport_height,
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
        COALESCE(event.user_id, event.user_pseudo_id) as user_pseudo_id,
        event.user_id,
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
        ) || '00:00' as hour
      from
        app1.event as event
      where
        event.event_date >= date '2023-10-01'
        and event.event_date <= date '2023-10-10'
        and event.event_name in ('add_button_click', 'note_export', 'note_share')
    ),
    base_data as (
      select
        _user_first_touch_timestamp,
        _session_duration,
        event_base.*
      from
        event_base
        join (
          select
            event_base.event_id,
            max(
              case
                when event_param_key = '_session_duration' then event_param_int_value
                else null
              end
            ) as _session_duration
          from
            event_base
            join app1.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
            and event_base.event_id = event_param.event_id
          group by
            event_base.event_id
        ) as event_join_table on event_base.event_id = event_join_table.event_id
        join (
          select
            event_base.user_pseudo_id,
            max(
              case
                when user_param_key = '_user_first_touch_timestamp' then user_param_int_value
                else null
              end
            ) as _user_first_touch_timestamp
          from
            event_base
            join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
          group by
            event_base.user_pseudo_id
        ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
      where
        1 = 1
        and (
          platform = 'Android'
          and geo_country = 'China'
          and _user_first_touch_timestamp > 1686532526770
          and _user_first_touch_timestamp > 1686532526780
        )
    ),
    first_date as (
      select
        min(event_date) as first_date
      from
        base_data
    ),
    date_list as (
      select
        '2023-10-01'::date as event_date
      union all
      select
        '2023-10-02'::date as event_date
      union all
      select
        '2023-10-03'::date as event_date
      union all
      select
        '2023-10-04'::date as event_date
      union all
      select
        '2023-10-05'::date as event_date
      union all
      select
        '2023-10-06'::date as event_date
      union all
      select
        '2023-10-07'::date as event_date
      union all
      select
        '2023-10-08'::date as event_date
      union all
      select
        '2023-10-09'::date as event_date
      union all
      select
        '2023-10-10'::date as event_date
    ),
    first_table_0 as (
      select
        event_date,
        event_name,
        geo_country,
        user_pseudo_id
      from
        base_data
        join first_date on base_data.event_date = first_date.first_date
      where
        event_name = 'add_button_click'
        and (
          platform = 'Android'
          and geo_country = 'China'
          and _user_first_touch_timestamp > 1686532526770
          and _user_first_touch_timestamp > 1686532526780
        )
    ),
    second_table_0 as (
      select
        event_date,
        event_name,
        geo_country,
        user_pseudo_id
      from
        base_data
        join first_date on base_data.event_date >= first_date.first_date
      where
        event_name = 'note_export'
        and (
          platform = 'Android'
          and geo_country = 'China'
          and _user_first_touch_timestamp > 1686532526770
          and _session_duration > 200
        )
    ),
    first_table_1 as (
      select
        event_date,
        event_name,
        geo_country,
        user_pseudo_id
      from
        base_data
        join first_date on base_data.event_date = first_date.first_date
      where
        event_name = 'add_button_click'
        and (
          platform = 'Android'
          and geo_country = 'China'
          and _user_first_touch_timestamp > 1686532526770
          and _user_first_touch_timestamp > 1686532526780
        )
    ),
    second_table_1 as (
      select
        event_date,
        event_name,
        geo_country,
        user_pseudo_id
      from
        base_data
        join first_date on base_data.event_date >= first_date.first_date
      where
        event_name = 'note_share'
        and (
          platform = 'Android'
          and geo_country = 'China'
          and _user_first_touch_timestamp > 1686532526770
          and _session_duration > 200
        )
    ),
    result_table as (
      select
        first_table_0.geo_country,
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
        and first_table_0.geo_country = second_table_0.geo_country
      union all
      select
        first_table_1.geo_country,
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
        and first_table_1.geo_country = second_table_1.geo_country
    )
  select
    geo_country as group_col,
    grouping,
    start_event_date,
    event_date,
    (
      count(distinct end_user_pseudo_id)::decimal / NULLIF(count(distinct start_user_pseudo_id), 0)
    )::decimal(20, 4) as retention
  from
    result_table
  group by
    geo_country,
    grouping,
    start_event_date,
    event_date
  order by
    grouping,
    event_date
    `;
    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));

  });


});