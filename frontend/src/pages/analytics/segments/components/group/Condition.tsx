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
import React, { Dispatch, useEffect, useRef } from 'react';
import { SegmentPropsData } from './ConditionGroup';
import { CONDITION_LIST } from './mock_data';

interface ConditionProps {
  segmentProps: SegmentPropsData;
  segmentData: IEventSegmentationItem;
  segmentDataDispatch: Dispatch<AnalyticsSegmentAction>;
  updateConditionWidth: (w: number) => void;
}

const Condition: React.FC<ConditionProps> = (props: ConditionProps) => {
  const {
    segmentData,
    segmentProps,
    segmentDataDispatch,
    updateConditionWidth,
  } = props;
  const selectRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const calculateWidth = () => {
      if (selectRef.current) {
        const width = selectRef.current.getBoundingClientRect().width;
        updateConditionWidth(width);
      }
    };
    calculateWidth();
  }, [segmentData.userEventType]);

  return (
    <div ref={selectRef}>
      <Select
        selectedOption={segmentData.userEventType}
        onChange={({ detail }) =>
          segmentDataDispatch({
            type: AnalyticsSegmentActionType.UpdateUserEventType,
            segmentProps,
            userEventType: detail.selectedOption,
          })
        }
        options={CONDITION_LIST}
      />
    </div>
  );
};

export default Condition;
