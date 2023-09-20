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
  Alert,
  AppLayout,
  Container,
  ContentLayout,
  Header,
  SpaceBetween,
} from '@cloudscape-design/components';
import AnalyticsNavigation from 'components/layouts/AnalyticsNavigation';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

const AnalyticsAnalyzes: React.FC = () => {
  const { t } = useTranslation();
  const { projectId, appId } = useParams();

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
          toolsHide
          navigationHide
          content={
            <ContentLayout
              header={
                <SpaceBetween size="m">
                  <Header
                    variant="h1"
                    description={t('analytics:analyzes.description')}
                  >
                    {t('analytics:analyzes.title')}
                  </Header>
                </SpaceBetween>
              }
            >
              <Container>
                <Alert statusIconAriaLabel="Info">
                  {t('analytics:analyzes.comeSoon')}
                </Alert>
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
