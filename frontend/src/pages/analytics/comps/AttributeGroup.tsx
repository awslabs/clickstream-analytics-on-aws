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
import { identity } from 'lodash';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { defaultStr } from 'ts/utils';

interface AttributeGroupProps {
  groupParameters: CategoryItemType[];
  groupOptions: IAnalyticsItem[];
  setGroupOptions: (options: SelectProps.Option[]) => void;
  loading?: boolean;
  disabled?: boolean;
}

const AttributeGroup: React.FC<AttributeGroupProps> = (
  props: AttributeGroupProps
) => {
  const { t } = useTranslation();
  const { groupOptions, setGroupOptions, groupParameters, loading, disabled } =
    props;
  return (
    <div className="cs-analytics-dropdown">
      {groupOptions.map((element, index) => {
        return (
          <div key={identity(index)}>
            <div className="cs-analytics-parameter w-75p">
              <div className="cs-para-name">{index + 1}</div>
              <div className="flex-1">
                <EventItem
                  disableValidate
                  type="attribute"
                  placeholder={defaultStr(
                    t('analytics:labels.attributeSelectPlaceholder')
                  )}
                  categoryOption={element}
                  changeCurCategoryOption={(item) => {
                    if (!item) {
                      return;
                    }
                    const newGroupOptions = [...groupOptions];
                    newGroupOptions[index] = item;
                    setGroupOptions(newGroupOptions);
                  }}
                  categories={groupParameters}
                  loading={loading}
                  disabled={disabled}
                />
              </div>
              <div className="event-delete">
                <span className="remove-icon">
                  <Button
                    onClick={() => {
                      // remove index option from groupOptions
                      const newGroupOptions = [...groupOptions];
                      newGroupOptions.splice(index, 1);
                      setGroupOptions(newGroupOptions);
                    }}
                    variant="link"
                    iconName="close"
                  />
                </span>
              </div>
            </div>
          </div>
        );
      })}
      <div className="mt-10">
        <Button
          iconName="add-plus"
          onClick={() => {
            // add option to groupOptions
            const newGroupOptions = [...groupOptions];
            newGroupOptions.push({
              value: '',
              label: '',
            });
            setGroupOptions(newGroupOptions);
          }}
          disabled={groupOptions.length >= 5 || disabled}
        >
          {t('button.newGroup')}
        </Button>
      </div>
    </div>
  );
};

export default AttributeGroup;
