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
  ContentLayout,
  Form,
  Header,
  SpaceBetween,
} from '@cloudscape-design/components';
import { createSegment } from 'apis/segments';
import {
  ExtendSegment,
  IEventSegmentationObj,
} from 'components/eventselect/AnalyticsType';
import AnalyticsNavigation from 'components/layouts/AnalyticsNavigation';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import HelpInfo from 'components/layouts/HelpInfo';
import { SegmentProvider } from 'context/SegmentContext';
import { omit } from 'lodash';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DEFAULT_SEGMENT_GROUP_DATA,
  SEGMENT_AUTO_REFRESH_OPTIONS,
} from 'ts/const';
import { defaultStr } from 'ts/utils';
import SegmentEditor from './components/SegmentEditor';
import { convertUISegmentObjectToAPIObject } from '../analytics-utils';

const AddUserSegments: React.FC = () => {
  const { t } = useTranslation();
  const { projectId, appId } = useParams();
  const navigate = useNavigate();
  const [segmentObject, setSegmentObject] = useState<ExtendSegment>({
    segmentId: '',
    segmentType: 'User',
    name: '',
    description: '',
    projectId: defaultStr(projectId),
    appId: defaultStr(appId),
    createBy: '',
    createAt: 0,
    lastUpdateBy: '',
    lastUpdateAt: 0,
    refreshSchedule: {
      cron: 'Manual',
      cronExpression: '',
      expireAfter: 0,
    },
    criteria: {
      filterGroups: [],
      operator: 'and',
    },
    // extends fields
    refreshType: 'manual',
    autoRefreshOption: SEGMENT_AUTO_REFRESH_OPTIONS[0],
    autoRefreshDayOption: null,
    expireDate: '',
  });
  const [segmentDataState, setSegmentDataState] =
    useState<IEventSegmentationObj>({
      ...DEFAULT_SEGMENT_GROUP_DATA,
    });

  const breadcrumbItems = [
    {
      text: t('breadCrumb.name'),
      href: '/',
    },
    {
      text: t('breadCrumb.segments'),
      href: `/analytics/${projectId}/app/${appId}/segments`,
    },
    {
      text: t('breadCrumb.createSegment'),
      href: '',
    },
  ];

  const [loadingCreate, setLoadingCreate] = useState(false);

  const addUserSegments = async () => {
    try {
      console.info('addUserSegments');
      setLoadingCreate(true);
      await createSegment(
        omit(
          {
            ...segmentObject,
            criteria: convertUISegmentObjectToAPIObject(segmentDataState),
          },
          [
            'refreshType',
            'autoRefreshOption',
            'autoRefreshDayOption',
            'expireDate',
          ]
        )
      );
      setLoadingCreate(false);
      navigate(`/analytics/test_magic_project_gpvz/app/shopping/segments`);
    } catch (error) {
      console.info(error);
      setLoadingCreate(false);
    }
  };

  useEffect(() => {
    console.info('segmentObject:', segmentObject);
  }, [segmentObject]);

  return (
    <div className="flex">
      <AnalyticsNavigation activeHref={`/analytics/segments`} />
      <div className="flex-1">
        <AppLayout
          tools={<HelpInfo />}
          navigationHide
          content={
            <ContentLayout
              header={
                <Header description={t('analytics:segment.comp.desc')}>
                  {t('analytics:segment.comp.title')}
                </Header>
              }
            >
              <SegmentProvider>
                <Form
                  actions={
                    <SpaceBetween direction="horizontal" size="xs">
                      <Button
                        onClick={() => {
                          navigate(-1);
                        }}
                      >
                        {t('button.cancel')}
                      </Button>
                      <Button
                        loading={loadingCreate}
                        onClick={() => {
                          addUserSegments();
                        }}
                        variant="primary"
                      >
                        {t('button.save')}
                      </Button>
                    </SpaceBetween>
                  }
                >
                  <SegmentEditor
                    segmentObject={segmentObject}
                    updateSegmentState={setSegmentDataState}
                    updateSegmentObject={(key, value) => {
                      setSegmentObject((prev) => {
                        return {
                          ...prev,
                          [key]: value,
                        };
                      });
                    }}
                  />
                </Form>
              </SegmentProvider>
            </ContentLayout>
          }
          headerSelector="#header"
          breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
        />
      </div>
    </div>
  );
};
export default AddUserSegments;
