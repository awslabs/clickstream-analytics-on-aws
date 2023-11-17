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
import { useTranslation } from 'react-i18next';
import { ALPHABETS } from 'ts/const';
import {
  CategoryItemType,
  ERelationShip,
  IAnalyticsItem,
  IRetentionAnalyticsItem,
} from './AnalyticsType';
import RetentionItem from './RetentionItem';

interface RetentionSelectProps {
  data: IRetentionAnalyticsItem[];
  eventOptionList: CategoryItemType[];
  addEventButtonLabel: string;
  maxSelectNum?: number;
  loading: boolean;
  addStartNewConditionItem: (index: number) => void;
  addRevisitNewConditionItem: (index: number) => void;
  changeStartRelationShip: (index: number, relationShip: ERelationShip) => void;
  changeRevisitRelationShip: (
    index: number,
    relationShip: ERelationShip
  ) => void;
  removeStartEventCondition: (index: number, conditionIndex: number) => void;
  removeRevisitEventCondition: (index: number, conditionIndex: number) => void;
  changeStartConditionCategoryOption: (
    eventIndex: number,
    conditionIndex: number,
    category: IAnalyticsItem | null
  ) => void;
  changeRevisitConditionCategoryOption: (
    eventIndex: number,
    conditionIndex: number,
    category: IAnalyticsItem | null
  ) => void;
  changeStartConditionOperator: (
    index: number,
    conditionIndex: number,
    value: SelectProps.Option | null
  ) => void;
  changeRevisitConditionOperator: (
    index: number,
    conditionIndex: number,
    value: SelectProps.Option | null
  ) => void;
  changeStartConditionValue: (
    index: number,
    conditionIndex: number,
    value: string[]
  ) => void;
  changeRevisitConditionValue: (
    index: number,
    conditionIndex: number,
    value: string[]
  ) => void;
  addNewEventAnalyticsItem: () => void;
  removeRetentionEventItem: (index: number) => void;
  changeStartEvent: (index: number, event: IAnalyticsItem | null) => void;
  changeRevisitEvent: (index: number, event: IAnalyticsItem | null) => void;
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
    maxSelectNum,
    loading,
    addStartNewConditionItem,
    addRevisitNewConditionItem,
    changeStartRelationShip,
    changeRevisitRelationShip,
    removeStartEventCondition,
    removeRevisitEventCondition,
    changeStartConditionCategoryOption,
    changeRevisitConditionCategoryOption,
    changeStartConditionOperator,
    changeRevisitConditionOperator,
    changeStartConditionValue,
    changeRevisitConditionValue,
    addNewEventAnalyticsItem,
    removeRetentionEventItem,
    changeStartEvent,
    changeRevisitEvent,
    changeStartRelativeAttribute,
    changeRevisitRelativeAttribute,
    changeShowRelation,
  } = props;
  const { t } = useTranslation();

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
                    {t('analytics:labels.associatedProperties')}
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
              loading={loading}
              label={t('analytics:labels.retentionStart')}
              showRelation={element.showRelation}
              eventOptionList={eventOptionList}
              attributeOptionList={
                element.startEventRelationAttributeOptions ?? []
              }
              value={element.startEventOption}
              attributeValue={element.startEventRelationAttribute}
              addNewConditionItem={() => {
                addStartNewConditionItem(index);
              }}
              changeCurRelationShip={(relationShip) => {
                changeStartRelationShip(index, relationShip);
              }}
              changeEventOption={(option) => {
                changeStartEvent(index, option);
              }}
              changeRelationAttributeOption={(attribute) => {
                changeStartRelativeAttribute(index, attribute);
              }}
              conditionOptions={element.startConditionOptions}
              conditionList={element.startConditionList}
              conditionRelationShip={element.startConditionRelationShip}
              enableChangeRelation={true}
              removeEventCondition={(conditionIndex) => {
                removeStartEventCondition(index, conditionIndex);
              }}
              changeConditionOperator={(conditionIndex, value) => {
                changeStartConditionOperator(index, conditionIndex, value);
              }}
              changeConditionCategoryOption={(conditionIndex, value) => {
                changeStartConditionCategoryOption(
                  index,
                  conditionIndex,
                  value
                );
              }}
              changeConditionValue={(conditionIndex, value) => {
                changeStartConditionValue(index, conditionIndex, value);
              }}
            />
            <RetentionItem
              loading={loading}
              label={t('analytics:labels.retentionRevisit')}
              showRelation={element.showRelation}
              eventOptionList={eventOptionList}
              attributeOptionList={
                element.revisitEventRelationAttributeOptions ?? []
              }
              value={element.revisitEventOption}
              attributeValue={element.revisitEventRelationAttribute}
              addNewConditionItem={() => {
                addRevisitNewConditionItem(index);
              }}
              changeCurRelationShip={(relationShip) => {
                changeRevisitRelationShip(index, relationShip);
              }}
              changeEventOption={(option) => {
                changeRevisitEvent(index, option);
              }}
              changeRelationAttributeOption={(attribute) => {
                changeRevisitRelativeAttribute(index, attribute);
              }}
              conditionOptions={element.revisitConditionOptions}
              conditionList={element.revisitConditionList}
              conditionRelationShip={element.revisitConditionRelationShip}
              enableChangeRelation={true}
              removeEventCondition={(conditionIndex) => {
                removeRevisitEventCondition(index, conditionIndex);
              }}
              changeConditionOperator={(conditionIndex, value) => {
                changeRevisitConditionOperator(index, conditionIndex, value);
              }}
              changeConditionCategoryOption={(conditionIndex, value) => {
                changeRevisitConditionCategoryOption(
                  index,
                  conditionIndex,
                  value
                );
              }}
              changeConditionValue={(conditionIndex, value) => {
                changeRevisitConditionValue(index, conditionIndex, value);
              }}
            />
          </div>
        );
      })}
      <div className="mt-5">
        <Button
          iconName="add-plus"
          onClick={addNewEventAnalyticsItem}
          disabled={data.length >= (maxSelectNum ?? 5)}
        >
          {addEventButtonLabel}
        </Button>
      </div>
    </div>
  );
};

export default RetentionSelect;
