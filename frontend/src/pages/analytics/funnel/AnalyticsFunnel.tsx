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
  Input,
  Select,
  SelectProps,
  SpaceBetween,
  Toggle,
} from '@cloudscape-design/components';
import { createEmbeddingContext } from 'amazon-quicksight-embedding-sdk';
import {
  fetchEmbeddingUrl,
  getPipelineDetailByProjectId,
  previewFunnel,
} from 'apis/analytics';
import Divider from 'components/common/Divider';
import Loading from 'components/common/Loading';
import Navigation from 'components/layouts/Navigation';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import {
  OUTPUT_DATA_MODELING_REDSHIFT_DATA_API_ROLE_ARN_SUFFIX,
  OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_NAME,
  OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN,
} from 'ts/constant-ln';
import { getValueFromStackOutputs } from 'ts/utils';

const AnalyticsFunnel: React.FC = () => {
  const { t } = useTranslation();
  const { pid, appid } = useParams();
  const [loadingData, setLoadingData] = useState(false);
  const [pipeline, setPipeline] = useState({} as IPipeline);

  const getEmbeddingUrl = async (
    dashboardId: string,
    sheetId: string | undefined,
    visualId: string | undefined
  ) => {
    try {
      console.log(pipeline);
      const { success, data }: ApiResponse<any> = await fetchEmbeddingUrl(
        pipeline.region,
        window.location.origin,
        dashboardId,
        sheetId,
        visualId
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

  const loadPieline = async (projectId: string) => {
    try {
      const { success, data }: ApiResponse<IPipeline> =
        await getPipelineDetailByProjectId(projectId);
      if (success) {
        console.log(data);
        setPipeline(data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    setLoadingData(true);
    loadPieline(pid ?? '');
    setLoadingData(false);
  }, [pid]);

  const metricOptions = [
    { value: 'event', label: 'Event number' },
    { value: 'user', label: 'User number' },
  ];

  const [windowValue, setWindowValue] = useState<string>('5');
  const [selectedMetric, setSelectedMetric] =
    useState<SelectProps.Option | null>({
      value: 'event',
      label: 'Event number',
    });

  const customWindowType = { value: 'custom', label: 'Custom' };
  const windowTypeOptions = [
    customWindowType,
    { value: 'theDay', label: 'The Day' },
  ];
  const [selectedWindowType, setSelectedWindowType] =
    useState<SelectProps.Option | null>(customWindowType);

  const windowUnitOptions = [
    { value: 'second', label: 'Second(s)' },
    { value: 'minute', label: 'Minute(s)' },
    { value: 'hour', label: 'Hour(s)' },
    { value: 'day', label: 'Day(s)' },
  ];
  const [selectedWindowUnit, setSelectedWindowUnit] =
    useState<SelectProps.Option | null>({
      value: 'minute',
      label: 'Minute(s)',
    });

  const [associateParameterChecked, setAssociateParameterChecked] =
    useState<boolean>(true);
  const [windowChecked, setWindowChecked] = useState<boolean>(true);

  const clickPreview = async () => {
    setLoadingData(true);
    try {
      const redshiftOutputs = getValueFromStackOutputs(
        pipeline,
        'DataModelingRedshift',
        [
          OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_NAME,
          OUTPUT_DATA_MODELING_REDSHIFT_DATA_API_ROLE_ARN_SUFFIX,
        ]
      );
      const reportingOutputs = getValueFromStackOutputs(pipeline, 'Reporting', [
        OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN,
      ]);
      const { success, data }: ApiResponse<any> = await previewFunnel({
        dashboardCreateParameters: {
          region: pipeline.region,
          redshift: {
            dataApiRole:
              redshiftOutputs.get(
                OUTPUT_DATA_MODELING_REDSHIFT_DATA_API_ROLE_ARN_SUFFIX
              ) ?? '',
            newServerless: {
              workgroupName:
                redshiftOutputs.get(
                  OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_NAME
                ) ?? '',
            },
          },
          quickSight: {
            user: pipeline.reporting.quickSight?.user ?? '',
            dataSourceArn:
              reportingOutputs.get(
                OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN
              ) ?? '',
          },
        },
        action: 'PREVIEW',
        viewName: 'testview0002',
        projectId: 'project_funnel_wmmz',
        pipelineId: '6b775ecda0a645d09ef10fb58933e33b',
        appId: 'app1',
        sheetName: 'sheet99',
        computeMethod: 'USER_CNT',
        specifyJoinColumn: true,
        joinColumn: 'user_pseudo_id',
        conversionIntervalType: 'CUSTOMIZE',
        conversionIntervalInSeconds: 7200,
        eventAndConditions: [
          {
            eventName: 'add_button_click',
          },
          {
            eventName: 'note_share',
          },
          {
            eventName: 'note_export',
          },
        ],
        timeScopeType: 'RELATIVE',
        lastN: 4,
        timeUnit: 'WK',
        groupColumn: 'week',
      });
      if (success) {
        console.log(data);
        getEmbeddingUrl(data.dashboardId, data.sheetId, data.visualIds[0]);
      }
      setLoadingData(false);
    } catch (error) {
      setLoadingData(false);
    }
  };

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
              <br />
              <Button variant="primary" onClick={clickPreview}>
                {t('common:button.preview')}
              </Button>
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
        <Navigation activeHref={`/analytics/${pid}/app/${appid}/funnel`} />
      }
    />
  );
};

export default AnalyticsFunnel;
