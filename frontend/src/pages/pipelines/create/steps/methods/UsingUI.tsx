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
