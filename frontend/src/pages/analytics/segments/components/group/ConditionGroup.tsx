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

import {
  Button,
  Input,
  Select,
  SelectProps,
} from '@cloudscape-design/components';
import {
  ERelationShip,
  IEventSegmentationItem,
  INIT_SEGMENTATION_DATA,
} from 'components/eventselect/AnalyticsType';
import EventItem from 'components/eventselect/EventItem';
import GroupSelectContainer from 'components/eventselect/GroupSelectContainer';
import AnalyticsSegmentFilter from 'components/eventselect/reducer/AnalyticsSegmentFilter';
import { analyticsSegmentFilterReducer } from 'components/eventselect/reducer/analyticsSegmentFilterReducer';
import {
  AnalyticsSegmentAction,
  AnalyticsSegmentActionType,
} from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import React, { Dispatch, useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ExploreAnalyticsOperators,
  ExploreComputeMethod,
} from 'ts/explore-types';
import { defaultStr } from 'ts/utils';
import Condition from './Condition';
import {
  EVENT_CATEGORIES,
  MULTI_LEVEL_SELECT_OPTIONS,
  PRESET_PARAMETERS,
} from './mock_data';

interface ConditionGroupProps {
  segmentData: IEventSegmentationItem;
  segmentDataDispatch: Dispatch<AnalyticsSegmentAction>;
  level: number;
  rootIndex: number;
  parentIndex: number;
  currentIndex: number;
  parentData: IEventSegmentationItem;
}

const ConditionGroup: React.FC<ConditionGroupProps> = (
  props: ConditionGroupProps
) => {
  const { t } = useTranslation();
  const {
    segmentDataDispatch,
    level,
    rootIndex,
    parentData,
    parentIndex,
    currentIndex,
    segmentData,
  } = props;
  const [conditionWidth, setConditionWidth] = useState(0);
  const [filterOptionData, filterOptionDataDispatch] = useReducer(
    analyticsSegmentFilterReducer,
    {
      ...INIT_SEGMENTATION_DATA,
      conditionOptions: PRESET_PARAMETERS,
    }
  );

  const ANALYTICS_OPERATORS = {
    is_null: {
      value: ExploreAnalyticsOperators.NULL,
      label: t('analytics:operators.null'),
    },
    is_not_null: {
      value: ExploreAnalyticsOperators.NOT_NULL,
      label: t('analytics:operators.notNull'),
    },
    equal: {
      value: ExploreAnalyticsOperators.EQUAL,
      label: t('analytics:operators.equal'),
    },
    not_equal: {
      value: ExploreAnalyticsOperators.NOT_EQUAL,
      label: t('analytics:operators.notEqual'),
    },
    greater_than: {
      value: ExploreAnalyticsOperators.GREATER_THAN,
      label: t('analytics:operators.greaterThan'),
    },
    greater_than_or_equal: {
      value: ExploreAnalyticsOperators.GREATER_THAN_OR_EQUAL,
      label: t('analytics:operators.greaterThanOrEqual'),
    },
    less_than: {
      value: ExploreAnalyticsOperators.LESS_THAN,
      label: t('analytics:operators.lessThan'),
    },
    less_than_or_equal: {
      value: ExploreAnalyticsOperators.LESS_THAN_OR_EQUAL,
      label: t('analytics:operators.lessThanOrEqual'),
    },
    in: {
      value: ExploreAnalyticsOperators.IN,
      label: t('analytics:operators.in'),
    },
    not_in: {
      value: ExploreAnalyticsOperators.NOT_IN,
      label: t('analytics:operators.notIn'),
    },
    contains: {
      value: ExploreAnalyticsOperators.CONTAINS,
      label: t('analytics:operators.contains'),
    },
    not_contains: {
      value: ExploreAnalyticsOperators.NOT_CONTAINS,
      label: t('analytics:operators.notContains'),
    },
  };

  const CONDITION_STRING_OPERATORS: SelectProps.Options = [
    ANALYTICS_OPERATORS.is_null,
    ANALYTICS_OPERATORS.is_not_null,
    ANALYTICS_OPERATORS.equal,
    ANALYTICS_OPERATORS.not_equal,
    ANALYTICS_OPERATORS.in,
    ANALYTICS_OPERATORS.not_in,
    ANALYTICS_OPERATORS.contains,
    ANALYTICS_OPERATORS.not_contains,
  ];
  const [showGroupSelectDropdown, setShowGroupSelectDropdown] = useState(false);
  return (
    <div className="analytics-segment-group-item">
      <div className="flex flex-1 gap-5">
        <Condition
          segmentData={segmentData}
          segmentDataDispatch={segmentDataDispatch}
          updateConditionWidth={setConditionWidth}
          level={level}
          rootIndex={rootIndex}
          parentIndex={parentIndex}
          currentIndex={currentIndex}
        />
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
                categories={EVENT_CATEGORIES}
                loading={false}
              />
            </div>
          </div>
        </div>

        <div>
          <Button iconName="filter" />
        </div>

        <div className="cs-analytics-dropdown">
          <div className="cs-dropdown-input">
            <div className="dropdown-input-column">
              <div
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

        <div>
          {level === 1 &&
            parentData.conditionRelationShip === ERelationShip.AND && (
              <Button
                iconName="add-plus"
                onClick={() => {
                  segmentDataDispatch({
                    type: AnalyticsSegmentActionType.ConvertAndDataToOr,
                    level,
                    rootIndex,
                    parentIndex,
                    currentIndex,
                    parentData,
                  });
                }}
              >
                Or
              </Button>
            )}
          {parentData.conditionRelationShip === ERelationShip.OR &&
            currentIndex === parentData.subItemList.length - 1 && (
              <Button
                iconName="add-plus"
                onClick={() => {
                  segmentDataDispatch({
                    type: AnalyticsSegmentActionType.AddOrEventData,
                    level,
                    rootIndex,
                    parentIndex,
                    parentData,
                  });
                }}
              >
                Or
              </Button>
            )}
        </div>

        <div className="segment-remove-icon">
          {!(
            level === 1 &&
            parentData.subItemList.length === 1 &&
            currentIndex === parentData.subItemList.length - 1
          ) && (
            <Button
              iconName="close"
              variant="link"
              onClick={() => {
                segmentDataDispatch({
                  type: AnalyticsSegmentActionType.RemoveEventData,
                  level,
                  rootIndex,
                  parentIndex,
                  currentIndex,
                  parentData,
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
        {(segmentData.eventConditionList?.length ?? 0) > 0 && (
          <AnalyticsSegmentFilter
            hideAddButton
            filterDataState={filterOptionData}
            filterDataDispatch={filterOptionDataDispatch}
          />
        )}
      </div>
    </div>
  );
};

export default ConditionGroup;
