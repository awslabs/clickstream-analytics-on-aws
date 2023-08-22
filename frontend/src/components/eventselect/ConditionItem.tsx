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
import React from 'react';
import { MetadataValueType } from 'ts/const';
import {
  ANALYTICS_OPERATORS,
  CategoryItemType,
  IConditionItemType,
} from './AnalyticsType';
import EventItem from './EventItem';

interface ConditionItemProps {
  item: IConditionItemType;
  conditionOptions: CategoryItemType[];
  removeConditionItem: () => void;
  changeConditionOperator: (value: SelectProps.Option | null) => void;
  changeCurCategoryOption: (category: SelectProps.Option | null) => void;
  changeConditionValue: (value: any) => void;
}

const ConditionItem: React.FC<ConditionItemProps> = (
  props: ConditionItemProps
) => {
  const {
    item,
    conditionOptions,
    removeConditionItem,
    changeCurCategoryOption,
    changeConditionOperator,
    changeConditionValue,
  } = props;

  const CONDITION_STRING_OPERATORS: SelectProps.Options = [
    ANALYTICS_OPERATORS.is_null,
    ANALYTICS_OPERATORS.is_not_null,
    ANALYTICS_OPERATORS.equal,
    ANALYTICS_OPERATORS.not_equal,
    ANALYTICS_OPERATORS.not_equal_not_contain_null,
    ANALYTICS_OPERATORS.contain,
    ANALYTICS_OPERATORS.not_contain,
    ANALYTICS_OPERATORS.not_contain_not_contain_null,
  ];
  const CONDITION_NUMBER_OPERATORS: SelectProps.Options = [
    ANALYTICS_OPERATORS.is_null,
    ANALYTICS_OPERATORS.is_not_null,
    ANALYTICS_OPERATORS.equal,
    ANALYTICS_OPERATORS.not_equal,
    ANALYTICS_OPERATORS.not_equal_not_contain_null,
    ANALYTICS_OPERATORS.greater_than,
    ANALYTICS_OPERATORS.greater_than_or_equal,
    ANALYTICS_OPERATORS.less_than,
    ANALYTICS_OPERATORS.less_than_or_equal,
  ];

  return (
    <div className="cs-analytics-condition-item">
      <div className="condition-event">
        <EventItem
          categoryOption={item.conditionOption}
          changeCurCategoryOption={(item) => {
            changeCurCategoryOption(item);
          }}
          categories={conditionOptions}
        />
      </div>
      <div className="condition-select">
        <Select
          disabled={!item.conditionOption}
          placeholder="Operator"
          selectedOption={item.conditionOperator}
          onChange={(e) => {
            changeConditionOperator(e.detail.selectedOption);
          }}
          options={
            item.conditionOption?.valueType === MetadataValueType.STRING
              ? CONDITION_STRING_OPERATORS
              : CONDITION_NUMBER_OPERATORS
          }
        />
      </div>
      <div className="flex-1">
        {item.conditionOperator !== ANALYTICS_OPERATORS.is_null &&
          item.conditionOperator !== ANALYTICS_OPERATORS.is_not_null && (
            <Input
              disabled={!item.conditionOperator}
              placeholder="Input value"
              value={item.conditionValue}
              onChange={(e) => {
                changeConditionValue(e.detail.value);
              }}
            />
          )}
      </div>
      <div className="remove-item">
        <div className="remove-item-icon">
          <Button
            onClick={() => {
              removeConditionItem();
            }}
            variant="link"
            iconName="close"
          />
        </div>
      </div>
    </div>
  );
};

export default ConditionItem;
