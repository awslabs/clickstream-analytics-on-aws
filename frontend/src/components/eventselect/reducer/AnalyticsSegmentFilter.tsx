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
  ERelationShip,
  IAnalyticsItem,
  SegmentationFilterDataType,
} from '../AnalyticsType';
import ConditionItem from '../ConditionItem';
import RelationAnd from '../comps/RelationAnd';
import RelationOr from '../comps/RelationOr';

interface SegmentationFilterProps {
  filterDataState: SegmentationFilterDataType;
  filterDataDispatch: any;
  maxSelectNum?: number;
  hideAddButton?: boolean;
  // For Segment Components
  addSegmentCondition?: () => void;
  changeSegmentConditionRelation?: (relation: ERelationShip) => void;
  updateSegmentConditionItem?: (
    index: number,
    item: IAnalyticsItem | null
  ) => void;
  updateSegmentConditionOperator?: (
    index: number,
    operator: SelectProps.Option | null
  ) => void;
  updateSegmentConditionValue?: (index: number, value: string[]) => void;
  removeSegmentConditionItem?: (index: number) => void;
}

const AnalyticsSegmentFilter: React.FC<SegmentationFilterProps> = (
  props: SegmentationFilterProps
) => {
  const { t } = useTranslation();
  const {
    filterDataState,
    filterDataDispatch,
    maxSelectNum,
    hideAddButton,
    addSegmentCondition,
    changeSegmentConditionRelation,
    updateSegmentConditionItem,
    updateSegmentConditionOperator,
    updateSegmentConditionValue,
    removeSegmentConditionItem,
  } = props;

  return (
    <div className="cs-analytics-dropdown">
      <div>
        <div className="flex">
          {filterDataState.data.length > 1 &&
            filterDataState.conditionRelationShip === ERelationShip.AND && (
              <RelationAnd
                enableChangeRelation={filterDataState.enableChangeRelation}
                onClick={() => {
                  filterDataState.enableChangeRelation &&
                    filterDataDispatch({
                      type: 'changeRelationShip',
                      relation: ERelationShip.OR,
                    });
                  changeSegmentConditionRelation?.(ERelationShip.OR);
                }}
              />
            )}
          {filterDataState.data.length > 1 &&
            filterDataState.conditionRelationShip === ERelationShip.OR && (
              <RelationOr
                enableChangeRelation={filterDataState.enableChangeRelation}
                onClick={() => {
                  filterDataState.enableChangeRelation &&
                    filterDataDispatch({
                      type: 'changeRelationShip',
                      relation: ERelationShip.AND,
                    });
                  changeSegmentConditionRelation?.(ERelationShip.AND);
                }}
              />
            )}
          <div className="cs-analytics-param-events">
            {filterDataState.data.length > 0 &&
              filterDataState.data.map((element, index) => {
                return (
                  <ConditionItem
                    item={element}
                    conditionOptions={filterDataState.conditionOptions}
                    key={identity(index)}
                    removeConditionItem={() => {
                      filterDataDispatch({
                        type: 'removeEventCondition',
                        index: index,
                      });
                      removeSegmentConditionItem?.(index);
                    }}
                    changeCurCategoryOption={(category) => {
                      filterDataDispatch({
                        type: 'changeConditionCategoryOption',
                        index: index,
                        option: category,
                      });
                      updateSegmentConditionItem?.(index, category);
                    }}
                    changeConditionOperator={(item) => {
                      filterDataDispatch({
                        type: 'changeConditionOperator',
                        index: index,
                        operator: item,
                      });
                      updateSegmentConditionOperator?.(index, item);
                    }}
                    changeConditionValue={(value) => {
                      filterDataDispatch({
                        type: 'changeConditionValue',
                        index: index,
                        value: value,
                      });
                      updateSegmentConditionValue?.(index, value);
                    }}
                  />
                );
              })}
          </div>
        </div>
        {!hideAddButton && (
          <div className="mt-10">
            <Button
              iconName="add-plus"
              onClick={() => {
                filterDataDispatch({
                  type: 'addEventCondition',
                });
                addSegmentCondition?.();
              }}
              disabled={filterDataState.data.length >= (maxSelectNum ?? 10)}
            >
              {t('common:button.addFilter')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsSegmentFilter;
