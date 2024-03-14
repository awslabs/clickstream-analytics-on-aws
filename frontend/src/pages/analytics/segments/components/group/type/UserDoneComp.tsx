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

import { Button, Input, Select } from '@cloudscape-design/components';
import { IEventSegmentationItem } from 'components/eventselect/AnalyticsType';
import EventItem from 'components/eventselect/EventItem';
import GroupSelectContainer from 'components/eventselect/GroupSelectContainer';
import { AnalyticsSegmentActionType } from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import { useSegmentContext } from 'context/SegmentContext';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExploreComputeMethod } from 'ts/explore-types';
import { defaultStr } from 'ts/utils';
import { SegmentPropsData } from '../ConditionGroup';
import {
  CONDITION_STRING_OPERATORS,
  MOCK_EVENT_LIST,
  MULTI_LEVEL_SELECT_OPTIONS,
} from '../mock_data';

interface UserDoneCompProps {
  segmentData: IEventSegmentationItem;
  segmentProps: SegmentPropsData;
  addNewEventCondition: () => void;
}

const UserDoneComp: React.FC<UserDoneCompProps> = (
  props: UserDoneCompProps
) => {
  const { t } = useTranslation();
  const { segmentData, segmentProps, addNewEventCondition } = props;
  const { segmentDataDispatch } = useSegmentContext();

  const [showGroupSelectDropdown, setShowGroupSelectDropdown] = useState(false);

  function useOutsideAlerter(ref: any) {
    useEffect(() => {
      function handleClickOutside(event: any) {
        if (ref.current && !ref.current.contains(event.target)) {
          setShowGroupSelectDropdown(false);
        }
      }
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [ref]);
  }
  const wrapperRef = useRef(null);
  useOutsideAlerter(wrapperRef);

  return (
    <>
      <div className="cs-analytics-dropdown">
        <div className="cs-analytics-parameter">
          <div className="flex-1">
            <EventItem
              type="event"
              placeholder={t('analytics:labels.eventSelectPlaceholder')}
              categoryOption={segmentData.userDoneEvent ?? null}
              changeCurCategoryOption={(item) => {
                segmentDataDispatch({
                  type: AnalyticsSegmentActionType.UpdateUserDoneEvent,
                  segmentProps,
                  event: item,
                });
              }}
              hasTab={true}
              isMultiSelect={false}
              categories={MOCK_EVENT_LIST}
            />
          </div>
        </div>
      </div>

      <div>
        <Button
          iconName="filter"
          onClick={() => {
            addNewEventCondition();
          }}
        />
      </div>

      <div className="cs-analytics-dropdown">
        <div className="cs-dropdown-input" ref={wrapperRef}>
          <div className="dropdown-input-column">
            <div
              role="none"
              className="second-select-option"
              title={segmentData.userDoneEventCalculateMethod?.label}
              onClick={() => {
                setShowGroupSelectDropdown((prev) => !prev);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setShowGroupSelectDropdown((prev) => !prev);
                }
              }}
            >
              <Select
                disabled={!segmentData.userDoneEvent}
                selectedOption={
                  segmentData.userDoneEventCalculateMethod ??
                  MULTI_LEVEL_SELECT_OPTIONS[0]
                }
              />
              {showGroupSelectDropdown && (
                <GroupSelectContainer
                  categories={MULTI_LEVEL_SELECT_OPTIONS}
                  selectedItem={
                    segmentData.userDoneEventCalculateMethod ??
                    MULTI_LEVEL_SELECT_OPTIONS[0]
                  }
                  changeSelectItem={(item) => {
                    if (item) {
                      const newItem: any = { ...item };
                      if (
                        item.itemType === 'children' &&
                        item.groupName === ExploreComputeMethod.SUM_VALUE
                      ) {
                        newItem.label = t('analytics:sumGroupLabel', {
                          label: item.label,
                        });
                      }
                      segmentDataDispatch({
                        type: AnalyticsSegmentActionType.UpdateUserDoneEventCalculate,
                        segmentProps,
                        calculate: newItem,
                      });
                    } else {
                      segmentDataDispatch({
                        type: AnalyticsSegmentActionType.UpdateUserDoneEventCalculate,
                        segmentProps,
                        calculate: MULTI_LEVEL_SELECT_OPTIONS[0],
                      });
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="condition-select">
        <Select
          placeholder={defaultStr(
            t('analytics:labels.operatorSelectPlaceholder')
          )}
          selectedOption={segmentData.userDoneEventOperation ?? null}
          onChange={(e) => {
            segmentDataDispatch({
              type: AnalyticsSegmentActionType.UpdateUserDoneEventOperation,
              segmentProps,
              operation: e.detail.selectedOption,
            });
          }}
          options={CONDITION_STRING_OPERATORS.map((e) => {
            return { ...e, label: defaultStr(t(e.label ?? '')) };
          })}
        />
      </div>

      <div>
        <Input
          type="number"
          placeholder={defaultStr(
            t('analytics:labels.conditionValuePlaceholder')
          )}
          value={segmentData.userDoneEventValue ?? null}
          onChange={(e) => {
            segmentDataDispatch({
              type: AnalyticsSegmentActionType.UpdateUserDoneEventValue,
              segmentProps,
              value: e.detail.value,
            });
          }}
        />
      </div>
    </>
  );
};

export default UserDoneComp;
