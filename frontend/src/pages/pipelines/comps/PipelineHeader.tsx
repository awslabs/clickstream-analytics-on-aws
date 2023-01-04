// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
import { Header } from '@cloudscape-design/components';
import InfoLink from 'components/common/InfoLink';
import React from 'react';
import { useTranslation } from 'react-i18next';

const PipelineHeader: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Header variant="h1" info={<InfoLink />}>
      {t('pipeline:pipelines')}
    </Header>
  );
};

export default PipelineHeader;
