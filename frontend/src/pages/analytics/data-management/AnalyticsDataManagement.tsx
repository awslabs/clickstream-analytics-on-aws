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
  Button,
  Container,
  ContentLayout,
  Header,
  SpaceBetween,
  Tabs,
} from '@cloudscape-design/components';
import { getPipelineDetailByProjectId, triggerScan } from 'apis/analytics';
import InfoLink from 'components/common/InfoLink';
import Loading from 'components/common/Loading';
import AnalyticsNavigation from 'components/layouts/AnalyticsNavigation';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import HelpInfo from 'components/layouts/HelpInfo';
import { DispatchContext, StateContext } from 'context/StateContext';
import { StateActionType, HelpPanelType } from 'context/reducer';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { alertMsg, defaultStr } from 'ts/utils';
import MetadataDetails from './MetadataDetails';
import MetadataParametersTable from '../metadata/event-parameters/MetadataParametersTable';
import MetadataEventsTable from '../metadata/events/MetadataEventsTable';
import MetadataUserAttributesTable from '../metadata/user-attributes/MetadataUserAttributesTable';
import TrafficSourceHome from '../traffic-source/TrafficSourceHome';

const AnalyticsDataManagement: React.FC = () => {
  const { t } = useTranslation();
  const { projectId, appId } = useParams();

  const [loadingData, setLoadingData] = useState(false);
  const [showSplit, setShowSplit] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [analysisStudioEnabled, setAnalysisStudioEnabled] = useState(false);
  const [curMetadata, setCurMetadata] = useState<IMetadataType | null>(null);
  const [curType, setCurType] = useState<
    'event' | 'eventParameter' | 'userAttribute'
  >('event');
  const dispatch = useContext(DispatchContext);
  const state = useContext(StateContext);

  const breadcrumbItems = [
    {
      text: t('breadCrumb.analyticsStudio'),
      href: '/analytics',
    },
    {
      text: t('breadCrumb.data-management'),
      href: `/analytics/${projectId}/app/${appId}/data-management`,
    },
  ];

  const onClickTriggerScan = async () => {
    setScanLoading(true);
    try {
      const { success }: ApiResponse<any> = await triggerScan(
        defaultStr(projectId),
        defaultStr(appId)
      );
      setScanLoading(false);
      if (success) {
        alertMsg(t('analytics:metadata.scanTriggeredSuccessfully'), 'success');
      }
    } catch (error) {
      console.log(error);
      setScanLoading(false);
    }
  };

  const loadPipeline = async () => {
    setLoadingData(true);
    try {
      const { success, data }: ApiResponse<IPipeline> =
        await getPipelineDetailByProjectId(defaultStr(projectId));
      if (success) {
        setAnalysisStudioEnabled(data.analysisStudioEnabled ?? false);
      }
      setLoadingData(false);
    } catch (error) {
      setLoadingData(false);
      console.log(error);
    }
  };

  useEffect(() => {
    if (projectId && appId) {
      loadPipeline();
    }
  }, []);

  useEffect(() => {
    dispatch?.({ type: StateActionType.CLEAR_HELP_PANEL });
  }, []);

  return (
    <div className="flex">
      <AnalyticsNavigation
        activeHref={`/analytics/${projectId}/app/${appId}/data-management`}
      />
      <div className="flex-1">
        <AppLayout
          toolsOpen={state?.showHelpPanel}
          onToolsChange={(e) => {
            if (e.detail.open && state?.helpPanelType === HelpPanelType.NONE) {
              dispatch?.({
                type: StateActionType.SHOW_HELP_PANEL,
                payload: HelpPanelType.ANALYTICS_METADATA,
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
              header={
                <Header
                  variant="h1"
                  info={
                    <InfoLink
                      onFollow={() => {
                        dispatch?.({
                          type: StateActionType.SHOW_HELP_PANEL,
                          payload: HelpPanelType.ANALYTICS_METADATA,
                        });
                      }}
                    />
                  }
                  description={t('analytics:metadata.description')}
                  actions={
                    <SpaceBetween size="xs" direction="horizontal">
                      <Button
                        loading={scanLoading}
                        iconName="refresh"
                        onClick={onClickTriggerScan}
                      >
                        {t('common:button.scanMetadata')}
                      </Button>
                    </SpaceBetween>
                  }
                >
                  {t('nav.analytics.data-management')}
                </Header>
              }
            >
              <Container>
                {loadingData ? (
                  <Loading />
                ) : (
                  <Tabs
                    onChange={() => {
                      dispatch?.({
                        type: StateActionType.HIDE_HELP_PANEL,
                      });
                    }}
                    tabs={[
                      {
                        label: t('analytics:metadata.event.title'),
                        id: 'first',
                        content: (
                          <MetadataEventsTable
                            analysisStudioEnabled={analysisStudioEnabled}
                            setShowDetails={(
                              show: boolean,
                              data?: IMetadataType
                            ) => {
                              setShowSplit(show);
                              if (data) {
                                setCurMetadata(data as IMetadataEvent);
                                setCurType('event');
                              }
                            }}
                          />
                        ),
                      },
                      {
                        label: t('analytics:metadata.eventParameter.title'),
                        id: 'second',
                        content: (
                          <MetadataParametersTable
                            analysisStudioEnabled={analysisStudioEnabled}
                            setShowDetails={(
                              show: boolean,
                              data?: IMetadataType
                            ) => {
                              setShowSplit(show);
                              if (data) {
                                setCurMetadata(data as IMetadataEventParameter);
                                setCurType('eventParameter');
                              }
                            }}
                          />
                        ),
                      },
                      {
                        label: t('analytics:metadata.userAttribute.title'),
                        id: 'third',
                        content: (
                          <MetadataUserAttributesTable
                            analysisStudioEnabled={analysisStudioEnabled}
                            setShowDetails={(
                              show: boolean,
                              data?: IMetadataType
                            ) => {
                              setShowSplit(show);
                              if (data) {
                                setCurMetadata(data as IMetadataUserAttribute);
                                setCurType('userAttribute');
                              }
                            }}
                          />
                        ),
                      },
                      {
                        label: t('analytics:metadata.trafficSource.title'),
                        id: 'fourth',
                        content: (
                          <TrafficSourceHome
                            analysisStudioEnabled={analysisStudioEnabled}
                          />
                        ),
                      }
                    ]}
                  />
                )}
              </Container>
            </ContentLayout>
          }
          breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
          headerSelector="#header"
          splitPanelOpen={showSplit}
          onSplitPanelToggle={(e) => {
            setShowSplit(e.detail.open);
          }}
          splitPanel={
            curMetadata ? (
              <MetadataDetails type={curType} metadata={curMetadata} />
            ) : (
              ''
            )
          }
        />
      </div>
    </div>
  );
};

export default AnalyticsDataManagement;
