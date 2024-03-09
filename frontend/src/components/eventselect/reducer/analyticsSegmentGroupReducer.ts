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

import cloneDeep from 'lodash/cloneDeep';
import { SegmentPropsData } from 'pages/analytics/segments/components/group/ConditionGroup';
import {
  DEFAULT_FILTER_GROUP_ITEM,
  DEFAULT_SEGMENT_GROUP_DATA,
  DEFAULT_SEGMENT_ITEM,
} from 'pages/analytics/segments/components/group/mock_data';
import {
  DEFAULT_CONDITION_DATA,
  ERelationShip,
  IAnalyticsItem,
  IEventSegmentationObj,
  SegmentationFilterDataType,
} from '../AnalyticsType';

export enum AnalyticsSegmentActionType {
  ResetSegmentData = 'resetSegmentData',
  AddOrEventData = 'addOrEventData',
  ConvertAndDataToOr = 'convertAndDataToOr',
  AddAndEventData = 'addAndEventData',
  RemoveEventData = 'removeEventData',
  UpdateUserEventType = 'updateUserEventType',
  AddFilterGroup = 'addFilterGroup',
  RemoveFilterGroup = 'removeFilterGroup',
  AddEventFilterCondition = 'addEventFilterCondition',
  UpdateEventFilterCondition = 'updateEventFilterCondition',
}

export type ResetEventData = {
  type: AnalyticsSegmentActionType.ResetSegmentData;
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

export type AddFilterGroup = {
  type: AnalyticsSegmentActionType.AddFilterGroup;
};

export type RemoveFilterGroup = {
  type: AnalyticsSegmentActionType.RemoveFilterGroup;
  index: number;
};

export type UpdateUserEventType = {
  type: AnalyticsSegmentActionType.UpdateUserEventType;
  segmentProps: SegmentPropsData;
  userEventType: IAnalyticsItem;
};

export type AddEventFilterCondition = {
  type: AnalyticsSegmentActionType.AddEventFilterCondition;
  segmentProps: SegmentPropsData;
};

export type UpdateEventFilterCondition = {
  type: AnalyticsSegmentActionType.UpdateEventFilterCondition;
  segmentProps: SegmentPropsData;
  conditionList: SegmentationFilterDataType;
};

export type AnalyticsSegmentAction =
  | ResetEventData
  | AddOrEventData
  | ConvertAndDataToOr
  | AddAndEventData
  | RemoveEventData
  | AddFilterGroup
  | RemoveFilterGroup
  | UpdateUserEventType
  | AddEventFilterCondition
  | UpdateEventFilterCondition;

export type AnalyticsDispatchFunction = (
  action: AnalyticsSegmentAction
) => void;

export const analyticsSegmentGroupReducer = (
  state: IEventSegmentationObj,
  action: AnalyticsSegmentAction
): IEventSegmentationObj => {
  const newState = cloneDeep(state);
  switch (action.type) {
    case AnalyticsSegmentActionType.ResetSegmentData: {
      return { ...DEFAULT_SEGMENT_GROUP_DATA };
    }

    case AnalyticsSegmentActionType.AddOrEventData: {
      if (action.segmentProps.level === 1) {
        console.info('newState:', newState);
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
        eventConditionList: [],
        subItemList: [
          { ...currentData }, // TODO, replace to current data
          { ...DEFAULT_SEGMENT_ITEM },
        ],
      };
      return { ...newState };
    }

    case AnalyticsSegmentActionType.AddAndEventData: {
      if (
        newState.subItemList[action.rootIndex].segmentEventRelationShip ===
        ERelationShip.OR
      ) {
        newState.subItemList[action.rootIndex] = {
          userEventType: null,
          segmentEventRelationShip: ERelationShip.AND,
          eventConditionList: [],
          subItemList: [
            { ...newState.subItemList[action.rootIndex] },
            { ...DEFAULT_SEGMENT_ITEM },
          ],
        };
      } else {
        newState.subItemList[action.rootIndex].subItemList.push(
          DEFAULT_SEGMENT_ITEM
        );
      }
      return { ...newState };
    }

    case AnalyticsSegmentActionType.RemoveEventData: {
      console.info('remove event data');
      if (action.segmentProps.level === 1) {
        newState.subItemList[action.segmentProps.rootIndex].subItemList.splice(
          action.segmentProps.currentIndex,
          1
        );
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

    case AnalyticsSegmentActionType.AddFilterGroup: {
      newState.subItemList.push({ ...DEFAULT_FILTER_GROUP_ITEM });
      return { ...newState };
    }

    case AnalyticsSegmentActionType.RemoveFilterGroup: {
      newState.subItemList.splice(action.index, 1);
      return { ...newState };
    }

    case AnalyticsSegmentActionType.UpdateUserEventType: {
      console.info('update user event type');
      if (action.segmentProps.level === 1) {
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.currentIndex
        ].userEventType = action.userEventType;
      } else if (action.segmentProps.level === 2) {
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.parentIndex
        ].subItemList[action.segmentProps.currentIndex].userEventType =
          action.userEventType;
      }
      return { ...newState };
    }

    case AnalyticsSegmentActionType.AddEventFilterCondition: {
      if (action.segmentProps.level === 1) {
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.currentIndex
        ].eventConditionList.push({ ...DEFAULT_CONDITION_DATA });
      } else {
        newState.subItemList[action.segmentProps.rootIndex].subItemList[
          action.segmentProps.parentIndex
        ].subItemList[action.segmentProps.currentIndex].eventConditionList.push(
          {
            ...DEFAULT_CONDITION_DATA,
          }
        );
      }
      return { ...newState };
    }

    case AnalyticsSegmentActionType.UpdateEventFilterCondition: {
      // console.info(action);
      if (action.segmentProps.level === 1) {
        // TODO
        // newState.subItemList[action.rootIndex].subItemList[
        //   action.currentIndex
        // ] = action.conditionList;
      }
      // if (action.level === 1) {
      //   newState.subItemList[action.rootIndex].subItemList[
      //     action.currentIndex
      //   ].eventConditionList = action.conditionList;
      // } else if (action.level === 2) {
      //   newState.subItemList[action.rootIndex].subItemList[
      //     action.parentIndex
      //   ].subItemList[action.currentIndex].eventConditionList =
      //     action.conditionList;
      // }
      return { ...newState };
    }
    default:
      return state;
  }
};
