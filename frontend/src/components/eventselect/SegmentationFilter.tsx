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
} from './AnalyticsType';
import ConditionItem from './ConditionItem';
import RelationAnd from './comps/RelationAnd';
import RelationOr from './comps/RelationOr';

interface SegmentationFilterProps {
  segmentationData: SegmentationFilterDataType;
  maxSelectNum?: number;
  addNewConditionItem: () => void;
  removeEventCondition: (index: number) => void;
  changeConditionOperator: (
    index: number,
    operator: SelectProps.Option | null
  ) => void;
  changeConditionCategoryOption: (
    index: number,
    category: IAnalyticsItem | null
  ) => void;
  changeConditionValue: (index: number, value: any) => void;
  changeCurRelationShip?: (relation: ERelationShip) => void;
}
const SegmentationFilter: React.FC<SegmentationFilterProps> = (
  props: SegmentationFilterProps
) => {
  const { t } = useTranslation();
  const {
    segmentationData,
    maxSelectNum,
    addNewConditionItem,
    removeEventCondition,
    changeConditionOperator,
    changeConditionValue,
    changeConditionCategoryOption,
    changeCurRelationShip,
  } = props;

  return (
    <div className="cs-analytics-dropdown">
      <div>
        <div className="flex">
          {segmentationData.data.length > 1 &&
            segmentationData.conditionRelationShip === ERelationShip.AND && (
              <RelationAnd
                enableChangeRelation={segmentationData.enableChangeRelation}
                onClick={() => {
                  segmentationData.enableChangeRelation &&
                    changeCurRelationShip &&
                    changeCurRelationShip(ERelationShip.OR);
                }}
              />
            )}
          {segmentationData.data.length > 1 &&
            segmentationData.conditionRelationShip === ERelationShip.OR && (
              <RelationOr
                enableChangeRelation={segmentationData.enableChangeRelation}
                onClick={() => {
                  segmentationData.enableChangeRelation &&
                    changeCurRelationShip &&
                    changeCurRelationShip(ERelationShip.AND);
                }}
              />
            )}
          <div className="cs-analytics-param-events">
            {segmentationData.data.length > 0 &&
              segmentationData.data.map((element, index) => {
                return (
                  <ConditionItem
                    item={element}
                    conditionOptions={segmentationData.conditionOptions}
                    key={identity(index)}
                    removeConditionItem={() => {
                      removeEventCondition(index);
                    }}
                    changeCurCategoryOption={(category) => {
                      changeConditionCategoryOption(index, category);
                    }}
                    changeConditionOperator={(item) => {
                      changeConditionOperator(index, item);
                    }}
                    changeConditionValue={(value) => {
                      changeConditionValue(index, value);
                    }}
                  />
                );
              })}
          </div>
        </div>
        <div className="mt-10">
          <Button
            iconName="add-plus"
            onClick={addNewConditionItem}
            disabled={segmentationData.data.length >= (maxSelectNum ?? 10)}
          >
            {t('common:button.addFilter')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SegmentationFilter;
