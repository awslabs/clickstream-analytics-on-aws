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
  FormField,
  Header,
  Link,
  Select,
  SelectProps,
} from '@cloudscape-design/components';
import AnalyticsNavigation from 'components/layouts/AnalyticsNavigation';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import AnalyticsFunnel from '../funnel/AnalyticsFunnel';

const AnalyticsExplore: React.FC = () => {
  const { t } = useTranslation();
  const { projectId, appId } = useParams();

  const [selectedOption, setSelectedOption] =
    useState<SelectProps.Option | null>({
      label: t('analytics:explore.funnelAnalysis') ?? '',
      value: 'Funnel',
    });

  const analyticsModelOptions: SelectProps.Options = [
    {
      label: t('analytics:explore.exploitativeAnalytics') ?? '',
      options: [
        { label: t('analytics:explore.funnelAnalysis') ?? '', value: 'Funnel' },
        { label: t('analytics:explore.eventAnalysis') ?? '', value: 'Event' },
        { label: t('analytics:explore.pathAnalysis') ?? '', value: 'Path' },
        {
          label: t('analytics:explore.retentionAnalysis') ?? '',
          value: 'Retention',
        },
      ],
    },
    {
      label: t('analytics:explore.userAnalytics') ?? '',
      disabled: true,
      options: [
        { label: t('analytics:explore.userSearch') ?? '', value: 'UserSearch' },
      ],
    },
  ];

  const breadcrumbItems = [
    {
      text: t('breadCrumb.analytics'),
      href: '/analytics',
    },
    {
      text: t('breadCrumb.explore'),
      href: `/analytics/${projectId}/app/${appId}/explore`,
    },
  ];

  return (
    <div className="flex">
      <AnalyticsNavigation
        activeHref={`/analytics/${projectId}/app/${appId}/explore`}
      />
      <div className="flex-1">
        <AppLayout
          toolsHide
          navigationHide
          content={
            <ContentLayout
              header={
                <Header
                  variant="h1"
                  info={<Link variant="info">Info</Link>}
                  description={t('analytics:explore.description')}
                  actions={
                    <FormField
                      label={
                        <>
                          {t('analytics:explore.analyticsModel')} &nbsp;
                          <Link variant="info">Info</Link>
                        </>
                      }
                    >
                      <Select
                        selectedOption={selectedOption}
                        placeholder="Select an option"
                        onChange={({ detail }) =>
                          setSelectedOption(detail.selectedOption)
                        }
                        options={analyticsModelOptions}
                      />
                    </FormField>
                  }
                >
                  {t('analytics:explore.title')}
                </Header>
              }
            >
              <AnalyticsFunnel />
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
