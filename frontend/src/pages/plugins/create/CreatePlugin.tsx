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
  Form,
  FormField,
  Header,
  Input,
  SpaceBetween,
  Textarea,
  Select,
  SelectProps,
} from '@cloudscape-design/components';
import { createPlugin } from 'apis/plugin';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PLUGIN_TYPE_LIST } from 'ts/const';

function Content() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [selectedType, setSelectedType] = useState<SelectProps.Option | null>(
    null
  );

  const [nameEmptypError, setNameEmptypError] = useState(false);
  const [typeEmptyError, setTypeEmptyError] = useState(false);
  const [mainFuncEmptyError, setMainFuncEmptyError] = useState(false);

  const [curPlugin, setCurPlugin] = useState<IPlugin>({
    name: '',
    description: '',
    pluginType: '',
    mainFunction: '',
    jarFile: '',
    dependencyFiles: [],
  });

  const validPluginInput = () => {
    if (!curPlugin.name.trim()) {
      setNameEmptypError(true);
      return false;
    }
    if (!curPlugin.pluginType.trim()) {
      setTypeEmptyError(true);
      return false;
    }
    if (!curPlugin.mainFunction.trim()) {
      setMainFuncEmptyError(true);
      return false;
    }
    return true;
  };

  const confirmCreatePlugin = async () => {
    if (!validPluginInput()) {
      return;
    }
    setLoadingCreate(true);
    try {
      const { success, data }: ApiResponse<ResponseCreate> = await createPlugin(
        curPlugin
      );
      if (success && data.id) {
        navigate(`/plugins`);
      }
      setLoadingCreate(false);
    } catch (error) {
      setLoadingCreate(false);
    }
  };

  return (
    <ContentLayout
      header={<Header variant="h1">{t('plugin:create.createPlugin')}</Header>}
    >
      <form onSubmit={(event) => event.preventDefault()}>
        <Form
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link">{t('button.cancel')}</Button>
              <Button
                variant="primary"
                loading={loadingCreate}
                onClick={() => {
                  confirmCreatePlugin();
                }}
              >
                {t('button.create')}
              </Button>
            </SpaceBetween>
          }
        >
          <Container
            header={
              <Header variant="h2">{t('plugin:create.pluginInfo')}</Header>
            }
          >
            <SpaceBetween direction="vertical" size="l">
              <FormField
                label={t('plugin:create.name')}
                description={t('plugin:create.nameDesc')}
                errorText={nameEmptypError ? t('plugin:valid.nameEmpty') : ''}
              >
                <Input
                  placeholder="my-plugin"
                  value={curPlugin.name}
                  onChange={(e) => {
                    setNameEmptypError(false);
                    setCurPlugin((prev) => {
                      return {
                        ...prev,
                        name: e.detail.value,
                      };
                    });
                  }}
                />
              </FormField>

              <FormField
                label={t('plugin:create.desc')}
                description={t('plugin:create.descDesc')}
              >
                <Textarea
                  placeholder={t('plugin:create.pluginDesc') || ''}
                  value={curPlugin.description}
                  onChange={(e) => {
                    setCurPlugin((prev) => {
                      return {
                        ...prev,
                        description: e.detail.value,
                      };
                    });
                  }}
                />
              </FormField>

              <FormField
                label={t('plugin:create.type')}
                description={t('plugin:create.typeDesc')}
                errorText={typeEmptyError ? t('plugin:valid.typeEmpty') : ''}
              >
                <Select
                  selectedOption={selectedType}
                  onChange={({ detail }) => {
                    setTypeEmptyError(false);
                    setSelectedType(detail.selectedOption);
                    setCurPlugin((prev) => {
                      return {
                        ...prev,
                        pluginType: detail.selectedOption.value || '',
                      };
                    });
                  }}
                  options={PLUGIN_TYPE_LIST}
                  selectedAriaLabel="Selected"
                />
              </FormField>

              <FormField
                label={t('plugin:create.uploadJar')}
                description={t('plugin:create.uploadJarDesc')}
              >
                <Button iconName="upload">{t('button.chooseFile')}</Button>
              </FormField>

              <FormField
                label={t('plugin:create.uploadFile')}
                description={t('plugin:create.uploadFileDesc')}
              >
                <Button iconName="upload">{t('button.chooseFile')}</Button>
              </FormField>

              <FormField
                label={t('plugin:create.mainFunc')}
                description={t('plugin:create.mainFuncDesc')}
                errorText={
                  mainFuncEmptyError ? t('plugin:valid.mainFuncEmpty') : ''
                }
              >
                <Input
                  placeholder="com.company.main"
                  value={curPlugin.mainFunction}
                  onChange={(e) => {
                    setMainFuncEmptyError(false);
                    setCurPlugin((prev) => {
                      return {
                        ...prev,
                        mainFunction: e.detail.value,
                      };
                    });
                  }}
                />
              </FormField>
            </SpaceBetween>
          </Container>
        </Form>
      </form>
    </ContentLayout>
  );
}

const CreatePlugin: React.FC = () => {
  const { t } = useTranslation();
  const breadcrumbItems = [
    {
      text: t('breadCrumb.name'),
      href: '/',
    },
    {
      text: t('breadCrumb.plugins'),
      href: '/plugins',
    },
    {
      text: t('breadCrumb.createPlugin'),
      href: '/',
    },
  ];
  return (
    <AppLayout
      content={<Content />}
      headerSelector="#header"
      breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
      navigation={<Navigation activeHref="/plugins" />}
    />
  );
};

export default CreatePlugin;
