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
} from '@cloudscape-design/components';
import { getApplicationDetail } from 'apis/application';
import { getSegmentById } from 'apis/segments';
import {
  ExtendSegment,
  IEventSegmentationObj,
} from 'components/eventselect/AnalyticsType';
import AnalyticsNavigation from 'components/layouts/AnalyticsNavigation';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import HelpInfo from 'components/layouts/HelpInfo';
import { SegmentProvider } from 'context/SegmentContext';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { DEFAULT_SEGMENT_GROUP_DATA, INIT_SEGMENT_OBJ } from 'ts/const';
import { defaultStr, ternary } from 'ts/utils';
import SegmentEditor from './components/SegmentEditor';

type AddUserSegmentsProps = {
  actionType: string;
};
const AddUserSegments: React.FC<AddUserSegmentsProps> = ({
  actionType,
}: AddUserSegmentsProps) => {
  const { t } = useTranslation();
  const { projectId, appId, segmentId } = useParams();
  const [segmentObject, setSegmentObject] = useState<ExtendSegment>({
    ...INIT_SEGMENT_OBJ,
    projectId: defaultStr(projectId),
    appId: defaultStr(appId),
  });
  const [segmentGroupData, setSegmentGroupData] =
    useState<IEventSegmentationObj>({ ...DEFAULT_SEGMENT_GROUP_DATA });
  const [timezone, setTimezone] = useState('');

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
      text: ternary(
        actionType === 'edit',
        t('breadCrumb.editSegment'),
        t('breadCrumb.createSegment')
      ),
      href: '',
    },
  ];

  useEffect(() => {
    const getSegmentObject = async () => {
      const segmentApiResponse = await getSegmentById({
        appId: appId as string,
        segmentId: segmentId as string,
      });
      if (segmentApiResponse.success) {
        const { id, type, segmentId } = segmentApiResponse.data;
        const { segmentObject, segmentDataState } =
          segmentApiResponse.data.uiRenderingObject;
        setSegmentObject({
          ...segmentObject,
          id,
          type,
          segmentId,
        });
        setSegmentGroupData(segmentDataState);
      }
    };

    // Get app details
    const getAppDetails = async () => {
      const appApiResponse = await getApplicationDetail({
        id: defaultStr(appId),
        pid: defaultStr(projectId),
      });
      if (appApiResponse.success) {
        const { timezone } = appApiResponse.data;
        setTimezone(timezone);
      }
    };

    getAppDetails();
    if (actionType === 'duplicate' || actionType === 'edit') {
      getSegmentObject();
    }
  }, []);

  return (
    <div className="flex">
      <AnalyticsNavigation
        activeHref={`/analytics/${projectId}/app/${appId}/segments`}
      />
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
                <SegmentEditor
                  segmentObject={segmentObject}
                  updateSegmentObject={(key, value) => {
                    setSegmentObject((prev) => {
                      return {
                        ...prev,
                        [key]: value,
                      };
                    });
                  }}
                  segmentGroupData={segmentGroupData}
                  actionType={actionType}
                  timezone={timezone}
                />
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
