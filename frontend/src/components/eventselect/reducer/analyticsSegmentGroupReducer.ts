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

import {
  DateRangePickerProps,
  SelectProps,
} from '@cloudscape-design/components';
import cloneDeep from 'lodash/cloneDeep';
import {
  getSegmentEventMethodOptions,
  parametersConvertToCategoryItemType,
} from 'pages/analytics/analytics-utils';
import { SegmentPropsData } from 'pages/analytics/segments/components/group/ConditionGroup';
import {
  ConditionType,
  DEFAULT_FILTER_GROUP_ITEM,
  DEFAULT_SEGMENT_GROUP_DATA,
  DEFAULT_SEGMENT_ITEM,
} from 'ts/const';
import { IMetadataBuiltInList } from 'ts/explore-types';
import { getEventParameters, ternary } from 'ts/utils';
import {
  CategoryItemType,
  DEFAULT_CONDITION_DATA,
  ERelationShip,
  IAnalyticsItem,
  IEventSegmentationItem,
  IEventSegmentationObj,
} from '../AnalyticsType';

export enum AnalyticsSegmentActionType {
  ValidateSegmentObject = 'validateSegmentObject',

  SetSegmentData = 'setSegmentData',
  ResetSegmentData = 'resetSegmentData',
  AddOrEventData = 'addOrEventData',
  ConvertAndDataToOr = 'convertAndDataToOr',
  AddAndEventData = 'addAndEventData',
  RemoveEventData = 'removeEventData',

  UpdateUserEventType = 'updateUserEventType',
  UpdateUserDoneEvent = 'updateUserDoneEvent',
  UpdateUserDoneEventCalculate = 'updateUserDoneEventCalculate',
  UpdateUserDoneEventOperation = 'updateUserDoneEventOperation',
  UpdateUserDoneEventValue = 'updateUserDoneEventValue',
  AddEventFilterCondition = 'addEventFilterCondition',
  ChangeEventFilterConditionRelation = 'changeEventFilterConditionRelation',
  UpdateUserDoneEventConditionItem = 'updateUserDoneEventConditionItem',
  UpdateUserDoneEventConditionOperator = 'updateUserDoneEventConditionOperator',
  UpdateUserDoneEventConditionValue = 'updateUserDoneEventConditionValue',
  RemoveUserDoneEventConditionItem = 'removeUserDoneEventConditionItem',

  UpdateUserIsParamOption = 'updateUserIsParamOption',
  UpdateUserIsOperator = 'updateUserIsOperator',
  UpdateUserIsValue = 'updateUserIsValue',

  AddFilterGroup = 'addFilterGroup',
  RemoveFilterGroup = 'removeFilterGroup',
  UpdateFilterGroupName = 'updateFilterGroupName',
  UpdateFilterGroupTimeRange = 'updateFilterGroupTimeRange',

  AddSequenceDoneEvent = 'addSequenceDoneEvent',
  UpdateSequenceDoneEvent = 'updateSequenceDoneEvent',
  RemoveSequenceDoneEvent = 'removeSequenceDoneEvent',
  UpdateSequenceSessionType = 'updateSequenceSessionType',
  UpdateSequenceFlowType = 'updateSequenceFlowType',
  AddSequenceEventFilterCondition = 'addSequenceEventFilterCondition',
  UpdateSequenceEventFilterConditionOption = 'updateSequenceEventFilterConditionOption',
  UpdateSequenceEventFilterConditionOperation = 'updateSequenceEventFilterConditionOperation',
  UpdateSequenceEventFilterConditionValue = 'updateSequenceEventFilterConditionValue',
  RemoveSequenceEventFilterConditionOption = 'removeSequenceEventFilterConditionOption',
  ChangeSequenceEventFilterConditionRelation = 'changeSequenceEventFilterConditionRelation',

  UpdateUserInGroup = 'updateUserInGroup',

  SetEventOption = 'setEventOption',
}

export type ValidateSegmentObject = {
  type: AnalyticsSegmentActionType.ValidateSegmentObject;
};

export type ResetEventData = {
  type: AnalyticsSegmentActionType.ResetSegmentData;
};

export type SetSegmentData = {
  type: AnalyticsSegmentActionType.SetSegmentData;
  segmentData: IEventSegmentationObj;
};

export type AddOrEventData = {
  type: AnalyticsSegmentActionType.AddOrEventData;
  segmentProps: SegmentPropsData;
};

export type ConvertAndDataToOr = {
  type: AnalyticsSegmentActionType.ConvertAndDataToOr;
  segmentProps: SegmentPropsData;
};

export type AddAndEventData = {
  type: AnalyticsSegmentActionType.AddAndEventData;
  rootIndex: number;
};

export type RemoveEventData = {
  type: AnalyticsSegmentActionType.RemoveEventData;
  segmentProps: SegmentPropsData;
};

export type UpdateUserEventType = {
  type: AnalyticsSegmentActionType.UpdateUserEventType;
  segmentProps: SegmentPropsData;
  userEventType: IAnalyticsItem;
};

export type UpdateUserDoneEvent = {
  type: AnalyticsSegmentActionType.UpdateUserDoneEvent;
  segmentProps: SegmentPropsData;
  event: IAnalyticsItem | null;
  // for attribute option
  metaDataEventParameters: IMetadataEventParameter[];
  metaDataEvents: IMetadataEvent[];
  metaDataUserAttributes: IMetadataUserAttribute[];
  builtInMetaData?: IMetadataBuiltInList;
};

export type UpdateUserDoneEventCalculate = {
  type: AnalyticsSegmentActionType.UpdateUserDoneEventCalculate;
  segmentProps: SegmentPropsData;
  calculate?: IAnalyticsItem;
};

export type UpdateUserDoneEventOperation = {
  type: AnalyticsSegmentActionType.UpdateUserDoneEventOperation;
  segmentProps: SegmentPropsData;
  operation: IAnalyticsItem;
};

export type UpdateUserDoneEventValue = {
  type: AnalyticsSegmentActionType.UpdateUserDoneEventValue;
  segmentProps: SegmentPropsData;
  value: Array<string>;
};

export type AddEventFilterCondition = {
  type: AnalyticsSegmentActionType.AddEventFilterCondition;
  segmentProps: SegmentPropsData;
};

export type ChangeEventFilterConditionRelation = {
  type: AnalyticsSegmentActionType.ChangeEventFilterConditionRelation;
  segmentProps: SegmentPropsData;
  relation: ERelationShip;
};

export type UpdateUserDoneEventConditionItem = {
  type: AnalyticsSegmentActionType.UpdateUserDoneEventConditionItem;
  segmentProps: SegmentPropsData;
  conditionIndex: number;
  item: IAnalyticsItem | null;
};

export type UpdateUserDoneEventConditionOperator = {
  type: AnalyticsSegmentActionType.UpdateUserDoneEventConditionOperator;
  segmentProps: SegmentPropsData;
  conditionIndex: number;
  operator: SelectProps.Option | null;
};

export type UpdateUserDoneEventConditionValue = {
  type: AnalyticsSegmentActionType.UpdateUserDoneEventConditionValue;
  segmentProps: SegmentPropsData;
  conditionIndex: number;
  value: string[];
};

export type RemoveUserDoneEventConditionItem = {
  type: AnalyticsSegmentActionType.RemoveUserDoneEventConditionItem;
  segmentProps: SegmentPropsData;
  conditionIndex: number;
};

// user is dispatch type
export type UpdateUserIsParamOption = {
  type: AnalyticsSegmentActionType.UpdateUserIsParamOption;
  segmentProps: SegmentPropsData;
  paramOption: IAnalyticsItem | null;
};

export type UpdateUserIsOperator = {
  type: AnalyticsSegmentActionType.UpdateUserIsOperator;
  segmentProps: SegmentPropsData;
  operator: SelectProps.Option | null;
};

export type UpdateUserIsValue = {
  type: AnalyticsSegmentActionType.UpdateUserIsValue;
  segmentProps: SegmentPropsData;
  value: any;
};

// filter group dispatch type
export type AddFilterGroup = {
  type: AnalyticsSegmentActionType.AddFilterGroup;
};

export type RemoveFilterGroup = {
  type: AnalyticsSegmentActionType.RemoveFilterGroup;
  index: number;
};

export type UpdateFilterGroupName = {
  type: AnalyticsSegmentActionType.UpdateFilterGroupName;
  index: number;
  name: string;
};

export type UpdateFilterGroupTimeRange = {
  type: AnalyticsSegmentActionType.UpdateFilterGroupTimeRange;
  index: number;
  timeRange: DateRangePickerProps.ChangeDetail | null;
};

// user done sequence event dispatch type
export type AddSequenceDoneEvent = {
  type: AnalyticsSegmentActionType.AddSequenceDoneEvent;
  segmentProps: SegmentPropsData;
};

export type AddSequenceEventFilterCondition = {
  type: AnalyticsSegmentActionType.AddSequenceEventFilterCondition;
  segmentProps: SegmentPropsData;
};

export type ChangeSequenceEventFilterConditionRelation = {
  type: AnalyticsSegmentActionType.ChangeSequenceEventFilterConditionRelation;
  segmentProps: SegmentPropsData;
  relation: ERelationShip;
};

export type UpdateSequenceDoneEvent = {
  type: AnalyticsSegmentActionType.UpdateSequenceDoneEvent;
  segmentProps: SegmentPropsData;
  event: IAnalyticsItem | null;
  // for attribute option
  metaDataEventParameters: IMetadataEventParameter[];
  metaDataEvents: IMetadataEvent[];
  metaDataUserAttributes: IMetadataUserAttribute[];
  builtInMetaData?: IMetadataBuiltInList;
};

export type RemoveSequenceDoneEvent = {
  type: AnalyticsSegmentActionType.RemoveSequenceDoneEvent;
  segmentProps: SegmentPropsData;
};

export type UpdateSequenceSessionType = {
  type: AnalyticsSegmentActionType.UpdateSequenceSessionType;
  segmentProps: SegmentPropsData;
  session: SelectProps.Option;
};

export type UpdateSequenceFlowType = {
  type: AnalyticsSegmentActionType.UpdateSequenceFlowType;
  segmentProps: SegmentPropsData;
  flow: SelectProps.Option;
};

export type UpdateSequenceEventFilterConditionOption = {
  type: AnalyticsSegmentActionType.UpdateSequenceEventFilterConditionOption;
  segmentProps: SegmentPropsData;
  sequenceEventConditionIndex: number;
  item: IAnalyticsItem | null;
};

export type UpdateSequenceEventFilterConditionOperation = {
  type: AnalyticsSegmentActionType.UpdateSequenceEventFilterConditionOperation;
  segmentProps: SegmentPropsData;
  sequenceEventConditionIndex: number;
  operator: SelectProps.Option | null;
};

export type UpdateSequenceEventFilterConditionValue = {
  type: AnalyticsSegmentActionType.UpdateSequenceEventFilterConditionValue;
  segmentProps: SegmentPropsData;
  sequenceEventConditionIndex: number;
  value: any;
};

export type RemoveSequenceEventFilterConditionOption = {
  type: AnalyticsSegmentActionType.RemoveSequenceEventFilterConditionOption;
  segmentProps: SegmentPropsData;
  sequenceEventConditionIndex: number;
};

export type UpdateUserInGroup = {
  type: AnalyticsSegmentActionType.UpdateUserInGroup;
  segmentProps: SegmentPropsData;
  group: SelectProps.Option;
};

export type SetEventOption = {
  type: AnalyticsSegmentActionType.SetEventOption;
  eventOption: CategoryItemType[];
  userIsAttributeOptions: CategoryItemType[];
  segmentGroupList: SelectProps.Option[];
};

export type AnalyticsSegmentAction =
  | ValidateSegmentObject
  | SetSegmentData
  | ResetEventData
  | AddOrEventData
  | ConvertAndDataToOr
  | AddAndEventData
  | RemoveEventData
  | UpdateUserEventType
  | UpdateUserDoneEvent
  | UpdateUserDoneEventCalculate
  | UpdateUserDoneEventOperation
  | UpdateUserDoneEventValue
  | AddEventFilterCondition
  | ChangeEventFilterConditionRelation
  | UpdateUserDoneEventConditionItem
  | UpdateUserDoneEventConditionOperator
  | UpdateUserDoneEventConditionValue
  | RemoveUserDoneEventConditionItem
  | UpdateUserIsParamOption
  | UpdateUserIsOperator
  | UpdateUserIsValue
  | AddFilterGroup
  | RemoveFilterGroup
  | UpdateFilterGroupName
  | UpdateFilterGroupTimeRange
  | AddSequenceDoneEvent
  | UpdateSequenceDoneEvent
  | RemoveSequenceDoneEvent
  | UpdateSequenceSessionType
  | UpdateSequenceFlowType
  | AddSequenceEventFilterCondition
  | ChangeSequenceEventFilterConditionRelation
  | UpdateSequenceEventFilterConditionOption
  | UpdateSequenceEventFilterConditionOperation
  | UpdateSequenceEventFilterConditionValue
  | RemoveSequenceEventFilterConditionOption
  | UpdateUserInGroup
  | SetEventOption;

export type AnalyticsDispatchFunction = (
  action: AnalyticsSegmentAction
) => void;

export const checkHasErrorProperties = (
  items: IEventSegmentationItem[],
  errors: string[] = []
) => {
  items.forEach((item) => {
    if (item.subItemList && item.subItemList.length > 0) {
      checkHasErrorProperties(item.subItemList, errors);
    } else {
      if (item.userDoneEventError) {
        errors.push('error');
      }
    }
  });
  return errors;
};

export const checkSegmentAndSetError = (obj: IEventSegmentationItem[]) => {
  for (const item of obj) {
    if (item.subItemList.length > 0) {
      checkSegmentAndSetError(item.subItemList);
    } else {
      if (
        item.userEventType?.value === ConditionType.USER_DONE ||
        item.userEventType?.value === ConditionType.USER_NOT_DONE
      ) {
        item.userDoneEventError = ternary(
          item.userDoneEvent?.value,
          '',
          'analytics:segment.valid.eventEmptyError'
        );
      }
    }
  }
};

export const analyticsSegmentGroupReducer = (
  state: IEventSegmentationObj,
  action: AnalyticsSegmentAction
): IEventSegmentationObj => {
  const newState = cloneDeep(state);
  switch (action.type) {
    case AnalyticsSegmentActionType.ResetSegmentData: {
      return { ...DEFAULT_SEGMENT_GROUP_DATA };
    }

    case AnalyticsSegmentActionType.SetSegmentData: {
      return { ...action.segmentData };
    }

    case AnalyticsSegmentActionType.ValidateSegmentObject: {
      // check user don event
      checkSegmentAndSetError(newState.subItemList);
      return { ...newState };
    }

    // event and or logic
    case AnalyticsSegmentActionType.AddOrEventData: {
      if (action.segmentProps.level === 1) {
        newState.subItemList[action.segmentProps.rootIndex].subItemList.push(
          DEFAULT_SEGMENT_ITEM
        );
      } else if (action.segmentProps.level === 2) {
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.parentIndex
        ].subItemList.push(DEFAULT_SEGMENT_ITEM);
      }
      return { ...newState };
    }

    case AnalyticsSegmentActionType.ConvertAndDataToOr: {
      const currentData = cloneDeep(
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.currentIndex
        ]
      );
      newState.subItemList[action.segmentProps.rootIndex].subItemList[
        action.segmentProps.currentIndex
      ] = {
        userEventType: null,
        segmentEventRelationShip: ERelationShip.OR,
        userDoneEventConditionList: [],
        sequenceEventList: [],
        subItemList: [{ ...currentData }, { ...DEFAULT_SEGMENT_ITEM }],
      };
      return { ...newState };
    }

    case AnalyticsSegmentActionType.AddAndEventData: {
      if (
        newState.subItemList[action.rootIndex].segmentEventRelationShip ===
        ERelationShip.OR
      ) {
        let previousData = cloneDeep(newState.subItemList[action.rootIndex]);
        if (previousData.subItemList.length === 1) {
          previousData = previousData.subItemList[0];
          newState.subItemList[action.rootIndex] = {
            ...newState.subItemList[action.rootIndex],
            segmentEventRelationShip: ERelationShip.AND,
            subItemList: [{ ...previousData }, { ...DEFAULT_SEGMENT_ITEM }],
          };
        } else {
          const preGroupData = previousData.subItemList;
          newState.subItemList[action.rootIndex] = {
            ...newState.subItemList[action.rootIndex],
            segmentEventRelationShip: ERelationShip.AND,
            subItemList: [
              {
                segmentEventRelationShip: ERelationShip.OR,
                subItemList: preGroupData,
                userEventType: null,
                sequenceEventList: [],
                userDoneEventConditionList: [],
              },
              { ...DEFAULT_SEGMENT_ITEM },
            ],
          };
        }
      } else {
        newState.subItemList[action.rootIndex].subItemList.push(
          DEFAULT_SEGMENT_ITEM
        );
      }
      return { ...newState };
    }

    case AnalyticsSegmentActionType.RemoveEventData: {
      if (action.segmentProps.level === 1) {
        newState.subItemList[action.segmentProps.rootIndex].subItemList.splice(
          action.segmentProps.currentIndex,
          1
        );
        if (action.segmentProps.parentData.subItemList.length === 2) {
          newState.subItemList[
            action.segmentProps.rootIndex
          ].segmentEventRelationShip = ERelationShip.OR;
        }
      } else if (action.segmentProps.level === 2) {
        if (action.segmentProps.parentData.subItemList.length === 2) {
          // convert to and
          newState.subItemList[action.segmentProps.rootIndex].subItemList[
            action.segmentProps.parentIndex
          ] = {
            ...newState.subItemList[action.segmentProps.rootIndex].subItemList[
              action.segmentProps.parentIndex
            ].subItemList[action.segmentProps.currentIndex === 0 ? 1 : 0],
          };
        } else {
          newState.subItemList[action.segmentProps.rootIndex].subItemList[
            action.segmentProps.parentIndex
          ].subItemList.splice(action.segmentProps.currentIndex, 1);
        }
      }
      return { ...newState };
    }

    case AnalyticsSegmentActionType.UpdateUserEventType: {
      let currentData =
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.currentIndex
        ];
      if (action.segmentProps.level === 2) {
        currentData =
          newState.subItemList[action.segmentProps.rootIndex].subItemList[
            action.segmentProps.parentIndex
          ].subItemList[action.segmentProps.currentIndex];
      }
      currentData.userEventType = action.userEventType;
      currentData.userDoneEventConditionList = [];
      currentData.sequenceEventList =
        action.userEventType.value === ConditionType.USER_DONE_IN_SEQUENCE
          ? [
              {
                name: '',
                sequenceEventConditionFilterList: [],
              },
            ]
          : [];
      if (action.userEventType.value === ConditionType.USER_DONE_IN_SEQUENCE) {
        currentData.userSequenceSession = state.eventSessionOptions[0];
        currentData.userSequenceFlow = state.eventFlowOptions[0];
      } else {
        currentData.userSequenceSession = null;
        currentData.userSequenceFlow = null;
      }
      return { ...newState };
    }

    // user done or not done event
    case AnalyticsSegmentActionType.UpdateUserDoneEvent: {
      // Calculate the event attribute option by selected event
      const eventParameters = getEventParameters(
        action.metaDataEventParameters,
        action.metaDataEvents,
        action.builtInMetaData,
        action.event?.name
      );
      const parameterOption = parametersConvertToCategoryItemType(
        action.metaDataUserAttributes,
        eventParameters
      );
      const calculateMethodOptions = getSegmentEventMethodOptions(
        action.metaDataUserAttributes,
        eventParameters
      );
      // set current event
      let currentData =
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.currentIndex
        ];
      if (action.segmentProps.level === 2) {
        currentData =
          newState.subItemList[action.segmentProps.rootIndex].subItemList[
            action.segmentProps.parentIndex
          ].subItemList[action.segmentProps.currentIndex];
      }
      currentData.userDoneEventError = '';
      currentData.userDoneEvent = action.event;
      currentData.eventAttributeOption = parameterOption;
      currentData.eventCalculateMethodOption = calculateMethodOptions;
      currentData.userDoneEventCalculateMethod = calculateMethodOptions[0];
      currentData.userDoneEventConditionList = [];
      return { ...newState };
    }

    case AnalyticsSegmentActionType.UpdateUserDoneEventCalculate: {
      let currentData =
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.currentIndex
        ];
      if (action.segmentProps.level === 2) {
        currentData =
          newState.subItemList[action.segmentProps.rootIndex].subItemList[
            action.segmentProps.parentIndex
          ].subItemList[action.segmentProps.currentIndex];
      }
      currentData.userDoneEventCalculateMethod = action.calculate;
      return { ...newState };
    }

    case AnalyticsSegmentActionType.UpdateUserDoneEventOperation: {
      let currentData =
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.currentIndex
        ];
      if (action.segmentProps.level === 2) {
        currentData =
          newState.subItemList[action.segmentProps.rootIndex].subItemList[
            action.segmentProps.parentIndex
          ].subItemList[action.segmentProps.currentIndex];
      }
      currentData.userDoneEventOperation = action.operation;
      return { ...newState };
    }

    case AnalyticsSegmentActionType.UpdateUserDoneEventValue: {
      let currentData =
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.currentIndex
        ];
      if (action.segmentProps.level === 2) {
        currentData =
          newState.subItemList[action.segmentProps.rootIndex].subItemList[
            action.segmentProps.parentIndex
          ].subItemList[action.segmentProps.currentIndex];
      }
      currentData.userDoneEventValue = action.value;
      return { ...newState };
    }

    case AnalyticsSegmentActionType.RemoveUserDoneEventConditionItem: {
      let currentData =
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.currentIndex
        ];
      if (action.segmentProps.level === 2) {
        currentData =
          newState.subItemList[action.segmentProps.rootIndex].subItemList[
            action.segmentProps.parentIndex
          ].subItemList[action.segmentProps.currentIndex];
      }
      currentData.userDoneEventConditionList.splice(action.conditionIndex, 1);
      return { ...newState };
    }

    case AnalyticsSegmentActionType.AddEventFilterCondition: {
      let currentData =
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.currentIndex
        ];
      if (action.segmentProps.level === 2) {
        currentData =
          newState.subItemList[action.segmentProps.rootIndex].subItemList[
            action.segmentProps.parentIndex
          ].subItemList[action.segmentProps.currentIndex];
      }
      if (!currentData.userDoneEvent?.value) {
        // valid user select event
        currentData.userDoneEventError =
          'analytics:segment.valid.eventEmptyError';
      } else {
        currentData.userDoneEventConditionList.push({
          ...DEFAULT_CONDITION_DATA,
        });
        currentData.eventConditionRelationShip = ERelationShip.AND;
      }

      return { ...newState };
    }

    case AnalyticsSegmentActionType.ChangeEventFilterConditionRelation: {
      if (action.segmentProps.level === 1) {
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.currentIndex
        ].eventConditionRelationShip = action.relation;
      } else if (action.segmentProps.level === 2) {
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.parentIndex
        ].subItemList[
          action.segmentProps.currentIndex
        ].eventConditionRelationShip = action.relation;
      }
      return { ...newState };
    }

    case AnalyticsSegmentActionType.UpdateUserDoneEventConditionItem: {
      if (action.segmentProps.level === 1) {
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.currentIndex
        ].userDoneEventConditionList[action.conditionIndex].conditionOption =
          action.item;
      } else {
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.parentIndex
        ].subItemList[
          action.segmentProps.currentIndex
        ].userDoneEventConditionList[action.conditionIndex].conditionOption =
          action.item;
      }
      return { ...newState };
    }

    case AnalyticsSegmentActionType.UpdateUserDoneEventConditionOperator: {
      if (action.segmentProps.level === 1) {
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.currentIndex
        ].userDoneEventConditionList[action.conditionIndex].conditionOperator =
          action.operator;
      } else {
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.parentIndex
        ].subItemList[
          action.segmentProps.currentIndex
        ].userDoneEventConditionList[action.conditionIndex].conditionOperator =
          action.operator;
      }
      return { ...newState };
    }

    case AnalyticsSegmentActionType.UpdateUserDoneEventConditionValue: {
      if (action.segmentProps.level === 1) {
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.currentIndex
        ].userDoneEventConditionList[action.conditionIndex].conditionValue =
          action.value;
      } else {
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.parentIndex
        ].subItemList[
          action.segmentProps.currentIndex
        ].userDoneEventConditionList[action.conditionIndex].conditionValue =
          action.value;
      }
      return { ...newState };
    }

    // user is logic
    case AnalyticsSegmentActionType.UpdateUserIsParamOption: {
      let currentData =
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.currentIndex
        ];
      if (action.segmentProps.level === 2) {
        currentData =
          newState.subItemList[action.segmentProps.rootIndex].subItemList[
            action.segmentProps.parentIndex
          ].subItemList[action.segmentProps.currentIndex];
      }
      currentData.userIsParamOption = action.paramOption;
      return { ...newState };
    }

    case AnalyticsSegmentActionType.UpdateUserIsOperator: {
      let currentData =
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.currentIndex
        ];
      if (action.segmentProps.level === 2) {
        currentData =
          newState.subItemList[action.segmentProps.rootIndex].subItemList[
            action.segmentProps.parentIndex
          ].subItemList[action.segmentProps.currentIndex];
      }
      currentData.userISOperator = action.operator;
      return { ...newState };
    }

    case AnalyticsSegmentActionType.UpdateUserIsValue: {
      let currentData =
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.currentIndex
        ];
      if (action.segmentProps.level === 2) {
        currentData =
          newState.subItemList[action.segmentProps.rootIndex].subItemList[
            action.segmentProps.parentIndex
          ].subItemList[action.segmentProps.currentIndex];
      }
      currentData.userIsValue = action.value;
      return { ...newState };
    }

    // filter group logic
    case AnalyticsSegmentActionType.AddFilterGroup: {
      newState.subItemList.push({ ...DEFAULT_FILTER_GROUP_ITEM });
      return { ...newState };
    }

    case AnalyticsSegmentActionType.RemoveFilterGroup: {
      newState.subItemList.splice(action.index, 1);
      return { ...newState };
    }

    case AnalyticsSegmentActionType.UpdateFilterGroupName: {
      newState.subItemList[action.index].groupName = action.name;
      return { ...newState };
    }

    case AnalyticsSegmentActionType.UpdateFilterGroupTimeRange: {
      newState.subItemList[action.index].groupDateRange = action.timeRange;
      return { ...newState };
    }

    // sequence done event logic
    case AnalyticsSegmentActionType.AddSequenceDoneEvent: {
      const newEvent: IAnalyticsItem = {
        name: '',
        sequenceEventOption: null,
        sequenceEventConditionFilterList: [],
      };
      if (action.segmentProps.level === 1) {
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.currentIndex
        ].sequenceEventList.push(newEvent);
      } else {
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.parentIndex
        ].subItemList[action.segmentProps.currentIndex].sequenceEventList.push(
          newEvent
        );
      }
      return { ...newState };
    }

    case AnalyticsSegmentActionType.UpdateSequenceDoneEvent: {
      // Calculate the event attribute option by selected event
      const eventParameters = getEventParameters(
        action.metaDataEventParameters,
        action.metaDataEvents,
        action.builtInMetaData,
        action.event?.name
      );
      const parameterOption = parametersConvertToCategoryItemType(
        action.metaDataUserAttributes,
        eventParameters
      );
      let currentData =
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.currentIndex
        ].sequenceEventList[action.segmentProps.sequenceEventIndex ?? 0];
      if (action.segmentProps.level === 2) {
        currentData =
          newState.subItemList[action.segmentProps.rootIndex].subItemList[
            action.segmentProps.parentIndex
          ].subItemList[action.segmentProps.currentIndex].sequenceEventList[
            action.segmentProps.sequenceEventIndex ?? 0
          ];
      }
      currentData.sequenceEventOption = action.event;
      currentData.sequenceEventAttributeOption = parameterOption;
      currentData.sequenceEventConditionFilterList = [];
      return { ...newState };
    }

    case AnalyticsSegmentActionType.RemoveSequenceDoneEvent: {
      if (action.segmentProps.level === 1) {
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.currentIndex
        ].sequenceEventList.splice(
          action.segmentProps.sequenceEventIndex ?? 0,
          1
        );
      } else {
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.parentIndex
        ].subItemList[
          action.segmentProps.currentIndex
        ].sequenceEventList.splice(
          action.segmentProps.sequenceEventIndex ?? 0,
          1
        );
      }
      return { ...newState };
    }

    case AnalyticsSegmentActionType.UpdateSequenceSessionType: {
      if (action.segmentProps.level === 1) {
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.currentIndex
        ].userSequenceSession = action.session;
      } else {
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.parentIndex
        ].subItemList[action.segmentProps.currentIndex].userSequenceSession =
          action.session;
      }
      return { ...newState };
    }

    case AnalyticsSegmentActionType.UpdateSequenceFlowType: {
      if (action.segmentProps.level === 1) {
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.currentIndex
        ].userSequenceFlow = action.flow;
      } else {
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.parentIndex
        ].subItemList[action.segmentProps.currentIndex].userSequenceFlow =
          action.flow;
      }
      return { ...newState };
    }

    case AnalyticsSegmentActionType.AddSequenceEventFilterCondition: {
      let currentData =
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.currentIndex
        ].sequenceEventList[action.segmentProps.sequenceEventIndex ?? 0];
      if (action.segmentProps.level === 2) {
        currentData =
          newState.subItemList[action.segmentProps.rootIndex].subItemList[
            action.segmentProps.parentIndex
          ].subItemList[action.segmentProps.currentIndex].sequenceEventList[
            action.segmentProps.sequenceEventIndex ?? 0
          ];
      }
      currentData.filterGroupRelationShip = ERelationShip.AND;
      currentData.sequenceEventConditionFilterList?.push({
        ...DEFAULT_CONDITION_DATA,
      });

      return { ...newState };
    }

    case AnalyticsSegmentActionType.ChangeSequenceEventFilterConditionRelation: {
      if (action.segmentProps.level === 1) {
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.currentIndex
        ].sequenceEventList[
          action.segmentProps.sequenceEventIndex ?? 0
        ].filterGroupRelationShip = action.relation;
      } else {
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.parentIndex
        ].subItemList[action.segmentProps.currentIndex].sequenceEventList[
          action.segmentProps.sequenceEventIndex ?? 0
        ].filterGroupRelationShip = action.relation;
      }
      return { ...newState };
    }

    case AnalyticsSegmentActionType.UpdateSequenceEventFilterConditionOption: {
      if (action.segmentProps.level === 1) {
        const seqConditionList =
          newState.subItemList[action.segmentProps.rootIndex].subItemList[
            action.segmentProps.currentIndex
          ].sequenceEventList[action.segmentProps.sequenceEventIndex ?? 0]
            .sequenceEventConditionFilterList;
        if (seqConditionList && seqConditionList.length > 0) {
          seqConditionList[action.sequenceEventConditionIndex].conditionOption =
            action.item;
        }
      } else {
        const seqConditionList =
          newState.subItemList[action.segmentProps.rootIndex].subItemList[
            action.segmentProps.parentIndex
          ].subItemList[action.segmentProps.currentIndex].sequenceEventList[
            action.segmentProps.sequenceEventIndex ?? 0
          ].sequenceEventConditionFilterList;
        if (seqConditionList && seqConditionList.length > 0) {
          seqConditionList[action.sequenceEventConditionIndex].conditionOption =
            action.item;
        }
      }
      return { ...newState };
    }

    case AnalyticsSegmentActionType.UpdateSequenceEventFilterConditionOperation: {
      if (action.segmentProps.level === 1) {
        const seqConditionList =
          newState.subItemList[action.segmentProps.rootIndex].subItemList[
            action.segmentProps.currentIndex
          ].sequenceEventList[action.segmentProps.sequenceEventIndex ?? 0]
            .sequenceEventConditionFilterList;
        if (seqConditionList && seqConditionList.length > 0) {
          seqConditionList[
            action.sequenceEventConditionIndex
          ].conditionOperator = action.operator;
        }
      } else {
        const seqConditionList =
          newState.subItemList[action.segmentProps.rootIndex].subItemList[
            action.segmentProps.parentIndex
          ].subItemList[action.segmentProps.currentIndex].sequenceEventList[
            action.segmentProps.sequenceEventIndex ?? 0
          ].sequenceEventConditionFilterList;
        if (seqConditionList && seqConditionList.length > 0) {
          seqConditionList[
            action.sequenceEventConditionIndex
          ].conditionOperator = action.operator;
        }
      }
      return { ...newState };
    }

    case AnalyticsSegmentActionType.UpdateSequenceEventFilterConditionValue: {
      if (action.segmentProps.level === 1) {
        const seqConditionList =
          newState.subItemList[action.segmentProps.rootIndex].subItemList[
            action.segmentProps.currentIndex
          ].sequenceEventList[action.segmentProps.sequenceEventIndex ?? 0]
            .sequenceEventConditionFilterList;
        if (seqConditionList && seqConditionList.length > 0) {
          seqConditionList[action.sequenceEventConditionIndex].conditionValue =
            action.value;
        }
      } else {
        const seqConditionList =
          newState.subItemList[action.segmentProps.rootIndex].subItemList[
            action.segmentProps.parentIndex
          ].subItemList[action.segmentProps.currentIndex].sequenceEventList[
            action.segmentProps.sequenceEventIndex ?? 0
          ].sequenceEventConditionFilterList;
        if (seqConditionList && seqConditionList.length > 0) {
          seqConditionList[action.sequenceEventConditionIndex].conditionValue =
            action.value;
        }
      }
      return { ...newState };
    }

    case AnalyticsSegmentActionType.RemoveSequenceEventFilterConditionOption: {
      if (action.segmentProps.level === 1) {
        const seqConditionList =
          newState.subItemList[action.segmentProps.rootIndex].subItemList[
            action.segmentProps.currentIndex
          ].sequenceEventList[action.segmentProps.sequenceEventIndex ?? 0]
            .sequenceEventConditionFilterList;
        if (seqConditionList && seqConditionList.length > 0) {
          seqConditionList.splice(action.sequenceEventConditionIndex, 1);
        }
      } else {
        const seqConditionList =
          newState.subItemList[action.segmentProps.rootIndex].subItemList[
            action.segmentProps.parentIndex
          ].subItemList[action.segmentProps.currentIndex].sequenceEventList[
            action.segmentProps.sequenceEventIndex ?? 0
          ].sequenceEventConditionFilterList;
        if (seqConditionList && seqConditionList.length > 0) {
          seqConditionList.splice(action.sequenceEventConditionIndex, 1);
        }
      }
      return { ...newState };
    }

    case AnalyticsSegmentActionType.UpdateUserInGroup: {
      if (action.segmentProps.level === 1) {
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.currentIndex
        ].userInFilterGroup = action.group;
      } else {
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.parentIndex
        ].subItemList[action.segmentProps.currentIndex].userInFilterGroup =
          action.group;
      }
      return { ...newState };
    }

    case AnalyticsSegmentActionType.SetEventOption: {
      return {
        ...newState,
        eventOption: action.eventOption,
        userIsAttributeOptions: action.userIsAttributeOptions,
        userGroupOptions: action.segmentGroupList,
      };
    }

    default:
      return state;
  }
};
