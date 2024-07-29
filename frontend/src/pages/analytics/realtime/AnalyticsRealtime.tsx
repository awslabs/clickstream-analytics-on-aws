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
  Alert,
  AppLayout,
  Button,
  ButtonDropdown,
  ColumnLayout,
  Container,
  ContentLayout,
  Header,
  Link,
  Popover,
  SpaceBetween,
  Toggle,
} from '@cloudscape-design/components';
import {
  embedRealtimeUrl,
  getPipelineDetailByProjectId,
  realtimeDryRun,
} from 'apis/analytics';
import Loading from 'components/common/Loading';
import AnalyticsNavigation from 'components/layouts/AnalyticsNavigation';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { buildDocumentLink } from 'ts/url';
import { defaultStr } from 'ts/utils';
import ExploreEmbedFrame from '../comps/ExploreEmbedFrame';

const AnalyticsRealtime: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { projectId, appId } = useParams();

  let intervalId: any = 0;

  const [checked, setChecked] = React.useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingDruRun, setLoadingDryRun] = useState(false);
  const [loadingFrameData, setLoadingFrameData] = useState(false);
  const [alertVisible, setAlertVisible] = useState(true);
  const [enableStreamModule, setEnableStreamModule] = useState(false);
  const [dashboardEmbedUrl, setDashboardEmbedUrl] = useState('');
  const [autoRefreshText, setAutoRefreshText] = useState(
    t('analytics:realtime.autoRefresh.title')
  );
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(0);

  const getRealtime = async () => {
    setLoadingFrameData(true);
    try {
      const { success, data }: ApiResponse<any> = await embedRealtimeUrl(
        defaultStr(projectId),
        defaultStr(appId),
        window.location.origin
      );
      if (success && data.EmbedUrl) {
        setDashboardEmbedUrl(data.EmbedUrl);
      }
    } catch (error) {
      setDashboardEmbedUrl('');
      setLoadingFrameData(false);
    }
    setLoadingFrameData(false);
  };

  const getRealtimeDryRun = async (checked) => {
    setLoadingDryRun(true);
    try {
      const { success }: ApiResponse<any> = await realtimeDryRun(
        defaultStr(projectId),
        defaultStr(appId),
        checked
      );
      if (success) {
        setLoadingDryRun(false);
        setChecked(checked);
      }
    } catch (error) {
      setDashboardEmbedUrl('');
    }
    setLoadingDryRun(false);
  };

  const loadPipeline = async () => {
    setLoadingData(true);
    try {
      const { success, data }: ApiResponse<IPipeline> =
        await getPipelineDetailByProjectId(defaultStr(projectId));
      if (success && data.analysisStudioEnabled) {
        if (
          appId &&
          data.streaming?.appIdStreamList &&
          data.streaming?.appIdStreamList?.includes(appId)
        ) {
          setEnableStreamModule(true);
          if (appId && data.streaming?.appIdRealtimeList?.includes(appId)) {
            setChecked(true);
          } else {
            setChecked(false);
          }
        } else {
          setEnableStreamModule(false);
          setChecked(false);
        }
      }
      setLoadingData(false);
    } catch (error) {
      setLoadingData(false);
    }
  };

  const setRefreshInterval = () => {
    window.clearInterval(intervalId);
    if (autoRefreshInterval > 0) {
      intervalId = setInterval(() => {
        getRealtime();
      }, autoRefreshInterval);
    }
  };

  useEffect(() => {
    setRefreshInterval();
    return () => {
      window.clearInterval(intervalId);
    };
  }, [autoRefreshInterval]);

  useEffect(() => {
    if (projectId && appId) {
      loadPipeline();
    }
  }, [projectId]);

  useEffect(() => {
    if (!checked) {
      setDashboardEmbedUrl('');
    }
    if (projectId && appId && enableStreamModule) {
      getRealtime();
    }
  }, [checked]);

  const breadcrumbItems = [
    {
      text: t('breadCrumb.analyticsStudio'),
      href: '/analytics',
    },
    {
      text: t('breadCrumb.realtime'),
      href: `/analytics/${projectId}/app/${appId}/realtime`,
    },
  ];

  return (
    <div className="flex">
      <AnalyticsNavigation
        activeHref={`/analytics/${projectId}/app/${appId}/realtime`}
      />
      <div className="flex-1">
        <AppLayout
          headerVariant="high-contrast"
          toolsHide
          navigationHide
          content={
            <ContentLayout
              headerVariant="high-contrast"
              header={
                <SpaceBetween size="m">
                  <Header
                    variant="h1"
                    description={t('analytics:realtime.description')}
                    info={
                      <Popover
                        triggerType="custom"
                        content={t('analytics:information.realtimeInfo')}
                      >
                        <Link variant="info">{t('info')}</Link>
                      </Popover>
                    }
                  >
                    {t('analytics:realtime.title')}
                  </Header>
                </SpaceBetween>
              }
            >
              <Container>
                {loadingData ? (
                  <Loading isPage />
                ) : (
                  <>
                    {enableStreamModule ? (
                      <div>
                        <ColumnLayout columns={2}>
                          <div>
                            <Toggle
                              disabled={loadingDruRun}
                              onChange={({ detail }) =>
                                getRealtimeDryRun(detail.checked)
                              }
                              checked={checked}
                            >
                              {checked
                                ? t('analytics:labels.realtimeStarted')
                                : t('analytics:labels.realtimeStopped')}
                            </Toggle>
                          </div>
                          <div className="cs-analytics-realtime-auto-refresh">
                            <Button
                              iconName="refresh"
                              variant="icon"
                              disabled={!checked}
                              onClick={() => getRealtime()}
                            />
                            <ButtonDropdown
                              disabled={!checked}
                              items={[
                                {
                                  text: defaultStr(
                                    t('analytics:realtime.autoRefresh.close')
                                  ),
                                  id: 'close',
                                },
                                {
                                  text: defaultStr(
                                    t(
                                      'analytics:realtime.autoRefresh.seconds15'
                                    )
                                  ),
                                  id: 'seconds15',
                                },
                                {
                                  text: defaultStr(
                                    t(
                                      'analytics:realtime.autoRefresh.seconds30'
                                    )
                                  ),
                                  id: 'seconds30',
                                },
                                {
                                  text: defaultStr(
                                    t('analytics:realtime.autoRefresh.minute1')
                                  ),
                                  id: 'minute1',
                                },
                                {
                                  text: defaultStr(
                                    t('analytics:realtime.autoRefresh.minute5')
                                  ),
                                  id: 'minute5',
                                },
                                {
                                  text: defaultStr(
                                    t('analytics:realtime.autoRefresh.minute10')
                                  ),
                                  id: 'minute10',
                                },
                              ]}
                              onItemClick={(e) => {
                                if (e.detail.id === 'close') {
                                  setAutoRefreshText(
                                    t('analytics:realtime.autoRefresh.title')
                                  );
                                  setAutoRefreshInterval(0);
                                } else if (e.detail.id === 'seconds15') {
                                  setAutoRefreshText(
                                    t(
                                      'analytics:realtime.autoRefresh.seconds15'
                                    )
                                  );
                                  setAutoRefreshInterval(15000);
                                } else if (e.detail.id === 'seconds30') {
                                  setAutoRefreshText(
                                    t(
                                      'analytics:realtime.autoRefresh.seconds30'
                                    )
                                  );
                                  setAutoRefreshInterval(30000);
                                } else if (e.detail.id === 'minute1') {
                                  setAutoRefreshText(
                                    t('analytics:realtime.autoRefresh.minute1')
                                  );
                                  setAutoRefreshInterval(60000);
                                } else if (e.detail.id === 'minute5') {
                                  setAutoRefreshText(
                                    t('analytics:realtime.autoRefresh.minute5')
                                  );
                                  setAutoRefreshInterval(300000);
                                } else if (e.detail.id === 'minute10') {
                                  setAutoRefreshText(
                                    t('analytics:realtime.autoRefresh.minute10')
                                  );
                                  setAutoRefreshInterval(600000);
                                }
                              }}
                            >
                              {autoRefreshText}
                            </ButtonDropdown>
                          </div>
                        </ColumnLayout>
                        {alertVisible && (
                          <div className="cs-analytics-realtime-tips">
                            <Alert
                              dismissible
                              statusIconAriaLabel="Info"
                              header={t('analytics:realtime.costTipTitle')}
                              onDismiss={() => setAlertVisible(false)}
                            >
                              {t('analytics:realtime.costTipContent')}
                              <Link
                                href={buildDocumentLink(
                                  i18n.language,
                                  '',
                                  '/plan-deployment/cost'
                                )}
                                external
                              >
                                {t('analytics:realtime.costTipLink')}
                              </Link>
                            </Alert>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Alert
                        statusIconAriaLabel="Info"
                        action={
                          <Button
                            href={`/project/detail/${projectId}`}
                            iconAlign="right"
                            iconName="external"
                            target="_blank"
                          >
                            {t('analytics:realtime.configProject')}
                          </Button>
                        }
                      >
                        {t('analytics:realtime.disableMessage')}
                      </Alert>
                    )}
                    <br />
                    {!checked ? null : (
                      <>
                        {loadingFrameData ? (
                          <Loading isPage />
                        ) : (
                          <ExploreEmbedFrame
                            embedType="dashboard"
                            embedUrl={dashboardEmbedUrl}
                            embedPage="dashboard"
                          />
                        )}
                      </>
                    )}
                  </>
                )}
              </Container>
            </ContentLayout>
          }
          breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
          headerSelector="#header"
        />
      </div>
    </div>
  );
};

export default AnalyticsRealtime;
