import {
  AppLayout,
  ContentLayout,
  Header,
  SpaceBetween,
} from '@cloudscape-design/components';
import { getPipelineByProject } from 'apis/pipeline';
import { getProjectDetail } from 'apis/project';
import InfoLink from 'components/common/InfoLink';
import Loading from 'components/common/Loading';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import NonePipeline from './comp/NonePipeline';
import ProjectPipeline from './comp/ProjectPipeline';

const ProjectDetail: React.FC = () => {
  const { t } = useTranslation();

  const { id } = useParams();

  const [loadingData, setLoadingData] = useState(true);
  const [projectPipeline, setProjectPipeline] = useState<IPipeline>();
  const [projectInfo, setProjectInfo] = useState<IProject>();

  const getPipelineByProjectId = async (projectId: string) => {
    setLoadingData(true);
    const { success, data }: ApiResponse<ResponseTableData<IPipeline>> =
      await getPipelineByProject({
        pid: projectId,
      });
    if (success) {
      if (data.items.length > 0) {
        setProjectPipeline(data.items[0]);
      }
      setLoadingData(false);
    }
  };

  const getProjectDetailById = async (projectId: string) => {
    setLoadingData(true);
    try {
      const { success, data }: ApiResponse<IProject> = await getProjectDetail(
        projectId
      );
      if (success) {
        setProjectInfo(data);
        setLoadingData(false);
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
      text: projectInfo?.name || '',
      href: '/',
    },
  ];

  useEffect(() => {
    if (id) {
      getPipelineByProjectId(id);
      getProjectDetailById(id);
    }
  }, [id]);

  return (
    <AppLayout
      content={
        <ContentLayout
          header={
            <SpaceBetween size="m">
              <Header variant="h1" info={<InfoLink />}>
                {projectInfo?.name}
              </Header>
            </SpaceBetween>
          }
        >
          {/* <NonePipeline />
        <ProjectPipeline /> */}
          {loadingData ? (
            <Loading />
          ) : !projectPipeline?.projectId ? (
            <NonePipeline projectId={id?.toString()} />
          ) : (
            <ProjectPipeline pipelineInfo={projectPipeline} />
          )}
        </ContentLayout>
      }
      headerSelector="#header"
      breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
      navigation={<Navigation activeHref="/projects" />}
    />
  );
};

export default ProjectDetail;
