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
import { getOutbound } from 'apis/analytics';
import Loading from 'components/common/Loading';
import AnalyticsNavigation from 'components/layouts/AnalyticsNavigation';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Iframe from 'react-iframe';
import { useParams } from 'react-router-dom';
import { defaultStr } from 'ts/utils';
import { getLngFromLocalStorage } from '../analytics-utils';

const Outbound: React.FC = () => {
  const { t } = useTranslation();
  const { projectId, appId, outboundName } = useParams();
  const [loadingData, setLoadingData] = useState(false);
  const [outbound, setOutbound] = useState<any>({});

  const fetchOutbound = async () => {
    setLoadingData(true);
    try {
      const { success, data }: ApiResponse<any> = await getOutbound();
      if (success && data) {
        setOutbound(data.find((item) => item.name === outboundName));
      }
      setLoadingData(false);
    } catch (error) {
      setLoadingData(false);
      console.error(error);
    }
  };

  useEffect(() => {
    if (outboundName) {
      fetchOutbound();
    }
  }, [outboundName]);

  const breadcrumbItems = [
    {
      text: t('breadCrumb.analyticsStudio'),
      href: '/analytics',
    },
    {
      text: outbound.title
        ? defaultStr(outbound.title[getLngFromLocalStorage()])
        : '',
      href: `/analytics/${projectId}/app/${appId}/outbound/${outbound.name}`,
    },
  ];

  return (
    <div className="flex">
      <AnalyticsNavigation
        activeHref={`/analytics/${projectId}/app/${appId}/outbound/${outbound.name}`}
      />
      <div className="flex-1">
        <AppLayout
          navigationHide
          content={
            <ContentLayout
              header={
                <SpaceBetween size="m">
                  <Header variant="h1">
                    {outbound.title
                      ? defaultStr(outbound.title[getLngFromLocalStorage()])
                      : ''}
                  </Header>
                </SpaceBetween>
              }
            >
              <Container>
                {loadingData ? (
                  <Loading isPage />
                ) : (
                  <Iframe
                    url={outbound.url}
                    id="outbound-iframe"
                    width="100%"
                    height="100%"
                    className="cs-analytics-outbound-iframe"
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

export default Outbound;
