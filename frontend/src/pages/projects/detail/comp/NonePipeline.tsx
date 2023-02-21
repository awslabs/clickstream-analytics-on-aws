import { Button, Container, Header } from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface NonePipelineProps {
  projectId?: string;
}

const NonePipeline: React.FC<NonePipelineProps> = (
  props: NonePipelineProps
) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projectId } = props;
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
          navigate(`/project/${projectId}/pipelines/create`);
        }}
      >
        {t('button.addPipeline')}
      </Button>
    </Container>
  );
};

export default NonePipeline;
