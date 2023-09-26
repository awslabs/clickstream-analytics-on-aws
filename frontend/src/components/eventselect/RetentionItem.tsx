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

import { Button, SelectProps } from '@cloudscape-design/components';
import { identity } from 'lodash';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CategoryItemType,
  ERelationShip,
  IAnalyticsItem,
  IConditionItemType,
} from './AnalyticsType';
import ConditionItem from './ConditionItem';
import EventItem from './EventItem';
import RelationAnd from './comps/RelationAnd';
import RelationOr from './comps/RelationOr';

interface RetentionItemProps {
  label: string;
  value: SelectProps.Option | null;
  conditionOptions: CategoryItemType[];
  conditionList: IConditionItemType[];
  conditionRelationShip: ERelationShip;
  enableChangeRelation: boolean;
  attributeValue: SelectProps.Option | null;
  eventOptionList: CategoryItemType[];
  attributeOptionList: CategoryItemType[];
  showRelation: boolean;
  disableAddCondition?: boolean;
  addNewConditionItem: () => void;
  removeEventCondition: (conditionIndex: number) => void;
  changeCurRelationShip: (relationShip: ERelationShip) => void;
  changeConditionOperator: (
    conditionIndex: number,
    operator: SelectProps.Option | null
  ) => void;
  changeConditionCategoryOption: (
    conditionIndex: number,
    category: IAnalyticsItem | null
  ) => void;
  changeConditionValue: (conditionIndex: number, value: string[]) => void;
  changeEventOption: (event: SelectProps.Option | null) => void;
  changeRelationAttributeOption: (attribute: SelectProps.Option | null) => void;
}

const RetentionItem: React.FC<RetentionItemProps> = (
  props: RetentionItemProps
) => {
  const {
    label,
    value,
    conditionOptions,
    conditionList,
    conditionRelationShip,
    enableChangeRelation,
    attributeValue,
    eventOptionList,
    attributeOptionList,
    showRelation,
    disableAddCondition,
    addNewConditionItem,
    changeCurRelationShip,
    removeEventCondition,
    changeConditionOperator,
    changeConditionCategoryOption,
    changeConditionValue,
    changeEventOption,
    changeRelationAttributeOption,
  } = props;
  const { t } = useTranslation();

  return (
    <div className="mb-5">
      <div className="cs-analytics-parameter">
        <div className="cs-para-name">{label}</div>
        <div className="flex-1">
          <EventItem
            placeholder={t('analytics:labels.eventSelectPlaceholder')}
            categoryOption={value}
            changeCurCategoryOption={(item) => {
              changeEventOption(item);
            }}
            hasTab={true}
            isMultiSelect={false}
            categories={eventOptionList}
          />
        </div>
        {!disableAddCondition && (
          <div className="ml-5">
            <Button
              onClick={() => {
                addNewConditionItem();
              }}
              variant="link"
              iconName="add-plus"
            />
          </div>
        )}
      </div>
      <div className="flex">
        {conditionList.length > 1 &&
          conditionRelationShip === ERelationShip.AND && (
            <RelationAnd
              enableChangeRelation={enableChangeRelation}
              onClick={() => {
                enableChangeRelation &&
                  changeCurRelationShip &&
                  changeCurRelationShip(ERelationShip.OR);
              }}
            />
          )}
        {conditionList.length > 1 &&
          conditionRelationShip === ERelationShip.OR && (
            <RelationOr
              enableChangeRelation={enableChangeRelation}
              onClick={() => {
                enableChangeRelation &&
                  changeCurRelationShip &&
                  changeCurRelationShip(ERelationShip.AND);
              }}
            />
          )}
        <div className="cs-analytics-param-events">
          {conditionList.length > 0 &&
            conditionList.map((cElement, cIndex) => {
              return (
                <ConditionItem
                  item={cElement}
                  conditionOptions={conditionOptions}
                  key={identity(cIndex)}
                  removeConditionItem={() => {
                    removeEventCondition(cIndex);
                  }}
                  changeCurCategoryOption={(category) => {
                    changeConditionCategoryOption(cIndex, category);
                  }}
                  changeConditionOperator={(item) => {
                    changeConditionOperator(cIndex, item);
                  }}
                  changeConditionValue={(value) => {
                    changeConditionValue(cIndex, value);
                  }}
                />
              );
            })}
        </div>
      </div>
      <div>
        {showRelation && (
          <div className="cs-analytics-parameter pl-30 mt-5">
            <div className="cs-para-name">
              {t('analytics:labels.associatedProperties')}
            </div>
            <div className="flex-1">
              <EventItem
                placeholder={t('analytics:labels.attributeSelectPlaceholder')}
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
