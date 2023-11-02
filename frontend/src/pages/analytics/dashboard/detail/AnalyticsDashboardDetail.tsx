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
  Container,
  ContentLayout,
  Header,
  Link,
  Popover,
  SpaceBetween,
  Button,
} from '@cloudscape-design/components';
import { getAnalyticsDashboard } from 'apis/analytics';
import Loading from 'components/common/Loading';
import AnalyticsNavigation from 'components/layouts/AnalyticsNavigation';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import ExploreEmbedFrame from 'pages/analytics/comps/ExploreEmbedFrame';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { DEFAULT_DASHBOARD_NAME } from 'ts/constant-ln';
import { defaultStr } from 'ts/utils';

const AnalyticsDashboardDetail: React.FC = () => {
  const { t } = useTranslation();
  const { dashboardId, projectId, appId } = useParams();
  const [loadingData, setLoadingData] = useState(false);
  const [dashboardEmbedUrl, setDashboardEmbedUrl] = useState('');
  const [dashboard, setDashboard] = useState({} as IAnalyticsDashboard);

  const getAnalyticsDashboardDetails = async () => {
    setLoadingData(true);
    try {
      const { success, data }: ApiResponse<IAnalyticsDashboard> =
        await getAnalyticsDashboard(
          defaultStr(projectId),
          defaultStr(appId),
          defaultStr(dashboardId),
          window.location.origin
        );
      if (success && data.embedUrl) {
        setDashboard(data);
        setDashboardEmbedUrl(data.embedUrl);
        setLoadingData(false);
      }
    } catch (error) {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (dashboardId) {
      getAnalyticsDashboardDetails();
    }
  }, [dashboardId]);

  const getDashboardName = () => {
    return dashboard.name === DEFAULT_DASHBOARD_NAME
      ? `${DEFAULT_DASHBOARD_NAME} - default`
      : dashboard.name;
  };

  const breadcrumbItems = [
    {
      text: t('breadCrumb.analyticsStudio'),
      href: '/analytics',
    },
    {
      text: t('breadCrumb.dashboard'),
      href: `/analytics/${projectId}/app/${appId}/dashboards`,
    },
    {
      text: getDashboardName(),
      href: `/analytics/${projectId}/app/${appId}/dashboard/${dashboardId}`,
    },
  ];

  return (
    <div className="flex">
      <AnalyticsNavigation
        activeHref={`/analytics/${projectId}/app/${appId}/dashboards`}
      />
      <div className="flex-1">
        <AppLayout
          toolsHide
          navigationHide
          content={
            <ContentLayout
              header={
                <SpaceBetween size="m">
                  <Header
                    variant="h1"
                    description={dashboard.description}
                    info={
                      <>
                        {dashboard.name === DEFAULT_DASHBOARD_NAME ? (
                          <Popover
                            triggerType="custom"
                            content={t(
                              'analytics:information.userLifecycleInfo'
                            )}
                          >
                            <Link variant="info">{t('info')}</Link>
                          </Popover>
                        ) : null}
                      </>
                    }
                    actions={
                      <SpaceBetween size="xs" direction="horizontal">
                        <Button
                          href={`/analytics/${projectId}/app/${appId}/dashboard/full/${dashboard.id}`}
                          iconAlign="right"
                          iconName="external"
                          target="_blank"
                        >
                          {t('common:button.fullWindowView')}
                        </Button>
                      </SpaceBetween>
                    }
                  >
                    {dashboard.name}
                  </Header>
                </SpaceBetween>
              }
            >
              <Container>
                {loadingData ? (
                  <Loading isPage />
                ) : (
                  <ExploreEmbedFrame
                    embedType="dashboard"
                    embedUrl={dashboardEmbedUrl}
                  />
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

export default AnalyticsDashboardDetail;
