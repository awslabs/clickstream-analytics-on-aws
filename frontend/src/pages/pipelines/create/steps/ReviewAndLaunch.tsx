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
import BasicInfo from 'pages/pipelines/comps/BasicInfo';
import React from 'react';
import { useTranslation } from 'react-i18next';

const ReviewAndLaunch: React.FC = () => {
  const { t } = useTranslation();
  return (
    <SpaceBetween direction="vertical" size="l">
      <BasicInfo />

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
        <ColumnLayout columns={3} variant="text-grid">
          <SpaceBetween direction="vertical" size="l">
            <div>
              <Box variant="awsui-key-label">
                {t('pipeline:create.domainName')}
              </Box>
              <div>example.example.com</div>
            </div>
          </SpaceBetween>
          <SpaceBetween direction="vertical" size="l">
            <div>
              <Box variant="awsui-key-label">
                {t('pipeline:create.requestPath')}
              </Box>
              <div>/collect</div>
            </div>
            <div>
              <Box variant="awsui-key-label">{t('pipeline:create.asName')}</Box>
              <div>Min:2, Max:4, Warm: 2</div>
            </div>
          </SpaceBetween>
          <SpaceBetween direction="vertical" size="l">
            <div>
              <Box variant="awsui-key-label">
                {t('pipeline:create.dataSink')}
              </Box>
              <div>
                MSK (arn:aws:msk::abcdef01234567890.msk.net/SLCCSMWOHOFUY0)
              </div>
            </div>
          </SpaceBetween>
        </ColumnLayout>
      </Container>

      <Container
        header={
          <Header variant="h2" description="Container description">
            {t('pipeline:create.ingestSettings')}
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
                  header: 'Plugin name',
                  cell: (item) => item.key || '-',
                },
                {
                  id: 'status',
                  header: 'Status',
                  cell: (item) => item.status || '-',
                },
                {
                  id: 'date',
                  header: 'Last edit date',
                  cell: (item) => item.date || '-',
                },
              ]}
              items={[
                {
                  key: 'IP lookup',
                  status: 'Enabled',
                  date: 'Nov 26, 2022',
                },
                {
                  key: 'UA parser',
                  status: 'Enabled',
                  date: 'Nov 26, 2022',
                },
                {
                  key: 'Event fingerprint',
                  value: 'Enabled',
                  date: 'Nov 26, 2022',
                },
              ]}
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

      <Container
        header={
          <Header
            variant="h2"
            description={t('pipeline:create.modelSettingsDesc')}
          >
            {t('pipeline:create.modelSettings')}
          </Header>
        }
      >
        <ColumnLayout columns={3} variant="text-grid">
          <SpaceBetween direction="vertical" size="l">
            <div>
              <Box variant="awsui-key-label">{t('status')}</Box>
              <div>
                <StatusIndicator>Enabled</StatusIndicator>
              </div>
            </div>
            <div>
              <Box variant="awsui-key-label">
                {t('pipeline:create.modelCreationMethod')}
              </Box>
              <div>Mapping file</div>
            </div>
          </SpaceBetween>
          <SpaceBetween direction="vertical" size="l">
            <div>
              <Box variant="awsui-key-label">
                {t('pipeline:create.modelEngine')}
              </Box>
              <div>
                Redshift
                ((arn:aws:cloudfront::abcdef01234567890.cloudfront.net/SLCCSMWOHOFUY0))
              </div>
            </div>
            <div>
              <Box variant="awsui-key-label">
                {t('pipeline:create.engineDataRange')}
              </Box>
              <div>3 month</div>
            </div>
          </SpaceBetween>
          <SpaceBetween direction="vertical" size="l">
            <div>
              <Box variant="awsui-key-label">
                {' '}
                {t('pipeline:create.quickSightAccount')}
              </Box>
              <div>clickstream-BI</div>
            </div>
            <div>
              <Box variant="awsui-key-label">
                {' '}
                {t('pipeline:create.datasetName')}
              </Box>
              <div>clickstream</div>
            </div>
          </SpaceBetween>
        </ColumnLayout>
      </Container>
    </SpaceBetween>
  );
};

export default ReviewAndLaunch;
