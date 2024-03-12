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

import { Select } from '@cloudscape-design/components';
import { IEventSegmentationItem } from 'components/eventselect/AnalyticsType';
import {
  AnalyticsSegmentAction,
  AnalyticsSegmentActionType,
} from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import React, { Dispatch } from 'react';
import { SegmentPropsData } from '../ConditionGroup';
import { FILTER_GROUP_LIST } from '../mock_data';

interface UserInGroupProps {
  segmentData: IEventSegmentationItem;
  segmentProps: SegmentPropsData;
  segmentDataDispatch: Dispatch<AnalyticsSegmentAction>;
}

const UserInGroup: React.FC<UserInGroupProps> = (props: UserInGroupProps) => {
  const { segmentData, segmentProps, segmentDataDispatch } = props;
  return (
    <div className="flex gap-10">
      <Select
        placeholder="请选择用户分群组"
        selectedOption={segmentData.userInFilterGroup ?? null}
        onChange={(e) => {
          segmentDataDispatch({
            type: AnalyticsSegmentActionType.UpdateUserInGroup,
            segmentProps,
            group: e.detail.selectedOption,
          });
        }}
        options={FILTER_GROUP_LIST}
      />
    </div>
  );
};

export default UserInGroup;
