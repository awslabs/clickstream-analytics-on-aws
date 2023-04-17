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

import { SpaceBetween, Header, Container } from '@cloudscape-design/components';
import Ingestion from 'pages/pipelines/detail/comps/Ingestion';
import Processing from 'pages/pipelines/detail/comps/Processing';
import Reporting from 'pages/pipelines/detail/comps/Reporting';
import React from 'react';
import { useTranslation } from 'react-i18next';
import BasicInfo from '../review/BasicInfo';

interface ReviewAndLaunchProps {
  pipelineInfo: IExtPipeline;
}

const ReviewAndLaunch: React.FC<ReviewAndLaunchProps> = (
  props: ReviewAndLaunchProps
) => {
  const { t } = useTranslation();
  const { pipelineInfo } = props;
  return (
    <SpaceBetween direction="vertical" size="l">
      <BasicInfo pipelineInfo={pipelineInfo} />
      <Container
        header={
          <Header
            variant="h2"
            description={t('pipeline:create.ingestSettingsDesc')}
          >
            {t('pipeline:create.ingestSettings')}
          </Header>
        }
      >
        <Ingestion pipelineInfo={pipelineInfo} />
      </Container>

      {pipelineInfo.enableDataProcessing && (
        <Container
          header={
            <Header variant="h2" description="">
              {t('pipeline:create.dataProcessing')}
            </Header>
          }
        >
          <Processing pipelineInfo={pipelineInfo} />
        </Container>
      )}

      <Container
        header={<Header variant="h2">{t('pipeline:create.reporting')}</Header>}
      >
        <Reporting pipelineInfo={pipelineInfo} />
      </Container>
    </SpaceBetween>
  );
};

export default ReviewAndLaunch;
