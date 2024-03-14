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

import { ERelationShip } from 'components/eventselect/AnalyticsType';
import {
  analyticsSegmentGroupReducer,
  AnalyticsSegmentAction,
  AnalyticsSegmentActionType,
} from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import {
  CONDITION_LIST,
  ConditionType,
  DEFAULT_SEGMENT_GROUP_DATA,
} from 'ts/const';
import {
  CONDITION_STRING_OPERATORS,
  FILTER_GROUP_LIST,
  MOCK_EVENT_LIST,
  MULTI_LEVEL_SELECT_OPTIONS,
  PRESET_PARAMETERS,
} from '../segments/data/mock_data';

describe('analyticsSegmentGroupReducer', () => {
  it('should handle ResetSegmentData action', () => {
    const initialState = { ...DEFAULT_SEGMENT_GROUP_DATA };
    const action: AnalyticsSegmentAction = {
      type: AnalyticsSegmentActionType.ResetSegmentData,
    };
    const newState = analyticsSegmentGroupReducer(initialState, action);
    expect(newState.subItemList.length === 1);
  });

  it('should handle setSegmentData action', () => {
    const initialState = { ...DEFAULT_SEGMENT_GROUP_DATA };
    const action: AnalyticsSegmentAction = {
      type: AnalyticsSegmentActionType.SetSegmentData,
      segmentData: {
        filterGroupRelationShip: ERelationShip.AND,
        subItemList: [],
        eventOption: [],
        eventCalculateMethodOption: [],
        conditionOptions: [],
        eventOperationOptions: [],
        attributeOptions: [],
        attributeOperationOptions: [],
        userGroupOptions: [],
      },
    };
    const newState = analyticsSegmentGroupReducer(initialState, action);
    expect(newState.subItemList.length).toBe(0);
  });

  it('should handle AddOrEventData action', () => {
    const initialState = { ...DEFAULT_SEGMENT_GROUP_DATA };
    const action: AnalyticsSegmentAction = {
      type: AnalyticsSegmentActionType.AddOrEventData,
      segmentProps: {
        rootIndex: 0,
        parentIndex: 0,
        level: 1,
        currentIndex: 0,
        parentData: {} as any,
      },
    };
    const newState = analyticsSegmentGroupReducer(initialState, action);
    expect(newState.subItemList[0].subItemList.length).toBe(2);
  });

  it('should handle ConvertAndDataToOr action', () => {
    const initialState = { ...DEFAULT_SEGMENT_GROUP_DATA };
    const action: AnalyticsSegmentAction = {
      type: AnalyticsSegmentActionType.ConvertAndDataToOr,
      segmentProps: {
        rootIndex: 0,
        parentIndex: 0,
        level: 1,
        currentIndex: 0,
        parentData: {} as any,
      },
    };
    const newState = analyticsSegmentGroupReducer(initialState, action);
    expect(newState.subItemList[0].segmentEventRelationShip).toBe(
      ERelationShip.OR
    );
  });

  it('should handle AddEventData action', () => {
    const initialState = { ...DEFAULT_SEGMENT_GROUP_DATA };
    const action: AnalyticsSegmentAction = {
      type: AnalyticsSegmentActionType.AddAndEventData,
      rootIndex: 0,
    };
    const newState = analyticsSegmentGroupReducer(initialState, action);
    expect(newState.subItemList[0].subItemList.length).toBe(2);
  });

  it('should handle RemoveEventData action', () => {
    const initialState = { ...DEFAULT_SEGMENT_GROUP_DATA };
    const action: AnalyticsSegmentAction = {
      type: AnalyticsSegmentActionType.RemoveEventData,
      segmentProps: {
        rootIndex: 0,
        parentIndex: 0,
        level: 1,
        currentIndex: 0,
        parentData: {} as any,
      },
    };
    const newState = analyticsSegmentGroupReducer(initialState, action);
    expect(newState.subItemList[0].subItemList.length).toBe(0);
  });

  it('should handle UpdateUserEventType action', () => {
    const initialState = { ...DEFAULT_SEGMENT_GROUP_DATA };
    const action: AnalyticsSegmentAction = {
      type: AnalyticsSegmentActionType.UpdateUserEventType,
      segmentProps: {
        rootIndex: 0,
        parentIndex: 0,
        level: 1,
        currentIndex: 0,
        parentData: {} as any,
      },
      userEventType: CONDITION_LIST[0],
    };
    const newState = analyticsSegmentGroupReducer(initialState, action);
    expect(newState.subItemList[0].subItemList[0].userEventType?.value).toBe(
      ConditionType.USER_DONE
    );
  });

  it('should handle UpdateUserDoneEvent action', () => {
    const initialState = { ...DEFAULT_SEGMENT_GROUP_DATA };
    const action: AnalyticsSegmentAction = {
      type: AnalyticsSegmentActionType.UpdateUserDoneEvent,
      segmentProps: {
        rootIndex: 0,
        parentIndex: 0,
        level: 1,
        currentIndex: 0,
        parentData: {} as any,
      },
      event: MOCK_EVENT_LIST[0].itemList[0],
    };
    const newState = analyticsSegmentGroupReducer(initialState, action);
    expect(newState.subItemList[0].subItemList[0].userDoneEvent?.value).toBe(
      'test003_paqf#shopping#_app_start'
    );
  });

  it('should handle UpdateUserDoneEventCalculate action', () => {
    const initialState = { ...DEFAULT_SEGMENT_GROUP_DATA };
    const action: AnalyticsSegmentAction = {
      type: AnalyticsSegmentActionType.UpdateUserDoneEventCalculate,
      segmentProps: {
        rootIndex: 0,
        parentIndex: 0,
        level: 1,
        currentIndex: 0,
        parentData: {} as any,
      },
      calculate: MULTI_LEVEL_SELECT_OPTIONS[0],
    };
    const newState = analyticsSegmentGroupReducer(initialState, action);
    expect(
      newState.subItemList[0].subItemList[0].userDoneEventCalculateMethod?.value
    ).toBe('EVENT_CNT');
  });

  it('should handle UpdateUserDoneEventOperation action', () => {
    const initialState = { ...DEFAULT_SEGMENT_GROUP_DATA };
    const action: AnalyticsSegmentAction = {
      type: AnalyticsSegmentActionType.UpdateUserDoneEventOperation,
      segmentProps: {
        rootIndex: 0,
        parentIndex: 0,
        level: 1,
        currentIndex: 0,
        parentData: {} as any,
      },
      operation: CONDITION_STRING_OPERATORS[0],
    };
    const newState = analyticsSegmentGroupReducer(initialState, action);
    expect(
      newState.subItemList[0].subItemList[0].userDoneEventOperation?.value
    ).toBe('>');
  });

  it('should handle UpdateUserDoneEventValue action', () => {
    const initialState = { ...DEFAULT_SEGMENT_GROUP_DATA };
    const action: AnalyticsSegmentAction = {
      type: AnalyticsSegmentActionType.UpdateUserDoneEventValue,
      segmentProps: {
        rootIndex: 0,
        parentIndex: 0,
        level: 1,
        currentIndex: 0,
        parentData: {} as any,
      },
      value: 10,
    };
    const newState = analyticsSegmentGroupReducer(initialState, action);
    expect(newState.subItemList[0].subItemList[0].userDoneEventValue).toBe(10);
  });

  it('should handle UpdateUserIsParamOption', () => {
    const initialState = { ...DEFAULT_SEGMENT_GROUP_DATA };
    const action: AnalyticsSegmentAction = {
      type: AnalyticsSegmentActionType.UpdateUserIsParamOption,
      segmentProps: {
        rootIndex: 0,
        parentIndex: 0,
        level: 1,
        currentIndex: 0,
        parentData: {} as any,
      },
      paramOption: PRESET_PARAMETERS[0].itemList[0],
    };
    const newState = analyticsSegmentGroupReducer(initialState, action);
    expect(
      newState.subItemList[0].subItemList[0].userIsParamOption?.value
    ).toBe('new1203_mggt#app1#other#event_timestamp#int');
  });

  it('should handle AddFilterGroup action', () => {
    const initialState = { ...DEFAULT_SEGMENT_GROUP_DATA };
    const action: AnalyticsSegmentAction = {
      type: AnalyticsSegmentActionType.AddFilterGroup,
    };
    const newState = analyticsSegmentGroupReducer(initialState, action);
    expect(newState.subItemList.length).toBe(2);
  });

  it('should handle RemoveFilterGroup action', () => {
    const initialState = { ...DEFAULT_SEGMENT_GROUP_DATA };
    const action: AnalyticsSegmentAction = {
      type: AnalyticsSegmentActionType.RemoveFilterGroup,
      index: 0,
    };
    const newState = analyticsSegmentGroupReducer(initialState, action);
    expect(newState.subItemList.length).toBe(0);
  });

  it('should handle UpdateUserInGroupType action', () => {
    const initialState = { ...DEFAULT_SEGMENT_GROUP_DATA };
    const action: AnalyticsSegmentAction = {
      type: AnalyticsSegmentActionType.UpdateUserInGroup,
      segmentProps: {
        rootIndex: 0,
        parentIndex: 0,
        level: 1,
        currentIndex: 0,
        parentData: {} as any,
      },
      group: FILTER_GROUP_LIST[0],
    };
    const newState = analyticsSegmentGroupReducer(initialState, action);
    expect(
      newState.subItemList[0].subItemList[0].userInFilterGroup?.value
    ).toBe('user_group_1');
  });
});
