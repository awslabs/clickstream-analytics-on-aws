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

import { FormField, Input, SpaceBetween } from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { POSITIVE_INTEGER_REGEX } from 'ts/const';

interface BufferS3Props {
  update?: boolean;
  pipelineInfo: IExtPipeline;
  changeS3BufferSize: (size: string) => void;
  changeBufferInterval: (interval: string) => void;
  bufferS3SizeFormatError: boolean;
  bufferS3IntervalFormatError: boolean;
}

const BufferS3: React.FC<BufferS3Props> = (props: BufferS3Props) => {
  const { t } = useTranslation();
  const {
    pipelineInfo,
    changeS3BufferSize,
    changeBufferInterval,
    bufferS3SizeFormatError,
    bufferS3IntervalFormatError,
  } = props;

  return (
    <SpaceBetween direction="vertical" size="l">
      <FormField
        label={t('pipeline:create.s3.bufferSize')}
        description={t('pipeline:create.s3.bufferSizeDesc')}
        errorText={
          bufferS3SizeFormatError ? t('pipeline:valid.bufferS3SizeError') : ''
        }
      >
        <Input
          type="number"
          placeholder="10"
          value={pipelineInfo.ingestionServer.sinkS3.s3BufferSize.toString()}
          onChange={(e) => {
            if (!POSITIVE_INTEGER_REGEX.test(e.detail.value)) {
              return false;
            }
            changeS3BufferSize(e.detail.value);
          }}
        />
      </FormField>

      <FormField
        label={t('pipeline:create.s3.bufferInterval')}
        description={t('pipeline:create.s3.bufferIntervalDesc')}
        errorText={
          bufferS3IntervalFormatError
            ? t('pipeline:valid.bufferS3IntervalError')
            : ''
        }
      >
        <Input
          placeholder="300"
          type="number"
          value={pipelineInfo.ingestionServer.sinkS3.s3BufferInterval.toString()}
          onChange={(e) => {
            if (!POSITIVE_INTEGER_REGEX.test(e.detail.value)) {
              return false;
            }
            changeBufferInterval(e.detail.value);
          }}
        />
      </FormField>
    </SpaceBetween>
  );
};

export default BufferS3;
