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
import {
  CategoryItemType,
  IAnalyticsItem,
} from 'components/eventselect/AnalyticsType';
import EventItem from 'components/eventselect/EventItem';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { defaultStr } from 'ts/utils';

interface AttributeGroupProps {
  groupParameters: CategoryItemType[];
  groupOption: IAnalyticsItem | null;
  setGroupOption: (option: SelectProps.Option | null) => void;
  loading?: boolean;
  disabled?: boolean;
}

const AttributeGroup: React.FC<AttributeGroupProps> = (
  props: AttributeGroupProps
) => {
  const { t } = useTranslation();
  const { groupOption, setGroupOption, groupParameters, loading, disabled } =
    props;
  return (
    <div className="cs-analytics-dropdown">
      <div className="cs-analytics-parameter">
        <div className="flex gap-10 w-75p">
          <div className="flex-1">
            <EventItem
              disableValidate
              type="attribute"
              placeholder={defaultStr(
                t('analytics:labels.attributeSelectPlaceholder')
              )}
              categoryOption={groupOption}
              changeCurCategoryOption={(item) => {
                setGroupOption(item);
              }}
              categories={groupParameters}
              loading={loading}
              disabled={disabled}
            />
          </div>
          {groupOption?.value && (
            <Button
              onClick={() => {
                setGroupOption(null);
              }}
              iconName="close"
            >
              {t('button.clear')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttributeGroup;
