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
  SelectProps,
  SpaceBetween,
} from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { KDSProvisionType } from 'ts/const';

interface BufferKDSProps {
  pipelineInfo: IExtPipeline;
  changeKDSProvisionType: (provision: SelectProps.Option) => void;
  changeKDSShardNumber: (num: string) => void;
}

const BufferKDS: React.FC<BufferKDSProps> = (props: BufferKDSProps) => {
  const { t } = useTranslation();
  const { pipelineInfo, changeKDSProvisionType, changeKDSShardNumber } = props;
  return (
    <SpaceBetween direction="vertical" size="l">
      <FormField
        label={t('pipeline:create.kds.kdsSettings')}
        description={t('pipeline:create.kds.kdsSettingsDesc')}
      />

      <FormField
        label={t('pipeline:create.kds.provisionMode')}
        description={t('pipeline:create.kds.provisionModeDesc')}
      >
        <Select
          placeholder={t('pipeline:create.kds.selectMode') || ''}
          selectedOption={pipelineInfo.seledtedKDKProvisionType}
          onChange={({ detail }) =>
            changeKDSProvisionType(detail.selectedOption)
          }
          options={[
            {
              label: t('pipeline:create.kds.ondemand') || '',
              value: KDSProvisionType.ON_DEMAND,
            },
            {
              label: t('pipeline:create.kds.provisioned') || '',
              value: KDSProvisionType.PROVISIONED,
            },
          ]}
          selectedAriaLabel="Selected"
        />
      </FormField>

      {pipelineInfo.ingestionServer.sinkKinesis.kinesisStreamMode ===
        KDSProvisionType.PROVISIONED && (
        <FormField
          label={t('pipeline:create.kds.shardNum')}
          description={t('pipeline:create.kds.shardNumDesc')}
        >
          <Input
            placeholder="2"
            value={pipelineInfo.ingestionServer.sinkKinesis.kinesisShardCount}
            type="number"
            onChange={(e) => {
              changeKDSShardNumber(e.detail.value);
            }}
          />
        </FormField>
      )}
    </SpaceBetween>
  );
};

export default BufferKDS;
