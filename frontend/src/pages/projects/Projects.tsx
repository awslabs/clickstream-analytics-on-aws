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
  Box,
  Button,
  Cards,
  Link,
  Pagination,
  TextFilter,
} from '@cloudscape-design/components';
import { getProjectList } from 'apis/project';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ProjectsHeader from './comps/ProjectsHeader';
import SplitPanelContent from './comps/SplitPanel';
import CreateProject from './create/CreateProject';

interface ContentProps {
  selectedItems: IProject[];
  changeSelectedItems: (item: IProject[]) => void;
}

const Content: React.FC<ContentProps> = (props: ContentProps) => {
  const { t } = useTranslation();
  const { selectedItems, changeSelectedItems } = props;
  const [pageSize] = useState(12);
  const [loadingData, setLoadingData] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [projectList, setProjectList] = useState<IProject[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const CARD_DEFINITIONS = {
    header: (item: IProject) => (
      <div>
        <Link fontSize="heading-m" href={`/project/detail/${item.id}`}>
          {item.name}
        </Link>
      </div>
    ),
    sections: [
      {
        id: 'name',
        header: t('project:list.name'),
        content: (item: IProject) => item.name,
      },
      {
        id: 'projectId',
        header: t('project:list.id'),
        content: (item: IProject) => item.id,
      },
      {
        id: 'projectPlatform',
        header: t('project:list.platform'),
        content: (item: IProject) => item.platform || '-',
      },
    ],
  };

  const listProjects = async () => {
    setLoadingData(true);
    try {
      const { success, data }: ApiResponse<ResponseTableData<IProject>> =
        await getProjectList({
          pageNumber: currentPage,
          pageSize: pageSize,
        });
      if (success) {
        setProjectList(data.items);
        setTotalCount(data.totalCount);
        setLoadingData(false);
      }
    } catch (error) {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    listProjects();
  }, [currentPage]);

  return (
    <div className="pb-30">
      <CreateProject
        openModel={openCreate}
        closeModel={() => {
          setOpenCreate(false);
        }}
      />
      <Cards
        selectedItems={selectedItems}
        onSelectionChange={(event) => {
          changeSelectedItems(event.detail.selectedItems);
        }}
        empty={
          <Box textAlign="center" color="inherit">
            <Box padding={{ bottom: 's' }} variant="p" color="inherit">
              <b>{t('project:list.noProject')}</b>
            </Box>
            <Button
              variant="primary"
              iconName="add-plus"
              onClick={() => {
                setOpenCreate(true);
              }}
            >
              {t('button.createProject')}
            </Button>
          </Box>
        }
        loading={loadingData}
        stickyHeader={false}
        cardDefinition={CARD_DEFINITIONS}
        loadingText={t('project:list.loading') || ''}
        items={projectList}
        selectionType="single"
        variant="full-page"
        header={
          <ProjectsHeader
            totalProject={totalCount}
            project={selectedItems?.[0]}
            refreshPage={() => {
              changeSelectedItems([]);
              listProjects();
            }}
          />
        }
        filter={
          <TextFilter
            filteringAriaLabel={t('project:list.filter') || ''}
            filteringPlaceholder={t('project:list.find') || ''}
            filteringText=""
          />
        }
        pagination={
          <Pagination
            currentPageIndex={currentPage}
            pagesCount={Math.ceil(totalCount / pageSize)}
            onChange={(e) => {
              setCurrentPage(e.detail.currentPageIndex);
            }}
          />
        }
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
  const [showSplit, setShowSplit] = useState(false);
  const [selectedItems, setSelectedItems] = useState<IProject[]>([]);

  useEffect(() => {
    if (selectedItems.length === 1) {
      setShowSplit(true);
    }
  }, [selectedItems]);

  return (
    <AppLayout
      content={
        <Content
          selectedItems={selectedItems}
          changeSelectedItems={(items) => {
            setSelectedItems(items);
          }}
        />
      }
      headerSelector="#header"
      breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
      navigation={<Navigation activeHref="/projects" />}
      splitPanelOpen={showSplit}
      onSplitPanelToggle={(e) => {
        setShowSplit(e.detail.open);
      }}
      splitPanel={
        selectedItems.length > 0 ? (
          <SplitPanelContent project={selectedItems?.[0]} />
        ) : (
          ''
        )
      }
    />
  );
};

export default Projects;
