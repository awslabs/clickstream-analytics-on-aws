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
import { AnalyticsSegmentAction } from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import React, { Dispatch, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExploreComputeMethod } from 'ts/explore-types';
import { defaultStr } from 'ts/utils';
import {
  CONDITION_STRING_OPERATORS,
  MOCK_EVENT_LIST,
  MULTI_LEVEL_SELECT_OPTIONS,
} from '../mock_data';

interface UserDoneCompProps {
  segmentData: IEventSegmentationItem;
  segmentDataDispatch: Dispatch<AnalyticsSegmentAction>;
  level: number;
  rootIndex: number;
  parentIndex: number;
  currentIndex: number;
  parentData: IEventSegmentationItem;
  addNewEventCondition: () => void;
}

const UserDoneComp: React.FC<UserDoneCompProps> = (
  props: UserDoneCompProps
) => {
  const { t } = useTranslation();
  const { addNewEventCondition } = props;

  const [showGroupSelectDropdown, setShowGroupSelectDropdown] = useState(false);

  return (
    <>
      <div className="cs-analytics-dropdown">
        <div className="cs-analytics-parameter">
          <div className="flex-1">
            <EventItem
              type="event"
              placeholder={t('analytics:labels.eventSelectPlaceholder')}
              categoryOption={null}
              changeCurCategoryOption={(item) => {
                console.info('item:', item);
                // changeEventOption(item);
              }}
              hasTab={true}
              isMultiSelect={false}
              categories={MOCK_EVENT_LIST}
              loading={false}
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
        <div className="cs-dropdown-input">
          <div className="dropdown-input-column">
            <div
              role="none"
              className="second-select-option"
              title="AAAAAA"
              onClick={() => {
                setShowGroupSelectDropdown((prev) => !prev);
                // setShowDropdown(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setShowGroupSelectDropdown((prev) => !prev);
                  // setShowDropdown(false);
                }
              }}
            >
              <Select selectedOption={MULTI_LEVEL_SELECT_OPTIONS[0]} />
              {showGroupSelectDropdown && (
                <GroupSelectContainer
                  categories={MULTI_LEVEL_SELECT_OPTIONS}
                  selectedItem={MULTI_LEVEL_SELECT_OPTIONS[0]}
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
                      if (
                        item.itemType === 'children' &&
                        item.groupName === ExploreComputeMethod.AVG_VALUE
                      ) {
                        newItem.label = t('analytics:avgGroupLabel', {
                          label: item.label,
                        });
                      }
                      // changeCurCalcMethodOption?.(newItem);
                    } else {
                      // changeCurCalcMethodOption?.(null);
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
          // disabled={!item.conditionOption}
          placeholder={defaultStr(
            t('analytics:labels.operatorSelectPlaceholder')
          )}
          selectedOption={null}
          onChange={(e) => {
            // changeConditionOperator(e.detail.selectedOption);
            console.info(e);
          }}
          options={CONDITION_STRING_OPERATORS}
        />
      </div>

      <div>
        <Input value="" />
      </div>
    </>
  );
};

export default UserDoneComp;
