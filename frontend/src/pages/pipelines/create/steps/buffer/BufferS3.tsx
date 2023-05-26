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
  Autosuggest,
  AutosuggestProps,
  FormField,
  Input,
  SpaceBetween,
} from '@cloudscape-design/components';
import { getS3BucketList } from 'apis/resource';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isDisabled } from 'ts/utils';

interface BufferS3Props {
  update?: boolean;
  pipelineInfo: IExtPipeline;
  changeS3Bucket: (bucket: string) => void;
  changeS3Prefix: (prefix: string) => void;
  changeS3BufferSize: (size: string) => void;
  changeBufferInterval: (interval: string) => void;
  bufferS3BucketEmptyError: boolean;
}

const BufferS3: React.FC<BufferS3Props> = (props: BufferS3Props) => {
  const { t } = useTranslation();
  const {
    update,
    pipelineInfo,
    changeS3Bucket,
    changeS3Prefix,
    changeS3BufferSize,
    changeBufferInterval,
    bufferS3BucketEmptyError,
  } = props;
  const [loadingBucket, setLoadingBucket] = useState(false);
  const [s3BucketOptionList, setS3BucketOptionList] =
    useState<AutosuggestProps.Options>([]);

  // get all s3 bucket
  const getAllS3BucketList = async () => {
    setLoadingBucket(true);
    try {
      const { success, data }: ApiResponse<S3Response[]> =
        await getS3BucketList(pipelineInfo.region);
      if (success) {
        const s3Options: AutosuggestProps.Options = data.map((element) => ({
          label: `${element.name}`,
          value: `${element.name}`,
        }));
        setS3BucketOptionList(s3Options);
        setLoadingBucket(false);
      }
    } catch (error) {
      setLoadingBucket(false);
    }
  };

  useEffect(() => {
    getAllS3BucketList();
  }, []);

  return (
    <SpaceBetween direction="vertical" size="l">
      <FormField
        label={t('pipeline:create.s3.selectS3')}
        description={t('pipeline:create.s3.selectS3Desc')}
      />
      <FormField
        label={t('pipeline:create.s3.s3URI')}
        errorText={
          bufferS3BucketEmptyError ? t('pipeline:valid.s3BucketEmpty') : ''
        }
      >
        <Autosuggest
          disabled={isDisabled(update, pipelineInfo)}
          placeholder={t('pipeline:create.selectS3') || ''}
          statusType={loadingBucket ? 'loading' : 'finished'}
          onChange={({ detail }) => changeS3Bucket(detail.value)}
          value={pipelineInfo.ingestionServer.sinkS3.sinkBucket.name}
          options={s3BucketOptionList}
          enteredTextLabel={(value) => `${t('use')}: "${value}"`}
        />
      </FormField>

      <FormField
        label={t('pipeline:create.s3.s3Prefix')}
        description={t('pipeline:create.s3.s3PrefixDesc')}
        constraintText={t('pipeline:create.s3.s3Constraint')}
      >
        <Input
          disabled={isDisabled(update, pipelineInfo)}
          placeholder={t('pipeline:create.s3.enterAdditional') || ''}
          value={pipelineInfo.ingestionServer.sinkS3.sinkBucket.prefix}
          onChange={(e) => {
            changeS3Prefix(e.detail.value);
          }}
        />
      </FormField>

      <FormField
        label={t('pipeline:create.s3.bufferSize')}
        description={t('pipeline:create.s3.bufferSizeDesc')}
      >
        <Input
          type="number"
          placeholder="10"
          value={pipelineInfo.ingestionServer.sinkS3.s3BufferSize.toString()}
          onChange={(e) => {
            changeS3BufferSize(e.detail.value);
          }}
        />
      </FormField>

      <FormField
        label={t('pipeline:create.s3.bufferInterval')}
        description={t('pipeline:create.s3.bufferIntervalDesc')}
      >
        <Input
          placeholder="300"
          type="number"
          value={pipelineInfo.ingestionServer.sinkS3.s3BufferInterval.toString()}
          onChange={(e) => {
            changeBufferInterval(e.detail.value);
          }}
        />
      </FormField>
    </SpaceBetween>
  );
};

export default BufferS3;
