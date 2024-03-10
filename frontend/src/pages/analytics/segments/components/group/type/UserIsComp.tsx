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
import EventItem from 'components/eventselect/EventItem';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { defaultStr } from 'ts/utils';
import { CONDITION_STRING_OPERATORS } from '../mock_data';

const UserIsComp: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="flex gap-10">
      <EventItem
        type="attribute"
        placeholder={t('analytics:labels.attributeSelectPlaceholder')}
        categoryOption={null}
        changeCurCategoryOption={(item) => {
          //   changeRelationAttributeOption(item);
          console.info('changeCurCategoryOption');
        }}
        hasTab={false}
        isMultiSelect={false}
        categories={[]}
      />
      <Select
        // disabled={!item.conditionOption}
        placeholder={defaultStr(
          t('analytics:labels.operatorSelectPlaceholder')
        )}
        selectedOption={null}
        onChange={(e) => {
          // changeConditionOperator(e.detail.selectedOption);
          console.info(e);
        }}
        options={CONDITION_STRING_OPERATORS}
      />
      <div>
        <Input value="" />
      </div>
    </div>
  );
};

export default UserIsComp;
