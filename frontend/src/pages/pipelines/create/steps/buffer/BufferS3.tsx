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

interface BufferS3Props {
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
        await getS3BucketList();
      if (success) {
        const s3Options: AutosuggestProps.Options = data.map((element) => ({
          label: `s3://${element.name}`,
          value: `s3://${element.name}`,
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
        constraintText={t('pipeline:create.s3.s3URIFormat')}
        errorText={
          bufferS3BucketEmptyError
            ? t('pipeline:valid.s3BufferBucketEmpty')
            : ''
        }
      >
        <Autosuggest
          statusType={loadingBucket ? 'loading' : 'finished'}
          onChange={({ detail }) => changeS3Bucket(detail.value)}
          value={pipelineInfo.ingestionServer.sinkS3.s3DataBucket}
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
          placeholder={t('pipeline:create.s3.enterAdditional') || ''}
          value={pipelineInfo.ingestionServer.sinkS3.s3DataPrefix}
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
          value={pipelineInfo.ingestionServer.sinkS3.s3BufferSize}
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
          value={pipelineInfo.ingestionServer.sinkS3.s3BufferInterval}
          onChange={(e) => {
            changeBufferInterval(e.detail.value);
          }}
        />
      </FormField>
    </SpaceBetween>
  );
};

export default BufferS3;
