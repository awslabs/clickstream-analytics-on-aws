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
  IAnalyticsItem,
  INIT_SEGMENTATION_DATA,
} from 'components/eventselect/AnalyticsType';
import EventItem from 'components/eventselect/EventItem';
import AnalyticsSegmentFilter from 'components/eventselect/reducer/AnalyticsSegmentFilter';
import { analyticsSegmentFilterReducer } from 'components/eventselect/reducer/analyticsSegmentFilterReducer';
import { AnalyticsSegmentActionType } from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import { useSegmentContext } from 'context/SegmentContext';
import React, { useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import { SegmentPropsData } from './ConditionGroup';

interface EventSeqItemProps {
  conditionWidth: number;
  sequenceEventIndex: number;
  sequenceEventData: IAnalyticsItem;
  segmentProps: SegmentPropsData;
}

const EventSeqItem: React.FC<EventSeqItemProps> = (
  props: EventSeqItemProps
) => {
  const { t } = useTranslation();
  const {
    sequenceEventIndex,
    segmentProps,
    sequenceEventData,
    conditionWidth,
  } = props;
  const { segmentDataState, segmentDataDispatch } = useSegmentContext();

  const [filterOptionData, filterOptionDataDispatch] = useReducer(
    analyticsSegmentFilterReducer,
    {
      ...INIT_SEGMENTATION_DATA,
      conditionOptions: segmentDataState.attributeOptions,
    }
  );
  return (
    <div>
      <div>
        <div className="cs-analytics-dropdown">
          <div
            className="analytics-segment-sequence-event flex gap-5 align-center"
            style={{
              position: 'relative',
              marginTop: 5,
              left: conditionWidth + 10,
              maxWidth: `calc(100% - ${conditionWidth + 25}px)`,
            }}
          >
            <div className="cs-analytics-header">
              {t('analytics:labels.eventTitle')} {sequenceEventIndex + 1}
            </div>
            <div>
              <EventItem
                type="event"
                placeholder={t('analytics:labels.eventSelectPlaceholder')}
                categoryOption={sequenceEventData.sequenceEventOption ?? null}
                changeCurCategoryOption={(item) => {
                  segmentDataDispatch({
                    type: AnalyticsSegmentActionType.UpdateSequenceDoneEvent,
                    segmentProps: {
                      ...segmentProps,
                      sequenceEventIndex: sequenceEventIndex,
                    },
                    event: item,
                  });
                }}
                hasTab={true}
                isMultiSelect={false}
                categories={segmentDataState.eventOption}
                loading={false}
              />
            </div>
            <div>
              <Button
                iconName="filter"
                onClick={() => {
                  segmentDataDispatch({
                    type: AnalyticsSegmentActionType.AddSequenceEventFilterCondition,
                    segmentProps: {
                      ...segmentProps,
                      sequenceEventIndex: sequenceEventIndex,
                    },
                  });
                }}
              />
            </div>
            <div className="remove-icon">
              <Button
                variant="link"
                iconName="close"
                onClick={() => {
                  segmentDataDispatch({
                    type: AnalyticsSegmentActionType.RemoveSequenceDoneEvent,
                    segmentProps: {
                      ...segmentProps,
                      sequenceEventIndex: sequenceEventIndex,
                    },
                  });
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <div
        className="cs-analytics-second-condition"
        style={{
          left: conditionWidth + 115,
          maxWidth: `calc(100% - ${conditionWidth + 95}px)`,
        }}
      >
        {sequenceEventData.sequenceEventConditionFilterList &&
          sequenceEventData.sequenceEventConditionFilterList.length > 0 && (
            <AnalyticsSegmentFilter
              hideAddButton
              filterDataState={{
                enableChangeRelation: true,
                conditionOptions: filterOptionData.conditionOptions,
                conditionRelationShip:
                  sequenceEventData.filterGroupRelationShip ??
                  ERelationShip.AND,
                data: sequenceEventData.sequenceEventConditionFilterList,
              }}
              filterDataDispatch={filterOptionDataDispatch}
              changeSegmentConditionRelation={(relation) => {
                segmentDataDispatch({
                  type: AnalyticsSegmentActionType.ChangeSequenceEventFilterConditionRelation,
                  segmentProps: {
                    ...segmentProps,
                    sequenceEventIndex,
                  },
                  relation,
                });
              }}
              updateSegmentConditionItem={(index, item) => {
                segmentDataDispatch({
                  type: AnalyticsSegmentActionType.UpdateSequenceEventFilterConditionOption,
                  segmentProps: {
                    ...segmentProps,
                    sequenceEventIndex,
                  },
                  sequenceEventConditionIndex: index,
                  item,
                });
              }}
              updateSegmentConditionOperator={(index, operator) => {
                segmentDataDispatch({
                  type: AnalyticsSegmentActionType.UpdateSequenceEventFilterConditionOperation,
                  segmentProps: {
                    ...segmentProps,
                    sequenceEventIndex,
                  },
                  sequenceEventConditionIndex: index,
                  operator,
                });
              }}
              updateSegmentConditionValue={(index, value) => {
                segmentDataDispatch({
                  type: AnalyticsSegmentActionType.UpdateSequenceEventFilterConditionValue,
                  segmentProps: {
                    ...segmentProps,
                    sequenceEventIndex,
                  },
                  sequenceEventConditionIndex: index,
                  value,
                });
              }}
              removeSegmentConditionItem={(index) => {
                segmentDataDispatch({
                  type: AnalyticsSegmentActionType.RemoveSequenceEventFilterConditionOption,
                  segmentProps: {
                    ...segmentProps,
                    sequenceEventIndex,
                  },
                  sequenceEventConditionIndex: index,
                });
              }}
            />
          )}
      </div>
    </div>
  );
};

export default EventSeqItem;
