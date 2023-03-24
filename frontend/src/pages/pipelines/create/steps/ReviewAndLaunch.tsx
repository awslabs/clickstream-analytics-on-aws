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
  SpaceBetween,
  Header,
  Container,
  ColumnLayout,
  Box,
  Table,
  StatusIndicator,
  Grid,
} from '@cloudscape-design/components';
import moment from 'moment';
import BasicInfo from 'pages/pipelines/comps/BasicInfo';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { SinkType, TIME_FORMAT } from 'ts/const';

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
        <ColumnLayout columns={2} variant="text-grid">
          <SpaceBetween direction="vertical" size="l">
            <div>
              <Box variant="awsui-key-label">
                {t('pipeline:create.domainName')}
              </Box>
              <div>{pipelineInfo.ingestionServer.domain.domainName}</div>
            </div>
          </SpaceBetween>
          <SpaceBetween direction="vertical" size="l">
            <div>
              <Box variant="awsui-key-label">
                {t('pipeline:create.requestPath')}
              </Box>
              <div>
                {pipelineInfo.ingestionServer.loadBalancer.serverEndpointPath}
              </div>
            </div>
          </SpaceBetween>
        </ColumnLayout>
        <SpaceBetween direction="vertical" size="l">
          <div className="mt-10">
            <Box variant="awsui-key-label">{t('pipeline:create.dataSink')}</Box>
            {pipelineInfo.ingestionServer.sinkType === SinkType.MSK && (
              <div>
                MSK ({pipelineInfo.ingestionServer.sinkKafka.mskCluster.arn})
              </div>
            )}
            {pipelineInfo.ingestionServer.sinkType === SinkType.S3 && (
              <div>
                S3 ({pipelineInfo.ingestionServer.sinkS3.sinkBucket.name})
              </div>
            )}
            {pipelineInfo.ingestionServer.sinkType === SinkType.KDS && (
              <div>KDS</div>
            )}
          </div>
        </SpaceBetween>
      </Container>

      {pipelineInfo.selectedEnrichPlugins.length > 0 && (
        <Container
          header={
            <Header variant="h2" description="">
              {t('pipeline:create.enrichPlugins')}
            </Header>
          }
        >
          <Grid gridDefinition={[{ colspan: 4 }, { colspan: 8 }]}>
            <div style={{ borderRight: '2px solid #e9ebed' }}>
              <SpaceBetween size="l" direction="vertical">
                <div>
                  <Box variant="awsui-key-label">{t('status')}</Box>
                  <div>
                    <StatusIndicator>Enabled</StatusIndicator>
                  </div>
                </div>
              </SpaceBetween>
            </div>

            <div>
              <Table
                variant="embedded"
                columnDefinitions={[
                  {
                    id: 'name',
                    header: t('plugin:list.name'),
                    cell: (item) => item.name || '-',
                  },
                  {
                    id: 'description',
                    header: t('plugin:list.desc'),
                    cell: (item) => item.description || '-',
                  },
                  {
                    id: 'date',
                    header: 'Last edit date',
                    cell: (item) =>
                      moment(item.updateAt).format(TIME_FORMAT) || '-',
                  },
                ]}
                items={pipelineInfo.selectedEnrichPlugins}
                sortingDisabled
                empty={''}
                header={
                  <Header variant="h3">
                    {t('pipeline:create.enrichPlugins')}
                  </Header>
                }
              />
            </div>
          </Grid>
        </Container>
      )}

      <Container
        header={
          <Header variant="h2">{t('pipeline:create.dataProcessor')}</Header>
        }
      >
        <ColumnLayout columns={2} variant="text-grid">
          <SpaceBetween direction="vertical" size="l">
            <div>
              <Box variant="awsui-key-label">
                {t('pipeline:create.modelEngine')}
              </Box>
              <div>
                Redshift ({pipelineInfo.selectedRedshiftCluster?.label})
              </div>
            </div>
            <div>
              <Box variant="awsui-key-label">
                {t('pipeline:create.engineDataRange')}
              </Box>
              <div>{`${pipelineInfo.redshiftExecutionValue} ${pipelineInfo.selectedRedshiftExecutionUnit?.label} `}</div>
            </div>
          </SpaceBetween>
          <SpaceBetween direction="vertical" size="l">
            <div>
              <Box variant="awsui-key-label">
                {t('pipeline:create.quickSightAccount')}
              </Box>
              <div>{pipelineInfo.selectedQuickSightRole?.label}</div>
            </div>
            <div>
              <Box variant="awsui-key-label">
                {t('pipeline:create.datasetName')}
              </Box>
              <div>{pipelineInfo.quickSightDataset}</div>
            </div>
          </SpaceBetween>
        </ColumnLayout>
      </Container>
    </SpaceBetween>
  );
};

export default ReviewAndLaunch;
