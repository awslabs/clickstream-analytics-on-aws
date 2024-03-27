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

import { ExploreAnalyticsOperators } from '@aws/clickstream-base-lib';
import { SelectProps } from '@cloudscape-design/components';

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

// Mock data for analytics events
export const mockSegmentsList = {
  success: true,
  data: [{ segmentId: '1', name: 'Segment 1' }],
};

export const mockEventListData = {
  success: true,
  data: {
    totalCount: 1,
    items: [
      {
        id: 'test_magic_project_gpvz#shopping#_app_exception',
        month: 'latest',
        prefix: 'EVENT#test_magic_project_gpvz#shopping',
        projectId: 'test_magic_project_gpvz',
        appId: 'shopping',
        name: '_app_exception',
        hasData: true,
        platform: ['Android', 'iOS'],
        sdkVersion: ['0.4.0', '0.2.0'],
        sdkName: ['aws-solution-clickstream-sdk'],
        dataVolumeLastDay: 3,
        associatedParameters: [],
        displayName: {
          'zh-CN': '应用异常',
          'en-US': 'App exception',
        },
        description: {
          'zh-CN': '当应用程序崩溃时',
          'en-US': 'When the app crashes',
        },
        metadataSource: 'Preset',
      },
    ],
  },
};

export const mockBuiltInData = {
  success: true,
  data: {
    PresetEventParameters: [],
    PresetEvents: [],
    PresetUserAttributes: [],
    PublicEventParameters: [],
  },
};

export const mockAttributeListData = {
  success: true,
  data: {
    totalCount: 1,
    items: [
      {
        id: 'test_magic_project_gpvz#shopping#event#_screen_id#string',
        month: 'latest',
        prefix: 'EVENT_PARAMETER#test_magic_project_gpvz#shopping',
        projectId: 'test_magic_project_gpvz',
        appId: 'shopping',
        name: '_screen_id',
        eventName: '',
        platform: ['Android', 'iOS'],
        category: 'event',
        valueType: 'string',
        eventNames: [
          'product_exposure',
          '_screen_view',
          '_user_engagement',
          'search',
          'view_cart',
        ],
        associatedEvents: [],
        displayName: {
          'zh-CN': '屏幕ID',
          'en-US': 'Screen ID',
        },
        description: {
          'zh-CN': '屏幕ID',
          'en-US': 'The screen ID',
        },
        metadataSource: 'Preset',
        parameterType: 'Private',
        values: [
          {
            value: 'com.example.shopping.SplashActivity',
            displayValue: 'com.example.shopping.SplashActivity',
          },
          {
            value: 'com.example.shopping.MainVC',
            displayValue: 'com.example.shopping.MainVC',
          },
        ],
      },
    ],
  },
};

export const mockUserAttributeListData = {
  success: true,
  data: {
    totalCount: 1,
    items: [
      {
        id: 'test_magic_project_gpvz#shopping#user#age#int',
        month: 'latest',
        prefix: 'USER_ATTRIBUTE#test_magic_project_gpvz#shopping',
        projectId: 'test_magic_project_gpvz',
        appId: 'shopping',
        name: 'age',
        platform: ['Android', 'iOS'],
        valueType: 'int',
        displayName: {
          'zh-CN': '年龄',
          'en-US': 'Age',
        },
        description: {
          'zh-CN': '用户年龄',
          'en-US': 'The age of the user',
        },
        metadataSource: 'Preset',
        parameterType: 'Private',
      },
    ],
  },
};

export const mockUIData: any = {
  filterGroupRelationShip: 'and',
  subItemList: [
    {
      userEventType: null,
      segmentEventRelationShip: 'and',
      userDoneEventConditionList: [],
      sequenceEventList: [],
      subItemList: [
        {
          userEventType: {
            label: 'analytics:segment.type.userDone',
            value: 'USER_DONE',
          },
          subItemList: [],
          userDoneEventConditionList: [
            {
              eventType: 'attribute',
              conditionOption: {
                label: '操作系统语言',
                name: 'system_language',
                value:
                  'test_magic_project_gpvz#shopping#device#system_language#string',
                description: '操作系统的语言',
                metadataSource: 'Preset',
                valueType: 'string',
                category: 'device',
                platform: ['Android', 'iOS', 'Web'],
                modifyTime: '-',
              },
              conditionOperator: {
                value: 'in',
                label: '在其中',
              },
              conditionValue: ['de'],
            },
          ],
          sequenceEventList: [],
          userDoneEventError: '',
          userDoneEvent: {
            label: '页面浏览',
            name: '_page_view',
            value: 'test_magic_project_gpvz#shopping#_page_view',
            description: '当新的网站页面打开时',
            metadataSource: 'Preset',
            platform: ['Web'],
            modifyTime: '2024-03-25 11:28:51',
          },
          userDoneEventCalculateMethod: {
            value: 'NUMBER_OF_TOTAL',
            label: '总次数 (PV)',
          },
          eventConditionRelationShip: 'and',
          userDoneEventOperatorError: '',
          userDoneEventOperation: {
            label: '=',
            value: '=',
          },
          userDoneEventValueError: '',
          userDoneEventValue: ['12', ''],
        },
        {
          userEventType: null,
          segmentEventRelationShip: 'or',
          userDoneEventConditionList: [],
          sequenceEventList: [],
          subItemList: [
            {
              userEventType: {
                label: '用户没做过',
                value: 'USER_NOT_DONE',
              },
              subItemList: [],
              userDoneEventConditionList: [],
              sequenceEventList: [],
              userDoneEventError: '',
              userDoneEventOperatorError: '',
              userDoneEventValueError: '',
              groupEmptyError: '',
              userSequenceSession: null,
              userSequenceFlow: null,
              userDoneEvent: {
                label: '应用可见',
                name: '_app_start',
                value: 'test_magic_project_gpvz#shopping#_app_start',
                description: '每次App变为可见时',
                metadataSource: 'Preset',
                platform: ['Android', 'Web', 'iOS'],
                modifyTime: '2024-03-25 11:28:51',
              },
              userDoneEventCalculateMethod: {
                value: '_user_first_touch_timestamp',
                label: '按首次访问时间戳求平均值 (SUM/PV)',
                name: '_user_first_touch_timestamp',
                valueType: 'int',
                category: 'user',
                groupName: 'AVG_OF_EVENT_PARAMETER',
                metadataSource: 'Preset',
                itemType: 'children',
              },
              userDoneEventOperation: {
                label: '<',
                value: '<',
              },
              userDoneEventValue: ['12', ''],
            },
            {
              userEventType: {
                label: 'analytics:segment.type.userDone',
                value: 'USER_DONE',
              },
              subItemList: [],
              userDoneEventConditionList: [
                {
                  eventType: 'attribute',
                  conditionOption: {
                    label: '时差',
                    name: 'time_zone_offset_seconds',
                    value:
                      'test_magic_project_gpvz#shopping#device#time_zone_offset_seconds#int',
                    description: '与 GMT 的偏移量（以秒为单位）',
                    metadataSource: 'Preset',
                    valueType: 'int',
                    category: 'device',
                    platform: ['Android', 'Web', 'iOS'],
                    modifyTime: '-',
                  },
                  conditionOperator: {
                    value: '<=',
                    label: '<=',
                  },
                  conditionValue: ['-14400'],
                },
                {
                  eventType: 'attribute',
                  conditionOption: {
                    label: '应用程序版本',
                    name: 'version',
                    value:
                      'test_magic_project_gpvz#shopping#app_info#version#string',
                    description: '应用程序的版本号',
                    metadataSource: 'Preset',
                    valueType: 'string',
                    category: 'app_info',
                    platform: ['Android', 'iOS'],
                    modifyTime: '-',
                  },
                  conditionOperator: {
                    value: 'contains',
                    label: '包含',
                  },
                  conditionValue: ['2.5.0'],
                },
              ],
              sequenceEventList: [],
              userDoneEventError: '',
              userDoneEvent: {
                label: '用户互动',
                name: '_user_engagement',
                value: 'test_magic_project_gpvz#shopping#_user_engagement',
                description:
                  '用户互动事件记录用户聚焦在Web/App 页面在前台时的时间（至少 1 秒）',
                metadataSource: 'Preset',
                platform: ['Android', 'Web', 'iOS'],
                modifyTime: '2024-03-25 11:28:51',
              },
              userDoneEventCalculateMethod: {
                value: 'viewport_height',
                label: '按视区高度求平均值 (SUM/PV)',
                name: 'viewport_height',
                valueType: 'int',
                category: 'device',
                groupName: 'AVG_OF_EVENT_PARAMETER',
                metadataSource: 'Preset',
                itemType: 'children',
              },
              userDoneEventOperatorError: '',
              userDoneEventOperation: {
                label: '范围',
                value: 'between',
              },
              userDoneEventValueError: '',
              userDoneEventValue: ['1', '2'],
              eventConditionRelationShip: 'or',
            },
          ],
        },
        {
          userEventType: {
            label: '用户依次做过',
            value: 'USER_DONE_IN_SEQUENCE',
          },
          subItemList: [],
          userDoneEventConditionList: [],
          sequenceEventList: [
            {
              name: '',
              sequenceEventConditionFilterList: [
                {
                  eventType: 'attribute',
                  conditionOption: {
                    label: '用户ID',
                    name: '_user_id',
                    value:
                      'test_magic_project_gpvz#shopping#user#_user_id#string',
                    description:
                      '通过 setUserId(）API分配给用户的唯一ID,通常是您业务系统的用户ID',
                    metadataSource: 'Preset',
                    valueType: 'string',
                    category: 'user',
                    modifyTime: '2024-03-25 11:39:29',
                  },
                  conditionOperator: {
                    value: '=',
                    label: '=',
                  },
                  conditionValue: ['12'],
                },
                {
                  eventType: 'attribute',
                  conditionOption: {
                    label: '首次访问时间戳',
                    name: '_user_first_touch_timestamp',
                    value:
                      'test_magic_project_gpvz#shopping#user#_user_first_touch_timestamp#int',
                    description:
                      '用户首次打开应用程序或访问站点的时间（以毫秒为单位），每个事件的 user 对象的都包含此属性',
                    metadataSource: 'Preset',
                    valueType: 'int',
                    category: 'user',
                    modifyTime: '2024-03-25 11:39:29',
                  },
                  conditionOperator: {
                    value: '<=',
                    label: '<=',
                  },
                  conditionValue: ['122'],
                },
              ],
              seqEventEmptyError: '',
              sequenceEventOption: {
                label: '用户属性设置',
                name: '_profile_set',
                value: 'test_magic_project_gpvz#shopping#_profile_set',
                description: '当调用 addUserAttributes() 或 setUserId() API 时',
                metadataSource: 'Preset',
                platform: ['Android', 'Web', 'iOS'],
                modifyTime: '2024-03-25 11:28:51',
              },
              filterGroupRelationShip: 'and',
            },
          ],
          userDoneEventError: '',
          userDoneEventOperatorError: '',
          userDoneEventValueError: '',
          groupEmptyError: '',
          userSequenceSession: {
            label: '在同一个会话',
            value: 'true',
          },
          userSequenceFlow: {
            label: '直接关联',
            value: 'true',
          },
        },
        {
          userEventType: {
            label: '用户是',
            value: 'USER_IS',
          },
          subItemList: [],
          userDoneEventConditionList: [],
          sequenceEventList: [],
          userDoneEventError: '',
          userDoneEvent: {
            label: '页面浏览',
            name: '_page_view',
            value: 'test_magic_project_gpvz#shopping#_page_view',
            description: '当新的网站页面打开时',
            metadataSource: 'Preset',
            platform: ['Web'],
            modifyTime: '2024-03-25 11:28:51',
          },
          userDoneEventCalculateMethod: {
            value: 'NUMBER_OF_TOTAL',
            label: '总次数 (PV)',
          },
          userDoneEventOperatorError: '',
          userDoneEventValueError: '',
          groupEmptyError: '',
          userSequenceSession: null,
          userSequenceFlow: null,
          userIsParamOption: {
            label: '首次访问流量媒介',
            name: '_first_traffic_medium',
            value:
              'test_magic_project_gpvz#shopping#user_outer#_first_traffic_medium#string',
            description: '第一个捕获的流量媒介',
            metadataSource: 'Preset',
            valueType: 'string',
            category: 'user_outer',
            modifyTime: '2024-03-25 11:29:59',
          },
          userIsValue: ['12'],
          userISOperator: {
            value: 'contains',
            label: '包含',
          },
        },
      ],
      groupDateRange: {
        value: {
          key: 'previous-6-months',
          amount: 6,
          unit: 'month',
          type: 'relative',
        },
      },
      groupName: 'test',
    },
    {
      userEventType: null,
      segmentEventRelationShip: 'and',
      userDoneEventConditionList: [],
      sequenceEventList: [],
      subItemList: [
        {
          userEventType: {
            label: 'analytics:segment.type.userDone',
            value: 'USER_DONE',
          },
          subItemList: [],
          userDoneEventConditionList: [],
          sequenceEventList: [],
          userDoneEventError: '',
          userDoneEvent: {
            label: '用户互动',
            name: '_user_engagement',
            value: 'test_magic_project_gpvz#shopping#_user_engagement',
            description:
              '用户互动事件记录用户聚焦在Web/App 页面在前台时的时间（至少 1 秒）',
            metadataSource: 'Preset',
            platform: ['Android', 'Web', 'iOS'],
            modifyTime: '2024-03-25 11:28:51',
          },
          userDoneEventCalculateMethod: {
            value: 'NUMBER_OF_TOTAL',
            label: '总次数 (PV)',
          },
          userDoneEventOperatorError: '',
          userDoneEventOperation: {
            label: '<=',
            value: '<=',
          },
          userDoneEventValueError: '',
          userDoneEventValue: ['12', ''],
        },
        {
          userEventType: {
            label: '用户不在分群组',
            value: 'USER_NOT_IN_GROUP',
          },
          subItemList: [],
          userDoneEventConditionList: [],
          sequenceEventList: [],
          userDoneEventError: '',
          userDoneEventOperatorError: '',
          userDoneEventValueError: '',
          groupEmptyError: '',
          userSequenceSession: null,
          userSequenceFlow: null,
          userInFilterGroup: {
            label: 'hello world',
            value: '5ce7ccf7-41b3-4f68-8e24-719367b1fc29',
          },
        },
      ],
      groupDateRange: {
        value: {
          type: 'absolute',
          startDate: '2024-03-01T00:00:00+08:00',
          endDate: '2024-04-30T23:59:59+08:00',
        },
      },
      groupName: 'test',
    },
  ],
  attributeOperationOptions: [],
  eventSessionOptions: [
    {
      label: '在同一个会话',
      value: 'true',
    },
    {
      label: '不在同一个会话',
      value: 'false',
    },
  ],
  eventFlowOptions: [
    {
      label: '直接关联',
      value: 'true',
    },
    {
      label: '间接关联',
      value: 'false',
    },
  ],
};

export const mockAPIData = {
  filterGroups: [
    {
      description: 'test',
      isRelativeDateRange: true,
      timeUnit: 'month',
      lastN: 6,
      filters: [
        {
          conditions: [
            {
              conditionType: 'UserEventCondition',
              hasDone: true,
              event: {
                eventName: '_page_view',
                eventParameterConditions: [
                  {
                    parameterType: 'Preset',
                    parameterName: 'system_language',
                    conditionOperator: 'in',
                    inputValue: ['de'],
                    dataType: 'string',
                  },
                ],
                operator: 'and',
              },
              metricCondition: {
                metricType: 'NUMBER_OF_TOTAL',
                conditionOperator: '=',
                inputValue: [12, 0],
                dataType: 'int',
              },
            },
          ],
          operator: 'or',
        },
        {
          conditions: [
            {
              conditionType: 'UserEventCondition',
              hasDone: false,
              event: {
                eventName: '_app_start',
                eventParameterConditions: [],
              },
              metricCondition: {
                metricType: 'AVG_OF_EVENT_PARAMETER',
                conditionOperator: '<',
                inputValue: [12, 0],
                parameterType: 'Preset',
                parameterName: '_user_first_touch_timestamp',
                dataType: 'int',
              },
            },
            {
              conditionType: 'UserEventCondition',
              hasDone: true,
              event: {
                eventName: '_user_engagement',
                eventParameterConditions: [
                  {
                    parameterType: 'Preset',
                    parameterName: 'time_zone_offset_seconds',
                    conditionOperator: '<=',
                    inputValue: ['-14400'],
                    dataType: 'int',
                  },
                  {
                    parameterType: 'Preset',
                    parameterName: 'version',
                    conditionOperator: 'contains',
                    inputValue: ['2.5.0'],
                    dataType: 'string',
                  },
                ],
                operator: 'or',
              },
              metricCondition: {
                metricType: 'AVG_OF_EVENT_PARAMETER',
                conditionOperator: 'between',
                inputValue: [1, 2],
                parameterType: 'Preset',
                parameterName: 'viewport_height',
                dataType: 'int',
              },
            },
          ],
          operator: 'or',
        },
        {
          conditions: [
            {
              conditionType: 'EventsInSequenceCondition',
              hasDone: true,
              events: [
                {
                  eventName: '_profile_set',
                  eventParameterConditions: [
                    {
                      parameterType: 'Preset',
                      parameterName: '_user_id',
                      conditionOperator: '=',
                      inputValue: ['12'],
                      dataType: 'string',
                    },
                    {
                      parameterType: 'Preset',
                      parameterName: '_user_first_touch_timestamp',
                      conditionOperator: '<=',
                      inputValue: ['122'],
                      dataType: 'int',
                    },
                  ],
                  operator: 'and',
                },
              ],
              isInOneSession: true,
              isDirectlyFollow: true,
            },
          ],
          operator: 'or',
        },
        {
          conditions: [
            {
              conditionType: 'UserAttributeCondition',
              hasAttribute: true,
              attributeCondition: {
                parameterType: 'Preset',
                parameterName: '_first_traffic_medium',
                dataType: 'string',
                conditionOperator: 'contains',
                inputValue: ['12'],
              },
            },
          ],
          operator: 'or',
        },
      ],
      operator: 'and',
    },
    {
      description: 'test',
      startDate: '2024-03-01T00:00:00+08:00',
      endDate: '2024-04-30T23:59:59+08:00',
      isRelativeDateRange: false,
      filters: [
        {
          conditions: [
            {
              conditionType: 'UserEventCondition',
              hasDone: true,
              event: {
                eventName: '_user_engagement',
                eventParameterConditions: [],
              },
              metricCondition: {
                metricType: 'NUMBER_OF_TOTAL',
                conditionOperator: '<=',
                inputValue: [12, 0],
                dataType: 'int',
              },
            },
          ],
          operator: 'or',
        },
        {
          conditions: [
            {
              conditionType: 'UserInSegmentCondition',
              isInSegment: false,
              segmentId: '5ce7ccf7-41b3-4f68-8e24-719367b1fc29',
            },
          ],
          operator: 'or',
        },
      ],
      operator: 'and',
    },
  ],
  operator: 'and',
};
