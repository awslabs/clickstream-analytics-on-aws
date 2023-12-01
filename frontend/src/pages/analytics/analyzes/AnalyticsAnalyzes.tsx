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
  SpaceBetween,
} from '@cloudscape-design/components';
import { analysisEnable, embedAnalyzesUrl } from 'apis/analytics';
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
import { defaultStr } from 'ts/utils';
import ExploreEmbedFrame from '../comps/ExploreEmbedFrame';

const AnalyticsAnalyzes: React.FC = () => {
  const { t } = useTranslation();
  const { projectId, appId } = useParams();
  const [loadingData, setLoadingData] = useState(false);
  const [dashboardEmbedUrl, setDashboardEmbedUrl] = useState('');
  const dispatch = useContext(DispatchContext);
  const state = useContext(StateContext);

  const getAnalyzes = async () => {
    setLoadingData(true);
    try {
      const { success, data }: ApiResponse<any> = await embedAnalyzesUrl(
        defaultStr(projectId),
        window.location.origin
      );
      if (success && data.EmbedUrl) {
        setDashboardEmbedUrl(data.EmbedUrl);
      }
    } catch (error) {
      setLoadingData(false);
    }
    setLoadingData(false);
  };

  const checkProjectEnableAndLoadData = async (loadDataFunc: any) => {
    setLoadingData(true);
    try {
      const { success, data }: ApiResponse<{ reportingEnabled: boolean }> =
        await analysisEnable(defaultStr(projectId));
      if (success && data?.reportingEnabled) {
        loadDataFunc();
      } else {
        setLoadingData(false);
      }
    } catch (error) {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (projectId && appId) {
      checkProjectEnableAndLoadData(getAnalyzes);
    }
  }, [projectId]);

  const breadcrumbItems = [
    {
      text: t('breadCrumb.analyticsStudio'),
      href: '/analytics',
    },
    {
      text: t('breadCrumb.analyzes'),
      href: `/analytics/${projectId}/app/${appId}/analyzes`,
    },
  ];

  return (
    <div className="flex">
      <AnalyticsNavigation
        activeHref={`/analytics/${projectId}/app/${appId}/analyzes`}
      />
      <div className="flex-1">
        <AppLayout
          toolsOpen={state?.showHelpPanel}
          onToolsChange={(e) => {
            if (state?.helpPanelType === HelpPanelType.NONE) {
              return;
            }
            if (!e.detail.open) {
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
                <SpaceBetween size="m">
                  <Header
                    variant="h1"
                    description={t('analytics:analyzes.description')}
                    info={
                      <InfoLink
                        onFollow={() => {
                          dispatch?.({
                            type: StateActionType.SHOW_HELP_PANEL,
                            payload: HelpPanelType.ANALYTICS_ANALYZES,
                          });
                        }}
                      />
                    }
                  >
                    {t('analytics:analyzes.title')}
                  </Header>
                </SpaceBetween>
              }
            >
              <Container>
                {loadingData ? (
                  <Loading isPage />
                ) : (
                  <ExploreEmbedFrame
                    embedType="console"
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

export default AnalyticsAnalyzes;
