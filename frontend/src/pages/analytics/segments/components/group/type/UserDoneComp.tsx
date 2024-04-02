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

import { ExploreAnalyticsOperators } from '@aws/clickstream-base-lib';
import { Button, Input, Select } from '@cloudscape-design/components';
import ErrorText from 'components/common/ErrorText';
import { IEventSegmentationItem } from 'components/eventselect/AnalyticsType';
import EventItem from 'components/eventselect/EventItem';
import GroupSelectContainer from 'components/eventselect/GroupSelectContainer';
import { AnalyticsSegmentActionType } from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import { useUserEventParameter } from 'context/AnalyticsEventsContext';
import { useSegmentContext } from 'context/SegmentContext';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { defaultStr } from 'ts/utils';
import { SegmentPropsData } from '../ConditionGroup';

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
  const { segmentDataState, segmentDataDispatch } = useSegmentContext();
  const { data: eventData } = useUserEventParameter();
  const [showDropdownAtTop, setShowDropdownAtTop] = useState(false);
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

  const handleClickEvent = () => {
    if (!wrapperRef.current) return;
    const element: any = wrapperRef.current;
    const distanceToBottom =
      window.innerHeight - element.getBoundingClientRect().bottom;
    if (distanceToBottom < 350) {
      setShowDropdownAtTop(true);
    } else {
      setShowDropdownAtTop(false);
    }
  };

  return (
    <>
      <div className="cs-analytics-dropdown">
        <div className="cs-analytics-parameter">
          <div className="flex-1">
            <div>
              <EventItem
                type="event"
                placeholder={t('analytics:labels.eventSelectPlaceholder')}
                categoryOption={segmentData.userDoneEvent ?? null}
                changeCurCategoryOption={(item) => {
                  segmentDataDispatch({
                    type: AnalyticsSegmentActionType.UpdateUserDoneEvent,
                    segmentProps,
                    event: item,
                    metaDataEventParameters: eventData.metaDataEventParameters,
                    metaDataEvents: eventData.metaDataEvents,
                    metaDataUserAttributes: eventData.metaDataUserAttributes,
                    builtInMetaData: eventData.builtInMetaData,
                  });
                }}
                hasTab={true}
                isMultiSelect={false}
                categories={segmentDataState.eventOption}
              />
              {segmentData.userDoneEventError && (
                <ErrorText
                  text={`${t(defaultStr(segmentData.userDoneEventError))}`}
                />
              )}
            </div>
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

      <div>
        <div className="cs-dropdown-input" ref={wrapperRef}>
          <div className="dropdown-input-column">
            <div
              role="none"
              className="second-select-option"
              title={segmentData.userDoneEventCalculateMethod?.label}
              onClick={() => {
                setShowGroupSelectDropdown((prev) => !prev);
                handleClickEvent();
              }}
            >
              <Select
                placeholder={defaultStr(
                  t('analytics:segment.calculateOption.NUMBER_OF_TOTAL')
                )}
                disabled={!segmentData.userDoneEvent}
                selectedOption={
                  segmentData.userDoneEventCalculateMethod ?? null
                }
              />
              {showGroupSelectDropdown && (
                <GroupSelectContainer
                  showDropdownAtTop={showDropdownAtTop}
                  categories={segmentData.eventCalculateMethodOption ?? []}
                  selectedItem={
                    segmentData.userDoneEventCalculateMethod ?? null
                  }
                  changeSelectItem={(item) => {
                    if (item) {
                      const newItem: any = { ...item };
                      if (item.itemType === 'children') {
                        newItem.label = t(
                          `analytics:segment.calculateOption.${item.groupName}`,
                          {
                            type: item.label,
                          }
                        );
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
                        calculate: segmentData.eventCalculateMethodOption?.[0],
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
          options={segmentDataState.eventOperationOptions}
        />
        {segmentData.userDoneEventOperatorError && (
          <ErrorText
            text={`${t(defaultStr(segmentData.userDoneEventOperatorError))}`}
          />
        )}
      </div>

      <div>
        {segmentData.userDoneEventOperation?.value ===
        ExploreAnalyticsOperators.BETWEEN ? (
          <div className="align-center flex gap-5 w-200">
            <Input
              type="number"
              placeholder={defaultStr(
                t('analytics:labels.conditionValuePlaceholder')
              )}
              value={segmentData.userDoneEventValue?.[0] ?? ''}
              onChange={(e) => {
                segmentDataDispatch({
                  type: AnalyticsSegmentActionType.UpdateUserDoneEventValue,
                  segmentProps,
                  value: [
                    e.detail.value,
                    segmentData.userDoneEventValue?.[1] ?? '',
                  ],
                });
              }}
            />
            <div>-</div>
            <Input
              type="number"
              placeholder={defaultStr(
                t('analytics:labels.conditionValuePlaceholder')
              )}
              value={segmentData.userDoneEventValue?.[1] ?? ''}
              onChange={(e) => {
                segmentDataDispatch({
                  type: AnalyticsSegmentActionType.UpdateUserDoneEventValue,
                  segmentProps,
                  value: [
                    segmentData.userDoneEventValue?.[0] ?? '',
                    e.detail.value,
                  ],
                });
              }}
            />
          </div>
        ) : (
          <Input
            type="number"
            placeholder={defaultStr(
              t('analytics:labels.conditionValuePlaceholder')
            )}
            value={segmentData.userDoneEventValue?.[0] ?? ''}
            onChange={(e) => {
              segmentDataDispatch({
                type: AnalyticsSegmentActionType.UpdateUserDoneEventValue,
                segmentProps,
                value: [e.detail.value, ''],
              });
            }}
          />
        )}
        {segmentData.userDoneEventValueError && (
          <ErrorText
            text={`${t(defaultStr(segmentData.userDoneEventValueError))}`}
          />
        )}
      </div>
    </>
  );
};

export default UserDoneComp;
