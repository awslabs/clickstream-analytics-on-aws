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
  Container,
  ContentLayout,
  Form,
  FormField,
  Header,
  Input,
  SpaceBetween,
} from '@cloudscape-design/components';
import { importSegment } from 'apis/segments';
import AnalyticsNavigation from 'components/layouts/AnalyticsNavigation';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import HelpInfo from 'components/layouts/HelpInfo';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { defaultStr } from 'ts/utils';
import { INIT_SEGMENT_OBJ } from '../../../ts/const';

const ImportUserSegment: React.FC = () => {
  const { t } = useTranslation();
  const { projectId, appId } = useParams();
  const navigate = useNavigate();
  const [segmentName, setSegmentName] = useState<string>('');
  const [segmentNameError, setSegmentNameError] = useState<string>('');
  const [segmentDesc, setSegmentDesc] = useState<string>('');
  const [loadingCreate, setLoadingCreate] = useState<boolean>(false);

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
      text: t('breadCrumb.importSegment'),
      href: '',
    },
  ];

  const saveUserSegment = async () => {
    if (!segmentName.trim()) {
      setSegmentNameError(defaultStr(t('analytics:segment.valid.nameEmptyError')));
      return;
    }

    try {
      setLoadingCreate(true);
      const request: Segment = {
        ...INIT_SEGMENT_OBJ,
        name: segmentName,
        description: segmentDesc,
        projectId: defaultStr(projectId),
        appId: defaultStr(appId),
        isImported: true,
      };
      await importSegment(request);
      navigate(`/analytics/${projectId}/app/${appId}/segments`);
    } catch (error) {
      console.info(error);
    } finally {
      setLoadingCreate(false);
    }
  };

  return (
    <div className="flex">
      <AnalyticsNavigation
        activeHref={`/analytics/${projectId}/app/${appId}/segments`}
      />
      <div className="flex-1">
        <AppLayout
          headerVariant="high-contrast"
          tools={<HelpInfo/>}
          navigationHide
          content={
            <ContentLayout
              headerVariant="high-contrast"
              header={
                <Header description={t('analytics:segment.comp.importSegmentDesc')}>
                  {t('analytics:segment.comp.importSegmentTitle')}
                </Header>
              }
            >
              <Form
                actions={
                  <SpaceBetween direction="horizontal" size="xs">
                    <Button
                      onClick={() => {
                        navigate(`/analytics/${projectId}/app/${appId}/segments`);
                      }}
                    >
                      {t('button.cancel')}
                    </Button>
                    <Button
                      loading={loadingCreate}
                      onClick={() => {
                        saveUserSegment();
                      }}
                      variant="primary"
                    >
                      {t('button.save')}
                    </Button>
                  </SpaceBetween>
                }
              >
                <Container
                  header={
                    <Header>{t('analytics:segment.comp.userSegmentSettings')}</Header>
                  }
                >
                  <SpaceBetween direction="vertical" size="m">
                    <FormField
                      label={t('analytics:segment.comp.segmentName')}
                      description={t('analytics:segment.comp.segmentNameDesc')}
                      errorText={t(defaultStr(segmentNameError))}
                    >
                      <Input
                        value={segmentName}
                        placeholder={defaultStr(
                          t('analytics:segment.comp.segmentNamePlaceholder'),
                        )}
                        onChange={(e) => {
                          setSegmentName(e.detail.value);
                          setSegmentNameError('');
                        }}
                      />
                    </FormField>
                    <FormField
                      label={t('analytics:segment.comp.segmentDescription')}
                      description={t('analytics:segment.comp.segmentDescriptionDesc')}
                    >
                      <Input
                        value={segmentDesc}
                        placeholder={defaultStr(
                          t('analytics:segment.comp.segmentDescriptionPlaceholder'),
                        )}
                        onChange={(e) => {
                          setSegmentDesc(e.detail.value);
                        }}
                      />
                    </FormField>
                  </SpaceBetween>
                </Container>
              </Form>
            </ContentLayout>
          }
          headerSelector="#header"
          breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems}/>}
        />
      </div>
    </div>
  );
};

export default ImportUserSegment;
