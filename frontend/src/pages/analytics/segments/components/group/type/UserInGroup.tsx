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
import ErrorText from 'components/common/ErrorText';
import { IEventSegmentationItem } from 'components/eventselect/AnalyticsType';
import { AnalyticsSegmentActionType } from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import { useSegmentContext } from 'context/SegmentContext';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { defaultStr } from 'ts/utils';
import { SegmentPropsData } from '../ConditionGroup';

interface UserInGroupProps {
  segmentData: IEventSegmentationItem;
  segmentProps: SegmentPropsData;
}

const UserInGroup: React.FC<UserInGroupProps> = (props: UserInGroupProps) => {
  const { segmentData, segmentProps } = props;
  const { segmentDataState, segmentDataDispatch } = useSegmentContext();
  const { t } = useTranslation();
  return (
    <div>
      <Select
        placeholder={defaultStr(t('analytics:segment.comp.selectUserGroup'))}
        selectedOption={segmentData.userInFilterGroup ?? null}
        onChange={(e) => {
          segmentDataDispatch({
            type: AnalyticsSegmentActionType.UpdateUserInGroup,
            segmentProps,
            group: e.detail.selectedOption,
          });
        }}
        options={segmentDataState.userGroupOptions}
      />
      {segmentData.groupEmptyError && (
        <ErrorText text={`${t(defaultStr(segmentData.groupEmptyError))}`} />
      )}
    </div>
  );
};

export default UserInGroup;
