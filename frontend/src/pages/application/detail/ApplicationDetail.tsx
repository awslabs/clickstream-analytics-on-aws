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
  Autosuggest,
  Box,
  Button,
  ColumnLayout,
  Container,
  ContentLayout,
  Header,
  Link,
  SpaceBetween,
  Tabs,
} from '@cloudscape-design/components';
import {
  getApplicationDetail,
  updateApplicationTimezone,
} from 'apis/application';
import { getProjectDetail } from 'apis/project';
import Loading from 'components/common/Loading';
import InfoTitle from 'components/common/title/InfoTitle';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import PipelineStatus from 'components/pipeline/PipelineStatus';
import moment from 'moment';
import DomainNameWithStatus from 'pages/common/DomainNameWithStatus';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { TIME_FORMAT } from 'ts/const';
import { defaultStr } from 'ts/utils';
import ConfigAndroidSDK from './comp/ConfigAndroidSDK';
import ConfigFlutterSDK from './comp/ConfigFlutterSDK';
import ConfigIOSSDK from './comp/ConfigIOSSDK';
import ConfigWebSDK from './comp/ConfigWebSDK';

const ApplicationDetail: React.FC = () => {
  const { t } = useTranslation();
  const { id, pid } = useParams();

  const [loadingData, setLoadingData] = useState(true);
  const [projectInfo, setProjectInfo] = useState<IProject>();
  const [applicationInfo, setApplicationInfo] = useState<IApplication>();
  const [isEditing, setIsEditing] = useState(false);
  const [timeZone, setTimeZone] = useState<string>('');

  const breadcrumbItems = [
    {
      text: t('breadCrumb.projects'),
      href: '/projects',
    },
    {
      text: defaultStr(projectInfo?.name),
      href: `/project/detail/${pid}`,
    },
    {
      text: defaultStr(applicationInfo?.name),
      href: '/',
    },
  ];

  const getProjectDetailById = async () => {
    setLoadingData(true);
    try {
      const { success, data }: ApiResponse<IProject> = await getProjectDetail({
        id: defaultStr(pid),
      });
      if (success) {
        setProjectInfo(data);
        setLoadingData(false);
      }
    } catch (error) {
      setLoadingData(false);
    }
  };

  const getApplicationDetailByAppId = async () => {
    setLoadingData(true);
    try {
      const { success, data }: ApiResponse<IApplication> =
        await getApplicationDetail({
          pid: defaultStr(pid),
          id: defaultStr(id),
        });
      if (success) {
        setApplicationInfo(data);
        setTimeZone(data.timezone);
        getProjectDetailById();
      }
    } catch (error) {
      setLoadingData(false);
    }
  };

  const updateTimezone = async () => {
    try {
      const { success }: ApiResponse<IApplication> =
        await updateApplicationTimezone({
          pid: defaultStr(pid),
          id: defaultStr(id),
          timezone: timeZone,
        });
      if (success) {
        setApplicationInfo({
          ...applicationInfo,
          timezone: timeZone,
        } as IApplication);
        setIsEditing(false);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getApplicationDetailByAppId();
  }, []);

  return (
    <AppLayout
      toolsHide
      content={
        <ContentLayout
          header={
            <SpaceBetween size="m">
              <Header variant="h1">{applicationInfo?.name}</Header>
            </SpaceBetween>
          }
        >
          {loadingData ? (
            <Loading />
          ) : (
            <SpaceBetween direction="vertical" size="l">
              <Container
                header={
                  <Header variant="h2">
                    {t('application:detail.basicInfo')}
                  </Header>
                }
              >
                <ColumnLayout columns={2} variant="text-grid">
                  <SpaceBetween direction="vertical" size="l">
                    <div>
                      <Box variant="awsui-key-label">
                        {t('application:appName')}
                      </Box>
                      <div>{applicationInfo?.name}</div>
                    </div>
                    <div>
                      <Box variant="awsui-key-label">
                        {t('application:appID')}
                      </Box>
                      <div>{applicationInfo?.appId}</div>
                    </div>
                    <div>
                      <Box variant="awsui-key-label">
                        {t('application:appDesc')}
                      </Box>
                      <div>{applicationInfo?.description}</div>
                    </div>
                    <div>
                      <Box variant="awsui-key-label">
                        {t('application:androidPackageName')}
                      </Box>
                      <div>{applicationInfo?.androidPackage}</div>
                    </div>
                    <div>
                      <Box variant="awsui-key-label">
                        {t('application:iosAppBundleId')}
                      </Box>
                      <div>{applicationInfo?.iosBundleId}</div>
                    </div>
                  </SpaceBetween>
                  <SpaceBetween direction="vertical" size="l">
                    <div>
                      <Box variant="awsui-key-label">
                        {t('application:appTimezone')}
                      </Box>
                      {!isEditing && (
                        <div className="flex align-center">
                          <div>{applicationInfo?.timezone}</div>
                          {!applicationInfo?.timezone.trim() && (
                            <Button
                              onClick={() => {
                                setIsEditing(true);
                              }}
                              variant="icon"
                              iconName="edit"
                            />
                          )}
                        </div>
                      )}
                      {isEditing && (
                        <div className="flex">
                          <div className="w-45p mr-5">
                            <Autosuggest
                              value={timeZone}
                              onChange={({ detail }) => {
                                setTimeZone(detail.value);
                              }}
                              options={moment.tz.names().flatMap((tz) => {
                                return {
                                  label: tz,
                                  value: tz,
                                };
                              })}
                              placeholder={defaultStr(
                                t('application:labels.timezonePlaceholder')
                              )}
                              empty={t('application:labels.empty')}
                            />
                          </div>

                          <div>
                            <SpaceBetween direction="horizontal" size="xs">
                              <Button
                                onClick={() => {
                                  setIsEditing(false);
                                }}
                              >
                                {t('button.cancel')}
                              </Button>
                              <Button
                                variant="primary"
                                onClick={() => {
                                  updateTimezone();
                                }}
                              >
                                {t('button.save')}
                              </Button>
                            </SpaceBetween>
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <Box variant="awsui-key-label">
                        {t('application:createdTime')}
                      </Box>
                      <div>
                        {moment(applicationInfo?.createAt).format(TIME_FORMAT)}
                      </div>
                    </div>
                  </SpaceBetween>
                </ColumnLayout>
              </Container>

              <Container
                header={
                  <Header variant="h2">
                    {t('application:detail.pipelineInfo')}
                  </Header>
                }
              >
                <ColumnLayout columns={2} variant="text-grid">
                  <SpaceBetween direction="vertical" size="l">
                    <div>
                      <Box variant="awsui-key-label">
                        {t('project:pipeline.pipeline')}
                      </Box>
                      <div>
                        <Link
                          external
                          externalIconAriaLabel="Opens in a new tab"
                          href={`/project/${pid}/pipeline/${applicationInfo?.pipeline?.id}`}
                        >
                          {applicationInfo?.pipeline?.id}
                        </Link>
                      </div>
                    </div>
                    <div>
                      <Box variant="awsui-key-label">
                        {t('project:pipeline.status')}
                      </Box>
                      <div>
                        <PipelineStatus
                          pipelineId={applicationInfo?.pipeline?.id}
                          projectId={pid}
                          status={applicationInfo?.pipeline?.status?.status}
                        />
                      </div>
                    </div>
                  </SpaceBetween>
                  <SpaceBetween direction="vertical" size="l">
                    <div>
                      <Box variant="awsui-key-label">
                        {t('pipeline:detail.domainName')}
                      </Box>
                      <DomainNameWithStatus
                        type="domain"
                        projectId={applicationInfo?.projectId}
                        pipelineId={applicationInfo?.pipeline?.id}
                        customDomain={applicationInfo?.pipeline?.customDomain}
                        fetch
                      />
                    </div>

                    <div>
                      <InfoTitle
                        title={t('pipeline:detail.dns')}
                        popoverDescription={t('pipeline:detail.dnsInfo')}
                      />
                      <DomainNameWithStatus
                        type="dns"
                        projectId={applicationInfo?.projectId}
                        pipelineId={applicationInfo?.pipeline?.id}
                        dns={applicationInfo?.pipeline?.dns}
                        fetch={false}
                      />
                    </div>

                    <div>
                      <InfoTitle
                        title={t('pipeline:detail.endpoint')}
                        popoverDescription={t('pipeline:detail.endpointInfo')}
                      />
                      <DomainNameWithStatus
                        type="endpoint"
                        projectId={applicationInfo?.projectId}
                        pipelineId={applicationInfo?.pipeline?.id}
                        endpoint={applicationInfo?.pipeline?.endpoint}
                        fetch
                      />
                    </div>
                  </SpaceBetween>
                </ColumnLayout>
              </Container>

              <Container
                disableContentPaddings
                header={
                  <Header variant="h2">
                    {t('application:detail.appIntegration')}
                  </Header>
                }
              >
                <Tabs
                  tabs={[
                    {
                      label: t('application:detail.android'),
                      id: 'android',
                      content: (
                        <div className="pd-20">
                          <ConfigAndroidSDK appInfo={applicationInfo} />
                        </div>
                      ),
                    },
                    {
                      label: t('application:detail.ios'),
                      id: 'ios',
                      content: (
                        <div className="pd-20">
                          <ConfigIOSSDK appInfo={applicationInfo} />
                        </div>
                      ),
                    },
                    {
                      label: t('application:detail.web'),
                      id: 'web',
                      content: (
                        <div className="pd-20">
                          <ConfigWebSDK appInfo={applicationInfo} />
                        </div>
                      ),
                    },
                    {
                      label: t('application:detail.flutter'),
                      id: 'flutter',
                      content: (
                        <div className="pd-20">
                          <ConfigFlutterSDK appInfo={applicationInfo} />
                        </div>
                      ),
                    },
                  ]}
                />
              </Container>
            </SpaceBetween>
          )}
        </ContentLayout>
      }
      headerSelector="#header"
      breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
      navigation={<Navigation activeHref="/pipelines" />}
    />
  );
};

export default ApplicationDetail;
