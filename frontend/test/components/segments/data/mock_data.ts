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

import { SelectProps } from '@cloudscape-design/components';
import { ExploreAnalyticsOperators } from 'ts/explore-types';

export const MOCK_EVENT_LIST: any = [
  {
    categoryName: '预置事件',
    categoryType: 'event',
    itemList: [
      {
        label: '应用可见',
        name: '_app_start',
        value: 'test003_paqf#shopping#_app_start',
        description: '每次App变为可见时',
        metadataSource: 'Preset',
        platform: ['Android', 'Web', 'iOS'],
        modifyTime: '2024-03-10 19:21:58',
      },
      {
        label: '页面滚动',
        name: '_scroll',
        value: 'test003_paqf#shopping#_scroll',
        description: '用户第一次到达每个页面的底部时',
        metadataSource: 'Preset',
        platform: ['Android', 'Web', 'iOS'],
        modifyTime: '2024-03-10 19:21:58',
      },
    ],
  },
  {
    categoryName: '自定义事件',
    categoryType: 'event',
    itemList: [
      {
        label: 'view_item',
        name: 'view_item',
        value: 'test003_paqf#shopping#view_item',
        description: '',
        metadataSource: 'Custom',
        platform: ['Android', 'Web', 'iOS'],
        modifyTime: '2024-03-10 19:21:58',
      },
      {
        label: 'purchase',
        name: 'purchase',
        value: 'test003_paqf#shopping#purchase',
        description: '',
        metadataSource: 'Custom',
        platform: ['Android', 'Web', 'iOS'],
        modifyTime: '2024-03-10 19:21:58',
      },
    ],
  },
];

export const PRESET_PARAMETERS: any = [
  {
    categoryName: '公共事件参数',
    categoryType: 'attribute',
    itemList: [
      {
        label: '事件时间戳',
        name: 'event_timestamp',
        value: 'new1203_mggt#app1#other#event_timestamp#int',
        description: '客户端上记录事件的时间（以微秒为单位，UTC）',
        metadataSource: 'Preset',
        valueType: 'int',
        category: 'other',
        platform: [],
        values: [],
        modifyTime: '-',
      },
      {
        label: '事件价值（USD）',
        name: 'event_value_in_usd',
        value: 'new1203_mggt#app1#other#event_value_in_usd#float',
        description: '事件的“值”参数的货币转换值（以USD为单位）',
        metadataSource: 'Preset',
        valueType: 'float',
        category: 'other',
        platform: [],
        values: [],
        modifyTime: '-',
      },
    ],
  },
  {
    categoryName: '用户属性',
    categoryType: 'attribute',
    itemList: [
      {
        label: '用户ID',
        name: '_user_id',
        value: 'new1203_mggt#app1#user#_user_id#string',
        description:
          '通过 setUserId(）API分配给用户的唯一ID,通常是您业务系统的用户ID',
        metadataSource: 'Preset',
        valueType: 'string',
        category: 'user',
        values: [],
        modifyTime: '2024-03-05 10:27:03',
      },
      {
        label: '首次访问时间戳',
        name: '_user_first_touch_timestamp',
        value: 'new1203_mggt#app1#user#_user_first_touch_timestamp#int',
        description:
          '用户首次打开应用程序或访问站点的时间（以毫秒为单位），每个事件的 user 对象的都包含此属性',
        metadataSource: 'Preset',
        valueType: 'int',
        category: 'user',
        values: [],
        modifyTime: '2024-03-05 10:27:03',
      },
    ],
  },
];

export const MULTI_LEVEL_SELECT_OPTIONS: any = [
  {
    value: 'EVENT_CNT',
    label: '总次数',
  },
  {
    label: '按照...求和 (SUM)',
    value: 'SUM_VALUE',
    subList: [
      {
        value: '_session_start_timestamp',
        label: '会话开始时间戳',
        name: '_session_start_timestamp',
        valueType: 'int',
        category: 'event',
        groupName: 'SUM_VALUE',
        itemType: 'children',
      },
      {
        value: 'event_value_in_usd',
        label: '事件价值（USD）',
        name: 'event_value_in_usd',
        valueType: 'float',
        category: 'other',
        groupName: 'SUM_VALUE',
        itemType: 'children',
      },
    ],
  },
];

export const ANALYTICS_OPERATORS = {
  grater_than: {
    value: ExploreAnalyticsOperators.GREATER_THAN,
    label: 'analytics:operators.greaterThan',
  },
  is_null: {
    value: ExploreAnalyticsOperators.NULL,
    label: 'analytics:operators.null',
  },
  is_not_null: {
    value: ExploreAnalyticsOperators.NOT_NULL,
    label: 'analytics:operators.notNull',
  },
  equal: {
    value: ExploreAnalyticsOperators.EQUAL,
    label: 'analytics:operators.equal',
  },
  not_equal: {
    value: ExploreAnalyticsOperators.NOT_EQUAL,
    label: 'analytics:operators.notEqual',
  },
  greater_than: {
    value: ExploreAnalyticsOperators.GREATER_THAN,
    label: 'analytics:operators.greaterThan',
  },
  greater_than_or_equal: {
    value: ExploreAnalyticsOperators.GREATER_THAN_OR_EQUAL,
    label: 'analytics:operators.greaterThanOrEqual',
  },
  less_than: {
    value: ExploreAnalyticsOperators.LESS_THAN,
    label: 'analytics:operators.lessThan',
  },
  less_than_or_equal: {
    value: ExploreAnalyticsOperators.LESS_THAN_OR_EQUAL,
    label: 'analytics:operators.lessThanOrEqual',
  },
  in: {
    value: ExploreAnalyticsOperators.IN,
    label: 'analytics:operators.in',
  },
  not_in: {
    value: ExploreAnalyticsOperators.NOT_IN,
    label: 'analytics:operators.notIn',
  },
  contains: {
    value: ExploreAnalyticsOperators.CONTAINS,
    label: 'analytics:operators.contains',
  },
  not_contains: {
    value: ExploreAnalyticsOperators.NOT_CONTAINS,
    label: 'analytics:operators.notContains',
  },
};

export const CONDITION_STRING_OPERATORS: SelectProps.Options = [
  ANALYTICS_OPERATORS.grater_than,
  ANALYTICS_OPERATORS.is_null,
  ANALYTICS_OPERATORS.is_not_null,
  ANALYTICS_OPERATORS.equal,
  ANALYTICS_OPERATORS.not_equal,
  ANALYTICS_OPERATORS.in,
  ANALYTICS_OPERATORS.not_in,
  ANALYTICS_OPERATORS.contains,
  ANALYTICS_OPERATORS.not_contains,
];

export const FILTER_GROUP_LIST = [
  {
    label: '用户分群组一',
    value: 'user_group_1',
  },
  {
    label: '用户分群组二',
    value: 'user_group_2',
  },
  {
    label: '用户分群组三',
    value: 'user_group_3',
  },
];
