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
import RelationAnd from 'components/eventselect/comps/RelationAnd';
import RelationOr from 'components/eventselect/comps/RelationOr';
import React from 'react';
import ConditionGroup from './ConditionGroup';
import ConditionTimeRange from './ConditionTimeRange';

const SegmentItem: React.FC = () => {
  return (
    <div>
      <div className="flex-v gap-5">
        <div style={{ backgroundColor: '#79bcfa', padding: '4px 5px' }}>
          <div className="flex align-center m-w-300 gap-5">
            <div className="cs-analytics-group-index">1</div>
            <div className="flex-1">
              <Input value="" />
            </div>
          </div>
        </div>
        <div
          className="flex-v gap-5"
          style={{ backgroundColor: '#f7f9fc', padding: '15px' }}
        >
          <ConditionTimeRange />
          <div className="cs-analytics-dropdown">
            <div className="flex gap-10">
              <RelationAnd enableChangeRelation={false} />
              <div className="flex-v gap-10">
                <div className="flex gap-10">
                  <RelationOr isIsolate enableChangeRelation={false} />
                  <ConditionGroup />
                </div>
                <ConditionGroup />
              </div>
            </div>
          </div>
          <div>
            <Button variant="primary">And</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SegmentItem;
