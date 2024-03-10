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
import {
  AnalyticsSegmentAction,
  AnalyticsSegmentActionType,
} from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import React, { Dispatch } from 'react';
import { SegmentPropsData } from '../ConditionGroup';

export const EVENT_SEQUENCE_SESSION_OPTION = [
  { label: 'Session Start', value: 'session_start' },
  { label: 'Session End', value: 'session_end' },
];
export const EVENT_SEQUENCE_FLOW_OPTION = [
  { label: 'Flow Start', value: 'flow_start' },
  { label: 'Flow End', value: 'flow_end' },
];

interface UserDoneInSeqProps {
  segmentProps: SegmentPropsData;
  segmentDataDispatch: Dispatch<AnalyticsSegmentAction>;
}

const UserDoneInSeq: React.FC<UserDoneInSeqProps> = (
  props: UserDoneInSeqProps
) => {
  const { segmentProps, segmentDataDispatch } = props;
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
          Event
        </Button>
      </div>
      <div>
        <Select
          options={EVENT_SEQUENCE_SESSION_OPTION}
          selectedOption={EVENT_SEQUENCE_SESSION_OPTION[0]}
        />
      </div>
      <div>
        <Select
          options={EVENT_SEQUENCE_FLOW_OPTION}
          selectedOption={EVENT_SEQUENCE_FLOW_OPTION[0]}
        />
      </div>
    </div>
  );
};

export default UserDoneInSeq;
