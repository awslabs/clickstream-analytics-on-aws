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

import { OptionDefinition } from '@cloudscape-design/components/internal/components/option/interfaces';
import {
  CategoryItemType,
  DEFAULT_CONDITION_DATA,
  ERelationShip,
  INIT_SEGMENTATION_DATA,
  SegmentationFilterDataType,
} from '../AnalyticsType';

export type ResetFilterData = {
  type: 'resetFilterData';
  presetParameters: CategoryItemType[];
};

export type ChangeRelationShip = {
  type: 'changeRelationShip';
  relation: ERelationShip;
};

export type AddEventCondition = {
  type: 'addEventCondition';
};

export type RemoveEventCondition = {
  type: 'removeEventCondition';
  index: number;
};

export type ChangeConditionCategoryOption = {
  type: 'changeConditionCategoryOption';
  index: number;
  option: OptionDefinition | null;
};

export type ChangeConditionOperator = {
  type: 'changeConditionOperator';
  index: number;
  operator: OptionDefinition | null;
};

export type ChangeConditionValue = {
  type: 'changeConditionValue';
  index: number;
  value: string[];
};

export type AnalyticsFilterAction =
  | ResetFilterData
  | ChangeRelationShip
  | AddEventCondition
  | RemoveEventCondition
  | ChangeConditionCategoryOption
  | ChangeConditionOperator
  | ChangeConditionValue;

export const analyticsSegmentFilterReducer = (
  state: SegmentationFilterDataType,
  action: AnalyticsFilterAction
): SegmentationFilterDataType => {
  switch (action.type) {
    case 'resetFilterData': {
      return {
        ...INIT_SEGMENTATION_DATA,
        conditionOptions: action.presetParameters,
        enableChangeRelation: true,
      };
    }
    case 'changeRelationShip': {
      return {
        ...state,
        conditionRelationShip: action.relation,
      };
    }
    case 'addEventCondition': {
      return {
        ...state,
        data: [...state.data, DEFAULT_CONDITION_DATA],
      };
    }
    case 'removeEventCondition': {
      return {
        ...state,
        data: state.data.filter((_, i) => i !== action.index),
      };
    }
    case 'changeConditionCategoryOption': {
      return {
        ...state,
        data: [
          ...state.data.map((event, index) => {
            if (index === action.index) {
              return { ...event, conditionOption: action.option };
            } else {
              return event;
            }
          }),
        ],
      };
    }
    case 'changeConditionOperator': {
      return {
        ...state,
        data: [
          ...state.data.map((event, index) => {
            if (index === action.index) {
              return { ...event, conditionOperator: action.operator };
            } else {
              return event;
            }
          }),
        ],
      };
    }
    case 'changeConditionValue': {
      return {
        ...state,
        data: [
          ...state.data.map((event, index) => {
            if (index === action.index) {
              return { ...event, conditionValue: action.value };
            } else {
              return event;
            }
          }),
        ],
      };
    }
    default:
      return state;
  }
};
