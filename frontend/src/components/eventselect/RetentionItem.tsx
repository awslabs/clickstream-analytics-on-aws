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

import { SelectProps } from '@cloudscape-design/components';
import React from 'react';
import { CategoryItemType } from './AnalyticsType';
import EventItem from './EventItem';

interface RetentionItemProps {
  label: string;
  value: SelectProps.Option | null;
  attributeValue: SelectProps.Option | null;
  eventOptionList: CategoryItemType[];
  attributeOptionList: CategoryItemType[];
  showRelation: boolean;
  changeEventOption: (event: SelectProps.Option | null) => void;
  changeRelationAttributeOption: (attribute: SelectProps.Option | null) => void;
}

const RetentionItem: React.FC<RetentionItemProps> = (
  props: RetentionItemProps
) => {
  const {
    label,
    value,
    attributeValue,
    eventOptionList,
    attributeOptionList,
    showRelation,
    changeEventOption,
    changeRelationAttributeOption,
  } = props;
  return (
    <div className="mb-5">
      <div className="cs-analytics-parameter">
        <div className="cs-para-name">{label}</div>
        <div className="flex-1">
          <EventItem
            placeholder="Select Event"
            categoryOption={value}
            changeCurCategoryOption={(item) => {
              changeEventOption(item);
            }}
            hasTab={true}
            isMultiSelect={false}
            categories={eventOptionList}
          />
        </div>
      </div>
      <div>
        {showRelation && (
          <div className="cs-analytics-parameter pl-30 mt-5">
            <div className="cs-para-name">关联属性</div>
            <div className="flex-1">
              <EventItem
                placeholder="Select Attribute"
                categoryOption={attributeValue}
                changeCurCategoryOption={(item) => {
                  changeRelationAttributeOption(item);
                }}
                hasTab={false}
                isMultiSelect={false}
                categories={attributeOptionList}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RetentionItem;
