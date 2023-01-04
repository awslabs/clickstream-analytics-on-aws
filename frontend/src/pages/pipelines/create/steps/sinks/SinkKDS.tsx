import {
  FormField,
  Input,
  Select,
  SpaceBetween,
} from '@cloudscape-design/components';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { YES_NO, YES_NO_LIST } from 'ts/const';

const SinkKDS: React.FC = () => {
  const { t } = useTranslation();
  const [enableAS, setEnableAS] = useState<any>({
    value: YES_NO.YES,
    label: 'Yes',
  });
  return (
    <SpaceBetween direction="vertical" size="l">
      <FormField
        label={t('pipeline:create.kds.kdsSettings')}
        description={t('pipeline:create.kds.kdsSettingsDesc')}
      />
      <FormField
        label={t('pipeline:create.kds.shardNum')}
        description={t('pipeline:create.kds.shardNumDesc')}
      >
        <Input value="1" type="number" />
      </FormField>

      <FormField
        label={t('pipeline:create.kds.enableAS')}
        description={t('pipeline:create.kds.enableASDesc')}
      >
        <Select
          selectedOption={enableAS}
          onChange={({ detail }) => setEnableAS(detail.selectedOption)}
          options={YES_NO_LIST}
          filteringType="auto"
          selectedAriaLabel="Selected"
        />
      </FormField>

      <FormField
        label={t('pipeline:create.kds.maxShard')}
        description={t('pipeline:create.kds.maxShardDesc')}
      >
        <Input
          disabled={enableAS.value === YES_NO.NO}
          value="2"
          type="number"
        />
      </FormField>
    </SpaceBetween>
  );
};

export default SinkKDS;
