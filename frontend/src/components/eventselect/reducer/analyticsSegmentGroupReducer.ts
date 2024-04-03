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

import { IMetadataBuiltInList } from '@aws/clickstream-base-lib';
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
      if (
        item.userDoneEventError ||
        item.userDoneEventOperatorError ||
        item.userDoneEventValueError ||
        item.groupEmptyError
      ) {
        errors.push('error');
      } else if (item.sequenceEventList.length > 0) {
        for (const seqEvent of item.sequenceEventList) {
          if (seqEvent.seqEventEmptyError) {
            errors.push('error');
          }
        }
      }
    }
  });
  return errors;
};

const setUserDoneEventError = (item: IEventSegmentationItem) => {
  item.userDoneEventError = ternary(
    item.userDoneEvent?.value,
    '',
    'analytics:segment.valid.eventEmptyError'
  );
  item.userDoneEventOperatorError = ternary(
    item.userDoneEventOperation?.value,
    '',
    'analytics:segment.valid.eventOperatorEmptyError'
  );
  item.userDoneEventValueError = ternary(
    item.userDoneEventValue && item.userDoneEventValue?.[0] !== '',
    '',
    'analytics:segment.valid.eventValueEmptyError'
  );
  if (item.userDoneEventOperation?.value === 'between') {
    item.userDoneEventValueError = ternary(
      item.userDoneEventValue &&
        item.userDoneEventValue?.[1] > item.userDoneEventValue?.[0],
      '',
      'analytics:segment.valid.eventValueBetweenError'
    );
  }
};

const setUserInSeqEventError = (item: IEventSegmentationItem) => {
  for (const seqItem of item.sequenceEventList) {
    seqItem.seqEventEmptyError = ternary(
      seqItem?.sequenceEventOption?.value,
      '',
      'analytics:segment.valid.eventEmptyError'
    );
  }
};

const setUserInGroupError = (item: IEventSegmentationItem) => {
  item.groupEmptyError = ternary(
    item.userInFilterGroup?.value,
    '',
    'analytics:segment.valid.groupEmptyError'
  );
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
        setUserDoneEventError(item);
      } else if (
        item.userEventType?.value === ConditionType.USER_DONE_IN_SEQUENCE
      ) {
        setUserInSeqEventError(item);
      } else if (
        item.userEventType?.value === ConditionType.USER_IN_GROUP ||
        item.userEventType?.value === ConditionType.USER_NOT_IN_GROUP
      ) {
        setUserInGroupError(item);
      }
    }
  }
};

const handleResetSegmentData = () => {
  return { ...DEFAULT_SEGMENT_GROUP_DATA };
};

const handleSetSegmentData = (
  state: IEventSegmentationObj,
  action: SetSegmentData
) => {
  return { ...action.segmentData };
};

const handleValidateSegmentObject = (state: IEventSegmentationObj) => {
  // check user don event
  checkSegmentAndSetError(state.subItemList);
  return { ...state };
};

const handleAddOrEventData = (state: IEventSegmentationObj, action) => {
  if (action.segmentProps.level === 1) {
    state.subItemList[action.segmentProps.rootIndex].subItemList.push(
      DEFAULT_SEGMENT_ITEM
    );
  } else if (action.segmentProps.level === 2) {
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.parentIndex
    ].subItemList.push(DEFAULT_SEGMENT_ITEM);
  }
  return { ...state };
};

const handleConvertAndDataToOr = (state: IEventSegmentationObj, action) => {
  const currentData = cloneDeep(
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.currentIndex
    ]
  );
  state.subItemList[action.segmentProps.rootIndex].subItemList[
    action.segmentProps.currentIndex
  ] = {
    userEventType: null,
    segmentEventRelationShip: ERelationShip.OR,
    userDoneEventConditionList: [],
    sequenceEventList: [],
    subItemList: [{ ...currentData }, { ...DEFAULT_SEGMENT_ITEM }],
  };
  return { ...state };
};

const handleAddAndEventData = (state: IEventSegmentationObj, action) => {
  if (
    state.subItemList[action.rootIndex].segmentEventRelationShip ===
    ERelationShip.OR
  ) {
    let previousData = cloneDeep(state.subItemList[action.rootIndex]);
    if (previousData.subItemList.length === 1) {
      previousData = previousData.subItemList[0];
      state.subItemList[action.rootIndex] = {
        ...state.subItemList[action.rootIndex],
        segmentEventRelationShip: ERelationShip.AND,
        subItemList: [{ ...previousData }, { ...DEFAULT_SEGMENT_ITEM }],
      };
    } else {
      const preGroupData = previousData.subItemList;
      state.subItemList[action.rootIndex] = {
        ...state.subItemList[action.rootIndex],
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
    state.subItemList[action.rootIndex].subItemList.push(DEFAULT_SEGMENT_ITEM);
  }
  return { ...state };
};

const handleRemoveEventData = (state: IEventSegmentationObj, action) => {
  if (action.segmentProps.level === 1) {
    state.subItemList[action.segmentProps.rootIndex].subItemList.splice(
      action.segmentProps.currentIndex,
      1
    );
    if (action.segmentProps.parentData.subItemList?.length === 2) {
      state.subItemList[
        action.segmentProps.rootIndex
      ].segmentEventRelationShip = ERelationShip.OR;
    }
  } else if (action.segmentProps.level === 2) {
    if (action.segmentProps.parentData.subItemList.length === 2) {
      // convert to and
      state.subItemList[action.segmentProps.rootIndex].subItemList[
        action.segmentProps.parentIndex
      ] = {
        ...state.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.parentIndex
        ].subItemList[action.segmentProps.currentIndex === 0 ? 1 : 0],
      };
    } else {
      state.subItemList[action.segmentProps.rootIndex].subItemList[
        action.segmentProps.parentIndex
      ].subItemList.splice(action.segmentProps.currentIndex, 1);
    }
  }
  return { ...state };
};

const handleUpdateUserEventType = (state: IEventSegmentationObj, action) => {
  let currentData =
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.currentIndex
    ];
  if (action.segmentProps.level === 2) {
    currentData =
      state.subItemList[action.segmentProps.rootIndex].subItemList[
        action.segmentProps.parentIndex
      ].subItemList[action.segmentProps.currentIndex];
  }
  currentData.userDoneEventError = '';
  currentData.userDoneEventOperatorError = '';
  currentData.userDoneEventValueError = '';
  currentData.groupEmptyError = '';
  currentData.userEventType = action.userEventType;
  currentData.userDoneEventConditionList = [];
  if (action.userEventType.value === ConditionType.USER_DONE_IN_SEQUENCE) {
    currentData.sequenceEventList = [
      {
        name: '',
        sequenceEventConditionFilterList: [],
        seqEventEmptyError: '',
      },
    ];
    currentData.userSequenceSession = state.eventSessionOptions[0];
    currentData.userSequenceFlow = state.eventFlowOptions[0];
  } else {
    currentData.sequenceEventList = [];
    currentData.userSequenceSession = null;
    currentData.userSequenceFlow = null;
  }
  return { ...state };
};

const handleUpdateUserDoneEvent = (state: IEventSegmentationObj, action) => {
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
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.currentIndex
    ];
  if (action.segmentProps.level === 2) {
    currentData =
      state.subItemList[action.segmentProps.rootIndex].subItemList[
        action.segmentProps.parentIndex
      ].subItemList[action.segmentProps.currentIndex];
  }
  currentData.userDoneEventError = '';
  currentData.userDoneEvent = action.event;
  currentData.eventAttributeOption = parameterOption;
  currentData.eventCalculateMethodOption = calculateMethodOptions;
  currentData.userDoneEventCalculateMethod = calculateMethodOptions[0];
  currentData.userDoneEventConditionList = [];
  return { ...state };
};

const handleUpdateUserDoneEventCalculate = (
  state: IEventSegmentationObj,
  action
) => {
  let currentData =
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.currentIndex
    ];
  if (action.segmentProps.level === 2) {
    currentData =
      state.subItemList[action.segmentProps.rootIndex].subItemList[
        action.segmentProps.parentIndex
      ].subItemList[action.segmentProps.currentIndex];
  }
  currentData.userDoneEventCalculateMethod = action.calculate;
  return { ...state };
};

const handleUpdateUserDoneEventOperation = (
  state: IEventSegmentationObj,
  action
) => {
  let currentData =
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.currentIndex
    ];
  if (action.segmentProps.level === 2) {
    currentData =
      state.subItemList[action.segmentProps.rootIndex].subItemList[
        action.segmentProps.parentIndex
      ].subItemList[action.segmentProps.currentIndex];
  }
  currentData.userDoneEventOperatorError = '';
  currentData.userDoneEventOperation = action.operation;
  return { ...state };
};

const handleUpdateUserDoneEventValue = (
  state: IEventSegmentationObj,
  action
) => {
  let currentData =
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.currentIndex
    ];
  if (action.segmentProps.level === 2) {
    currentData =
      state.subItemList[action.segmentProps.rootIndex].subItemList[
        action.segmentProps.parentIndex
      ].subItemList[action.segmentProps.currentIndex];
  }
  currentData.userDoneEventValueError = '';
  currentData.userDoneEventValue = action.value;
  return { ...state };
};

const handleRemoveUserDoneEventConditionItem = (
  state: IEventSegmentationObj,
  action
) => {
  let currentData =
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.currentIndex
    ];
  if (action.segmentProps.level === 2) {
    currentData =
      state.subItemList[action.segmentProps.rootIndex].subItemList[
        action.segmentProps.parentIndex
      ].subItemList[action.segmentProps.currentIndex];
  }
  currentData.userDoneEventConditionList.splice(action.conditionIndex, 1);
  return { ...state };
};

const handleAddEventFilterCondition = (
  state: IEventSegmentationObj,
  action
) => {
  let currentData =
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.currentIndex
    ];
  if (action.segmentProps.level === 2) {
    currentData =
      state.subItemList[action.segmentProps.rootIndex].subItemList[
        action.segmentProps.parentIndex
      ].subItemList[action.segmentProps.currentIndex];
  }
  if (!currentData.userDoneEvent?.value) {
    // valid user select event
    currentData.userDoneEventError = 'analytics:segment.valid.eventEmptyError';
  } else {
    currentData.userDoneEventConditionList.push({
      ...DEFAULT_CONDITION_DATA,
    });
    currentData.eventConditionRelationShip = ERelationShip.AND;
  }
  return { ...state };
};

const handleChangeEventFilterConditionRelation = (
  state: IEventSegmentationObj,
  action
) => {
  if (action.segmentProps.level === 1) {
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.currentIndex
    ].eventConditionRelationShip = action.relation;
  } else if (action.segmentProps.level === 2) {
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.parentIndex
    ].subItemList[action.segmentProps.currentIndex].eventConditionRelationShip =
      action.relation;
  }
  return { ...state };
};

const handleUpdateUserDoneEventConditionItem = (
  state: IEventSegmentationObj,
  action
) => {
  if (action.segmentProps.level === 1) {
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.currentIndex
    ].userDoneEventConditionList[action.conditionIndex].conditionOption =
      action.item;
  } else {
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.parentIndex
    ].subItemList[action.segmentProps.currentIndex].userDoneEventConditionList[
      action.conditionIndex
    ].conditionOption = action.item;
  }
  return { ...state };
};

const handleUpdateUserDoneEventConditionOperator = (
  state: IEventSegmentationObj,
  action
) => {
  if (action.segmentProps.level === 1) {
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.currentIndex
    ].userDoneEventConditionList[action.conditionIndex].conditionOperator =
      action.operator;
  } else {
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.parentIndex
    ].subItemList[action.segmentProps.currentIndex].userDoneEventConditionList[
      action.conditionIndex
    ].conditionOperator = action.operator;
  }
  return { ...state };
};

const handleUpdateUserDoneEventConditionValue = (
  state: IEventSegmentationObj,
  action
) => {
  if (action.segmentProps.level === 1) {
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.currentIndex
    ].userDoneEventConditionList[action.conditionIndex].conditionValue =
      action.value;
  } else {
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.parentIndex
    ].subItemList[action.segmentProps.currentIndex].userDoneEventConditionList[
      action.conditionIndex
    ].conditionValue = action.value;
  }
  return { ...state };
};

const handleUpdateUserIsParamOption = (
  state: IEventSegmentationObj,
  action
) => {
  let currentData =
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.currentIndex
    ];
  if (action.segmentProps.level === 2) {
    currentData =
      state.subItemList[action.segmentProps.rootIndex].subItemList[
        action.segmentProps.parentIndex
      ].subItemList[action.segmentProps.currentIndex];
  }
  currentData.userIsParamOption = action.paramOption;
  return { ...state };
};

const handleUpdateUserIsOperator = (state: IEventSegmentationObj, action) => {
  let currentData =
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.currentIndex
    ];
  if (action.segmentProps.level === 2) {
    currentData =
      state.subItemList[action.segmentProps.rootIndex].subItemList[
        action.segmentProps.parentIndex
      ].subItemList[action.segmentProps.currentIndex];
  }
  currentData.userISOperator = action.operator;
  return { ...state };
};

const handleUpdateUserIsValue = (state: IEventSegmentationObj, action) => {
  let currentData =
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.currentIndex
    ];
  if (action.segmentProps.level === 2) {
    currentData =
      state.subItemList[action.segmentProps.rootIndex].subItemList[
        action.segmentProps.parentIndex
      ].subItemList[action.segmentProps.currentIndex];
  }
  currentData.userIsValue = action.value;
  return { ...state };
};

const handleAddFilterGroup = (state: IEventSegmentationObj) => {
  state.subItemList.push({ ...DEFAULT_FILTER_GROUP_ITEM });
  return { ...state };
};

const handleRemoveFilterGroup = (state: IEventSegmentationObj, action) => {
  state.subItemList.splice(action.index, 1);
  return { ...state };
};

const handleUpdateFilterGroupName = (state: IEventSegmentationObj, action) => {
  state.subItemList[action.index].groupName = action.name;
  return { ...state };
};

const handleUpdateFilterGroupTimeRange = (
  state: IEventSegmentationObj,
  action
) => {
  state.subItemList[action.index].groupDateRange = action.timeRange;
  return { ...state };
};

const handleAddSequenceDoneEvent = (state: IEventSegmentationObj, action) => {
  const newEvent: IAnalyticsItem = {
    name: '',
    sequenceEventOption: null,
    sequenceEventConditionFilterList: [],
  };
  if (action.segmentProps.level === 1) {
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.currentIndex
    ].sequenceEventList.push(newEvent);
  } else {
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.parentIndex
    ].subItemList[action.segmentProps.currentIndex].sequenceEventList.push(
      newEvent
    );
  }
  return { ...state };
};

const handleUpdateSequenceDoneEvent = (
  state: IEventSegmentationObj,
  action
) => {
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
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.currentIndex
    ].sequenceEventList[action.segmentProps.sequenceEventIndex ?? 0];
  if (action.segmentProps.level === 2) {
    currentData =
      state.subItemList[action.segmentProps.rootIndex].subItemList[
        action.segmentProps.parentIndex
      ].subItemList[action.segmentProps.currentIndex].sequenceEventList[
        action.segmentProps.sequenceEventIndex ?? 0
      ];
  }
  currentData.seqEventEmptyError = '';
  currentData.sequenceEventOption = action.event;
  currentData.sequenceEventAttributeOption = parameterOption;
  currentData.sequenceEventConditionFilterList = [];
  return { ...state };
};

const handleRemoveSequenceDoneEvent = (
  state: IEventSegmentationObj,
  action
) => {
  if (action.segmentProps.level === 1) {
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.currentIndex
    ].sequenceEventList.splice(action.segmentProps.sequenceEventIndex ?? 0, 1);
  } else {
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.parentIndex
    ].subItemList[action.segmentProps.currentIndex].sequenceEventList.splice(
      action.segmentProps.sequenceEventIndex ?? 0,
      1
    );
  }
  return { ...state };
};

const handleUpdateSequenceSessionType = (
  state: IEventSegmentationObj,
  action
) => {
  if (action.segmentProps.level === 1) {
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.currentIndex
    ].userSequenceSession = action.session;
  } else {
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.parentIndex
    ].subItemList[action.segmentProps.currentIndex].userSequenceSession =
      action.session;
  }
  return { ...state };
};

const handleUpdateSequenceFlowType = (state: IEventSegmentationObj, action) => {
  if (action.segmentProps.level === 1) {
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.currentIndex
    ].userSequenceFlow = action.flow;
  } else {
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.parentIndex
    ].subItemList[action.segmentProps.currentIndex].userSequenceFlow =
      action.flow;
  }
  return { ...state };
};

const handleAddSequenceEventFilterCondition = (
  state: IEventSegmentationObj,
  action
) => {
  let currentData =
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.currentIndex
    ].sequenceEventList[action.segmentProps.sequenceEventIndex ?? 0];
  if (action.segmentProps.level === 2) {
    currentData =
      state.subItemList[action.segmentProps.rootIndex].subItemList[
        action.segmentProps.parentIndex
      ].subItemList[action.segmentProps.currentIndex].sequenceEventList[
        action.segmentProps.sequenceEventIndex ?? 0
      ];
  }
  console.info('currentData:', currentData);
  if (!currentData.sequenceEventOption?.value) {
    currentData.seqEventEmptyError = 'analytics:segment.valid.eventEmptyError';
  } else {
    currentData.filterGroupRelationShip = ERelationShip.AND;
    currentData.sequenceEventConditionFilterList?.push({
      ...DEFAULT_CONDITION_DATA,
    });
  }

  return { ...state };
};

const handleChangeSequenceEventFilterConditionRelation = (
  state: IEventSegmentationObj,
  action
) => {
  if (action.segmentProps.level === 1) {
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.currentIndex
    ].sequenceEventList[
      action.segmentProps.sequenceEventIndex ?? 0
    ].filterGroupRelationShip = action.relation;
  } else {
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.parentIndex
    ].subItemList[action.segmentProps.currentIndex].sequenceEventList[
      action.segmentProps.sequenceEventIndex ?? 0
    ].filterGroupRelationShip = action.relation;
  }
  return { ...state };
};

const handleUpdateSequenceEventFilterConditionOption = (
  state: IEventSegmentationObj,
  action
) => {
  if (action.segmentProps.level === 1) {
    const seqConditionList =
      state.subItemList[action.segmentProps.rootIndex].subItemList[
        action.segmentProps.currentIndex
      ].sequenceEventList[action.segmentProps.sequenceEventIndex ?? 0]
        .sequenceEventConditionFilterList;
    if (seqConditionList && seqConditionList.length > 0) {
      seqConditionList[action.sequenceEventConditionIndex].conditionOption =
        action.item;
    }
  } else {
    const seqConditionList =
      state.subItemList[action.segmentProps.rootIndex].subItemList[
        action.segmentProps.parentIndex
      ].subItemList[action.segmentProps.currentIndex].sequenceEventList[
        action.segmentProps.sequenceEventIndex ?? 0
      ].sequenceEventConditionFilterList;
    if (seqConditionList && seqConditionList.length > 0) {
      seqConditionList[action.sequenceEventConditionIndex].conditionOption =
        action.item;
    }
  }
  return { ...state };
};

const handleUpdateSequenceEventFilterConditionOperation = (
  state: IEventSegmentationObj,
  action
) => {
  if (action.segmentProps.level === 1) {
    const seqConditionList =
      state.subItemList[action.segmentProps.rootIndex].subItemList[
        action.segmentProps.currentIndex
      ].sequenceEventList[action.segmentProps.sequenceEventIndex ?? 0]
        .sequenceEventConditionFilterList;
    if (seqConditionList && seqConditionList.length > 0) {
      seqConditionList[action.sequenceEventConditionIndex].conditionOperator =
        action.operator;
    }
  } else {
    const seqConditionList =
      state.subItemList[action.segmentProps.rootIndex].subItemList[
        action.segmentProps.parentIndex
      ].subItemList[action.segmentProps.currentIndex].sequenceEventList[
        action.segmentProps.sequenceEventIndex ?? 0
      ].sequenceEventConditionFilterList;
    if (seqConditionList && seqConditionList.length > 0) {
      seqConditionList[action.sequenceEventConditionIndex].conditionOperator =
        action.operator;
    }
  }
  return { ...state };
};

const handleUpdateSequenceEventFilterConditionValue = (
  state: IEventSegmentationObj,
  action
) => {
  if (action.segmentProps.level === 1) {
    const seqConditionList =
      state.subItemList[action.segmentProps.rootIndex].subItemList[
        action.segmentProps.currentIndex
      ].sequenceEventList[action.segmentProps.sequenceEventIndex ?? 0]
        .sequenceEventConditionFilterList;
    if (seqConditionList && seqConditionList.length > 0) {
      seqConditionList[action.sequenceEventConditionIndex].conditionValue =
        action.value;
    }
  } else {
    const seqConditionList =
      state.subItemList[action.segmentProps.rootIndex].subItemList[
        action.segmentProps.parentIndex
      ].subItemList[action.segmentProps.currentIndex].sequenceEventList[
        action.segmentProps.sequenceEventIndex ?? 0
      ].sequenceEventConditionFilterList;
    if (seqConditionList && seqConditionList.length > 0) {
      seqConditionList[action.sequenceEventConditionIndex].conditionValue =
        action.value;
    }
  }
  return { ...state };
};

const handleRemoveSequenceEventFilterConditionOption = (
  state: IEventSegmentationObj,
  action
) => {
  if (action.segmentProps.level === 1) {
    const seqConditionList =
      state.subItemList[action.segmentProps.rootIndex].subItemList[
        action.segmentProps.currentIndex
      ].sequenceEventList[action.segmentProps.sequenceEventIndex ?? 0]
        .sequenceEventConditionFilterList;
    if (seqConditionList && seqConditionList.length > 0) {
      seqConditionList.splice(action.sequenceEventConditionIndex, 1);
    }
  } else {
    const seqConditionList =
      state.subItemList[action.segmentProps.rootIndex].subItemList[
        action.segmentProps.parentIndex
      ].subItemList[action.segmentProps.currentIndex].sequenceEventList[
        action.segmentProps.sequenceEventIndex ?? 0
      ].sequenceEventConditionFilterList;
    if (seqConditionList && seqConditionList.length > 0) {
      seqConditionList.splice(action.sequenceEventConditionIndex, 1);
    }
  }
  return { ...state };
};

const handleUpdateUserInGroup = (state: IEventSegmentationObj, action) => {
  let currentData =
    state.subItemList[action.segmentProps.rootIndex].subItemList[
      action.segmentProps.currentIndex
    ];
  if (action.segmentProps.level === 2) {
    currentData =
      state.subItemList[action.segmentProps.rootIndex].subItemList[
        action.segmentProps.parentIndex
      ].subItemList[action.segmentProps.currentIndex];
  }
  currentData.groupEmptyError = '';
  currentData.userInFilterGroup = action.group;
  return { ...state };
};

const handleSetEventOption = (state: IEventSegmentationObj, action) => {
  return {
    ...state,
    eventOption: action.eventOption,
    userIsAttributeOptions: action.userIsAttributeOptions,
    userGroupOptions: action.segmentGroupList,
  };
};

const actionHandlers = {
  [AnalyticsSegmentActionType.ResetSegmentData]: handleResetSegmentData,
  [AnalyticsSegmentActionType.SetSegmentData]: handleSetSegmentData,
  [AnalyticsSegmentActionType.ValidateSegmentObject]:
    handleValidateSegmentObject,
  [AnalyticsSegmentActionType.AddOrEventData]: handleAddOrEventData,
  [AnalyticsSegmentActionType.ConvertAndDataToOr]: handleConvertAndDataToOr,
  [AnalyticsSegmentActionType.AddAndEventData]: handleAddAndEventData,
  [AnalyticsSegmentActionType.RemoveEventData]: handleRemoveEventData,
  [AnalyticsSegmentActionType.UpdateUserEventType]: handleUpdateUserEventType,
  [AnalyticsSegmentActionType.UpdateUserDoneEvent]: handleUpdateUserDoneEvent,
  [AnalyticsSegmentActionType.UpdateUserDoneEventCalculate]:
    handleUpdateUserDoneEventCalculate,
  [AnalyticsSegmentActionType.UpdateUserDoneEventOperation]:
    handleUpdateUserDoneEventOperation,
  [AnalyticsSegmentActionType.UpdateUserDoneEventValue]:
    handleUpdateUserDoneEventValue,
  [AnalyticsSegmentActionType.AddEventFilterCondition]:
    handleAddEventFilterCondition,
  [AnalyticsSegmentActionType.ChangeEventFilterConditionRelation]:
    handleChangeEventFilterConditionRelation,
  [AnalyticsSegmentActionType.UpdateUserDoneEventConditionItem]:
    handleUpdateUserDoneEventConditionItem,
  [AnalyticsSegmentActionType.UpdateUserDoneEventConditionOperator]:
    handleUpdateUserDoneEventConditionOperator,
  [AnalyticsSegmentActionType.UpdateUserDoneEventConditionValue]:
    handleUpdateUserDoneEventConditionValue,
  [AnalyticsSegmentActionType.RemoveUserDoneEventConditionItem]:
    handleRemoveUserDoneEventConditionItem,
  [AnalyticsSegmentActionType.UpdateUserIsParamOption]:
    handleUpdateUserIsParamOption,
  [AnalyticsSegmentActionType.UpdateUserIsOperator]: handleUpdateUserIsOperator,
  [AnalyticsSegmentActionType.UpdateUserIsValue]: handleUpdateUserIsValue,
  [AnalyticsSegmentActionType.AddFilterGroup]: handleAddFilterGroup,
  [AnalyticsSegmentActionType.RemoveFilterGroup]: handleRemoveFilterGroup,
  [AnalyticsSegmentActionType.UpdateFilterGroupName]:
    handleUpdateFilterGroupName,
  [AnalyticsSegmentActionType.UpdateFilterGroupTimeRange]:
    handleUpdateFilterGroupTimeRange,
  [AnalyticsSegmentActionType.AddSequenceDoneEvent]: handleAddSequenceDoneEvent,
  [AnalyticsSegmentActionType.UpdateSequenceDoneEvent]:
    handleUpdateSequenceDoneEvent,
  [AnalyticsSegmentActionType.RemoveSequenceDoneEvent]:
    handleRemoveSequenceDoneEvent,
  [AnalyticsSegmentActionType.UpdateSequenceSessionType]:
    handleUpdateSequenceSessionType,
  [AnalyticsSegmentActionType.UpdateSequenceFlowType]:
    handleUpdateSequenceFlowType,
  [AnalyticsSegmentActionType.AddSequenceEventFilterCondition]:
    handleAddSequenceEventFilterCondition,
  [AnalyticsSegmentActionType.ChangeSequenceEventFilterConditionRelation]:
    handleChangeSequenceEventFilterConditionRelation,
  [AnalyticsSegmentActionType.UpdateSequenceEventFilterConditionOption]:
    handleUpdateSequenceEventFilterConditionOption,
  [AnalyticsSegmentActionType.UpdateSequenceEventFilterConditionOperation]:
    handleUpdateSequenceEventFilterConditionOperation,
  [AnalyticsSegmentActionType.UpdateSequenceEventFilterConditionValue]:
    handleUpdateSequenceEventFilterConditionValue,
  [AnalyticsSegmentActionType.RemoveSequenceEventFilterConditionOption]:
    handleRemoveSequenceEventFilterConditionOption,
  [AnalyticsSegmentActionType.UpdateUserInGroup]: handleUpdateUserInGroup,
  [AnalyticsSegmentActionType.SetEventOption]: handleSetEventOption,
};

export const analyticsSegmentGroupReducer = (
  state: IEventSegmentationObj,
  action: AnalyticsSegmentAction
): IEventSegmentationObj => {
  const newState = cloneDeep(state);
  const handler = actionHandlers[action.type];
  if (handler) {
    return handler(newState, action as any);
  }
  return newState;
};
