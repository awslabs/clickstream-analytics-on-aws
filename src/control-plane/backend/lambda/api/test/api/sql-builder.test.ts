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

import { afterEach } from 'node:test';
import { ConditionCategory, ExploreAggregationMethod, ExploreComputeMethod, ExploreConversionIntervalType, ExploreGroupColumn, ExplorePathNodeType, ExplorePathSessionDef, ExploreRelativeTimeUnit, ExploreTimeScopeType, MetadataPlatform, MetadataValueType } from '../../common/explore-types';
import { getFirstDayOfLastNMonths, getFirstDayOfLastNYears, getMondayOfLastNWeeks } from '../../service/quicksight/reporting-utils';
import { buildFunnelTableView, buildFunnelView, buildEventPathAnalysisView, buildNodePathAnalysisView, buildEventAnalysisView, buildRetentionAnalysisView, ExploreAnalyticsOperators, _buildCommonPartSql, daysBetweenDates, buildEventPropertyAnalysisView } from '../../service/quicksight/sql-builder';

describe('SQL Builder test', () => {

  beforeEach(() => {
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('funnel sql - user_cnt', () => {

    const sql = buildFunnelTableView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: 'view_item',

        },
        {
          eventName: 'add_to_cart',

        },
        {
          eventName: 'purchase',

        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
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
              event_date,
              event_name,
              event_id,
              event_timestamp,
              COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
              r.user_id,
              month,
              week,
              day,
              hour
            from
              (
                select
                  event_date,
                  event_name::varchar as event_name,
                  event_id::varchar as event_id,
                  event_timestamp::bigint as event_timestamp,
                  user_pseudo_id,
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
                  shop.event as event
                where
                  event.event_date >= date '2023-10-01'
                  and event.event_date <= date '2025-10-10'
                  and event.event_name in ('view_item', 'add_to_cart', 'purchase')
              ) as l
              join (
                select
                  user_pseudo_id,
                  user_id
                from
                  shop.user_m_view
                group by
                  user_pseudo_id,
                  user_id
              ) as r on l.user_pseudo_id = r.user_pseudo_id
          ) as event_base
        where
          1 = 1
          and (
            (event_name = 'view_item')
            or (event_name = 'add_to_cart')
            or (event_name = 'purchase')
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
          event_name = 'view_item'
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
          event_name = 'add_to_cart'
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
          event_name = 'purchase'
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
          and table_1.event_timestamp_1 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
          left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
          and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
          and table_2.event_timestamp_2 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
      )
    select
      DAY,
      count(distinct user_pseudo_id_0) as view_item,
      (
        count(distinct user_pseudo_id_2)::decimal / NULLIF(count(distinct user_pseudo_id_0), 0)
      )::decimal(20, 4) as total_conversion_rate,
      count(distinct user_pseudo_id_1) as add_to_cart,
      (
        count(distinct user_pseudo_id_1)::decimal / NULLIF(count(distinct user_pseudo_id_0), 0)
      )::decimal(20, 4) as add_to_cart_rate,
      count(distinct user_pseudo_id_2) as purchase,
      (
        count(distinct user_pseudo_id_2)::decimal / NULLIF(count(distinct user_pseudo_id_1), 0)
      )::decimal(20, 4) as purchase_rate
    from
      join_table
    group by
      DAY
    order by
      DAY,
      view_item desc
    `.trim().replace(/ /g, ''));

  });

  test('funnel sql - event_cnt', () => {

    const sql = buildFunnelTableView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.EVENT_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: 'view_item',

        },
        {
          eventName: 'add_to_cart',

        },
        {
          eventName: 'purchase',

        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
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
              event_date,
              event_name,
              event_id,
              event_timestamp,
              COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
              r.user_id,
              month,
              week,
              day,
              hour
            from
              (
                select
                  event_date,
                  event_name::varchar as event_name,
                  event_id::varchar as event_id,
                  event_timestamp::bigint as event_timestamp,
                  user_pseudo_id,
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
                  shop.event as event
                where
                  event.event_date >= date '2023-10-01'
                  and event.event_date <= date '2025-10-10'
                  and event.event_name in ('view_item', 'add_to_cart', 'purchase')
              ) as l
              join (
                select
                  user_pseudo_id,
                  user_id
                from
                  shop.user_m_view
                group by
                  user_pseudo_id,
                  user_id
              ) as r on l.user_pseudo_id = r.user_pseudo_id
          ) as event_base
        where
          1 = 1
          and (
            (event_name = 'view_item')
            or (event_name = 'add_to_cart')
            or (event_name = 'purchase')
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
          event_name = 'view_item'
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
          event_name = 'add_to_cart'
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
          event_name = 'purchase'
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
          and table_1.event_timestamp_1 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
          left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
          and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
          and table_2.event_timestamp_2 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
      )
    select
      DAY,
      count(distinct event_id_0) as view_item,
      (
        count(distinct event_id_2)::decimal / NULLIF(count(distinct event_id_0), 0)
      )::decimal(20, 4) as total_conversion_rate,
      count(distinct event_id_1) as add_to_cart,
      (
        count(distinct event_id_1)::decimal / NULLIF(count(distinct event_id_0), 0)
      )::decimal(20, 4) as add_to_cart_rate,
      count(distinct event_id_2) as purchase,
      (
        count(distinct event_id_2)::decimal / NULLIF(count(distinct event_id_1), 0)
      )::decimal(20, 4) as purchase_rate
    from
      join_table
    group by
      DAY
    order by
      DAY,
      view_item desc
      `.trim().replace(/ /g, ''),
    );

  });

  test('funnel sql - conversionIntervalType', () => {

    const sql = buildFunnelTableView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.EVENT_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CURRENT_DAY,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: 'view_item',

        },
        {
          eventName: 'add_to_cart',

        },
        {
          eventName: 'purchase',

        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
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
            event_date,
            event_name,
            event_id,
            event_timestamp,
            COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
            r.user_id,
            month,
            week,
            day,
            hour
          from
            (
              select
                event_date,
                event_name::varchar as event_name,
                event_id::varchar as event_id,
                event_timestamp::bigint as event_timestamp,
                user_pseudo_id,
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
                shop.event as event
              where
                event.event_date >= date '2023-10-01'
                and event.event_date <= date '2025-10-10'
                and event.event_name in ('view_item', 'add_to_cart', 'purchase')
            ) as l
        join (
          select
            user_pseudo_id,
            user_id
          from
            shop.user_m_view
          group by
            user_pseudo_id,
            user_id
        ) as r on l.user_pseudo_id = r.user_pseudo_id
        ) as event_base
      where
        1 = 1
        and (
          (event_name = 'view_item')
          or (event_name = 'add_to_cart')
          or (event_name = 'purchase')
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
        event_name = 'view_item'
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
        event_name = 'add_to_cart'
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
        event_name = 'purchase'
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
        and TO_CHAR(
          TIMESTAMP 'epoch' + cast(table_0.event_timestamp_0 / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD'
        ) = TO_CHAR(
          TIMESTAMP 'epoch' + cast(table_1.event_timestamp_1 / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD'
        )
        left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
        and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
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
    count(distinct event_id_0) as view_item,
    (
      count(distinct event_id_2)::decimal / NULLIF(count(distinct event_id_0), 0)
    )::decimal(20, 4) as total_conversion_rate,
    count(distinct event_id_1) as add_to_cart,
    (
      count(distinct event_id_1)::decimal / NULLIF(count(distinct event_id_0), 0)
    )::decimal(20, 4) as add_to_cart_rate,
    count(distinct event_id_2) as purchase,
    (
      count(distinct event_id_2)::decimal / NULLIF(count(distinct event_id_1), 0)
    )::decimal(20, 4) as purchase_rate
  from
    join_table
  group by
    DAY
  order by
    DAY,
    view_item desc
  `.trim().replace(/ /g, ''),
    );

  });

  test('funnel sql - specifyJoinColumn', () => {

    const sql = buildFunnelTableView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.EVENT_CNT,
      specifyJoinColumn: false,
      conversionIntervalType: ExploreConversionIntervalType.CURRENT_DAY,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: 'view_item',

        },
        {
          eventName: 'add_to_cart',

        },
        {
          eventName: 'purchase',

        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
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
              event_date,
              event_name,
              event_id,
              event_timestamp,
              COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
              r.user_id,
              month,
              week,
              day,
              hour
            from
              (
                select
                  event_date,
                  event_name::varchar as event_name,
                  event_id::varchar as event_id,
                  event_timestamp::bigint as event_timestamp,
                  user_pseudo_id,
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
                  shop.event as event
                where
                  event.event_date >= date '2023-10-01'
                  and event.event_date <= date '2025-10-10'
                  and event.event_name in ('view_item', 'add_to_cart', 'purchase')
              ) as l
              join (
                select
                  user_pseudo_id,
                  user_id
                from
                  shop.user_m_view
                group by
                  user_pseudo_id,
                  user_id
              ) as r on l.user_pseudo_id = r.user_pseudo_id
          ) as event_base
        where
          1 = 1
          and (
            (event_name = 'view_item')
            or (event_name = 'add_to_cart')
            or (event_name = 'purchase')
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
          event_name = 'view_item'
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
          event_name = 'add_to_cart'
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
          event_name = 'purchase'
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
          and TO_CHAR(
            TIMESTAMP 'epoch' + cast(table_0.event_timestamp_0 / 1000 as bigint) * INTERVAL '1 second',
            'YYYY-MM-DD'
          ) = TO_CHAR(
            TIMESTAMP 'epoch' + cast(table_1.event_timestamp_1 / 1000 as bigint) * INTERVAL '1 second',
            'YYYY-MM-DD'
          )
          left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
          and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
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
      count(distinct event_id_0) as view_item,
      (
        count(distinct event_id_2)::decimal / NULLIF(count(distinct event_id_0), 0)
      )::decimal(20, 4) as total_conversion_rate,
      count(distinct event_id_1) as add_to_cart,
      (
        count(distinct event_id_1)::decimal / NULLIF(count(distinct event_id_0), 0)
      )::decimal(20, 4) as add_to_cart_rate,
      count(distinct event_id_2) as purchase,
      (
        count(distinct event_id_2)::decimal / NULLIF(count(distinct event_id_1), 0)
      )::decimal(20, 4) as purchase_rate
    from
      join_table
    group by
      DAY
    order by
      DAY,
      view_item desc
  `.trim().replace(/ /g, ''),
    );

  });

  test('funnel table visual sql - conditions', () => {

    const sql = buildFunnelTableView( {
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: 'view_item',
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
          eventName: 'add_to_cart',
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
          eventName: 'purchase',
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
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
              event_date,
              event_name,
              event_id,
              event_timestamp,
              platform,
              device_screen_height,
              COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
              r.user_id,
              month,
              week,
              day,
              hour
            from
              (
                select
                  event_date,
                  event_name::varchar as event_name,
                  event_id::varchar as event_id,
                  event_timestamp::bigint as event_timestamp,
                  platform::varchar as platform,
                  device.screen_height::bigint as device_screen_height,
                  user_pseudo_id,
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
                  shop.event as event
                where
                  event.event_date >= date '2023-10-01'
                  and event.event_date <= date '2025-10-10'
                  and event.event_name in ('view_item', 'add_to_cart', 'purchase')
              ) as l
              join (
                select
                  user_pseudo_id,
                  user_id
                from
                  shop.user_m_view
                group by
                  user_pseudo_id,
                  user_id
              ) as r on l.user_pseudo_id = r.user_pseudo_id
          ) as event_base
        where
          1 = 1
          and (
            (
              event_name = 'view_item'
              and (
                platform = 'Android'
                and (
                  device_screen_height is null 
                  or device_screen_height <> 1400
                )
              )
            )
            or (
              event_name = 'add_to_cart'
              and (
                platform = 'Android'
                and (
                  device_screen_height is null 
                  or device_screen_height <> 1400
                )
              )
            )
            or (event_name = 'purchase')
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
          event_name = 'view_item'
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
          event_name = 'add_to_cart'
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
          event_name = 'purchase'
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
          and table_1.event_timestamp_1 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
          left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
          and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
          and table_2.event_timestamp_2 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
      )
    select
      DAY,
      count(distinct user_pseudo_id_0) as view_item,
      (
        count(distinct user_pseudo_id_2)::decimal / NULLIF(count(distinct user_pseudo_id_0), 0)
      )::decimal(20, 4) as total_conversion_rate,
      count(distinct user_pseudo_id_1) as add_to_cart,
      (
        count(distinct user_pseudo_id_1)::decimal / NULLIF(count(distinct user_pseudo_id_0), 0)
      )::decimal(20, 4) as add_to_cart_rate,
      count(distinct user_pseudo_id_2) as purchase,
      (
        count(distinct user_pseudo_id_2)::decimal / NULLIF(count(distinct user_pseudo_id_1), 0)
      )::decimal(20, 4) as purchase_rate
    from
      join_table
    group by
      DAY
    order by
      DAY,
      view_item desc
  `.trim().replace(/ /g, ''),
    );

  });

  test('funnel chart visual sql - conditions', () => {

    const sql = buildFunnelView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: '_first_open',
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
          eventName: '_scroll',
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
          eventName: '_user_engagement',
        },
        {
          eventName: '_app_end',
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
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
              event_date,
              event_name,
              event_id,
              event_timestamp,
              platform,
              device_screen_height,
              COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
              r.user_id,
              month,
              week,
              day,
              hour
            from
              (
                select
                  event_date,
                  event_name::varchar as event_name,
                  event_id::varchar as event_id,
                  event_timestamp::bigint as event_timestamp,
                  platform::varchar as platform,
                  device.screen_height::bigint as device_screen_height,
                  user_pseudo_id,
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
                  shop.event as event
                where
                  event.event_date >= date '2023-10-01'
                  and event.event_date <= date '2025-10-10'
                  and event.event_name in (
                    '_first_open',
                    '_scroll',
                    '_user_engagement',
                    '_app_end'
                  )
              ) as l
              join (
                select
                  user_pseudo_id,
                  user_id
                from
                  shop.user_m_view
                group by
                  user_pseudo_id,
                  user_id
              ) as r on l.user_pseudo_id = r.user_pseudo_id
          ) as event_base
        where
          1 = 1
          and (
            (
              event_name = '_first_open'
              and (
                platform = 'Android'
                and (
                  device_screen_height is null 
                  or device_screen_height <> 1400
                )
              )
            )
            or (
              event_name = '_scroll'
              and (
                platform = 'Android'
                and (
                  device_screen_height is null 
                  or device_screen_height <> 1400
                )
              )
            )
            or (event_name = '_user_engagement')
            or (event_name = '_app_end')
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
          event_name = '_first_open'
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
          event_name = '_scroll'
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
          event_name = '_user_engagement'
      ),
      table_3 as (
        select
          event_date as event_date_3,
          event_name as event_name_3,
          event_timestamp as event_timestamp_3,
          event_id as event_id_3,
          user_id as user_id_3,
          user_pseudo_id as user_pseudo_id_3
        from
          base_data base
        where
          event_name = '_app_end'
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
          table_2.event_timestamp_2,
          table_3.event_id_3,
          table_3.event_name_3,
          table_3.user_pseudo_id_3,
          table_3.event_timestamp_3
        from
          table_0
          left outer join table_1 on table_0.user_pseudo_id_0 = table_1.user_pseudo_id_1
          and table_1.event_timestamp_1 - table_0.event_timestamp_0 > 0
          and table_1.event_timestamp_1 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
          left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
          and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
          and table_2.event_timestamp_2 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
          left outer join table_3 on table_2.user_pseudo_id_2 = table_3.user_pseudo_id_3
          and table_3.event_timestamp_3 - table_2.event_timestamp_2 > 0
          and table_3.event_timestamp_3 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
      ),
      seq_table as (
        select
          0 as seq
        union all
        select
          1 as seq
        union all
        select
          2 as seq
        union all
        select
          3 as seq
      ),
      final_table as (
        select
          day,
          user_pseudo_id_0,
          user_pseudo_id_1,
          user_pseudo_id_2,
          user_pseudo_id_3,
          case
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is not null
            and user_pseudo_id_3 is not null then case
              when seq = 0 then user_pseudo_id_0
              when seq = 1 then user_pseudo_id_1
              when seq = 2 then user_pseudo_id_2
              when seq = 3 then user_pseudo_id_3
              else null
            end
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is not null
            and user_pseudo_id_3 is null then case
              when seq = 0 then user_pseudo_id_0
              when seq = 1 then user_pseudo_id_1
              when seq = 2 then user_pseudo_id_2
              else null
            end
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is null
            and user_pseudo_id_3 is null then case
              when seq = 0 then user_pseudo_id_0
              when seq = 1 then user_pseudo_id_1
              else null
            end
            when user_pseudo_id_1 is null
            and user_pseudo_id_2 is null
            and user_pseudo_id_3 is null then case
              when seq = 0 then user_pseudo_id_0
              else null
            end
          end as user_pseudo_id,
          case
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is not null
            and user_pseudo_id_3 is not null then case
              when seq = 0 then '1_' || event_name_0
              when seq = 1 then '2_' || event_name_1
              when seq = 2 then '3_' || event_name_2
              when seq = 3 then '4_' || event_name_3
              else null
            end
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is not null
            and user_pseudo_id_3 is null then case
              when seq = 0 then '1_' || event_name_0
              when seq = 1 then '2_' || event_name_1
              when seq = 2 then '3_' || event_name_2
              else null
            end
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is null
            and user_pseudo_id_3 is null then case
              when seq = 0 then '1_' || event_name_0
              when seq = 1 then '2_' || event_name_1
              else null
            end
            when user_pseudo_id_1 is null
            and user_pseudo_id_2 is null
            and user_pseudo_id_3 is null then case
              when seq = 0 then '1_' || event_name_0
              else null
            end
          end as event_name
        from
          join_table
          join seq_table on 1 = 1
      )
    select
      day::date as event_date,
      event_name,
      user_pseudo_id
    from
      final_table
    where
      event_name is not null
  `.trim().replace(/ /g, ''),
    );

  });

  test('event analysis sql', () => {

    const sql = buildEventAnalysisView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: false,
      eventAndConditions: [
        {
          eventName: 'view_item',
          computeMethod: ExploreComputeMethod.USER_ID_CNT,
        },
        {
          eventName: 'add_to_cart',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'purchase',
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
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
              event_date,
              event_name,
              event_id,
              event_timestamp,
              COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
              r.user_id,
              month,
              week,
              day,
              hour
            from
              (
                select
                  event_date,
                  event_name::varchar as event_name,
                  event_id::varchar as event_id,
                  event_timestamp::bigint as event_timestamp,
                  user_pseudo_id,
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
                  shop.event as event
                where
                  event.event_date >= date '2023-10-01'
                  and event.event_date <= date '2025-10-10'
                  and event.event_name in ('view_item', 'add_to_cart', 'purchase')
              ) as l
              join (
                select
                  user_pseudo_id,
                  user_id
                from
                  shop.user_m_view
                group by
                  user_pseudo_id,
                  user_id
              ) as r on l.user_pseudo_id = r.user_pseudo_id
          ) as event_base
        where
          1 = 1
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
          event_name = 'view_item'
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
          event_name = 'add_to_cart'
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
          event_name = 'purchase'
      ),
      join_table as (
        select
          table_0.month,
          table_0.week,
          table_0.day,
          table_0.hour,
          1 || '_' || table_0.event_name_0 as event_name,
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
          2 || '_' || table_1.event_name_1 as event_name,
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
          3 || '_' || table_2.event_name_2 as event_name,
          table_2.event_timestamp_2 as event_timestamp,
          table_2.event_id_2 as x_id
        from
          table_2
      )
    select
      day::date as event_date,
      event_name,
      x_id as id
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
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: 'view_item',
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
          eventName: 'add_to_cart',
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
          eventName: 'purchase',
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      groupColumn: ExploreGroupColumn.DAY,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      pathAnalysis: {
        sessionType: ExplorePathSessionDef.SESSION,
        nodeType: ExplorePathNodeType.EVENT,
        lagSeconds: 3600,
        includingOtherEvents: true,
      },
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          platform,
          device_screen_height,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              platform::varchar as platform,
              device.screen_height::bigint as device_screen_height,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
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
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
        where
          1 = 1
          and (
            (
              event_name = 'view_item'
              and (
                platform = 'Android'
                and (
                  device_screen_height is null 
                  or device_screen_height <> 1400
                )
              )
            )
            or (
              event_name = 'add_to_cart'
              and (
                platform = 'Android'
                or (
                  device_screen_height is null 
                  or device_screen_height <> 1400
                )
              )
            )
            or (event_name = 'purchase')
            or (
              event_name not in ('view_item', 'add_to_cart', 'purchase')
            )
          )
      ),
      mid_table as (
        select
          CASE
            WHEN event_name in ('view_item', 'add_to_cart', 'purchase') THEN event_name
            ELSE 'other'
          END as event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          event_date,
          _session_id
        from
          base_data
      ),
      data as (
        select
          *,
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
          data.user_pseudo_id user_pseudo_id,
          data._session_id _session_id,
          min(step_1) min_step
        from
          data
        where
          event_name = 'view_item'
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
          event_date,
          user_pseudo_id,
          event_id,
          event_timestamp,
          _session_id,
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
      a.event_date,
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
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: 'view_item',
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
          eventName: 'add_to_cart',
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
          eventName: 'purchase',
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      groupColumn: ExploreGroupColumn.DAY,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
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
              event_date,
              event_name,
              event_id,
              event_timestamp,
              platform,
              device_screen_height,
              COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
              r.user_id,
              month,
              week,
              day,
              hour
            from
              (
                select
                  event_date,
                  event_name::varchar as event_name,
                  event_id::varchar as event_id,
                  event_timestamp::bigint as event_timestamp,
                  platform::varchar as platform,
                  device.screen_height::bigint as device_screen_height,
                  user_pseudo_id,
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
                  shop.event as event
                where
                  event.event_date >= date '2023-10-01'
                  and event.event_date <= date '2025-10-10'
                  and event.event_name in ('view_item', 'add_to_cart', 'purchase')
              ) as l
              join (
                select
                  user_pseudo_id,
                  user_id
                from
                  shop.user_m_view
                group by
                  user_pseudo_id,
                  user_id
              ) as r on l.user_pseudo_id = r.user_pseudo_id
          ) as event_base
        where
          1 = 1
          and (
            (
              event_name = 'view_item'
              and (
                platform = 'Android'
                and (
                  device_screen_height is null 
                  or device_screen_height <> 1400
                )
              )
            )
            or (
              event_name = 'add_to_cart'
              and (
                platform = 'Android'
                or (
                  device_screen_height is null 
                  or device_screen_height <> 1400
                )
              )
            )
            or (event_name = 'purchase')
          )
      ),
      mid_table as (
        select
          CASE
            WHEN event_name in ('view_item', 'add_to_cart', 'purchase') THEN event_name
            ELSE 'other'
          END as event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          event_date
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
          a.event_date,
          case
            when (
              b.event_timestamp - a.event_timestamp < 3600 * cast(1000 as bigint)
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
          event_date,
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
          min(step_1) min_step,
          min(event_timestamp) event_timestamp
        from
          data
        where
          event_name = 'view_item'
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
          event_date,
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
      a.event_date event_date,
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
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      timeScopeType: ExploreTimeScopeType.FIXED,
      groupColumn: ExploreGroupColumn.DAY,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      pathAnalysis: {
        platform: MetadataPlatform.ANDROID,
        sessionType: ExplorePathSessionDef.SESSION,
        nodeType: ExplorePathNodeType.SCREEN_NAME,
        lagSeconds: 3600,
        nodes: ['NotepadActivity', 'NotepadExportActivity', 'NotepadShareActivity', 'NotepadPrintActivity'],
        includingOtherEvents: true,
      },
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
              and event.event_name = '_screen_view'
              and platform = 'Android'
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
          event_date,
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
          join shop.event_parameter as event_param on base_data.event_timestamp = event_param.event_timestamp
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
          event_date,
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
          node = 'NotepadActivity'
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
          event_date,
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
      a.event_date event_date,
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

  test('node path analysis view - merge consecutive nodes', () => {

    const sql = buildNodePathAnalysisView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      timeScopeType: ExploreTimeScopeType.FIXED,
      groupColumn: ExploreGroupColumn.DAY,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      pathAnalysis: {
        platform: MetadataPlatform.ANDROID,
        sessionType: ExplorePathSessionDef.SESSION,
        nodeType: ExplorePathNodeType.SCREEN_NAME,
        lagSeconds: 3600,
        nodes: ['NotepadActivity', 'NotepadExportActivity', 'NotepadShareActivity', 'NotepadPrintActivity'],
        mergeConsecutiveEvents: true,
        includingOtherEvents: true,
      },
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
              and event.event_name = '_screen_view'
              and platform = 'Android'
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
          event_date,
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
          join shop.event_parameter as event_param on base_data.event_timestamp = event_param.event_timestamp
          and base_data.event_id = event_param.event_id
        where
          event_param.event_param_key = '_screen_name'
        group by
          1,
          2
      ),
      mid_table as (
        select
          event_name,
          event_date,
          user_pseudo_id,
          event_id,
          event_timestamp,
          _session_id,
          node
        from
          (
            select
              mid_table_1.*,
              mid_table_2.node,
              ROW_NUMBER() over (
                partition by
                  event_name,
                  user_pseudo_id,
                  _session_id,
                  node
                order by
                  mid_table_1.event_timestamp desc
              ) as rk
            from
              mid_table_1
              join mid_table_2 on mid_table_1.event_id = mid_table_2.event_id
          )
        where
          rk = 1
      ),
      data as (
        select
          event_name,
          event_date,
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
          node = 'NotepadActivity'
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
          event_date,
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
      a.event_date event_date,
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

  test('node path analysis view - exclude other Events', () => {

    const sql = buildNodePathAnalysisView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      timeScopeType: ExploreTimeScopeType.FIXED,
      groupColumn: ExploreGroupColumn.DAY,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      pathAnalysis: {
        platform: MetadataPlatform.ANDROID,
        sessionType: ExplorePathSessionDef.SESSION,
        nodeType: ExplorePathNodeType.SCREEN_NAME,
        lagSeconds: 3600,
        nodes: ['NotepadActivity', 'NotepadExportActivity', 'NotepadShareActivity', 'NotepadPrintActivity'],
        includingOtherEvents: false,
      },
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
              and event.event_name = '_screen_view'
              and platform = 'Android'
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
          event_date,
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
          join shop.event_parameter as event_param on base_data.event_timestamp = event_param.event_timestamp
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
          event_date,
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
        where
          node in (
            'NotepadActivity',
            'NotepadExportActivity',
            'NotepadShareActivity',
            'NotepadPrintActivity'
          )
      ),
      step_table_1 as (
        select
          user_pseudo_id,
          _session_id,
          min(step_1) min_step
        from
          data
        where
          node = 'NotepadActivity'
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
          event_date,
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
      a.event_date event_date,
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
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: false,
      timeScopeType: ExploreTimeScopeType.FIXED,
      groupColumn: ExploreGroupColumn.DAY,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      pathAnalysis: {
        platform: MetadataPlatform.ANDROID,
        sessionType: ExplorePathSessionDef.CUSTOMIZE,
        nodeType: ExplorePathNodeType.SCREEN_NAME,
        lagSeconds: 3600,
        nodes: ['NotepadActivity', 'NotepadExportActivity', 'NotepadShareActivity', 'NotepadPrintActivity'],
        includingOtherEvents: true,
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
              event_date,
              event_name,
              event_id,
              event_timestamp,
              COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
              r.user_id,
              month,
              week,
              day,
              hour
            from
              (
                select
                  event_date,
                  event_name::varchar as event_name,
                  event_id::varchar as event_id,
                  event_timestamp::bigint as event_timestamp,
                  user_pseudo_id,
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
                  shop.event as event
                where
                  event.event_date >= date '2023-10-01'
                  and event.event_date <= date '2025-10-10'
                  and event.event_name = '_screen_view'
                  and platform = 'Android'
              ) as l
              join (
                select
                  user_pseudo_id,
                  user_id
                from
                  shop.user_m_view
                group by
                  user_pseudo_id,
                  user_id
              ) as r on l.user_pseudo_id = r.user_pseudo_id
          ) as event_base
        where
          1 = 1
      ),
      mid_table_1 as (
        select
          event_name,
          event_date,
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
          join shop.event_parameter as event_param on base_data.event_timestamp = event_param.event_timestamp
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
          event_date,
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
          a.event_date,
          case
            when (
              b.event_timestamp - a.event_timestamp < 3600 * cast(1000 as bigint)
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
          event_date,
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
          min(step_1) min_step,
          min(event_timestamp) event_timestamp
        from
          data
        where
          node = 'NotepadActivity'
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
          event_date,
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
      a.event_date event_date,
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

  test('node path analysis view - sessionType=customize - merge consecutive nodes ', () => {

    const sql = buildNodePathAnalysisView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: false,
      timeScopeType: ExploreTimeScopeType.FIXED,
      groupColumn: ExploreGroupColumn.DAY,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      pathAnalysis: {
        platform: MetadataPlatform.ANDROID,
        sessionType: ExplorePathSessionDef.CUSTOMIZE,
        nodeType: ExplorePathNodeType.SCREEN_NAME,
        lagSeconds: 3600,
        nodes: ['NotepadActivity', 'NotepadExportActivity', 'NotepadShareActivity', 'NotepadPrintActivity'],
        mergeConsecutiveEvents: true,
        includingOtherEvents: true,
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
              event_date,
              event_name,
              event_id,
              event_timestamp,
              COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
              r.user_id,
              month,
              week,
              day,
              hour
            from
              (
                select
                  event_date,
                  event_name::varchar as event_name,
                  event_id::varchar as event_id,
                  event_timestamp::bigint as event_timestamp,
                  user_pseudo_id,
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
                  shop.event as event
                where
                  event.event_date >= date '2023-10-01'
                  and event.event_date <= date '2025-10-10'
                  and event.event_name = '_screen_view'
                  and platform = 'Android'
              ) as l
              join (
                select
                  user_pseudo_id,
                  user_id
                from
                  shop.user_m_view
                group by
                  user_pseudo_id,
                  user_id
              ) as r on l.user_pseudo_id = r.user_pseudo_id
          ) as event_base
        where
          1 = 1
      ),
      mid_table_1 as (
        select
          event_name,
          event_date,
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
          join shop.event_parameter as event_param on base_data.event_timestamp = event_param.event_timestamp
          and base_data.event_id = event_param.event_id
        where
          event_param.event_param_key = '_screen_name'
        group by
          1,
          2
      ),
      mid_table as (
        select
          event_name,
          event_date,
          user_pseudo_id,
          event_id,
          event_timestamp,
          node
        from
          (
            select
              mid_table_1.*,
              mid_table_2.node,
              ROW_NUMBER() over (
                partition by
                  event_name,
                  user_pseudo_id,
                  node
                order by
                  mid_table_1.event_timestamp desc
              ) as rk
            from
              mid_table_1
              join mid_table_2 on mid_table_1.event_id = mid_table_2.event_id
          )
        where
          rk = 1
      ),
      data_1 as (
        select
          user_pseudo_id,
          event_id,
          event_date,
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
          a.event_date,
          case
            when (
              b.event_timestamp - a.event_timestamp < 3600 * cast(1000 as bigint)
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
          event_date,
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
          min(step_1) min_step,
          min(event_timestamp) event_timestamp
        from
          data
        where
          node = 'NotepadActivity'
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
          event_date,
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
      a.event_date event_date,
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

  test('node path analysis view - sessionType=customize - exclude other events ', () => {

    const sql = buildNodePathAnalysisView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: false,
      timeScopeType: ExploreTimeScopeType.FIXED,
      groupColumn: ExploreGroupColumn.DAY,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      pathAnalysis: {
        platform: MetadataPlatform.ANDROID,
        sessionType: ExplorePathSessionDef.CUSTOMIZE,
        nodeType: ExplorePathNodeType.SCREEN_NAME,
        lagSeconds: 3600,
        nodes: ['NotepadActivity', 'NotepadExportActivity', 'NotepadShareActivity', 'NotepadPrintActivity'],
        includingOtherEvents: false,
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
              event_date,
              event_name,
              event_id,
              event_timestamp,
              COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
              r.user_id,
              month,
              week,
              day,
              hour
            from
              (
                select
                  event_date,
                  event_name::varchar as event_name,
                  event_id::varchar as event_id,
                  event_timestamp::bigint as event_timestamp,
                  user_pseudo_id,
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
                  shop.event as event
                where
                  event.event_date >= date '2023-10-01'
                  and event.event_date <= date '2025-10-10'
                  and event.event_name = '_screen_view'
                  and platform = 'Android'
              ) as l
              join (
                select
                  user_pseudo_id,
                  user_id
                from
                  shop.user_m_view
                group by
                  user_pseudo_id,
                  user_id
              ) as r on l.user_pseudo_id = r.user_pseudo_id
          ) as event_base
        where
          1 = 1
      ),
      mid_table_1 as (
        select
          event_name,
          event_date,
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
          join shop.event_parameter as event_param on base_data.event_timestamp = event_param.event_timestamp
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
          event_date,
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
        where
          node in (
            'NotepadActivity',
            'NotepadExportActivity',
            'NotepadShareActivity',
            'NotepadPrintActivity'
          )
      ),
      data_2 as (
        select
          a.node,
          a.user_pseudo_id,
          a.event_id,
          a.event_timestamp,
          a.event_date,
          case
            when (
              b.event_timestamp - a.event_timestamp < 3600 * cast(1000 as bigint)
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
          event_date,
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
          min(step_1) min_step,
          min(event_timestamp) event_timestamp
        from
          data
        where
          node = 'NotepadActivity'
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
          event_date,
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
      a.event_date event_date,
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
      schemaName: 'shop',
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
          category: ConditionCategory.DEVICE,
          property: 'screen_height',
          operator: '<>',
          value: [1400],
          dataType: MetadataValueType.INTEGER,
        }],
        conditionOperator: 'and',
      },
      timeScopeType: ExploreTimeScopeType.FIXED,
      groupColumn: ExploreGroupColumn.WEEK,
      timeStart: new Date('2023-06-19'),
      timeEnd: new Date('2023-06-22'),
      pairEventAndConditions: [
        {
          startEvent: {
            eventName: 'view_item',
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
            eventName: 'add_to_cart',
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
            eventName: 'view_item',
          },
          backEvent: {
            eventName: 'purchase',
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
              event_date,
              event_name,
              event_id,
              event_timestamp,
              platform,
              device_screen_height,
              COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
              r.user_id,
              month,
              week,
              day,
              hour
            from
              (
                select
                  event_date,
                  event_name::varchar as event_name,
                  event_id::varchar as event_id,
                  event_timestamp::bigint as event_timestamp,
                  platform::varchar as platform,
                  device.screen_height::bigint as device_screen_height,
                  user_pseudo_id,
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
                  shop.event as event
                where
                  event.event_date >= date '2023-06-19'
                  and event.event_date <= date '2023-06-22'
                  and event.event_name in ('view_item', 'add_to_cart', 'purchase')
              ) as l
              join (
                select
                  user_pseudo_id,
                  user_id
                from
                  shop.user_m_view
                group by
                  user_pseudo_id,
                  user_id
              ) as r on l.user_pseudo_id = r.user_pseudo_id
          ) as event_base
        where
          1 = 1
          and (
            platform = 'Android'
            and (
              device_screen_height is null 
              or device_screen_height <> 1400
            )
          )
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
      first_date as (
        select
          min(event_date) as first_date
        from
          date_list
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
          event_name = 'view_item'
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
          event_name = 'add_to_cart'
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
          event_name = 'view_item'
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
          event_name = 'purchase'
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
      DATE_TRUNC('week', start_event_date) - INTERVAL '1 day' as start_event_date,
      DATE_TRUNC('week', event_date) - INTERVAL '1 day' as event_date,
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
      event_date
  `.trim().replace(/ /g, ''),
    );

  });

  test('retention view - join column', () => {

    const sql = buildRetentionAnalysisView({
      schemaName: 'shop',
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
            eventName: 'view_item',
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
            eventName: 'add_to_cart',
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
            eventName: 'view_item',
          },
          backEvent: {
            eventName: 'purchase',
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
              event_date,
              event_name,
              event_id,
              event_timestamp,
              platform,
              device_screen_height,
              COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
              r.user_id,
              month,
              week,
              day,
              hour
            from
              (
                select
                  event_date,
                  event_name::varchar as event_name,
                  event_id::varchar as event_id,
                  event_timestamp::bigint as event_timestamp,
                  platform::varchar as platform,
                  device.screen_height::bigint as device_screen_height,
                  user_pseudo_id,
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
                  shop.event as event
                where
                  event.event_date >= date '2023-06-19'
                  and event.event_date <= date '2023-06-22'
                  and event.event_name in ('view_item', 'add_to_cart', 'purchase')
              ) as l
              join (
                select
                  user_pseudo_id,
                  user_id
                from
                  shop.user_m_view
                group by
                  user_pseudo_id,
                  user_id
              ) as r on l.user_pseudo_id = r.user_pseudo_id
          ) as event_base
        where
          1 = 1
          and (
            platform = 'Android'
            and (
              device_screen_height is null 
              or device_screen_height <> 1400
            )
          )
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
      first_date as (
        select
          min(event_date) as first_date
        from
          date_list
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
          event_name = 'view_item'
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
          event_name = 'add_to_cart'
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
          event_name = 'view_item'
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
          event_name = 'purchase'
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
      grouping,
      start_event_date,
      event_date
    order by
      grouping,
      event_date
  `.trim().replace(/ /g, ''),
    );

  });

  test('retention view - join column user._user_id', () => {

    const sql = buildRetentionAnalysisView({
      schemaName: 'shop',
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
            eventName: 'view_item',
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
              category: ConditionCategory.USER,
              property: '_user_id',
              dataType: MetadataValueType.STRING,
            },
          },
          backEvent: {
            eventName: 'add_to_cart',
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
              category: ConditionCategory.USER,
              property: '_user_id',
              dataType: MetadataValueType.STRING,
            },
          },
        },
        {
          startEvent: {
            eventName: 'view_item',
          },
          backEvent: {
            eventName: 'purchase',
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
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          platform,
          device_screen_height,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              platform::varchar as platform,
              device.screen_height::bigint as device_screen_height,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-06-19'
              and event.event_date <= date '2023-06-22'
              and event.event_name in ('view_item', 'add_to_cart', 'purchase')
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
      ),
      base_data as (
        select
          _user_id,
          event_base.*
        from
          event_base
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = '_user_id' then user_param_string_value
                  else null
                end
              ) as _user_id
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
            and (
              device_screen_height is null 
              or device_screen_height <> 1400
            )
          )
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
      first_date as (
        select
          min(event_date) as first_date
        from
          date_list
      ),
      first_table_0 as (
        select
          event_date,
          event_name,
          _user_id,
          user_pseudo_id
        from
          base_data
          join first_date on base_data.event_date = first_date.first_date
        where
          event_name = 'view_item'
          and (device_screen_height > 1400)
      ),
      second_table_0 as (
        select
          event_date,
          event_name,
          _user_id,
          user_pseudo_id
        from
          base_data
          join first_date on base_data.event_date >= first_date.first_date
        where
          event_name = 'add_to_cart'
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
          event_name = 'view_item'
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
          event_name = 'purchase'
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
          and first_table_0._user_id = second_table_0._user_id
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
      event_date
  `.trim().replace(/ /g, ''),
    );

  });

  test('retention view - join column event._user_id', () => {

    const sql = buildRetentionAnalysisView({
      schemaName: 'shop',
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
            eventName: 'view_item',
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
              category: ConditionCategory.EVENT,
              property: '_user_id',
              dataType: MetadataValueType.STRING,
            },
          },
          backEvent: {
            eventName: 'add_to_cart',
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
              category: ConditionCategory.EVENT,
              property: '_user_id',
              dataType: MetadataValueType.STRING,
            },
          },
        },
        {
          startEvent: {
            eventName: 'view_item',
          },
          backEvent: {
            eventName: 'purchase',
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
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          platform,
          device_screen_height,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              platform::varchar as platform,
              device.screen_height::bigint as device_screen_height,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-06-19'
              and event.event_date <= date '2023-06-22'
              and event.event_name in ('view_item', 'add_to_cart', 'purchase')
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
      ),
      base_data as (
        select
          _user_id,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = '_user_id' then event_param_string_value
                  else null
                end
              ) as _user_id
            from
              event_base
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
        where
          1 = 1
          and (
            platform = 'Android'
            and (
              device_screen_height is null 
              or device_screen_height <> 1400
            )
          )
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
      first_date as (
        select
          min(event_date) as first_date
        from
          date_list
      ),
      first_table_0 as (
        select
          event_date,
          event_name,
          _user_id,
          user_pseudo_id
        from
          base_data
          join first_date on base_data.event_date = first_date.first_date
        where
          event_name = 'view_item'
          and (device_screen_height > 1400)
      ),
      second_table_0 as (
        select
          event_date,
          event_name,
          _user_id,
          user_pseudo_id
        from
          base_data
          join first_date on base_data.event_date >= first_date.first_date
        where
          event_name = 'add_to_cart'
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
          event_name = 'view_item'
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
          event_name = 'purchase'
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
          and first_table_0._user_id = second_table_0._user_id
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
      event_date
  `.trim().replace(/ /g, ''),
    );

  });

  test('global condition and custom attribute', () => {

    const sql = buildFunnelTableView({
      schemaName: 'shop',
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
          eventName: 'view_item',
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
          eventName: 'add_to_cart',
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
          eventName: 'purchase',
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
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          geo_city,
          device_mobile_brand_name,
          platform,
          device_screen_height,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              geo.city::varchar as geo_city,
              device.mobile_brand_name::varchar as device_mobile_brand_name,
              platform::varchar as platform,
              device.screen_height::bigint as device_screen_height,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
              and event.event_name in ('view_item', 'add_to_cart', 'purchase')
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
            or (
              device_screen_height is null 
              or device_screen_height <> 1400
            )
          )
          and (
            (
              event_name = 'view_item'
              and (
                _session_duration > 200
                and _user_first_touch_timestamp > 1686532526770
              )
            )
            or (
              event_name = 'add_to_cart'
              and (
                _session_duration > 200
                and geo_city = 'Shanghai'
              )
            )
            or (
              event_name = 'purchase'
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
          event_name = 'view_item'
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
          event_name = 'add_to_cart'
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
          event_name = 'purchase'
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
          and table_1.event_timestamp_1 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
          left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
          and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
          and table_2.event_timestamp_2 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
      )
    select
      DAY,
      count(distinct user_pseudo_id_0) as view_item,
      (
        count(distinct user_pseudo_id_2)::decimal / NULLIF(count(distinct user_pseudo_id_0), 0)
      )::decimal(20, 4) as total_conversion_rate,
      count(distinct user_pseudo_id_1) as add_to_cart,
      (
        count(distinct user_pseudo_id_1)::decimal / NULLIF(count(distinct user_pseudo_id_0), 0)
      )::decimal(20, 4) as add_to_cart_rate,
      count(distinct user_pseudo_id_2) as purchase,
      (
        count(distinct user_pseudo_id_2)::decimal / NULLIF(count(distinct user_pseudo_id_1), 0)
      )::decimal(20, 4) as purchase_rate
    from
      join_table
    group by
      DAY
    order by
      DAY,
      view_item desc
  `.trim().replace(/ /g, ''),
    );

  });

  test('compute method - real user id', () => {

    const sql = buildFunnelTableView( {
      schemaName: 'shop',
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
          eventName: 'view_item',
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
          eventName: 'add_to_cart',
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
          eventName: 'purchase',
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
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          geo_city,
          device_mobile_brand_name,
          platform,
          device_screen_height,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              geo.city::varchar as geo_city,
              device.mobile_brand_name::varchar as device_mobile_brand_name,
              platform::varchar as platform,
              device.screen_height::bigint as device_screen_height,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
              and event.event_name in ('view_item', 'add_to_cart', 'purchase')
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
            or (
              platform is null
              or platform not like '%Web%'
            )
            or (
              platform is null
              or platform not in ('Web', 'WebchatMP')
            )
            or (
              device_screen_height is null 
              or device_screen_height <> 1400
            )
          )
          and (
            (
              event_name = 'view_item'
              and (
                _session_duration > 200
                and _session_duration >= 250
                and _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp is not null
              )
            )
            or (
              event_name = 'add_to_cart'
              and (
                _session_duration > 200
                and geo_city = 'Shanghai'
              )
            )
            or (
              event_name = 'purchase'
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
          event_name = 'view_item'
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
          event_name = 'add_to_cart'
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
          event_name = 'purchase'
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
          and table_1.event_timestamp_1 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
          left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
          and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
          and table_2.event_timestamp_2 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
      )
    select
      DAY,
      count(distinct user_pseudo_id_0) as view_item,
      (
        count(distinct user_pseudo_id_2)::decimal / NULLIF(count(distinct user_pseudo_id_0), 0)
      )::decimal(20, 4) as total_conversion_rate,
      count(distinct user_pseudo_id_1) as add_to_cart,
      (
        count(distinct user_pseudo_id_1)::decimal / NULLIF(count(distinct user_pseudo_id_0), 0)
      )::decimal(20, 4) as add_to_cart_rate,
      count(distinct user_pseudo_id_2) as purchase,
      (
        count(distinct user_pseudo_id_2)::decimal / NULLIF(count(distinct user_pseudo_id_1), 0)
      )::decimal(20, 4) as purchase_rate
    from
      join_table
    group by
      DAY
    order by
      DAY,
      view_item desc
  `.trim().replace(/ /g, ''),
    );

  });

  test('buildFunnelView', () => {

    const sql = buildFunnelView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
          eventName: 'view_item',
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
          eventName: 'add_to_cart',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'purchase',
          computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          platform,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              platform::varchar as platform,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
              and event.event_name in ('view_item', 'add_to_cart', 'purchase')
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
              event_name = 'view_item'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp > 1686532526780
              )
            )
            or (event_name = 'add_to_cart')
            or (
              event_name = 'purchase'
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
          event_name = 'view_item'
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
          event_name = 'add_to_cart'
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
          event_name = 'purchase'
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
          and table_1.event_timestamp_1 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
          left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
          and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
          and table_2.event_timestamp_2 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
      ),
      seq_table as (
        select
          0 as seq
        union all
        select
          1 as seq
        union all
        select
          2 as seq
      ),
      final_table as (
        select
          day,
          user_pseudo_id_0,
          user_pseudo_id_1,
          user_pseudo_id_2,
          case
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is not null then case
              when seq = 0 then user_pseudo_id_0
              when seq = 1 then user_pseudo_id_1
              when seq = 2 then user_pseudo_id_2
              else null
            end
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is null then case
              when seq = 0 then user_pseudo_id_0
              when seq = 1 then user_pseudo_id_1
              else null
            end
            when user_pseudo_id_1 is null
            and user_pseudo_id_2 is null then case
              when seq = 0 then user_pseudo_id_0
              else null
            end
          end as user_pseudo_id,
          case
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is not null then case
              when seq = 0 then '1_' || event_name_0
              when seq = 1 then '2_' || event_name_1
              when seq = 2 then '3_' || event_name_2
              else null
            end
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is null then case
              when seq = 0 then '1_' || event_name_0
              when seq = 1 then '2_' || event_name_1
              else null
            end
            when user_pseudo_id_1 is null
            and user_pseudo_id_2 is null then case
              when seq = 0 then '1_' || event_name_0
              else null
            end
          end as event_name
        from
          join_table
          join seq_table on 1 = 1
      )
    select
      day::date as event_date,
      event_name,
      user_pseudo_id
    from
      final_table
    where
      event_name is not null
  `.trim().replace(/ /g, ''),
    );

  });

  test('buildFunnelTableView', () => {

    const sql = buildFunnelTableView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
          eventName: 'view_item',
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
          eventName: 'add_to_cart',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'purchase',
          computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          platform,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              platform::varchar as platform,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
              and event.event_name in ('view_item', 'add_to_cart', 'purchase')
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
              event_name = 'view_item'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp > 1686532526780
              )
            )
            or (event_name = 'add_to_cart')
            or (
              event_name = 'purchase'
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
          event_name = 'view_item'
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
          event_name = 'add_to_cart'
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
          event_name = 'purchase'
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
          and table_1.event_timestamp_1 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
          left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
          and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
          and table_2.event_timestamp_2 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
      )
    select
      DAY,
      count(distinct user_pseudo_id_0) as view_item,
      (
        count(distinct user_pseudo_id_2)::decimal / NULLIF(count(distinct user_pseudo_id_0), 0)
      )::decimal(20, 4) as total_conversion_rate,
      count(distinct user_pseudo_id_1) as add_to_cart,
      (
        count(distinct user_pseudo_id_1)::decimal / NULLIF(count(distinct user_pseudo_id_0), 0)
      )::decimal(20, 4) as add_to_cart_rate,
      count(distinct user_pseudo_id_2) as purchase,
      (
        count(distinct user_pseudo_id_2)::decimal / NULLIF(count(distinct user_pseudo_id_1), 0)
      )::decimal(20, 4) as purchase_rate
    from
      join_table
    group by
      DAY
    order by
      DAY,
      view_item desc
  `.trim().replace(/ /g, ''),
    );

  });

  test('buildEventAnalysisView', () => {

    const sql = buildEventAnalysisView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
          eventName: 'view_item',
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
          eventName: 'add_to_cart',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'purchase',
          computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          platform,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              platform::varchar as platform,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
              and event.event_name in ('view_item', 'add_to_cart', 'purchase')
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
          event_name = 'view_item'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _user_first_touch_timestamp > 1686532526780
          )
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
          event_name = 'add_to_cart'
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
          event_name = 'purchase'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _session_duration > 200
          )
      ),
      join_table as (
        select
          table_0.month,
          table_0.week,
          table_0.day,
          table_0.hour,
          1 || '_' || table_0.event_name_0 as event_name,
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
          2 || '_' || table_1.event_name_1 as event_name,
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
          3 || '_' || table_2.event_name_2 as event_name,
          table_2.event_timestamp_2 as event_timestamp,
          table_2.user_pseudo_id_2 as x_id
        from
          table_2
      )
    select
      day::date as event_date,
      event_name,
      x_id as id
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
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
          eventName: 'view_item',
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
          eventName: 'add_to_cart',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'purchase',
          computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
        includingOtherEvents: true,
      },
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          platform,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              platform::varchar as platform,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
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
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
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
                  when event_param_key = '_session_id' then event_param_string_value
                  else null
                end
              ) as _session_id
            from
              event_base
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
              event_name = 'view_item'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp > 1686532526780
              )
            )
            or (event_name = 'add_to_cart')
            or (
              event_name = 'purchase'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _session_duration > 200
              )
            )
            or (
              event_name not in ('view_item', 'add_to_cart', 'purchase')
            )
          )
      ),
      mid_table as (
        select
          CASE
            WHEN event_name in ('view_item', 'add_to_cart', 'purchase') THEN event_name
            ELSE 'other'
          END as event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          event_date,
          _session_id
        from
          base_data
      ),
      data as (
        select
          *,
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
          data.user_pseudo_id user_pseudo_id,
          data._session_id _session_id,
          min(step_1) min_step
        from
          data
        where
          event_name = 'view_item'
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
          event_date,
          user_pseudo_id,
          event_id,
          event_timestamp,
          _session_id,
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
      a.event_date,
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
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
          eventName: 'view_item',
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
          eventName: 'add_to_cart',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'purchase',
          computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
        includingOtherEvents: true,
      },
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          platform,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              platform::varchar as platform,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
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
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
              event_name = 'view_item'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp > 1686532526780
              )
            )
            or (event_name = 'add_to_cart')
            or (
              event_name = 'purchase'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _session_duration > 200
              )
            )
            or (
              event_name not in ('view_item', 'add_to_cart', 'purchase')
            )
          )
      ),
      mid_table as (
        select
          CASE
            WHEN event_name in ('view_item', 'add_to_cart', 'purchase') THEN event_name
            ELSE 'other'
          END as event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          event_date
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
          a.event_date,
          case
            when (
              b.event_timestamp - a.event_timestamp < 3600 * cast(1000 as bigint)
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
          event_date,
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
          min(step_1) min_step,
          min(event_timestamp) event_timestamp
        from
          data
        where
          event_name = 'view_item'
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
          event_date,
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
      a.event_date event_date,
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

  test('buildEventPathAnalysisView - has same event', () => {

    const sql = buildEventPathAnalysisView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
          eventName: 'view_item',
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
          eventName: 'add_to_cart',
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
            ],
          },
        },
        {
          eventName: 'add_to_cart',
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
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
            ],
          },
        },
        {
          eventName: 'purchase',
          computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
        includingOtherEvents: true,
      },
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
    user_base as (
      select
        COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
        user_id as user_id,
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
        shop.user_m_view u,
        u.user_properties as user_properties
    ),
    event_base as (
      select
        event_date,
        event_name,
        event_id,
        event_timestamp,
        platform,
        geo_country,
        COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
        r.user_id,
        month,
        week,
        day,
        hour
      from
        (
          select
            event_date,
            event_name::varchar as event_name,
            event_id::varchar as event_id,
            event_timestamp::bigint as event_timestamp,
            platform::varchar as platform,
            geo.country::varchar as geo_country,
            user_pseudo_id,
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
            shop.event as event
          where
            event.event_date >= date '2023-10-01'
            and event.event_date <= date '2025-10-10'
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
        ) as l
        join (
          select
            user_pseudo_id,
            user_id
          from
            shop.user_m_view
          group by
            user_pseudo_id,
            user_id
        ) as r on l.user_pseudo_id = r.user_pseudo_id
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
                when event_param_key = '_session_id' then event_param_string_value
                else null
              end
            ) as _session_id
          from
            event_base
            join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
    union_base_data as (
      select
        CASE
          WHEN event_name in ('view_item', 'add_to_cart', 'purchase') THEN '1_' || event_name
          ELSE 'other'
        END as event_name,
        user_pseudo_id,
        event_id,
        event_timestamp,
        event_date,
        _session_id
      from
        base_data
      where
        event_name = 'view_item'
        and (
          platform = 'Android'
          and geo_country = 'China'
          and _user_first_touch_timestamp > 1686532526770
          and _user_first_touch_timestamp > 1686532526780
        )
      union all
      select
        CASE
          WHEN event_name in ('view_item', 'add_to_cart', 'purchase') THEN '2_' || event_name
          ELSE 'other'
        END as event_name,
        user_pseudo_id,
        event_id,
        event_timestamp,
        event_date,
        _session_id
      from
        base_data
      where
        event_name = 'add_to_cart'
        and (
          platform = 'Android'
          and geo_country = 'China'
          and _user_first_touch_timestamp > 1686532526770
        )
      union all
      select
        CASE
          WHEN event_name in ('view_item', 'add_to_cart', 'purchase') THEN '3_' || event_name
          ELSE 'other'
        END as event_name,
        user_pseudo_id,
        event_id,
        event_timestamp,
        event_date,
        _session_id
      from
        base_data
      where
        event_name = 'add_to_cart'
        and (
          platform = 'Android'
          and geo_country = 'China'
          and _session_duration > 200
        )
      union all
      select
        CASE
          WHEN event_name in ('view_item', 'add_to_cart', 'purchase') THEN '4_' || event_name
          ELSE 'other'
        END as event_name,
        user_pseudo_id,
        event_id,
        event_timestamp,
        event_date,
        _session_id
      from
        base_data
      where
        event_name = 'purchase'
        and (
          platform = 'Android'
          and geo_country = 'China'
          and _user_first_touch_timestamp > 1686532526770
          and _session_duration > 200
        )
    ),
    mid_table as (
      select
        event_name,
        user_pseudo_id,
        event_id,
        event_timestamp,
        event_date,
        _session_id
      from
        union_base_data
    ),
    data as (
      select
        *,
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
        data.user_pseudo_id user_pseudo_id,
        data._session_id _session_id,
        min(step_1) min_step
      from
        data
      where
        event_name = '1_view_item'
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
        event_date,
        user_pseudo_id,
        event_id,
        event_timestamp,
        _session_id,
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
    a.event_date,
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

  test('buildEventPathAnalysisView - custom join - has same event', () => {

    const sql = buildEventPathAnalysisView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
          eventName: '_first_open',
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
          eventName: '_screen_view',
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
            ],
          },
        },
        {
          eventName: '_screen_view',
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
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
            ],
          },
        },
        {
          eventName: '_app_end',
          computeMethod: ExploreComputeMethod.USER_ID_CNT,
        },
      ],
      pathAnalysis: {
        sessionType: ExplorePathSessionDef.CUSTOMIZE,
        nodeType: ExplorePathNodeType.EVENT,
        lagSeconds: 3600,
        includingOtherEvents: true,
      },
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-20'),
      timeEnd: new Date('2023-11-04'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          platform,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              platform::varchar as platform,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-20'
              and event.event_date <= date '2023-11-04'
              and event.event_name not in (
                '_session_start',
                '_session_stop',
                '_app_exception',
                '_app_update',
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
                '_mp_favorite'
              )
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
      union_base_data as (
        select
          CASE
            WHEN event_name in ('_first_open', '_screen_view', '_app_end') THEN '1_' || event_name
            ELSE 'other'
          END as event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          event_date
        from
          base_data
        where
          event_name = '_first_open'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _user_first_touch_timestamp > 1686532526780
          )
        union all
        select
          CASE
            WHEN event_name in ('_first_open', '_screen_view', '_app_end') THEN '2_' || event_name
            ELSE 'other'
          END as event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          event_date
        from
          base_data
        where
          event_name = '_screen_view'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
          )
        union all
        select
          CASE
            WHEN event_name in ('_first_open', '_screen_view', '_app_end') THEN '3_' || event_name
            ELSE 'other'
          END as event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          event_date
        from
          base_data
        where
          event_name = '_screen_view'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _session_duration > 200
          )
        union all
        select
          CASE
            WHEN event_name in ('_first_open', '_screen_view', '_app_end') THEN '4_' || event_name
            ELSE 'other'
          END as event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          event_date
        from
          base_data
        where
          event_name = '_app_end'
      ),
      mid_table as (
        select
          event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          event_date
        from
          union_base_data base
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
          a.event_date,
          case
            when (
              b.event_timestamp - a.event_timestamp < 3600 * cast(1000 as bigint)
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
          event_date,
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
          min(step_1) min_step,
          min(event_timestamp) event_timestamp
        from
          data
        where
          event_name = '1__first_open'
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
          event_date,
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
      a.event_date event_date,
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
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
          eventName: 'view_item',
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
          eventName: 'add_to_cart',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'purchase',
          computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
        includingOtherEvents: true,
      },
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    const expectResult = `
    with
    user_base as (
      select
        COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
        user_id as user_id,
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
        shop.user_m_view u,
        u.user_properties as user_properties
    ),
    event_base as (
      select
        event_date,
        event_name,
        event_id,
        event_timestamp,
        platform,
        geo_country,
        COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
        r.user_id,
        month,
        week,
        day,
        hour
      from
        (
          select
            event_date,
            event_name::varchar as event_name,
            event_id::varchar as event_id,
            event_timestamp::bigint as event_timestamp,
            platform::varchar as platform,
            geo.country::varchar as geo_country,
            user_pseudo_id,
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
            shop.event as event
          where
            event.event_date >= date '2023-10-01'
            and event.event_date <= date '2025-10-10'
            and event.event_name = '_screen_view'
            and platform = 'Android'
        ) as l
        join (
          select
            user_pseudo_id,
            user_id
          from
            shop.user_m_view
          group by
            user_pseudo_id,
            user_id
        ) as r on l.user_pseudo_id = r.user_pseudo_id
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
            join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
        event_date,
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
        join shop.event_parameter as event_param on base_data.event_timestamp = event_param.event_timestamp
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
        event_date,
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
        a.event_date,
        case
          when (
            b.event_timestamp - a.event_timestamp < 3600 * cast(1000 as bigint)
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
        event_date,
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
        min(step_1) min_step,
        min(event_timestamp) event_timestamp
      from
        data
      where
        node = 'NotepadActivity'
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
        event_date,
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
    a.event_date event_date,
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
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: false,
      groupCondition: {
        property: '_session_id',
        category: ConditionCategory.EVENT,
        dataType: MetadataValueType.STRING,
      },
      eventAndConditions: [
        {
          eventName: 'view_item',
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
          eventName: 'add_to_cart',
        },
        {
          eventName: 'purchase',
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              user_pseudo_id,
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
          shop.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2025-10-10'
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
        ) as l
        join (
          select
            user_pseudo_id,
            user_id
          from
            shop.user_m_view
          group by
            user_pseudo_id,
            user_id
        ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
          event_name = 'view_item'
          and (
            _user_first_touch_timestamp > 1686532526770
            and _user_first_touch_timestamp > 1686532526780
          )
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
          event_name = 'add_to_cart'
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
          event_name = 'purchase'
      ),
      join_table as (
        select
          table_0.month,
          table_0.week,
          table_0.day,
          table_0.hour,
          1 || '_' || table_0.event_name_0 as event_name,
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
          2 || '_' || table_1.event_name_1 as event_name,
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
          3 || '_' || table_2.event_name_2 as event_name,
          table_2.event_timestamp_2 as event_timestamp,
          table_2.event_id_2 as x_id,
          table_2._session_id_2 as _session_id
        from
          table_2
      )
    select
      day::date as event_date,
      event_name,
      _session_id::varchar as group_col,
      x_id as id
    from
      join_table
    where
      x_id is not null
    group by
      day,
      event_name,
      _session_id::varchar,
      x_id
  `.trim().replace(/ /g, ''),
    );

  });

  test('event analysis sql - group condition - public param', () => {

    const sql = buildEventAnalysisView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: false,
      groupCondition: {
        property: 'country',
        category: ConditionCategory.GEO,
        dataType: MetadataValueType.STRING,
      },
      eventAndConditions: [
        {
          eventName: 'view_item',
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
          eventName: 'add_to_cart',
        },
        {
          eventName: 'purchase',
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
        shop.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2025-10-10'
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
        ) as l
        join (
          select
            user_pseudo_id,
            user_id
          from
            shop.user_m_view
          group by
            user_pseudo_id,
            user_id
        ) as r on l.user_pseudo_id = r.user_pseudo_id
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
          event_name = 'view_item'
          and (
            _user_first_touch_timestamp > 1686532526770
            and _user_first_touch_timestamp > 1686532526780
          )
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
          event_name = 'add_to_cart'
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
          event_name = 'purchase'
      ),
      join_table as (
        select
          table_0.month,
          table_0.week,
          table_0.day,
          table_0.hour,
          1 || '_' || table_0.event_name_0 as event_name,
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
          2 || '_' || table_1.event_name_1 as event_name,
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
          3 || '_' || table_2.event_name_2 as event_name,
          table_2.event_timestamp_2 as event_timestamp,
          table_2.event_id_2 as x_id,
          table_2.geo_country_2 as geo_country
        from
          table_2
      )
    select
      day::date as event_date,
      event_name,
      geo_country::varchar as group_col,
      x_id as id
    from
      join_table
    where
      x_id is not null
    group by
      day,
      event_name,
      geo_country::varchar,
      x_id
  `.trim().replace(/ /g, ''),
    );

  });

  test('funnel analysis sql - group condition - nest param', () => {

    const sql = buildFunnelView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: false,
      groupCondition: {
        property: '_session_id',
        category: ConditionCategory.EVENT,
        dataType: MetadataValueType.STRING,
      },
      eventAndConditions: [
        {
          eventName: 'view_item',
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
          eventName: 'add_to_cart',
        },
        {
          eventName: 'purchase',
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    }, true);

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
              and event.event_name in ('view_item', 'add_to_cart', 'purchase')
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
              event_name = 'view_item'
              and (
                _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp > 1686532526780
              )
            )
            or (event_name = 'add_to_cart')
            or (event_name = 'purchase')
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
          COALESCE(_session_id::varchar, 'null') as _session_id_0
        from
          base_data base
        where
          event_name = 'view_item'
      ),
      table_1 as (
        select
          event_date as event_date_1,
          event_name as event_name_1,
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1,
          COALESCE(_session_id::varchar, 'null') as _session_id_1
        from
          base_data base
        where
          event_name = 'add_to_cart'
      ),
      table_2 as (
        select
          event_date as event_date_2,
          event_name as event_name_2,
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2,
          COALESCE(_session_id::varchar, 'null') as _session_id_2
        from
          base_data base
        where
          event_name = 'purchase'
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
          and table_0._session_id_0 = table_1._session_id_1
          and table_1.event_timestamp_1 - table_0.event_timestamp_0 > 0
          and TO_CHAR(
            TIMESTAMP 'epoch' + cast(table_0.event_timestamp_0 / 1000 as bigint) * INTERVAL '1 second',
            'YYYY-MM-DD'
          ) = TO_CHAR(
            TIMESTAMP 'epoch' + cast(table_1.event_timestamp_1 / 1000 as bigint) * INTERVAL '1 second',
            'YYYY-MM-DD'
          )
          left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
          and table_1._session_id_1 = table_2._session_id_2
          and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
          and TO_CHAR(
            TIMESTAMP 'epoch' + cast(table_1.event_timestamp_1 / 1000 as bigint) * INTERVAL '1 second',
            'YYYY-MM-DD'
          ) = TO_CHAR(
            TIMESTAMP 'epoch' + cast(table_2.event_timestamp_2 / 1000 as bigint) * INTERVAL '1 second',
            'YYYY-MM-DD'
          )
      ),
      seq_table as (
        select
          0 as seq
        union all
        select
          1 as seq
        union all
        select
          2 as seq
      ),
      final_table as (
        select
          day,
          user_pseudo_id_0,
          user_pseudo_id_1,
          user_pseudo_id_2,
          case
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is not null then case
              when seq = 0 then user_pseudo_id_0
              when seq = 1 then user_pseudo_id_1
              when seq = 2 then user_pseudo_id_2
              else null
            end
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is null then case
              when seq = 0 then user_pseudo_id_0
              when seq = 1 then user_pseudo_id_1
              else null
            end
            when user_pseudo_id_1 is null
            and user_pseudo_id_2 is null then case
              when seq = 0 then user_pseudo_id_0
              else null
            end
          end as user_pseudo_id,
          case
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is not null then case
              when seq = 0 then '1_' || event_name_0
              when seq = 1 then '2_' || event_name_1
              when seq = 2 then '3_' || event_name_2
              else null
            end
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is null then case
              when seq = 0 then '1_' || event_name_0
              when seq = 1 then '2_' || event_name_1
              else null
            end
            when user_pseudo_id_1 is null
            and user_pseudo_id_2 is null then case
              when seq = 0 then '1_' || event_name_0
              else null
            end
          end as event_name,
          case
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is not null then case
              when seq = 0 then _session_id_0
              when seq = 1 then _session_id_1
              when seq = 2 then _session_id_2
              else null
            end
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is null then case
              when seq = 0 then _session_id_0
              when seq = 1 then _session_id_1
              else null
            end
            when user_pseudo_id_1 is null
            and user_pseudo_id_2 is null then case
              when seq = 0 then _session_id_0
              else null
            end
          end as group_col
        from
          join_table
          join seq_table on 1 = 1
      )
    select
      day::date as event_date,
      event_name,
      user_pseudo_id,
      group_col
    from
      final_table
    where
      event_name is not null
  `.trim().replace(/ /g, ''),
    );

  });

  test('funnel analysis sql - group condition - public param', () => {

    const sql = buildFunnelView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: false,
      groupCondition: {
        property: 'country',
        category: ConditionCategory.GEO,
        dataType: MetadataValueType.STRING,
      },
      eventAndConditions: [
        {
          eventName: 'view_item',
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
          eventName: 'add_to_cart',
        },
        {
          eventName: 'purchase',
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    }, true);

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
              and event.event_name in ('view_item', 'add_to_cart', 'purchase')
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              event_name = 'view_item'
              and (
                _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp > 1686532526780
              )
            )
            or (event_name = 'add_to_cart')
            or (event_name = 'purchase')
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
          COALESCE(geo_country::varchar, 'null') as geo_country_0
        from
          base_data base
        where
          event_name = 'view_item'
      ),
      table_1 as (
        select
          event_date as event_date_1,
          event_name as event_name_1,
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1,
          COALESCE(geo_country::varchar, 'null') as geo_country_1
        from
          base_data base
        where
          event_name = 'add_to_cart'
      ),
      table_2 as (
        select
          event_date as event_date_2,
          event_name as event_name_2,
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2,
          COALESCE(geo_country::varchar, 'null') as geo_country_2
        from
          base_data base
        where
          event_name = 'purchase'
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
          and table_0.geo_country_0 = table_1.geo_country_1
          and table_1.event_timestamp_1 - table_0.event_timestamp_0 > 0
          and TO_CHAR(
            TIMESTAMP 'epoch' + cast(table_0.event_timestamp_0 / 1000 as bigint) * INTERVAL '1 second',
            'YYYY-MM-DD'
          ) = TO_CHAR(
            TIMESTAMP 'epoch' + cast(table_1.event_timestamp_1 / 1000 as bigint) * INTERVAL '1 second',
            'YYYY-MM-DD'
          )
          left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
          and table_1.geo_country_1 = table_2.geo_country_2
          and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
          and TO_CHAR(
            TIMESTAMP 'epoch' + cast(table_1.event_timestamp_1 / 1000 as bigint) * INTERVAL '1 second',
            'YYYY-MM-DD'
          ) = TO_CHAR(
            TIMESTAMP 'epoch' + cast(table_2.event_timestamp_2 / 1000 as bigint) * INTERVAL '1 second',
            'YYYY-MM-DD'
          )
      ),
      seq_table as (
        select
          0 as seq
        union all
        select
          1 as seq
        union all
        select
          2 as seq
      ),
      final_table as (
        select
          day,
          user_pseudo_id_0,
          user_pseudo_id_1,
          user_pseudo_id_2,
          case
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is not null then case
              when seq = 0 then user_pseudo_id_0
              when seq = 1 then user_pseudo_id_1
              when seq = 2 then user_pseudo_id_2
              else null
            end
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is null then case
              when seq = 0 then user_pseudo_id_0
              when seq = 1 then user_pseudo_id_1
              else null
            end
            when user_pseudo_id_1 is null
            and user_pseudo_id_2 is null then case
              when seq = 0 then user_pseudo_id_0
              else null
            end
          end as user_pseudo_id,
          case
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is not null then case
              when seq = 0 then '1_' || event_name_0
              when seq = 1 then '2_' || event_name_1
              when seq = 2 then '3_' || event_name_2
              else null
            end
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is null then case
              when seq = 0 then '1_' || event_name_0
              when seq = 1 then '2_' || event_name_1
              else null
            end
            when user_pseudo_id_1 is null
            and user_pseudo_id_2 is null then case
              when seq = 0 then '1_' || event_name_0
              else null
            end
          end as event_name,
          case
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is not null then case
              when seq = 0 then geo_country_0
              when seq = 1 then geo_country_1
              when seq = 2 then geo_country_2
              else null
            end
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is null then case
              when seq = 0 then geo_country_0
              when seq = 1 then geo_country_1
              else null
            end
            when user_pseudo_id_1 is null
            and user_pseudo_id_2 is null then case
              when seq = 0 then geo_country_0
              else null
            end
          end as group_col
        from
          join_table
          join seq_table on 1 = 1
      )
    select
      day::date as event_date,
      event_name,
      user_pseudo_id,
      group_col
    from
      final_table
    where
      event_name is not null
  `.trim().replace(/ /g, ''),
    );

  });

  test('funnel analysis sql - group condition - only apply to first event', () => {

    const sql = buildFunnelView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: false,
      groupCondition: {
        property: 'country',
        category: ConditionCategory.GEO,
        dataType: MetadataValueType.STRING,
        applyTo: 'FIRST',
      },
      eventAndConditions: [
        {
          eventName: 'view_item',
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
          eventName: 'add_to_cart',
        },
        {
          eventName: 'purchase',
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    }, true);

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
              and event.event_name in ('view_item', 'add_to_cart', 'purchase')
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              event_name = 'view_item'
              and (
                _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp > 1686532526780
              )
            )
            or (event_name = 'add_to_cart')
            or (event_name = 'purchase')
          )
      ),
      table_0 as (
        select
          month,
          week,
          day,
          hour,
          COALESCE(geo_country::varchar, 'null') as geo_country_0,
          event_date as event_date_0,
          event_name as event_name_0,
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0
        from
          base_data base
        where
          event_name = 'view_item'
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
          event_name = 'add_to_cart'
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
          event_name = 'purchase'
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
          and TO_CHAR(
            TIMESTAMP 'epoch' + cast(table_0.event_timestamp_0 / 1000 as bigint) * INTERVAL '1 second',
            'YYYY-MM-DD'
          ) = TO_CHAR(
            TIMESTAMP 'epoch' + cast(table_1.event_timestamp_1 / 1000 as bigint) * INTERVAL '1 second',
            'YYYY-MM-DD'
          )
          left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
          and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
          and TO_CHAR(
            TIMESTAMP 'epoch' + cast(table_1.event_timestamp_1 / 1000 as bigint) * INTERVAL '1 second',
            'YYYY-MM-DD'
          ) = TO_CHAR(
            TIMESTAMP 'epoch' + cast(table_2.event_timestamp_2 / 1000 as bigint) * INTERVAL '1 second',
            'YYYY-MM-DD'
          )
      ),
      seq_table as (
        select
          0 as seq
        union all
        select
          1 as seq
        union all
        select
          2 as seq
      ),
      final_table as (
        select
          day,
          user_pseudo_id_0,
          user_pseudo_id_1,
          user_pseudo_id_2,
          case
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is not null then case
              when seq = 0 then user_pseudo_id_0
              when seq = 1 then user_pseudo_id_1
              when seq = 2 then user_pseudo_id_2
              else null
            end
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is null then case
              when seq = 0 then user_pseudo_id_0
              when seq = 1 then user_pseudo_id_1
              else null
            end
            when user_pseudo_id_1 is null
            and user_pseudo_id_2 is null then case
              when seq = 0 then user_pseudo_id_0
              else null
            end
          end as user_pseudo_id,
          case
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is not null then case
              when seq = 0 then '1_' || event_name_0
              when seq = 1 then '2_' || event_name_1
              when seq = 2 then '3_' || event_name_2
              else null
            end
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is null then case
              when seq = 0 then '1_' || event_name_0
              when seq = 1 then '2_' || event_name_1
              else null
            end
            when user_pseudo_id_1 is null
            and user_pseudo_id_2 is null then case
              when seq = 0 then '1_' || event_name_0
              else null
            end
          end as event_name,
          geo_country_0 as group_col
        from
          join_table
          join seq_table on 1 = 1
      )
    select
      day::date as event_date,
      event_name,
      user_pseudo_id,
      group_col
    from
      final_table
    where
      event_name is not null
  `.trim().replace(/ /g, ''),
    );

  });

  test('_buildCommonPartSql - no condition', () => {

    const sql = _buildCommonPartSql(['view_item', 'add_to_cart', 'purchase'],
      {
        schemaName: 'shop',
        computeMethod: ExploreComputeMethod.USER_ID_CNT,
        specifyJoinColumn: true,
        joinColumn: 'user_pseudo_id',
        conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
        conversionIntervalInSeconds: 10*60,
        eventAndConditions: [
          {
            eventName: 'view_item',
          },
          {
            eventName: 'add_to_cart',
          },
          {
            eventName: 'purchase',
          },
        ],
        timeScopeType: ExploreTimeScopeType.FIXED,
        timeStart: new Date('2023-10-01'),
        timeEnd: new Date('2025-10-10'),
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
              event_date,
              event_name,
              event_id,
              event_timestamp,
              COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
              r.user_id,
              month,
              week,
              day,
              hour
            from
            (
              select
                event_date,
                event_name::varchar as event_name,
                event_id::varchar as event_id,
                event_timestamp::bigint as event_timestamp,
                user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
              and event.event_name in ('view_item', 'add_to_cart', 'purchase')
            ) as l
            join (
              select
                user_pseudo_id,
                user_id
              from
                shop.user_m_view
              group by
                user_pseudo_id,
                user_id
            ) as r on l.user_pseudo_id = r.user_pseudo_id
          ) as event_base
        where
          1 = 1
          and (
            (event_name = 'view_item')
            or (event_name = 'add_to_cart')
            or (event_name = 'purchase')
          )
      ),
    `;
    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));
  });

  test('_buildCommonPartSql - global condition - two user condition', () => {

    const sql = _buildCommonPartSql(['view_item', 'add_to_cart', 'purchase'],
      {
        schemaName: 'shop',
        computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
            eventName: 'view_item',
          },
          {
            eventName: 'add_to_cart',
          },
          {
            eventName: 'purchase',
          },
        ],
        timeScopeType: ExploreTimeScopeType.FIXED,
        timeStart: new Date('2023-10-01'),
        timeEnd: new Date('2025-10-10'),
        groupColumn: ExploreGroupColumn.DAY,
      }, false);

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              user_pseudo_id,
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
          shop.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2025-10-10'
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
        ) as l
        join (
          select
            user_pseudo_id,
            user_id
          from
            shop.user_m_view
          group by
            user_pseudo_id,
            user_id
        ) as r on l.user_pseudo_id = r.user_pseudo_id
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
            (event_name = 'view_item')
            or (event_name = 'add_to_cart')
            or (event_name = 'purchase')
          )
      ),
  `.trim().replace(/ /g, ''),
    );

  });

  test('_buildCommonPartSql - event condition - two event condition', () => {

    const sql = _buildCommonPartSql(['view_item', 'add_to_cart', 'purchase'],
      {
        schemaName: 'shop',
        computeMethod: ExploreComputeMethod.USER_ID_CNT,
        specifyJoinColumn: true,
        joinColumn: 'user_pseudo_id',
        conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
        conversionIntervalInSeconds: 10*60,
        eventAndConditions: [
          {
            eventName: 'view_item',
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
            eventName: 'add_to_cart',
          },
          {
            eventName: 'purchase',
          },
        ],
        timeScopeType: ExploreTimeScopeType.FIXED,
        timeStart: new Date('2023-10-01'),
        timeEnd: new Date('2025-10-10'),
        groupColumn: ExploreGroupColumn.DAY,
      },
      false);

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          platform,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              platform::varchar as platform,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
          shop.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2025-10-10'
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
        ) as l
        join (
          select
            user_pseudo_id,
            user_id
          from
            shop.user_m_view
          group by
            user_pseudo_id,
            user_id
        ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
        where
          1 = 1
          and (
            (
              event_name = 'view_item'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _session_duration > 200
                and _session_duration > 220
              )
            )
            or (event_name = 'add_to_cart')
            or (event_name = 'purchase')
          )
      ),
  `.trim().replace(/ /g, ''),
    );

  });

  test('_buildCommonPartSql - geo and other condition', () => {

    const sql = _buildCommonPartSql(['view_item', 'add_to_cart', 'purchase'],
      {
        schemaName: 'shop',
        computeMethod: ExploreComputeMethod.USER_ID_CNT,
        specifyJoinColumn: true,
        joinColumn: 'user_pseudo_id',
        conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
        conversionIntervalInSeconds: 10*60,
        eventAndConditions: [
          {
            eventName: 'view_item',
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
            eventName: 'add_to_cart',
          },
          {
            eventName: 'purchase',
          },
        ],
        timeScopeType: ExploreTimeScopeType.FIXED,
        timeStart: new Date('2023-10-01'),
        timeEnd: new Date('2025-10-10'),
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
              event_date,
              event_name,
              event_id,
              event_timestamp,
              platform,
              geo_country,
              COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
              r.user_id,
              month,
              week,
              day,
              hour
            from
            (
              select
                event_date,
                event_name::varchar as event_name,
                event_id::varchar as event_id,
                event_timestamp::bigint as event_timestamp,
                platform::varchar as platform,
                geo.country::varchar as geo_country,
                user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
              and event.event_name in ('view_item', 'add_to_cart', 'purchase')
            ) as l
            join (
              select
                user_pseudo_id,
                user_id
              from
                shop.user_m_view
              group by 
                user_pseudo_id,
                user_id
            ) as r on l.user_pseudo_id = r.user_pseudo_id
          ) as event_base
        where
          1 = 1
          and (
            (
              event_name = 'view_item'
              and (
                platform = 'Android'
                and geo_country = 'China'
              )
            )
            or (event_name = 'add_to_cart')
            or (event_name = 'purchase')
          )
      ),
      `;
    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));

  });

  test('_buildCommonPartSql - event,geo and other condition', () => {

    const sql = _buildCommonPartSql(['view_item', 'add_to_cart', 'purchase'],
      {
        schemaName: 'shop',
        computeMethod: ExploreComputeMethod.USER_ID_CNT,
        specifyJoinColumn: true,
        joinColumn: 'user_pseudo_id',
        conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
        conversionIntervalInSeconds: 10*60,
        eventAndConditions: [
          {
            eventName: 'view_item',
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
            eventName: 'add_to_cart',
          },
          {
            eventName: 'purchase',
          },
        ],
        timeScopeType: ExploreTimeScopeType.FIXED,
        timeStart: new Date('2023-10-01'),
        timeEnd: new Date('2025-10-10'),
        groupColumn: ExploreGroupColumn.DAY,
      },
      false);

    const expectResult = `
      with
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          platform,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              platform::varchar as platform,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
          shop.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2025-10-10'
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
        ) as l
        join (
          select
            user_pseudo_id,
            user_id
          from
            shop.user_m_view
          group by
            user_pseudo_id,
            user_id
        ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
        where
          1 = 1
          and (
            (
              event_name = 'view_item'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _session_duration > 220
              )
            )
            or (event_name = 'add_to_cart')
            or (event_name = 'purchase')
          )
      ),
      `;
    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));

  });

  test('_buildCommonPartSql - user,geo and other condition', () => {

    const sql = _buildCommonPartSql(['view_item', 'add_to_cart', 'purchase'],
      {
        schemaName: 'shop',
        computeMethod: ExploreComputeMethod.USER_ID_CNT,
        specifyJoinColumn: true,
        joinColumn: 'user_pseudo_id',
        conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
        conversionIntervalInSeconds: 10*60,
        eventAndConditions: [
          {
            eventName: 'view_item',
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
            eventName: 'add_to_cart',
          },
          {
            eventName: 'purchase',
          },
        ],
        timeScopeType: ExploreTimeScopeType.FIXED,
        timeStart: new Date('2023-10-01'),
        timeEnd: new Date('2025-10-10'),
        groupColumn: ExploreGroupColumn.DAY,
      },
      false);

    const expectResult = `
      with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          platform,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              platform::varchar as platform,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
          shop.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2025-10-10'
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
        ) as l
        join (
          select
            user_pseudo_id,
            user_id
          from
            shop.user_m_view
          group by
            user_pseudo_id,
            user_id
        ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              event_name = 'view_item'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_name = 'test_user'
              )
            )
            or (event_name = 'add_to_cart')
            or (event_name = 'purchase')
          )
      ),
      `;
    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));

  });

  test('_buildCommonPartSql - user,user_outer,event,geo and other condition', () => {

    const sql = _buildCommonPartSql(['view_item', 'add_to_cart', 'purchase'],
      {
        schemaName: 'shop',
        computeMethod: ExploreComputeMethod.USER_ID_CNT,
        specifyJoinColumn: true,
        joinColumn: 'user_pseudo_id',
        conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
        conversionIntervalInSeconds: 10*60,
        eventAndConditions: [
          {
            eventName: 'view_item',
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
            eventName: 'add_to_cart',
          },
          {
            eventName: 'purchase',
          },
        ],
        timeScopeType: ExploreTimeScopeType.FIXED,
        timeStart: new Date('2023-10-01'),
        timeEnd: new Date('2025-10-10'),
        groupColumn: ExploreGroupColumn.DAY,
      },
      false);

    const expectResult = `
      with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          platform,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              platform::varchar as platform,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
          shop.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2025-10-10'
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
        ) as l
        join (
          select
            user_pseudo_id,
            user_id
          from
            shop.user_m_view
          group by
            user_pseudo_id,
            user_id
        ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
              event_name = 'view_item'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _session_duration > 220
                and user_first_touch_timestamp > 1686532526770
                and _first_visit_date > 1686532526770
              )
            )
            or (event_name = 'add_to_cart')
            or (event_name = 'purchase')
          )
      ),
      `;
    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));

  });


  test('_buildCommonPartSql - only has user_outer condition', () => {

    const sql = _buildCommonPartSql(['view_item', 'add_to_cart', 'purchase'],
      {
        schemaName: 'shop',
        computeMethod: ExploreComputeMethod.USER_ID_CNT,
        specifyJoinColumn: true,
        joinColumn: 'user_pseudo_id',
        conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
        conversionIntervalInSeconds: 10*60,
        eventAndConditions: [
          {
            eventName: 'view_item',
            sqlCondition: {
              conditionOperator: 'and',
              conditions: [
                {
                  category: ConditionCategory.USER_OUTER,
                  property: '_channel',
                  operator: '=',
                  value: ['apple'],
                  dataType: MetadataValueType.STRING,
                },
              ],
            },
          },
          {
            eventName: 'add_to_cart',
          },
          {
            eventName: 'purchase',
          },
        ],
        timeScopeType: ExploreTimeScopeType.FIXED,
        timeStart: new Date('2023-10-01'),
        timeEnd: new Date('2025-10-10'),
        groupColumn: ExploreGroupColumn.DAY,
      },
      false);

    const expectResult = `
    with
    base_data as (
      select
        event_base.*,
        user_base.*
      from
      (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
        (
          select
            event_date,
            event_name::varchar as event_name,
            event_id::varchar as event_id,
            event_timestamp::bigint as event_timestamp,
            user_pseudo_id,
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
            shop.event as event
          where
            event.event_date >= date '2023-10-01'
            and event.event_date <= date '2025-10-10'
            and event.event_name in ('view_item', 'add_to_cart', 'purchase')
          ) as l
          join (
            select 
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
        ) as event_base
        join (
          select
            COALESCE(user_id, user_pseudo_id) as user_pseudo_id_join,
            user_id as user_id_join,
            user_first_touch_timestamp,
            _first_visit_date,
            _first_referer,
            _first_traffic_source_type,
            _first_traffic_medium,
            _first_traffic_source,
            _channel
          from
            shop.user_m_view u
        ) as user_base on event_base.user_pseudo_id = user_base.user_pseudo_id_join
      where
        1 = 1
        and (
          (
            event_name = 'view_item'
            and (_channel = 'apple')
          )
          or (event_name = 'add_to_cart')
          or (event_name = 'purchase')
        )
    ),
      `;
    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));

  });

  test('_buildCommonPartSql - grouping condition', () => {

    const sql = _buildCommonPartSql(['view_item', 'add_to_cart', 'purchase'],
      {
        schemaName: 'shop',
        computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
            eventName: 'view_item',
          },
          {
            eventName: 'add_to_cart',
          },
          {
            eventName: 'purchase',
          },
        ],
        timeScopeType: ExploreTimeScopeType.FIXED,
        timeStart: new Date('2023-10-01'),
        timeEnd: new Date('2025-10-10'),
        groupColumn: ExploreGroupColumn.DAY,
      },
      false);

    const expectResult = `
      with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              user_pseudo_id,
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
          shop.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2025-10-10'
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
        ) as l
        join (
          select
            user_pseudo_id,
            user_id
          from
            shop.user_m_view
          group by
            user_pseudo_id,
            user_id
        ) as r on l.user_pseudo_id = r.user_pseudo_id
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
            (event_name = 'view_item')
            or (event_name = 'add_to_cart')
            or (event_name = 'purchase')
          )
      ),
      `;
    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));

  });

  test('_buildCommonPartSql - global condition', () => {

    const sql = _buildCommonPartSql(['view_item', 'add_to_cart', 'purchase'],
      {
        schemaName: 'shop',
        computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
            eventName: 'view_item',
          },
          {
            eventName: 'add_to_cart',
          },
          {
            eventName: 'purchase',
          },
        ],
        timeScopeType: ExploreTimeScopeType.FIXED,
        timeStart: new Date('2023-10-01'),
        timeEnd: new Date('2025-10-10'),
        groupColumn: ExploreGroupColumn.DAY,
      },
      false);

    const expectResult = `
      with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          platform,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              platform::varchar as platform,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
          shop.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2025-10-10'
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
        ) as l
        join (
          select
            user_pseudo_id,
            user_id
          from
            shop.user_m_view
          group by
            user_pseudo_id,
            user_id
        ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
            (event_name = 'view_item')
            or (event_name = 'add_to_cart')
            or (event_name = 'purchase')
          )
      ),
      `;
    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));

  });

  test('_buildCommonPartSql - global condition and grouping condition', () => {

    const sql = _buildCommonPartSql(['view_item', 'add_to_cart', 'purchase'],
      {
        schemaName: 'shop',
        computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
            eventName: 'view_item',
          },
          {
            eventName: 'add_to_cart',
          },
          {
            eventName: 'purchase',
          },
        ],
        timeScopeType: ExploreTimeScopeType.FIXED,
        timeStart: new Date('2023-10-01'),
        timeEnd: new Date('2025-10-10'),
        groupColumn: ExploreGroupColumn.DAY,
      },
      false);

    const expectResult = `
      with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          platform,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              platform::varchar as platform,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
          shop.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2025-10-10'
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
        ) as l
        join (
          select
            user_pseudo_id,
            user_id
          from
            shop.user_m_view
          group by
            user_pseudo_id,
            user_id
        ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _session_duration > 220
          )
          and (
            (event_name = 'view_item')
            or (event_name = 'add_to_cart')
            or (event_name = 'purchase')
          )
      ),
      `;
    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));

  });

  test('_buildCommonPartSql - global condition and user,user_outer,event,geo and other condition', () => {

    const sql = _buildCommonPartSql(['view_item', 'add_to_cart', 'purchase'],
      {
        schemaName: 'shop',
        computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
            eventName: 'view_item',
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
            eventName: 'add_to_cart',
          },
          {
            eventName: 'purchase',
          },
        ],
        timeScopeType: ExploreTimeScopeType.FIXED,
        timeStart: new Date('2023-10-01'),
        timeEnd: new Date('2025-10-10'),
        groupColumn: ExploreGroupColumn.DAY,
      },
      false);

    const expectResult = `
      with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          platform,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              platform::varchar as platform,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
          shop.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2025-10-10'
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
        ) as l
        join (
          select
            user_pseudo_id,
            user_id
          from
            shop.user_m_view
          group by
            user_pseudo_id,
            user_id
        ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
              event_name = 'view_item'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _session_duration > 220
                and user_first_touch_timestamp > 1686532526770
                and _first_visit_date > 1686532526770
              )
            )
            or (event_name = 'add_to_cart')
            or (event_name = 'purchase')
          )
      ),
      `;
    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));

  });

  test('_buildCommonPartSql - grouping condition and global condition and user,user_outer,event,geo and other condition', () => {

    const sql = _buildCommonPartSql(['view_item', 'add_to_cart', 'purchase'],
      {
        schemaName: 'shop',
        computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
            eventName: 'view_item',
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
            eventName: 'add_to_cart',
          },
          {
            eventName: 'purchase',
          },
        ],
        timeScopeType: ExploreTimeScopeType.FIXED,
        timeStart: new Date('2023-10-01'),
        timeEnd: new Date('2025-10-10'),
        groupColumn: ExploreGroupColumn.DAY,
      },
      false);

    const expectResult = `
      with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          platform,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              platform::varchar as platform,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
          shop.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2025-10-10'
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
        ) as l
        join (
          select
            user_pseudo_id,
            user_id
          from
            shop.user_m_view
          group by
            user_pseudo_id,
            user_id
        ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _session_duration > 220
          )
          and (
            (
              event_name = 'view_item'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _session_duration > 220
                and user_first_touch_timestamp > 1686532526770
                and _first_visit_date > 1686532526770
              )
            )
            or (event_name = 'add_to_cart')
            or (event_name = 'purchase')
          )
      ),
      `;
    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));

  });


  test('buildFunnelView - event count', () => {

    const sql = buildFunnelView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.EVENT_CNT,
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
          eventName: 'view_item',
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
          eventName: 'add_to_cart',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'purchase',
          computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    }, true);

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          platform,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              platform::varchar as platform,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
              and event.event_name in ('view_item', 'add_to_cart', 'purchase')
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
              event_name = 'view_item'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp > 1686532526780
              )
            )
            or (event_name = 'add_to_cart')
            or (
              event_name = 'purchase'
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
          COALESCE(geo_country::varchar, 'null') as geo_country_0
        from
          base_data base
        where
          event_name = 'view_item'
      ),
      table_1 as (
        select
          event_date as event_date_1,
          event_name as event_name_1,
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1,
          COALESCE(geo_country::varchar, 'null') as geo_country_1
        from
          base_data base
        where
          event_name = 'add_to_cart'
      ),
      table_2 as (
        select
          event_date as event_date_2,
          event_name as event_name_2,
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2,
          COALESCE(geo_country::varchar, 'null') as geo_country_2
        from
          base_data base
        where
          event_name = 'purchase'
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
          and table_0.geo_country_0 = table_1.geo_country_1
          and table_1.event_timestamp_1 - table_0.event_timestamp_0 > 0
          and table_1.event_timestamp_1 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
          left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
          and table_1.geo_country_1 = table_2.geo_country_2
          and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
          and table_2.event_timestamp_2 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
      ),
      seq_table as (
        select
          0 as seq
        union all
        select
          1 as seq
        union all
        select
          2 as seq
      ),
      final_table as (
        select
          day,
          event_id_0,
          event_id_1,
          event_id_2,
          case
            when event_id_1 is not null
            and event_id_2 is not null then case
              when seq = 0 then event_id_0
              when seq = 1 then event_id_1
              when seq = 2 then event_id_2
              else null
            end
            when event_id_1 is not null
            and event_id_2 is null then case
              when seq = 0 then event_id_0
              when seq = 1 then event_id_1
              else null
            end
            when event_id_1 is null
            and event_id_2 is null then case
              when seq = 0 then event_id_0
              else null
            end
          end as event_id,
          case
            when event_id_1 is not null
            and event_id_2 is not null then case
              when seq = 0 then '1_' || event_name_0
              when seq = 1 then '2_' || event_name_1
              when seq = 2 then '3_' || event_name_2
              else null
            end
            when event_id_1 is not null
            and event_id_2 is null then case
              when seq = 0 then '1_' || event_name_0
              when seq = 1 then '2_' || event_name_1
              else null
            end
            when event_id_1 is null
            and event_id_2 is null then case
              when seq = 0 then '1_' || event_name_0
              else null
            end
          end as event_name,
          case
            when event_id_1 is not null
            and event_id_2 is not null then case
              when seq = 0 then geo_country_0
              when seq = 1 then geo_country_1
              when seq = 2 then geo_country_2
              else null
            end
            when event_id_1 is not null
            and event_id_2 is null then case
              when seq = 0 then geo_country_0
              when seq = 1 then geo_country_1
              else null
            end
            when event_id_1 is null
            and event_id_2 is null then case
              when seq = 0 then geo_country_0
              else null
            end
          end as group_col
        from
          join_table
          join seq_table on 1 = 1
      )
    select
      day::date as event_date,
      event_name,
      event_id,
      group_col
    from
      final_table
    where
      event_name is not null
  `.trim().replace(/ /g, ''),
    );

  });

  test('buildFunnelTableView', () => {

    const sql = buildFunnelTableView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
          eventName: 'view_item',
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
          eventName: 'add_to_cart',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'purchase',
          computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          platform,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              platform::varchar as platform,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
          shop.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2025-10-10'
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
        ) as l
        join (
          select
            user_pseudo_id,
            user_id
          from
            shop.user_m_view
          group by
            user_pseudo_id,
            user_id
        ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
              event_name = 'view_item'
              and (
                platform = 'Android'
                and _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp > 1686532526780
              )
            )
            or (event_name = 'add_to_cart')
            or (
              event_name = 'purchase'
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
          event_name = 'view_item'
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
          event_name = 'add_to_cart'
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
          event_name = 'purchase'
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
          and table_1.event_timestamp_1 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
          left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
          and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
          and table_2.event_timestamp_2 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
      )
    select
      DAY,
      count(distinct user_pseudo_id_0) as view_item,
      (
        count(distinct user_pseudo_id_2)::decimal / NULLIF(count(distinct user_pseudo_id_0), 0)
      )::decimal(20, 4) as total_conversion_rate,
      count(distinct user_pseudo_id_1) as add_to_cart,
      (
        count(distinct user_pseudo_id_1)::decimal / NULLIF(count(distinct user_pseudo_id_0), 0)
      )::decimal(20, 4) as add_to_cart_rate,
      count(distinct user_pseudo_id_2) as purchase,
      (
        count(distinct user_pseudo_id_2)::decimal / NULLIF(count(distinct user_pseudo_id_1), 0)
      )::decimal(20, 4) as purchase_rate
    from
      join_table
    group by
      DAY
    order by
      DAY,
      view_item desc
  `.trim().replace(/ /g, ''),
    );

  });

  test('buildFunnelTableView - has group Condition', () => {

    const sql = buildFunnelTableView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
          eventName: 'view_item',
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
          eventName: 'add_to_cart',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'purchase',
          computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
      groupCondition: {
        category: ConditionCategory.EVENT,
        property: 'category',
        dataType: MetadataValueType.STRING,
        applyTo: 'ALL',
      },
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          platform,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              platform::varchar as platform,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
          shop.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2025-10-10'
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
        ) as l
        join (
          select
            user_pseudo_id,
            user_id
          from
            shop.user_m_view
          group by
            user_pseudo_id,
            user_id
        ) as r on l.user_pseudo_id = r.user_pseudo_id
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          _session_duration,
          category,
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
                  when event_param_key = 'category' then event_param_string_value
                  else null
                end
              ) as category
            from
              event_base
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
              event_name = 'view_item'
              and (
                platform = 'Android'
                and _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp > 1686532526780
              )
            )
            or (event_name = 'add_to_cart')
            or (
              event_name = 'purchase'
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
          COALESCE(category::varchar, 'null') as category
        from
          base_data base
        where
          event_name = 'view_item'
      ),
      table_1 as (
        select
          event_date as event_date_1,
          event_name as event_name_1,
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1,
          COALESCE(category::varchar, 'null') as category
        from
          base_data base
        where
          event_name = 'add_to_cart'
      ),
      table_2 as (
        select
          event_date as event_date_2,
          event_name as event_name_2,
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2,
          COALESCE(category::varchar, 'null') as category
        from
          base_data base
        where
          event_name = 'purchase'
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
          and table_0.category = table_1.category
          and table_1.event_timestamp_1 - table_0.event_timestamp_0 > 0
          and table_1.event_timestamp_1 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
          left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
          and table_1.category = table_2.category
          and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
          and table_2.event_timestamp_2 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
      )
    select
      DAY,
      category as category,
      count(distinct user_pseudo_id_0) as view_item,
      (
        count(distinct user_pseudo_id_2)::decimal / NULLIF(count(distinct user_pseudo_id_0), 0)
      )::decimal(20, 4) as total_conversion_rate,
      count(distinct user_pseudo_id_1) as add_to_cart,
      (
        count(distinct user_pseudo_id_1)::decimal / NULLIF(count(distinct user_pseudo_id_0), 0)
      )::decimal(20, 4) as add_to_cart_rate,
      count(distinct user_pseudo_id_2) as purchase,
      (
        count(distinct user_pseudo_id_2)::decimal / NULLIF(count(distinct user_pseudo_id_1), 0)
      )::decimal(20, 4) as purchase_rate
    from
      join_table
    group by
      DAY,
      category
    order by
      DAY,
      view_item desc
  `.trim().replace(/ /g, ''),
    );

  });

  test('buildFunnelTableView - has group Condition - apply to first event', () => {

    const sql = buildFunnelTableView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
          eventName: 'view_item',
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
          eventName: 'add_to_cart',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'purchase',
          computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
      groupCondition: {
        category: ConditionCategory.EVENT,
        property: 'category',
        dataType: MetadataValueType.STRING,
        applyTo: 'FIRST',
      },
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          platform,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              platform::varchar as platform,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
          shop.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2025-10-10'
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
        ) as l
        join (
          select
            user_pseudo_id,
            user_id
          from
            shop.user_m_view
          group by
            user_pseudo_id,
            user_id
        ) as r on l.user_pseudo_id = r.user_pseudo_id
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          _session_duration,
          category,
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
                  when event_param_key = 'category' then event_param_string_value
                  else null
                end
              ) as category
            from
              event_base
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
              event_name = 'view_item'
              and (
                platform = 'Android'
                and _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp > 1686532526780
              )
            )
            or (event_name = 'add_to_cart')
            or (
              event_name = 'purchase'
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
          COALESCE(category::varchar, 'null') as category,
          event_date as event_date_0,
          event_name as event_name_0,
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0
        from
          base_data base
        where
          event_name = 'view_item'
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
          event_name = 'add_to_cart'
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
          event_name = 'purchase'
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
          and table_1.event_timestamp_1 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
          left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
          and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
          and table_2.event_timestamp_2 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
      )
    select
      DAY,
      category as category,
      count(distinct user_pseudo_id_0) as view_item,
      (
        count(distinct user_pseudo_id_2)::decimal / NULLIF(count(distinct user_pseudo_id_0), 0)
      )::decimal(20, 4) as total_conversion_rate,
      count(distinct user_pseudo_id_1) as add_to_cart,
      (
        count(distinct user_pseudo_id_1)::decimal / NULLIF(count(distinct user_pseudo_id_0), 0)
      )::decimal(20, 4) as add_to_cart_rate,
      count(distinct user_pseudo_id_2) as purchase,
      (
        count(distinct user_pseudo_id_2)::decimal / NULLIF(count(distinct user_pseudo_id_1), 0)
      )::decimal(20, 4) as purchase_rate
    from
      join_table
    group by
      DAY,
      category
    order by
      DAY,
      view_item desc
  `.trim().replace(/ /g, ''),
    );

  });

  test('buildEventAnalysisView', () => {

    const sql = buildEventAnalysisView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
          eventName: 'view_item',
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
          eventName: 'add_to_cart',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'purchase',
          computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          platform,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              platform::varchar as platform,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
              and event.event_name in ('view_item', 'add_to_cart', 'purchase')
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
          event_name = 'view_item'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _user_first_touch_timestamp > 1686532526780
          )
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
          event_name = 'add_to_cart'
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
          event_name = 'purchase'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _session_duration > 200
          )
      ),
      join_table as (
        select
          table_0.month,
          table_0.week,
          table_0.day,
          table_0.hour,
          1 || '_' || table_0.event_name_0 as event_name,
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
          2 || '_' || table_1.event_name_1 as event_name,
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
          3 || '_' || table_2.event_name_2 as event_name,
          table_2.event_timestamp_2 as event_timestamp,
          table_2.user_pseudo_id_2 as x_id,
          table_2.geo_country_2 as geo_country
        from
          table_2
      )
    select
      day::date as event_date,
      event_name,
      geo_country::varchar as group_col,
      x_id as id
    from
      join_table
    where
      x_id is not null
    group by
      day,
      event_name,
      geo_country::varchar,
      x_id
  `.trim().replace(/ /g, ''),
    );

  });

  test('buildEventPathAnalysisView - session join', () => {

    const sql = buildEventPathAnalysisView({
      schemaName: 'shop',
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
          eventName: 'view_item',
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
          eventName: 'add_to_cart',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'purchase',
          computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          platform,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              platform::varchar as platform,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
          shop.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2025-10-10'
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
        ) as l
        join (
          select
            user_pseudo_id,
            user_id
          from
            shop.user_m_view
          group by
            user_pseudo_id,
            user_id
        ) as r on l.user_pseudo_id = r.user_pseudo_id
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
                  when event_param_key = '_session_id' then event_param_string_value
                  else null
                end
              ) as _session_id
            from
              event_base
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
              event_name = 'view_item'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp > 1686532526780
              )
            )
            or (event_name = 'add_to_cart')
            or (
              event_name = 'purchase'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _session_duration > 200
              )
            )
          )
      ),
      mid_table as (
        select
          CASE
            WHEN event_name in ('view_item', 'add_to_cart', 'purchase') THEN event_name
            ELSE 'other'
          END as event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          event_date,
          _session_id
        from
          base_data
      ),
      data as (
        select
          *,
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
          data.user_pseudo_id user_pseudo_id,
          data._session_id _session_id,
          min(step_1) min_step
        from
          data
        where
          event_name = 'view_item'
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
          event_date,
          user_pseudo_id,
          event_id,
          event_timestamp,
          _session_id,
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
      a.event_date,
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
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.EVENT_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: 'view_item',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'add_to_cart',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'purchase',
          computeMethod: ExploreComputeMethod.USER_ID_CNT,
        },
      ],
      pathAnalysis: {
        sessionType: ExplorePathSessionDef.SESSION,
        nodeType: ExplorePathNodeType.EVENT,
      },
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              user_pseudo_id,
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
          shop.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2025-10-10'
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
        ) as l
        join (
          select
            user_pseudo_id,
            user_id
          from
            shop.user_m_view
          group by
            user_pseudo_id,
            user_id
        ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
        where
          1 = 1
          and (
            (event_name = 'view_item')
            or (event_name = 'add_to_cart')
            or (event_name = 'purchase')
          )
      ),
      mid_table as (
        select
          CASE
            WHEN event_name in ('view_item', 'add_to_cart', 'purchase') THEN event_name
            ELSE 'other'
          END as event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          event_date,
          _session_id
        from
          base_data
      ),
      data as (
        select
          *,
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
          data.user_pseudo_id user_pseudo_id,
          data._session_id _session_id,
          min(step_1) min_step
        from
          data
        where
          event_name = 'view_item'
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
          event_date,
          user_pseudo_id,
          event_id,
          event_timestamp,
          _session_id,
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
      a.event_date,
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
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
          eventName: 'view_item',
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
          eventName: 'add_to_cart',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'purchase',
          computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
        includingOtherEvents: true,
      },
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
    user_base as (
      select
        COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
        user_id as user_id,
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
        shop.user_m_view u,
        u.user_properties as user_properties
    ),
    event_base as (
      select
        event_date,
        event_name,
        event_id,
        event_timestamp,
        platform,
        geo_country,
        COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
        r.user_id,
        month,
        week,
        day,
        hour
      from
        (
          select
            event_date,
            event_name::varchar as event_name,
            event_id::varchar as event_id,
            event_timestamp::bigint as event_timestamp,
            platform::varchar as platform,
            geo.country::varchar as geo_country,
            user_pseudo_id,
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
            shop.event as event
          where
            event.event_date >= date '2023-10-01'
            and event.event_date <= date '2025-10-10'
            and event.event_name = '_screen_view'
            and platform = 'Android'
        ) as l
        join (
          select
            user_pseudo_id,
            user_id
          from
            shop.user_m_view
          group by
            user_pseudo_id,
            user_id
        ) as r on l.user_pseudo_id = r.user_pseudo_id
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
                when event_param_key = '_session_id' then event_param_string_value
                else null
              end
            ) as _session_id
          from
            event_base
            join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
        event_date,
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
        join shop.event_parameter as event_param on base_data.event_timestamp = event_param.event_timestamp
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
        event_date,
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
        node = 'NotepadActivity'
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
        event_date,
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
    a.event_date event_date,
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

  test('buildRetentionAnalysisView', () => {

    const sql = buildRetentionAnalysisView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
            eventName: 'view_item',
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
            eventName: 'purchase',
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
            eventName: 'view_item',
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
            eventName: 'add_to_cart',
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
      timeStart: new Date('2023-10-24'),
      timeEnd: new Date('2023-10-30'),
      groupColumn: ExploreGroupColumn.MONTH,
    });

    const expectResult = `
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          platform,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              platform::varchar as platform,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-24'
              and event.event_date <= date '2023-10-30'
              and event.event_name in ('view_item', 'purchase', 'add_to_cart')
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
      date_list as (
        select
          '2023-10-24'::date as event_date
        union all
        select
          '2023-10-25'::date as event_date
        union all
        select
          '2023-10-26'::date as event_date
        union all
        select
          '2023-10-27'::date as event_date
        union all
        select
          '2023-10-28'::date as event_date
        union all
        select
          '2023-10-29'::date as event_date
        union all
        select
          '2023-10-30'::date as event_date
      ),
      first_date as (
        select
          min(event_date) as first_date
        from
          date_list
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
          event_name = 'view_item'
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
          event_name = 'purchase'
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
          event_name = 'view_item'
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
          event_name = 'add_to_cart'
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
      geo_country::varchar as group_col,
      grouping,
      DATE_TRUNC('month', start_event_date) as start_event_date,
      DATE_TRUNC('month', event_date) as event_date,
      (
        count(distinct end_user_pseudo_id)::decimal / NULLIF(count(distinct start_user_pseudo_id), 0)
      )::decimal(20, 4) as retention
    from
      result_table
    group by
      geo_country::varchar,
      grouping,
      start_event_date,
      event_date
    order by
      grouping,
      event_date
    `;
    expect(sql.trim().replace(/ /g, '')).toEqual(expectResult.trim().replace(/ /g, ''));

  });

  test('use specified schema name in generated SQL', () => {

    const sql = buildFunnelView({
      schemaName: 'shopping',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: 'view_item',
          sqlCondition: {
            conditions: [{
              category: ConditionCategory.OTHER,
              property: 'platform',
              operator: '=',
              value: ['Android'],
              dataType: MetadataValueType.STRING,
            },
            {
              category: ConditionCategory.EVENT,
              property: '_session_duration',
              operator: '>',
              value: [200],
              dataType: MetadataValueType.INTEGER,
            }],
            conditionOperator: 'and',
          },
        },
        {
          eventName: 'add_to_cart',
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
          eventName: 'purchase',
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.includes('shopping.event_parameter')).toEqual(true);
    expect(sql.includes('shopping.event')).toEqual(true);
    expect(sql.includes('shop.')).toEqual(false);

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          platform,
          device_screen_height,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              platform::varchar as platform,
              device.screen_height::bigint as device_screen_height,
              user_pseudo_id,
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
              shopping.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
              and event.event_name in ('view_item', 'add_to_cart', 'purchase')
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shopping.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shopping.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
        where
          1 = 1
          and (
            (
              event_name = 'view_item'
              and (
                platform = 'Android'
                and _session_duration > 200
              )
            )
            or (
              event_name = 'add_to_cart'
              and (
                platform = 'Android'
                and (
                  device_screen_height is null 
                  or device_screen_height <> 1400
                )
              )
            )
            or (event_name = 'purchase')
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
          event_name = 'view_item'
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
          event_name = 'add_to_cart'
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
          event_name = 'purchase'
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
          and table_1.event_timestamp_1 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
          left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
          and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
          and table_2.event_timestamp_2 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
      ),
      seq_table as (
        select
          0 as seq
        union all
        select
          1 as seq
        union all
        select
          2 as seq
      ),
      final_table as (
        select
          day,
          user_pseudo_id_0,
          user_pseudo_id_1,
          user_pseudo_id_2,
          case
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is not null then case
              when seq = 0 then user_pseudo_id_0
              when seq = 1 then user_pseudo_id_1
              when seq = 2 then user_pseudo_id_2
              else null
            end
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is null then case
              when seq = 0 then user_pseudo_id_0
              when seq = 1 then user_pseudo_id_1
              else null
            end
            when user_pseudo_id_1 is null
            and user_pseudo_id_2 is null then case
              when seq = 0 then user_pseudo_id_0
              else null
            end
          end as user_pseudo_id,
          case
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is not null then case
              when seq = 0 then '1_' || event_name_0
              when seq = 1 then '2_' || event_name_1
              when seq = 2 then '3_' || event_name_2
              else null
            end
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is null then case
              when seq = 0 then '1_' || event_name_0
              when seq = 1 then '2_' || event_name_1
              else null
            end
            when user_pseudo_id_1 is null
            and user_pseudo_id_2 is null then case
              when seq = 0 then '1_' || event_name_0
              else null
            end
          end as event_name
        from
          join_table
          join seq_table on 1 = 1
      )
    select
      day::date as event_date,
      event_name,
      user_pseudo_id
    from
      final_table
    where
      event_name is not null
  `.trim().replace(/ /g, ''),
    );

  });

  test('buildEventPathAnalysisView - includingOtherEvents and merge consecutive events', () => {

    const sql = buildEventPathAnalysisView({
      schemaName: 'shop',
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
          eventName: 'view_item',
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
          eventName: 'add_to_cart',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'purchase',
          computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
        includingOtherEvents: true,
        mergeConsecutiveEvents: true,
      },
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          platform,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              platform::varchar as platform,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
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
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
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
                  when event_param_key = '_session_id' then event_param_string_value
                  else null
                end
              ) as _session_id
            from
              event_base
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
              event_name = 'view_item'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _user_first_touch_timestamp > 1686532526780
              )
            )
            or (event_name = 'add_to_cart')
            or (
              event_name = 'purchase'
              and (
                platform = 'Android'
                and geo_country = 'China'
                and _user_first_touch_timestamp > 1686532526770
                and _session_duration > 200
              )
            )
            or (
              event_name not in ('view_item', 'add_to_cart', 'purchase')
            )
          )
      ),
      mid_table as (
        select
          CASE
            WHEN event_name in ('view_item', 'add_to_cart', 'purchase') THEN event_name
            ELSE 'other'
          END as event_name,
          user_pseudo_id,
          event_id,
          event_timestamp,
          event_date,
          _session_id
        from
          (
            select
              event_name,
              user_pseudo_id,
              event_id,
              event_timestamp,
              event_date,
              _session_id,
              ROW_NUMBER() over (
                partition by
                  event_name,
                  user_pseudo_id,
                  _session_id
                order by
                  event_timestamp desc
              ) as rk
            from
              base_data
          )
        where
          rk = 1
      ),
      data as (
        select
          *,
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
          data.user_pseudo_id user_pseudo_id,
          data._session_id _session_id,
          min(step_1) min_step
        from
          data
        where
          event_name = 'view_item'
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
          event_date,
          user_pseudo_id,
          event_id,
          event_timestamp,
          _session_id,
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
      a.event_date,
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

  test('event analysis sql - only has user_outer type condition', () => {

    const sql = buildEventAnalysisView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: false,
      eventAndConditions: [
        {
          eventName: 'view_item',
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '=',
                value: ['apple'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
        {
          eventName: 'add_to_cart',
        },
        {
          eventName: 'purchase',
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      base_data as (
        select
          event_base.*,
          user_base.*
        from
          (
            select
              event_date,
              event_name,
              event_id,
              event_timestamp,
              COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
              r.user_id,
              month,
              week,
              day,
              hour
            from
              (
                select
                  event_date,
                  event_name::varchar as event_name,
                  event_id::varchar as event_id,
                  event_timestamp::bigint as event_timestamp,
                  user_pseudo_id,
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
                  shop.event as event
                where
                  event.event_date >= date '2023-10-01'
                  and event.event_date <= date '2025-10-10'
                  and event.event_name in ('view_item', 'add_to_cart', 'purchase')
              ) as l
              join (
                select
                  user_pseudo_id,
                  user_id
                from
                  shop.user_m_view
                group by
                  user_pseudo_id,
                  user_id
              ) as r on l.user_pseudo_id = r.user_pseudo_id
          ) as event_base
          join (
            select
              COALESCE(user_id, user_pseudo_id) as user_pseudo_id_join,
              user_id as user_id_join,
              user_first_touch_timestamp,
              _first_visit_date,
              _first_referer,
              _first_traffic_source_type,
              _first_traffic_medium,
              _first_traffic_source,
              _channel
            from
              shop.user_m_view u
          ) as user_base on event_base.user_pseudo_id = user_base.user_pseudo_id_join
        where
          1 = 1
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
          event_name = 'view_item'
          and (_channel = 'apple')
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
          event_name = 'add_to_cart'
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
          event_name = 'purchase'
      ),
      join_table as (
        select
          table_0.month,
          table_0.week,
          table_0.day,
          table_0.hour,
          1 || '_' || table_0.event_name_0 as event_name,
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
          2 || '_' || table_1.event_name_1 as event_name,
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
          3 || '_' || table_2.event_name_2 as event_name,
          table_2.event_timestamp_2 as event_timestamp,
          table_2.event_id_2 as x_id
        from
          table_2
      )
    select
      day::date as event_date,
      event_name,
      x_id as id
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

  test('funnel bar chart - sanity check - user count', () => {

    const sql = buildFunnelView({
      schemaName: 'blog',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: '_first_open',
        },
        {
          eventName: '_scroll',
        },
        {
          eventName: '_user_engagement',
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.WEEK,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      base_data as (
        select
          event_base.*
        from
          (
            select
              event_date,
              event_name,
              event_id,
              event_timestamp,
              COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
              r.user_id,
              month,
              week,
              day,
              hour
            from
              (
                select
                  event_date,
                  event_name::varchar as event_name,
                  event_id::varchar as event_id,
                  event_timestamp::bigint as event_timestamp,
                  user_pseudo_id,
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
                  blog.event as event
                where
                  event.event_date >= date '2023-10-01'
                  and event.event_date <= date '2025-10-10'
                  and event.event_name in ('_first_open', '_scroll', '_user_engagement')
              ) as l
              join (
                select
                  user_pseudo_id,
                  user_id
                from
                  blog.user_m_view
                group by
                  user_pseudo_id,
                  user_id
              ) as r on l.user_pseudo_id = r.user_pseudo_id
          ) as event_base
        where
          1 = 1
          and (
            (event_name = '_first_open')
            or (event_name = '_scroll')
            or (event_name = '_user_engagement')
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
          event_name = '_first_open'
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
          event_name = '_scroll'
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
          event_name = '_user_engagement'
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
          and table_1.event_timestamp_1 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
          left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
          and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
          and table_2.event_timestamp_2 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
      ),
      seq_table as (
        select
          0 as seq
        union all
        select
          1 as seq
        union all
        select
          2 as seq
      ),
      final_table as (
        select
          day,
          user_pseudo_id_0,
          user_pseudo_id_1,
          user_pseudo_id_2,
          case
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is not null then case
              when seq = 0 then user_pseudo_id_0
              when seq = 1 then user_pseudo_id_1
              when seq = 2 then user_pseudo_id_2
              else null
            end
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is null then case
              when seq = 0 then user_pseudo_id_0
              when seq = 1 then user_pseudo_id_1
              else null
            end
            when user_pseudo_id_1 is null
            and user_pseudo_id_2 is null then case
              when seq = 0 then user_pseudo_id_0
              else null
            end
          end as user_pseudo_id,
          case
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is not null then case
              when seq = 0 then '1_' || event_name_0
              when seq = 1 then '2_' || event_name_1
              when seq = 2 then '3_' || event_name_2
              else null
            end
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is null then case
              when seq = 0 then '1_' || event_name_0
              when seq = 1 then '2_' || event_name_1
              else null
            end
            when user_pseudo_id_1 is null
            and user_pseudo_id_2 is null then case
              when seq = 0 then '1_' || event_name_0
              else null
            end
          end as event_name
        from
          join_table
          join seq_table on 1 = 1
      )
    select
      day::date as event_date,
      event_name,
      user_pseudo_id
    from
      final_table
    where
      event_name is not null
  `.trim().replace(/ /g, ''),
    );

  });

  test('funnel bar chart - sanity check - event count', () => {

    const sql = buildFunnelView({
      schemaName: 'blog',
      computeMethod: ExploreComputeMethod.EVENT_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: '_first_open',
        },
        {
          eventName: '_scroll',
        },
        {
          eventName: '_user_engagement',
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.WEEK,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      base_data as (
        select
          event_base.*
        from
          (
            select
              event_date,
              event_name,
              event_id,
              event_timestamp,
              COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
              r.user_id,
              month,
              week,
              day,
              hour
            from
              (
                select
                  event_date,
                  event_name::varchar as event_name,
                  event_id::varchar as event_id,
                  event_timestamp::bigint as event_timestamp,
                  user_pseudo_id,
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
                  blog.event as event
                where
                  event.event_date >= date '2023-10-01'
                  and event.event_date <= date '2025-10-10'
                  and event.event_name in ('_first_open', '_scroll', '_user_engagement')
              ) as l
              join (
                select
                  user_pseudo_id,
                  user_id
                from
                  blog.user_m_view
                group by
                  user_pseudo_id,
                  user_id
              ) as r on l.user_pseudo_id = r.user_pseudo_id
          ) as event_base
        where
          1 = 1
          and (
            (event_name = '_first_open')
            or (event_name = '_scroll')
            or (event_name = '_user_engagement')
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
          event_name = '_first_open'
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
          event_name = '_scroll'
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
          event_name = '_user_engagement'
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
          and table_1.event_timestamp_1 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
          left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
          and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
          and table_2.event_timestamp_2 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
      ),
      seq_table as (
        select
          0 as seq
        union all
        select
          1 as seq
        union all
        select
          2 as seq
      ),
      final_table as (
        select
          day,
          event_id_0,
          event_id_1,
          event_id_2,
          case
            when event_id_1 is not null
            and event_id_2 is not null then case
              when seq = 0 then event_id_0
              when seq = 1 then event_id_1
              when seq = 2 then event_id_2
              else null
            end
            when event_id_1 is not null
            and event_id_2 is null then case
              when seq = 0 then event_id_0
              when seq = 1 then event_id_1
              else null
            end
            when event_id_1 is null
            and event_id_2 is null then case
              when seq = 0 then event_id_0
              else null
            end
          end as event_id,
          case
            when event_id_1 is not null
            and event_id_2 is not null then case
              when seq = 0 then '1_' || event_name_0
              when seq = 1 then '2_' || event_name_1
              when seq = 2 then '3_' || event_name_2
              else null
            end
            when event_id_1 is not null
            and event_id_2 is null then case
              when seq = 0 then '1_' || event_name_0
              when seq = 1 then '2_' || event_name_1
              else null
            end
            when event_id_1 is null
            and event_id_2 is null then case
              when seq = 0 then '1_' || event_name_0
              else null
            end
          end as event_name
        from
          join_table
          join seq_table on 1 = 1
      )
    select
      day::date as event_date,
      event_name,
      event_id
    from
      final_table
    where
      event_name is not null
  `.trim().replace(/ /g, ''),
    );

  });

  test('funnel bar chart - sanity check - group condition - first', () => {

    const sql = buildFunnelView({
      schemaName: 'blog',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      groupCondition: {
        property: 'country',
        category: ConditionCategory.GEO,
        dataType: MetadataValueType.STRING,
        applyTo: 'FIRST',
      },
      eventAndConditions: [
        {
          eventName: '_first_open',
        },
        {
          eventName: '_scroll',
        },
        {
          eventName: '_user_engagement',
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.WEEK,
    }, true);

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      base_data as (
        select
          event_base.*
        from
          (
            select
              event_date,
              event_name,
              event_id,
              event_timestamp,
              geo_country,
              COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
              r.user_id,
              month,
              week,
              day,
              hour
            from
              (
                select
                  event_date,
                  event_name::varchar as event_name,
                  event_id::varchar as event_id,
                  event_timestamp::bigint as event_timestamp,
                  geo.country::varchar as geo_country,
                  user_pseudo_id,
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
                  blog.event as event
                where
                  event.event_date >= date '2023-10-01'
                  and event.event_date <= date '2025-10-10'
                  and event.event_name in ('_first_open', '_scroll', '_user_engagement')
              ) as l
              join (
                select
                  user_pseudo_id,
                  user_id
                from
                  blog.user_m_view
                group by
                  user_pseudo_id,
                  user_id
              ) as r on l.user_pseudo_id = r.user_pseudo_id
          ) as event_base
        where
          1 = 1
          and (
            (event_name = '_first_open')
            or (event_name = '_scroll')
            or (event_name = '_user_engagement')
          )
      ),
      table_0 as (
        select
          month,
          week,
          day,
          hour,
          COALESCE(geo_country::varchar, 'null') as geo_country_0,
          event_date as event_date_0,
          event_name as event_name_0,
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0
        from
          base_data base
        where
          event_name = '_first_open'
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
          event_name = '_scroll'
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
          event_name = '_user_engagement'
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
          and table_1.event_timestamp_1 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
          left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
          and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
          and table_2.event_timestamp_2 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
      ),
      seq_table as (
        select
          0 as seq
        union all
        select
          1 as seq
        union all
        select
          2 as seq
      ),
      final_table as (
        select
          day,
          user_pseudo_id_0,
          user_pseudo_id_1,
          user_pseudo_id_2,
          case
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is not null then case
              when seq = 0 then user_pseudo_id_0
              when seq = 1 then user_pseudo_id_1
              when seq = 2 then user_pseudo_id_2
              else null
            end
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is null then case
              when seq = 0 then user_pseudo_id_0
              when seq = 1 then user_pseudo_id_1
              else null
            end
            when user_pseudo_id_1 is null
            and user_pseudo_id_2 is null then case
              when seq = 0 then user_pseudo_id_0
              else null
            end
          end as user_pseudo_id,
          case
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is not null then case
              when seq = 0 then '1_' || event_name_0
              when seq = 1 then '2_' || event_name_1
              when seq = 2 then '3_' || event_name_2
              else null
            end
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is null then case
              when seq = 0 then '1_' || event_name_0
              when seq = 1 then '2_' || event_name_1
              else null
            end
            when user_pseudo_id_1 is null
            and user_pseudo_id_2 is null then case
              when seq = 0 then '1_' || event_name_0
              else null
            end
          end as event_name,
          geo_country_0 as group_col
        from
          join_table
          join seq_table on 1 = 1
      )
    select
      day::date as event_date,
      event_name,
      user_pseudo_id,
      group_col
    from
      final_table
    where
      event_name is not null
  `.trim().replace(/ /g, ''),
    );

  });

  test('funnel bar chart - sanity check - group condition - not first', () => {

    const sql = buildFunnelView({
      schemaName: 'blog',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      groupCondition: {
        property: 'country',
        category: ConditionCategory.GEO,
        dataType: MetadataValueType.STRING,
        applyTo: 'ALL',
      },
      eventAndConditions: [
        {
          eventName: '_first_open',
        },
        {
          eventName: '_scroll',
        },
        {
          eventName: '_user_engagement',
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.WEEK,
    }, true);

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      base_data as (
        select
          event_base.*
        from
          (
            select
              event_date,
              event_name,
              event_id,
              event_timestamp,
              geo_country,
              COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
              r.user_id,
              month,
              week,
              day,
              hour
            from
              (
                select
                  event_date,
                  event_name::varchar as event_name,
                  event_id::varchar as event_id,
                  event_timestamp::bigint as event_timestamp,
                  geo.country::varchar as geo_country,
                  user_pseudo_id,
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
                  blog.event as event
                where
                  event.event_date >= date '2023-10-01'
                  and event.event_date <= date '2025-10-10'
                  and event.event_name in ('_first_open', '_scroll', '_user_engagement')
              ) as l
              join (
                select
                  user_pseudo_id,
                  user_id
                from
                  blog.user_m_view
                group by
                  user_pseudo_id,
                  user_id
              ) as r on l.user_pseudo_id = r.user_pseudo_id
          ) as event_base
        where
          1 = 1
          and (
            (event_name = '_first_open')
            or (event_name = '_scroll')
            or (event_name = '_user_engagement')
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
          COALESCE(geo_country::varchar, 'null') as geo_country_0
        from
          base_data base
        where
          event_name = '_first_open'
      ),
      table_1 as (
        select
          event_date as event_date_1,
          event_name as event_name_1,
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1,
          COALESCE(geo_country::varchar, 'null') as geo_country_1
        from
          base_data base
        where
          event_name = '_scroll'
      ),
      table_2 as (
        select
          event_date as event_date_2,
          event_name as event_name_2,
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2,
          COALESCE(geo_country::varchar, 'null') as geo_country_2
        from
          base_data base
        where
          event_name = '_user_engagement'
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
          and table_0.geo_country_0 = table_1.geo_country_1
          and table_1.event_timestamp_1 - table_0.event_timestamp_0 > 0
          and table_1.event_timestamp_1 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
          left outer join table_2 on table_1.user_pseudo_id_1 = table_2.user_pseudo_id_2
          and table_1.geo_country_1 = table_2.geo_country_2
          and table_2.event_timestamp_2 - table_1.event_timestamp_1 > 0
          and table_2.event_timestamp_2 - table_0.event_timestamp_0 <= 600 * cast(1000 as bigint)
      ),
      seq_table as (
        select
          0 as seq
        union all
        select
          1 as seq
        union all
        select
          2 as seq
      ),
      final_table as (
        select
          day,
          user_pseudo_id_0,
          user_pseudo_id_1,
          user_pseudo_id_2,
          case
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is not null then case
              when seq = 0 then user_pseudo_id_0
              when seq = 1 then user_pseudo_id_1
              when seq = 2 then user_pseudo_id_2
              else null
            end
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is null then case
              when seq = 0 then user_pseudo_id_0
              when seq = 1 then user_pseudo_id_1
              else null
            end
            when user_pseudo_id_1 is null
            and user_pseudo_id_2 is null then case
              when seq = 0 then user_pseudo_id_0
              else null
            end
          end as user_pseudo_id,
          case
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is not null then case
              when seq = 0 then '1_' || event_name_0
              when seq = 1 then '2_' || event_name_1
              when seq = 2 then '3_' || event_name_2
              else null
            end
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is null then case
              when seq = 0 then '1_' || event_name_0
              when seq = 1 then '2_' || event_name_1
              else null
            end
            when user_pseudo_id_1 is null
            and user_pseudo_id_2 is null then case
              when seq = 0 then '1_' || event_name_0
              else null
            end
          end as event_name,
          case
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is not null then case
              when seq = 0 then geo_country_0
              when seq = 1 then geo_country_1
              when seq = 2 then geo_country_2
              else null
            end
            when user_pseudo_id_1 is not null
            and user_pseudo_id_2 is null then case
              when seq = 0 then geo_country_0
              when seq = 1 then geo_country_1
              else null
            end
            when user_pseudo_id_1 is null
            and user_pseudo_id_2 is null then case
              when seq = 0 then geo_country_0
              else null
            end
          end as group_col
        from
          join_table
          join seq_table on 1 = 1
      )
    select
      day::date as event_date,
      event_name,
      user_pseudo_id,
      group_col
    from
      final_table
    where
      event_name is not null
  `.trim().replace(/ /g, ''),
    );

  });

  test('test date coumpute funtions', () => {
    expect(getMondayOfLastNWeeks(new Date('2024-01-17'), 0).toDateString()).toEqual('Mon Jan 15 2024');
    expect(getMondayOfLastNWeeks(new Date('2024-01-17'), 1).toDateString()).toEqual('Mon Jan 08 2024');
    expect(getMondayOfLastNWeeks(new Date('2024-01-15'), 0).toDateString()).toEqual('Mon Jan 15 2024');
    expect(getMondayOfLastNWeeks(new Date('2024-01-15'), 1).toDateString()).toEqual('Mon Jan 08 2024');
    expect(getMondayOfLastNWeeks(new Date('2024-01-21'), 0).toDateString()).toEqual('Mon Jan 15 2024');
    expect(getMondayOfLastNWeeks(new Date('2024-01-21'), 1).toDateString()).toEqual('Mon Jan 08 2024');

    expect(getFirstDayOfLastNYears(new Date('2024-01-17'), 0).toDateString()).toContain('Mon Jan 01 2024');
    expect(getFirstDayOfLastNYears(new Date('2024-12-31'), 0).toDateString()).toContain('Mon Jan 01 2024');
    expect(getFirstDayOfLastNYears(new Date('2024-01-01'), 0).toDateString()).toContain('Mon Jan 01 2024');
    expect(getFirstDayOfLastNYears(new Date('2024-01-17'), 3).toDateString()).toContain('Fri Jan 01 2021');

    expect(getFirstDayOfLastNMonths(new Date('2024-01-17'), 0).toDateString()).toContain('Mon Jan 01 2024');
    expect(getFirstDayOfLastNMonths(new Date('2024-01-17'), 1).toDateString()).toContain('Fri Dec 01 2023');
    expect(getFirstDayOfLastNMonths(new Date('2000-03-01'), 0).toDateString()).toContain('Wed Mar 01 2000');
    expect(getFirstDayOfLastNMonths(new Date('2023-03-01'), 0).toDateString()).toContain('Wed Mar 01 2023');
    expect(getFirstDayOfLastNMonths(new Date('2023-03-01'), 1).toDateString()).toContain('Wed Feb 01 2023');

    expect(daysBetweenDates(new Date(), new Date())).toEqual(0);
    expect(daysBetweenDates(new Date('2024-01-17'), new Date('2024-01-16'))).toEqual(1);
    expect(daysBetweenDates(new Date('2024-03-01'), new Date('2024-02-01'))).toEqual(29);

  });

  test('relative time range  1 week', () => {
    const sql = buildEventAnalysisView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: false,
      eventAndConditions: [
        {
          eventName: 'view_item',
          computeMethod: ExploreComputeMethod.USER_ID_CNT,
        },
        {
          eventName: 'add_to_cart',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'purchase',
        },
      ],
      timeScopeType: ExploreTimeScopeType.RELATIVE,
      lastN: 1,
      timeUnit: ExploreRelativeTimeUnit.WK,
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
              event_date,
              event_name,
              event_id,
              event_timestamp,
              COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
              r.user_id,
              month,
              week,
              day,
              hour
            from
              (
                select
                  event_date,
                  event_name::varchar as event_name,
                  event_id::varchar as event_id,
                  event_timestamp::bigint as event_timestamp,
                  user_pseudo_id,
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
                  shop.event as event
                where
                  event.event_date >= date_trunc('week', current_date - interval '0 weeks')
                  and event.event_date <= CURRENT_DATE
                  and event.event_name in ('view_item', 'add_to_cart', 'purchase')
              ) as l
              join (
                select
                  user_pseudo_id,
                  user_id
                from
                  shop.user_m_view
                group by
                  user_pseudo_id,
                  user_id
              ) as r on l.user_pseudo_id = r.user_pseudo_id
          ) as event_base
        where
          1 = 1
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
          event_name = 'view_item'
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
          event_name = 'add_to_cart'
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
          event_name = 'purchase'
      ),
      join_table as (
        select
          table_0.month,
          table_0.week,
          table_0.day,
          table_0.hour,
          1 || '_' || table_0.event_name_0 as event_name,
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
          2 || '_' || table_1.event_name_1 as event_name,
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
          3 || '_' || table_2.event_name_2 as event_name,
          table_2.event_timestamp_2 as event_timestamp,
          table_2.event_id_2 as x_id
        from
          table_2
      )
    select
      day::date as event_date,
      event_name,
      x_id as id
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

  test('retention view - relative time range - check date list', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-18'));

    const sql = buildRetentionAnalysisView({
      schemaName: 'shop',
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
          category: ConditionCategory.DEVICE,
          property: 'screen_height',
          operator: '<>',
          value: [1400],
          dataType: MetadataValueType.INTEGER,
        }],
        conditionOperator: 'and',
      },
      timeScopeType: ExploreTimeScopeType.RELATIVE,
      groupColumn: ExploreGroupColumn.DAY,
      lastN: 0,
      timeUnit: ExploreRelativeTimeUnit.WK,
      pairEventAndConditions: [
        {
          startEvent: {
            eventName: 'view_item',
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
            eventName: 'add_to_cart',
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
            eventName: 'view_item',
          },
          backEvent: {
            eventName: 'purchase',
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
                event_date,
                event_name,
                event_id,
                event_timestamp,
                platform,
                device_screen_height,
                COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
                r.user_id,
                month,
                week,
                day,
                hour
              from
                (
                  select
                    event_date,
                    event_name::varchar as event_name,
                    event_id::varchar as event_id,
                    event_timestamp::bigint as event_timestamp,
                    platform::varchar as platform,
                    device.screen_height::bigint as device_screen_height,
                    user_pseudo_id,
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
                    shop.event as event
                  where
                    event.event_date >= date_trunc('week', current_date - interval '-1 weeks')
                    and event.event_date <= CURRENT_DATE
                    and event.event_name in ('view_item', 'add_to_cart', 'purchase')
                ) as l
                join (
                  select
                    user_pseudo_id,
                    user_id
                  from
                    shop.user_m_view
                  group by
                    user_pseudo_id,
                    user_id
                ) as r on l.user_pseudo_id = r.user_pseudo_id
            ) as event_base
          where
            1 = 1
            and (
              platform = 'Android'
              and (
                device_screen_height is null
                or device_screen_height <> 1400
              )
            )
        ),
        date_list as (
          select
            (CURRENT_DATE - INTERVAL '0 day')::date as event_date
          union all
          select
            (CURRENT_DATE - INTERVAL '1 day')::date as event_date
          union all
          select
            (CURRENT_DATE - INTERVAL '2 day')::date as event_date
          union all
          select
            (CURRENT_DATE - INTERVAL '3 day')::date as event_date
        ),
        first_date as (
          select
            min(event_date) as first_date
          from
            date_list
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
            event_name = 'view_item'
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
            event_name = 'add_to_cart'
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
            event_name = 'view_item'
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
            event_name = 'purchase'
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
        grouping,
        start_event_date,
        event_date
      order by
        grouping,
        event_date
  `.trim().replace(/ /g, ''),
    );

  });

  test('not contains and not in filter', () => {

    const sql = buildEventAnalysisView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      globalEventCondition: {
        conditions: [
          {
            category: ConditionCategory.OTHER,
            property: 'platform',
            operator: ExploreAnalyticsOperators.NOT_IN,
            value: ['AAA', 'BBB'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.GEO,
            property: 'country',
            operator: ExploreAnalyticsOperators.NOT_CONTAINS,
            value: ['JP'],
            dataType: MetadataValueType.STRING,
          },
        ],
      },
      eventAndConditions: [
        {
          eventName: 'view_item',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: ExploreAnalyticsOperators.NOT_IN,
                value: ['AAA', 'BBB'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: ExploreAnalyticsOperators.NOT_CONTAINS,
                value: ['JP'],
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
          eventName: 'add_to_cart',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'purchase',
          computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          platform,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              platform::varchar as platform,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
              and event.event_name in ('view_item', 'add_to_cart', 'purchase')
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
              platform is null
              or platform not in ('AAA', 'BBB')
            )
            and (
              geo_country is null
              or geo_country not like '%JP%'
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
          event_name = 'view_item'
          and (
            (
              platform is null
              or platform not in ('AAA', 'BBB')
            )
            and (
              geo_country is null
              or geo_country not like '%JP%'
            )
            and _user_first_touch_timestamp > 1686532526770
            and _user_first_touch_timestamp > 1686532526780
          )
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
          event_name = 'add_to_cart'
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
          event_name = 'purchase'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _session_duration > 200
          )
      ),
      join_table as (
        select
          table_0.month,
          table_0.week,
          table_0.day,
          table_0.hour,
          1 || '_' || table_0.event_name_0 as event_name,
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
          2 || '_' || table_1.event_name_1 as event_name,
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
          3 || '_' || table_2.event_name_2 as event_name,
          table_2.event_timestamp_2 as event_timestamp,
          table_2.user_pseudo_id_2 as x_id
        from
          table_2
      )
    select
      day::date as event_date,
      event_name,
      x_id as id
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

  test('event analysis - same event', () => {

    const sql = buildEventAnalysisView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      globalEventCondition: {
        conditions: [
          {
            category: ConditionCategory.OTHER,
            property: 'platform',
            operator: ExploreAnalyticsOperators.NOT_IN,
            value: ['AAA', 'BBB'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.GEO,
            property: 'country',
            operator: ExploreAnalyticsOperators.NOT_CONTAINS,
            value: ['JP'],
            dataType: MetadataValueType.STRING,
          },
        ],
      },
      eventAndConditions: [
        {
          eventName: 'view_item',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: ExploreAnalyticsOperators.EQUAL,
                value: ['America'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
        {
          eventName: 'view_item',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: ExploreAnalyticsOperators.EQUAL,
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
        {
          eventName: 'purchase',
          computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          geo_country,
          platform,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              geo.country::varchar as geo_country,
              platform::varchar as platform,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
              and event.event_name in ('view_item', 'purchase')
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
              platform is null
              or platform not in ('AAA', 'BBB')
            )
            and (
              geo_country is null
              or geo_country not like '%JP%'
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
          event_name = 'view_item'
          and (geo_country = 'America')
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
          event_name = 'view_item'
          and (geo_country = 'China')
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
          event_name = 'purchase'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _session_duration > 200
          )
      ),
      join_table as (
        select
          table_0.month,
          table_0.week,
          table_0.day,
          table_0.hour,
          1 || '_' || table_0.event_name_0 as event_name,
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
          2 || '_' || table_1.event_name_1 as event_name,
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
          3 || '_' || table_2.event_name_2 as event_name,
          table_2.event_timestamp_2 as event_timestamp,
          table_2.user_pseudo_id_2 as x_id
        from
          table_2
      )
    select
      day::date as event_date,
      event_name,
      x_id as id
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

  test('event analysis - special char \'', () => {

    const sql = buildEventAnalysisView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      globalEventCondition: {
        conditions: [
          {
            category: ConditionCategory.GEO,
            property: 'country',
            operator: ExploreAnalyticsOperators.EQUAL,
            value: ['China\'\''],
            dataType: MetadataValueType.STRING,
          },
        ],
      },
      eventAndConditions: [
        {
          eventName: 'view_item',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: ExploreAnalyticsOperators.EQUAL,
                value: ['China\'\''],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
        {
          eventName: 'purchase',
          computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
        user_base as (
          select
            COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
            user_id as user_id,
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
            shop.user_m_view u,
            u.user_properties as user_properties
        ),
        event_base as (
          select
            event_date,
            event_name,
            event_id,
            event_timestamp,
            geo_country,
            platform,
            COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
            r.user_id,
            month,
            week,
            day,
            hour
          from
            (
              select
                event_date,
                event_name::varchar as event_name,
                event_id::varchar as event_id,
                event_timestamp::bigint as event_timestamp,
                geo.country::varchar as geo_country,
                platform::varchar as platform,
                user_pseudo_id,
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
                shop.event as event
              where
                event.event_date >= date '2023-10-01'
                and event.event_date <= date '2025-10-10'
                and event.event_name in ('view_item', 'purchase')
            ) as l
            join (
              select
                user_pseudo_id,
                user_id
              from
                shop.user_m_view
              group by
                user_pseudo_id,
                user_id
            ) as r on l.user_pseudo_id = r.user_pseudo_id
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
                join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
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
            and (geo_country = 'China''')
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
            event_name = 'view_item'
            and (geo_country = 'China''')
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
            event_name = 'purchase'
            and (
              platform = 'Android'
              and geo_country = 'China'
              and _user_first_touch_timestamp > 1686532526770
              and _session_duration > 200
            )
        ),
        join_table as (
          select
            table_0.month,
            table_0.week,
            table_0.day,
            table_0.hour,
            1 || '_' || table_0.event_name_0 as event_name,
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
            2 || '_' || table_1.event_name_1 as event_name,
            table_1.event_timestamp_1 as event_timestamp,
            table_1.user_pseudo_id_1 as x_id
          from
            table_1
        )
      select
        day::date as event_date,
        event_name,
        x_id as id
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

  test('special char \'', () => {

    const sql = buildRetentionAnalysisView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
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
            value: ['Android\'\''],
            dataType: MetadataValueType.STRING,
          },
        ],
        conditionOperator: 'and',
      },
      timeScopeType: ExploreTimeScopeType.FIXED,
      groupColumn: ExploreGroupColumn.WEEK,
      timeStart: new Date('2023-06-19'),
      timeEnd: new Date('2023-06-22'),
      pairEventAndConditions: [
        {
          startEvent: {
            eventName: 'view_item',
            sqlCondition: {
              conditions: [
                {
                  category: ConditionCategory.USER_OUTER,
                  property: '_channel',
                  operator: '=',
                  value: ['apple\'\''],
                  dataType: MetadataValueType.STRING,
                },
              ],
              conditionOperator: 'or',
            },
          },
          backEvent: {
            eventName: 'add_to_cart',
            sqlCondition: {
              conditions: [
                {
                  category: ConditionCategory.USER_OUTER,
                  property: '_channel',
                  operator: '=',
                  value: ['apple\'\''],
                  dataType: MetadataValueType.STRING,
                },
              ],
              conditionOperator: 'or',
            },
          },
        },
        {
          startEvent: {
            eventName: 'view_item',
          },
          backEvent: {
            eventName: 'purchase',
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
            event_base.*,
            user_base.*
          from
            (
              select
                event_date,
                event_name,
                event_id,
                event_timestamp,
                platform,
                device_screen_height,
                COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
                r.user_id,
                month,
                week,
                day,
                hour
              from
                (
                  select
                    event_date,
                    event_name::varchar as event_name,
                    event_id::varchar as event_id,
                    event_timestamp::bigint as event_timestamp,
                    platform::varchar as platform,
                    device.screen_height::bigint as device_screen_height,
                    user_pseudo_id,
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
                    shop.event as event
                  where
                    event.event_date >= date '2023-06-19'
                    and event.event_date <= date '2023-06-22'
                    and event.event_name in ('view_item', 'add_to_cart', 'purchase')
                ) as l
                join (
                  select
                    user_pseudo_id,
                    user_id
                  from
                    shop.user_m_view
                  group by
                    user_pseudo_id,
                    user_id
                ) as r on l.user_pseudo_id = r.user_pseudo_id
            ) as event_base
            join (
              select
                COALESCE(user_id, user_pseudo_id) as user_pseudo_id_join,
                user_id as user_id_join,
                user_first_touch_timestamp,
                _first_visit_date,
                _first_referer,
                _first_traffic_source_type,
                _first_traffic_medium,
                _first_traffic_source,
                _channel
              from
                shop.user_m_view u
            ) as user_base on event_base.user_pseudo_id = user_base.user_pseudo_id_join
          where
            1 = 1
            and (platform = 'Android''')
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
        first_date as (
          select
            min(event_date) as first_date
          from
            date_list
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
            event_name = 'view_item'
            and (_channel = 'apple''')
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
            event_name = 'add_to_cart'
            and (_channel = 'apple''')
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
            event_name = 'view_item'
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
            event_name = 'purchase'
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
        DATE_TRUNC('week', start_event_date) - INTERVAL '1 day' as start_event_date,
        DATE_TRUNC('week', event_date) - INTERVAL '1 day' as event_date,
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
        event_date
  `.trim().replace(/ /g, ''),
    );

  });

  test('special char for like condition', () => {

    const sql = buildRetentionAnalysisView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      globalEventCondition: {
        conditions: [
          {
            category: ConditionCategory.DEVICE,
            property: 'platform',
            operator: ExploreAnalyticsOperators.CONTAINS,
            value: ['%'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.EVENT,
            property: 'project_category',
            operator: ExploreAnalyticsOperators.CONTAINS,
            value: ['%'],
            dataType: MetadataValueType.STRING,
          },
        ],
        conditionOperator: 'and',
      },
      timeScopeType: ExploreTimeScopeType.FIXED,
      groupColumn: ExploreGroupColumn.WEEK,
      timeStart: new Date('2023-06-19'),
      timeEnd: new Date('2023-06-22'),
      pairEventAndConditions: [
        {
          startEvent: {
            eventName: 'view_item',
            sqlCondition: {
              conditions: [
                {
                  category: ConditionCategory.DEVICE,
                  property: 'platform',
                  operator: ExploreAnalyticsOperators.CONTAINS,
                  value: ['%'],
                  dataType: MetadataValueType.STRING,
                },
                {
                  category: ConditionCategory.EVENT,
                  property: 'project_category',
                  operator: ExploreAnalyticsOperators.CONTAINS,
                  value: ['%'],
                  dataType: MetadataValueType.STRING,
                },
              ],
              conditionOperator: 'or',
            },
          },
          backEvent: {
            eventName: 'add_to_cart',
            sqlCondition: {
              conditions: [
                {
                  category: ConditionCategory.DEVICE,
                  property: 'platform',
                  operator: ExploreAnalyticsOperators.CONTAINS,
                  value: ['%'],
                  dataType: MetadataValueType.STRING,
                },
                {
                  category: ConditionCategory.EVENT,
                  property: 'project_category',
                  operator: ExploreAnalyticsOperators.CONTAINS,
                  value: ['%'],
                  dataType: MetadataValueType.STRING,
                },
              ],
              conditionOperator: 'or',
            },
          },
        },
        {
          startEvent: {
            eventName: 'view_item',
            sqlCondition: {
              conditions: [
                {
                  category: ConditionCategory.APP_INFO,
                  property: 'install_source',
                  operator: ExploreAnalyticsOperators.NOT_CONTAINS,
                  value: ['_'],
                  dataType: MetadataValueType.STRING,
                },
                {
                  category: ConditionCategory.USER,
                  property: 'status',
                  operator: ExploreAnalyticsOperators.NOT_CONTAINS,
                  value: ['%'],
                  dataType: MetadataValueType.STRING,
                },
              ],
              conditionOperator: 'or',
            },
          },
          backEvent: {
            eventName: 'purchase',
            sqlCondition: {
              conditions: [
                {
                  category: ConditionCategory.APP_INFO,
                  property: 'install_source',
                  operator: ExploreAnalyticsOperators.NOT_CONTAINS,
                  value: ['_'],
                  dataType: MetadataValueType.STRING,
                },
                {
                  category: ConditionCategory.USER,
                  property: 'status',
                  operator: ExploreAnalyticsOperators.NOT_CONTAINS,
                  value: ['%'],
                  dataType: MetadataValueType.STRING,
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
      user_base as (
        select
          COALESCE(user_id, user_pseudo_id) as user_pseudo_id,
          user_id as user_id,
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
          shop.user_m_view u,
          u.user_properties as user_properties
      ),
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          device_platform,
          app_info_install_source,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              device.platform::varchar as device_platform,
              app_info.install_source::varchar as app_info_install_source,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-06-19'
              and event.event_date <= date '2023-06-22'
              and event.event_name in ('view_item', 'add_to_cart', 'purchase')
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
      ),
      base_data as (
        select
          status,
          project_category,
          event_base.*
        from
          event_base
          join (
            select
              event_base.event_id,
              max(
                case
                  when event_param_key = 'project_category' then event_param_string_value
                  else null
                end
              ) as project_category
            from
              event_base
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
          join (
            select
              event_base.user_pseudo_id,
              max(
                case
                  when user_param_key = 'status' then user_param_string_value
                  else null
                end
              ) as status
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
          and (
            device_platform like '%\\\\%%'
            and project_category like '%\\\\%%'
          )
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
      first_date as (
        select
          min(event_date) as first_date
        from
          date_list
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
          event_name = 'view_item'
          and (
            device_platform like '%\\\\%%'
            or project_category like '%\\\\%%'
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
          event_name = 'add_to_cart'
          and (
            device_platform like '%\\\\%%'
            or project_category like '%\\\\%%'
          )
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
          event_name = 'view_item'
          and (
            (
              app_info_install_source is null
              or app_info_install_source not like '%\\\\_%'
            )
            or (
              status is null
              or status not like '%\\\\%%'
            )
          )
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
          event_name = 'purchase'
          and (
            (
              app_info_install_source is null
              or app_info_install_source not like '%\\\\_%'
            )
            or (
              status is null
              or status not like '%\\\\%%'
            )
          )
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
      DATE_TRUNC('week', start_event_date) - INTERVAL '1 day' as start_event_date,
      DATE_TRUNC('week', event_date) - INTERVAL '1 day' as event_date,
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
      event_date
  `.trim().replace(/ /g, ''),
    );

  });

  test('count on property', () => {
    const sql = buildEventPropertyAnalysisView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.COUNT_PROPERTY,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: 'view_item',
          computeMethod: ExploreComputeMethod.COUNT_PROPERTY,
          eventExtParameter: {
            targetProperty: {
              category: ConditionCategory.GEO,
              property: 'country',
              dataType: MetadataValueType.STRING,
            },
          },
        },
        {
          eventName: 'view_item',
          computeMethod: ExploreComputeMethod.COUNT_PROPERTY,
          eventExtParameter: {
            targetProperty: {
              category: ConditionCategory.GEO,
              property: 'country',
              dataType: MetadataValueType.STRING,
            },
          },
        },
        {
          eventName: 'purchase',
          computeMethod: ExploreComputeMethod.COUNT_PROPERTY,
          eventExtParameter: {
            targetProperty: {
              category: ConditionCategory.GEO,
              property: 'country',
              dataType: MetadataValueType.STRING,
            },
          },
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
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
            event_date,
            event_name,
            event_id,
            event_timestamp,
            geo_country,
            COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
            r.user_id,
            month,
            week,
            day,
            hour
          from
            (
              select
                event_date,
                event_name::varchar as event_name,
                event_id::varchar as event_id,
                event_timestamp::bigint as event_timestamp,
                geo.country::varchar as geo_country,
                user_pseudo_id,
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
                shop.event as event
              where
                event.event_date >= date '2023-10-01'
                and event.event_date <= date '2025-10-10'
                and event.event_name in ('view_item', 'purchase')
            ) as l
            join (
              select
                user_pseudo_id,
                user_id
              from
                shop.user_m_view
              group by
                user_pseudo_id,
                user_id
            ) as r on l.user_pseudo_id = r.user_pseudo_id
        ) as event_base
      where
        1 = 1
        and (
          (event_name = 'view_item')
          or (event_name = 'purchase')
        )
    ),
    table_0 as (
      select
        month,
        week,
        day,
        hour,
        geo_country as custom_attr_0,
        event_date as event_date_0,
        event_name as event_name_0,
        event_timestamp as event_timestamp_0,
        event_id as event_id_0,
        user_id as user_id_0,
        user_pseudo_id as user_pseudo_id_0
      from
        base_data base
      where
        event_name = 'view_item'
    ),
    table_1 as (
      select
        month,
        week,
        day,
        hour,
        geo_country as custom_attr_1,
        event_date as event_date_1,
        event_name as event_name_1,
        event_timestamp as event_timestamp_1,
        event_id as event_id_1,
        user_id as user_id_1,
        user_pseudo_id as user_pseudo_id_1
      from
        base_data base
      where
        event_name = 'view_item'
    ),
    table_2 as (
      select
        month,
        week,
        day,
        hour,
        geo_country as custom_attr_2,
        event_date as event_date_2,
        event_name as event_name_2,
        event_timestamp as event_timestamp_2,
        event_id as event_id_2,
        user_id as user_id_2,
        user_pseudo_id as user_pseudo_id_2
      from
        base_data base
      where
        event_name = 'purchase'
    ),
    join_table as (
      select
        table_0.month,
        table_0.week,
        table_0.day,
        table_0.hour,
        1 || '_' || table_0.event_name_0 as event_name,
        table_0.event_timestamp_0 as event_timestamp,
        table_0.custom_attr_0 as x_id,
        table_0.event_id_0 as custom_attr_id
      from
        table_0
      union all
      select
        table_1.month,
        table_1.week,
        table_1.day,
        table_1.hour,
        2 || '_' || table_1.event_name_1 as event_name,
        table_1.event_timestamp_1 as event_timestamp,
        table_1.custom_attr_1 as x_id,
        table_1.event_id_1 as custom_attr_id
      from
        table_1
      union all
      select
        table_2.month,
        table_2.week,
        table_2.day,
        table_2.hour,
        3 || '_' || table_2.event_name_2 as event_name,
        table_2.event_timestamp_2 as event_timestamp,
        table_2.custom_attr_2 as x_id,
        table_2.event_id_2 as custom_attr_id
      from
        table_2
    )
  select
    day::date as event_date,
    event_name,
    x_id as id,
    custom_attr_id
  from
    join_table
  group by
    day,
    event_name,
    x_id,
    custom_attr_id
  `.trim().replace(/ /g, ''),
    );

  });

  test('sum on property', () => {
    const sql = buildEventPropertyAnalysisView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.COUNT_PROPERTY,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: 'view_item',
          computeMethod: ExploreComputeMethod.AGGREGATION_PROPERTY,
          eventExtParameter: {
            targetProperty: {
              category: ConditionCategory.EVENT,
              property: '_session_duration',
              dataType: MetadataValueType.INTEGER,
            },
            aggregationMethod: ExploreAggregationMethod.SUM,
          },
        },
        {
          eventName: 'view_item',
          computeMethod: ExploreComputeMethod.AGGREGATION_PROPERTY,
          eventExtParameter: {
            targetProperty: {
              category: ConditionCategory.EVENT,
              property: '_session_duration',
              dataType: MetadataValueType.INTEGER,
            },
            aggregationMethod: ExploreAggregationMethod.SUM,
          },
        },
        {
          eventName: 'purchase',
          computeMethod: ExploreComputeMethod.AGGREGATION_PROPERTY,
          eventExtParameter: {
            targetProperty: {
              category: ConditionCategory.EVENT,
              property: '_session_duration',
              dataType: MetadataValueType.INTEGER,
            },
            aggregationMethod: ExploreAggregationMethod.SUM,
          },
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
    event_base as (
      select
        event_date,
        event_name,
        event_id,
        event_timestamp,
        COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
        r.user_id,
        month,
        week,
        day,
        hour
      from
        (
          select
            event_date,
            event_name::varchar as event_name,
            event_id::varchar as event_id,
            event_timestamp::bigint as event_timestamp,
            user_pseudo_id,
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
            shop.event as event
          where
            event.event_date >= date '2023-10-01'
            and event.event_date <= date '2025-10-10'
            and event.event_name in ('view_item', 'purchase')
        ) as l
        join (
          select
            user_pseudo_id,
            user_id
          from
            shop.user_m_view
          group by
            user_pseudo_id,
            user_id
        ) as r on l.user_pseudo_id = r.user_pseudo_id
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
            join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
            and event_base.event_id = event_param.event_id
          group by
            event_base.event_id
        ) as event_join_table on event_base.event_id = event_join_table.event_id
      where
        1 = 1
        and (
          (event_name = 'view_item')
          or (event_name = 'purchase')
        )
    ),
    table_0 as (
      select
        month,
        week,
        day,
        hour,
        _session_duration as custom_attr_0,
        event_date as event_date_0,
        event_name as event_name_0,
        event_timestamp as event_timestamp_0,
        event_id as event_id_0,
        user_id as user_id_0,
        user_pseudo_id as user_pseudo_id_0
      from
        base_data base
      where
        event_name = 'view_item'
    ),
    table_1 as (
      select
        month,
        week,
        day,
        hour,
        _session_duration as custom_attr_1,
        event_date as event_date_1,
        event_name as event_name_1,
        event_timestamp as event_timestamp_1,
        event_id as event_id_1,
        user_id as user_id_1,
        user_pseudo_id as user_pseudo_id_1
      from
        base_data base
      where
        event_name = 'view_item'
    ),
    table_2 as (
      select
        month,
        week,
        day,
        hour,
        _session_duration as custom_attr_2,
        event_date as event_date_2,
        event_name as event_name_2,
        event_timestamp as event_timestamp_2,
        event_id as event_id_2,
        user_id as user_id_2,
        user_pseudo_id as user_pseudo_id_2
      from
        base_data base
      where
        event_name = 'purchase'
    ),
    join_table as (
      select
        table_0.month,
        table_0.week,
        table_0.day,
        table_0.hour,
        1 || '_' || table_0.event_name_0 as event_name,
        table_0.event_timestamp_0 as event_timestamp,
        table_0.event_id_0 as x_id,
        table_0.custom_attr_0 as custom_attr_id
      from
        table_0
      union all
      select
        table_1.month,
        table_1.week,
        table_1.day,
        table_1.hour,
        2 || '_' || table_1.event_name_1 as event_name,
        table_1.event_timestamp_1 as event_timestamp,
        table_1.event_id_1 as x_id,
        table_1.custom_attr_1 as custom_attr_id
      from
        table_1
      union all
      select
        table_2.month,
        table_2.week,
        table_2.day,
        table_2.hour,
        3 || '_' || table_2.event_name_2 as event_name,
        table_2.event_timestamp_2 as event_timestamp,
        table_2.event_id_2 as x_id,
        table_2.custom_attr_2 as custom_attr_id
      from
        table_2
    )
  select
    day::date as event_date,
    event_name,
    custom_attr_id as id
  from 
    join_table  
  group by
    day,
    event_name,
    custom_attr_id
    `.trim().replace(/ /g, ''),
    );

  });

  test('aggregate on property with different compute method', () => {
    const sql = buildEventPropertyAnalysisView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.COUNT_PROPERTY,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: 'view_item',
          computeMethod: ExploreComputeMethod.AGGREGATION_PROPERTY,
          eventExtParameter: {
            targetProperty: {
              category: ConditionCategory.EVENT,
              property: '_session_duration',
              dataType: MetadataValueType.INTEGER,
            },
            aggregationMethod: ExploreAggregationMethod.SUM,
          },
        },
        {
          eventName: 'view_item',
          computeMethod: ExploreComputeMethod.AGGREGATION_PROPERTY,
          eventExtParameter: {
            targetProperty: {
              category: ConditionCategory.EVENT,
              property: '_session_duration',
              dataType: MetadataValueType.INTEGER,
            },
            aggregationMethod: ExploreAggregationMethod.MAX,
          },
        },
        {
          eventName: 'purchase',
          computeMethod: ExploreComputeMethod.AGGREGATION_PROPERTY,
          eventExtParameter: {
            targetProperty: {
              category: ConditionCategory.EVENT,
              property: '_session_duration',
              dataType: MetadataValueType.INTEGER,
            },
            aggregationMethod: ExploreAggregationMethod.MEDIAN,
          },
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
              and event.event_name in ('view_item', 'purchase')
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
        where
          1 = 1
          and (
            (event_name = 'view_item')
            or (event_name = 'purchase')
          )
      ),
      table_0 as (
        select
          month,
          week,
          day,
          hour,
          _session_duration as custom_attr_0,
          event_date as event_date_0,
          event_name as event_name_0,
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0
        from
          base_data base
        where
          event_name = 'view_item'
      ),
      table_1 as (
        select
          month,
          week,
          day,
          hour,
          _session_duration as custom_attr_1,
          event_date as event_date_1,
          event_name as event_name_1,
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1
        from
          base_data base
        where
          event_name = 'view_item'
      ),
      table_2 as (
        select
          month,
          week,
          day,
          hour,
          _session_duration as custom_attr_2,
          event_date as event_date_2,
          event_name as event_name_2,
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2
        from
          base_data base
        where
          event_name = 'purchase'
      ),
      join_table as (
        select
          DAY as event_date,
          event_name,
          null as custom_attr_id,
          sum(custom_attr_id) as "count/aggregation amount"
        from
          (
            select
              table_0.month,
              table_0.week,
              table_0.day,
              table_0.hour,
              1 || '_' || table_0.event_name_0 as event_name,
              table_0.event_timestamp_0 as event_timestamp,
              table_0.event_id_0 as x_id,
              table_0.custom_attr_0 as custom_attr_id
            from
              table_0
          ) as union_table_0
        group by
          DAY,
          event_name,
          custom_attr_id
        union all
        select
          DAY as event_date,
          event_name,
          null as custom_attr_id,
          max(custom_attr_id) as "count/aggregation amount"
        from
          (
            select
              table_1.month,
              table_1.week,
              table_1.day,
              table_1.hour,
              2 || '_' || table_1.event_name_1 as event_name,
              table_1.event_timestamp_1 as event_timestamp,
              table_1.event_id_1 as x_id,
              table_1.custom_attr_1 as custom_attr_id
            from
              table_1
          ) as union_table_1
        group by
          DAY,
          event_name,
          custom_attr_id
        union all
        select
          DAY as event_date,
          event_name,
          null as custom_attr_id,
          median (custom_attr_id) as "count/aggregation amount"
        from
          (
            select
              table_2.month,
              table_2.week,
              table_2.day,
              table_2.hour,
              3 || '_' || table_2.event_name_2 as event_name,
              table_2.event_timestamp_2 as event_timestamp,
              table_2.event_id_2 as x_id,
              table_2.custom_attr_2 as custom_attr_id
            from
              table_2
          ) as union_table_2
        group by
          DAY,
          event_name,
          custom_attr_id
      )
    select
      *
    from
      join_table
    `.trim().replace(/ /g, ''),
    );

  });

  test('mix count and sum computed method', () => {

    const sql = buildEventPropertyAnalysisView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.COUNT_PROPERTY,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: 'view_item',
          computeMethod: ExploreComputeMethod.COUNT_PROPERTY,
          eventExtParameter: {
            targetProperty: {
              category: ConditionCategory.GEO,
              property: 'country',
              dataType: MetadataValueType.STRING,
            },
          },
        },
        {
          eventName: 'view_item',
          computeMethod: ExploreComputeMethod.AGGREGATION_PROPERTY,
          eventExtParameter: {
            targetProperty: {
              category: ConditionCategory.EVENT,
              property: '_session_duration',
              dataType: MetadataValueType.INTEGER,
            },
            aggregationMethod: ExploreAggregationMethod.SUM,
          },
        },
        {
          eventName: 'purchase',
          computeMethod: ExploreComputeMethod.COUNT_PROPERTY,
          eventExtParameter: {
            targetProperty: {
              category: ConditionCategory.GEO,
              property: 'country',
              dataType: MetadataValueType.STRING,
            },
          },
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
              and event.event_name in ('view_item', 'purchase')
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
        where
          1 = 1
          and (
            (event_name = 'view_item')
            or (event_name = 'purchase')
          )
      ),
      table_0 as (
        select
          month,
          week,
          day,
          hour,
          geo_country as custom_attr_0,
          event_date as event_date_0,
          event_name as event_name_0,
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0
        from
          base_data base
        where
          event_name = 'view_item'
      ),
      table_1 as (
        select
          month,
          week,
          day,
          hour,
          _session_duration as custom_attr_1,
          event_date as event_date_1,
          event_name as event_name_1,
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1
        from
          base_data base
        where
          event_name = 'view_item'
      ),
      table_2 as (
        select
          month,
          week,
          day,
          hour,
          geo_country as custom_attr_2,
          event_date as event_date_2,
          event_name as event_name_2,
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2
        from
          base_data base
        where
          event_name = 'purchase'
      ),
      join_table as (
        select
          DAY as event_date,
          event_name,
          custom_attr_id,
          count(1) as "count/aggregation amount"
        from
          (
            select
              table_0.month,
              table_0.week,
              table_0.day,
              table_0.hour,
              1 || '_' || table_0.event_name_0 as event_name,
              table_0.event_timestamp_0 as event_timestamp,
              table_0.event_id_0 as x_id,
              table_0.custom_attr_0 as custom_attr_id
            from
              table_0
          ) as union_table_0
        group by
          DAY,
          event_name,
          custom_attr_id
        union all
        select
          DAY as event_date,
          event_name,
          null as custom_attr_id,
          sum(custom_attr_id) as "count/aggregation amount"
        from
          (
            select
              table_1.month,
              table_1.week,
              table_1.day,
              table_1.hour,
              2 || '_' || table_1.event_name_1 as event_name,
              table_1.event_timestamp_1 as event_timestamp,
              table_1.event_id_1 as x_id,
              table_1.custom_attr_1 as custom_attr_id
            from
              table_1
          ) as union_table_1
        group by
          DAY,
          event_name,
          custom_attr_id
        union all
        select
          DAY as event_date,
          event_name,
          custom_attr_id,
          count(1) as "count/aggregation amount"
        from
          (
            select
              table_2.month,
              table_2.week,
              table_2.day,
              table_2.hour,
              3 || '_' || table_2.event_name_2 as event_name,
              table_2.event_timestamp_2 as event_timestamp,
              table_2.event_id_2 as x_id,
              table_2.custom_attr_2 as custom_attr_id
            from
              table_2
          ) as union_table_2
        group by
          DAY,
          event_name,
          custom_attr_id
      )
    select
      *
    from
      join_table
    `.trim().replace(/ /g, ''),
    );

  });

  test('mix id count and property count method', () => {

    const sql = buildEventPropertyAnalysisView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.COUNT_PROPERTY,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: 'view_item',
          computeMethod: ExploreComputeMethod.COUNT_PROPERTY,
          eventExtParameter: {
            targetProperty: {
              category: ConditionCategory.GEO,
              property: 'country',
              dataType: MetadataValueType.STRING,
            },
          },
        },
        {
          eventName: 'view_item',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'purchase',
          computeMethod: ExploreComputeMethod.USER_ID_CNT,
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
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
              event_date,
              event_name,
              event_id,
              event_timestamp,
              geo_country,
              COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
              r.user_id,
              month,
              week,
              day,
              hour
            from
              (
                select
                  event_date,
                  event_name::varchar as event_name,
                  event_id::varchar as event_id,
                  event_timestamp::bigint as event_timestamp,
                  geo.country::varchar as geo_country,
                  user_pseudo_id,
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
                  shop.event as event
                where
                  event.event_date >= date '2023-10-01'
                  and event.event_date <= date '2025-10-10'
                  and event.event_name in ('view_item', 'purchase')
              ) as l
              join (
                select
                  user_pseudo_id,
                  user_id
                from
                  shop.user_m_view
                group by
                  user_pseudo_id,
                  user_id
              ) as r on l.user_pseudo_id = r.user_pseudo_id
          ) as event_base
        where
          1 = 1
          and (
            (event_name = 'view_item')
            or (event_name = 'purchase')
          )
      ),
      table_0 as (
        select
          month,
          week,
          day,
          hour,
          geo_country as custom_attr_0,
          event_date as event_date_0,
          event_name as event_name_0,
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0
        from
          base_data base
        where
          event_name = 'view_item'
      ),
      table_1 as (
        select
          month,
          week,
          day,
          hour,
          null as custom_attr_1,
          event_date as event_date_1,
          event_name as event_name_1,
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1
        from
          base_data base
        where
          event_name = 'view_item'
      ),
      table_2 as (
        select
          month,
          week,
          day,
          hour,
          null as custom_attr_2,
          event_date as event_date_2,
          event_name as event_name_2,
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2
        from
          base_data base
        where
          event_name = 'purchase'
      ),
      join_table as (
        select
          table_0.month,
          table_0.week,
          table_0.day,
          table_0.hour,
          1 || '_' || table_0.event_name_0 as event_name,
          table_0.event_timestamp_0 as event_timestamp,
          table_0.custom_attr_0 as x_id,
          table_0.event_id_0 as custom_attr_id
        from
          table_0
        union all
        select
          table_1.month,
          table_1.week,
          table_1.day,
          table_1.hour,
          2 || '_' || table_1.event_name_1 as event_name,
          table_1.event_timestamp_1 as event_timestamp,
          null as x_id,
          table_1.event_id_1 as custom_attr_id
        from
          table_1
        union all
        select
          table_2.month,
          table_2.week,
          table_2.day,
          table_2.hour,
          3 || '_' || table_2.event_name_2 as event_name,
          table_2.event_timestamp_2 as event_timestamp,
          null as x_id,
          table_2.user_pseudo_id_2 as custom_attr_id
        from
          table_2
      )
    select
      day::date as event_date,
      event_name,
      x_id as id,
      custom_attr_id
    from
      join_table
    group by
      day,
      event_name,
      x_id,
      custom_attr_id
    `.trim().replace(/ /g, ''),
    );

  });

  test('mix all computed method', () => {

    const sql = buildEventPropertyAnalysisView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.COUNT_PROPERTY,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: 'view_item',
          computeMethod: ExploreComputeMethod.COUNT_PROPERTY,
          eventExtParameter: {
            targetProperty: {
              category: ConditionCategory.GEO,
              property: 'country',
              dataType: MetadataValueType.STRING,
            },
          },
        },
        {
          eventName: 'view_item',
          computeMethod: ExploreComputeMethod.AGGREGATION_PROPERTY,
          eventExtParameter: {
            targetProperty: {
              category: ConditionCategory.EVENT,
              property: '_session_duration',
              dataType: MetadataValueType.INTEGER,
            },
            aggregationMethod: ExploreAggregationMethod.SUM,
          },
        },
        {
          eventName: 'add_to_cart',
          computeMethod: ExploreComputeMethod.EVENT_CNT,
        },
        {
          eventName: 'purchase',
          computeMethod: ExploreComputeMethod.USER_ID_CNT,
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
              and event.event_name in ('view_item', 'add_to_cart', 'purchase')
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
        where
          1 = 1
          and (
            (event_name = 'view_item')
            or (event_name = 'add_to_cart')
            or (event_name = 'purchase')
          )
      ),
      table_0 as (
        select
          month,
          week,
          day,
          hour,
          geo_country as custom_attr_0,
          event_date as event_date_0,
          event_name as event_name_0,
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0
        from
          base_data base
        where
          event_name = 'view_item'
      ),
      table_1 as (
        select
          month,
          week,
          day,
          hour,
          _session_duration as custom_attr_1,
          event_date as event_date_1,
          event_name as event_name_1,
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1
        from
          base_data base
        where
          event_name = 'view_item'
      ),
      table_2 as (
        select
          month,
          week,
          day,
          hour,
          null as custom_attr_2,
          event_date as event_date_2,
          event_name as event_name_2,
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2
        from
          base_data base
        where
          event_name = 'add_to_cart'
      ),
      table_3 as (
        select
          month,
          week,
          day,
          hour,
          null as custom_attr_3,
          event_date as event_date_3,
          event_name as event_name_3,
          event_timestamp as event_timestamp_3,
          event_id as event_id_3,
          user_id as user_id_3,
          user_pseudo_id as user_pseudo_id_3
        from
          base_data base
        where
          event_name = 'purchase'
      ),
      join_table as (
        select
          DAY as event_date,
          event_name,
          custom_attr_id,
          count(1) as "count/aggregation amount"
        from
          (
            select
              table_0.month,
              table_0.week,
              table_0.day,
              table_0.hour,
              1 || '_' || table_0.event_name_0 as event_name,
              table_0.event_timestamp_0 as event_timestamp,
              table_0.event_id_0 as x_id,
              table_0.custom_attr_0 as custom_attr_id
            from
              table_0
          ) as union_table_0
        group by
          DAY,
          event_name,
          custom_attr_id
        union all
        select
          DAY as event_date,
          event_name,
          null as custom_attr_id,
          sum(custom_attr_id) as "count/aggregation amount"
        from
          (
            select
              table_1.month,
              table_1.week,
              table_1.day,
              table_1.hour,
              2 || '_' || table_1.event_name_1 as event_name,
              table_1.event_timestamp_1 as event_timestamp,
              table_1.event_id_1 as x_id,
              table_1.custom_attr_1 as custom_attr_id
            from
              table_1
          ) as union_table_1
        group by
          DAY,
          event_name,
          custom_attr_id
        union all
        select
          DAY as event_date,
          event_name,
          null as custom_attr_id,
          count(distinct x_id) as "count/aggregation amount"
        from
          (
            select
              table_2.month,
              table_2.week,
              table_2.day,
              table_2.hour,
              3 || '_' || table_2.event_name_2 as event_name,
              table_2.event_timestamp_2 as event_timestamp,
              table_2.event_id_2 as x_id,
              table_2.custom_attr_2 as custom_attr_id
            from
              table_2
          ) as union_table_2
        group by
          DAY,
          event_name,
          custom_attr_id
        union all
        select
          DAY as event_date,
          event_name,
          null as custom_attr_id,
          count(distinct x_id) as "count/aggregation amount"
        from
          (
            select
              table_3.month,
              table_3.week,
              table_3.day,
              table_3.hour,
              4 || '_' || table_3.event_name_3 as event_name,
              table_3.event_timestamp_3 as event_timestamp,
              table_3.user_pseudo_id_3 as x_id,
              table_3.custom_attr_3 as custom_attr_id
            from
              table_3
          ) as union_table_3
        group by
          DAY,
          event_name,
          custom_attr_id
      )
    select
      *
    from
      join_table
    `.trim().replace(/ /g, ''),
    );

  });

  test('mix all computed method with different aggregation method', () => {

    const sql = buildEventPropertyAnalysisView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.COUNT_PROPERTY,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      eventAndConditions: [
        {
          eventName: 'view_item',
          computeMethod: ExploreComputeMethod.COUNT_PROPERTY,
          eventExtParameter: {
            targetProperty: {
              category: ConditionCategory.GEO,
              property: 'country',
              dataType: MetadataValueType.STRING,
            },
          },
        },
        {
          eventName: 'view_item',
          computeMethod: ExploreComputeMethod.AGGREGATION_PROPERTY,
          eventExtParameter: {
            targetProperty: {
              category: ConditionCategory.EVENT,
              property: '_session_duration',
              dataType: MetadataValueType.INTEGER,
            },
            aggregationMethod: ExploreAggregationMethod.SUM,
          },
        },
        {
          eventName: 'add_to_cart',
          computeMethod: ExploreComputeMethod.AGGREGATION_PROPERTY,
          eventExtParameter: {
            targetProperty: {
              category: ConditionCategory.EVENT,
              property: '_session_duration',
              dataType: MetadataValueType.INTEGER,
            },
            aggregationMethod: ExploreAggregationMethod.MAX,
          },
        },
        {
          eventName: 'purchase',
          computeMethod: ExploreComputeMethod.USER_ID_CNT,
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          geo_country,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              geo.country::varchar as geo_country,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
              and event.event_name in ('view_item', 'add_to_cart', 'purchase')
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
        where
          1 = 1
          and (
            (event_name = 'view_item')
            or (event_name = 'add_to_cart')
            or (event_name = 'purchase')
          )
      ),
      table_0 as (
        select
          month,
          week,
          day,
          hour,
          geo_country as custom_attr_0,
          event_date as event_date_0,
          event_name as event_name_0,
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0
        from
          base_data base
        where
          event_name = 'view_item'
      ),
      table_1 as (
        select
          month,
          week,
          day,
          hour,
          _session_duration as custom_attr_1,
          event_date as event_date_1,
          event_name as event_name_1,
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1
        from
          base_data base
        where
          event_name = 'view_item'
      ),
      table_2 as (
        select
          month,
          week,
          day,
          hour,
          _session_duration as custom_attr_2,
          event_date as event_date_2,
          event_name as event_name_2,
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2
        from
          base_data base
        where
          event_name = 'add_to_cart'
      ),
      table_3 as (
        select
          month,
          week,
          day,
          hour,
          null as custom_attr_3,
          event_date as event_date_3,
          event_name as event_name_3,
          event_timestamp as event_timestamp_3,
          event_id as event_id_3,
          user_id as user_id_3,
          user_pseudo_id as user_pseudo_id_3
        from
          base_data base
        where
          event_name = 'purchase'
      ),
      join_table as (
        select
          DAY as event_date,
          event_name,
          custom_attr_id,
          count(1) as "count/aggregation amount"
        from
          (
            select
              table_0.month,
              table_0.week,
              table_0.day,
              table_0.hour,
              1 || '_' || table_0.event_name_0 as event_name,
              table_0.event_timestamp_0 as event_timestamp,
              table_0.event_id_0 as x_id,
              table_0.custom_attr_0 as custom_attr_id
            from
              table_0
          ) as union_table_0
        group by
          DAY,
          event_name,
          custom_attr_id
        union all
        select
          DAY as event_date,
          event_name,
          null as custom_attr_id,
          sum(custom_attr_id) as "count/aggregation amount"
        from
          (
            select
              table_1.month,
              table_1.week,
              table_1.day,
              table_1.hour,
              2 || '_' || table_1.event_name_1 as event_name,
              table_1.event_timestamp_1 as event_timestamp,
              table_1.event_id_1 as x_id,
              table_1.custom_attr_1 as custom_attr_id
            from
              table_1
          ) as union_table_1
        group by
          DAY,
          event_name,
          custom_attr_id
        union all
        select
          DAY as event_date,
          event_name,
          null as custom_attr_id,
          max(custom_attr_id) as "count/aggregation amount"
        from
          (
            select
              table_2.month,
              table_2.week,
              table_2.day,
              table_2.hour,
              3 || '_' || table_2.event_name_2 as event_name,
              table_2.event_timestamp_2 as event_timestamp,
              table_2.event_id_2 as x_id,
              table_2.custom_attr_2 as custom_attr_id
            from
              table_2
          ) as union_table_2
        group by
          DAY,
          event_name,
          custom_attr_id
        union all
        select
          DAY as event_date,
          event_name,
          null as custom_attr_id,
          count(distinct x_id) as "count/aggregation amount"
        from
          (
            select
              table_3.month,
              table_3.week,
              table_3.day,
              table_3.hour,
              4 || '_' || table_3.event_name_3 as event_name,
              table_3.event_timestamp_3 as event_timestamp,
              table_3.user_pseudo_id_3 as x_id,
              table_3.custom_attr_3 as custom_attr_id
            from
              table_3
          ) as union_table_3
        group by
          DAY,
          event_name,
          custom_attr_id
      )
    select
      *
    from
      join_table
    `.trim().replace(/ /g, ''),
    );
  });

  test('mix all computed method with different aggregation method with group condition', () => {

    const sql = buildEventPropertyAnalysisView({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.COUNT_PROPERTY,
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 10*60,
      groupCondition: {
        category: ConditionCategory.OTHER,
        property: 'platform',
        dataType: MetadataValueType.STRING,
      },
      eventAndConditions: [
        {
          eventName: 'view_item',
          computeMethod: ExploreComputeMethod.COUNT_PROPERTY,
          eventExtParameter: {
            targetProperty: {
              category: ConditionCategory.GEO,
              property: 'country',
              dataType: MetadataValueType.STRING,
            },
          },
        },
        {
          eventName: 'view_item',
          computeMethod: ExploreComputeMethod.AGGREGATION_PROPERTY,
          eventExtParameter: {
            targetProperty: {
              category: ConditionCategory.EVENT,
              property: '_session_duration',
              dataType: MetadataValueType.INTEGER,
            },
            aggregationMethod: ExploreAggregationMethod.SUM,
          },
        },
        {
          eventName: 'add_to_cart',
          computeMethod: ExploreComputeMethod.AGGREGATION_PROPERTY,
          eventExtParameter: {
            targetProperty: {
              category: ConditionCategory.EVENT,
              property: '_session_duration',
              dataType: MetadataValueType.INTEGER,
            },
            aggregationMethod: ExploreAggregationMethod.MAX,
          },
        },
        {
          eventName: 'purchase',
          computeMethod: ExploreComputeMethod.USER_ID_CNT,
        },
      ],
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.WEEK,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      event_base as (
        select
          event_date,
          event_name,
          event_id,
          event_timestamp,
          geo_country,
          platform,
          COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id,
          r.user_id,
          month,
          week,
          day,
          hour
        from
          (
            select
              event_date,
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              geo.country::varchar as geo_country,
              platform::varchar as platform,
              user_pseudo_id,
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
              shop.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
              and event.event_name in ('view_item', 'add_to_cart', 'purchase')
          ) as l
          join (
            select
              user_pseudo_id,
              user_id
            from
              shop.user_m_view
            group by
              user_pseudo_id,
              user_id
          ) as r on l.user_pseudo_id = r.user_pseudo_id
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
              join shop.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp
              and event_base.event_id = event_param.event_id
            group by
              event_base.event_id
          ) as event_join_table on event_base.event_id = event_join_table.event_id
        where
          1 = 1
          and (
            (event_name = 'view_item')
            or (event_name = 'add_to_cart')
            or (event_name = 'purchase')
          )
      ),
      table_0 as (
        select
          month,
          week,
          day,
          hour,
          geo_country as custom_attr_0,
          event_date as event_date_0,
          event_name as event_name_0,
          event_timestamp as event_timestamp_0,
          event_id as event_id_0,
          user_id as user_id_0,
          user_pseudo_id as user_pseudo_id_0,
          platform as platform_0
        from
          base_data base
        where
          event_name = 'view_item'
      ),
      table_1 as (
        select
          month,
          week,
          day,
          hour,
          _session_duration as custom_attr_1,
          event_date as event_date_1,
          event_name as event_name_1,
          event_timestamp as event_timestamp_1,
          event_id as event_id_1,
          user_id as user_id_1,
          user_pseudo_id as user_pseudo_id_1,
          platform as platform_1
        from
          base_data base
        where
          event_name = 'view_item'
      ),
      table_2 as (
        select
          month,
          week,
          day,
          hour,
          _session_duration as custom_attr_2,
          event_date as event_date_2,
          event_name as event_name_2,
          event_timestamp as event_timestamp_2,
          event_id as event_id_2,
          user_id as user_id_2,
          user_pseudo_id as user_pseudo_id_2,
          platform as platform_2
        from
          base_data base
        where
          event_name = 'add_to_cart'
      ),
      table_3 as (
        select
          month,
          week,
          day,
          hour,
          null as custom_attr_3,
          event_date as event_date_3,
          event_name as event_name_3,
          event_timestamp as event_timestamp_3,
          event_id as event_id_3,
          user_id as user_id_3,
          user_pseudo_id as user_pseudo_id_3,
          platform as platform_3
        from
          base_data base
        where
          event_name = 'purchase'
      ),
      join_table as (
        select
          WEEK as event_date,
          event_name,
          platform,
          custom_attr_id,
          count(1) as "count/aggregation amount"
        from
          (
            select
              table_0.month,
              table_0.week,
              table_0.day,
              table_0.hour,
              1 || '_' || table_0.event_name_0 as event_name,
              table_0.event_timestamp_0 as event_timestamp,
              table_0.event_id_0 as x_id,
              table_0.custom_attr_0 as custom_attr_id,
              table_0.platform_0 as platform
            from
              table_0
          ) as union_table_0
        group by
          WEEK,
          event_name,
          platform,
          custom_attr_id
        union all
        select
          WEEK as event_date,
          event_name,
          platform,
          null as custom_attr_id,
          sum(custom_attr_id) as "count/aggregation amount"
        from
          (
            select
              table_1.month,
              table_1.week,
              table_1.day,
              table_1.hour,
              2 || '_' || table_1.event_name_1 as event_name,
              table_1.event_timestamp_1 as event_timestamp,
              table_1.event_id_1 as x_id,
              table_1.custom_attr_1 as custom_attr_id,
              table_1.platform_1 as platform
            from
              table_1
          ) as union_table_1
        group by
          WEEK,
          event_name,
          platform,
          custom_attr_id
        union all
        select
          WEEK as event_date,
          event_name,
          platform,
          null as custom_attr_id,
          max(custom_attr_id) as "count/aggregation amount"
        from
          (
            select
              table_2.month,
              table_2.week,
              table_2.day,
              table_2.hour,
              3 || '_' || table_2.event_name_2 as event_name,
              table_2.event_timestamp_2 as event_timestamp,
              table_2.event_id_2 as x_id,
              table_2.custom_attr_2 as custom_attr_id,
              table_2.platform_2 as platform
            from
              table_2
          ) as union_table_2
        group by
          WEEK,
          event_name,
          platform,
          custom_attr_id
        union all
        select
          WEEK as event_date,
          event_name,
          platform,
          null as custom_attr_id,
          count(distinct x_id) as "count/aggregation amount"
        from
          (
            select
              table_3.month,
              table_3.week,
              table_3.day,
              table_3.hour,
              4 || '_' || table_3.event_name_3 as event_name,
              table_3.event_timestamp_3 as event_timestamp,
              table_3.user_pseudo_id_3 as x_id,
              table_3.custom_attr_3 as custom_attr_id,
              table_3.platform_3 as platform
            from
              table_3
          ) as union_table_3
        group by
          WEEK,
          event_name,
          platform,
          custom_attr_id
      )
    select
      *
    from
      join_table
    `.trim().replace(/ /g, ''),
    );
  });


});