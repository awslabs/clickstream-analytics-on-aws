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

import { useContainerQuery } from '@cloudscape-design/component-toolkit';
import {
  AppLayout,
  Badge,
  Box,
  Button,
  ColumnLayout,
  Container,
  ContentLayout,
  Header,
  Input,
  Select,
  SelectProps,
  SpaceBetween,
  Toggle,
} from '@cloudscape-design/components';
import { createEmbeddingContext } from 'amazon-quicksight-embedding-sdk';
import { fetchEmbeddingUrl } from 'apis/analytics';
import Divider from 'components/common/Divider';
import Loading from 'components/common/Loading';
import Navigation from 'components/layouts/Navigation';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

const AnalyticsFunnel: React.FC = () => {
  const { t } = useTranslation();
  const { pid, appid } = useParams();
  const [loadingData, setLoadingData] = useState(false);

  const getEmbeddingUrl = async () => {
    try {
      const { success, data }: ApiResponse<any> = await fetchEmbeddingUrl(
        'ap-southeast-1',
        'clickstream_dashboard_uat_test5_umxq_uat5_app1_a949088f',
        'ef2f9b18-8093-47d3-a3cf-59e890cfe338',
        '91e59887-a1c1-4b65-aca3-b1926db946eb'
      );
      if (success) {
        const embedDashboard = async () => {
          const embeddingContext = await createEmbeddingContext();
          console.log(data.EmbedUrl);
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

  const [windowValue, setWindowValue] = useState<string>('5');
  const [metricOptions, setMetricOptions] = useState<SelectProps.Options>([
    { value: 'event', label: 'Event number' },
    { value: 'user', label: 'User number' },
  ]);
  const [selectedMetric, setSelectedMetric] =
    useState<SelectProps.Option | null>({
      value: 'event',
      label: 'Event number',
    });

  const customWindowType = { value: 'custom', label: 'Custom' };
  const [windowTypeOptions, setWindowTypeOptions] =
    useState<SelectProps.Options>([
      customWindowType,
      { value: 'theDay', label: 'The Day' },
    ]);
  const [selectedWindowType, setSelectedWindowType] =
    useState<SelectProps.Option | null>(customWindowType);

  const [windowUnitOptions, setWindowUnitOptions] =
    useState<SelectProps.Options>([
      { value: 'second', label: 'Second(s)' },
      { value: 'minute', label: 'Minute(s)' },
      { value: 'hour', label: 'Hour(s)' },
      { value: 'day', label: 'Day(s)' },
    ]);
  const [selectedWindowUnit, setSelectedWindowUnit] =
    useState<SelectProps.Option | null>({
      value: 'minute',
      label: 'Minute(s)',
    });

  const [associateParameterChecked, setAssociateParameterChecked] =
    useState<boolean>(true);
  const [windowChecked, setWindowChecked] = useState<boolean>(true);

  // const [useMobileView, ref] = useContainerQuery((entry) => {
  //   return entry.contentBoxWidth < 688;
  // });
  // console.log(useMobileView);

  return (
    <AppLayout
      toolsHide
      content={
        <ContentLayout
          header={
            <SpaceBetween size="m">
              <Header variant="h1">Funnel Analytics</Header>
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
                <SpaceBetween direction="vertical" size="l">
                  <div>
                    <Box variant="awsui-key-label">
                      {t('analytics:funnel.labels.window')}
                    </Box>
                    <Toggle
                      onChange={({ detail }) =>
                        setWindowChecked(detail.checked)
                      }
                      checked={windowChecked}
                    >
                      {windowChecked ? 'On' : 'Off'}
                    </Toggle>
                  </div>
                </SpaceBetween>
              </ColumnLayout>
              <br />
              <Divider height={1} />
              <br />
              <ColumnLayout columns={2} variant="text-grid">
                <SpaceBetween direction="vertical" size="l">
                  <Box variant="awsui-key-label">
                    {t('analytics:funnel.labels.funnelSteps')}
                  </Box>
                  <Box variant="awsui-key-label">
                    {t('analytics:funnel.labels.conversionWindowPeriod')}
                  </Box>
                  <SpaceBetween direction="horizontal" size="xs">
                    <Select
                      selectedOption={selectedWindowType}
                      options={windowTypeOptions}
                      onChange={(event) => {
                        console.log(selectedWindowType, customWindowType);
                        setSelectedWindowType(event.detail.selectedOption);
                      }}
                    />
                    {selectedWindowType?.value === customWindowType?.value ? (
                      <>
                        <Input
                          type="number"
                          placeholder="5"
                          value={windowValue}
                          onChange={(event) => {
                            setWindowValue(event.detail.value);
                          }}
                        />
                        <Select
                          selectedOption={selectedWindowUnit}
                          options={windowUnitOptions}
                          onChange={(event) => {
                            setSelectedWindowUnit(event.detail.selectedOption);
                          }}
                        />
                      </>
                    ) : null}
                  </SpaceBetween>
                </SpaceBetween>
                <SpaceBetween direction="vertical" size="l">
                  <div>
                    <Box variant="awsui-key-label">
                      {t('analytics:funnel.labels.filters')}
                    </Box>
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
                  style={{
                    height: '400px',
                    width: '100%',
                    border: 0,
                    overflow: 'hidden',
                  }}
                ></div>
              )}
            </Container>
          </SpaceBetween>
        </ContentLayout>
      }
      headerSelector="#header"
      navigation={
        <Navigation activeHref={`/analytics/${pid}/app/${appid}/funnel`} />
      }
    />
  );
};

export default AnalyticsFunnel;
