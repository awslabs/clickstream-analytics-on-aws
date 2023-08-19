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
import { MetadataValueType } from 'ts/const';

export interface IConditionItemType {
  eventType: string;
  conditionOption: IAnalyticsItem | null;
  conditionOperator: SelectProps.Option | null;
  conditionValue: any;
}

export interface SegmetationFilterDataType {
  enableChangeRelation?: boolean;
  conditionRelationShip: ERelationShip;
  data: IConditionItemType[];
}

export interface IAnalyticsItem extends SelectProps.Option {
  modifyTime?: string;
  valueType?: MetadataValueType;
}

export interface CategoryItemType {
  categoryName: string;
  categoryType: string;
  itemList: IAnalyticsItem[];
}

export enum ERelationShip {
  AND = 'and',
  OR = 'or',
}

export interface IEventAnalyticsItem {
  listOrderType?: 'number' | 'alpahbet';
  customOrderName?: string;
  selectedEventOption: IAnalyticsItem | null;
  calculateMethodOption?: SelectProps.Option | null;
  conditionList: IConditionItemType[];
  conditionRelationShip: ERelationShip;
  hasTab?: boolean;
  isMultiSelect?: boolean;
  enableChangeRelation?: boolean;
}

export const DEFAULT_EVENT_ITEM = {
  selectedEventOption: null,
  calculateMethodOption: null,
  conditionList: [],
  conditionRelationShip: ERelationShip.AND,
  hasTab: true,
  isMultiSelect: true,
  enableChangeRelation: true,
};

export const INIT_EVENT_LIST: IEventAnalyticsItem[] = [DEFAULT_EVENT_ITEM];

export const DEFAULT_CONDITION_DATA: IConditionItemType = {
  eventType: 'attribute',
  conditionOption: null,
  conditionOperator: null,
  conditionValue: '',
};

// MOCK DATA
export const MOCK_EVENT_OPTION_LIST: CategoryItemType[] = [
  {
    categoryName: '预置事件',
    categoryType: 'event',
    itemList: [
      {
        label: '预置事件一',
        value: 'predefine-event-1',
        description: 'predefine event 1 description',
        modifyTime: '2022-12-12 12:12:12',
      },
    ],
  },
  {
    categoryName: '自定义事件',
    categoryType: 'event',
    itemList: [
      {
        label: '自定义事件一',
        value: 'custom-event-1',
        description: 'custom event 1 description',
        modifyTime: '2023-11-11 11:11:11',
      },
    ],
  },
];

export const DEFAULT_SEGMENTATION_DATA: IConditionItemType = {
  eventType: 'event',
  conditionOption: null,
  conditionOperator: null,
  conditionValue: '',
};

export const INIT_SEGMENTATION_DATA: SegmetationFilterDataType = {
  enableChangeRelation: true,
  conditionRelationShip: ERelationShip.AND,
  data: [DEFAULT_SEGMENTATION_DATA],
};

export const MOCK_CONDITION_OPERATOR_LIST: SelectProps.Options = [
  { value: 'is_null', label: 'null' },
  { value: 'is_not_null', label: '非null' },
  { value: '=', label: '=' },
  { value: '!=', label: '!=' },
  { value: 'not_equal_contain_null', label: '!=(含null)' },
  { value: '>', label: '>' },
  { value: '>=', label: '>=' },
  { value: '<', label: '<' },
  { value: '<=', label: '<=' },
  { value: 'between', label: '在...之间' },
  { value: 'not_equal_not_contain_null', label: '!=(不含null)' },
  { value: 'contain', label: '包含' },
  { value: 'not_contain', label: '不含' },
  { value: 'not_contain_not_contain_null', label: '不含(不含null)' },
  { value: 'custom_contain', label: '自定义包含' },
  { value: 'match', label: '匹配正则' },
  { value: 'not_match', label: '不匹配正则' },
];

export const MOCK_ATTRIBUTE_OPTION_LIST: CategoryItemType[] = [
  {
    categoryName: '用户属性',
    categoryType: 'attribute',
    itemList: [
      {
        label: 'Country',
        value: '',
        description: 'user attribute 1 desc',
        valueType: MetadataValueType.STRING,
      },
      {
        label: 'Aage',
        value: '',
        description: 'user attribute 2 desc',
        valueType: MetadataValueType.NUMBER,
      },
      {
        label: 'Birthday',
        value: '',
        description: 'user attribute 3 desc',
        valueType: MetadataValueType.DATETIME,
      },
    ],
  },
  {
    categoryName: '事件属性',
    categoryType: 'attribute',
    itemList: [
      {
        label: 'First Login',
        value: '111',
        description: 'event attribute 1 desc',
        valueType: MetadataValueType.BOOLEAN,
      },
    ],
  },
];

export const MOCK_STRING_TYPE_OPTION_LIST = [
  {
    label: 'Option 1',
    value: '1',
  },
  {
    label: 'Option 2',
    value: '2',
  },
  {
    label: 'Option 3',
    value: '3',
    disabled: true,
  },
  {
    label: 'Option 4',
    value: '4',
  },
  { label: 'Option 5', value: '5' },
];

export const MOCK_BOOLEAN_OPTION_LIST = [
  {
    label: 'True',
    value: 'true',
  },
  {
    label: 'False',
    value: 'false',
  },
];

export const MOCK_CACLULATION_OPTION_LIST = [
  { label: '总次数', value: 'totalCount' },
  { label: '总人数', value: 'totalUser' },
];
