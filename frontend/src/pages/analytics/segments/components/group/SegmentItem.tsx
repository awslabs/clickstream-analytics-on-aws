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
import { AnalyticsSegmentActionType } from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import { useSegmentContext } from 'context/SegmentContext';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { darkBackgroundColors } from 'ts/const';
import { defaultStr } from 'ts/utils';
import ConditionTimeRange from './ConditionTimeRange';
import RenderNestSegment from './RenderNestSegment';

interface SegmentItemProps {
  segmentItemData: IEventSegmentationItem;
  index: number;
  hideRemove?: boolean;
}

const SegmentItem: React.FC<SegmentItemProps> = (props: SegmentItemProps) => {
  const { segmentItemData, index, hideRemove } = props;
  const { segmentDataDispatch } = useSegmentContext();
  const { t } = useTranslation();

  return (
    <div className="flex-v gap-5">
      <div className="cs-analytics-group-header-bg">
        <div className="flex space-between">
          <div className="flex align-center gap-5 flex-1">
            <div
              className="cs-analytics-group-index"
              style={{ backgroundColor: darkBackgroundColors[index % 10] }}
            >
              {index + 1}
            </div>
            <div className="flex-1 m-w-300">
              <Input
                placeholder={defaultStr(
                  t('analytics:segment.comp.segmentDescPlaceholder')
                )}
                value={segmentItemData.groupName ?? ''}
                onChange={({ detail }) => {
                  segmentDataDispatch({
                    type: AnalyticsSegmentActionType.UpdateFilterGroupName,
                    index: index,
                    name: detail.value,
                  });
                }}
              />
            </div>
          </div>
          <div>
            {!hideRemove && (
              <Button
                variant="link"
                iconName="close"
                onClick={() => {
                  segmentDataDispatch({
                    type: AnalyticsSegmentActionType.RemoveFilterGroup,
                    index: index,
                  });
                }}
              />
            )}
          </div>
        </div>
      </div>
      <div className="flex-v gap-5 cs-analytics-group-content-bg">
        <ConditionTimeRange groupIndex={index} segmentData={segmentItemData} />
        <div className="cs-analytics-dropdown">
          <RenderNestSegment
            level={1}
            parentIndex={index}
            rootIndex={index}
            segmentItemData={segmentItemData ?? []}
          />
        </div>
        <div className="mt-10">
          <Button
            variant="primary"
            onClick={() => {
              segmentDataDispatch({
                type: AnalyticsSegmentActionType.AddAndEventData,
                rootIndex: index,
              });
            }}
          >
            {t('button.and')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SegmentItem;
