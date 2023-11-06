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
  Button,
  Container,
  Form,
  FormField,
  Grid,
  Header,
  Input,
  SpaceBetween,
  Tabs,
  Textarea,
} from '@cloudscape-design/components';
import { createApplication, getApplicationDetail } from 'apis/application';
import ConfigAndroidSDK from 'pages/application/detail/comp/ConfigAndroidSDK';
import ConfigIOSSDK from 'pages/application/detail/comp/ConfigIOSSDK';
import ConfigWebSDK from 'pages/application/detail/comp/ConfigWebSDK';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { MAX_USER_INPUT_LENGTH } from 'ts/const';
import { XSS_PATTERN } from 'ts/constant-ln';
import { defaultStr, validateAppId } from 'ts/utils';

const RegisterApp: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [appRegistered, setAppRegistered] = useState(false);
  const [application, setApplication] = useState<IApplication>({
    projectId: defaultStr(id),
    appId: '',
    name: '',
    description: '',
    androidPackage: '',
    iosBundleId: '',
    iosAppStoreId: '',
  });

  const [nameEmptyError, setNameEmptyError] = useState(false);
  const [appIdInvalidError, setAppIdInvalidError] = useState(false);

  const getApplicationDetailByAppId = async (appId: string) => {
    try {
      const { success, data }: ApiResponse<IApplication> =
        await getApplicationDetail({
          pid: defaultStr(id),
          id: defaultStr(appId),
        });
      if (success) {
        setApplication(data);
        setAppRegistered(true);
        setLoadingCreate(false);
      }
    } catch (error) {
      setLoadingCreate(false);
    }
  };

  const confirmCreateApplication = async () => {
    if (!application.name.trim()) {
      setNameEmptyError(true);
      return;
    }
    if (!validateAppId(application.appId)) {
      setAppIdInvalidError(true);
      return;
    }
    setLoadingCreate(true);
    try {
      const { success, data }: ApiResponse<ResponseCreate> =
        await createApplication(application);
      if (success && data.id) {
        getApplicationDetailByAppId(data.id);
      }
    } catch (error) {
      setLoadingCreate(false);
    }
  };

  return (
    <SpaceBetween direction="vertical" size="l">
      <Container
        header={
          <Header variant="h2">{t('application:sdkGuide.registerApp')}</Header>
        }
      >
        <div className="mt-10">
          <Form
            actions={
              !appRegistered && (
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
                    variant="primary"
                    onClick={() => {
                      confirmCreateApplication();
                    }}
                  >
                    {t('button.registerAndGenerate')}
                  </Button>
                </SpaceBetween>
              )
            }
          >
            <SpaceBetween direction="vertical" size="l">
              <FormField
                label={t('application:appName')}
                errorText={
                  nameEmptyError ? t('application:valid.nameEmpty') : ''
                }
              >
                <Input
                  readOnly={appRegistered}
                  placeholder="test-app-name"
                  value={application.name}
                  onChange={(e) => {
                    setNameEmptyError(false);
                    setAppIdInvalidError(false);
                    if (
                      new RegExp(XSS_PATTERN).test(e.detail.value) ||
                      e.detail.value.length > MAX_USER_INPUT_LENGTH
                    ) {
                      return false;
                    }
                    setApplication((prev) => {
                      return {
                        ...prev,
                        name: e.detail.value,
                        appId: `${e.detail.value?.replace(/[^\w]/g, '_')}`,
                      };
                    });
                  }}
                />
              </FormField>

              <FormField
                label={t('application:appID')}
                errorText={
                  appIdInvalidError ? t('application:valid.appIdInvalid') : ''
                }
              >
                <Input
                  readOnly={appRegistered}
                  placeholder="test_app_id"
                  value={application.appId}
                  onChange={(e) => {
                    setNameEmptyError(false);
                    setAppIdInvalidError(false);
                    if (
                      new RegExp(XSS_PATTERN).test(e.detail.value) ||
                      e.detail.value.length > MAX_USER_INPUT_LENGTH
                    ) {
                      return false;
                    }
                    setApplication((prev) => {
                      return {
                        ...prev,
                        appId: e.detail.value,
                      };
                    });
                  }}
                />
              </FormField>

              <FormField label={t('application:appDesc')}>
                <Textarea
                  readOnly={appRegistered}
                  placeholder={t('application:appDesc') || ''}
                  value={application.description}
                  onChange={(e) => {
                    if (
                      new RegExp(XSS_PATTERN).test(e.detail.value) ||
                      e.detail.value.length > MAX_USER_INPUT_LENGTH
                    ) {
                      return false;
                    }
                    setApplication((prev) => {
                      return {
                        ...prev,
                        description: e.detail.value,
                      };
                    });
                  }}
                />
              </FormField>

              <FormField label={t('application:appPackageName')}>
                <Grid gridDefinition={[{ colspan: 6 }, { colspan: 6 }]}>
                  <FormField
                    stretch
                    description={t('application:androidPackageName')}
                  >
                    <Input
                      readOnly={appRegistered}
                      placeholder="com.example.appname"
                      value={application.androidPackage}
                      onChange={(e) => {
                        if (
                          new RegExp(XSS_PATTERN).test(e.detail.value) ||
                          e.detail.value.length > MAX_USER_INPUT_LENGTH
                        ) {
                          return false;
                        }
                        setApplication((prev) => {
                          return {
                            ...prev,
                            androidPackage: e.detail.value,
                          };
                        });
                      }}
                    />
                  </FormField>
                  <FormField
                    stretch
                    description={t('application:iosAppBundleId')}
                  >
                    <Input
                      readOnly={appRegistered}
                      placeholder="com.example.App"
                      value={application.iosBundleId}
                      onChange={(e) => {
                        if (
                          new RegExp(XSS_PATTERN).test(e.detail.value) ||
                          e.detail.value.length > MAX_USER_INPUT_LENGTH
                        ) {
                          return false;
                        }
                        setApplication((prev) => {
                          return {
                            ...prev,
                            iosBundleId: e.detail.value,
                          };
                        });
                      }}
                    />
                  </FormField>
                </Grid>
              </FormField>
            </SpaceBetween>
          </Form>
        </div>
      </Container>
      {appRegistered && (
        <Container disableContentPaddings>
          <Tabs
            tabs={[
              {
                label: t('application:detail.android'),
                id: 'endpoint',
                content: (
                  <div className="pd-20">
                    <ConfigAndroidSDK appInfo={application} />
                  </div>
                ),
              },
              {
                label: t('application:detail.ios'),
                id: 'enrich',
                content: (
                  <div className="pd-20">
                    <ConfigIOSSDK appInfo={application} />
                  </div>
                ),
              },
              {
                label: t('application:detail.web'),
                id: 'web',
                content: (
                  <div className="pd-20">
                    <ConfigWebSDK appInfo={application} />
                  </div>
                ),
              },
            ]}
          />
          <div className="pd-20">
            <Header
              actions={
                <Button
                  onClick={() => {
                    navigate(`/project/detail/${id}`);
                  }}
                >
                  {t('button.complete')}
                </Button>
              }
            />
          </div>
        </Container>
      )}
    </SpaceBetween>
  );
};

export default RegisterApp;
