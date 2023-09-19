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
  ContentLayout,
  Header,
  Link,
  Popover,
} from '@cloudscape-design/components';
import AnalyticsNavigation from 'components/layouts/AnalyticsNavigation';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import { t } from 'i18next';
import { useLocalStorage } from 'pages/common/use-local-storage';
import React, { useEffect, useState } from 'react';
import { ANALYTICS_INFO_KEY } from 'ts/const';

const AnalyticsHome: React.FC = () => {
  const [loadingData, setLoadingData] = useState(true);
  const [analyticsInfo] = useLocalStorage(ANALYTICS_INFO_KEY, {
    projectId: '',
    projectName: '',
    appId: '',
    appName: '',
  });

  useEffect(() => {
    setLoadingData(true);
    if (analyticsInfo.projectId && analyticsInfo.appId) {
      window.location.href = `/analytics/${analyticsInfo.projectId}/app/${analyticsInfo.appId}/dashboards`;
    }
    setLoadingData(false);
  }, []);

  const breadcrumbItems = [
    {
      text: t('breadCrumb.analytics'),
      href: '/analytics',
    },
  ];

  return (
    <div className="flex">
      <AnalyticsNavigation activeHref={`/analytics`} />
      <div className="flex-1">
        <AppLayout
          toolsHide
          navigationHide
          content={
            <ContentLayout
              header={
                <Header
                  variant="h1"
                  info={
                    <Popover
                      triggerType="custom"
                      content="This instance contains insufficient memory. Stop the instance, choose a different instance type with more memory, and restart it."
                    >
                      <Link variant="info">Info</Link>
                    </Popover>
                  }
                  description={t('analytics:explore.description')}
                >
                  {t('analytics:explore.title')}
                </Header>
              }
            ></ContentLayout>
          }
          breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
          headerSelector="#header"
        />
      </div>
    </div>
  );
};

export default AnalyticsHome;
