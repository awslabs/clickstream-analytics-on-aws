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
import {
  AnalyticsSegmentAction,
  AnalyticsSegmentActionType,
} from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import React, { Dispatch } from 'react';
import { useTranslation } from 'react-i18next';
import { defaultStr } from 'ts/utils';

interface ConditionTimeRangeProps {
  segmentData: IEventSegmentationItem;
  segmentDataDispatch: Dispatch<AnalyticsSegmentAction>;
  groupIndex: number;
}

const ConditionTimeRange: React.FC<ConditionTimeRangeProps> = (
  props: ConditionTimeRangeProps
) => {
  const { t } = useTranslation();
  const { segmentData, groupIndex, segmentDataDispatch } = props;

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
          console.log(detail.value);
          segmentDataDispatch({
            type: AnalyticsSegmentActionType.UpdateFilterGroupTimeRange,
            index: groupIndex,
            timeRange: detail,
          });
        }}
        value={segmentData.groupDateRange?.value ?? null}
        relativeOptions={[
          {
            key: 'previous-5-minutes',
            amount: 5,
            unit: 'minute',
            type: 'relative',
          },
          {
            key: 'previous-30-minutes',
            amount: 30,
            unit: 'minute',
            type: 'relative',
          },
          {
            key: 'previous-1-hour',
            amount: 1,
            unit: 'hour',
            type: 'relative',
          },
          {
            key: 'previous-6-hours',
            amount: 6,
            unit: 'hour',
            type: 'relative',
          },
        ]}
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
        placeholder="Filter by a date and time range"
      />
    </div>
  );
};

export default ConditionTimeRange;
