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
import { ALPHABETS } from 'ts/const';
import {
  CategoryItemType,
  ERelationShip,
  IAnalyticsItem,
  IEventAnalyticsItem,
} from './AnalyticsType';
import ConditionItem from './ConditionItem';
import EventItem from './EventItem';
import RelationAnd from './comps/RelationAnd';
import RelationOr from './comps/RelationOr';

interface EventsSelectProps {
  data: IEventAnalyticsItem[];
  eventOptionList: CategoryItemType[];
  maxSelectNum?: number;
  disableAddCondition?: boolean;
  addEventButtonLabel: string;
  addNewEventAnalyticsItem: () => void;
  removeEventItem: (index: number) => void;
  addNewConditionItem: (index: number) => void;
  removeEventCondition: (eventIndex: number, conditionIndex: number) => void;
  changeConditionOperator: (
    eventIndex: number,
    conditionIndex: number,
    operator: SelectProps.Option | null
  ) => void;
  changeConditionCategoryOption: (
    eventIndex: number,
    conditionIndex: number,
    category: IAnalyticsItem | null
  ) => void;
  changeConditionValue: (
    eventIndex: number,
    conditionIndex: number,
    value: string[]
  ) => void;
  changeCurCategoryOption: (
    eventIndex: number,
    category: IAnalyticsItem | null
  ) => void;
  changeCurCalcMethodOption?: (
    eventIndex: number,
    calcMethod: SelectProps.Option | null
  ) => void;
  changeCurRelationShip?: (eventIndex: number, relation: ERelationShip) => void;
  loading?: boolean;
}
const EventsSelect: React.FC<EventsSelectProps> = (
  props: EventsSelectProps
) => {
  const {
    data,
    eventOptionList,
    maxSelectNum,
    disableAddCondition,
    addEventButtonLabel,
    addNewEventAnalyticsItem,
    removeEventItem,
    addNewConditionItem,
    removeEventCondition,
    changeConditionOperator,
    changeConditionValue,
    changeCurCategoryOption,
    changeConditionCategoryOption,
    changeCurCalcMethodOption,
    changeCurRelationShip,
    loading,
  } = props;
  const { t } = useTranslation();

  return (
    <div className="cs-analytics-dropdown">
      {data.map((element, index) => {
        return (
          <div key={identity(index)}>
            <div className="cs-analytics-parameter">
              <div className="cs-para-name">
                {element.customOrderName ??
                  (element?.listOrderType === 'alphabet'
                    ? ALPHABETS[index]
                    : index + 1)}
              </div>
              <div className="flex-1">
                <EventItem
                  placeholder={t('analytics:labels.eventSelectPlaceholder')}
                  calcMethodOption={element.calculateMethodOption}
                  categoryOption={element.selectedEventOption}
                  changeCurCategoryOption={(item) => {
                    changeCurCategoryOption(index, item);
                  }}
                  changeCurCalcMethodOption={(method) => {
                    changeCurCalcMethodOption?.(index, method);
                  }}
                  hasTab={element.hasTab}
                  isMultiSelect={element.isMultiSelect}
                  categories={eventOptionList}
                  loading={loading}
                  disabled={element.disabled}
                />
              </div>
              {!disableAddCondition && (
                <div className="ml-5">
                  <Button
                    onClick={() => {
                      addNewConditionItem(index);
                    }}
                    variant="link"
                    iconName="filter"
                  />
                </div>
              )}
              <div className="event-delete">
                {data.length > 1 && (
                  <span className="remove-icon">
                    <Button
                      onClick={() => {
                        removeEventItem(index);
                      }}
                      variant="link"
                      iconName="close"
                    />
                  </span>
                )}
              </div>
            </div>
            <div className="flex">
              {element.conditionList.length > 1 &&
                element.conditionRelationShip === ERelationShip.AND && (
                  <RelationAnd
                    enableChangeRelation={element.enableChangeRelation}
                    onClick={() => {
                      element.enableChangeRelation &&
                        changeCurRelationShip &&
                        changeCurRelationShip(index, ERelationShip.OR);
                    }}
                  />
                )}
              {element.conditionList.length > 1 &&
                element.conditionRelationShip === ERelationShip.OR && (
                  <RelationOr
                    enableChangeRelation={element.enableChangeRelation}
                    onClick={() => {
                      element.enableChangeRelation &&
                        changeCurRelationShip &&
                        changeCurRelationShip(index, ERelationShip.AND);
                    }}
                  />
                )}
              <div className="cs-analytics-param-events">
                {element.conditionList.length > 0 &&
                  element.conditionList.map((cElement, cIndex) => {
                    return (
                      <ConditionItem
                        item={cElement}
                        conditionOptions={element.conditionOptions}
                        key={identity(cIndex)}
                        removeConditionItem={() => {
                          removeEventCondition(index, cIndex);
                        }}
                        changeCurCategoryOption={(category) => {
                          changeConditionCategoryOption(
                            index,
                            cIndex,
                            category
                          );
                        }}
                        changeConditionOperator={(item) => {
                          changeConditionOperator(index, cIndex, item);
                        }}
                        changeConditionValue={(value) => {
                          changeConditionValue(index, cIndex, value);
                        }}
                      />
                    );
                  })}
              </div>
            </div>
          </div>
        );
      })}
      <div className="mt-10">
        <Button
          iconName="add-plus"
          onClick={addNewEventAnalyticsItem}
          disabled={data.length >= (maxSelectNum ?? 10)}
        >
          {addEventButtonLabel}
        </Button>
      </div>
    </div>
  );
};

export default EventsSelect;
