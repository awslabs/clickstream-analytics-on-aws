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

import { AppLayout } from '@cloudscape-design/components';
import { createEmbeddingContext } from 'amazon-quicksight-embedding-sdk';
import { fetchEmbeddingUrl, getAnalyticsDashboard } from 'apis/analytics';
import Loading from 'components/common/Loading';
import Navigation from 'components/layouts/Navigation';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const AnalyticsDashboardDetail: React.FC = () => {
  const { dashboardId, projectId, appId } = useParams();
  const [loadingData, setLoadingData] = useState(false);

  const getEmbeddingUrl = async (dashboard: IAnalyticsDashboard) => {
    try {
      const { success, data }: ApiResponse<any> = await fetchEmbeddingUrl({
        permission: dashboard.operator === 'Clickstream',
        region: dashboard.region,
        allowedDomain: window.location.origin,
        dashboardId: dashboard.id,
        sheetId: undefined,
        visualId: undefined,
      });
      if (success) {
        const embedDashboard = async () => {
          const embeddingContext = await createEmbeddingContext();
          await embeddingContext.embedDashboard({
            url: data.EmbedUrl,
            container: '#qs-container',
          });
        };
        embedDashboard();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getAnalyticsDashboardDetails = async () => {
    setLoadingData(true);
    try {
      const { success, data }: ApiResponse<IAnalyticsDashboard> =
        await getAnalyticsDashboard(
          projectId ?? '',
          appId ?? '',
          dashboardId ?? ''
        );
      if (success) {
        getEmbeddingUrl(data);
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

  return (
    <AppLayout
      toolsHide
      content={
        loadingData ? (
          <Loading />
        ) : (
          <div id={'qs-container'} className="iframe-dashboard"></div>
        )
      }
      headerSelector="#header"
      navigation={<Navigation activeHref="/analytics/dashboard/detail" />}
    />
  );
};

export default AnalyticsDashboardDetail;
