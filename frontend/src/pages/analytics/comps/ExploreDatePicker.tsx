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

import { DatePicker, Select, SelectProps } from '@cloudscape-design/components';
import InfoTitle from 'components/common/title/InfoTitle';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExploreGroupColumn } from 'ts/explore-types';
import { defaultStr } from 'ts/utils';

interface IExploreDatePickerProps {
  disableSelect: boolean;
  startDate: string;
  revisitDate: string;
  timeGranularity: SelectProps.Option;
  timeGranularityVisible: boolean;
  setTimeGranularity: (value: SelectProps.Option) => void;
  setStartDate: (value: string) => void;
  setRevisitDate: (value: string) => void;
}

const ExploreDatePicker: React.FC<IExploreDatePickerProps> = (
  props: IExploreDatePickerProps
) => {
  const {
    disableSelect,
    timeGranularity,
    timeGranularityVisible,
    startDate,
    revisitDate,
    setTimeGranularity,
    setStartDate,
    setRevisitDate,
  } = props;
  const { t } = useTranslation();

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

  return (
    <div className="cs-analytics-data-range">
      <InfoTitle title={t('analytics:dateRange.startDate')} />
      <DatePicker
        onChange={({ detail }) => setStartDate(detail.value)}
        value={startDate}
        placeholder="YYYY/MM/DD"
      />
      <InfoTitle title={t('analytics:dateRange.revisitDate')} />
      <DatePicker
        onChange={({ detail }) => setRevisitDate(detail.value)}
        value={revisitDate}
        placeholder="YYYY/MM/DD"
      />
      {timeGranularityVisible && (
        <Select
          disabled={disableSelect}
          selectedOption={timeGranularity}
          options={timeGranularityOptions}
          onChange={(event) => {
            setTimeGranularity(event.detail.selectedOption);
          }}
        />
      )}
    </div>
  );
};

export default ExploreDatePicker;
