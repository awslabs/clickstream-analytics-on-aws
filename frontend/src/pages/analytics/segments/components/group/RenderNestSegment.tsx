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
import { identity } from 'lodash';
import React from 'react';
import ConditionGroup from './ConditionGroup';

interface RenderNestSegmentProps {
  rootIndex: number;
  parentIndex: number;
  segmentItemData: IEventSegmentationItem;
  level: number;
}
const RenderNestSegment: React.FC<RenderNestSegmentProps> = (
  props: RenderNestSegmentProps
) => {
  const { segmentItemData, level, rootIndex, parentIndex } = props;

  return (
    <div className="flex flex-1 gap-10">
      {segmentItemData.subItemList.length > 1 && (
        <>
          {segmentItemData.segmentEventRelationShip === ERelationShip.OR ? (
            <RelationOr enableChangeRelation={false} isIsolate />
          ) : (
            <RelationAnd enableChangeRelation={false} isIsolate />
          )}
        </>
      )}
      <div className="flex-v flex-1 gap-10">
        {segmentItemData.subItemList.map((item, index) => {
          if (item.subItemList.length > 0) {
            return (
              <RenderNestSegment
                key={identity(index)}
                segmentItemData={item}
                parentIndex={index}
                rootIndex={rootIndex}
                level={level + 1}
              />
            );
          }
          return (
            <ConditionGroup
              key={identity(index)}
              segmentData={item}
              segmentProps={{
                level,
                rootIndex,
                parentIndex,
                currentIndex: index,
                parentData: segmentItemData,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default RenderNestSegment;
