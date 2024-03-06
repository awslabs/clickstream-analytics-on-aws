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
import { DEFAULT_SEGMENT_GROUP_DATA } from 'pages/analytics/segments/components/group/mock_data';
import { IEventSegmentationItem } from '../AnalyticsType';

export enum AnalyticsSegmentActionType {
  ResetSegmentData = 'resetSegmentData',
  AddOrEventData = 'addOrEventData',
  AddAndEventData = 'addAndEventData',
}

export type ResetEventData = {
  type: AnalyticsSegmentActionType.ResetSegmentData;
};

export type AddOrEventData = {
  type: AnalyticsSegmentActionType.AddOrEventData;
  level: number;
  parentIndex: number;
};

export type AddAndEventData = {
  type: AnalyticsSegmentActionType.AddAndEventData;
};

export type AnalyticsSegmentAction =
  | ResetEventData
  | AddOrEventData
  | AddAndEventData;

export type AnalyticsDispatchFunction = (
  action: AnalyticsSegmentAction
) => void;

export const analyticsSegmentGroupReducer = (
  state: IEventSegmentationItem,
  action: AnalyticsSegmentAction
): IEventSegmentationItem => {
  const newState = cloneDeep(state);
  switch (action.type) {
    case AnalyticsSegmentActionType.ResetSegmentData:
      return { ...DEFAULT_SEGMENT_GROUP_DATA };
    case AnalyticsSegmentActionType.AddOrEventData:
      console.info('newState:', newState);
      console.info('action.level:', action.level);
      console.info('action.parentIndex:', action.parentIndex);
      if (action.level === 1) {
        console.info('newState:', newState);
      }
      return { ...newState };
    default:
      return state;
  }
};
