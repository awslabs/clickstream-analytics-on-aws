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

import { Button, Select } from '@cloudscape-design/components';
import { IEventSegmentationItem } from 'components/eventselect/AnalyticsType';
import { AnalyticsSegmentActionType } from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import { useSegmentContext } from 'context/SegmentContext';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { SegmentPropsData } from '../ConditionGroup';

interface UserDoneInSeqProps {
  segmentData: IEventSegmentationItem;
  segmentProps: SegmentPropsData;
}

const UserDoneInSeq: React.FC<UserDoneInSeqProps> = (
  props: UserDoneInSeqProps
) => {
  const { t } = useTranslation();
  const { segmentData, segmentProps } = props;
  const { segmentDataState, segmentDataDispatch } = useSegmentContext();

  return (
    <div className="flex gap-5">
      <div>
        <Button
          iconName="add-plus"
          onClick={() => {
            segmentDataDispatch({
              type: AnalyticsSegmentActionType.AddSequenceDoneEvent,
              segmentProps,
            });
          }}
        >
          {t('button.event')}
        </Button>
      </div>
      <div>
        <Select
          options={segmentDataState.eventSessionOptions}
          selectedOption={segmentData.userSequenceSession ?? null}
          onChange={(e) => {
            segmentDataDispatch({
              type: AnalyticsSegmentActionType.UpdateSequenceSessionType,
              segmentProps,
              session: e.detail.selectedOption,
            });
          }}
        />
      </div>
      <div>
        <Select
          options={segmentDataState.eventFlowOptions}
          selectedOption={segmentData.userSequenceFlow ?? null}
          onChange={(e) => {
            segmentDataDispatch({
              type: AnalyticsSegmentActionType.UpdateSequenceFlowType,
              segmentProps,
              flow: e.detail.selectedOption,
            });
          }}
        />
      </div>
    </div>
  );
};

export default UserDoneInSeq;
