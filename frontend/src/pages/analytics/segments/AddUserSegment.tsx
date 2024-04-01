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
import { ExtendSegment } from 'components/eventselect/AnalyticsType';
import AnalyticsNavigation from 'components/layouts/AnalyticsNavigation';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import HelpInfo from 'components/layouts/HelpInfo';
import { SegmentProvider } from 'context/SegmentContext';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { INIT_SEGMENT_OBJ } from 'ts/const';
import { defaultStr } from 'ts/utils';
import SegmentEditor from './components/SegmentEditor';

const AddUserSegments: React.FC = () => {
  const { t } = useTranslation();
  const { projectId, appId } = useParams();
  const [segmentObject, setSegmentObject] = useState<ExtendSegment>({
    ...INIT_SEGMENT_OBJ,
    projectId: defaultStr(projectId),
    appId: defaultStr(appId),
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
