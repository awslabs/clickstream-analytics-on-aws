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
import cloneDeep from 'lodash/cloneDeep';
import { parametersConvertToCategoryItemType } from 'pages/analytics/analytics-utils';
import { getEventParameters } from 'ts/utils';
import {
  DEFAULT_CONDITION_DATA,
  DEFAULT_EVENT_ITEM,
  ERelationShip,
  IAnalyticsItem,
  IEventAnalyticsItem,
} from '../AnalyticsType';

export type ResetEventData = {
  type: 'resetEventData';
  defaultComputeMethodOption?: SelectProps.Option;
  isMultiSelect: boolean;
  enableChangeRelation: boolean;
  disabled?: boolean;
};

export type UpdateEventData = {
  type: 'updateEventData';
  eventData: IEventAnalyticsItem[];
};

export type AddNewEventAnalyticsItem = {
  type: 'addNewEventAnalyticsItem';
  defaultComputeMethodOption: SelectProps.Option;
  isMultiSelect: boolean;
  enableChangeRelation: boolean;
  disable?: boolean;
};

export type RemoveEventItem = {
  type: 'removeEventItem';
  index: number;
};

export type AddNewConditionItem = {
  type: 'addNewConditionItem';
  index: number;
};

export type RemoveEventCondition = {
  type: 'removeEventCondition';
  eventIndex: number;
  conditionIndex: number;
};

export type ChangeConditionCategoryOption = {
  type: 'changeConditionCategoryOption';
  eventIndex: number;
  conditionIndex: number;
  conditionOption: SelectProps.Option | null;
};

export type ChangeConditionOperator = {
  type: 'changeConditionOperator';
  eventIndex: number;
  conditionIndex: number;
  conditionOperator: SelectProps.Option | null;
};

export type ChangeConditionValue = {
  type: 'changeConditionValue';
  eventIndex: number;
  conditionIndex: number;
  value: string[];
};

export type ChangeCurCalcMethodOption = {
  type: 'changeCurCalcMethodOption';
  eventIndex: number;
  methodOption: SelectProps.Option | null;
};

export type ChangeCurCategoryOption = {
  type: 'changeCurCategoryOption';
  eventIndex: number;
  categoryOption: IAnalyticsItem | null;
  metadataEvents: IMetadataEvent[];
  metadataEventParameters: IMetadataEventParameter[];
  metadataUserAttributes: IMetadataUserAttribute[];
};

export type ChangeCurRelationShip = {
  type: 'changeCurRelationShip';
  eventIndex: number;
  relation: ERelationShip;
};

export type AnalyticsFilterAction =
  | UpdateEventData
  | ResetEventData
  | AddNewEventAnalyticsItem
  | RemoveEventItem
  | AddNewConditionItem
  | RemoveEventCondition
  | ChangeConditionCategoryOption
  | ChangeConditionOperator
  | ChangeConditionValue
  | ChangeCurCalcMethodOption
  | ChangeCurCategoryOption
  | ChangeCurRelationShip;

export type AnalyticsDispatchFunction = (action: AnalyticsFilterAction) => void;

export const analyticsEventSelectReducer = (
  state: IEventAnalyticsItem[],
  action: AnalyticsFilterAction
): IEventAnalyticsItem[] => {
  const newState = cloneDeep(state);
  switch (action.type) {
    case 'updateEventData': {
      return [...action.eventData];
    }
    case 'resetEventData': {
      return [
        {
          ...DEFAULT_EVENT_ITEM,
          calculateMethodOption: action.defaultComputeMethodOption,
          enableChangeRelation: action.enableChangeRelation,
          isMultiSelect: action.isMultiSelect,
          disabled: action.disabled,
        },
      ];
    }
    case 'addNewEventAnalyticsItem': {
      return [
        ...newState,
        {
          ...DEFAULT_EVENT_ITEM,
          calculateMethodOption: action.defaultComputeMethodOption,
          enableChangeRelation: action.enableChangeRelation,
          isMultiSelect: action.isMultiSelect,
          disabled: action.disable,
        },
      ];
    }
    case 'removeEventItem': {
      return newState.filter((item, eIndex) => eIndex !== action.index);
    }
    case 'addNewConditionItem': {
      newState[action.index].conditionList.push(DEFAULT_CONDITION_DATA);
      return newState;
    }
    case 'removeEventCondition': {
      const newCondition = newState[action.eventIndex].conditionList.filter(
        (_, i) => i !== action.conditionIndex
      );
      newState[action.eventIndex].conditionList = newCondition;
      return newState;
    }
    case 'changeConditionCategoryOption': {
      newState[action.eventIndex].conditionList[
        action.conditionIndex
      ].conditionOption = action.conditionOption;
      newState[action.eventIndex].conditionList[
        action.conditionIndex
      ].conditionValue = [];
      return newState;
    }
    case 'changeConditionOperator': {
      newState[action.eventIndex].conditionList[
        action.conditionIndex
      ].conditionOperator = action.conditionOperator;
      return newState;
    }
    case 'changeConditionValue': {
      newState[action.eventIndex].conditionList[
        action.conditionIndex
      ].conditionValue = action.value;
      return newState;
    }
    case 'changeCurCalcMethodOption': {
      newState[action.eventIndex].calculateMethodOption = action.methodOption;
      return newState;
    }
    case 'changeCurCategoryOption': {
      const eventName = action.categoryOption?.name;
      const eventParameters = getEventParameters(
        action.metadataEventParameters,
        action.metadataEvents,
        eventName
      );
      const parameterOption = parametersConvertToCategoryItemType(
        action.metadataUserAttributes,
        eventParameters
      );
      newState[action.eventIndex].selectedEventOption = action.categoryOption;
      newState[action.eventIndex].conditionOptions = parameterOption;
      return newState;
    }
    case 'changeCurRelationShip': {
      newState[action.eventIndex].conditionRelationShip = action.relation;
      return newState;
    }
    default:
      return state;
  }
};
