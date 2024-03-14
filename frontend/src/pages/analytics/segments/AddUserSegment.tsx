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
  DatePicker,
  Form,
  FormField,
  Header,
  Input,
  RadioGroup,
  Select,
  SpaceBetween,
} from '@cloudscape-design/components';
import AnalyticsNavigation from 'components/layouts/AnalyticsNavigation';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import HelpInfo from 'components/layouts/HelpInfo';
import { SegmentProvider } from 'context/SegmentContext';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { defaultStr } from 'ts/utils';
import SegmentEditor from './components/SegmentEditor';

const AddUserSegments: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const breadcrumbItems = [
    {
      text: t('breadCrumb.name'),
      href: '/',
    },
    {
      text: t('breadCrumb.users'),
      href: '/user',
    },
    {
      text: t('breadCrumb.users'),
      href: '/add',
    },
  ];

  return (
    <div className="flex">
      <AnalyticsNavigation activeHref={`/analytics/segments`} />
      <div className="flex-1">
        <AppLayout
          // toolsHide
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
                    <Button variant="primary">{t('button.save')}</Button>
                  </SpaceBetween>
                }
              >
                <SpaceBetween direction="vertical" size="l">
                  <Container
                    header={
                      <Header>
                        {t('analytics:segment.comp.userSegmentSettings')}
                      </Header>
                    }
                  >
                    <SpaceBetween direction="vertical" size="m">
                      <FormField
                        label={t('analytics:segment.comp.segmentName')}
                        description={t(
                          'analytics:segment.comp.segmentNameDesc'
                        )}
                      >
                        <Input
                          value=""
                          placeholder={defaultStr(
                            t('analytics:segment.comp.segmentNamePlaceholder')
                          )}
                        />
                      </FormField>
                      <FormField
                        label={t('analytics:segment.comp.segmentDescription')}
                        description={t(
                          'analytics:segment.comp.segmentDescriptionDesc'
                        )}
                      >
                        <Input
                          value=""
                          placeholder={defaultStr(
                            t(
                              'analytics:segment.comp.segmentDescriptionPlaceholder'
                            )
                          )}
                        />
                      </FormField>
                      <FormField
                        label={t('analytics:segment.comp.refreshMethod')}
                        description={t(
                          'analytics:segment.comp.refreshMethodDesc'
                        )}
                      >
                        <RadioGroup
                          onChange={({ detail }) => {
                            console.log(detail);
                          }}
                          value="manual"
                          items={[
                            {
                              value: 'manual',
                              label: t(
                                'analytics:segment.comp.refreshMethodManual'
                              ),
                            },
                            {
                              value: 'auto',
                              label: t(
                                'analytics:segment.comp.refreshMethodAuto'
                              ),
                            },
                          ]}
                        />
                        <div className="mt-10">
                          <SpaceBetween direction="horizontal" size="xs">
                            <Select
                              selectedOption={{ label: 'Daily', value: 'DAY' }}
                              options={[
                                { label: 'Daily', value: 'DAY' },
                                { label: 'Monthly', value: 'MONTH' },
                                { label: 'Custom(Cron)', value: 'CRON' },
                              ]}
                            />
                            <Select
                              selectedOption={{ label: '8PM', value: '20' }}
                              options={[
                                { label: '1AM', value: '1' },
                                { label: '12AM', value: '0' },
                                { label: '8PM', value: '20' },
                              ]}
                            />
                          </SpaceBetween>
                        </div>
                      </FormField>

                      <FormField
                        label={t('analytics:segment.comp.expirationSettings')}
                        description={t(
                          'analytics:segment.comp.expirationSettingsDesc'
                        )}
                      >
                        <DatePicker value={''} placeholder="YYYY/MM/DD" />
                      </FormField>
                    </SpaceBetween>
                  </Container>

                  <Container
                    header={
                      <Header
                        description={t(
                          'analytics:segment.comp.filterGroupDesc'
                        )}
                      >
                        {t('analytics:segment.comp.filterGroup')}
                      </Header>
                    }
                  >
                    <div style={{ paddingBottom: 300 }}>
                      <SegmentProvider>
                        <SegmentEditor />
                      </SegmentProvider>
                    </div>
                  </Container>
                </SpaceBetween>
              </Form>
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
