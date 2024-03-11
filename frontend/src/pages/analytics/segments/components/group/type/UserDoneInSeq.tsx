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
import {
  AnalyticsSegmentAction,
  AnalyticsSegmentActionType,
} from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import React, { Dispatch } from 'react';
import { useTranslation } from 'react-i18next';
import { SegmentPropsData } from '../ConditionGroup';

export const EVENT_SEQUENCE_SESSION_OPTION = [
  { label: 'Within a session', value: 'within_a_session' },
  { label: 'Without a session', value: 'without_a_session' },
];
export const EVENT_SEQUENCE_FLOW_OPTION = [
  { label: 'Indirectly flow', value: 'indirectly_flow' },
  { label: 'Directly flow', value: 'directly_flow' },
];

interface UserDoneInSeqProps {
  segmentData: IEventSegmentationItem;
  segmentProps: SegmentPropsData;
  segmentDataDispatch: Dispatch<AnalyticsSegmentAction>;
}

const UserDoneInSeq: React.FC<UserDoneInSeqProps> = (
  props: UserDoneInSeqProps
) => {
  const { t } = useTranslation();
  const { segmentData, segmentProps, segmentDataDispatch } = props;
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
          options={EVENT_SEQUENCE_SESSION_OPTION}
          selectedOption={
            segmentData.userSequenceSession ??
            null ??
            EVENT_SEQUENCE_SESSION_OPTION[0]
          }
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
          options={EVENT_SEQUENCE_FLOW_OPTION}
          selectedOption={
            segmentData.userSequenceFlow ?? EVENT_SEQUENCE_FLOW_OPTION[0]
          }
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
