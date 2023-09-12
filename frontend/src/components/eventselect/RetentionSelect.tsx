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

import { Button, SelectProps, Toggle } from '@cloudscape-design/components';
import { identity } from 'lodash';
import React from 'react';
import { ALPHABETS } from 'ts/const';
import {
  CategoryItemType,
  IRetentionAnalyticsItem,
  MOCK_ATTRIBUTE_OPTION_LIST,
} from './AnalyticsType';
import RetentionItem from './RetentionItem';

interface RetentionSelectProps {
  data: IRetentionAnalyticsItem[];
  eventOptionList: CategoryItemType[];
  addEventButtonLabel: string;
  addNewEventAnalyticsItem: () => void;
  removeRetentionEventItem: (index: number) => void;
  changeStartEvent: (index: number, event: SelectProps.Option | null) => void;
  changeRevisitEvent: (index: number, event: SelectProps.Option | null) => void;
  changeStartRelativeAttribute: (
    index: number,
    attribute: SelectProps.Option | null
  ) => void;
  changeRevisitRelativeAttribute: (
    index: number,
    attribute: SelectProps.Option | null
  ) => void;
  changeShowRelation: (index: number, show: boolean) => void;
}
const RetentionSelect: React.FC<RetentionSelectProps> = (
  props: RetentionSelectProps
) => {
  const {
    data,
    eventOptionList,
    addEventButtonLabel,
    addNewEventAnalyticsItem,
    removeRetentionEventItem,
    changeStartEvent,
    changeRevisitEvent,
    changeStartRelativeAttribute,
    changeRevisitRelativeAttribute,
    changeShowRelation,
  } = props;

  return (
    <div className="cs-analytics-dropdown">
      {data.map((element, index) => {
        return (
          <div key={identity(index)} className="cs-retention-item">
            <div className="cs-dropdown-retention-header align-center">
              <div className="header-label">{ALPHABETS[index]}</div>
              <div>
                <div className="header-option flex align-center">
                  <Toggle
                    onChange={({ detail }) => {
                      changeShowRelation(index, detail.checked);
                    }}
                    checked={element.showRelation}
                  >
                    关联属性
                  </Toggle>

                  <div className="ml-10">
                    {data.length > 1 && (
                      <Button
                        onClick={() => {
                          removeRetentionEventItem(index);
                        }}
                        variant="link"
                        iconName="close"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
            <RetentionItem
              label="起始"
              showRelation={element.showRelation}
              eventOptionList={eventOptionList}
              attributeOptionList={MOCK_ATTRIBUTE_OPTION_LIST}
              value={element.startEventOption}
              attributeValue={element.startEventRelationAttribute}
              changeEventOption={(option) => {
                changeStartEvent(index, option);
              }}
              changeRelationAttributeOption={(attribute) => {
                changeStartRelativeAttribute(index, attribute);
              }}
            />
            <RetentionItem
              label="回访"
              showRelation={element.showRelation}
              eventOptionList={eventOptionList}
              attributeOptionList={MOCK_ATTRIBUTE_OPTION_LIST}
              value={element.revisitEventOption}
              attributeValue={element.revisitEventRelationAttribute}
              changeEventOption={(option) => {
                changeRevisitEvent(index, option);
              }}
              changeRelationAttributeOption={(attribute) => {
                changeRevisitRelativeAttribute(index, attribute);
              }}
            />
          </div>
        );
      })}
      <div className="mt-5">
        <Button iconName="add-plus" onClick={addNewEventAnalyticsItem}>
          {addEventButtonLabel}
        </Button>
      </div>
    </div>
  );
};

export default RetentionSelect;
