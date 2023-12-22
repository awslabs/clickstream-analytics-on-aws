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
  Pagination,
  SpaceBetween,
  Table,
  TextFilter,
  Link as CloudScapeLink,
} from '@cloudscape-design/components';
import {
  deleteApplication,
  getApplicationListByPipeline,
} from 'apis/application';
import { retryPipeline } from 'apis/pipeline';
import PipelineStatus from 'components/pipeline/PipelineStatus';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { EPipelineStatus, TIME_FORMAT } from 'ts/const';
import { defaultStr } from 'ts/utils';

interface ProjectPipelineProps {
  pipelineInfo: IPipeline;
  loadingRefresh: boolean;
  reloadPipeline: () => void;
}

const PAGE_SIZE = 10;

const ProjectPipeline: React.FC<ProjectPipelineProps> = (
  props: ProjectPipelineProps
) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { pipelineInfo, loadingRefresh, reloadPipeline } = props;
  const [selectedItems, setSelectedItems] = useState<IApplication[]>([]);
  const [loadingApp, setLoadingApp] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [applicationList, setApplicationList] = useState<IApplication[]>([]);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingRetry, setLoadingRetry] = useState(false);
  const [disableRetry, setDisableRetry] = useState(false);
  const goToCreateApplication = () => {
    navigate(`/project/${pipelineInfo.projectId}/application/create`);
  };

  const goToApplicationDetail = () => {
    navigate(
      `/project/${pipelineInfo.projectId}/application/detail/${selectedItems[0]?.appId}`
    );
  };

  const listApplicationByProject = async () => {
    setLoadingApp(true);
    try {
      const { success, data }: ApiResponse<ResponseTableData<IApplication>> =
        await getApplicationListByPipeline({
          pid: pipelineInfo.projectId || '',
          pageNumber: currentPage,
          pageSize: PAGE_SIZE,
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

  const startRetryPipeline = async () => {
    setLoadingRetry(true);
    try {
      const resData: ApiResponse<null> = await retryPipeline({
        pid: pipelineInfo.projectId || '',
        id: pipelineInfo.pipelineId || '',
      });
      setLoadingRetry(false);
      if (resData.success) {
        setDisableRetry(true);
        reloadPipeline();
      }
    } catch (error) {
      setLoadingRetry(false);
    }
  };

  useEffect(() => {
    listApplicationByProject();
  }, [currentPage]);

  const renderAppName = (e: IApplication) => {
    return (
      <div className="clickstream-link-style">
        <Link
          to={`/project/${pipelineInfo.projectId}/application/detail/${e.appId}`}
        >
          {e.name}
        </Link>
      </div>
    );
  };

  console.info('pipelineInfo:', pipelineInfo);

  return (
    <SpaceBetween direction="vertical" size="l">
      <Container
        header={
          <Header
            variant="h2"
            description={t('project:pipeline.healthDesc')}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  iconName="refresh"
                  loading={loadingRefresh}
                  onClick={() => {
                    reloadPipeline();
                  }}
                />
                {pipelineInfo.statusType === EPipelineStatus.Failed && (
                  <Button
                    iconName="redo"
                    disabled={disableRetry}
                    loading={loadingRetry}
                    onClick={() => {
                      startRetryPipeline();
                    }}
                  >
                    {t('button.retry')}
                  </Button>
                )}

                <Button
                  href={`/project/${pipelineInfo.projectId}/pipeline/${pipelineInfo.pipelineId}`}
                  iconAlign="right"
                  iconName="external"
                  target="_blank"
                >
                  {t('button.viewDetails')}
                </Button>
              </SpaceBetween>
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
                <CloudScapeLink
                  external
                  externalIconAriaLabel="Opens in a new tab"
                  href={`/project/${pipelineInfo.projectId}/pipeline/${pipelineInfo.pipelineId}`}
                >
                  {pipelineInfo.pipelineId}
                </CloudScapeLink>
              </div>
            </div>
          </SpaceBetween>
          <SpaceBetween direction="vertical" size="l">
            <div>
              <Box variant="awsui-key-label">
                {t('project:pipeline.status')}
              </Box>
              <div>
                <PipelineStatus
                  pipelineId={pipelineInfo.pipelineId}
                  projectId={pipelineInfo.projectId}
                  status={pipelineInfo.statusType}
                  updatePipelineStatus={() => {
                    reloadPipeline();
                  }}
                />
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
            cell: (e) => renderAppName(e),
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
        loadingText={defaultStr(t('project:pipeline.loading'))}
        selectionType="single"
        trackBy="appId"
        empty={
          <Box textAlign="center" color="inherit">
            <b>{t('project:pipeline.noApp')}</b>
            <Box padding={{ bottom: 's' }} variant="p" color="inherit">
              {t('project:pipeline.noAppDisplay')}
            </Box>
            <Button
              disabled={pipelineInfo?.statusType !== EPipelineStatus.Active}
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
            filteringPlaceholder={defaultStr(t('project:pipeline.findApp'))}
            filteringText=""
          />
        }
        header={
          <Header
            counter={
              selectedItems.length
                ? '(' + selectedItems.length + '/' + totalCount + ')'
                : ''
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
                  disabled={pipelineInfo?.statusType !== EPipelineStatus.Active}
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
            pagesCount={Math.floor(totalCount / PAGE_SIZE)}
            ariaLabels={{
              nextPageLabel: defaultStr(t('nextPage')),
              previousPageLabel: defaultStr(t('prePage')),
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
