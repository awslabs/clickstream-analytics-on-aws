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
import { identity } from 'lodash';
import React from 'react';
import SegmentItem from './group/SegmentItem';

const FILTER_GROUP_DATA = ['1'];

const SegmentEditor: React.FC = () => {
  return (
    <div className="flex-v gap-10">
      {FILTER_GROUP_DATA.map((item, index) => {
        return (
          <div key={identity(index)}>
            <SegmentItem />
            {index < FILTER_GROUP_DATA.length - 1 && (
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
