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

import { AttributionModelType, ConditionCategory, ExploreAttributionTimeWindowType, ExploreComputeMethod, ExploreRelativeTimeUnit, ExploreTimeScopeType, MetadataValueType } from '../../common/explore-types';
import { _buildCommonPartSql } from '../../service/quicksight/sql-builder';
import { buildSQLForLinearModel, buildSQLForPositionModel, buildSQLForSinglePointModel } from '../../service/quicksight/sql-builder-attribution';

describe('Attribution SQL Builder test', () => {

  beforeEach(() => {
  });

  test('last touch model - event count', () => {
    const sql = buildSQLForSinglePointModel({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.EVENT_CNT,
      timeWindowType: ExploreAttributionTimeWindowType.CURRENT_DAY,
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
            category: ConditionCategory.USER_OUTER,
            property: '_channel',
            operator: '<>',
            value: ['google'],
            dataType: MetadataValueType.STRING,
          },
        ],
      },
      targetEventAndCondition:
        {
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
                category: ConditionCategory.USER_OUTER,
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
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '<>',
                value: ['google'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
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
                category: ConditionCategory.USER_OUTER,
                property: 'user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [10],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '<>',
                value: ['apple'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
        {
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
                value: [10],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '<>',
                value: ['apple'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
      ],
      modelType: AttributionModelType.LAST_TOUCH,
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          user_pseudo_id,
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
          event_name::varchar as event_name,
          event_id::varchar as event_id,
          event_timestamp::bigint as event_timestamp,
          platform::varchar as platform,
          geo.country::varchar as geo_country,
          user_pseudo_id,
          user_id
        from
          shop.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2025-10-10'
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          user_first_touch_timestamp,
          _channel,
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
              max(user_first_touch_timestamp) as user_first_touch_timestamp,
              max(_channel) as _channel
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
            and (
              _channel is null 
              or _channel <> 'google'
            )
          )
      ),
      target_data as (
        select
          user_pseudo_id,
          event_id,
          event_name,
          event_timestamp,
          row_number() over (
            PARTITION by
              user_pseudo_id
            ORDER by
              event_timestamp asc
          ) as rank
        from
          base_data
        where
          event_name = 'purchase'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _session_duration > 200
            and (
              _channel is null 
              or _channel <> 'google'
            )
          )
      ),
      touch_point_data_1 as (
        select
          user_pseudo_id,
          event_id,
          event_name,
          event_timestamp
        from
          target_data
        union all
        select
          user_pseudo_id,
          event_id,
          '1_' || event_name as event_name,
          event_timestamp
        from
          base_data
        where
          event_name = 'view_item'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and user_first_touch_timestamp > 1686532526770
            and _session_duration > 10
            and (
              _channel is null
              or _channel <> 'apple'
            )
          )
        union all
        select
          user_pseudo_id,
          event_id,
          '2_' || event_name as event_name,
          event_timestamp
        from
          base_data
        where
          event_name = 'add_to_cart'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _session_duration > 10
            and (
              _channel is null
              or _channel <> 'apple'
            )
          )
      ),
      touch_point_data_2 as (
        select
          *,
          case
            when event_name = 'purchase' then 1
            else 0
          end as conversation_flag
        from
          touch_point_data_1
        order by
          event_timestamp
      ),
      touch_point_data_3 as (
        select
          *,
          SUM(conversation_flag) over (
            PARTITION by
              user_pseudo_id
            order by
              user_pseudo_id,
              event_timestamp ROWS BETWEEN UNBOUNDED PRECEDING
              AND CURRENT ROW
          ) + 1 AS group_id
        from
          touch_point_data_2
      ),
      joined_base_data as (
        select
          target_data.*,
          touch_point_data_3.user_pseudo_id as t_user_pseudo_id,
          touch_point_data_3.event_id as t_event_id,
          touch_point_data_3.event_name as t_event_name,
          touch_point_data_3.event_timestamp as t_event_timestamp,
          touch_point_data_3.conversation_flag,
          touch_point_data_3.group_id,
          row_number() over (
            PARTITION by
              t_user_pseudo_id,
              rank
            order by
              t_event_timestamp asc
          ) as row_seq
        from
          target_data
          join touch_point_data_3 on target_data.user_pseudo_id = touch_point_data_3.user_pseudo_id
          and target_data.rank = touch_point_data_3.group_id
          and target_data.event_timestamp >= touch_point_data_3.event_timestamp
          and target_data.event_timestamp >= touch_point_data_3.event_timestamp
          and TO_CHAR(
            TIMESTAMP 'epoch' + cast(target_data.event_timestamp / 1000 as bigint) * INTERVAL '1 second',
            'YYYY-MM-DD'
          ) = TO_CHAR(
            TIMESTAMP 'epoch' + cast(
              touch_point_data_3.event_timestamp / 1000 as bigint
            ) * INTERVAL '1 second',
            'YYYY-MM-DD'
          )
        where
          touch_point_data_3.event_name <> 'purchase'
      ),
      model_base_data as (
        select
          user_pseudo_id,
          group_id,
          max(row_seq) as row_seq
        from
          joined_base_data
        group by
          user_pseudo_id,
          group_id
      ),
      model_data as (
        select
          joined_base_data.*
        from
          joined_base_data
          join model_base_data on joined_base_data.user_pseudo_id = model_base_data.user_pseudo_id
          and joined_base_data.row_seq = model_base_data.row_seq
          and joined_base_data.group_id = model_base_data.group_id
      ),
      attribution_data as (
        select
          t_event_name,
          count(t_event_id) as contribution
        from
          model_data
        group by
          t_event_name
      )
    select
      total_count_data.total_event_count as "Trigger Count",
      attribution_data.t_event_name as "Touch Point Name",
      attribution_count as "Number of Triggers with Conversion",
      attribution_data.contribution as "Contribution(number/sum...value)",
      cast(attribution_data.contribution as float) / t.total_contribution as "Contribution Rate"
    from
      attribution_data
      join (
        select
          event_name,
          count(event_id) as total_event_count
        from
          touch_point_data_3
        group by
          event_name
      ) total_count_data on attribution_data.t_event_name = total_count_data.event_name
      join (
        select
          count(t_event_id) as total_contribution
        from
          model_data
      ) as t on 1 = 1
      join (
        select
          t_event_name,
          count(1) as attribution_count
        from
          joined_base_data
        group by
          t_event_name
      ) as s on attribution_data.t_event_name = s.t_event_name
    `.trim().replace(/ /g, ''));

  });

  test('first touch model - sum value', () => {
    const sql = buildSQLForSinglePointModel({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.SUM_VALUE,
      timeWindowType: ExploreAttributionTimeWindowType.SESSION,
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
            category: ConditionCategory.USER_OUTER,
            property: '_channel',
            operator: '<>',
            value: ['google'],
            dataType: MetadataValueType.STRING,
          },
        ],
      },
      targetEventAndCondition:
        {
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
                category: ConditionCategory.USER_OUTER,
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
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '<>',
                value: ['google'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
          groupColumn: {
            category: ConditionCategory.EVENT,
            property: '_session_duration',
            dataType: MetadataValueType.FLOAT,
          },
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
                category: ConditionCategory.USER_OUTER,
                property: 'user_first_touch_timestamp',
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
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '<>',
                value: ['apple'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
        {
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
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '<>',
                value: ['apple'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
      ],
      modelType: AttributionModelType.FIRST_TOUCH,
      timeScopeType: ExploreTimeScopeType.RELATIVE,
      lastN: 24,
      timeUnit: ExploreRelativeTimeUnit.MM,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          user_pseudo_id,
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
          event_name::varchar as event_name,
          event_id::varchar as event_id,
          event_timestamp::bigint as event_timestamp,
          platform::varchar as platform,
          geo.country::varchar as geo_country,
          user_pseudo_id,
          user_id
        from
          shop.event as event
        where
          event.event_date >= date_trunc('month', current_date - interval '23 months')
          and event.event_date <= CURRENT_DATE
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          user_first_touch_timestamp,
          _channel,
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
              ) as _user_first_touch_timestamp,
              max(user_first_touch_timestamp) as user_first_touch_timestamp,
              max(_channel) as _channel
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
            and (
              _channel is null 
              or _channel <> 'google'
            )
          )
      ),
      target_data as (
        select
          user_pseudo_id,
          event_id,
          _session_id,
          event_name,
          event_timestamp,
          row_number() over (
            PARTITION by
              user_pseudo_id
            ORDER by
              event_timestamp asc
          ) as rank,
          _session_duration as sum_value
        from
          base_data
        where
          event_name = 'purchase'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _session_duration > 200
            and (
              _channel is null 
              or _channel <> 'google'
            )
          )
      ),
      touch_point_data_1 as (
        select
          user_pseudo_id,
          event_id,
          _session_id,
          event_name,
          event_timestamp,
          sum_value
        from
          target_data
        union all
        select
          user_pseudo_id,
          event_id,
          _session_id,
          '1_' || event_name as event_name,
          event_timestamp,
          0 as sum_value
        from
          base_data
        where
          event_name = 'view_item'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and user_first_touch_timestamp > 1686532526770
            and _session_duration > 200
            and (
              _channel is null
              or _channel <> 'apple'
            )
          )
        union all
        select
          user_pseudo_id,
          event_id,
          _session_id,
          '2_' || event_name as event_name,
          event_timestamp,
          0 as sum_value
        from
          base_data
        where
          event_name = 'add_to_cart'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _session_duration > 200
            and (
              _channel is null
              or _channel <> 'apple'
            )
          )
      ),
      touch_point_data_2 as (
        select
          *,
          case
            when event_name = 'purchase' then 1
            else 0
          end as conversation_flag
        from
          touch_point_data_1
        order by
          event_timestamp
      ),
      touch_point_data_3 as (
        select
          *,
          SUM(conversation_flag) over (
            PARTITION by
              user_pseudo_id
            order by
              user_pseudo_id,
              event_timestamp ROWS BETWEEN UNBOUNDED PRECEDING
              AND CURRENT ROW
          ) + 1 AS group_id
        from
          touch_point_data_2
      ),
      joined_base_data as (
        select
          target_data.*,
          touch_point_data_3.user_pseudo_id as t_user_pseudo_id,
          touch_point_data_3.event_id as t_event_id,
          touch_point_data_3.event_name as t_event_name,
          touch_point_data_3.event_timestamp as t_event_timestamp,
          touch_point_data_3.conversation_flag,
          touch_point_data_3.group_id,
          row_number() over (
            PARTITION by
              t_user_pseudo_id,
              rank
            order by
              t_event_timestamp asc
          ) as row_seq
        from
          target_data
          join touch_point_data_3 on target_data.user_pseudo_id = touch_point_data_3.user_pseudo_id
          and target_data.rank = touch_point_data_3.group_id
          and target_data.event_timestamp >= touch_point_data_3.event_timestamp
          and target_data._session_id = touch_point_data_3._session_id
        where
          touch_point_data_3.event_name <> 'purchase'
      ),
      model_base_data as (
        select
          user_pseudo_id,
          group_id,
          min(row_seq) as row_seq
        from
          joined_base_data
        group by
          user_pseudo_id,
          group_id
      ),
      model_data as (
        select
          joined_base_data.*
        from
          joined_base_data
          join model_base_data on joined_base_data.user_pseudo_id = model_base_data.user_pseudo_id
          and joined_base_data.row_seq = model_base_data.row_seq
          and joined_base_data.group_id = model_base_data.group_id
      ),
      attribution_data as (
        select
          t_event_name,
          sum(sum_value) as contribution,
          count(t_event_id) as event_count
        from
          model_data
        group by
          t_event_name
      )
    select
      total_count_data.total_event_count as "Trigger Count",
      attribution_data.t_event_name as "Touch Point Name",
      attribution_count as "Number of Triggers with Conversion",
      attribution_data.contribution as "Contribution(number/sum...value)",
      cast(attribution_data.contribution as float) / t.total_contribution as "Contribution Rate"
    from
      attribution_data
      join (
        select
          event_name,
          count(event_id) as total_event_count
        from
          touch_point_data_3
        group by
          event_name
      ) total_count_data on attribution_data.t_event_name = total_count_data.event_name
      join (
        select
          sum(contribution) as total_contribution
        from
          attribution_data
      ) as t on 1 = 1
      join (
        select
          t_event_name,
          count(1) as attribution_count
        from
          joined_base_data
        group by
          t_event_name
      ) as s on attribution_data.t_event_name = s.t_event_name
    `.trim().replace(/ /g, ''));

  });

  test('last touch model - no condition', () => {
    const sql = buildSQLForSinglePointModel({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.EVENT_CNT,
      timeWindowType: ExploreAttributionTimeWindowType.CURRENT_DAY,
      targetEventAndCondition:
        {
          eventName: 'purchase',
        },
      eventAndConditions: [
        {
          eventName: 'view_item',
        },
        {
          eventName: 'add_to_cart',
        },
      ],
      modelType: AttributionModelType.LAST_TOUCH,
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
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
              event_name::varchar as event_name,
              event_id::varchar as event_id,
              event_timestamp::bigint as event_timestamp,
              user_pseudo_id,
              user_id
            from
              shop.event as event
            where
              event.event_date >= date '2023-10-01'
              and event.event_date <= date '2025-10-10'
              and event.event_name in ('view_item', 'add_to_cart', 'purchase')
          ) as event_base
        where
          1 = 1
      ),
      target_data as (
        select
          user_pseudo_id,
          event_id,
          event_name,
          event_timestamp,
          row_number() over (
            PARTITION by
              user_pseudo_id
            ORDER by
              event_timestamp asc
          ) as rank
        from
          base_data
        where
          event_name = 'purchase'
      ),
      touch_point_data_1 as (
        select
          user_pseudo_id,
          event_id,
          event_name,
          event_timestamp
        from
          target_data
        union all
        select
          user_pseudo_id,
          event_id,
          '1_' || event_name as event_name,
          event_timestamp
        from
          base_data
        where
          event_name = 'view_item'
        union all
        select
          user_pseudo_id,
          event_id,
          '2_' || event_name as event_name,
          event_timestamp
        from
          base_data
        where
          event_name = 'add_to_cart'
      ),
      touch_point_data_2 as (
        select
          *,
          case
            when event_name = 'purchase' then 1
            else 0
          end as conversation_flag
        from
          touch_point_data_1
        order by
          event_timestamp
      ),
      touch_point_data_3 as (
        select
          *,
          SUM(conversation_flag) over (
            PARTITION by
              user_pseudo_id
            order by
              user_pseudo_id,
              event_timestamp ROWS BETWEEN UNBOUNDED PRECEDING
              AND CURRENT ROW
          ) + 1 AS group_id
        from
          touch_point_data_2
      ),
      joined_base_data as (
        select
          target_data.*,
          touch_point_data_3.user_pseudo_id as t_user_pseudo_id,
          touch_point_data_3.event_id as t_event_id,
          touch_point_data_3.event_name as t_event_name,
          touch_point_data_3.event_timestamp as t_event_timestamp,
          touch_point_data_3.conversation_flag,
          touch_point_data_3.group_id,
          row_number() over (
            PARTITION by
              t_user_pseudo_id,
              rank
            order by
              t_event_timestamp asc
          ) as row_seq
        from
          target_data
          join touch_point_data_3 on target_data.user_pseudo_id = touch_point_data_3.user_pseudo_id
          and target_data.rank = touch_point_data_3.group_id
          and target_data.event_timestamp >= touch_point_data_3.event_timestamp
          and target_data.event_timestamp >= touch_point_data_3.event_timestamp
          and TO_CHAR(
            TIMESTAMP 'epoch' + cast(target_data.event_timestamp / 1000 as bigint) * INTERVAL '1 second',
            'YYYY-MM-DD'
          ) = TO_CHAR(
            TIMESTAMP 'epoch' + cast(
              touch_point_data_3.event_timestamp / 1000 as bigint
            ) * INTERVAL '1 second',
            'YYYY-MM-DD'
          )
        where
          touch_point_data_3.event_name <> 'purchase'
      ),
      model_base_data as (
        select
          user_pseudo_id,
          group_id,
          max(row_seq) as row_seq
        from
          joined_base_data
        group by
          user_pseudo_id,
          group_id
      ),
      model_data as (
        select
          joined_base_data.*
        from
          joined_base_data
          join model_base_data on joined_base_data.user_pseudo_id = model_base_data.user_pseudo_id
          and joined_base_data.row_seq = model_base_data.row_seq
          and joined_base_data.group_id = model_base_data.group_id
      ),
      attribution_data as (
        select
          t_event_name,
          count(t_event_id) as contribution
        from
          model_data
        group by
          t_event_name
      )
    select
      total_count_data.total_event_count as "Trigger Count",
      attribution_data.t_event_name as "Touch Point Name",
      attribution_count as "Number of Triggers with Conversion",
      attribution_data.contribution as "Contribution(number/sum...value)",
      cast(attribution_data.contribution as float) / t.total_contribution as "Contribution Rate"
    from
      attribution_data
      join (
        select
          event_name,
          count(event_id) as total_event_count
        from
          touch_point_data_3
        group by
          event_name
      ) total_count_data on attribution_data.t_event_name = total_count_data.event_name
      join (
        select
          count(t_event_id) as total_contribution
        from
          model_data
      ) as t on 1 = 1
      join (
        select
          t_event_name,
          count(1) as attribution_count
        from
          joined_base_data
        group by
          t_event_name
      ) as s on attribution_data.t_event_name = s.t_event_name
    `.trim().replace(/ /g, ''));

  });

  test('linear model - event count', () => {
    const sql = buildSQLForLinearModel({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.EVENT_CNT,
      timeWindowType: ExploreAttributionTimeWindowType.CUSTOMIZE,
      timeWindowInSeconds: 600,
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
            category: ConditionCategory.USER_OUTER,
            property: '_channel',
            operator: '<>',
            value: ['google'],
            dataType: MetadataValueType.STRING,
          },
        ],
      },
      targetEventAndCondition:
        {
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
                category: ConditionCategory.USER_OUTER,
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
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '<>',
                value: ['google'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
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
                category: ConditionCategory.USER_OUTER,
                property: 'user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [10],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '<>',
                value: ['apple'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
        {
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
                value: [10],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '<>',
                value: ['apple'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
      ],
      modelType: AttributionModelType.LINEAR,
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          user_pseudo_id,
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
          event_name::varchar as event_name,
          event_id::varchar as event_id,
          event_timestamp::bigint as event_timestamp,
          platform::varchar as platform,
          geo.country::varchar as geo_country,
          user_pseudo_id,
          user_id
        from
          shop.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2025-10-10'
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          user_first_touch_timestamp,
          _channel,
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
              max(user_first_touch_timestamp) as user_first_touch_timestamp,
              max(_channel) as _channel
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
            and (
              _channel is null 
              or _channel <> 'google'
            )
          )
      ),
      target_data as (
        select
          user_pseudo_id,
          event_id,
          event_name,
          event_timestamp,
          row_number() over (
            PARTITION by
              user_pseudo_id
            ORDER by
              event_timestamp asc
          ) as rank
        from
          base_data
        where
          event_name = 'purchase'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _session_duration > 200
            and (
              _channel is null 
              or _channel <> 'google'
            )
          )
      ),
      touch_point_data_1 as (
        select
          user_pseudo_id,
          event_id,
          event_name,
          event_timestamp
        from
          target_data
        union all
        select
          user_pseudo_id,
          event_id,
          '1_' || event_name as event_name,
          event_timestamp
        from
          base_data
        where
          event_name = 'view_item'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and user_first_touch_timestamp > 1686532526770
            and _session_duration > 10
            and (
              _channel is null 
              or _channel <> 'apple'
            )
          )
        union all
        select
          user_pseudo_id,
          event_id,
          '2_' || event_name as event_name,
          event_timestamp
        from
          base_data
        where
          event_name = 'add_to_cart'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _session_duration > 10
            and (
              _channel is null 
              or _channel <> 'apple'
            )
          )
      ),
      touch_point_data_2 as (
        select
          *,
          case
            when event_name = 'purchase' then 1
            else 0
          end as conversation_flag
        from
          touch_point_data_1
        order by
          event_timestamp
      ),
      touch_point_data_3 as (
        select
          *,
          SUM(conversation_flag) over (
            PARTITION by
              user_pseudo_id
            order by
              user_pseudo_id,
              event_timestamp ROWS BETWEEN UNBOUNDED PRECEDING
              AND CURRENT ROW
          ) + 1 AS group_id
        from
          touch_point_data_2
      ),
      joined_base_data as (
        select
          target_data.*,
          touch_point_data_3.user_pseudo_id as t_user_pseudo_id,
          touch_point_data_3.event_id as t_event_id,
          touch_point_data_3.event_name as t_event_name,
          touch_point_data_3.event_timestamp as t_event_timestamp,
          touch_point_data_3.conversation_flag,
          touch_point_data_3.group_id,
          row_number() over (
            PARTITION by
              t_user_pseudo_id,
              rank
            order by
              t_event_timestamp asc
          ) as row_seq
        from
          target_data
          join touch_point_data_3 on target_data.user_pseudo_id = touch_point_data_3.user_pseudo_id
          and target_data.rank = touch_point_data_3.group_id
          and target_data.event_timestamp >= touch_point_data_3.event_timestamp
          and (
            target_data.event_timestamp - touch_point_data_3.event_timestamp <= 600 * cast(1000 as bigint)
          )
        where
          touch_point_data_3.event_name <> 'purchase'
      ),
      model_base_data as (
        select
          user_pseudo_id,
          group_id,
          count(1) as cnt
        from
          joined_base_data
        group by
          user_pseudo_id,
          group_id
      ),
      model_data as (
        select
          joined_base_data.*,
          1.0 / model_base_data.cnt as contribution
        from
          joined_base_data
          join model_base_data on joined_base_data.user_pseudo_id = model_base_data.user_pseudo_id
          and joined_base_data.group_id = model_base_data.group_id
      ),
      attribution_data as (
        select
          t_event_name,
          sum(contribution) as contribution
        from
          model_data
        group by
          t_event_name
      )
    select
      total_count_data.total_event_count as "Trigger Count",
      attribution_data.t_event_name as "Touch Point Name",
      attribution_count as "Number of Triggers with Conversion",
      attribution_data.contribution as "Contribution(number/sum...value)",
      cast(attribution_data.contribution as float) / t.total_contribution as "Contribution Rate"
    from
      attribution_data
      join (
        select
          event_name,
          count(event_id) as total_event_count
        from
          touch_point_data_3
        group by
          event_name
      ) total_count_data on attribution_data.t_event_name = total_count_data.event_name
      join (
        select
          sum(contribution) as total_contribution
        from
          attribution_data
      ) as t on 1 = 1
      join (
        select
          t_event_name,
          count(1) as attribution_count
        from
          joined_base_data
        group by
          t_event_name
      ) as s on attribution_data.t_event_name = s.t_event_name
    `.trim().replace(/ /g, ''));

  });

  test('linear model - sum value', () => {
    const sql = buildSQLForLinearModel({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.SUM_VALUE,
      timeWindowType: ExploreAttributionTimeWindowType.SESSION,
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
            category: ConditionCategory.USER_OUTER,
            property: '_channel',
            operator: '<>',
            value: ['google'],
            dataType: MetadataValueType.STRING,
          },
        ],
      },
      targetEventAndCondition:
        {
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
                category: ConditionCategory.USER_OUTER,
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
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '<>',
                value: ['google'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
          groupColumn: {
            category: ConditionCategory.EVENT,
            property: '_session_duration',
            dataType: MetadataValueType.FLOAT,
          },
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
                category: ConditionCategory.USER_OUTER,
                property: 'user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [10],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '<>',
                value: ['apple'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
        {
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
                value: [10],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '<>',
                value: ['apple'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
      ],
      modelType: AttributionModelType.LINEAR,
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          user_pseudo_id,
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
          event_name::varchar as event_name,
          event_id::varchar as event_id,
          event_timestamp::bigint as event_timestamp,
          platform::varchar as platform,
          geo.country::varchar as geo_country,
          user_pseudo_id,
          user_id
        from
          shop.event as event
        where
          event.event_date >= date '2023-10-01'
          and event.event_date <= date '2025-10-10'
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          user_first_touch_timestamp,
          _channel,
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
              ) as _user_first_touch_timestamp,
              max(user_first_touch_timestamp) as user_first_touch_timestamp,
              max(_channel) as _channel
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
            and (
              _channel is null 
              or _channel <> 'google'
            )
          )
      ),
      target_data as (
        select
          user_pseudo_id,
          event_id,
          _session_id,
          event_name,
          event_timestamp,
          row_number() over (
            PARTITION by
              user_pseudo_id
            ORDER by
              event_timestamp asc
          ) as rank,
          _session_duration as sum_value
        from
          base_data
        where
          event_name = 'purchase'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _session_duration > 200
            and (
              _channel is null 
              or _channel <> 'google'
            )
          )
      ),
      touch_point_data_1 as (
        select
          user_pseudo_id,
          event_id,
          _session_id,
          event_name,
          event_timestamp,
          sum_value
        from
          target_data
        union all
        select
          user_pseudo_id,
          event_id,
          _session_id,
          '1_' || event_name as event_name,
          event_timestamp,
          0 as sum_value
        from
          base_data
        where
          event_name = 'view_item'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and user_first_touch_timestamp > 1686532526770
            and _session_duration > 10
            and (
              _channel is null 
              or _channel <> 'apple'
            )
          )
        union all
        select
          user_pseudo_id,
          event_id,
          _session_id,
          '2_' || event_name as event_name,
          event_timestamp,
          0 as sum_value
        from
          base_data
        where
          event_name = 'add_to_cart'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _session_duration > 10
            and (
              _channel is null 
              or _channel <> 'apple'
            )
          )
      ),
      touch_point_data_2 as (
        select
          *,
          case
            when event_name = 'purchase' then 1
            else 0
          end as conversation_flag
        from
          touch_point_data_1
        order by
          event_timestamp
      ),
      touch_point_data_3 as (
        select
          *,
          SUM(conversation_flag) over (
            PARTITION by
              user_pseudo_id
            order by
              user_pseudo_id,
              event_timestamp ROWS BETWEEN UNBOUNDED PRECEDING
              AND CURRENT ROW
          ) + 1 AS group_id
        from
          touch_point_data_2
      ),
      joined_base_data as (
        select
          target_data.*,
          touch_point_data_3.user_pseudo_id as t_user_pseudo_id,
          touch_point_data_3.event_id as t_event_id,
          touch_point_data_3.event_name as t_event_name,
          touch_point_data_3.event_timestamp as t_event_timestamp,
          touch_point_data_3.conversation_flag,
          touch_point_data_3.group_id,
          row_number() over (
            PARTITION by
              t_user_pseudo_id,
              rank
            order by
              t_event_timestamp asc
          ) as row_seq
        from
          target_data
          join touch_point_data_3 on target_data.user_pseudo_id = touch_point_data_3.user_pseudo_id
          and target_data.rank = touch_point_data_3.group_id
          and target_data.event_timestamp >= touch_point_data_3.event_timestamp
          and target_data._session_id = touch_point_data_3._session_id
        where
          touch_point_data_3.event_name <> 'purchase'
      ),
      model_base_data as (
        select
          user_pseudo_id,
          group_id,
          count(1) as cnt
        from
          joined_base_data
        group by
          user_pseudo_id,
          group_id
      ),
      model_data as (
        select
          joined_base_data.*,
          model_base_data.cnt,
          cast(joined_base_data.sum_value as float) / model_base_data.cnt as contribution
        from
          joined_base_data
          join model_base_data on joined_base_data.user_pseudo_id = model_base_data.user_pseudo_id
          and joined_base_data.group_id = model_base_data.group_id
      ),
      attribution_data as (
        select
          t_event_name,
          sum(contribution) as contribution
        from
          model_data
        group by
          t_event_name
      )
    select
      total_count_data.total_event_count as "Trigger Count",
      attribution_data.t_event_name as "Touch Point Name",
      attribution_count as "Number of Triggers with Conversion",
      attribution_data.contribution as "Contribution(number/sum...value)",
      cast(attribution_data.contribution as float) / t.total_contribution as "Contribution Rate"
    from
      attribution_data
      join (
        select
          event_name,
          count(event_id) as total_event_count
        from
          touch_point_data_3
        group by
          event_name
      ) total_count_data on attribution_data.t_event_name = total_count_data.event_name
      join (
        select
          sum(contribution) as total_contribution
        from
          attribution_data
      ) as t on 1 = 1
      join (
        select
          t_event_name,
          count(1) as attribution_count
        from
          joined_base_data
        group by
          t_event_name
      ) as s on attribution_data.t_event_name = s.t_event_name
    `.trim().replace(/ /g, ''));

  });

  test('position model - sum value', () => {
    const sql = buildSQLForPositionModel({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.SUM_VALUE,
      timeWindowType: ExploreAttributionTimeWindowType.CURRENT_DAY,
      targetEventAndCondition:
        {
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
                category: ConditionCategory.USER_OUTER,
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
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '<>',
                value: ['google'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
          groupColumn: {
            category: ConditionCategory.EVENT,
            property: '_session_duration',
            dataType: MetadataValueType.FLOAT,
          },
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
                category: ConditionCategory.USER_OUTER,
                property: 'user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [10],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '<>',
                value: ['apple'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
        {
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
                value: [10],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '<>',
                value: ['apple'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
      ],
      modelType: AttributionModelType.POSITION,
      modelWeights: [0.4, 0.2, 0.4],
      timeScopeType: ExploreTimeScopeType.RELATIVE,
      lastN: 20,
      timeUnit: ExploreRelativeTimeUnit.MM,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          user_pseudo_id,
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
          event_name::varchar as event_name,
          event_id::varchar as event_id,
          event_timestamp::bigint as event_timestamp,
          platform::varchar as platform,
          geo.country::varchar as geo_country,
          user_pseudo_id,
          user_id
        from
          shop.event as event
        where
          event.event_date >= date_trunc('month', current_date - interval '19months')
          and event.event_date <= CURRENT_DATE
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          user_first_touch_timestamp,
          _channel,
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
              max(user_first_touch_timestamp) as user_first_touch_timestamp,
              max(_channel) as _channel
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
      ),
      target_data as (
        select
          user_pseudo_id,
          event_id,
          event_name,
          event_timestamp,
          row_number() over (
            PARTITION by
              user_pseudo_id
            ORDER by
              event_timestamp asc
          ) as rank,
          _session_duration as sum_value
        from
          base_data
        where
          event_name = 'purchase'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _session_duration > 200
            and (
              _channel is null 
              or _channel <> 'google'
            )
          )
      ),
      touch_point_data_1 as (
        select
          user_pseudo_id,
          event_id,
          event_name,
          event_timestamp,
          sum_value
        from
          target_data
        union all
        select
          user_pseudo_id,
          event_id,
          '1_' || event_name as event_name,
          event_timestamp,
          0 as sum_value
        from
          base_data
        where
          event_name = 'view_item'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and user_first_touch_timestamp > 1686532526770
            and _session_duration > 10
            and (
              _channel is null 
              or _channel <> 'apple'
            )
          )
        union all
        select
          user_pseudo_id,
          event_id,
          '2_' || event_name as event_name,
          event_timestamp,
          0 as sum_value
        from
          base_data
        where
          event_name = 'add_to_cart'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _session_duration > 10
            and (
              _channel is null 
              or _channel <> 'apple'
            )
          )
      ),
      touch_point_data_2 as (
        select
          *,
          case
            when event_name = 'purchase' then 1
            else 0
          end as conversation_flag
        from
          touch_point_data_1
        order by
          event_timestamp
      ),
      touch_point_data_3 as (
        select
          *,
          SUM(conversation_flag) over (
            PARTITION by
              user_pseudo_id
            order by
              user_pseudo_id,
              event_timestamp ROWS BETWEEN UNBOUNDED PRECEDING
              AND CURRENT ROW
          ) + 1 AS group_id
        from
          touch_point_data_2
      ),
      joined_base_data as (
        select
          target_data.*,
          touch_point_data_3.user_pseudo_id as t_user_pseudo_id,
          touch_point_data_3.event_id as t_event_id,
          touch_point_data_3.event_name as t_event_name,
          touch_point_data_3.event_timestamp as t_event_timestamp,
          touch_point_data_3.conversation_flag,
          touch_point_data_3.group_id,
          row_number() over (
            PARTITION by
              t_user_pseudo_id,
              rank
            order by
              t_event_timestamp asc
          ) as row_seq
        from
          target_data
          join touch_point_data_3 on target_data.user_pseudo_id = touch_point_data_3.user_pseudo_id
          and target_data.rank = touch_point_data_3.group_id
          and target_data.event_timestamp >= touch_point_data_3.event_timestamp
          and target_data.event_timestamp >= touch_point_data_3.event_timestamp
          and TO_CHAR(
            TIMESTAMP 'epoch' + cast(target_data.event_timestamp / 1000 as bigint) * INTERVAL '1 second',
            'YYYY-MM-DD'
          ) = TO_CHAR(
            TIMESTAMP 'epoch' + cast(
              touch_point_data_3.event_timestamp / 1000 as bigint
            ) * INTERVAL '1 second',
            'YYYY-MM-DD'
          )
        where
          touch_point_data_3.event_name <> 'purchase'
      ),
      model_base_data as (
        select
          user_pseudo_id,
          group_id,
          max(row_seq) as row_seq_max,
          min(row_seq) as row_seq_min,
          count(1) as cnt
        from
          joined_base_data
        group by
          user_pseudo_id,
          group_id
      ),
      model_data as (
        select
          joined_base_data.*,
          case
            when model_base_data.cnt = 1 then joined_base_data.sum_value
            when model_base_data.cnt = 2 then joined_base_data.sum_value * 0.5
            when model_base_data.cnt > 2 then case
              when joined_base_data.row_seq = model_base_data.row_seq_max then joined_base_data.sum_value * 0.4
              when joined_base_data.row_seq = model_base_data.row_seq_min then joined_base_data.sum_value * 0.4
              else joined_base_data.sum_value * (cast(0.2 as float) / model_base_data.cnt)
            end
          end as contribution
        from
          joined_base_data
          join model_base_data on joined_base_data.user_pseudo_id = model_base_data.user_pseudo_id
          and joined_base_data.group_id = model_base_data.group_id
      ),
      attribution_data as (
        select
          t_event_name,
          sum(contribution) as contribution
        from
          model_data
        group by
          t_event_name
      )
    select
      total_count_data.total_event_count as "Trigger Count",
      attribution_data.t_event_name as "Touch Point Name",
      attribution_count as "Number of Triggers with Conversion",
      attribution_data.contribution as "Contribution(number/sum...value)",
      cast(attribution_data.contribution as float) / t.total_contribution as "Contribution Rate"
    from
      attribution_data
      join (
        select
          event_name,
          count(event_id) as total_event_count
        from
          touch_point_data_3
        group by
          event_name
      ) total_count_data on attribution_data.t_event_name = total_count_data.event_name
      join (
        select
          sum(contribution) as total_contribution
        from
          attribution_data
      ) as t on 1 = 1
      join (
        select
          t_event_name,
          count(1) as attribution_count
        from
          joined_base_data
        group by
          t_event_name
      ) as s on attribution_data.t_event_name = s.t_event_name
    `.trim().replace(/ /g, ''));

  });

  test('position model - event value', () => {
    const sql = buildSQLForPositionModel({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.EVENT_CNT,
      timeWindowType: ExploreAttributionTimeWindowType.CUSTOMIZE,
      timeWindowInSeconds: 200,
      targetEventAndCondition:
        {
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
                category: ConditionCategory.USER_OUTER,
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
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '<>',
                value: ['google'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
          groupColumn: {
            category: ConditionCategory.EVENT,
            property: '_session_duration',
            dataType: MetadataValueType.FLOAT,
          },
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
                category: ConditionCategory.USER_OUTER,
                property: 'user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [10],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '<>',
                value: ['apple'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
        {
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
                value: [10],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '<>',
                value: ['apple'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
      ],
      modelType: AttributionModelType.POSITION,
      modelWeights: [0.4, 0.2, 0.4],
      timeScopeType: ExploreTimeScopeType.RELATIVE,
      lastN: 20,
      timeUnit: ExploreRelativeTimeUnit.MM,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          user_pseudo_id,
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
          event_name::varchar as event_name,
          event_id::varchar as event_id,
          event_timestamp::bigint as event_timestamp,
          platform::varchar as platform,
          geo.country::varchar as geo_country,
          user_pseudo_id,
          user_id
        from
          shop.event as event
        where
          event.event_date >= date_trunc('month', current_date - interval '19months')
          and event.event_date <= CURRENT_DATE
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          user_first_touch_timestamp,
          _channel,
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
              max(user_first_touch_timestamp) as user_first_touch_timestamp,
              max(_channel) as _channel
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
      ),
      target_data as (
        select
          user_pseudo_id,
          event_id,
          event_name,
          event_timestamp,
          row_number() over (
            PARTITION by
              user_pseudo_id
            ORDER by
              event_timestamp asc
          ) as rank
        from
          base_data
        where
          event_name = 'purchase'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _session_duration > 200
            and (
              _channel is null 
              or _channel <> 'google'
            )
          )
      ),
      touch_point_data_1 as (
        select
          user_pseudo_id,
          event_id,
          event_name,
          event_timestamp
        from
          target_data
        union all
        select
          user_pseudo_id,
          event_id,
          '1_' || event_name as event_name,
          event_timestamp
        from
          base_data
        where
          event_name = 'view_item'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and user_first_touch_timestamp > 1686532526770
            and _session_duration > 10
            and (
              _channel is null 
              or _channel <> 'apple'
            )
          )
        union all
        select
          user_pseudo_id,
          event_id,
          '2_' || event_name as event_name,
          event_timestamp
        from
          base_data
        where
          event_name = 'add_to_cart'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _session_duration > 10
            and (
              _channel is null 
              or _channel <> 'apple'
            )
          )
      ),
      touch_point_data_2 as (
        select
          *,
          case
            when event_name = 'purchase' then 1
            else 0
          end as conversation_flag
        from
          touch_point_data_1
        order by
          event_timestamp
      ),
      touch_point_data_3 as (
        select
          *,
          SUM(conversation_flag) over (
            PARTITION by
              user_pseudo_id
            order by
              user_pseudo_id,
              event_timestamp ROWS BETWEEN UNBOUNDED PRECEDING
              AND CURRENT ROW
          ) + 1 AS group_id
        from
          touch_point_data_2
      ),
      joined_base_data as (
        select
          target_data.*,
          touch_point_data_3.user_pseudo_id as t_user_pseudo_id,
          touch_point_data_3.event_id as t_event_id,
          touch_point_data_3.event_name as t_event_name,
          touch_point_data_3.event_timestamp as t_event_timestamp,
          touch_point_data_3.conversation_flag,
          touch_point_data_3.group_id,
          row_number() over (
            PARTITION by
              t_user_pseudo_id,
              rank
            order by
              t_event_timestamp asc
          ) as row_seq
        from
          target_data
          join touch_point_data_3 on target_data.user_pseudo_id = touch_point_data_3.user_pseudo_id
          and target_data.rank = touch_point_data_3.group_id
          and target_data.event_timestamp >= touch_point_data_3.event_timestamp
          and (
            target_data.event_timestamp - touch_point_data_3.event_timestamp <= 200 * cast(1000 as bigint)
          )
        where
          touch_point_data_3.event_name <> 'purchase'
      ),
      model_base_data as (
        select
          user_pseudo_id,
          group_id,
          max(row_seq) as row_seq_max,
          min(row_seq) as row_seq_min,
          count(1) as cnt
        from
          joined_base_data
        group by
          user_pseudo_id,
          group_id
      ),
      model_data as (
        select
          joined_base_data.*,
          case
            when model_base_data.cnt = 1 then 1
            when model_base_data.cnt = 2 then 0.5
            when model_base_data.cnt > 2 then case
              when joined_base_data.row_seq = model_base_data.row_seq_max then 0.4
              when joined_base_data.row_seq = model_base_data.row_seq_min then 0.4
              else cast(0.2 as float) / model_base_data.cnt
            end
          end as contribution
        from
          joined_base_data
          join model_base_data on joined_base_data.user_pseudo_id = model_base_data.user_pseudo_id
          and joined_base_data.group_id = model_base_data.group_id
      ),
      attribution_data as (
        select
          t_event_name,
          sum(contribution) as contribution
        from
          model_data
        group by
          t_event_name
      )
    select
      total_count_data.total_event_count as "Trigger Count",
      attribution_data.t_event_name as "Touch Point Name",
      attribution_count as "Number of Triggers with Conversion",
      attribution_data.contribution as "Contribution(number/sum...value)",
      cast(attribution_data.contribution as float) / t.total_contribution as "Contribution Rate"
    from
      attribution_data
      join (
        select
          event_name,
          count(event_id) as total_event_count
        from
          touch_point_data_3
        group by
          event_name
      ) total_count_data on attribution_data.t_event_name = total_count_data.event_name
      join (
        select
          sum(contribution) as total_contribution
        from
          model_data
      ) as t on 1 = 1
      join (
        select
          t_event_name,
          count(1) as attribution_count
        from
          joined_base_data
        group by
          t_event_name
      ) as s on attribution_data.t_event_name = s.t_event_name
    `.trim().replace(/ /g, ''));

  });

  test('position model - more events', () => {
    const sql = buildSQLForPositionModel({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.EVENT_CNT,
      timeWindowType: ExploreAttributionTimeWindowType.CUSTOMIZE,
      timeWindowInSeconds: 200,
      targetEventAndCondition:
        {
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
                category: ConditionCategory.USER_OUTER,
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
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '<>',
                value: ['google'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
          groupColumn: {
            category: ConditionCategory.EVENT,
            property: '_session_duration',
            dataType: MetadataValueType.FLOAT,
          },
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
                category: ConditionCategory.USER_OUTER,
                property: 'user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [10],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '<>',
                value: ['apple'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
        {
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
                value: [10],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '<>',
                value: ['apple'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
        {
          eventName: 'view_cart',
        },
        {
          eventName: 'check_out',
        },
      ],
      modelType: AttributionModelType.POSITION,
      modelWeights: [0.4, 0.2, 0.4],
      timeScopeType: ExploreTimeScopeType.RELATIVE,
      lastN: 20,
      timeUnit: ExploreRelativeTimeUnit.MM,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      user_base as (
        select
          user_pseudo_id,
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
          event_name::varchar as event_name,
          event_id::varchar as event_id,
          event_timestamp::bigint as event_timestamp,
          platform::varchar as platform,
          geo.country::varchar as geo_country,
          user_pseudo_id,
          user_id
        from
          shop.event as event
        where
          event.event_date >= date_trunc('month', current_date - interval '19months')
          and event.event_date <= CURRENT_DATE
          and event.event_name in (
            'view_item',
            'add_to_cart',
            'view_cart',
            'check_out',
            'purchase'
          )
      ),
      base_data as (
        select
          _user_first_touch_timestamp,
          user_first_touch_timestamp,
          _channel,
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
              max(user_first_touch_timestamp) as user_first_touch_timestamp,
              max(_channel) as _channel
            from
              event_base
              join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
            group by
              event_base.user_pseudo_id
          ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
        where
          1 = 1
      ),
      target_data as (
        select
          user_pseudo_id,
          event_id,
          event_name,
          event_timestamp,
          row_number() over (
            PARTITION by
              user_pseudo_id
            ORDER by
              event_timestamp asc
          ) as rank
        from
          base_data
        where
          event_name = 'purchase'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _session_duration > 200
            and (
              _channel is null 
              or _channel <> 'google'
            )
          )
      ),
      touch_point_data_1 as (
        select
          user_pseudo_id,
          event_id,
          event_name,
          event_timestamp
        from
          target_data
        union all
        select
          user_pseudo_id,
          event_id,
          '1_' || event_name as event_name,
          event_timestamp
        from
          base_data
        where
          event_name = 'view_item'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and user_first_touch_timestamp > 1686532526770
            and _session_duration > 10
            and (
              _channel is null 
              or _channel <> 'apple'
            )
          )
        union all
        select
          user_pseudo_id,
          event_id,
          '2_' || event_name as event_name,
          event_timestamp
        from
          base_data
        where
          event_name = 'add_to_cart'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and _user_first_touch_timestamp > 1686532526770
            and _session_duration > 10
            and (
              _channel is null 
              or _channel <> 'apple'
            )
          )
        union all
        select
          user_pseudo_id,
          event_id,
          '3_' || event_name as event_name,
          event_timestamp
        from
          base_data
        where
          event_name = 'view_cart'
        union all
        select
          user_pseudo_id,
          event_id,
          '4_' || event_name as event_name,
          event_timestamp
        from
          base_data
        where
          event_name = 'check_out'
      ),
      touch_point_data_2 as (
        select
          *,
          case
            when event_name = 'purchase' then 1
            else 0
          end as conversation_flag
        from
          touch_point_data_1
        order by
          event_timestamp
      ),
      touch_point_data_3 as (
        select
          *,
          SUM(conversation_flag) over (
            PARTITION by
              user_pseudo_id
            order by
              user_pseudo_id,
              event_timestamp ROWS BETWEEN UNBOUNDED PRECEDING
              AND CURRENT ROW
          ) + 1 AS group_id
        from
          touch_point_data_2
      ),
      joined_base_data as (
        select
          target_data.*,
          touch_point_data_3.user_pseudo_id as t_user_pseudo_id,
          touch_point_data_3.event_id as t_event_id,
          touch_point_data_3.event_name as t_event_name,
          touch_point_data_3.event_timestamp as t_event_timestamp,
          touch_point_data_3.conversation_flag,
          touch_point_data_3.group_id,
          row_number() over (
            PARTITION by
              t_user_pseudo_id,
              rank
            order by
              t_event_timestamp asc
          ) as row_seq
        from
          target_data
          join touch_point_data_3 on target_data.user_pseudo_id = touch_point_data_3.user_pseudo_id
          and target_data.rank = touch_point_data_3.group_id
          and target_data.event_timestamp >= touch_point_data_3.event_timestamp
          and (
            target_data.event_timestamp - touch_point_data_3.event_timestamp <= 200 * cast(1000 as bigint)
          )
        where
          touch_point_data_3.event_name <> 'purchase'
      ),
      model_base_data as (
        select
          user_pseudo_id,
          group_id,
          max(row_seq) as row_seq_max,
          min(row_seq) as row_seq_min,
          count(1) as cnt
        from
          joined_base_data
        group by
          user_pseudo_id,
          group_id
      ),
      model_data as (
        select
          joined_base_data.*,
          case
            when model_base_data.cnt = 1 then 1
            when model_base_data.cnt = 2 then 0.5
            when model_base_data.cnt > 2 then case
              when joined_base_data.row_seq = model_base_data.row_seq_max then 0.4
              when joined_base_data.row_seq = model_base_data.row_seq_min then 0.4
              else cast(0.2 as float) / model_base_data.cnt
            end
          end as contribution
        from
          joined_base_data
          join model_base_data on joined_base_data.user_pseudo_id = model_base_data.user_pseudo_id
          and joined_base_data.group_id = model_base_data.group_id
      ),
      attribution_data as (
        select
          t_event_name,
          sum(contribution) as contribution
        from
          model_data
        group by
          t_event_name
      )
    select
      total_count_data.total_event_count as "Trigger Count",
      attribution_data.t_event_name as "Touch Point Name",
      attribution_count as "Number of Triggers with Conversion",
      attribution_data.contribution as "Contribution(number/sum...value)",
      cast(attribution_data.contribution as float) / t.total_contribution as "Contribution Rate"
    from
      attribution_data
      join (
        select
          event_name,
          count(event_id) as total_event_count
        from
          touch_point_data_3
        group by
          event_name
      ) total_count_data on attribution_data.t_event_name = total_count_data.event_name
      join (
        select
          sum(contribution) as total_contribution
        from
          model_data
      ) as t on 1 = 1
      join (
        select
          t_event_name,
          count(1) as attribution_count
        from
          joined_base_data
        group by
          t_event_name
      ) as s on attribution_data.t_event_name = s.t_event_name
    `.trim().replace(/ /g, ''));

  });

});