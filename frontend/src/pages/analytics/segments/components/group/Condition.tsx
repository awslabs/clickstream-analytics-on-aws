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

import { Select, SelectProps } from '@cloudscape-design/components';
import React, { useEffect, useRef, useState } from 'react';

enum ConditionType {
  USER_DONE = 'USER_DONE',
  USER_NOT_DONE = 'USER_NOT_DONE',
  USER_DONE_IN_SEQUENCE = 'USER_DONE_IN_SEQUENCE',
  USER_IS = 'USER_IS',
  USER_IS_NOT = 'USER_IS_NOT',
}

const CONDITION_LIST: SelectProps.Option[] = [
  { label: 'User has done', value: ConditionType.USER_DONE },
  { label: 'The user has not done', value: ConditionType.USER_NOT_DONE },
  {
    label: 'User has done in sequence',
    value: ConditionType.USER_DONE_IN_SEQUENCE,
  },
  { label: 'User is', value: ConditionType.USER_IS },
  { label: 'User is not', value: ConditionType.USER_IS_NOT },
];

interface ConditionProps {
  updateConditionWidth: (w: number) => void;
}

const Condition: React.FC<ConditionProps> = (props: ConditionProps) => {
  const { updateConditionWidth } = props;
  const [selectedOption, setSelectedOption] = useState<SelectProps.Option>(
    CONDITION_LIST[0]
  );
  const selectRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const calculateWidth = () => {
      if (selectRef.current) {
        const width = selectRef.current.getBoundingClientRect().width;
        updateConditionWidth(width);
      }
    };
    calculateWidth();
  }, [selectedOption]);

  return (
    <div ref={selectRef}>
      <Select
        selectedOption={selectedOption}
        onChange={({ detail }) => setSelectedOption(detail.selectedOption)}
        options={CONDITION_LIST}
      />
    </div>
  );
};

export default Condition;
