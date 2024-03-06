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

import { DateRangePicker } from '@cloudscape-design/components';
import React from 'react';

const ConditionTimeRange: React.FC = () => {
  const [value, setValue] = React.useState<any>(undefined);
  return (
    <div>
      <DateRangePicker
        onChange={({ detail }) => setValue(detail.value)}
        value={value}
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
        isValidRange={(range: any) => {
          if (range.type === 'absolute') {
            const [startDateWithoutTime] = range.startDate.split('T');
            const [endDateWithoutTime] = range.endDate.split('T');
            if (!startDateWithoutTime || !endDateWithoutTime) {
              return {
                valid: false,
                errorMessage:
                  'The selected date range is incomplete. Select a start and end date for the date range.',
              };
            }
            if (
              new Date(range.startDate).getTime() -
                new Date(range.endDate).getTime() >
              0
            ) {
              return {
                valid: false,
                errorMessage:
                  'The selected date range is invalid. The start date must be before the end date.',
              };
            }
          }
          return { valid: true };
        }}
        i18nStrings={{}}
        placeholder="Filter by a date and time range"
      />
    </div>
  );
};

export default ConditionTimeRange;
