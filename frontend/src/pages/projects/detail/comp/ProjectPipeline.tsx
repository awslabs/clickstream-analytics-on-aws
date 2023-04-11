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
  Box,
  Button,
  ColumnLayout,
  Container,
  Header,
  Link,
  Pagination,
  SpaceBetween,
  Table,
  TextFilter,
} from '@cloudscape-design/components';
import {
  deleteApplication,
  getApplicationListByPipeline,
} from 'apis/application';
import PipelineStatus from 'components/pipeline/PipelineStatus';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { TIME_FORMAT } from 'ts/const';

interface ProjectPipelineProps {
  pipelineInfo: IPipeline;
}

const ProjectPipeline: React.FC<ProjectPipelineProps> = (
  props: ProjectPipelineProps
) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { pipelineInfo } = props;
  const [selectedItems, setSelectedItems] = useState<IApplication[]>([]);
  const [loadingApp, setLoadingApp] = useState(false);
  const [pageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [applicationList, setApplicationList] = useState<IApplication[]>([]);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const goToCreateApplication = () => {
    navigate(`/project/${pipelineInfo.projectId}/application/create`);
  };

  const goToApplicationDetail = () => {
    navigate(`/application/detail/${selectedItems[0]?.appId}`);
  };

  const listApplicationByProject = async () => {
    setLoadingApp(true);
    try {
      const { success, data }: ApiResponse<ResponseTableData<IApplication>> =
        await getApplicationListByPipeline({
          pid: pipelineInfo.projectId || '',
          pageNumber: currentPage,
          pageSize: pageSize,
        });
      if (success) {
        setApplicationList(data.items);
        setTotalCount(data.totalCount);
        setLoadingApp(false);
      }
    } catch (error) {
      setLoadingApp(false);
    }
  };

  const confirmDeleteApplication = async () => {
    setLoadingDelete(true);
    try {
      const resData: ApiResponse<null> = await deleteApplication({
        pid: pipelineInfo.projectId || '',
        id: selectedItems[0]?.appId || '',
      });
      if (resData.success) {
        setSelectedItems([]);
        listApplicationByProject();
        setLoadingDelete(false);
      }
    } catch (error) {
      setLoadingDelete(false);
    }
  };

  useEffect(() => {
    listApplicationByProject();
  }, [currentPage]);

  return (
    <SpaceBetween direction="vertical" size="l">
      <Container
        header={
          <Header
            variant="h2"
            description={t('project:pipeline.healthDesc')}
            actions={
              <Button
                href={`/project/${pipelineInfo.projectId}/pipeline/${pipelineInfo.pipelineId}`}
                iconAlign="right"
                iconName="external"
                target="_blank"
              >
                {t('button.viewDetails')}
              </Button>
            }
          >
            {t('project:pipeline.health')}
          </Header>
        }
      >
        <ColumnLayout columns={3} variant="text-grid">
          <SpaceBetween direction="vertical" size="l">
            <div>
              <Box variant="awsui-key-label">
                {t('project:pipeline.pipeline')}
              </Box>
              <div>
                <Link
                  external
                  externalIconAriaLabel="Opens in a new tab"
                  href={`/project/${pipelineInfo.projectId}/pipeline/${pipelineInfo.pipelineId}`}
                >
                  {pipelineInfo.name}
                </Link>
              </div>
            </div>
          </SpaceBetween>
          <SpaceBetween direction="vertical" size="l">
            <div>
              <Box variant="awsui-key-label">
                {t('project:pipeline.status')}
              </Box>
              <div>
                <PipelineStatus status={pipelineInfo.status?.status} />
              </div>
            </div>
          </SpaceBetween>
          <SpaceBetween direction="vertical" size="l">
            <div>
              <Box variant="awsui-key-label">
                {t('project:pipeline.region')}
              </Box>
              <div>{pipelineInfo.region}</div>
            </div>
          </SpaceBetween>
        </ColumnLayout>
      </Container>

      <Table
        onSelectionChange={({ detail }) =>
          setSelectedItems(detail.selectedItems)
        }
        selectedItems={selectedItems}
        columnDefinitions={[
          {
            id: 'name',
            header: t('project:pipeline.appName'),
            cell: (e) => (
              <Link
                href={`/project/${pipelineInfo.projectId}/application/detail/${e.appId}`}
              >
                {e.name}
              </Link>
            ),
          },
          {
            id: 'appId',
            header: t('project:pipeline.appId'),
            cell: (e) => e.appId,
          },
          {
            id: 'desc',
            header: t('project:pipeline.appDesc'),
            cell: (e) => e.description,
          },
          {
            id: 'time',
            header: t('project:pipeline.time'),
            cell: (e) => moment(e.createAt).format(TIME_FORMAT),
          },
        ]}
        loading={loadingApp}
        items={applicationList}
        loadingText={t('project:pipeline.loading') || ''}
        selectionType="single"
        trackBy="appId"
        empty={
          <Box textAlign="center" color="inherit">
            <b>{t('project:pipeline.noApp')}</b>
            <Box padding={{ bottom: 's' }} variant="p" color="inherit">
              {t('project:pipeline.noAppDisplay')}
            </Box>
            <Button
              iconName="add-plus"
              onClick={() => {
                goToCreateApplication();
              }}
            >
              {t('button.addApplication')}
            </Button>
          </Box>
        }
        filter={
          <TextFilter
            filteringPlaceholder={t('project:pipeline.findApp') || ''}
            filteringText=""
          />
        }
        header={
          <Header
            counter={
              selectedItems.length ? '(' + selectedItems.length + '/10)' : ''
            }
            description={t('project:pipeline.yourAppDesc')}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  loading={loadingApp}
                  iconName="refresh"
                  onClick={() => {
                    listApplicationByProject();
                  }}
                />
                <Button
                  disabled={selectedItems.length <= 0}
                  onClick={() => {
                    goToApplicationDetail();
                  }}
                >
                  {t('button.viewDetails')}
                </Button>
                <Button
                  loading={loadingDelete}
                  disabled={selectedItems.length <= 0}
                  onClick={() => {
                    confirmDeleteApplication();
                  }}
                >
                  {t('button.delete')}
                </Button>
                <Button
                  variant="primary"
                  iconName="add-plus"
                  onClick={() => {
                    goToCreateApplication();
                  }}
                >
                  {t('button.addApplication')}
                </Button>
              </SpaceBetween>
            }
          >
            {t('project:pipeline.yourApp')}
          </Header>
        }
        pagination={
          <Pagination
            currentPageIndex={currentPage}
            onChange={(e) => {
              setCurrentPage(e.detail.currentPageIndex);
            }}
            pagesCount={Math.floor(totalCount / pageSize)}
            ariaLabels={{
              nextPageLabel: t('nextPage') || '',
              previousPageLabel: t('prePage') || '',
              pageLabel: (pageNumber) =>
                `${t('page')} ${pageNumber} ${t('allPages')}`,
            }}
          />
        }
      />
    </SpaceBetween>
  );
};

export default ProjectPipeline;
