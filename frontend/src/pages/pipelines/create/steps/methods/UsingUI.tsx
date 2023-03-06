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

import { Alert, AttributeEditor, Input } from '@cloudscape-design/components';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export const UsingUI: React.FC = () => {
  const [items, setItems] = useState<any>([
    { key: 'some-key-1', value: 'some-value-1' },
    { key: 'some-key-2', value: 'some-value-2' },
  ]);
  const { t } = useTranslation();
  return (
    <>
      <Alert>{t('pipeline:create.usingUIAlert')}</Alert>
      <div className="mt-20">
        <AttributeEditor
          additionalInfo={t('pipeline:create.usingUIInfo')}
          onAddButtonClick={() => setItems([...items, {}])}
          onRemoveButtonClick={({ detail: { itemIndex } }) => {
            const tmpItems = [...items];
            tmpItems.splice(itemIndex, 1);
            setItems(tmpItems);
          }}
          items={items}
          addButtonText={t('pipeline:create.usingUIInfo')}
          definition={[
            {
              label: t('pipeline:create.dataKey'),
              control: (item: any) => (
                <Input
                  value={item.key}
                  placeholder={t('pipeline:create.enterKey') || ''}
                />
              ),
            },
            {
              label: t('pipeline:create.dataValue'),
              control: (item: any) => (
                <Input
                  value={item.value}
                  placeholder={t('pipeline:create.enterValue') || ''}
                />
              ),
            },
          ]}
          removeButtonText={t('button.remove')}
          empty={t('pipeline:create.noItems')}
        />
      </div>
    </>
  );
};
