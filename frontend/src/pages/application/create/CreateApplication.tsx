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
  SpaceBetween,
} from '@cloudscape-design/components';
import { getProjectDetail } from 'apis/project';
import Loading from 'components/common/Loading';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import RegisterApp from './comp/RegisterApp';

const CreateApplication = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [loadingData, setLoadingData] = useState(true);
  const [projectInfo, setProjectInfo] = useState<IProject>();
  const breadcrumbItems = [
    {
      text: t('breadCrumb.name'),
      href: '/',
    },
    {
      text: t('breadCrumb.projects'),
      href: '/projects',
    },
    {
      text: projectInfo?.name || '',
      href: `/project/detail/${id}`,
    },
    {
      text: t('breadCrumb.registerApp'),
      href: '/',
    },
  ];

  const getProjectDetailById = async (projectId: string) => {
    setLoadingData(true);
    try {
      const { success, data }: ApiResponse<IProject> = await getProjectDetail({
        id: projectId,
      });
      if (success) {
        setProjectInfo(data);
        setLoadingData(false);
      }
    } catch (error) {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (id) {
      getProjectDetailById(id);
    }
  }, [id]);

  return (
    <AppLayout
      toolsHide
      content={
        <ContentLayout
          header={
            <SpaceBetween size="m">
              <Header variant="h1">{projectInfo?.name}</Header>
            </SpaceBetween>
          }
        >
          {loadingData ? (
            <Loading />
          ) : (
            <SpaceBetween direction="vertical" size="l">
              <RegisterApp />
            </SpaceBetween>
          )}
        </ContentLayout>
      }
      headerSelector="#header"
      breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
      navigation={<Navigation activeHref="/projects" />}
    />
  );
};

export default CreateApplication;
