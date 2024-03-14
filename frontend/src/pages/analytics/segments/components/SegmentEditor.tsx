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
import RelationAnd from 'components/eventselect/comps/RelationAnd';
import { AnalyticsSegmentActionType } from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import { useSegmentContext } from 'context/SegmentContext';
import { identity } from 'lodash';
import React from 'react';
import { useTranslation } from 'react-i18next';
import SegmentItem from './group/SegmentItem';

const SegmentEditor: React.FC = () => {
  const { t } = useTranslation();
  const { segmentDataState, segmentDataDispatch } = useSegmentContext();
  return (
    <div className="flex-v">
      {segmentDataState?.subItemList?.map((item, index) => {
        return (
          <div data-testid="test-segment-item" key={identity(index)}>
            <SegmentItem
              segmentItemData={item}
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
          data-testid="test-add-filter-group"
          iconName="add-plus"
          onClick={() => {
            segmentDataDispatch({
              type: AnalyticsSegmentActionType.AddFilterGroup,
            });
          }}
        >
          {t('button.filterGroup')}
        </Button>
      </div>
      <pre>{JSON.stringify(segmentDataState, null, 2)}</pre>
    </div>
  );
};

export default SegmentEditor;
