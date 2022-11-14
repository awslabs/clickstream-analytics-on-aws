import {
  AppLayout,
  BreadcrumbGroup,
  Cards,
  CollectionPreferences,
  Link,
  Pagination,
  StatusIndicator,
  TextFilter,
} from '@cloudscape-design/components';
import Navigation from 'components/layouts/Navigation';
import React from 'react';
import ProjectsHeader from './comps/ProjectsHeader';
import SplitPanelContent from './comps/SplitPanel';

export interface ProjectType {
  name: string;
  id: string;
  platform: string;
  status: string;
}

const PROJECT_LIST: ProjectType[] = [
  {
    name: 'Project A',
    id: 'Project-01',
    platform: 'Web',
    status: 'Active',
  },
  {
    name: 'Project A',
    id: 'Project-02',
    platform: 'iOS',
    status: 'Deactivated',
  },
  {
    name: 'Project A',
    id: 'Project-03',
    platform: 'Web',
    status: 'Active',
  },
  {
    name: 'Project A',
    id: 'Project-04',
    platform: 'Android',
    status: 'Active',
  },
  {
    name: 'Project A',
    id: 'Project-05',
    platform: 'iOS',
    status: 'Active',
  },
  {
    name: 'Project A',
    id: 'Project-06',
    platform: 'Web',
    status: 'Deactivated',
  },
  {
    name: 'Project A',
    id: 'Project-07',
    platform: 'Android',
    status: 'Active',
  },
  {
    name: 'Project A',
    id: 'Project-08',
    platform: 'Web',
    status: 'Active',
  },
  {
    name: 'Project A',
    id: 'Project-09',
    platform: 'Web',
    status: 'Active',
  },
];

function Breadcrumbs() {
  const breadcrumbItems = [
    {
      text: 'Clickstream Analytics',
      href: '/',
    },
    {
      text: 'Projects',
      href: '/',
    },
  ];
  return (
    <BreadcrumbGroup
      items={breadcrumbItems}
      expandAriaLabel="Show path"
      ariaLabel="Breadcrumbs"
    />
  );
}

export const CARD_DEFINITIONS = {
  header: (item: ProjectType) => (
    <div>
      <Link fontSize="heading-m" href="#">
        {item.id}
      </Link>
    </div>
  ),
  sections: [
    {
      id: 'projectName',
      header: 'Project Name',
      content: (item: ProjectType) => item.name,
    },
    {
      id: 'projectId',
      header: 'Project ID',
      content: (item: ProjectType) => item.id,
    },
    {
      id: 'projectPlatform',
      header: 'Project Platform',
      content: (item: ProjectType) => item.platform,
    },

    {
      id: 'status',
      header: 'Status',
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

function Content(props: any) {
  return (
    <div className="pb-30">
      <Cards
        stickyHeader={false}
        cardDefinition={CARD_DEFINITIONS}
        loadingText="Loading distributions"
        items={PROJECT_LIST}
        selectionType="multi"
        variant="full-page"
        header={<ProjectsHeader />}
        filter={
          <TextFilter
            filteringAriaLabel="Filter distributions"
            filteringPlaceholder="Find distributions"
            filteringText=""
          />
        }
        pagination={<Pagination currentPageIndex={1} pagesCount={5} />}
        preferences={
          <CollectionPreferences
            title="Preferences"
            confirmLabel="Confirm"
            cancelLabel="Cancel"
          />
        }
      />
    </div>
  );
}

const Projects: React.FC = () => {
  return (
    <AppLayout
      content={<Content />}
      headerSelector="#header"
      breadcrumbs={<Breadcrumbs />}
      navigation={<Navigation activeHref="/projects" />}
      splitPanel={<SplitPanelContent />}
    />
  );
};

export default Projects;
