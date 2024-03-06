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
import { IEventSegmentationItem } from 'components/eventselect/AnalyticsType';
import RelationAnd from 'components/eventselect/comps/RelationAnd';
import { AnalyticsSegmentAction } from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import { identity } from 'lodash';
import React, { Dispatch } from 'react';
import SegmentItem from './group/SegmentItem';

interface SegmentationFilterProps {
  segmentDataState: IEventSegmentationItem;
  segmentDataDispatch: Dispatch<AnalyticsSegmentAction>;
}
const SegmentEditor: React.FC<SegmentationFilterProps> = (
  props: SegmentationFilterProps
) => {
  const { segmentDataState, segmentDataDispatch } = props;
  return (
    <div className="flex-v gap-10">
      <pre>{JSON.stringify(segmentDataState, null, 2)}</pre>
      {segmentDataState?.segmentGroupItem?.map((item, index) => {
        return (
          <div key={identity(index)}>
            <SegmentItem
              segmentItemData={item}
              segmentDataDispatch={segmentDataDispatch}
            />
            {segmentDataState.segmentGroupItem &&
              index < segmentDataState?.segmentGroupItem?.length - 1 && (
                <div className="cs-analytics-dropdown">
                  <RelationAnd hideRadius minHeight={40} />
                </div>
              )}
          </div>
        );
      })}
      <div>
        <Button iconName="add-plus">Filter group</Button>
      </div>
    </div>
  );
};

export default SegmentEditor;
