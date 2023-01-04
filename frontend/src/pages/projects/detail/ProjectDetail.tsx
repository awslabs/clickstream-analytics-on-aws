import {
  AppLayout,
  ContentLayout,
  Header,
  SpaceBetween,
} from '@cloudscape-design/components';
import InfoLink from 'components/common/InfoLink';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import NonePipeline from './comp/NonePipeline';
import ProjectPipeline from './comp/ProjectPipeline';

function Content(props: any) {
  const { id } = useParams();
  return (
    <ContentLayout
      header={
        <SpaceBetween size="m">
          <Header variant="h1" info={<InfoLink />}>
            Project-demo
          </Header>
        </SpaceBetween>
      }
    >
      {id === 'new' ? <NonePipeline /> : <ProjectPipeline />}
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
