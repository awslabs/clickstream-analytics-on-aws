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
  XSS_PATTERN,
  CredentialsResponse,
  IPlugin,
  PluginType,
} from '@aws/clickstream-base-lib';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { XhrHttpHandler } from '@aws-sdk/xhr-http-handler';
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
import { getSTSUploadRole } from 'apis/resource';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import { AppContext } from 'context/AppContext';
import { cloneDeep } from 'lodash';
import moment from 'moment';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MAX_USER_INPUT_LENGTH, PLUGIN_TYPE_LIST } from 'ts/const';
import {
  alertMsg,
  validatePluginMainFunction,
  validatePluginName,
} from 'ts/utils';

function Content() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const appConfig = useContext(AppContext);
  const [loadingCreate, setLoadingCreate] = useState(false);

  const [jarFiles, setJarFiles] = React.useState<File[]>([]);
  const [dependenciesFiles, setDependenciesFiles] = useState<File[]>([]);
  const [nameEmptypError, setNameEmptypError] = useState(false);
  const [typeEmptyError, setTypeEmptyError] = useState(false);
  const [uploadJarEmptyError, setUploadJarEmptyError] = useState(false);
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
  const [dependenciesS3FileKeys, setDependenciesS3FileKeys] = useState<
    string[]
  >([]);

  const [s3Client, setS3Client] = useState<any>();
  const [curDescription, setCurDescription] = useState<string>('');
  const [curPlugin, setCurPlugin] = useState<IPlugin>({
    id: '',
    name: '',
    description: {
      'en-US': '',
      'zh-CN': '',
    },
    pluginType: PluginType.ENRICH,
    mainFunction: '',
    jarFile: '',
    dependencyFiles: [],
    builtIn: false,
    createAt: new Date().getTime(),
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
    return `s3://${appConfig?.solution_data_bucket}/${key}`;
  };

  const buildFileKey = (fileName: string) => {
    const [name, suffiex] = splitFileNameWithSuffix(fileName, '.');
    const fileKey = `${appConfig?.solution_plugin_prefix}${name}_${moment(
      new Date()
    ).format('YYYYMMDDHHmmss')}.${suffiex}`;
    return fileKey;
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
    if (!curPlugin.jarFile.trim()) {
      setUploadJarEmptyError(true);
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
        {
          name: curPlugin.name,
          description: curPlugin.description,
          pluginType: curPlugin.pluginType,
          mainFunction: curPlugin.mainFunction,
          jarFile: curPlugin.jarFile,
          dependencyFiles: dependenciesS3FileKeys,
        }
      );
      if (success && data.id) {
        navigate(`/plugins`);
      }
      setLoadingCreate(false);
    } catch (error) {
      setLoadingCreate(false);
    }
  };

  const initS3ClientWithSTS = async () => {
    const { success, data }: ApiResponse<CredentialsResponse> =
      await getSTSUploadRole();
    if (success && data) {
      const s3 = new S3Client({
        requestHandler: new XhrHttpHandler({}),
        apiVersion: '2006-03-01',
        region: appConfig?.solution_region,
        credentials: {
          accessKeyId: data.AccessKeyId,
          secretAccessKey: data.SecretAccessKey,
          sessionToken: data.SessionToken,
        },
      });
      setS3Client(s3);
    }
  };

  // auto refresh sts token
  useEffect(() => {
    const interval = window.setInterval(() => {
      initS3ClientWithSTS();
    }, 5 * 60 * 1000);
    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const uploadJarFile = async () => {
    setShowUploadJarSuccess(false);
    const Key = buildFileKey(jarFiles[0]?.name);
    try {
      const parallelUploads3 = new Upload({
        client: s3Client,
        params: {
          Bucket: appConfig?.solution_data_bucket,
          Key: Key,
          Body: jarFiles[0],
        },
        queueSize: 4,
        partSize: 1024 * 1024 * 5,
        leavePartsOnError: false,
      });

      parallelUploads3.on('httpUploadProgress', (progress: any) => {
        console.info('progress:', progress);
        setUploadJarProgress(
          Math.ceil((progress.loaded / progress.total) * 100)
        );
        if (Math.ceil((progress.loaded / progress.total) * 100) >= 100) {
          setUploadJarProgress(0);
          setShowUploadJarSuccess(true);
        }
      });
      const data: any = await parallelUploads3.done();
      if (data) {
        setCurPlugin((prev) => {
          return {
            ...prev,
            jarFile: buildS3Path(data.Key),
          };
        });
      }
    } catch (error) {
      alertMsg(t('upload.uploadFailed'), 'error');
      console.error(error);
    }
  };

  const uploadDependenciesFiles = async (readyToUploadFiles: File[]) => {
    setShowUploadDependenciesSuccess(false);
    (async () => {
      const results = await Promise.all(
        readyToUploadFiles.map(async (element) => {
          dependenciesUploadingArr.push({
            name: element.name,
            loaded: 0,
            total: 0,
            isUploaded: false,
          });
          const Key = buildFileKey(element?.name);

          const parallelUploads3 = new Upload({
            client: s3Client,
            params: {
              Bucket: appConfig?.solution_data_bucket,
              Key: Key,
              Body: element,
            },
            queueSize: 4,
            partSize: 1024 * 1024 * 5,
            leavePartsOnError: false,
          });

          parallelUploads3.on('httpUploadProgress', (progress: any) => {
            if (progress.loaded > 0 && progress.loaded === progress.total) {
              setUploadedDependencyFiles((prev) => {
                return [...prev, element];
              });
            }
            const tmpArr: any = cloneDeep(dependenciesUploadingArr);
            if (tmpArr) {
              tmpArr.find((item: any) => item.name === element.name).loaded =
                progress.loaded;
              tmpArr.find((item: any) => item.name === element.name).total =
                progress.total;
              setDependenciesUploadingArr(tmpArr);
            }
          });
          const result: any = await parallelUploads3.done();
          if (result.Key) {
            return result;
          }
        })
      );
      if (results && results.length > 0) {
        setDependenciesS3FileKeys((prev) => {
          return [
            ...prev,
            ...results.map((element) => buildS3Path(element.Key)),
          ];
        });
      }
      setUploadDependenciesProgress(0);
      setShowUploadDependenciesSuccess(true);
      setDependenciesUploadingArr([]);
    })();
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
      uploadDependenciesFiles(missingFiles);
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
    initS3ClientWithSTS();
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
                constraintText={t('plugin:valid.nameFormat')}
              >
                <Input
                  placeholder="my-plugin"
                  value={curPlugin.name}
                  onChange={({ detail }) => {
                    setNameEmptypError(false);
                    detail.value.length <= 128 &&
                      validatePluginName(detail.value) &&
                      setCurPlugin((prev) => {
                        return {
                          ...prev,
                          name: detail.value,
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
                  value={curDescription}
                  onChange={(e) => {
                    if (
                      new RegExp(XSS_PATTERN).test(e.detail.value) ||
                      e.detail.value.length > MAX_USER_INPUT_LENGTH
                    ) {
                      return false;
                    }
                    setCurPlugin((prev) => {
                      setCurDescription(e.detail.value);
                      return {
                        ...prev,
                        description: {
                          'en-US': e.detail.value,
                          'zh-CN': e.detail.value,
                        },
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
                        pluginType:
                          (detail.value as PluginType) || PluginType.ENRICH,
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
                errorText={
                  uploadJarEmptyError ? t('plugin:valid.uploadJarEmpty') : ''
                }
              >
                <div>
                  <FileUpload
                    accept=".jar"
                    onChange={({ detail }) => {
                      setUploadJarEmptyError(false);
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
                    showFileThumbnail={false}
                  />
                  {uploadJarProgress > 0 && !showUploadJarSuccess && (
                    <ProgressBar value={uploadJarProgress} />
                  )}
                  {showUploadJarSuccess && (
                    <StatusIndicator type="success">
                      {t('upload.uploadSuccess')}
                    </StatusIndicator>
                  )}
                </div>
              </FormField>

              <FormField
                label={t('plugin:create.uploadFile')}
                description={t('plugin:create.uploadFileDesc')}
              >
                <div>
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
                    showFileThumbnail={false}
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
                </div>
              </FormField>

              <FormField
                label={t('plugin:create.mainFunc')}
                description={t('plugin:create.mainFuncDesc')}
                errorText={
                  mainFuncEmptyError ? t('plugin:valid.mainFuncEmpty') : ''
                }
                constraintText={t('plugin:valid.functionNameFormat')}
              >
                <Input
                  placeholder="com.company.main"
                  value={curPlugin.mainFunction}
                  onChange={({ detail }) => {
                    setMainFuncEmptyError(false);
                    detail.value.length <= 128 &&
                      validatePluginMainFunction(detail.value) &&
                      setCurPlugin((prev) => {
                        return {
                          ...prev,
                          mainFunction: detail.value,
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
