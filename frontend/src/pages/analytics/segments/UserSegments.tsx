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
import moment from 'moment';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { TIME_FORMAT } from 'ts/const';

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
      header: t('user:labels.tableColumnUserId'),
      cell: (e: UserSegmentItem) => {
        return e.id;
      },
    },
    {
      id: 'name',
      header: t('user:labels.tableColumnName'),
      cell: (e: UserSegmentItem) => {
        return e.name;
      },
    },
    {
      id: 'roles',
      header: t('user:labels.tableColumnRole'),
      minWidth: 240,
      cell: (e: UserSegmentItem) => {
        return e.desc;
      },
    },
    {
      id: 'createAt',
      header: t('user:labels.tableColumnCreateAt'),
      cell: (e: UserSegmentItem) => {
        return moment(e.createAt).format(TIME_FORMAT) || '-';
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
      text: t('breadCrumb.users'),
      href: '/user',
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
            <ContentLayout header={<Header>A</Header>}>
              <Table
                header={
                  <Header
                    variant="h2"
                    actions={
                      <SpaceBetween direction="horizontal" size="xs">
                        <ButtonDropdown
                          items={[
                            {
                              text: 'View Details',
                              id: 'detail',
                              disabled: false,
                            },
                            { text: 'Edit', id: 'edit', disabled: false },
                            { text: 'Delete', id: 'delete', disabled: true },
                          ]}
                        >
                          Actions
                        </ButtonDropdown>
                        <Button
                          iconAlign="right"
                          iconName="add-plus"
                          variant="primary"
                          onClick={() => {
                            navigate('/analytics/segments/add');
                          }}
                        >
                          Create Segment
                        </Button>
                      </SpaceBetween>
                    }
                    description="User Segments description"
                  >
                    User Segments
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
