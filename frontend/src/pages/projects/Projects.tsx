import {
  AppLayout,
  Cards,
  Link,
  Pagination,
  StatusIndicator,
  TextFilter,
} from '@cloudscape-design/components';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { PROJECT_LIST, ProjectType } from 'ts/const';
import ProjectsHeader from './comps/ProjectsHeader';
import SplitPanelContent from './comps/SplitPanel';

const Content: React.FC = () => {
  const { t } = useTranslation();
  const CARD_DEFINITIONS = {
    header: (item: ProjectType) => (
      <div>
        <Link fontSize="heading-m" href={`/project/detail/${item.id}`}>
          {item.id}
        </Link>
      </div>
    ),
    sections: [
      {
        id: 'projectName',
        header: t('project:list.name'),
        content: (item: ProjectType) => item.name,
      },
      {
        id: 'projectId',
        header: t('project:list.id'),
        content: (item: ProjectType) => item.id,
      },
      {
        id: 'projectPlatform',
        header: t('project:list.platform'),
        content: (item: ProjectType) => item.platform,
      },

      {
        id: 'status',
        header: t('project:list.status'),
        content: (item: ProjectType) => (
          <StatusIndicator
            type={item.status === 'Deactivated' ? 'error' : 'success'}
          >
            {item.status}
          </StatusIndicator>
        ),
      },
    ],
  };
  return (
    <div className="pb-30">
      <Cards
        stickyHeader={false}
        cardDefinition={CARD_DEFINITIONS}
        loadingText={t('project:list.loading') || ''}
        items={PROJECT_LIST}
        selectionType="single"
        variant="full-page"
        header={<ProjectsHeader />}
        filter={
          <TextFilter
            filteringAriaLabel={t('project:list.filter') || ''}
            filteringPlaceholder={t('project:list.find') || ''}
            filteringText=""
          />
        }
        pagination={<Pagination currentPageIndex={1} pagesCount={5} />}
      />
    </div>
  );
};

const Projects: React.FC = () => {
  const { t } = useTranslation();
  const breadcrumbItems = [
    {
      text: t('breadCrumb.name'),
      href: '/',
    },
    {
      text: t('breadCrumb.projects'),
      href: '/',
    },
  ];
  return (
    <AppLayout
      content={<Content />}
      headerSelector="#header"
      breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
      navigation={<Navigation activeHref="/projects" />}
      splitPanel={<SplitPanelContent />}
    />
  );
};

export default Projects;
