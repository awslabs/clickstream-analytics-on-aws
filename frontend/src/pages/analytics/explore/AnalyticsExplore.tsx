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
  Container,
  ContentLayout,
  FormField,
  Select,
  SelectProps,
  SpaceBetween,
} from '@cloudscape-design/components';
import {
  getPipelineDetailByProjectId,
  warmup,
  clean,
  getPathNodes,
} from 'apis/analytics';
import Loading from 'components/common/Loading';
import AnalyticsNavigation from 'components/layouts/AnalyticsNavigation';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import HelpInfo from 'components/layouts/HelpInfo';
import { useUserEventParameter } from 'context/AnalyticsEventsContext';
import { DispatchContext, StateContext } from 'context/StateContext';
import { StateActionType, HelpPanelType } from 'context/reducer';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { defaultStr } from 'ts/utils';
import AnalyticsAttribution from '../attribution/AnalyticsAttribution';
import AnalyticsCustomHeader from '../comps/AnalyticsCustomHeader';
import AnalyticsCustomHeaderBg from '../comps/AnalyticsCustomHeaderBg';
import AnalyticsEvent from '../event/AnalyticsEvent';
import AnalyticsFunnel from '../funnel/AnalyticsFunnel';
import AnalyticsPath from '../path/AnalyticsPath';
import AnalyticsRetention from '../retention/AnalyticsRetention';

const AnalyticsExplore: React.FC = () => {
  const { t } = useTranslation();
  const { projectId, appId } = useParams();
  const [headerHeight, setHeaderHeight] = useState(100);
  const dispatch = useContext(DispatchContext);
  const state = useContext(StateContext);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedOption, setSelectedOption] =
    useState<SelectProps.Option | null>({
      label: defaultStr(t('analytics:explore.eventAnalysis')),
      value: 'Event',
    });

  const analyticsModelOptions: SelectProps.Options = [
    {
      label: defaultStr(t('analytics:explore.exploitativeAnalytics')),
      options: [
        {
          label: defaultStr(t('analytics:explore.eventAnalysis')),
          value: 'Event',
        },
        {
          label: defaultStr(t('analytics:explore.funnelAnalysis')),
          value: 'Funnel',
        },
        {
          label: defaultStr(t('analytics:explore.pathAnalysis')),
          value: 'Path',
        },
        {
          label: defaultStr(t('analytics:explore.retentionAnalysis')),
          value: 'Retention',
        },
        {
          label: defaultStr(t('analytics:explore.attributionAnalysis')),
          value: 'Attribution',
        },
      ],
    },
  ];

  const breadcrumbItems = [
    {
      text: t('breadCrumb.analyticsStudio'),
      href: '/analytics',
    },
    {
      text: t('breadCrumb.explore'),
      href: `/analytics/${projectId}/app/${appId}/explore`,
    },
  ];

  const [pipeline, setPipeline] = useState<IPipeline | null>(null);
  const { data, loading } = useUserEventParameter();

  const [pathNodes, setPathNodes] = useState<{
    pageTitles: IMetadataAttributeValue[];
    pageUrls: IMetadataAttributeValue[];
    screenNames: IMetadataAttributeValue[];
    screenIds: IMetadataAttributeValue[];
  }>({
    pageTitles: [],
    pageUrls: [],
    screenNames: [],
    screenIds: [],
  });

  const getAllPathNodes = async () => {
    try {
      const { success, data }: ApiResponse<any> = await getPathNodes(
        defaultStr(projectId),
        defaultStr(appId)
      );
      if (success) {
        setPathNodes(data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const warnAndClean = async (
    projectId: string,
    appId: string,
    region: string
  ) => {
    await Promise.all([
      warmup({
        projectId: projectId,
        appId: appId,
      }),
      clean(region),
    ]);
  };

  const loadPipeline = async () => {
    setLoadingData(true);
    try {
      const { success, data }: ApiResponse<IPipeline> =
        await getPipelineDetailByProjectId(defaultStr(projectId));
      setLoadingData(false);
      if (success && data.analysisStudioEnabled) {
        setPipeline(data);
        // async to call warm and clean
        warnAndClean(
          defaultStr(projectId),
          defaultStr(appId),
          defaultStr(data.region)
        );
      }
    } catch (error) {
      setLoadingData(false);
      console.log(error);
    }
  };

  useEffect(() => {
    if (projectId && appId) {
      loadPipeline();
    }
  }, [projectId, appId]);

  useEffect(() => {
    if (projectId && appId && selectedOption?.value === 'Path') {
      getAllPathNodes();
    }
  }, [selectedOption]);

  useEffect(() => {
    dispatch?.({ type: StateActionType.CLEAR_HELP_PANEL });
  }, []);

  return (
    <div className="flex">
      <AnalyticsNavigation
        activeHref={`/analytics/${projectId}/app/${appId}/explore`}
      />
      <div className="flex-1">
        <AppLayout
          toolsOpen={state?.showHelpPanel}
          onToolsChange={(e) => {
            if (e.detail.open && state?.helpPanelType === HelpPanelType.NONE) {
              dispatch?.({
                type: StateActionType.SHOW_HELP_PANEL,
                payload: HelpPanelType.ANALYTICS_EXPLORE,
              });
            } else if (!e.detail.open) {
              dispatch?.({ type: StateActionType.HIDE_HELP_PANEL });
            } else {
              dispatch?.({
                type: StateActionType.SHOW_HELP_PANEL,
                payload: state?.helpPanelType,
              });
            }
          }}
          tools={<HelpInfo />}
          navigationHide
          content={
            <ContentLayout
              header={<AnalyticsCustomHeaderBg height={headerHeight} />}
            >
              <AnalyticsCustomHeader
                updateContentHeader={(height) => {
                  setHeaderHeight(height);
                }}
                headerText={defaultStr(t('analytics:explore.title'))}
                descriptionText={t('analytics:explore.description')}
              >
                <div className="mt-20 flex align-center">
                  <FormField
                    label={
                      <SpaceBetween direction="horizontal" size="xxs">
                        <div className="white-title">
                          {t('analytics:explore.analyticsModel')}
                        </div>
                      </SpaceBetween>
                    }
                  ></FormField>
                  <div className="ml-10" style={{ minWidth: 220 }}>
                    <Select
                      disabled={!pipeline}
                      selectedOption={selectedOption}
                      onChange={({ detail }) => {
                        dispatch?.({
                          type: StateActionType.HIDE_HELP_PANEL,
                        });
                        dispatch?.({
                          type: StateActionType.RESET_VALID_ERROR,
                        });
                        setSelectedOption(detail.selectedOption);
                      }}
                      options={analyticsModelOptions}
                    />
                  </div>
                </div>
              </AnalyticsCustomHeader>
              {loadingData && <Loading />}
              {!pipeline && !loadingData && (
                <SpaceBetween direction="vertical" size="xxl">
                  <Container>
                    <Box textAlign="center" color="inherit">
                      <Box
                        padding={{ bottom: 'xxl' }}
                        variant="p"
                        color="text-status-inactive"
                      >
                        <b>{t('analytics:emptyExploreMessage')}</b>
                      </Box>
                    </Box>
                  </Container>
                </SpaceBetween>
              )}
              {pipeline &&
                !loadingData &&
                selectedOption?.value === 'Funnel' && (
                  <AnalyticsFunnel
                    loadingEvents={loading}
                    loading={false}
                    pipeline={pipeline}
                    builtInMetadata={data?.builtInMetaData}
                    metadataEvents={data?.metaDataEvents}
                    metadataEventParameters={data?.metaDataEventParameters}
                    metadataUserAttributes={data?.metaDataUserAttributes}
                    categoryEvents={data?.categoryEvents}
                    presetParameters={data.presetParameters}
                    groupParameters={data.groupParameters}
                  />
                )}
              {pipeline &&
                !loadingData &&
                selectedOption?.value === 'Event' && (
                  <AnalyticsEvent
                    loadingEvents={loading}
                    loading={false}
                    pipeline={pipeline}
                    builtInMetadata={data?.builtInMetaData}
                    metadataEvents={data?.metaDataEvents}
                    metadataEventParameters={data?.metaDataEventParameters}
                    metadataUserAttributes={data?.metaDataUserAttributes}
                    categoryEvents={data?.categoryEvents}
                    presetParameters={data.presetParameters}
                    groupParameters={data.groupParameters}
                  />
                )}
              {pipeline && !loadingData && selectedOption?.value === 'Path' && (
                <AnalyticsPath
                  loadingEvents={loading}
                  loading={false}
                  pipeline={pipeline}
                  builtInMetadata={data?.builtInMetaData}
                  metadataEvents={data?.metaDataEvents}
                  metadataEventParameters={data?.metaDataEventParameters}
                  metadataUserAttributes={data?.metaDataUserAttributes}
                  categoryEvents={data?.categoryEvents}
                  presetParameters={data.presetParameters}
                  nodes={pathNodes}
                />
              )}
              {pipeline &&
                !loadingData &&
                selectedOption?.value === 'Retention' && (
                  <AnalyticsRetention
                    loadingEvents={loading}
                    loading={false}
                    pipeline={pipeline}
                    builtInMetadata={data?.builtInMetaData}
                    metadataEvents={data?.metaDataEvents}
                    metadataEventParameters={data?.metaDataEventParameters}
                    metadataUserAttributes={data?.metaDataUserAttributes}
                    categoryEvents={data?.categoryEvents}
                    presetParameters={data.presetParameters}
                    groupParameters={data.groupParameters}
                  />
                )}
              {pipeline &&
                !loadingData &&
                selectedOption?.value === 'Attribution' && (
                  <AnalyticsAttribution
                    loadingEvents={loading}
                    loading={false}
                    pipeline={pipeline}
                    builtInMetadata={data?.builtInMetaData}
                    metadataEvents={data?.metaDataEvents}
                    metadataEventParameters={data?.metaDataEventParameters}
                    metadataUserAttributes={data?.metaDataUserAttributes}
                    categoryEvents={data?.categoryEvents}
                    presetParameters={data.presetParameters}
                  />
                )}
            </ContentLayout>
          }
          breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
          headerSelector="#header"
        />
      </div>
    </div>
  );
};

export default AnalyticsExplore;
