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
  ColumnLayout,
  Container,
  ContentLayout,
  Header,
  Link,
  Popover,
  SpaceBetween,
  Toggle,
} from '@cloudscape-design/components';
import { embedRealtimeUrl, getPipelineDetailByProjectId } from 'apis/analytics';
import Loading from 'components/common/Loading';
import AnalyticsNavigation from 'components/layouts/AnalyticsNavigation';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { defaultStr } from 'ts/utils';
import ExploreEmbedFrame from '../comps/ExploreEmbedFrame';

const AnalyticsRealtime: React.FC = () => {
  const { t } = useTranslation();
  const { projectId, appId } = useParams();
  const [checked, setChecked] = React.useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [enableStreamModule, setEnableStreamModule] = useState(false);
  const [dashboardEmbedUrl, setDashboardEmbedUrl] = useState('');

  const getRealtime = async () => {
    setLoadingData(true);
    try {
      const { success, data }: ApiResponse<any> = await embedRealtimeUrl(
        defaultStr(projectId),
        defaultStr(appId),
        window.location.origin,
        checked
      );
      if (success && data.EmbedUrl) {
        setDashboardEmbedUrl(data.EmbedUrl);
      }
    } catch (error) {
      setChecked(!checked);
      setDashboardEmbedUrl('');
      setLoadingData(false);
    }
    setLoadingData(false);
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
      console.log(error);
    }
  };

  useEffect(() => {
    if (projectId && appId) {
      loadPipeline();
    }
  }, [projectId]);

  useEffect(() => {
    if (!checked) {
      setDashboardEmbedUrl('');
    }
    if (projectId && appId) {
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
                      <ColumnLayout columns={2}>
                        <div>
                          <Toggle
                            onChange={({ detail }) =>
                              setChecked(detail.checked)
                            }
                            checked={checked}
                          >
                            {checked
                              ? t('analytics:labels.realtimeStarted')
                              : t('analytics:labels.realtimeStopped')}
                          </Toggle>
                        </div>
                      </ColumnLayout>
                    ) : (
                      <Alert
                        statusIconAriaLabel="Info"
                        action={
                          <Button
                            disabled
                            iconAlign="right"
                            iconName="external"
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
                        {loadingData ? (
                          <Loading isPage />
                        ) : (
                          <ExploreEmbedFrame
                            embedType="console"
                            embedUrl={dashboardEmbedUrl}
                            embedPage="analyze"
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
