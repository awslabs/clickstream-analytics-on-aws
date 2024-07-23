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
  Link,
  SpaceBetween,
  Table,
} from '@cloudscape-design/components';
import { getApplicationDetail } from 'apis/application';
import { deleteSegment, getSegmentsList } from 'apis/segments';
import AnalyticsNavigation from 'components/layouts/AnalyticsNavigation';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import HelpInfo from 'components/layouts/HelpInfo';
import { UserContext } from 'context/UserContext';
import moment from 'moment';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { TIME_FORMAT } from 'ts/const';
import {
  defaultStr,
  getUserInfoFromLocalStorage,
  isAnalystAuthorRole,
} from 'ts/utils';
import { convertCronToRefreshSchedule } from '../analytics-utils';

const UserSegments: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentUser = useContext(UserContext) ?? getUserInfoFromLocalStorage();
  const { projectId, appId } = useParams();
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

  const [loadingData, setLoadingData] = useState(false);
  const [segmentList, setSegmentList] = useState<Segment[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<Segment[]>([]);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [timezone, setTimezone] = useState('');

  const renderSegmentDetailsLink = (e: Segment) => {
    return (
      <Link
        href={`/analytics/${projectId}/app/${appId}/segments/${e.segmentId}/details`}
      >
        {e.name}
      </Link>
    );
  };

  const COLUMN_DEFINITIONS = [
    {
      id: 'name',
      header: t('analytics:segment.columnHeader.name'),
      cell: (e: Segment) => renderSegmentDetailsLink(e),
    },
    {
      id: 'description',
      header: t('analytics:segment.columnHeader.description'),
      cell: (e: Segment) => {
        return e.description;
      },
    },
    {
      id: 'refreshSchedule',
      header: t('analytics:segment.columnHeader.refreshSchedule'),
      cell: (e: Segment) => {
        return convertCronToRefreshSchedule(e, timezone);
      },
    },
    {
      id: 'createAt',
      header: t('analytics:segment.columnHeader.createAt'),
      cell: (e: Segment) => {
        return moment(e.createAt).format(TIME_FORMAT) || '-';
      },
    },
  ];

  const listAllSegments = async () => {
    if (projectId && appId) {
      try {
        setLoadingData(true);
        const segmentRes: ApiResponse<Segment[]> = await getSegmentsList({
          projectId,
          appId,
        });
        if (segmentRes.success) {
          setSegmentList(segmentRes.data);
        }
        setLoadingData(false);
      } catch (error) {
        setLoadingData(false);
      }
    }
  };

  const confirmDeleteSegments = async () => {
    if (projectId && appId) {
      try {
        setLoadingDelete(true);
        const segmentRes = await deleteSegment({
          segmentId: selectedSegment[0].segmentId,
          appId,
        });
        if (segmentRes.success) {
          listAllSegments();
        }
        setLoadingDelete(false);
        setSelectedSegment([]);
      } catch (error) {
        setLoadingDelete(false);
      }
    }
  };

  const getTimezoneInfo = async (projectId: string, appId: string) => {
    const appApiResponse = await getApplicationDetail({
      id: appId,
      pid: projectId,
    });
    if (appApiResponse.success) {
      const { timezone } = appApiResponse.data;
      setTimezone(timezone);
    }
  };

  useEffect(() => {
    if (projectId && appId) {
      listAllSegments();
      getTimezoneInfo(projectId, appId);
    }
  }, [projectId, appId]);

  return (
    <div className="flex">
      <AnalyticsNavigation
        activeHref={`/analytics/${projectId}/app/${appId}/segments`}
      />
      <div className="flex-1">
        <AppLayout
          headerVariant="high-contrast"
          tools={<HelpInfo />}
          navigationHide
          content={
            <ContentLayout
              headerVariant="high-contrast"
              header={<Header>{t('nav.analytics.segments')}</Header>}
            >
              <Table
                loading={loadingData}
                onSelectionChange={(e) => {
                  setSelectedSegment(e.detail.selectedItems);
                }}
                selectedItems={selectedSegment}
                selectionType="single"
                header={
                  <Header
                    variant="h2"
                    actions={
                      <SpaceBetween direction="horizontal" size="xs">
                        <ButtonDropdown
                          onItemClick={(e) => {
                            const hrefPath = `/analytics/${projectId}/app/${appId}/segments/${selectedSegment[0]?.segmentId}/`;

                            if (e.detail.id === 'delete') {
                              confirmDeleteSegments();
                            } else if (e.detail.id === 'duplicate') {
                              window.location.href = hrefPath + 'duplicate';
                            } else if (e.detail.id === 'edit') {
                              window.location.href = hrefPath + 'edit';
                            } else if (e.detail.id === 'detail') {
                              navigate(hrefPath + 'details');
                            }
                          }}
                          loading={loadingDelete}
                          items={[
                            {
                              text: defaultStr(t('button.viewDetails')),
                              id: 'detail',
                              disabled: selectedSegment.length === 0,
                            },
                            {
                              text: defaultStr(t('button.duplicate')),
                              id: 'duplicate',
                              disabled:
                                selectedSegment.length === 0 ||
                                selectedSegment[0].isImported ||
                                !isAnalystAuthorRole(currentUser?.roles),
                            },
                            {
                              text: defaultStr(t('button.edit')),
                              id: 'edit',
                              disabled:
                                selectedSegment.length === 0 ||
                                selectedSegment[0].isImported ||
                                !isAnalystAuthorRole(currentUser?.roles),
                            },
                            {
                              text: defaultStr(t('button.delete')),
                              id: 'delete',
                              disabled:
                                selectedSegment.length === 0 ||
                                !isAnalystAuthorRole(currentUser?.roles),
                            },
                          ]}
                        >
                          {t('button.actions')}
                        </ButtonDropdown>
                        {isAnalystAuthorRole(currentUser?.roles) && (
                          <>
                            <Button
                              onClick={() => {
                                navigate(
                                  `/analytics/${projectId}/app/${appId}/segments/import`
                                );
                              }}
                            >
                              {t('button.import')}
                            </Button>
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
                          </>
                        )}
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
