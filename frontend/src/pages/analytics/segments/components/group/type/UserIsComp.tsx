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

import { Input, Select } from '@cloudscape-design/components';
import { IEventSegmentationItem } from 'components/eventselect/AnalyticsType';
import EventItem from 'components/eventselect/EventItem';
import {
  AnalyticsSegmentAction,
  AnalyticsSegmentActionType,
} from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import React, { Dispatch } from 'react';
import { useTranslation } from 'react-i18next';
import { defaultStr } from 'ts/utils';
import { SegmentPropsData } from '../ConditionGroup';
import { CONDITION_STRING_OPERATORS, PRESET_PARAMETERS } from '../mock_data';

interface UserIsCompProps {
  segmentData: IEventSegmentationItem;
  segmentProps: SegmentPropsData;
  segmentDataDispatch: Dispatch<AnalyticsSegmentAction>;
}

const UserIsComp: React.FC<UserIsCompProps> = (props: UserIsCompProps) => {
  const { segmentData, segmentProps, segmentDataDispatch } = props;
  const { t } = useTranslation();
  return (
    <div className="flex gap-10">
      <EventItem
        type="attribute"
        placeholder={t('analytics:labels.attributeSelectPlaceholder')}
        categoryOption={segmentData.userIsParamOption ?? null}
        changeCurCategoryOption={(paramOption) => {
          segmentDataDispatch({
            type: AnalyticsSegmentActionType.UpdateUserIsParamOption,
            segmentProps,
            paramOption,
          });
        }}
        hasTab={false}
        isMultiSelect={false}
        categories={PRESET_PARAMETERS}
      />
      <Select
        placeholder={defaultStr(
          t('analytics:labels.operatorSelectPlaceholder')
        )}
        selectedOption={segmentData.userISOperator ?? null}
        onChange={(e) => {
          segmentDataDispatch({
            type: AnalyticsSegmentActionType.UpdateUserIsOperator,
            segmentProps,
            operator: e.detail.selectedOption,
          });
        }}
        options={CONDITION_STRING_OPERATORS.map((e) => {
          return { ...e, label: defaultStr(t(e.label ?? '')) };
        })}
      />
      <div>
        <Input
          type="number"
          placeholder={defaultStr(
            t('analytics:labels.conditionValuePlaceholder')
          )}
          value={segmentData.userIsValue ?? null}
          onChange={(e) => {
            segmentDataDispatch({
              type: AnalyticsSegmentActionType.UpdateUserIsValue,
              segmentProps,
              value: e.detail.value,
            });
          }}
        />
      </div>
    </div>
  );
};

export default UserIsComp;