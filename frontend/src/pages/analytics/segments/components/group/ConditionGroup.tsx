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

import { Button } from '@cloudscape-design/components';
import {
  ERelationShip,
  IEventSegmentationItem,
  INIT_SEGMENTATION_DATA,
} from 'components/eventselect/AnalyticsType';
import AnalyticsSegmentFilter from 'components/eventselect/reducer/AnalyticsSegmentFilter';
import { analyticsSegmentFilterReducer } from 'components/eventselect/reducer/analyticsSegmentFilterReducer';
import {
  AnalyticsSegmentAction,
  AnalyticsSegmentActionType,
} from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import React, { Dispatch, useEffect, useReducer, useState } from 'react';
import Condition from './Condition';
import { ConditionType, PRESET_PARAMETERS } from './mock_data';
import UserDoneComp from './type/UserDoneComp';

export interface SegmentPropsData {
  level: number;
  rootIndex: number;
  parentIndex: number;
  currentIndex: number;
  parentData: IEventSegmentationItem;
}

interface ConditionGroupProps {
  segmentData: IEventSegmentationItem;
  segmentDataDispatch: Dispatch<AnalyticsSegmentAction>;
  segmentProps: SegmentPropsData;
}

const ConditionGroup: React.FC<ConditionGroupProps> = (
  props: ConditionGroupProps
) => {
  const { segmentDataDispatch, segmentProps, segmentData } = props;
  const [conditionWidth, setConditionWidth] = useState(0);
  const [filterOptionData, filterOptionDataDispatch] = useReducer(
    analyticsSegmentFilterReducer,
    {
      ...INIT_SEGMENTATION_DATA,
      conditionOptions: PRESET_PARAMETERS,
    }
  );

  useEffect(() => {
    console.info('filterOptionData:', filterOptionData);
  }, [filterOptionData]);

  return (
    <div className="analytics-segment-group-item">
      <div className="flex flex-1 gap-5">
        <Condition
          segmentData={segmentData}
          segmentDataDispatch={segmentDataDispatch}
          updateConditionWidth={setConditionWidth}
          segmentProps={segmentProps}
        />

        {(segmentData.userEventType?.value === ConditionType.USER_DONE ||
          segmentData.userEventType?.value === ConditionType.USER_NOT_DONE) && (
          <UserDoneComp
            segmentData={segmentData}
            segmentDataDispatch={segmentDataDispatch}
            level={segmentProps.level}
            rootIndex={segmentProps.rootIndex}
            parentIndex={segmentProps.parentIndex}
            currentIndex={segmentProps.currentIndex}
            parentData={segmentProps.parentData}
            addNewEventCondition={() => {
              segmentDataDispatch({
                type: AnalyticsSegmentActionType.AddEventFilterCondition,
                segmentProps,
              });
            }}
          />
        )}

        {(segmentData.userEventType?.value === ConditionType.USER_IS ||
          segmentData.userEventType?.value === ConditionType.USER_IS_NOT) && (
          <div style={{ marginTop: -10 }}>
            {/* <AnalyticsSegmentFilter
              hideAddButton
              filterDataState={filterOptionData}
              filterDataDispatch={filterOptionDataDispatch}
            /> */}
          </div>
        )}

        <div>
          {segmentProps.level === 1 &&
            segmentProps.parentData.segmentEventRelationShip ===
              ERelationShip.AND && (
              <Button
                iconName="add-plus"
                onClick={() => {
                  segmentDataDispatch({
                    type: AnalyticsSegmentActionType.ConvertAndDataToOr,
                    segmentProps,
                  });
                }}
              >
                Or
              </Button>
            )}
          {segmentProps.parentData.segmentEventRelationShip ===
            ERelationShip.OR &&
            segmentProps.currentIndex ===
              segmentProps.parentData.subItemList.length - 1 && (
              <Button
                iconName="add-plus"
                onClick={() => {
                  segmentDataDispatch({
                    type: AnalyticsSegmentActionType.AddOrEventData,
                    segmentProps,
                  });
                }}
              >
                Or
              </Button>
            )}
        </div>

        <div className="segment-remove-icon">
          {!(
            segmentProps.level === 1 &&
            segmentProps.parentData.subItemList.length === 1 &&
            segmentProps.currentIndex ===
              segmentProps.parentData.subItemList.length - 1
          ) && (
            <Button
              iconName="close"
              variant="link"
              onClick={() => {
                segmentDataDispatch({
                  type: AnalyticsSegmentActionType.RemoveEventData,
                  segmentProps,
                });
              }}
            />
          )}
        </div>
      </div>
      <div
        className="cs-analytics-second-condition"
        style={{
          left: conditionWidth + 10,
          maxWidth: `calc(100% - ${conditionWidth + 25}px)`,
        }}
      >
        {segmentData.eventConditionList &&
          segmentData.eventConditionList.length > 0 && (
            <AnalyticsSegmentFilter
              hideAddButton
              filterDataState={{
                conditionOptions: filterOptionData.conditionOptions,
                conditionRelationShip:
                  segmentData.eventConditionRelationShip ?? ERelationShip.AND,
                data: segmentData.eventConditionList,
              }}
              filterDataDispatch={filterOptionDataDispatch}
              segmentProps={segmentProps}
              addSegmentCondition={(segmentProps: SegmentPropsData) => {
                segmentDataDispatch({
                  type: AnalyticsSegmentActionType.AddEventFilterCondition,
                  segmentProps,
                });
              }}
            />
          )}
      </div>
    </div>
  );
};

export default ConditionGroup;
