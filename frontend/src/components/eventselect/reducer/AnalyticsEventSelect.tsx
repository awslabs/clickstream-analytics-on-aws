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
import { ALPHABETS } from 'ts/const';
import { IMetadataBuiltInList } from 'ts/explore-types';
import { AnalyticsDispatchFunction } from './analyticsEventSelectReducer';
import {
  CategoryItemType,
  ERelationShip,
  IEventAnalyticsItem,
} from '../AnalyticsType';
import ConditionItem from '../ConditionItem';
import EventItem from '../EventItem';
import RelationAnd from '../comps/RelationAnd';
import RelationOr from '../comps/RelationOr';

interface EventsSelectProps {
  eventPlaceholder: string;
  eventDataState: IEventAnalyticsItem[];
  eventDataDispatch: AnalyticsDispatchFunction;
  maxSelectNum?: number;
  disableAddCondition?: boolean;
  disableAddEvent?: boolean;
  addEventButtonLabel: string;
  loading: boolean;
  eventOptionList: CategoryItemType[];
  defaultComputeMethodOption: SelectProps.Option;
  isMultiSelect: boolean;
  enableChangeRelation: boolean;
  builtInMetadata?: IMetadataBuiltInList;
  metadataEvents: IMetadataEvent[];
  metadataEventParameters: IMetadataEventParameter[];
  metadataUserAttributes: IMetadataUserAttribute[];
}
const AnalyticsEventSelect: React.FC<EventsSelectProps> = (
  props: EventsSelectProps
) => {
  const {
    eventPlaceholder,
    eventDataState,
    eventDataDispatch,
    maxSelectNum,
    disableAddCondition,
    disableAddEvent,
    addEventButtonLabel,
    eventOptionList,
    defaultComputeMethodOption,
    isMultiSelect,
    enableChangeRelation,
    builtInMetadata,
    metadataEvents,
    metadataEventParameters,
    metadataUserAttributes,
    loading,
  } = props;

  return (
    <div className="cs-analytics-dropdown">
      {eventDataState.map((element, index) => {
        return (
          <div key={identity(index)}>
            <div className="cs-analytics-parameter">
              {!disableAddEvent && (
                <div className="cs-para-name">
                  {element.customOrderName ??
                    (element?.listOrderType === 'alphabet'
                      ? ALPHABETS[index]
                      : index + 1)}
                </div>
              )}
              <div className="flex-1">
                <EventItem
                  type="event"
                  placeholder={eventPlaceholder}
                  calcMethodOption={element.calculateMethodOption}
                  categoryOption={element.selectedEventOption}
                  changeCurCategoryOption={(item) => {
                    eventDataDispatch({
                      type: 'changeCurCategoryOption',
                      eventIndex: index,
                      categoryOption: item,
                      builtInMetadata,
                      metadataEvents,
                      metadataEventParameters,
                      metadataUserAttributes,
                    });
                  }}
                  changeCurCalcMethodOption={(method) => {
                    eventDataDispatch({
                      type: 'changeCurCalcMethodOption',
                      eventIndex: index,
                      methodOption: method,
                    });
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
                      eventDataDispatch({
                        type: 'addNewConditionItem',
                        index,
                      });
                    }}
                    variant="link"
                    iconName="filter"
                  />
                </div>
              )}
              <div className="event-delete">
                {eventDataState.length > 1 && (
                  <span className="remove-icon">
                    <Button
                      onClick={() => {
                        eventDataDispatch({
                          type: 'removeEventItem',
                          index,
                        });
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
                        eventDataDispatch({
                          type: 'changeCurRelationShip',
                          eventIndex: index,
                          relation: ERelationShip.OR,
                        });
                    }}
                  />
                )}
              {element.conditionList.length > 1 &&
                element.conditionRelationShip === ERelationShip.OR && (
                  <RelationOr
                    enableChangeRelation={element.enableChangeRelation}
                    onClick={() => {
                      element.enableChangeRelation &&
                        eventDataDispatch({
                          type: 'changeCurRelationShip',
                          eventIndex: index,
                          relation: ERelationShip.AND,
                        });
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
                          eventDataDispatch({
                            type: 'removeEventCondition',
                            eventIndex: index,
                            conditionIndex: cIndex,
                          });
                        }}
                        changeCurCategoryOption={(category) => {
                          eventDataDispatch({
                            type: 'changeConditionCategoryOption',
                            eventIndex: index,
                            conditionIndex: cIndex,
                            conditionOption: category,
                          });
                        }}
                        changeConditionOperator={(item) => {
                          eventDataDispatch({
                            type: 'changeConditionOperator',
                            eventIndex: index,
                            conditionIndex: cIndex,
                            conditionOperator: item,
                          });
                        }}
                        changeConditionValue={(value) => {
                          eventDataDispatch({
                            type: 'changeConditionValue',
                            eventIndex: index,
                            conditionIndex: cIndex,
                            value,
                          });
                        }}
                      />
                    );
                  })}
              </div>
            </div>
          </div>
        );
      })}
      {!disableAddEvent && (
        <div className="mt-10">
          <Button
            iconName="add-plus"
            onClick={() => {
              eventDataDispatch({
                type: 'addNewEventAnalyticsItem',
                defaultComputeMethodOption,
                isMultiSelect,
                enableChangeRelation,
              });
            }}
            disabled={eventDataState.length >= (maxSelectNum ?? 10)}
          >
            {addEventButtonLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AnalyticsEventSelect;
