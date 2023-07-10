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

import { buildFunnelDataSql } from '../../../src/reporting/private/sql-builder';

describe('SQL Builder test', () => {

  beforeEach(() => {
  });

  test('funnelsql - user_cnt', () => {

    const sql = buildFunnelDataSql({
      schemaName: 'app1',
      computeMethod: 'USER_CNT',
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: 'CUSTOMIZE',
      conversionIntervalInSeconds: 10*60,
      firstEvent: 'add_button_click',
      firstEventConditions: [],
      eventsNames: ['note_share', 'note_export'],
      eventsNamesAlias: [],
      timeStart: '2023-04-30',
      timeEnd: '2023-06-30',
      groupColumn: 'day',
    });

    console.log(sql);

    expect(sql.trim().replace(/ /g, '')).toEqual(`with
      base_data as (
        select
          (
            select
              ep.value.string_value as value
            from
              app1.ods_events e,
              e.event_params ep
            where
              ep.key = '_session_id'
              and e.event_id = ods.event_id
          ) session_id,
          user_pseudo_id,
          event_id,
          event_name,
          event_timestamp::bigint,
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
          app1.ods_events ods
        where
          event_date >= '2023-04-30'
          and event_date <= '2023-06-30'
      ),
      table_1 as (
        select
          *
        from
          base_data
        where
          event_name = 'add_button_click'
      ),
      table_2 as (
        select
          *
        from
          base_data
        where
          event_name = 'note_share'
      ),
      table_3 as (
        select
          *
        from
          base_data
        where
          event_name = 'note_export'
      ),
      join_table as (
        select
          table_1.*,
          table_2.event_id as event_id_2,
          table_2.user_pseudo_id as user_pseudo_id_2,
          table_2.event_timestamp as event_timestamp_2,
          table_3.event_id as event_id_3,
          table_3.user_pseudo_id as user_pseudo_id_3,
          table_3.event_timestamp as event_timestamp_3
        from
          table_1
          left outer join table_2 on table_1.user_pseudo_id = table_2.user_pseudo_id
          and table_2.event_timestamp - table_1.event_timestamp > 0
          and table_2.event_timestamp - table_1.event_timestamp < 600 * 1000
          left outer join table_3 on table_2.user_pseudo_id = table_3.user_pseudo_id
          and table_3.event_timestamp - table_2.event_timestamp > 0
          and table_3.event_timestamp - table_2.event_timestamp < 600 * 1000
      ),
      final_table as (
        select
          week,
          day,
          hour,
          event_id as e_id_1,
          user_pseudo_id as u_id_1,
          event_id_2 as e_id_2,
          user_pseudo_id_2 as u_id_2,
          event_id_3 as e_id_3,
          user_pseudo_id_3 as u_id_3
        from
          join_table
        group by
          week,
          day,
          hour,
          event_id,
          user_pseudo_id,
          event_id_2,
          user_pseudo_id_2,
          event_id_3,
          user_pseudo_id_3
      )
      select
        day,
        count(distinct u_id_1) as add_button_click,
        count(distinct u_id_2) as note_share,
        count(distinct u_id_3) as note_export
      from
        final_table
      group by
        day`.trim().replace(/ /g, ''),
    );

  });

  test('funnelsql - event_cnt', () => {

    const sql = buildFunnelDataSql({
      schemaName: 'app1',
      computeMethod: 'EVENT_CNT',
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: 'CUSTOMIZE',
      conversionIntervalInSeconds: 10*60,
      firstEvent: 'add_button_click',
      firstEventConditions: [],
      eventsNames: ['note_share', 'note_export'],
      eventsNamesAlias: [],
      timeStart: '2023-04-30',
      timeEnd: '2023-06-30',
      groupColumn: 'day',
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`with
      base_data as (
        select
          (
            select
              ep.value.string_value as value
            from
              app1.ods_events e,
              e.event_params ep
            where
              ep.key = '_session_id'
              and e.event_id = ods.event_id
          ) session_id,
          user_pseudo_id,
          event_id,
          event_name,
          event_timestamp::bigint,
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
          app1.ods_events ods
        where
          event_date >= '2023-04-30'
          and event_date <= '2023-06-30'
      ),
      table_1 as (
        select
          *
        from
          base_data
        where
          event_name = 'add_button_click'
      ),
      table_2 as (
        select
          *
        from
          base_data
        where
          event_name = 'note_share'
      ),
      table_3 as (
        select
          *
        from
          base_data
        where
          event_name = 'note_export'
      ),
      join_table as (
        select
          table_1.*,
          table_2.event_id as event_id_2,
          table_2.user_pseudo_id as user_pseudo_id_2,
          table_2.event_timestamp as event_timestamp_2,
          table_3.event_id as event_id_3,
          table_3.user_pseudo_id as user_pseudo_id_3,
          table_3.event_timestamp as event_timestamp_3
        from
          table_1
          left outer join table_2 on table_1.user_pseudo_id = table_2.user_pseudo_id
          and table_2.event_timestamp - table_1.event_timestamp > 0
          and table_2.event_timestamp - table_1.event_timestamp < 600 * 1000
          left outer join table_3 on table_2.user_pseudo_id = table_3.user_pseudo_id
          and table_3.event_timestamp - table_2.event_timestamp > 0
          and table_3.event_timestamp - table_2.event_timestamp < 600 * 1000
      ),
      final_table as (
        select
          week,
          day,
          hour,
          event_id as e_id_1,
          user_pseudo_id as u_id_1,
          event_id_2 as e_id_2,
          user_pseudo_id_2 as u_id_2,
          event_id_3 as e_id_3,
          user_pseudo_id_3 as u_id_3
        from
          join_table
        group by
          week,
          day,
          hour,
          event_id,
          user_pseudo_id,
          event_id_2,
          user_pseudo_id_2,
          event_id_3,
          user_pseudo_id_3
      )
      select
        day,
        count(distinct e_id_1) as add_button_click,
        count(distinct e_id_2) as note_share,
        count(distinct e_id_3) as note_export
      from
        final_table
      group by
        day`.trim().replace(/ /g, ''),
    );

  });

  test('funnelsql - conversionIntervalType', () => {

    const sql = buildFunnelDataSql({
      schemaName: 'app1',
      computeMethod: 'EVENT_CNT',
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: 'CURRENT_DAY',
      conversionIntervalInSeconds: 10*60,
      firstEvent: 'add_button_click',
      firstEventConditions: [],
      eventsNames: ['note_share', 'note_export'],
      eventsNamesAlias: [],
      timeStart: '2023-04-30',
      timeEnd: '2023-06-30',
      groupColumn: 'day',
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`with
      base_data as (
        select
          (
            select
              ep.value.string_value as value
            from
              app1.ods_events e,
              e.event_params ep
            where
              ep.key = '_session_id'
              and e.event_id = ods.event_id
          ) session_id,
          user_pseudo_id,
          event_id,
          event_name,
          event_timestamp::bigint,
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
          app1.ods_events ods
        where
          event_date >= '2023-04-30'
          and event_date <= '2023-06-30'
      ),
      table_1 as (
        select
          *
        from
          base_data
        where
          event_name = 'add_button_click'
      ),
      table_2 as (
        select
          *
        from
          base_data
        where
          event_name = 'note_share'
      ),
      table_3 as (
        select
          *
        from
          base_data
        where
          event_name = 'note_export'
      ),
      join_table as (
        select
          table_1.*,
          table_2.event_id as event_id_2,
          table_2.user_pseudo_id as user_pseudo_id_2,
          table_2.event_timestamp as event_timestamp_2,
          table_3.event_id as event_id_3,
          table_3.user_pseudo_id as user_pseudo_id_3,
          table_3.event_timestamp as event_timestamp_3
        from
        table_1
        left outer join table_2 on table_1.user_pseudo_id = table_2.user_pseudo_id
        and TO_CHAR(
          TIMESTAMP 'epoch' + cast(table_1.event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD'
        ) = TO_CHAR(
          TIMESTAMP 'epoch' + cast(table_2.event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD'
        )
        left outer join table_3 on table_2.user_pseudo_id = table_3.user_pseudo_id
        and TO_CHAR(
          TIMESTAMP 'epoch' + cast(table_2.event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD'
        ) = TO_CHAR(
          TIMESTAMP 'epoch' + cast(table_3.event_timestamp / 1000 as bigint) * INTERVAL '1 second',
          'YYYY-MM-DD'
        )
      ),
      final_table as (
        select
          week,
          day,
          hour,
          event_id as e_id_1,
          user_pseudo_id as u_id_1,
          event_id_2 as e_id_2,
          user_pseudo_id_2 as u_id_2,
          event_id_3 as e_id_3,
          user_pseudo_id_3 as u_id_3
        from
          join_table
        group by
          week,
          day,
          hour,
          event_id,
          user_pseudo_id,
          event_id_2,
          user_pseudo_id_2,
          event_id_3,
          user_pseudo_id_3
      )
      select
        day,
        count(distinct e_id_1) as add_button_click,
        count(distinct e_id_2) as note_share,
        count(distinct e_id_3) as note_export
      from
        final_table
      group by
        day`.trim().replace(/ /g, ''),
    );

  });

  test('funnelsql - specifyJoinColumn', () => {

    const sql = buildFunnelDataSql({
      schemaName: 'app1',
      computeMethod: 'EVENT_CNT',
      specifyJoinColumn: false,
      conversionIntervalType: 'CURRENT_DAY',
      conversionIntervalInSeconds: 10*60,
      firstEvent: 'add_button_click',
      firstEventConditions: [],
      eventsNames: ['note_share', 'note_export'],
      eventsNamesAlias: [],
      timeStart: '2023-04-30',
      timeEnd: '2023-06-30',
      groupColumn: 'day',
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`with
      base_data as (
        select
          (
            select
              ep.value.string_value as value
            from
              app1.ods_events e,
              e.event_params ep
            where
              ep.key = '_session_id'
              and e.event_id = ods.event_id
          ) session_id,
          user_pseudo_id,
          event_id,
          event_name,
          event_timestamp::bigint,
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
          app1.ods_events ods
        where
          event_date >= '2023-04-30'
          and event_date <= '2023-06-30'
      ),
      table_1 as (
        select
          *
        from
          base_data
        where
          event_name = 'add_button_click'
      ),
      table_2 as (
        select
          *
        from
          base_data
        where
          event_name = 'note_share'
      ),
      table_3 as (
        select
          *
        from
          base_data
        where
          event_name = 'note_export'
      ),
      join_table as (
        select
          table_1.*,
          table_2.event_id as event_id_2,
          table_2.user_pseudo_id as user_pseudo_id_2,
          table_2.event_timestamp as event_timestamp_2,
          table_3.event_id as event_id_3,
          table_3.user_pseudo_id as user_pseudo_id_3,
          table_3.event_timestamp as event_timestamp_3
        from
          table_1
          left outer join table_2 on 1 = 1
          and TO_CHAR(
            TIMESTAMP 'epoch' + cast(table_1.event_timestamp / 1000 as bigint) * INTERVAL '1 second',
            'YYYY-MM-DD'
          ) = TO_CHAR(
            TIMESTAMP 'epoch' + cast(table_2.event_timestamp / 1000 as bigint) * INTERVAL '1 second',
            'YYYY-MM-DD'
          )
          left outer join table_3 on 1 = 1
          and TO_CHAR(
            TIMESTAMP 'epoch' + cast(table_2.event_timestamp / 1000 as bigint) * INTERVAL '1 second',
            'YYYY-MM-DD'
          ) = TO_CHAR(
            TIMESTAMP 'epoch' + cast(table_3.event_timestamp / 1000 as bigint) * INTERVAL '1 second',
            'YYYY-MM-DD'
          )
      ),
      final_table as (
        select
          week,
          day,
          hour,
          event_id as e_id_1,
          user_pseudo_id as u_id_1,
          event_id_2 as e_id_2,
          user_pseudo_id_2 as u_id_2,
          event_id_3 as e_id_3,
          user_pseudo_id_3 as u_id_3
        from
          join_table
        group by
          week,
          day,
          hour,
          event_id,
          user_pseudo_id,
          event_id_2,
          user_pseudo_id_2,
          event_id_3,
          user_pseudo_id_3
      )
      select
        day,
        count(distinct e_id_1) as add_button_click,
        count(distinct e_id_2) as note_share,
        count(distinct e_id_3) as note_export
      from
        final_table
      group by
        day`.trim().replace(/ /g, ''),
    );

  });

  test('funnelsql - extra column & conditions', () => {

    const sql = buildFunnelDataSql({
      schemaName: 'app1',
      computeMethod: 'USER_CNT',
      extraColumns: ['platform', 'user_id', 'project_id'],
      specifyJoinColumn: true,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType: 'CUSTOMIZE',
      conversionIntervalInSeconds: 10*60,
      firstEvent: 'add_button_click',
      firstEventConditions: ['platform = \'ANDROID\'', 'project_id = \'data_uat___manual_psho\''],
      eventsNames: ['note_share', 'note_export'],
      eventsNamesAlias: [],
      timeStart: '2023-04-30',
      timeEnd: '2023-06-30',
      groupColumn: 'day',
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`with
      base_data as (
        select
          (
            select
              ep.value.string_value as value
            from
              app1.ods_events e,
              e.event_params ep
            where
              ep.key = '_session_id'
              and e.event_id = ods.event_id
          ) session_id,
          user_pseudo_id,
          event_id,
          event_name,
          event_timestamp::bigint,
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
          platform,
          user_id,
          project_id
        from
          app1.ods_events ods
        where
          event_date >= '2023-04-30'
          and event_date <= '2023-06-30'
      ),
      table_1 as (
        select
          *
        from
          base_data
        where
          event_name = 'add_button_click'
          and platform = 'ANDROID'
          and project_id = 'data_uat___manual_psho'
      ),
      table_2 as (
        select
          *
        from
          base_data
        where
          event_name = 'note_share'
      ),
      table_3 as (
        select
          *
        from
          base_data
        where
          event_name = 'note_export'
      ),
      join_table as (
        select
          table_1.*,
          table_2.event_id as event_id_2,
          table_2.user_pseudo_id as user_pseudo_id_2,
          table_2.event_timestamp as event_timestamp_2,
          table_3.event_id as event_id_3,
          table_3.user_pseudo_id as user_pseudo_id_3,
          table_3.event_timestamp as event_timestamp_3
        from
          table_1
          left outer join table_2 on table_1.user_pseudo_id = table_2.user_pseudo_id
          and table_2.event_timestamp - table_1.event_timestamp > 0
          and table_2.event_timestamp - table_1.event_timestamp < 600 * 1000
          left outer join table_3 on table_2.user_pseudo_id = table_3.user_pseudo_id
          and table_3.event_timestamp - table_2.event_timestamp > 0
          and table_3.event_timestamp - table_2.event_timestamp < 600 * 1000
      ),
      final_table as (
        select
          week,
          day,
          hour,
          event_id as e_id_1,
          user_pseudo_id as u_id_1,
          event_id_2 as e_id_2,
          user_pseudo_id_2 as u_id_2,
          event_id_3 as e_id_3,
          user_pseudo_id_3 as u_id_3
        from
          join_table
        group by
          week,
          day,
          hour,
          event_id,
          user_pseudo_id,
          event_id_2,
          user_pseudo_id_2,
          event_id_3,
          user_pseudo_id_3
      )
      select
        day,
        count(distinct u_id_1) as add_button_click,
        count(distinct u_id_2) as note_share,
        count(distinct u_id_3) as note_export
      from
        final_table
      group by
        day`.trim().replace(/ /g, ''),
    );

  });

});
