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
  ExploreAnalyticsOperators,
  MetadataValueType,
} from '@aws/clickstream-base-lib';
import {
  Autosuggest,
  Button,
  Select,
  SelectProps,
  TokenGroup,
} from '@cloudscape-design/components';
import ErrorText from 'components/common/ErrorText';
import { StateContext } from 'context/StateContext';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { defaultStr } from 'ts/utils';
import {
  CategoryItemType,
  IAnalyticsItem,
  IConditionItemType,
} from './AnalyticsType';
import EventItem from './EventItem';

interface ConditionItemProps {
  item: IConditionItemType;
  conditionOptions: CategoryItemType[];
  removeConditionItem?: () => void;
  changeConditionOperator: (value: SelectProps.Option | null) => void;
  changeCurCategoryOption: (category: IAnalyticsItem | null) => void;
  changeConditionValue: (value: string[]) => void;
  loading?: boolean;
  disableValidate?: boolean;
  hideRemove?: boolean;
}

const ConditionItem: React.FC<ConditionItemProps> = (
  props: ConditionItemProps
) => {
  const { t } = useTranslation();
  const state = useContext(StateContext);
  const {
    item,
    conditionOptions,
    removeConditionItem,
    changeCurCategoryOption,
    changeConditionOperator,
    changeConditionValue,
    loading,
    disableValidate,
    hideRemove,
  } = props;

  const [valueOptions, setValueOptions] = useState<SelectProps.Options>(
    item.conditionOption?.values?.map((item) => {
      return {
        value: item.value,
        label: item.displayValue,
      };
    }) ?? []
  );
  const [values, setValues] = useState<string[]>(item.conditionValue ?? []);
  const [labelValues, setLabelValues] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState<string>('');

  const setConditionValues = (values: string[]) => {
    setValues(values);
    changeConditionValue(values);
  };

  useEffect(() => {
    setLabelValues(
      values.map(
        (item: string) =>
          valueOptions.find((ele: SelectProps.Option) => ele.value === item)
            ?.label ?? item
      )
    );
  }, [values]);

  const setCurOptions = (item: IAnalyticsItem | null) => {
    if (!item) {
      return;
    }
    if (item.values) {
      const options = item.values.map((i) => {
        return {
          value: i.value,
          label: i.displayValue,
        };
      });
      setValueOptions(options);
      setValues([]);
      changeConditionValue([]);
    }
  };

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
    true: {
      value: ExploreAnalyticsOperators.YES,
      label: t('analytics:operators.true'),
    },
    false: {
      value: ExploreAnalyticsOperators.NO,
      label: t('analytics:operators.false'),
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
  const CONDITION_NUMBER_OPERATORS: SelectProps.Options = [
    ANALYTICS_OPERATORS.is_null,
    ANALYTICS_OPERATORS.is_not_null,
    ANALYTICS_OPERATORS.equal,
    ANALYTICS_OPERATORS.not_equal,
    ANALYTICS_OPERATORS.greater_than,
    ANALYTICS_OPERATORS.greater_than_or_equal,
    ANALYTICS_OPERATORS.less_than,
    ANALYTICS_OPERATORS.less_than_or_equal,
    ANALYTICS_OPERATORS.in,
    ANALYTICS_OPERATORS.not_in,
  ];
  const CONDITION_BOOLEAN_OPERATORS: SelectProps.Options = [
    ANALYTICS_OPERATORS.true,
    ANALYTICS_OPERATORS.false,
  ];

  const getOperatorOptions = (valueType: MetadataValueType) => {
    switch (valueType) {
      case MetadataValueType.STRING:
        return CONDITION_STRING_OPERATORS;
      case MetadataValueType.NUMBER:
        return CONDITION_NUMBER_OPERATORS;
      case MetadataValueType.BOOLEAN:
        return CONDITION_BOOLEAN_OPERATORS;
      default:
        return [];
    }
  };

  const displayInput = (operatorValue: string | undefined) => {
    return (
      operatorValue !== ANALYTICS_OPERATORS.is_null.value &&
      operatorValue !== ANALYTICS_OPERATORS.is_not_null.value &&
      operatorValue !== ANALYTICS_OPERATORS.true.value &&
      operatorValue !== ANALYTICS_OPERATORS.false.value
    );
  };

  const addNewOption = (inputValue: string) => {
    if (
      !values.includes(inputValue) &&
      !valueOptions.find(
        (item: SelectProps.Option) => item.value === inputValue
      )
    ) {
      setValueOptions((prev) => {
        return [
          ...prev,
          {
            label: inputValue,
            value: inputValue,
          },
        ];
      });
    }
  };

  return (
    <div className="cs-analytics-condition-item flex gap-5">
      <div className="condition-event">
        <EventItem
          disableValidate={disableValidate}
          type="attribute"
          showMouseoverTitle
          placeholder={defaultStr(
            t('analytics:labels.attributeSelectPlaceholder')
          )}
          categoryOption={item.conditionOption}
          changeCurCategoryOption={(item) => {
            changeCurCategoryOption(item);
            setCurOptions(item);
          }}
          categories={conditionOptions}
          loading={loading}
        />
      </div>
      <div className="condition-select">
        <Select
          disabled={!item.conditionOption}
          placeholder={defaultStr(
            t('analytics:labels.operatorSelectPlaceholder')
          )}
          selectedOption={item.conditionOperator}
          onChange={(e) => {
            changeConditionOperator(e.detail.selectedOption);
          }}
          options={getOperatorOptions(
            item.conditionOption?.valueType ?? MetadataValueType.STRING
          )}
        />
        {!item.conditionOperator && state?.showAttributeOperatorError && (
          <ErrorText
            text={`${t('analytics:valid.please')}${t(
              'analytics:labels.operatorSelectPlaceholder'
            )}`}
          />
        )}
      </div>
      <div className="flex-1">
        {displayInput(item.conditionOperator?.value) && (
          <div className="condition-value">
            <Autosuggest
              onChange={({ detail }) => {
                setInputValue(detail.value);
              }}
              onSelect={({ detail }) => {
                if (values.includes(detail.value)) {
                  return;
                }
                setConditionValues([...values, detail.value]);
                setInputValue('');
              }}
              onKeyDown={({ detail }) => {
                if (inputValue && detail.key === 'Enter') {
                  if (values.includes(inputValue)) {
                    return;
                  }
                  addNewOption(inputValue);
                  setConditionValues([...values, inputValue]);
                  setInputValue('');
                }
              }}
              onBlur={() => {
                if (inputValue) {
                  if (values.includes(inputValue)) {
                    return;
                  }
                  addNewOption(inputValue);
                  setConditionValues([...values, inputValue]);
                  setInputValue('');
                }
              }}
              value={inputValue}
              options={valueOptions}
              placeholder={defaultStr(
                t('analytics:labels.conditionValuePlaceholder')
              )}
            />
            <TokenGroup
              onDismiss={({ detail: { itemIndex } }) => {
                setConditionValues(
                  values.filter((item, eIndex) => eIndex !== itemIndex)
                );
              }}
              items={labelValues.map((value) => ({ label: value }))}
            />
            {(!labelValues || labelValues.length <= 0) &&
              state?.showAttributeValueError && (
                <ErrorText
                  text={`${t('analytics:valid.please')}${t(
                    'analytics:labels.conditionValuePlaceholder'
                  )}`}
                />
              )}
          </div>
        )}
      </div>
      {!hideRemove && (
        <div className="remove-item">
          <div className="remove-item-icon">
            <Button
              onClick={() => {
                removeConditionItem?.();
              }}
              variant="link"
              iconName="close"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ConditionItem;
