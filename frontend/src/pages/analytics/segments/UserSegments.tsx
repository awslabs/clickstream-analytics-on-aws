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
  ButtonDropdown,
  ContentLayout,
  Header,
  SpaceBetween,
  Table,
} from '@cloudscape-design/components';
import AnalyticsNavigation from 'components/layouts/AnalyticsNavigation';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import HelpInfo from 'components/layouts/HelpInfo';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { defaultStr } from 'ts/utils';

interface UserSegmentItem {
  id: string;
  name: string;
  desc: string;
  createAt: string;
}

const UserSegments: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const COLUMN_DEFINITIONS = [
    {
      id: 'id',
      header: 'ID',
      cell: (e: UserSegmentItem) => {
        return e.id;
      },
    },
  ];

  const listAllSegments = async () => {
    return [];
  };

  const breadcrumbItems = [
    {
      text: t('breadCrumb.name'),
      href: '/',
    },
    {
      text: t('nav.analytics.segments'),
      href: '/analytics/segments',
    },
  ];

  useEffect(() => {
    listAllSegments();
  }, []);

  return (
    <div className="flex">
      <AnalyticsNavigation activeHref={`/analytics/segments`} />
      <div className="flex-1">
        <AppLayout
          tools={<HelpInfo />}
          navigationHide
          content={
            <ContentLayout
              header={<Header>{t('nav.analytics.segments')}</Header>}
            >
              <Table
                header={
                  <Header
                    variant="h2"
                    actions={
                      <SpaceBetween direction="horizontal" size="xs">
                        <ButtonDropdown
                          items={[
                            {
                              text: defaultStr(t('button.viewDetails')),
                              id: 'detail',
                              disabled: false,
                            },
                            {
                              text: defaultStr(t('button.edit')),
                              id: 'edit',
                              disabled: false,
                            },
                            {
                              text: defaultStr(t('button.delete')),
                              id: 'delete',
                              disabled: true,
                            },
                          ]}
                        >
                          {t('button.actions')}
                        </ButtonDropdown>
                        <Button
                          iconAlign="right"
                          iconName="add-plus"
                          variant="primary"
                          onClick={() => {
                            navigate('/analytics/segments/add');
                          }}
                        >
                          {t('button.createSegment')}
                        </Button>
                      </SpaceBetween>
                    }
                    description={t('analytics:segment.desc')}
                  >
                    {t('analytics:segment.title')}
                  </Header>
                }
                variant="container"
                columnDefinitions={COLUMN_DEFINITIONS}
                items={[]}
              />
            </ContentLayout>
          }
          headerSelector="#header"
          breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
        />
      </div>
    </div>
  );
};

export default UserSegments;
