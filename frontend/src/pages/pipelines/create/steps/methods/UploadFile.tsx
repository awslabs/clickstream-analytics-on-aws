import {
  Button,
  FormField,
  StatusIndicator,
} from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';

const UploadFile: React.FC = () => {
  const { t } = useTranslation();
  return (
    <>
      <FormField
        label={t('pipeline:create.selectFile')}
        description={t('pipeline:create.selectFileDesc')}
        constraintText={t('pipeline:create.selectFileConstraint')}
      >
        <Button iconName="upload">{t('pipeline:create.chooseFile')}</Button>
      </FormField>
      <FormField constraintText={t('pipeline:create.fileSize')}>
        <StatusIndicator>datamapping.json</StatusIndicator>
      </FormField>
    </>
  );
};

export default UploadFile;
