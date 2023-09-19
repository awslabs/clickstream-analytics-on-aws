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
  Link,
  Popover,
  SpaceBetween,
  Tabs,
} from '@cloudscape-design/components';
import AnalyticsNavigation from 'components/layouts/AnalyticsNavigation';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import MetadataDetails from './MetadataDetails';
import MetadataParametersTable from '../metadata/event-parameters/MetadataParametersTable';
import MetadataEventsTable from '../metadata/events/MetadataEventsTable';
import MetadataUserAttributesTable from '../metadata/user-attributes/MetadataUserAttributesTable';

const AnalyticsDataManagement: React.FC = () => {
  const { t } = useTranslation();
  const { projectId, appId } = useParams();

  const [showSplit, setShowSplit] = useState(false);
  const [curMetadata, setCurMetadata] = useState<IMetadataType | null>(null);
  const [curType, setCurType] = useState<
    'event' | 'eventParameter' | 'userAttribute'
  >('event');

  const onRefreshButtonClick = () => {
    console.log('onRefreshButtonClick');
  };

  const breadcrumbItems = [
    {
      text: t('breadCrumb.analytics'),
      href: '/analytics',
    },
    {
      text: t('breadCrumb.data-management'),
      href: `/analytics/${projectId}/app/${appId}/data-management`,
    },
  ];

  return (
    <div className="flex">
      <AnalyticsNavigation
        activeHref={`/analytics/${projectId}/app/${appId}/data-management`}
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
                  info={
                    <Popover
                      triggerType="custom"
                      content={t('analytics:information.dataManagementInfo')}
                    >
                      <Link variant="info">Info</Link>
                    </Popover>
                  }
                  description={t('analytics:metadata.description')}
                  actions={
                    <SpaceBetween size="xs" direction="horizontal">
                      <Button
                        data-testid="header-btn-create"
                        variant="primary"
                        onClick={onRefreshButtonClick}
                      >
                        {t('common:button.refreshMetadata')}
                      </Button>
                    </SpaceBetween>
                  }
                >
                  {t('nav.analytics.data-management')}
                </Header>
              }
            >
              <Container>
                <Tabs
                  tabs={[
                    {
                      label: t('analytics:metadata.event.title'),
                      id: 'first',
                      content: (
                        <MetadataEventsTable
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
                  ]}
                />
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
