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
  DatePicker,
  Input,
  Multiselect,
  Select,
  SelectProps,
} from '@cloudscape-design/components';
import React from 'react';
import { MetadataValueType } from 'ts/const';
import {
  IConditionItemType,
  MOCK_ATTRIBUTE_OPTION_LIST,
  MOCK_BOOLEAN_OPTION_LIST,
  MOCK_CONDITION_OPERATOR_LIST,
  MOCK_STRING_TYPE_OPTION_LIST,
} from './AnalyticsType';
import EventItem from './EventItem';

interface ConditionItemProps {
  item: IConditionItemType;
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
    removeConditionItem,
    changeCurCategoryOption,
    changeConditionOperator,
    changeConditionValue,
  } = props;

  return (
    <div className="cs-analytics-condition-item">
      <div className="condition-event">
        <EventItem
          categoryOption={item.conditionOption}
          changeCurCategoryOption={(item) => {
            changeCurCategoryOption(item);
          }}
          categories={MOCK_ATTRIBUTE_OPTION_LIST}
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
          options={MOCK_CONDITION_OPERATOR_LIST}
        />
      </div>
      <div className="flex-1">
        {item.conditionOption?.valueType === MetadataValueType.STRING && (
          <Multiselect
            disabled={!item.conditionOperator}
            selectedOptions={item.conditionValue}
            onChange={({ detail }) =>
              changeConditionValue(detail.selectedOptions)
            }
            options={MOCK_STRING_TYPE_OPTION_LIST}
            placeholder="Choose options"
          />
        )}
        {item.conditionOption?.valueType === MetadataValueType.NUMBER && (
          <Input
            disabled={!item.conditionOperator}
            placeholder="Input value"
            type="number"
            value={item.conditionValue}
            onChange={(e) => {
              changeConditionValue(e.detail.value);
            }}
          />
        )}
        {item.conditionOption?.valueType === MetadataValueType.DATETIME && (
          <DatePicker
            disabled={!item.conditionOperator}
            onChange={({ detail }) => {
              changeConditionValue(detail.value);
            }}
            value={item.conditionValue}
            placeholder="YYYY/MM/DD"
          />
        )}
        {item.conditionOption?.valueType === MetadataValueType.BOOLEAN && (
          <Select
            disabled={!item.conditionOperator}
            placeholder="Select value"
            selectedOption={item.conditionValue}
            onChange={({ detail }) => {
              changeConditionValue(detail.selectedOption);
            }}
            options={MOCK_BOOLEAN_OPTION_LIST}
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
