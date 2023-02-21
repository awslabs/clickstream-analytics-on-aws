import {
  AppLayout,
  ContentLayout,
  Header,
  SpaceBetween,
} from '@cloudscape-design/components';
import { getPipelineByProject } from 'apis/pipeline';
import { getProjectDetail } from 'apis/project';
import InfoLink from 'components/common/InfoLink';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import Loading from 'pages/common/Loading';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import NonePipeline from './comp/NonePipeline';
import ProjectPipeline from './comp/ProjectPipeline';

function Content(props: any) {
  const { id } = useParams();

  const [loadingData, setLoadingData] = useState(true);
  const [projectPipeline, setProjectPipeline] = useState<IPipeline[]>([]);
  const [projectInfo, setProjectInfo] = useState<IProject>();

  const getPipelineByProjectId = async (projectId: string) => {
    setLoadingData(true);
    const { success, data }: ApiResponse<ResponseTableData<IPipeline>> =
      await getPipelineByProject({
        pid: projectId,
      });
    if (success) {
      setProjectPipeline(data.items);
      setLoadingData(false);
    }
  };

  const getProjectDetailById = async (projectId: string) => {
    setLoadingData(true);
    const { success, data }: ApiResponse<IProject> = await getProjectDetail(
      projectId
    );
    if (success) {
      setProjectInfo(data);
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (id) {
      getPipelineByProjectId(id);
      getProjectDetailById(id);
    }
  }, [id]);

  return (
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
      ) : projectPipeline.length <= 0 ? (
        <NonePipeline projectId={id?.toString()} />
      ) : (
        <ProjectPipeline />
      )}
    </ContentLayout>
  );
}

const ProjectDetail: React.FC = () => {
  const { t } = useTranslation();
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
      text: 'Project-demo',
      href: '/',
    },
  ];
  return (
    <AppLayout
      content={<Content />}
      headerSelector="#header"
      breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
      navigation={<Navigation activeHref="/projects" />}
    />
  );
};

export default ProjectDetail;
