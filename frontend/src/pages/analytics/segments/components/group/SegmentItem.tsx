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

import { Button, Input } from '@cloudscape-design/components';
import { IEventSegmentationItem } from 'components/eventselect/AnalyticsType';
import {
  AnalyticsSegmentAction,
  AnalyticsSegmentActionType,
} from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import React, { Dispatch } from 'react';
import ConditionTimeRange from './ConditionTimeRange';
import RenderNestSegment from './RenderNestSegment';

interface SegmentItemProps {
  segmentItemData: IEventSegmentationItem;
  segmentDataDispatch: Dispatch<AnalyticsSegmentAction>;
  index: number;
}

const SegmentItem: React.FC<SegmentItemProps> = (props: SegmentItemProps) => {
  const { segmentItemData, segmentDataDispatch, index } = props;
  return (
    <div className="flex-v gap-5">
      <div className="cs-analytics-group-header-bg">
        <div className="flex align-center m-w-300 gap-5">
          <div className="cs-analytics-group-index">1</div>
          <div className="flex-1">
            <Input value="" />
          </div>
        </div>
      </div>
      <div className="flex-v gap-5 cs-analytics-group-content-bg">
        <ConditionTimeRange />
        <div className="cs-analytics-dropdown">
          <RenderNestSegment
            level={1}
            parentIndex={index}
            rootIndex={index}
            segmentItemData={segmentItemData ?? []}
            segmentDataDispatch={segmentDataDispatch}
          />
        </div>
        <div>
          <Button
            variant="primary"
            onClick={() => {
              segmentDataDispatch({
                type: AnalyticsSegmentActionType.AddAndEventData,
                rootIndex: index,
              });
            }}
          >
            And
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SegmentItem;
