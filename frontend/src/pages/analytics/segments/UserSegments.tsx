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

import { Segment } from '@aws/clickstream-base-lib';
import {
  AppLayout,
  Button,
  ButtonDropdown,
  ContentLayout,
  Header,
  SpaceBetween,
  Table,
} from '@cloudscape-design/components';
import { getSegmentsList } from 'apis/segments';
import AnalyticsNavigation from 'components/layouts/AnalyticsNavigation';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import HelpInfo from 'components/layouts/HelpInfo';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { defaultStr } from 'ts/utils';

const renderName = (name: string) => {
  return (
    <div className="clickstream-link-style">
      <Link to="/">{name}</Link>
    </div>
  );
};

const UserSegments: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projectId, appId } = useParams();
  const [loadingData, setLoadingData] = useState(false);
  const [segmentList, setSegmentList] = useState<Segment[]>([]);

  const COLUMN_DEFINITIONS = [
    {
      id: 'name',
      header: 'Name',
      cell: (e: Segment) => {
        return renderName(e.name);
      },
    },
    {
      id: 'description',
      header: 'Description',
      cell: (e: Segment) => {
        return e.description;
      },
    },
    {
      id: 'refreshSchedule',
      header: 'Refresh Schedule',
      cell: (e: Segment) => {
        return e.refreshSchedule.cronExpression;
      },
    },
    {
      id: 'createAt',
      header: 'Create At',
      cell: (e: Segment) => {
        return e.createAt;
      },
    },
  ];

  const listAllSegments = async () => {
    if (projectId && appId) {
      setLoadingData(true);
      const segmentRes: ApiResponse<Segment[]> = await getSegmentsList({
        projectId,
        appId,
      });
      if (segmentRes.success) {
        setSegmentList(segmentRes.data);
      }
      setLoadingData(false);
    }
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
    if (projectId && appId) {
      listAllSegments();
    }
  }, [projectId, appId]);

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
                loading={loadingData}
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
                              text: defaultStr(t('button.duplicate')),
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
                            navigate(
                              `/analytics/${projectId}/app/${appId}/segments/add`
                            );
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
                items={segmentList}
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
