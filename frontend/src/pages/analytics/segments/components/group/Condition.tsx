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
import { AnalyticsSegmentActionType } from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import { useSegmentContext } from 'context/SegmentContext';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CONDITION_LIST } from 'ts/const';
import { defaultStr } from 'ts/utils';
import { SegmentPropsData } from './ConditionGroup';

interface ConditionProps {
  segmentProps: SegmentPropsData;
  segmentData: IEventSegmentationItem;
  updateConditionWidth: (w: number) => void;
}

const Condition: React.FC<ConditionProps> = (props: ConditionProps) => {
  const { segmentData, segmentProps, updateConditionWidth } = props;
  const { t } = useTranslation();
  const selectRef = useRef<HTMLDivElement>(null);
  const { segmentDataDispatch } = useSegmentContext();

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
        selectedOption={{
          ...segmentData.userEventType,
          label: defaultStr(t(segmentData.userEventType?.label ?? '')),
        }}
        onChange={({ detail }) =>
          segmentDataDispatch({
            type: AnalyticsSegmentActionType.UpdateUserEventType,
            segmentProps,
            userEventType: detail.selectedOption,
          })
        }
        options={CONDITION_LIST.map((item) => {
          return { label: defaultStr(t(item.label ?? '')), value: item.value };
        })}
      />
    </div>
  );
};

export default Condition;
