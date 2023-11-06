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
  DateRangePicker,
  DateRangePickerProps,
  Select,
  SelectProps,
} from '@cloudscape-design/components';
import i18n from 'i18n';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExploreGroupColumn } from 'ts/explore-types';
import { defaultStr } from 'ts/utils';

export const DEFAULT_DAY_RANGE: DateRangePickerProps.RelativeOption = {
  key: 'previous-7-day',
  amount: 7,
  unit: 'day',
  type: 'relative',
};
export const DEFAULT_WEEK_RANGE: DateRangePickerProps.RelativeOption = {
  key: 'previous-1-week',
  amount: 1,
  unit: 'week',
  type: 'relative',
};

export const DEFAULT_MONTH_RANGE: DateRangePickerProps.RelativeOption = {
  key: 'previous-1-month',
  amount: 1,
  unit: 'month',
  type: 'relative',
};

interface IExploreDateRangePickerProps {
  dateRangeValue: DateRangePickerProps.Value | null;
  timeGranularity: SelectProps.Option;
  timeGranularityVisible: boolean;
  setDateRangeValue: (value: DateRangePickerProps.Value) => void;
  setTimeGranularity: (value: SelectProps.Option) => void;
}

const ExploreDateRangePicker: React.FC<IExploreDateRangePickerProps> = (
  props: IExploreDateRangePickerProps
) => {
  const {
    dateRangeValue,
    timeGranularity,
    timeGranularityVisible,
    setDateRangeValue,
    setTimeGranularity,
  } = props;
  const { t } = useTranslation();

  const relativeOptions: ReadonlyArray<DateRangePickerProps.RelativeOption> = [
    {
      key: 'previous-1-day',
      amount: 1,
      unit: 'day',
      type: 'relative',
    },
    DEFAULT_DAY_RANGE,
    DEFAULT_WEEK_RANGE,
    {
      key: 'previous-2-week',
      amount: 2,
      unit: 'week',
      type: 'relative',
    },
    DEFAULT_MONTH_RANGE,
    {
      key: 'previous-3-months',
      amount: 3,
      unit: 'month',
      type: 'relative',
    },
    {
      key: 'previous-6-months',
      amount: 6,
      unit: 'month',
      type: 'relative',
    },
    {
      key: 'previous-1-year',
      amount: 1,
      unit: 'year',
      type: 'relative',
    },
  ];

  const timeGranularityOptions: SelectProps.Options = [
    {
      value: ExploreGroupColumn.DAY,
      label: defaultStr(t('analytics:options.dayTimeGranularity')),
    },
    {
      value: ExploreGroupColumn.WEEK,
      label: defaultStr(t('analytics:options.weekTimeGranularity')),
    },
    {
      value: ExploreGroupColumn.MONTH,
      label: defaultStr(t('analytics:options.monthTimeGranularity')),
    },
  ];

  const isValidRange = (
    range: DateRangePickerProps.Value | null
  ): DateRangePickerProps.ValidationResult => {
    if (range?.type === 'absolute') {
      const [startDateWithoutTime] = range.startDate.split('T');
      const [endDateWithoutTime] = range.endDate.split('T');
      if (!startDateWithoutTime || !endDateWithoutTime) {
        return {
          valid: false,
          errorMessage: t('analytics:valid.dateRangeIncomplete'),
        };
      }
      if (
        new Date(range.startDate).getTime() -
          new Date(range.endDate).getTime() >
        0
      ) {
        return {
          valid: false,
          errorMessage: t('analytics:valid.dateRangeInvalid'),
        };
      }
    }
    return { valid: true };
  };

  return (
    <div className="cs-analytics-data-range">
      {timeGranularityVisible && (
        <Select
          selectedOption={timeGranularity}
          options={timeGranularityOptions}
          onChange={(event) => {
            setTimeGranularity(event.detail.selectedOption);
          }}
        />
      )}
      <DateRangePicker
        onChange={({ detail }) => {
          setDateRangeValue(detail.value as DateRangePickerProps.Value);
        }}
        value={dateRangeValue ?? null}
        dateOnly
        relativeOptions={relativeOptions}
        isValidRange={isValidRange}
        i18nStrings={{
          relativeModeTitle: defaultStr(
            t('analytics:dateRange.relativeModeTitle')
          ),
          absoluteModeTitle: defaultStr(
            t('analytics:dateRange.absoluteModeTitle')
          ),
          relativeRangeSelectionHeading: defaultStr(
            t('analytics:dateRange.relativeRangeSelectionHeading')
          ),
          cancelButtonLabel: defaultStr(
            t('analytics:dateRange.cancelButtonLabel')
          ),
          applyButtonLabel: defaultStr(
            t('analytics:dateRange.applyButtonLabel')
          ),
          clearButtonLabel: defaultStr(
            t('analytics:dateRange.clearButtonLabel')
          ),
          customRelativeRangeOptionLabel: defaultStr(
            t('analytics:dateRange.customRelativeRangeOptionLabel')
          ),
          formatRelativeRange: (value: DateRangePickerProps.RelativeValue) => {
            const label = t('analytics:dateRange.formatRelativeRangeLabel');
            const unit = i18n.t(`analytics:dateRange.${value.unit}`);
            return `${label} ${value.amount} ${unit}`;
          },
        }}
      />
    </div>
  );
};

export default ExploreDateRangePicker;
