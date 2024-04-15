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

import { IEventSegmentationItem } from 'components/eventselect/AnalyticsType';
import ConditionItem from 'components/eventselect/ConditionItem';
import { AnalyticsSegmentActionType } from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import { useSegmentContext } from 'context/SegmentContext';
import React from 'react';
import { SegmentPropsData } from '../ConditionGroup';

interface UserIsCompProps {
  segmentData: IEventSegmentationItem;
  segmentProps: SegmentPropsData;
}

const UserIsComp: React.FC<UserIsCompProps> = (props: UserIsCompProps) => {
  const { segmentData, segmentProps } = props;
  const { segmentDataState, segmentDataDispatch } = useSegmentContext();

  return (
    <div className="flex">
      <ConditionItem
        hideRemove
        item={{
          eventType: 'attribute',
          conditionOption: segmentData.userIsParamOption ?? null,
          conditionOperator: segmentData.userISOperator ?? null,
          conditionValue: segmentData.userIsValue,
        }}
        conditionOptions={segmentDataState.userIsAttributeOptions ?? []}
        changeCurCategoryOption={(paramOption) => {
          console.info(paramOption);
          segmentDataDispatch({
            type: AnalyticsSegmentActionType.UpdateUserIsParamOption,
            segmentProps,
            paramOption,
          });
        }}
        changeConditionOperator={(operator) => {
          segmentDataDispatch({
            type: AnalyticsSegmentActionType.UpdateUserIsOperator,
            segmentProps,
            operator,
          });
        }}
        changeConditionValue={(value) => {
          segmentDataDispatch({
            type: AnalyticsSegmentActionType.UpdateUserIsValue,
            segmentProps,
            value: value,
          });
        }}
      />
    </div>
  );
};

export default UserIsComp;
