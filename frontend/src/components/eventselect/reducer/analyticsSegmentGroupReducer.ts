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
import {
  DEFAULT_SEGMENT_GROUP_DATA,
  DEFAULT_SEGMENT_ITEM,
} from 'pages/analytics/segments/components/group/mock_data';
import {
  ERelationShip,
  IAnalyticsItem,
  IEventSegmentationItem,
  IEventSegmentationObj,
} from '../AnalyticsType';

export enum AnalyticsSegmentActionType {
  ResetSegmentData = 'resetSegmentData',
  AddOrEventData = 'addOrEventData',
  ConvertAndDataToOr = 'convertAndDataToOr',
  AddAndEventData = 'addAndEventData',
  UpdateUserEventType = 'updateUserEventType',
}

export type ResetEventData = {
  type: AnalyticsSegmentActionType.ResetSegmentData;
};

export type AddOrEventData = {
  type: AnalyticsSegmentActionType.AddOrEventData;
  level: number;
  rootIndex: number;
  parentIndex: number;
  parentData: IEventSegmentationItem;
};

export type ConvertAndDataToOr = {
  type: AnalyticsSegmentActionType.ConvertAndDataToOr;
  level: number;
  rootIndex: number;
  parentIndex: number;
  parentData: IEventSegmentationItem;
  currentIndex: number;
};

export type AddAndEventData = {
  type: AnalyticsSegmentActionType.AddAndEventData;
};

export type UpdateUserEventType = {
  type: AnalyticsSegmentActionType.UpdateUserEventType;
  level: number;
  rootIndex: number;
  parentIndex: number;
  currentIndex: number;
  userEventType: IAnalyticsItem;
};

export type AnalyticsSegmentAction =
  | ResetEventData
  | AddOrEventData
  | ConvertAndDataToOr
  | AddAndEventData
  | UpdateUserEventType;

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
      if (action.level === 1) {
        console.info('newState:', newState);
        newState.subItemList[action.rootIndex].subItemList.push(
          DEFAULT_SEGMENT_ITEM
        );
      } else if (action.level === 2) {
        newState.subItemList[action.rootIndex].subItemList[
          action.parentIndex
        ].subItemList.push(DEFAULT_SEGMENT_ITEM);
      }
      return { ...newState };
    }

    case AnalyticsSegmentActionType.ConvertAndDataToOr: {
      console.info('newState:', newState);
      console.info('action.level:', action.level);
      console.info('action.rootIndex:', action.rootIndex);
      console.info('action.parentData:', action.parentData);
      console.info('action.parentIndex:', action.parentIndex);
      console.info('action.currentIndex:', action.currentIndex);
      console.info(
        newState.subItemList[action.rootIndex].subItemList[action.parentIndex]
      );
      newState.subItemList[action.rootIndex].subItemList[action.currentIndex] =
        {
          userEventType: null,
          conditionRelationShip: ERelationShip.OR,
          subItemList: [
            { ...DEFAULT_SEGMENT_ITEM },
            { ...DEFAULT_SEGMENT_ITEM },
          ],
        };
      // newState.subItemList[action.rootIndex].subItemList[action.parentIndex] = {
      //   userEventType: null,
      //   conditionRelationShip: ERelationShip.OR,
      //   subItemList: [
      //     {
      //       ...action.parentData[action.currentIndex],
      //     },
      //     DEFAULT_SEGMENT_ITEM,
      //   ],
      // };
      return { ...newState };
    }
    case AnalyticsSegmentActionType.UpdateUserEventType:
      console.info('update user event type');
      // newState.subItemList[action.rootIndex]?.
      if (action.level === 1) {
        newState.subItemList[action.rootIndex].subItemList[
          action.currentIndex
        ].userEventType = action.userEventType;
      } else if (action.level === 2) {
        newState.subItemList[action.rootIndex].subItemList[
          action.parentIndex
        ].subItemList[action.currentIndex].userEventType = action.userEventType;
      }
      return { ...newState };
    default:
      return state;
  }
};
