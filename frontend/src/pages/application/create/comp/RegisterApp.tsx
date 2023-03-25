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
  Header,
  Input,
  SpaceBetween,
  Textarea,
} from '@cloudscape-design/components';
import { createApplication } from 'apis/application';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

const RegisterApp: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [application, setApplication] = useState<IApplication>({
    projectId: id ?? '',
    appId: '',
    name: '',
    description: '',
    androidPackage: '',
    iosBundleId: '',
    iosAppStoreId: '',
  });

  const [nameEmptyError, setNameEmptyError] = useState(false);

  const confirmCreateApplication = async () => {
    if (!application.name.trim()) {
      setNameEmptyError(true);
      return;
    }
    setLoadingCreate(true);
    try {
      const { success, data }: ApiResponse<ResponseCreate> =
        await createApplication(application);
      if (success && data.id) {
        navigate(`/project/${id}/application/detail/${data.id}`);
      }
      setLoadingCreate(false);
    } catch (error) {
      setLoadingCreate(false);
    }
  };

  return (
    <Container
      header={
        <Header variant="h2">{t('application:sdkGuide.registerApp')}</Header>
      }
    >
      <Form
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button>{t('button.cancel')}</Button>
            <Button
              loading={loadingCreate}
              variant="primary"
              onClick={() => {
                confirmCreateApplication();
              }}
            >
              {t('button.create')}
            </Button>
          </SpaceBetween>
        }
      >
        <SpaceBetween direction="vertical" size="l">
          <FormField
            label={t('application:appName')}
            errorText={nameEmptyError ? t('application:valid.nameEmpty') : ''}
          >
            <Input
              placeholder="test-app-name"
              value={application.name}
              onChange={(e) => {
                setNameEmptyError(false);
                setApplication((prev) => {
                  return {
                    ...prev,
                    name: e.detail.value,
                  };
                });
              }}
            />
          </FormField>
          <FormField label={t('application:appDesc')}>
            <Textarea
              placeholder={t('application:appDesc') || ''}
              value={application.description}
              onChange={(e) => {
                setApplication((prev) => {
                  return {
                    ...prev,
                    description: e.detail.value,
                  };
                });
              }}
            />
          </FormField>
          <FormField label={t('application:androidPackageName')}>
            <Input
              placeholder="com.company.appname"
              value={application.androidPackage}
              onChange={(e) => {
                setApplication((prev) => {
                  return {
                    ...prev,
                    androidPackage: e.detail.value,
                  };
                });
              }}
            />
          </FormField>
          <FormField label={t('application:iosAppBundleId')}>
            <Input
              placeholder="com.apple.AppStore"
              value={application.iosBundleId}
              onChange={(e) => {
                setApplication((prev) => {
                  return {
                    ...prev,
                    iosBundleId: e.detail.value,
                  };
                });
              }}
            />
          </FormField>
          <FormField label={t('application:iosAppStoreId')}>
            <Input
              type="number"
              placeholder="1234567890"
              value={application.iosAppStoreId}
              onChange={(e) => {
                setApplication((prev) => {
                  return {
                    ...prev,
                    iosAppStoreId: e.detail.value,
                  };
                });
              }}
            />
          </FormField>
        </SpaceBetween>
      </Form>
    </Container>
  );
};

export default RegisterApp;
