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

import { GetProjectResponse, IProject } from '@aws/clickstream-base-lib';
import {
  AppLayout,
  ContentLayout,
  Header,
  SpaceBetween,
} from '@cloudscape-design/components';
import { getPipelineDetail } from 'apis/pipeline';
import { getProjectDetail } from 'apis/project';
import Loading from 'components/common/Loading';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { defaultStr } from 'ts/utils';
import NonePipeline from './comp/NonePipeline';
import ProjectPipeline from './comp/ProjectPipeline';

const ProjectDetail: React.FC = () => {
  const { t } = useTranslation();

  const { id } = useParams();

  const [loadingPipeline, setLoadingPipeline] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [projectPipeline, setProjectPipeline] = useState<IPipeline>();
  const [projectInfo, setProjectInfo] = useState<IProject>();

  const getPipelineByProjectId = async (projectId: string, refresh: string) => {
    setLoadingPipeline(true);
    const { success, data }: ApiResponse<IExtPipeline> =
      await getPipelineDetail({
        projectId: defaultStr(projectId),
        refresh,
      });
    if (success) {
      setProjectPipeline(data);
      setLoadingPipeline(false);
      setLoadingData(false);
    }
  };

  const getProjectDetailById = async (projectId: string) => {
    setLoadingData(true);
    try {
      const { success, data }: ApiResponse<GetProjectResponse> =
        await getProjectDetail({
          projectId,
        });
      if (success) {
        setProjectInfo(data);
        if (data?.pipelineId && data?.pipelineId !== '') {
          getPipelineByProjectId(projectId, 'false');
        } else {
          setLoadingPipeline(false);
          setLoadingData(false);
        }
      }
    } catch (error) {
      setLoadingData(false);
    }
  };

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
      text: defaultStr(projectInfo?.name),
      href: '/',
    },
  ];

  useEffect(() => {
    if (id) {
      getProjectDetailById(id);
    }
  }, [id]);

  const renderProjectDetail = () => {
    if (!projectPipeline?.projectId) {
      return <NonePipeline projectId={id?.toString()} />;
    } else {
      return (
        <ProjectPipeline
          loadingRefresh={loadingPipeline}
          reloadPipeline={(refresh: string) => {
            getPipelineByProjectId(defaultStr(id), refresh);
          }}
          pipelineInfo={projectPipeline}
        />
      );
    }
  };

  return (
    <AppLayout
      toolsHide
      content={
        <ContentLayout
          header={
            <SpaceBetween size="m">
              {projectInfo && <Header variant="h1">{projectInfo?.name}</Header>}
            </SpaceBetween>
          }
        >
          {loadingData ? <Loading /> : renderProjectDetail()}
        </ContentLayout>
      }
      headerSelector="#header"
      breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
      navigation={<Navigation activeHref="/projects" />}
    />
  );
};

export default ProjectDetail;
