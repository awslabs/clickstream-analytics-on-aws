import { Button, Container, Header } from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const NonePipeline: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Container
      header={
        <Header
          variant="h2"
          description={t('project:pipeline.dataPipelineDesc')}
        >
          {t('project:pipeline.dataPipeline')}
        </Header>
      }
    >
      <Button
        iconName="add-plus"
        variant="primary"
        onClick={() => {
          navigate('/pipelines/create');
        }}
      >
        {t('button.addPipeline')}
      </Button>
    </Container>
  );
};

export default NonePipeline;
