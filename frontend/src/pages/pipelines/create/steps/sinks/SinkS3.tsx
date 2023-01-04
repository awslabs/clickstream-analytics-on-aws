import { FormField, Input, SpaceBetween } from '@cloudscape-design/components';
import S3Selector from 'pages/common/S3Selector';
import React from 'react';
import { useTranslation } from 'react-i18next';

const SinkS3: React.FC = () => {
  const { t } = useTranslation();
  return (
    <SpaceBetween direction="vertical" size="l">
      <FormField
        label={t('pipeline:create.s3.selectS3')}
        description={t('pipeline:create.s3.selectS3Desc')}
      />
      <FormField
        label={t('pipeline:create.s3.s3URI')}
        constraintText={t('pipeline:create.s3.s3URIFormat')}
      >
        <S3Selector />
      </FormField>

      <FormField
        label={t('pipeline:create.s3.s3Prefix')}
        description={t('pipeline:create.s3.s3PrefixDesc')}
        constraintText={t('pipeline:create.s3.s3Constraint')}
      >
        <Input
          placeholder={t('pipeline:create.s3.enterAdditional') || ''}
          value=""
        />
      </FormField>
    </SpaceBetween>
  );
};

export default SinkS3;
