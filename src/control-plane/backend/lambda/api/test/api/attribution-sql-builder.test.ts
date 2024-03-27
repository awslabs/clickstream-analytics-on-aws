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

import { AttributionModelType, ConditionCategory, ExploreAnalyticsOperators, ExploreAttributionTimeWindowType, ExploreComputeMethod, ExploreRelativeTimeUnit, ExploreTimeScopeType, MetadataValueType } from '@aws/clickstream-base-lib';
import { buildSQLForLinearModel, buildSQLForPositionModel, buildSQLForSinglePointModel } from '../../service/quicksight/sql-builder-attribution';

describe('Attribution SQL Builder test', () => {

  beforeEach(() => {
  });

  test('last touch model - event count', () => {
    const sql = buildSQLForSinglePointModel({
      dbName: 'shop',
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.EVENT_CNT,
      timeWindowType: ExploreAttributionTimeWindowType.CURRENT_DAY,
      globalEventCondition: {
        conditions: [
          {
            category: ConditionCategory.EVENT_OUTER,
            property: 'platform',
            operator: '=',
            value: ['Android'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.EVENT_OUTER,
            property: 'geo_country',
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
            property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
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
                property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
                operator: '<>',
                value: ['Google'],
                dataType: MetadataValueType.STRING,
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
                property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
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
                property: 'first_traffic_source',
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
      base_data as (
        select
          event.event_id,
          event.event_name,
          event.event_timestamp,
          event.user_pseudo_id,
          event.user_id,
          event.platform,
          event.geo_country,
          event.custom_parameters._session_duration.value::bigint as e__session_duration,
          event.user_properties._user_first_touch_timestamp.value::bigint as u__user_first_touch_timestamp,
          event.first_traffic_source,
          TO_CHAR(event.event_timestamp, 'YYYY-MM') as month,
          TO_CHAR(
            date_trunc('week', event.event_timestamp),
            'YYYY-MM-DD'
          ) as week,
          TO_CHAR(event.event_timestamp, 'YYYY-MM-DD') as day,
          TO_CHAR(event.event_timestamp, 'YYYY-MM-DD HH24') || '00:00' as hour
        from
          shop.shop.clickstream_event_view_v3 as event
        where
          DATE (event.event_timestamp) >= date '2023-10-01'
          and DATE (event.event_timestamp) <= date '2025-10-10'
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
          and (
            platform = 'Android'
            and geo_country = 'China'
            and u__user_first_touch_timestamp > 1686532526770
            and (
              first_traffic_source is null
              or first_traffic_source <> 'google'
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
            and u__user_first_touch_timestamp > 1686532526770
            and e__session_duration > 200
            and (
              first_traffic_source is null
              or first_traffic_source <> 'google'
            )
          )
      ),
      total_conversion_data as (
        select
          count(1) as total_conversion
        from
          target_data
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
            and (
              first_traffic_source is null
              or first_traffic_source <> 'Google'
            )
            and e__session_duration > 10
            and (
              first_traffic_source is null
              or first_traffic_source <> 'apple'
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
            and u__user_first_touch_timestamp > 1686532526770
            and e__session_duration > 10
            and (
              first_traffic_source is null
              or first_traffic_source <> 'apple'
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
          and TO_CHAR(target_data.event_timestamp, 'YYYY-MM-DD') = TO_CHAR(touch_point_data_3.event_timestamp, 'YYYY-MM-DD')
        where
          touch_point_data_3.event_name <> 'purchase'
          and target_data.event_timestamp >= date '2023-10-01'
      ),
      touch_point_names as (
        select
          '1_view_item' as origin_name,
          '1_view_item' as custom_touch_point_name
        union all
        select
          '2_add_to_cart' as origin_name,
          '2_add_to_cart' as custom_touch_point_name
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
      p.custom_touch_point_name as "Touch Point Name",
      total_conversion as "Number of Total Conversion",
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
          total_conversion
        from
          total_conversion_data
      ) as c on 1 = 1
      join (
        select
          t_event_name,
          count(1) as attribution_count
        from
          joined_base_data
        group by
          t_event_name
      ) as s on attribution_data.t_event_name = s.t_event_name
      join touch_point_names p on attribution_data.t_event_name = p.origin_name
    `.trim().replace(/ /g, ''));

  });

  test('first touch model - sum value', () => {
    const sql = buildSQLForSinglePointModel({
      dbName: 'shop',
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.SUM_VALUE,
      timeWindowType: ExploreAttributionTimeWindowType.SESSION,
      globalEventCondition: {
        conditions: [
          {
            category: ConditionCategory.EVENT_OUTER,
            property: 'platform',
            operator: '=',
            value: ['Android'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.EVENT_OUTER,
            property: 'geo_country',
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
            property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
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
                property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
                operator: ExploreAnalyticsOperators.NOT_NULL,
                value: [],
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
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
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
                property: 'first_traffic_source',
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
      base_data as (
        select
          event.event_id,
          event.event_name,
          event.event_timestamp,
          event.user_pseudo_id,
          event.user_id,
          event.platform,
          event.geo_country,
          event.custom_parameters._session_duration.value::bigint as e__session_duration,
          event.session_id,
          event.user_properties._user_first_touch_timestamp.value::bigint as u__user_first_touch_timestamp,
          event.first_traffic_source,
          TO_CHAR(event.event_timestamp, 'YYYY-MM') as month,
          TO_CHAR(
            date_trunc('week', event.event_timestamp),
            'YYYY-MM-DD'
          ) as week,
          TO_CHAR(event.event_timestamp, 'YYYY-MM-DD') as day,
          TO_CHAR(event.event_timestamp, 'YYYY-MM-DD HH24') || '00:00' as hour
        from
          shop.shop.clickstream_event_view_v3 as event
        where
          DATE (event.event_timestamp) >= date_trunc('month', current_date - interval '23 months')
          and DATE (event.event_timestamp) <= CURRENT_DATE
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
          and (
            platform = 'Android'
            and geo_country = 'China'
            and u__user_first_touch_timestamp > 1686532526770
            and (
              first_traffic_source is null
              or first_traffic_source <> 'google'
            )
          )
      ),
      target_data as (
        select
          user_pseudo_id,
          event_id,
          session_id,
          event_name,
          event_timestamp,
          row_number() over (
            PARTITION by
              user_pseudo_id
            ORDER by
              event_timestamp asc
          ) as rank,
          e__session_duration as sum_value
        from
          base_data
        where
          event_name = 'purchase'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and u__user_first_touch_timestamp > 1686532526770
            and e__session_duration > 200
            and (
              first_traffic_source is null
              or first_traffic_source <> 'google'
            )
          )
      ),
      total_conversion_data as (
        select
          count(1) as total_conversion
        from
          target_data
      ),
      touch_point_data_1 as (
        select
          user_pseudo_id,
          event_id,
          session_id,
          event_name,
          event_timestamp,
          sum_value
        from
          target_data
        union all
        select
          user_pseudo_id,
          event_id,
          session_id,
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
            and first_traffic_source is not null
            and e__session_duration > 200
            and (
              first_traffic_source is null
              or first_traffic_source <> 'apple'
            )
          )
        union all
        select
          user_pseudo_id,
          event_id,
          session_id,
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
            and u__user_first_touch_timestamp > 1686532526770
            and e__session_duration > 200
            and (
              first_traffic_source is null
              or first_traffic_source <> 'apple'
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
          and target_data.session_id = touch_point_data_3.session_id
        where
          touch_point_data_3.event_name <> 'purchase'
          and target_data.event_timestamp >= date_trunc('month', current_date - interval '23 months')
      ),
      touch_point_names as (
        select
          '1_view_item' as origin_name,
          '1_view_item' as custom_touch_point_name
        union all
        select
          '2_add_to_cart' as origin_name,
          '2_add_to_cart' as custom_touch_point_name
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
      p.custom_touch_point_name as "Touch Point Name",
      total_conversion as "Number of Total Conversion",
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
          total_conversion
        from
          total_conversion_data
      ) as c on 1 = 1
      join (
        select
          t_event_name,
          count(1) as attribution_count
        from
          joined_base_data
        group by
          t_event_name
      ) as s on attribution_data.t_event_name = s.t_event_name
      join touch_point_names p on attribution_data.t_event_name = p.origin_name
    `.trim().replace(/ /g, ''));

  });

  test('last touch model - no condition', () => {
    const sql = buildSQLForSinglePointModel({
      dbName: 'shop',
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
          event.event_id,
          event.event_name,
          event.event_timestamp,
          event.user_pseudo_id,
          event.user_id,
          TO_CHAR(event.event_timestamp, 'YYYY-MM') as month,
          TO_CHAR(
            date_trunc('week', event.event_timestamp),
            'YYYY-MM-DD'
          ) as week,
          TO_CHAR(event.event_timestamp, 'YYYY-MM-DD') as day,
          TO_CHAR(event.event_timestamp, 'YYYY-MM-DD HH24') || '00:00' as hour
        from
          shop.shop.clickstream_event_view_v3 as event
        where
          DATE (event.event_timestamp) >= date '2023-10-01'
          and DATE (event.event_timestamp) <= date '2025-10-10'
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
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
      total_conversion_data as (
        select
          count(1) as total_conversion
        from
          target_data
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
          and TO_CHAR(target_data.event_timestamp, 'YYYY-MM-DD') = TO_CHAR(touch_point_data_3.event_timestamp, 'YYYY-MM-DD')
        where
          touch_point_data_3.event_name <> 'purchase'
          and target_data.event_timestamp >= date '2023-10-01'
      ),
      touch_point_names as (
        select
          '1_view_item' as origin_name,
          '1_view_item' as custom_touch_point_name
        union all
        select
          '2_add_to_cart' as origin_name,
          '2_add_to_cart' as custom_touch_point_name
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
      p.custom_touch_point_name as "Touch Point Name",
      total_conversion as "Number of Total Conversion",
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
          total_conversion
        from
          total_conversion_data
      ) as c on 1 = 1
      join (
        select
          t_event_name,
          count(1) as attribution_count
        from
          joined_base_data
        group by
          t_event_name
      ) as s on attribution_data.t_event_name = s.t_event_name
      join touch_point_names p on attribution_data.t_event_name = p.origin_name
    `.trim().replace(/ /g, ''));

  });

  test('linear model - event count', () => {
    const sql = buildSQLForLinearModel({
      dbName: 'shop',
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.EVENT_CNT,
      timeWindowType: ExploreAttributionTimeWindowType.CUSTOMIZE,
      timeWindowInSeconds: 600,
      globalEventCondition: {
        conditions: [
          {
            category: ConditionCategory.EVENT_OUTER,
            property: 'platform',
            operator: '=',
            value: ['Android'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.EVENT_OUTER,
            property: 'geo_country',
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
            property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
                operator: ExploreAnalyticsOperators.NOT_NULL,
                value: [],
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
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
                operator: ExploreAnalyticsOperators.NOT_NULL,
                value: [],
                dataType: MetadataValueType.STRING,
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
                property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
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
                property: 'first_traffic_source',
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
      base_data as (
        select
          event.event_id,
          event.event_name,
          event.event_timestamp,
          event.user_pseudo_id,
          event.user_id,
          event.platform,
          event.geo_country,
          event.custom_parameters._session_duration.value::bigint as e__session_duration,
          event.user_properties._user_first_touch_timestamp.value::bigint as u__user_first_touch_timestamp,
          event.first_traffic_source,
          TO_CHAR(event.event_timestamp, 'YYYY-MM') as month,
          TO_CHAR(
            date_trunc('week', event.event_timestamp),
            'YYYY-MM-DD'
          ) as week,
          TO_CHAR(event.event_timestamp, 'YYYY-MM-DD') as day,
          TO_CHAR(event.event_timestamp, 'YYYY-MM-DD HH24') || '00:00' as hour
        from
          shop.shop.clickstream_event_view_v3 as event
        where
          DATE (event.event_timestamp) >= date '2023-09-30'
          and DATE (event.event_timestamp) <= date '2025-10-10'
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
          and (
            platform = 'Android'
            and geo_country = 'China'
            and u__user_first_touch_timestamp > 1686532526770
            and (
              first_traffic_source is null
              or first_traffic_source <> 'google'
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
            and first_traffic_source is not null
            and e__session_duration > 200
            and (
              first_traffic_source is null
              or first_traffic_source <> 'google'
            )
          )
      ),
      total_conversion_data as (
        select
          count(1) as total_conversion
        from
          target_data
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
            and first_traffic_source is not null
            and e__session_duration > 10
            and (
              first_traffic_source is null
              or first_traffic_source <> 'apple'
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
            and u__user_first_touch_timestamp > 1686532526770
            and e__session_duration > 10
            and (
              first_traffic_source is null
              or first_traffic_source <> 'apple'
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
            EXTRACT(
              epoch
              FROM
                target_data.event_timestamp - touch_point_data_3.event_timestamp
            ) <= cast(600 as bigint)
          )
        where
          touch_point_data_3.event_name <> 'purchase'
          and target_data.event_timestamp >= date '2023-09-30'
      ),
      touch_point_names as (
        select
          '1_view_item' as origin_name,
          '1_view_item' as custom_touch_point_name
        union all
        select
          '2_add_to_cart' as origin_name,
          '2_add_to_cart' as custom_touch_point_name
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
      p.custom_touch_point_name as "Touch Point Name",
      total_conversion as "Number of Total Conversion",
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
          total_conversion
        from
          total_conversion_data
      ) as c on 1 = 1
      join (
        select
          t_event_name,
          count(1) as attribution_count
        from
          joined_base_data
        group by
          t_event_name
      ) as s on attribution_data.t_event_name = s.t_event_name
      join touch_point_names p on attribution_data.t_event_name = p.origin_name
    `.trim().replace(/ /g, ''));

  });

  test('linear model - sum value', () => {
    const sql = buildSQLForLinearModel({
      dbName: 'shop',
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.SUM_VALUE,
      timeWindowType: ExploreAttributionTimeWindowType.SESSION,
      globalEventCondition: {
        conditions: [
          {
            category: ConditionCategory.EVENT_OUTER,
            property: 'platform',
            operator: '=',
            value: ['Android'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.EVENT_OUTER,
            property: 'geo_country',
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
            property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
                operator: '=',
                value: ['Google'],
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
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
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
                property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
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
                property: 'first_traffic_source',
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
      base_data as (
        select
          event.event_id,
          event.event_name,
          event.event_timestamp,
          event.user_pseudo_id,
          event.user_id,
          event.platform,
          event.geo_country,
          event.custom_parameters._session_duration.value::bigint as e__session_duration,
          event.session_id,
          event.user_properties._user_first_touch_timestamp.value::bigint as u__user_first_touch_timestamp,
          event.first_traffic_source,
          TO_CHAR(event.event_timestamp, 'YYYY-MM') as month,
          TO_CHAR(
            date_trunc('week', event.event_timestamp),
            'YYYY-MM-DD'
          ) as week,
          TO_CHAR(event.event_timestamp, 'YYYY-MM-DD') as day,
          TO_CHAR(event.event_timestamp, 'YYYY-MM-DD HH24') || '00:00' as hour
        from
          shop.shop.clickstream_event_view_v3 as event
        where
          DATE (event.event_timestamp) >= date '2023-10-01'
          and DATE (event.event_timestamp) <= date '2025-10-10'
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
          and (
            platform = 'Android'
            and geo_country = 'China'
            and u__user_first_touch_timestamp > 1686532526770
            and (
              first_traffic_source is null
              or first_traffic_source <> 'google'
            )
          )
      ),
      target_data as (
        select
          user_pseudo_id,
          event_id,
          session_id,
          event_name,
          event_timestamp,
          row_number() over (
            PARTITION by
              user_pseudo_id
            ORDER by
              event_timestamp asc
          ) as rank,
          e__session_duration as sum_value
        from
          base_data
        where
          event_name = 'purchase'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and first_traffic_source = 'Google'
            and e__session_duration > 200
            and (
              first_traffic_source is null
              or first_traffic_source <> 'google'
            )
          )
      ),
      total_conversion_data as (
        select
          count(1) as total_conversion
        from
          target_data
      ),
      touch_point_data_1 as (
        select
          user_pseudo_id,
          event_id,
          session_id,
          event_name,
          event_timestamp,
          sum_value
        from
          target_data
        union all
        select
          user_pseudo_id,
          event_id,
          session_id,
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
            and e__session_duration > 10
            and (
              first_traffic_source is null
              or first_traffic_source <> 'apple'
            )
          )
        union all
        select
          user_pseudo_id,
          event_id,
          session_id,
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
            and u__user_first_touch_timestamp > 1686532526770
            and e__session_duration > 10
            and (
              first_traffic_source is null
              or first_traffic_source <> 'apple'
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
          and target_data.session_id = touch_point_data_3.session_id
        where
          touch_point_data_3.event_name <> 'purchase'
          and target_data.event_timestamp >= date '2023-10-01'
      ),
      touch_point_names as (
        select
          '1_view_item' as origin_name,
          '1_view_item' as custom_touch_point_name
        union all
        select
          '2_add_to_cart' as origin_name,
          '2_add_to_cart' as custom_touch_point_name
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
      p.custom_touch_point_name as "Touch Point Name",
      total_conversion as "Number of Total Conversion",
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
          total_conversion
        from
          total_conversion_data
      ) as c on 1 = 1
      join (
        select
          t_event_name,
          count(1) as attribution_count
        from
          joined_base_data
        group by
          t_event_name
      ) as s on attribution_data.t_event_name = s.t_event_name
      join touch_point_names p on attribution_data.t_event_name = p.origin_name
    `.trim().replace(/ /g, ''));

  });

  test('position model - sum value', () => {
    const sql = buildSQLForPositionModel({
      dbName: 'shop',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
                operator: '=',
                value: ['Google'],
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
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
                operator: '=',
                value: ['Google'],
                dataType: MetadataValueType.STRING,
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
                property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
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
                property: 'first_traffic_source',
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
      base_data as (
        select
          event.event_id,
          event.event_name,
          event.event_timestamp,
          event.user_pseudo_id,
          event.user_id,
          event.platform,
          event.geo_country,
          event.custom_parameters._session_duration.value::bigint as e__session_duration,
          event.user_properties._user_first_touch_timestamp.value::bigint as u__user_first_touch_timestamp,
          event.first_traffic_source,
          TO_CHAR(event.event_timestamp, 'YYYY-MM') as month,
          TO_CHAR(
            date_trunc('week', event.event_timestamp),
            'YYYY-MM-DD'
          ) as week,
          TO_CHAR(event.event_timestamp, 'YYYY-MM-DD') as day,
          TO_CHAR(event.event_timestamp, 'YYYY-MM-DD HH24') || '00:00' as hour
        from
          shop.shop.clickstream_event_view_v3 as event
        where
          DATE (event.event_timestamp) >= date_trunc('month', current_date - interval '19 months')
          and DATE (event.event_timestamp) <= CURRENT_DATE
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
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
          e__session_duration as sum_value
        from
          base_data
        where
          event_name = 'purchase'
          and (
            platform = 'Android'
            and geo_country = 'China'
            and first_traffic_source = 'Google'
            and e__session_duration > 200
            and (
              first_traffic_source is null
              or first_traffic_source <> 'google'
            )
          )
      ),
      total_conversion_data as (
        select
          count(1) as total_conversion
        from
          target_data
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
            and first_traffic_source = 'Google'
            and e__session_duration > 10
            and (
              first_traffic_source is null
              or first_traffic_source <> 'apple'
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
            and u__user_first_touch_timestamp > 1686532526770
            and e__session_duration > 10
            and (
              first_traffic_source is null
              or first_traffic_source <> 'apple'
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
          and TO_CHAR(target_data.event_timestamp, 'YYYY-MM-DD') = TO_CHAR(touch_point_data_3.event_timestamp, 'YYYY-MM-DD')
        where
          touch_point_data_3.event_name <> 'purchase'
          and target_data.event_timestamp >= date_trunc('month', current_date - interval '19 months')
      ),
      touch_point_names as (
        select
          '1_view_item' as origin_name,
          '1_view_item' as custom_touch_point_name
        union all
        select
          '2_add_to_cart' as origin_name,
          '2_add_to_cart' as custom_touch_point_name
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
      p.custom_touch_point_name as "Touch Point Name",
      total_conversion as "Number of Total Conversion",
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
          total_conversion
        from
          total_conversion_data
      ) as c on 1 = 1
      join (
        select
          t_event_name,
          count(1) as attribution_count
        from
          joined_base_data
        group by
          t_event_name
      ) as s on attribution_data.t_event_name = s.t_event_name
      join touch_point_names p on attribution_data.t_event_name = p.origin_name
    `.trim().replace(/ /g, ''));

  });

  test('position model - event value', () => {
    const sql = buildSQLForPositionModel({
      dbName: 'shop',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
                operator: '=',
                value: ['Google'],
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
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
                operator: '=',
                value: ['Google'],
                dataType: MetadataValueType.STRING,
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
                property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
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
                property: 'first_traffic_source',
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
      base_data as (
        select
          event.event_id,
          event.event_name,
          event.event_timestamp,
          event.user_pseudo_id,
          event.user_id,
          event.platform,
          event.geo_country,
          event.custom_parameters._session_duration.value::bigint as e__session_duration,
          event.user_properties._user_first_touch_timestamp.value::bigint as u__user_first_touch_timestamp,
          event.first_traffic_source,
          TO_CHAR(event.event_timestamp, 'YYYY-MM') as month,
          TO_CHAR(
            date_trunc('week', event.event_timestamp),
            'YYYY-MM-DD'
          ) as week,
          TO_CHAR(event.event_timestamp, 'YYYY-MM-DD') as day,
          TO_CHAR(event.event_timestamp, 'YYYY-MM-DD HH24') || '00:00' as hour
        from
          shop.shop.clickstream_event_view_v3 as event
        where
          DATE (event.event_timestamp) >= DATEADD (
            DAY,
            -1,
            date_trunc('month', current_date - interval '19 months')
          )
          and DATE (event.event_timestamp) <= CURRENT_DATE
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
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
            and first_traffic_source = 'Google'
            and e__session_duration > 200
            and (
              first_traffic_source is null
              or first_traffic_source <> 'google'
            )
          )
      ),
      total_conversion_data as (
        select
          count(1) as total_conversion
        from
          target_data
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
            and first_traffic_source = 'Google'
            and e__session_duration > 10
            and (
              first_traffic_source is null
              or first_traffic_source <> 'apple'
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
            and u__user_first_touch_timestamp > 1686532526770
            and e__session_duration > 10
            and (
              first_traffic_source is null
              or first_traffic_source <> 'apple'
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
            EXTRACT(
              epoch
              FROM
                target_data.event_timestamp - touch_point_data_3.event_timestamp
            ) <= cast(200 as bigint)
          )
        where
          touch_point_data_3.event_name <> 'purchase'
          and target_data.event_timestamp >= date_trunc('month', current_date - interval '19 months')
      ),
      touch_point_names as (
        select
          '1_view_item' as origin_name,
          '1_view_item' as custom_touch_point_name
        union all
        select
          '2_add_to_cart' as origin_name,
          '2_add_to_cart' as custom_touch_point_name
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
      p.custom_touch_point_name as "Touch Point Name",
      total_conversion as "Number of Total Conversion",
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
          total_conversion
        from
          total_conversion_data
      ) as c on 1 = 1
      join (
        select
          t_event_name,
          count(1) as attribution_count
        from
          joined_base_data
        group by
          t_event_name
      ) as s on attribution_data.t_event_name = s.t_event_name
      join touch_point_names p on attribution_data.t_event_name = p.origin_name
    `.trim().replace(/ /g, ''));

  });

  test('position model - more events', () => {
    const sql = buildSQLForPositionModel({
      dbName: 'shop',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
                operator: '=',
                value: ['Google'],
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
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
                operator: '=',
                value: ['Google'],
                dataType: MetadataValueType.STRING,
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
                property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
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
                property: 'first_traffic_source',
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
      base_data as (
        select
          event.event_id,
          event.event_name,
          event.event_timestamp,
          event.user_pseudo_id,
          event.user_id,
          event.platform,
          event.geo_country,
          event.custom_parameters._session_duration.value::bigint as e__session_duration,
          event.user_properties._user_first_touch_timestamp.value::bigint as u__user_first_touch_timestamp,
          event.first_traffic_source,
          TO_CHAR(event.event_timestamp, 'YYYY-MM') as month,
          TO_CHAR(
            date_trunc('week', event.event_timestamp),
            'YYYY-MM-DD'
          ) as week,
          TO_CHAR(event.event_timestamp, 'YYYY-MM-DD') as day,
          TO_CHAR(event.event_timestamp, 'YYYY-MM-DD HH24') || '00:00' as hour
        from
          shop.shop.clickstream_event_view_v3 as event
        where
          DATE (event.event_timestamp) >= DATEADD (
            DAY,
            -1,
            date_trunc('month', current_date - interval '19 months')
          )
          and DATE (event.event_timestamp) <= CURRENT_DATE
          and event.event_name in (
            'view_item',
            'add_to_cart',
            'view_cart',
            'check_out',
            'purchase'
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
            and first_traffic_source = 'Google'
            and e__session_duration > 200
            and (
              first_traffic_source is null
              or first_traffic_source <> 'google'
            )
          )
      ),
      total_conversion_data as (
        select
          count(1) as total_conversion
        from
          target_data
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
            and first_traffic_source = 'Google'
            and e__session_duration > 10
            and (
              first_traffic_source is null
              or first_traffic_source <> 'apple'
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
            and u__user_first_touch_timestamp > 1686532526770
            and e__session_duration > 10
            and (
              first_traffic_source is null
              or first_traffic_source <> 'apple'
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
            EXTRACT(
              epoch
              FROM
                target_data.event_timestamp - touch_point_data_3.event_timestamp
            ) <= cast(200 as bigint)
          )
        where
          touch_point_data_3.event_name <> 'purchase'
          and target_data.event_timestamp >= date_trunc('month', current_date - interval '19 months')
      ),
      touch_point_names as (
        select
          '1_view_item' as origin_name,
          '1_view_item' as custom_touch_point_name
        union all
        select
          '2_add_to_cart' as origin_name,
          '2_add_to_cart' as custom_touch_point_name
        union all
        select
          '3_view_cart' as origin_name,
          '3_view_cart' as custom_touch_point_name
        union all
        select
          '4_check_out' as origin_name,
          '4_check_out' as custom_touch_point_name
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
      p.custom_touch_point_name as "Touch Point Name",
      total_conversion as "Number of Total Conversion",
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
          total_conversion
        from
          total_conversion_data
      ) as c on 1 = 1
      join (
        select
          t_event_name,
          count(1) as attribution_count
        from
          joined_base_data
        group by
          t_event_name
      ) as s on attribution_data.t_event_name = s.t_event_name
      join touch_point_names p on attribution_data.t_event_name = p.origin_name
    `.trim().replace(/ /g, ''));

  });

  test('last touch model - event count - relative data range', () => {
    const sql = buildSQLForSinglePointModel({
      dbName: 'shop',
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.EVENT_CNT,
      timeWindowType: ExploreAttributionTimeWindowType.CUSTOMIZE,
      timeWindowInSeconds: 7 * 24 * 60 * 60,
      globalEventCondition: {
        conditions: [
          {
            category: ConditionCategory.EVENT_OUTER,
            property: 'platform',
            operator: '=',
            value: ['Android'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.EVENT_OUTER,
            property: 'geo_country',
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
            property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
                operator: '=',
                value: ['Google'],
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
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
                operator: '=',
                value: ['Google'],
                dataType: MetadataValueType.STRING,
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
                property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
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
                property: 'first_traffic_source',
                operator: '<>',
                value: ['apple'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
      ],
      modelType: AttributionModelType.LAST_TOUCH,
      timeScopeType: ExploreTimeScopeType.RELATIVE,
      lastN: 4,
      timeUnit: ExploreRelativeTimeUnit.WK,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      base_data as (
        select
          event.event_id,
          event.event_name,
          event.event_timestamp,
          event.user_pseudo_id,
          event.user_id,
          event.platform,
          event.geo_country,
          event.custom_parameters._session_duration.value::bigint as e__session_duration,
          event.user_properties._user_first_touch_timestamp.value::bigint as u__user_first_touch_timestamp,
          event.first_traffic_source,
          TO_CHAR(event.event_timestamp, 'YYYY-MM') as month,
          TO_CHAR(
            date_trunc('week', event.event_timestamp),
            'YYYY-MM-DD'
          ) as week,
          TO_CHAR(event.event_timestamp, 'YYYY-MM-DD') as day,
          TO_CHAR(event.event_timestamp, 'YYYY-MM-DD HH24') || '00:00' as hour
        from
          shop.shop.clickstream_event_view_v3 as event
        where
          DATE (event.event_timestamp) >= DATEADD (
            DAY,
            -7,
            date_trunc('week', current_date - interval '3 weeks')
          )
          and DATE (event.event_timestamp) <= CURRENT_DATE
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
          and (
            platform = 'Android'
            and geo_country = 'China'
            and u__user_first_touch_timestamp > 1686532526770
            and (
              first_traffic_source is null
              or first_traffic_source <> 'google'
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
            and first_traffic_source = 'Google'
            and e__session_duration > 200
            and (
              first_traffic_source is null
              or first_traffic_source <> 'google'
            )
          )
      ),
      total_conversion_data as (
        select
          count(1) as total_conversion
        from
          target_data
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
            and first_traffic_source = 'Google'
            and e__session_duration > 10
            and (
              first_traffic_source is null
              or first_traffic_source <> 'apple'
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
            and u__user_first_touch_timestamp > 1686532526770
            and e__session_duration > 10
            and (
              first_traffic_source is null
              or first_traffic_source <> 'apple'
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
            EXTRACT(
              epoch
              FROM
                target_data.event_timestamp - touch_point_data_3.event_timestamp
            ) <= cast(604800 as bigint)
          )
        where
          touch_point_data_3.event_name <> 'purchase'
          and target_data.event_timestamp >= date_trunc('week', current_date - interval '3 weeks')
      ),
      touch_point_names as (
        select
          '1_view_item' as origin_name,
          '1_view_item' as custom_touch_point_name
        union all
        select
          '2_add_to_cart' as origin_name,
          '2_add_to_cart' as custom_touch_point_name
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
      p.custom_touch_point_name as "Touch Point Name",
      total_conversion as "Number of Total Conversion",
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
          total_conversion
        from
          total_conversion_data
      ) as c on 1 = 1
      join (
        select
          t_event_name,
          count(1) as attribution_count
        from
          joined_base_data
        group by
          t_event_name
      ) as s on attribution_data.t_event_name = s.t_event_name
      join touch_point_names p on attribution_data.t_event_name = p.origin_name
    `.trim().replace(/ /g, ''));

  });

  test('last touch model - event count - custom touch point name', () => {
    const sql = buildSQLForSinglePointModel({
      dbName: 'shop',
      schemaName: 'shop',
      touchPointNames: ['1_test_name', ''],
      computeMethod: ExploreComputeMethod.EVENT_CNT,
      timeWindowType: ExploreAttributionTimeWindowType.CUSTOMIZE,
      timeWindowInSeconds: 7 * 24 * 60 * 60,
      globalEventCondition: {
        conditions: [
          {
            category: ConditionCategory.EVENT_OUTER,
            property: 'platform',
            operator: '=',
            value: ['Android'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.EVENT_OUTER,
            property: 'geo_country',
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
            property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
                operator: '=',
                value: ['Google'],
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
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
                operator: '=',
                value: ['Google'],
                dataType: MetadataValueType.STRING,
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
                property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
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
                property: 'first_traffic_source',
                operator: '<>',
                value: ['apple'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
      ],
      modelType: AttributionModelType.LAST_TOUCH,
      timeScopeType: ExploreTimeScopeType.RELATIVE,
      lastN: 4,
      timeUnit: ExploreRelativeTimeUnit.WK,
    });

    expect(sql.trim().replace(/ /g, '')).toEqual(`
    with
      base_data as (
        select
          event.event_id,
          event.event_name,
          event.event_timestamp,
          event.user_pseudo_id,
          event.user_id,
          event.platform,
          event.geo_country,
          event.custom_parameters._session_duration.value::bigint as e__session_duration,
          event.user_properties._user_first_touch_timestamp.value::bigint as u__user_first_touch_timestamp,
          event.first_traffic_source,
          TO_CHAR(event.event_timestamp, 'YYYY-MM') as month,
          TO_CHAR(
            date_trunc('week', event.event_timestamp),
            'YYYY-MM-DD'
          ) as week,
          TO_CHAR(event.event_timestamp, 'YYYY-MM-DD') as day,
          TO_CHAR(event.event_timestamp, 'YYYY-MM-DD HH24') || '00:00' as hour
        from
          shop.shop.clickstream_event_view_v3 as event
        where
          DATE (event.event_timestamp) >= DATEADD (
            DAY,
            -7,
            date_trunc('week', current_date - interval '3 weeks')
          )
          and DATE (event.event_timestamp) <= CURRENT_DATE
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
          and (
            platform = 'Android'
            and geo_country = 'China'
            and u__user_first_touch_timestamp > 1686532526770
            and (
              first_traffic_source is null
              or first_traffic_source <> 'google'
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
            and first_traffic_source = 'Google'
            and e__session_duration > 200
            and (
              first_traffic_source is null
              or first_traffic_source <> 'google'
            )
          )
      ),
      total_conversion_data as (
        select
          count(1) as total_conversion
        from
          target_data
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
            and first_traffic_source = 'Google'
            and e__session_duration > 10
            and (
              first_traffic_source is null
              or first_traffic_source <> 'apple'
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
            and u__user_first_touch_timestamp > 1686532526770
            and e__session_duration > 10
            and (
              first_traffic_source is null
              or first_traffic_source <> 'apple'
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
            EXTRACT(
              epoch
              FROM
                target_data.event_timestamp - touch_point_data_3.event_timestamp
            ) <= cast(604800 as bigint)
          )
        where
          touch_point_data_3.event_name <> 'purchase'
          and target_data.event_timestamp >= date_trunc('week', current_date - interval '3 weeks')
      ),
      touch_point_names as (
        select
          '1_view_item' as origin_name,
          '1_test_name' as custom_touch_point_name
        union all
        select
          '2_add_to_cart' as origin_name,
          '2_add_to_cart' as custom_touch_point_name
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
      p.custom_touch_point_name as "Touch Point Name",
      total_conversion as "Number of Total Conversion",
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
          total_conversion
        from
          total_conversion_data
      ) as c on 1 = 1
      join (
        select
          t_event_name,
          count(1) as attribution_count
        from
          joined_base_data
        group by
          t_event_name
      ) as s on attribution_data.t_event_name = s.t_event_name
      join touch_point_names p on attribution_data.t_event_name = p.origin_name
    `.trim().replace(/ /g, ''));

  });

  test('position model - more events - partial touch point names', () => {
    const sql = buildSQLForPositionModel({
      dbName: 'shop',
      schemaName: 'shop',
      touchPointNames: ['1_test_name', '2_test_name'],
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
                operator: '=',
                value: ['Google'],
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
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
                operator: '=',
                value: ['Google'],
                dataType: MetadataValueType.STRING,
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
                property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
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
                property: 'first_traffic_source',
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
          eventName: 'begin_checkout',
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
      base_data as (
        select
          event.event_id,
          event.event_name,
          event.event_timestamp,
          event.user_pseudo_id,
          event.user_id,
          event.platform,
          event.geo_country,
          event.custom_parameters._session_duration.value::bigint as e__session_duration,
          event.user_properties._user_first_touch_timestamp.value::bigint as u__user_first_touch_timestamp,
          event.first_traffic_source,
          TO_CHAR(event.event_timestamp, 'YYYY-MM') as month,
          TO_CHAR(
            date_trunc('week', event.event_timestamp),
            'YYYY-MM-DD'
          ) as week,
          TO_CHAR(event.event_timestamp, 'YYYY-MM-DD') as day,
          TO_CHAR(event.event_timestamp, 'YYYY-MM-DD HH24') || '00:00' as hour
        from
          shop.shop.clickstream_event_view_v3 as event
        where
          DATE (event.event_timestamp) >= DATEADD (
            DAY,
            -1,
            date_trunc('month', current_date - interval '19 months')
          )
          and DATE (event.event_timestamp) <= CURRENT_DATE
          and event.event_name in (
            'view_item',
            'add_to_cart',
            'view_cart',
            'begin_checkout',
            'purchase'
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
            and first_traffic_source = 'Google'
            and e__session_duration > 200
            and (
              first_traffic_source is null
              or first_traffic_source <> 'google'
            )
          )
      ),
      total_conversion_data as (
        select
          count(1) as total_conversion
        from
          target_data
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
            and first_traffic_source = 'Google'
            and e__session_duration > 10
            and (
              first_traffic_source is null
              or first_traffic_source <> 'apple'
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
            and u__user_first_touch_timestamp > 1686532526770
            and e__session_duration > 10
            and (
              first_traffic_source is null
              or first_traffic_source <> 'apple'
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
          event_name = 'begin_checkout'
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
            EXTRACT(
              epoch
              FROM
                target_data.event_timestamp - touch_point_data_3.event_timestamp
            ) <= cast(200 as bigint)
          )
        where
          touch_point_data_3.event_name <> 'purchase'
          and target_data.event_timestamp >= date_trunc('month', current_date - interval '19 months')
      ),
      touch_point_names as (
        select
          '1_view_item' as origin_name,
          '1_test_name' as custom_touch_point_name
        union all
        select
          '2_add_to_cart' as origin_name,
          '2_test_name' as custom_touch_point_name
        union all
        select
          '3_view_cart' as origin_name,
          '3_view_cart' as custom_touch_point_name
        union all
        select
          '4_begin_checkout' as origin_name,
          '4_begin_checkout' as custom_touch_point_name
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
      p.custom_touch_point_name as "Touch Point Name",
      total_conversion as "Number of Total Conversion",
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
          total_conversion
        from
          total_conversion_data
      ) as c on 1 = 1
      join (
        select
          t_event_name,
          count(1) as attribution_count
        from
          joined_base_data
        group by
          t_event_name
      ) as s on attribution_data.t_event_name = s.t_event_name
      join touch_point_names p on attribution_data.t_event_name = p.origin_name
    `.trim().replace(/ /g, ''));

  });

  test('special char \'', () => {
    const sql = buildSQLForSinglePointModel({
      dbName: 'shop',
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.EVENT_CNT,
      timeWindowType: ExploreAttributionTimeWindowType.CURRENT_DAY,
      globalEventCondition: {
        conditions: [
          {
            category: ConditionCategory.EVENT_OUTER,
            property: 'platform',
            operator: '=',
            value: ['Android\'\''],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.EVENT_OUTER,
            property: 'geo_country',
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
            property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android\'\''],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
                operator: '=',
                value: ['Google'],
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
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
                operator: '=',
                value: ['China\'\''],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: 'first_traffic_source',
                operator: '=',
                value: ['Google'],
                dataType: MetadataValueType.STRING,
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
                property: 'first_traffic_source',
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
                category: ConditionCategory.EVENT_OUTER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.EVENT_OUTER,
                property: 'geo_country',
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
                property: 'first_traffic_source',
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
      base_data as (
        select
          event.event_id,
          event.event_name,
          event.event_timestamp,
          event.user_pseudo_id,
          event.user_id,
          event.platform,
          event.geo_country,
          event.custom_parameters._session_duration.value::bigint as e__session_duration,
          event.user_properties._user_first_touch_timestamp.value::bigint as u__user_first_touch_timestamp,
          event.first_traffic_source,
          TO_CHAR(event.event_timestamp, 'YYYY-MM') as month,
          TO_CHAR(
            date_trunc('week', event.event_timestamp),
            'YYYY-MM-DD'
          ) as week,
          TO_CHAR(event.event_timestamp, 'YYYY-MM-DD') as day,
          TO_CHAR(event.event_timestamp, 'YYYY-MM-DD HH24') || '00:00' as hour
        from
          shop.shop.clickstream_event_view_v3 as event
        where
          DATE (event.event_timestamp) >= date '2023-10-01'
          and DATE (event.event_timestamp) <= date '2025-10-10'
          and event.event_name in ('view_item', 'add_to_cart', 'purchase')
          and (
            platform = 'Android'''
            and geo_country = 'China'
            and u__user_first_touch_timestamp > 1686532526770
            and (
              first_traffic_source is null
              or first_traffic_source <> 'google'
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
            platform = 'Android'''
            and geo_country = 'China'
            and first_traffic_source = 'Google'
            and e__session_duration > 200
            and (
              first_traffic_source is null
              or first_traffic_source <> 'google'
            )
          )
      ),
      total_conversion_data as (
        select
          count(1) as total_conversion
        from
          target_data
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
            and geo_country = 'China'''
            and first_traffic_source = 'Google'
            and e__session_duration > 10
            and (
              first_traffic_source is null
              or first_traffic_source <> 'apple'
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
            and u__user_first_touch_timestamp > 1686532526770
            and e__session_duration > 10
            and (
              first_traffic_source is null
              or first_traffic_source <> 'apple'
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
          and TO_CHAR(target_data.event_timestamp, 'YYYY-MM-DD') = TO_CHAR(touch_point_data_3.event_timestamp, 'YYYY-MM-DD')
        where
          touch_point_data_3.event_name <> 'purchase'
          and target_data.event_timestamp >= date '2023-10-01'
      ),
      touch_point_names as (
        select
          '1_view_item' as origin_name,
          '1_view_item' as custom_touch_point_name
        union all
        select
          '2_add_to_cart' as origin_name,
          '2_add_to_cart' as custom_touch_point_name
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
      p.custom_touch_point_name as "Touch Point Name",
      total_conversion as "Number of Total Conversion",
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
          total_conversion
        from
          total_conversion_data
      ) as c on 1 = 1
      join (
        select
          t_event_name,
          count(1) as attribution_count
        from
          joined_base_data
        group by
          t_event_name
      ) as s on attribution_data.t_event_name = s.t_event_name
      join touch_point_names p on attribution_data.t_event_name = p.origin_name
    `.trim().replace(/ /g, ''));

  });

});