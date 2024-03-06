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

import {
  ERelationShip,
  IEventSegmentationItem,
} from 'components/eventselect/AnalyticsType';
import RelationAnd from 'components/eventselect/comps/RelationAnd';
import RelationOr from 'components/eventselect/comps/RelationOr';
import { AnalyticsSegmentAction } from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import React, { Dispatch } from 'react';
import ConditionGroup from './ConditionGroup';

interface RenderNestSegmentProps {
  segmentItemData: IEventSegmentationItem;
  segmentDataDispatch: Dispatch<AnalyticsSegmentAction>;
  level: number;
}
const RenderNestSegment: React.FC<RenderNestSegmentProps> = (
  props: RenderNestSegmentProps
) => {
  const { segmentItemData, segmentDataDispatch, level } = props;
  return (
    <div className="flex gap-10">
      {segmentItemData.segmentGroupItem.length > 1 && (
        <>
          {segmentItemData.conditionRelationShip === ERelationShip.OR ? (
            <RelationOr enableChangeRelation={false} isIsolate />
          ) : (
            <RelationAnd enableChangeRelation={false} />
          )}
        </>
      )}
      <div className="flex-v gap-10">
        {segmentItemData.segmentGroupItem.map((item, index) => {
          if (item.segmentGroupItem.length > 0) {
            return (
              <RenderNestSegment
                segmentItemData={item}
                segmentDataDispatch={segmentDataDispatch}
                level={level + 1}
              />
            );
          }
          return (
            <ConditionGroup
              level={level}
              parentIndex={index}
              segmentDataDispatch={segmentDataDispatch}
            />
          );
        })}
      </div>
    </div>
  );
};

export default RenderNestSegment;
