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

import {
  FormField,
  Input,
  Select,
  SpaceBetween,
} from '@cloudscape-design/components';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { YES_NO, YES_NO_LIST } from 'ts/const';

const BufferKDS: React.FC = () => {
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

export default BufferKDS;
