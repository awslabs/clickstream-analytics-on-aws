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
} from '@cloudscape-design/components';
import { IEventSegmentationItem } from 'components/eventselect/AnalyticsType';
import { AnalyticsSegmentActionType } from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import { useSegmentContext } from 'context/SegmentContext';
import {
  DEFAULT_MONTH_RANGE,
  DEFAULT_WEEK_RANGE,
} from 'pages/analytics/comps/ExploreDateRangePicker';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { defaultStr } from 'ts/utils';

interface ConditionTimeRangeProps {
  segmentData: IEventSegmentationItem;
  groupIndex: number;
}

const relativeOptions: ReadonlyArray<DateRangePickerProps.RelativeOption> = [
  {
    key: 'previous-1-day',
    amount: 1,
    unit: 'day',
    type: 'relative',
  },
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
];

const ConditionTimeRange: React.FC<ConditionTimeRangeProps> = (
  props: ConditionTimeRangeProps
) => {
  const { t } = useTranslation();
  const { segmentData, groupIndex } = props;
  const { segmentDataDispatch } = useSegmentContext();

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
    <div>
      <DateRangePicker
        onChange={({ detail }) => {
          segmentDataDispatch({
            type: AnalyticsSegmentActionType.UpdateFilterGroupTimeRange,
            index: groupIndex,
            timeRange: detail,
          });
        }}
        value={segmentData.groupDateRange?.value ?? null}
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
            const unit = t(`analytics:dateRange.${value.unit}`);
            return `${label} ${value.amount} ${unit}`;
          },
        }}
        placeholder={defaultStr(t('analytics:segment.comp.filterByTimeRange'))}
      />
    </div>
  );
};

export default ConditionTimeRange;
