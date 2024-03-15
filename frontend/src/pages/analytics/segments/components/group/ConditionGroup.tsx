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
import { AnalyticsSegmentActionType } from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import { useSegmentContext } from 'context/SegmentContext';
import { identity } from 'lodash';
import React, { useEffect, useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConditionType } from 'ts/const';
import Condition from './Condition';
import EventSeqItem from './EventSeqItem';
import UserDoneComp from './type/UserDoneComp';
import UserDoneInSeq from './type/UserDoneInSeq';
import UserInGroup from './type/UserInGroup';
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

enum EventTypes {
  UserDoneEvent = 'userDoneEvent',
  UserIsEvent = 'userIsEvent',
  UserDoneInSeqEvent = 'userDoneInSeqEvent',
  UserInGroup = 'userInGroup',
}

interface ConditionGroupProps {
  segmentData: IEventSegmentationItem;
  segmentProps: SegmentPropsData;
}

const ConditionGroup: React.FC<ConditionGroupProps> = (
  props: ConditionGroupProps
) => {
  const { t } = useTranslation();
  const { segmentProps, segmentData } = props;
  const { segmentDataState, segmentDataDispatch } = useSegmentContext();
  const [eventType, setEventType] = useState(EventTypes.UserDoneEvent);

  const [conditionWidth, setConditionWidth] = useState(0);
  const [filterOptionData, filterOptionDataDispatch] = useReducer(
    analyticsSegmentFilterReducer,
    {
      ...INIT_SEGMENTATION_DATA,
      conditionOptions: segmentDataState.attributeOptions,
    }
  );

  useEffect(() => {
    if (
      segmentData.userEventType?.value === ConditionType.USER_DONE ||
      segmentData.userEventType?.value === ConditionType.USER_NOT_DONE
    ) {
      setEventType(EventTypes.UserDoneEvent);
    } else if (
      segmentData.userEventType?.value === ConditionType.USER_IS ||
      segmentData.userEventType?.value === ConditionType.USER_IS_NOT
    ) {
      setEventType(EventTypes.UserIsEvent);
    } else if (
      segmentData.userEventType?.value === ConditionType.USER_DONE_IN_SEQUENCE
    ) {
      setEventType(EventTypes.UserDoneInSeqEvent);
    } else if (
      segmentData.userEventType?.value === ConditionType.USER_IN_GROUP ||
      segmentData.userEventType?.value === ConditionType.USER_NOT_IN_GROUP
    ) {
      setEventType(EventTypes.UserDoneEvent);
    }
  }, [segmentData.userEventType?.value]);

  return (
    <div className="analytics-segment-group-item">
      <div className="flex flex-1 gap-5">
        <Condition
          segmentData={segmentData}
          updateConditionWidth={setConditionWidth}
          segmentProps={segmentProps}
        />

        {eventType === EventTypes.UserDoneEvent && (
          <UserDoneComp
            segmentData={segmentData}
            segmentProps={segmentProps}
            addNewEventCondition={() => {
              segmentDataDispatch({
                type: AnalyticsSegmentActionType.AddEventFilterCondition,
                segmentProps,
              });
            }}
          />
        )}
        {eventType === EventTypes.UserIsEvent && (
          <UserIsComp segmentData={segmentData} segmentProps={segmentProps} />
        )}
        {eventType === EventTypes.UserDoneInSeqEvent && (
          <UserDoneInSeq
            segmentData={segmentData}
            segmentProps={segmentProps}
          />
        )}
        {eventType === EventTypes.UserInGroup && (
          <UserInGroup segmentData={segmentData} segmentProps={segmentProps} />
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
                {t('button.or')}
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
                {t('button.or')}
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

      {eventType === EventTypes.UserDoneEvent && (
        <div
          className="cs-analytics-second-condition"
          style={{
            left: conditionWidth + 10,
            maxWidth: `calc(100% - ${conditionWidth + 25}px)`,
          }}
        >
          {segmentData.userDoneEventConditionList &&
            segmentData.userDoneEventConditionList.length > 0 && (
              <AnalyticsSegmentFilter
                hideAddButton
                filterDataState={{
                  enableChangeRelation: true,
                  conditionOptions: filterOptionData.conditionOptions,
                  conditionRelationShip:
                    segmentData.eventConditionRelationShip ?? ERelationShip.AND,
                  data: segmentData.userDoneEventConditionList,
                }}
                filterDataDispatch={filterOptionDataDispatch}
                changeSegmentConditionRelation={(relation) => {
                  segmentDataDispatch({
                    type: AnalyticsSegmentActionType.ChangeEventFilterConditionRelation,
                    segmentProps,
                    relation,
                  });
                }}
                updateSegmentConditionItem={(conditionIndex, item) => {
                  segmentDataDispatch({
                    type: AnalyticsSegmentActionType.UpdateUserDoneEventConditionItem,
                    segmentProps,
                    conditionIndex,
                    item,
                  });
                }}
                updateSegmentConditionOperator={(conditionIndex, operator) => {
                  segmentDataDispatch({
                    type: AnalyticsSegmentActionType.UpdateUserDoneEventConditionOperator,
                    conditionIndex,
                    segmentProps,
                    operator,
                  });
                }}
                updateSegmentConditionValue={(conditionIndex, value) => {
                  segmentDataDispatch({
                    type: AnalyticsSegmentActionType.UpdateUserDoneEventConditionValue,
                    segmentProps,
                    conditionIndex,
                    value,
                  });
                }}
                removeSegmentConditionItem={(conditionIndex) => {
                  segmentDataDispatch({
                    type: AnalyticsSegmentActionType.RemoveUserDoneEventConditionItem,
                    segmentProps,
                    conditionIndex,
                  });
                }}
              />
            )}
        </div>
      )}

      {eventType === EventTypes.UserDoneInSeqEvent && (
        <div className="flex-v gap-5">
          {segmentData.sequenceEventList.map((item, index) => {
            return (
              <EventSeqItem
                key={identity(index)}
                sequenceEventIndex={index}
                sequenceEventData={item}
                conditionWidth={conditionWidth}
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
