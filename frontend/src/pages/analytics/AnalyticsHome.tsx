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

import { Alert, AppLayout } from '@cloudscape-design/components';
import { getProjectList } from 'apis/project';
import Loading from 'components/common/Loading';
import AnalyticsNavigation from 'components/layouts/AnalyticsNavigation';
import { t } from 'i18next';
import { useLocalStorage } from 'pages/common/use-local-storage';
import React, { useEffect, useState } from 'react';
import { ANALYTICS_INFO_KEY } from 'ts/const';

const AnalyticsHome: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [analyticsInfo, setAnalyticsInfo] = useLocalStorage(
    ANALYTICS_INFO_KEY,
    {
      projectId: '',
      projectName: '',
      appId: '',
      appName: '',
    }
  );

  const gotoFirstProjectApp = async () => {
    try {
      setLoading(true);
      const apps = [];
      const { success, data }: ApiResponse<ResponseTableData<IProject>> =
        await getProjectList({
          pageNumber: 1,
          pageSize: 9999,
        });
      if (success) {
        for (const project of data.items) {
          if (project.applications && project.reportingEnabled) {
            for (const app of project.applications) {
              apps.push({
                projectId: project.id,
                projectName: project.name,
                appId: app.appId,
                appName: app.name,
              });
            }
          }
        }
      }
      if (apps.length > 0) {
        setAnalyticsInfo(apps[0]);
        window.location.href = `/analytics/${apps[0].projectId}/app/${apps[0].appId}/dashboards`;
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (analyticsInfo.projectId && analyticsInfo.appId) {
      window.location.href = `/analytics/${analyticsInfo.projectId}/app/${analyticsInfo.appId}/dashboards`;
    } else {
      gotoFirstProjectApp();
    }
  }, []);

  return (
    <div className="flex">
      <AnalyticsNavigation activeHref={`/analytics`} />
      <div className="flex-1">
        <AppLayout
          toolsHide
          navigationHide
          content={
            <>
              {loading ? (
                <Loading />
              ) : (
                <Alert
                  statusIconAriaLabel="Error"
                  type="error"
                  header={t('analytics:noDataAvailableTitle')}
                >
                  {t('analytics:noDataAvailableMessage')}
                </Alert>
              )}
            </>
          }
          headerSelector="#header"
        />
      </div>
    </div>
  );
};

export default AnalyticsHome;
