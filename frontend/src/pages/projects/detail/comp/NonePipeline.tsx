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
        iconName="settings"
        variant="primary"
        onClick={() => {
          navigate(`/project/${projectId}/pipelines/create`);
        }}
      >
        {t('button.configPipeline')}
      </Button>
    </Container>
  );
};

export default NonePipeline;
