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
  OUTPUT_DATA_MODELING_REDSHIFT_BI_USER_NAME_SUFFIX,
  OUTPUT_DATA_MODELING_REDSHIFT_DATA_API_ROLE_ARN_SUFFIX,
  OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_NAME,
  OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN,
} from 'ts/constant-ln';
import { generateStr, getValueFromStackOutputs } from 'ts/utils';

const AnalyticsFunnel: React.FC = () => {
  const { t } = useTranslation();
  const { projectId, appId } = useParams();
  const [loadingData, setLoadingData] = useState(false);
  const [emptyData, setEmptyData] = useState(true);
  const [pipeline, setPipeline] = useState({} as IPipeline);

  const getEmbeddingUrl = async (
    dashboardId: string,
    sheetId: string | undefined,
    visualId: string | undefined,
    containerId: string
  ) => {
    try {
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
            container: containerId,
          });
        };
        embedDashboard();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const loadPipeline = async (projectId: string) => {
    setLoadingData(true);
    try {
      const { success, data }: ApiResponse<IPipeline> =
        await getPipelineDetailByProjectId(projectId);
      if (success) {
        setPipeline(data);
        setLoadingData(false);
      }
    } catch (error) {
      console.log(error);
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadPipeline(projectId ?? '');
  }, [projectId]);

  const metricOptions = [
    {
      value: 'event',
      label: t('analytics:options.eventNumber'),
    },
    { value: 'user', label: t('analytics:options.userNumber') },
  ];

  const [windowValue, setWindowValue] = useState<string>('5');
  const [selectedMetric, setSelectedMetric] =
    useState<SelectProps.Option | null>({
      value: 'event',
      label: t('analytics:options.userNumber') ?? '',
    });

  const customWindowType = {
    value: 'custom',
    label: t('analytics:options.customWindow'),
  };
  const windowTypeOptions = [
    customWindowType,
    { value: 'theDay', label: t('analytics:options.theDayWindow') },
  ];
  const [selectedWindowType, setSelectedWindowType] =
    useState<SelectProps.Option | null>(customWindowType);

  const windowUnitOptions = [
    { value: 'second', label: t('analytics:options.secondWindowUnit') },
    { value: 'minute', label: t('analytics:options.minuteWindowUnit') },
    { value: 'hour', label: t('analytics:options.hourWindowUnit') },
    { value: 'day', label: t('analytics:options.dayWindowUnit') },
  ];
  const [selectedWindowUnit, setSelectedWindowUnit] =
    useState<SelectProps.Option | null>({
      value: 'minute',
      label: t('analytics:options.minuteWindowUnit') ?? '',
    });

  const [associateParameterChecked, setAssociateParameterChecked] =
    useState<boolean>(true);
  const [windowChecked, setWindowChecked] = useState<boolean>(true);

  const clickPreview = async () => {
    setLoadingData(true);
    setEmptyData(false);
    try {
      const funnelId = generateStr(6);
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
            user:
              redshiftOutputs.get(
                OUTPUT_DATA_MODELING_REDSHIFT_BI_USER_NAME_SUFFIX
              ) ?? '',
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
            dataSourceArn:
              reportingOutputs.get(
                OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN
              ) ?? '',
          },
        },
        action: 'PREVIEW',
        viewName: `funnel_view_${funnelId}`,
        projectId: pipeline.projectId,
        pipelineId: pipeline.pipelineId,
        appId: appId ?? '',
        sheetName: `funnel_sheet_${funnelId}`,
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
        getEmbeddingUrl(
          data.dashboardId,
          data.sheetId,
          data.visualIds[0],
          '#qs-funnel-container'
        );
        getEmbeddingUrl(
          data.dashboardId,
          data.sheetId,
          data.visualIds[1],
          '#qs-funnel-table-container'
        );
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
              <Header variant="h1">{t('nav.analytics.exploreFunnel')}</Header>
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
              <Button
                variant="primary"
                onClick={clickPreview}
                loading={loadingData}
              >
                {t('common:button.preview')}
              </Button>
            </Container>
            <Container>
              {loadingData ? (
                <Loading />
              ) : (
                <div id={'qs-funnel-container'} className="iframe-explore">
                  {emptyData ? (
                    <Box
                      margin={{ vertical: 'xs' }}
                      textAlign="center"
                      color="inherit"
                    >
                      <SpaceBetween size="m">
                        <b>{t('analytics:emptyData')}</b>
                      </SpaceBetween>
                    </Box>
                  ) : null}
                </div>
              )}
            </Container>
            <Container>
              {loadingData ? (
                <Loading />
              ) : (
                <div
                  id={'qs-funnel-table-container'}
                  className="iframe-explore"
                >
                  {emptyData ? (
                    <Box
                      margin={{ vertical: 'xs' }}
                      textAlign="center"
                      color="inherit"
                    >
                      <SpaceBetween size="m">
                        <b>{t('analytics:emptyData')}</b>
                      </SpaceBetween>
                    </Box>
                  ) : null}
                </div>
              )}
            </Container>
          </SpaceBetween>
        </ContentLayout>
      }
      headerSelector="#header"
      navigation={
        <Navigation
          activeHref={`/analytics/${projectId}/app/${appId}/funnel`}
        />
      }
    />
  );
};

export default AnalyticsFunnel;
