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
import { identity } from 'lodash';
import React, { Dispatch, useMemo, useReducer, useState } from 'react';
import Condition from './Condition';
import EventSeqItem from './EventSeqItem';
import { ConditionType, PRESET_PARAMETERS } from './mock_data';
import UserDoneComp from './type/UserDoneComp';
import UserDoneInSeq from './type/UserDoneInSeq';
import UserIsComp from './type/UserIsComp';

export interface SegmentPropsData {
  level: number;
  rootIndex: number;
  parentIndex: number;
  currentIndex: number;
  parentData: IEventSegmentationItem;
  sequenceEventIndex?: number;
  sequenceConditionIndex?: number;
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

  const isDoneEvent = useMemo(() => {
    return (
      segmentData.userEventType?.value === ConditionType.USER_DONE ||
      segmentData.userEventType?.value === ConditionType.USER_NOT_DONE
    );
  }, [segmentData.userEventType?.value]);

  const isUserIsEvent = useMemo(() => {
    return (
      segmentData.userEventType?.value === ConditionType.USER_IS ||
      segmentData.userEventType?.value === ConditionType.USER_IS_NOT
    );
  }, [segmentData.userEventType?.value]);

  const isDoneInSeqEvent = useMemo(() => {
    return (
      segmentData.userEventType?.value === ConditionType.USER_DONE_IN_SEQUENCE
    );
  }, [segmentData.userEventType?.value]);

  return (
    <div className="analytics-segment-group-item">
      <div className="flex flex-1 gap-5">
        <Condition
          segmentData={segmentData}
          segmentDataDispatch={segmentDataDispatch}
          updateConditionWidth={setConditionWidth}
          segmentProps={segmentProps}
        />

        {isDoneEvent && (
          <UserDoneComp
            segmentData={segmentData}
            segmentDataDispatch={segmentDataDispatch}
            segmentProps={segmentProps}
            addNewEventCondition={() => {
              segmentDataDispatch({
                type: AnalyticsSegmentActionType.AddEventFilterCondition,
                segmentProps,
              });
            }}
          />
        )}
        {isUserIsEvent && <UserIsComp />}
        {isDoneInSeqEvent && (
          <UserDoneInSeq
            segmentProps={segmentProps}
            segmentDataDispatch={segmentDataDispatch}
          />
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

      {isDoneEvent && (
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
                  enableChangeRelation: true,
                  conditionOptions: filterOptionData.conditionOptions,
                  conditionRelationShip:
                    segmentData.eventConditionRelationShip ?? ERelationShip.AND,
                  data: segmentData.eventConditionList,
                }}
                filterDataDispatch={filterOptionDataDispatch}
                addSegmentCondition={() => {
                  segmentDataDispatch({
                    type: AnalyticsSegmentActionType.AddEventFilterCondition,
                    segmentProps,
                  });
                }}
                changeSegmentConditionRelation={(relation) => {
                  segmentDataDispatch({
                    type: AnalyticsSegmentActionType.ChangeEventFilterConditionRelation,
                    segmentProps,
                    relation,
                  });
                }}
              />
            )}
        </div>
      )}

      {isDoneInSeqEvent && (
        <div className="flex-v gap-5">
          {segmentData.sequenceEventList.map((item, index) => {
            return (
              <EventSeqItem
                key={identity(index)}
                sequenceEventIndex={index}
                segmentData={segmentData}
                sequenceEventData={item}
                conditionWidth={conditionWidth}
                segmentDataDispatch={segmentDataDispatch}
                segmentProps={segmentProps}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ConditionGroup;
