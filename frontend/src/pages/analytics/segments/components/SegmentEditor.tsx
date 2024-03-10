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

import { Button } from '@cloudscape-design/components';
import { IEventSegmentationObj } from 'components/eventselect/AnalyticsType';
import RelationAnd from 'components/eventselect/comps/RelationAnd';
import {
  AnalyticsSegmentAction,
  AnalyticsSegmentActionType,
} from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import { identity } from 'lodash';
import React, { Dispatch } from 'react';
import SegmentItem from './group/SegmentItem';

interface SegmentationFilterProps {
  segmentDataState: IEventSegmentationObj;
  segmentDataDispatch: Dispatch<AnalyticsSegmentAction>;
}
const SegmentEditor: React.FC<SegmentationFilterProps> = (
  props: SegmentationFilterProps
) => {
  const { segmentDataState, segmentDataDispatch } = props;
  return (
    <div className="flex-v">
      {segmentDataState?.subItemList?.map((item, index) => {
        return (
          <div key={identity(index)}>
            <SegmentItem
              segmentItemData={item}
              segmentDataDispatch={segmentDataDispatch}
              index={index}
              hideRemove={
                segmentDataState.subItemList.length === 1 &&
                index === segmentDataState.subItemList.length - 1
              }
            />
            {segmentDataState.subItemList &&
              index < segmentDataState?.subItemList?.length - 1 && (
                <div className="cs-analytics-dropdown">
                  <RelationAnd hideRadius minHeight={50} />
                </div>
              )}
          </div>
        );
      })}
      <div className="mt-10">
        <Button
          iconName="add-plus"
          onClick={() => {
            segmentDataDispatch({
              type: AnalyticsSegmentActionType.AddFilterGroup,
            });
          }}
        >
          Filter group
        </Button>
      </div>
      <pre>{JSON.stringify(segmentDataState, null, 2)}</pre>
    </div>
  );
};

export default SegmentEditor;
