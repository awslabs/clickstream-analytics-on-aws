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
  FileUpload,
  Form,
  FormField,
  Header,
  Input,
  ProgressBar,
  RadioGroup,
  SpaceBetween,
  StatusIndicator,
  Textarea,
} from '@cloudscape-design/components';
import { createPlugin } from 'apis/plugin';
import { Auth, Storage } from 'aws-amplify';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import { AppContext } from 'context/AppContext';
import { result } from 'lodash';
import moment from 'moment';
import { User } from 'oidc-client-ts';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PLUGIN_TYPE_LIST, PROJECT_CONFIG_JSON } from 'ts/const';
import { alertMsg } from 'ts/utils';

function getUser() {
  const configJSONObj: ConfigType = localStorage.getItem(PROJECT_CONFIG_JSON)
    ? JSON.parse(localStorage.getItem(PROJECT_CONFIG_JSON) || '')
    : {};
  const oidcStorage = localStorage.getItem(
    `oidc.user:${configJSONObj.oidc_provider}:${configJSONObj.oidc_client_id}`
  );
  if (!oidcStorage) {
    return null;
  }
  return User.fromStorageString(oidcStorage);
}

function Content() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const appConfig = useContext(AppContext);
  const [loadingCreate, setLoadingCreate] = useState(false);

  const [jarFiles, setJarFiles] = React.useState<File[]>([]);
  const [dependenciesFiles, setDependenciesFiles] = useState<File[]>([]);
  const [nameEmptypError, setNameEmptypError] = useState(false);
  const [typeEmptyError, setTypeEmptyError] = useState(false);
  const [mainFuncEmptyError, setMainFuncEmptyError] = useState(false);
  const [uploadJarProgress, setUploadJarProgress] = useState(0);
  const [uploadDependenciesProgress, setUploadDependenciesProgress] =
    useState(0);
  const [showUploadJarSuccess, setShowUploadJarSuccess] = useState(false);
  const [showUploadDependenciesSuccess, setShowUploadDependenciesSuccess] =
    useState(false);
  const [dependenciesUploadingArr, setDependenciesUploadingArr] = useState<
    IPluginFile[]
  >([]);
  const [uploadedDependencyFiles, setUploadedDependencyFiles] = useState<
    File[]
  >([]);
  const [dependeciesS3FileKeys, setdependeciesS3FileKeys] = useState<string[]>(
    []
  );

  const [curPlugin, setCurPlugin] = useState<IPlugin>({
    name: '',
    description: '',
    pluginType: '',
    mainFunction: '',
    jarFile: '',
    dependencyFiles: [],
  });

  const splitFileNameWithSuffix = (str: string, substring: string) => {
    const lastIndex = str.lastIndexOf(substring);
    const before = str.slice(0, lastIndex);
    const after = str.slice(lastIndex + 1);
    return [before, after];
  };

  const areFilesEqual = (file1: File, file2: File) => {
    return (
      file1.name === file2.name &&
      file1.size === file2.size &&
      file1.type === file2.type &&
      file1.lastModified === file2.lastModified
    );
  };

  const getMissingFiles = (files: File[], reference: File[]) => {
    return files.filter(
      (file) => !reference.some((ref) => areFilesEqual(file, ref))
    );
  };

  const buildS3Path = (key: string) => {
    return `s3://${appConfig?.solution_data_bucket}/${appConfig?.solution_plugin_prefix}${key}`;
  };

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
    curPlugin.dependencyFiles = dependeciesS3FileKeys;
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

  const signInIdpWithOIDCAuthentication = async () => {
    const user = getUser();
    const idToken = user?.id_token || '';
    await Auth.federatedSignIn(
      appConfig?.oidc_provider?.split('//')?.[1] || '',
      {
        token: idToken,
        expires_at: user?.expires_at || new Date().getTime() + 10 * 60 * 1000,
      },
      {
        name: user?.profile.email || '',
      }
    )
      .then(() => {
        // If success, you will get the AWS credentials
        return Auth.currentAuthenticatedUser();
      })
      .catch((e) => {
        console.error(e);
      });
  };

  const uploadJarFile = async () => {
    setShowUploadJarSuccess(false);
    try {
      const [name, suffiex] = splitFileNameWithSuffix(jarFiles[0]?.name, '.');
      const uploadRes = await Storage.put(
        `${name}_${moment(new Date()).format('YYYYMMDDHHmmss')}.${suffiex}`,
        jarFiles[0],
        {
          level: 'public',
          customPrefix: {
            public: appConfig?.solution_plugin_prefix,
          },
          progressCallback(progress) {
            setUploadJarProgress(
              Math.ceil((progress.loaded / progress.total) * 100)
            );
            if (Math.ceil((progress.loaded / progress.total) * 100) >= 100) {
              setUploadJarProgress(0);
              setShowUploadJarSuccess(true);
            }
          },
        }
      );
      setCurPlugin((prev) => {
        return {
          ...prev,
          jarFile: buildS3Path(uploadRes.key),
        };
      });
    } catch (error) {
      alertMsg(t('upload.uploadFailed'), 'error');
      console.error(error);
    }
  };

  const uploadDependeciesFiles = async (readyToUploadFiles: File[]) => {
    setShowUploadDependenciesSuccess(false);
    try {
      (async () => {
        const results = await Promise.all(
          readyToUploadFiles.map(async (element) => {
            dependenciesUploadingArr.push({
              name: element.name,
              loaded: 0,
              total: 0,
              isUploaded: false,
            });
            const [name, suffiex] = splitFileNameWithSuffix(element?.name, '.');
            const result = await Storage.put(
              `${name}_${moment(new Date()).format(
                'YYYYMMDDHHmmss'
              )}.${suffiex}`,
              element,
              {
                level: 'public',
                customPrefix: {
                  public: appConfig?.solution_plugin_prefix,
                },
                progressCallback(progress) {
                  if (
                    progress.loaded > 0 &&
                    progress.loaded === progress.total
                  ) {
                    setUploadedDependencyFiles((prev) => {
                      return [...prev, element];
                    });
                  }
                  const tmpArr: any = JSON.parse(
                    JSON.stringify(dependenciesUploadingArr)
                  );
                  if (tmpArr) {
                    tmpArr.find(
                      (item: any) => item.name === element.name
                    ).loaded = progress.loaded;
                    tmpArr.find(
                      (item: any) => item.name === element.name
                    ).total = progress.total;
                    setDependenciesUploadingArr(tmpArr);
                  }
                },
              }
            );
            return result;
          })
        );
        if (results && result.length > 0) {
          setdependeciesS3FileKeys((prev) => {
            return [
              ...prev,
              ...results.map((element) => buildS3Path(element.key)),
            ];
          });
        }
        setUploadDependenciesProgress(0);
        setShowUploadDependenciesSuccess(true);
        setDependenciesUploadingArr([]);
      })();
    } catch (error) {
      alertMsg(t('upload.uploadFailed'), 'error');
      console.error(error);
    }
  };

  useEffect(() => {
    if (jarFiles && jarFiles.length > 0) {
      uploadJarFile();
    } else {
      setShowUploadJarSuccess(false);
    }
  }, [jarFiles]);

  useEffect(() => {
    setShowUploadDependenciesSuccess(false);
    if (dependenciesFiles && dependenciesFiles.length > 0) {
      const missingFiles = getMissingFiles(
        dependenciesFiles,
        uploadedDependencyFiles
      );
      uploadDependeciesFiles(missingFiles);
    }
  }, [dependenciesFiles]);

  useEffect(() => {
    const loaded = dependenciesUploadingArr.reduce(
      (acc, curr) => acc + curr.loaded,
      0
    );
    const total = dependenciesUploadingArr.reduce(
      (acc, curr) => acc + curr.total,
      0
    );
    if (total && total > loaded) {
      setUploadDependenciesProgress(Math.ceil((loaded / total) * 100));
    }
  }, [dependenciesUploadingArr]);

  useEffect(() => {
    signInIdpWithOIDCAuthentication();
  }, []);

  return (
    <ContentLayout
      header={<Header variant="h1">{t('plugin:create.createPlugin')}</Header>}
    >
      <form onSubmit={(event) => event.preventDefault()}>
        <Form
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                variant="link"
                onClick={() => {
                  navigate(-1);
                }}
              >
                {t('button.cancel')}
              </Button>
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
                errorText={typeEmptyError ? t('plugin:valid.typeEmpty') : ''}
              >
                <RadioGroup
                  onChange={({ detail }) => {
                    setTypeEmptyError(false);
                    setCurPlugin((prev) => {
                      return {
                        ...prev,
                        pluginType: detail.value || '',
                      };
                    });
                  }}
                  value={curPlugin.pluginType}
                  items={PLUGIN_TYPE_LIST}
                />
              </FormField>

              <FormField
                label={t('plugin:create.uploadJar')}
                description={t('plugin:create.uploadJarDesc')}
              >
                <>
                  <FileUpload
                    onChange={({ detail }) => {
                      setJarFiles(detail.value);
                    }}
                    value={jarFiles}
                    i18nStrings={{
                      uploadButtonText: (e) =>
                        e ? t('button.chooseFiles') : t('button.chooseFile'),
                      dropzoneText: (e) =>
                        e
                          ? t('upload.dropFilesToUpload')
                          : t('upload.dropFileToUpload'),
                      removeFileAriaLabel: (e) =>
                        `${t('upload.removeFile')} ${e + 1}`,
                      limitShowFewer: t('upload.limitShowFewer'),
                      limitShowMore: t('upload.limitShowMore'),
                      errorIconAriaLabel: t('upload.errorIconAriaLabel'),
                    }}
                    showFileLastModified
                    showFileSize
                    showFileThumbnail
                  />
                  {uploadJarProgress > 0 && !showUploadJarSuccess && (
                    <ProgressBar value={uploadJarProgress} />
                  )}
                  {showUploadJarSuccess && (
                    <StatusIndicator type="success">
                      {t('upload.uploadSuccess')}
                    </StatusIndicator>
                  )}
                </>
              </FormField>

              <FormField
                label={t('plugin:create.uploadFile')}
                description={t('plugin:create.uploadFileDesc')}
              >
                <>
                  <FileUpload
                    onChange={({ detail }) => {
                      setDependenciesFiles(detail.value);
                    }}
                    value={dependenciesFiles}
                    i18nStrings={{
                      uploadButtonText: (e) =>
                        e ? t('button.chooseFiles') : t('button.chooseFile'),
                      dropzoneText: (e) =>
                        e
                          ? t('upload.dropFilesToUpload')
                          : t('upload.dropFileToUpload'),
                      removeFileAriaLabel: (e) =>
                        `${t('upload.removeFile')} ${e + 1}`,
                      limitShowFewer: t('upload.limitShowFewer'),
                      limitShowMore: t('upload.limitShowMore'),
                      errorIconAriaLabel: t('upload.errorIconAriaLabel'),
                    }}
                    multiple
                    showFileLastModified
                    showFileSize
                    showFileThumbnail
                  />
                  {uploadDependenciesProgress > 0 &&
                    !showUploadDependenciesSuccess && (
                      <ProgressBar value={uploadDependenciesProgress} />
                    )}
                  {showUploadDependenciesSuccess && (
                    <StatusIndicator type="success">
                      {t('upload.uploadSuccess')}
                    </StatusIndicator>
                  )}
                </>
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
