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
  AppLayout,
  Box,
  Button,
  ColumnLayout,
  Container,
  ContentLayout,
  Header,
  Select,
  SelectProps,
  SpaceBetween,
  Toggle,
} from '@cloudscape-design/components';
import { createEmbeddingContext } from 'amazon-quicksight-embedding-sdk';
import { fetchEmbeddingUrl } from 'apis/analytics';
import Loading from 'components/common/Loading';
import Navigation from 'components/layouts/Navigation';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

const AnalyticsRetention: React.FC = () => {
  const { t } = useTranslation();
  const { projectId, appId } = useParams();
  const [loadingData, setLoadingData] = useState(false);

  const metricOptions = [
    {
      value: 'event',
      label: t('analytics:options.eventNumber'),
    },
    { value: 'user', label: t('analytics:options.userNumber') },
  ];
  const [selectedMetric, setSelectedMetric] =
    useState<SelectProps.Option | null>({
      value: 'event',
      label: t('analytics:options.userNumber') ?? '',
    });

  const [associateParameterChecked, setAssociateParameterChecked] =
    useState<boolean>(true);

  const getEmbeddingUrl = async () => {
    try {
      const { success, data }: ApiResponse<any> = await fetchEmbeddingUrl(
        'ap-southeast-1',
        'clickstream_dashboard_uat_test5_umxq_uat5_app1_a949088f',
        '82142fbb-8f89-4cbd-bb1f-83851730adec',
        '56833f26-3a60-49da-a402-8a2e4488be2e'
      );
      if (success) {
        const embedDashboard = async () => {
          const embeddingContext = await createEmbeddingContext();
          await embeddingContext.embedVisual({
            url: data.EmbedUrl,
            container: '#qs-funnel-container',
          });
        };
        embedDashboard();
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    setLoadingData(true);
    getEmbeddingUrl();
    setLoadingData(false);
  }, []);

  return (
    <AppLayout
      toolsHide
      content={
        <ContentLayout
          header={
            <SpaceBetween size="m">
              <Header variant="h1">
                {t('nav.analytics.exploreRetention')}
              </Header>
            </SpaceBetween>
          }
        >
          <SpaceBetween direction="vertical" size="l">
            <Container
              header={
                <Header
                  variant="h2"
                  actions={
                    <SpaceBetween direction="horizontal" size="xs">
                      <Button iconName="refresh">
                        {t('analytics:funnel.labels.reset')}
                      </Button>
                      <Button variant="primary">
                        {t('analytics:funnel.labels.save')}
                      </Button>
                    </SpaceBetween>
                  }
                >
                  {t('analytics:header.configurations')}
                </Header>
              }
            >
              <ColumnLayout columns={3} variant="text-grid">
                <SpaceBetween direction="vertical" size="l">
                  <div>
                    <Box variant="awsui-key-label">
                      {t('analytics:funnel.labels.metrics')}
                    </Box>
                    <Select
                      selectedOption={selectedMetric}
                      options={metricOptions}
                      onChange={(event) => {
                        setSelectedMetric(event.detail.selectedOption);
                      }}
                    />
                  </div>
                </SpaceBetween>
                <SpaceBetween direction="vertical" size="l">
                  <div>
                    <Box variant="awsui-key-label">
                      {t('analytics:funnel.labels.associateParameter')}
                    </Box>
                    <Toggle
                      onChange={({ detail }) =>
                        setAssociateParameterChecked(detail.checked)
                      }
                      checked={associateParameterChecked}
                    >
                      {associateParameterChecked ? 'On' : 'Off'}
                    </Toggle>
                  </div>
                </SpaceBetween>
              </ColumnLayout>
            </Container>
            <Container>
              {loadingData ? (
                <Loading />
              ) : (
                <div
                  id={'qs-funnel-container'}
                  className="iframe-explore"
                ></div>
              )}
            </Container>
          </SpaceBetween>
        </ContentLayout>
      }
      headerSelector="#header"
      navigation={
        <Navigation
          activeHref={`/analytics/${projectId}/app/${appId}/retention`}
        />
      }
    />
  );
};

export default AnalyticsRetention;
