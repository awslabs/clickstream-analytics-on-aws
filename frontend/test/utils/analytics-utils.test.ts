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

import { convertCronExpByTimeRange, convertUISegmentObjectToAPIObject } from 'pages/analytics/analytics-utils';
import { mockAPIData, mockUIData } from '../components/segments/data/mock_data';

describe('analytics utils tests', () => {
  it('should convert complex ui data to api data', () => {
    const uiData = mockUIData;
    expect(convertUISegmentObjectToAPIObject(uiData)).toEqual(mockAPIData);
  });

  it ('should convert cron expression', () => {
    const dailyTimeUnit = {
      label: 'Daily',
      value: 'Daily',
    };
    expect(convertCronExpByTimeRange(dailyTimeUnit, '', '10')).toEqual('cron(0 10 * * ? *)');

    const weeklyTimeUnit = {
      label: 'Weekly',
      value: 'Weekly',
    };
    expect(convertCronExpByTimeRange(weeklyTimeUnit, 'SUN', '10')).toEqual('cron(0 10 ? * SUN *)');

    const monthlyTimeUnit = {
      label: 'Monthly',
      value: 'Monthly',
    };
    expect(convertCronExpByTimeRange(monthlyTimeUnit, '12', '10')).toEqual('cron(0 10 12 * ? *)');

    const customTimeUnit = {
      label: 'Custom',
      value: 'Custom',
    };
    expect(convertCronExpByTimeRange(customTimeUnit, '5', '10')).toEqual('');
  })
});
