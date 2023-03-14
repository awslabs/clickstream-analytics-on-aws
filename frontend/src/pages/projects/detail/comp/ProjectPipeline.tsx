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
import PipelineStatus from 'components/pipeline/PipelineStatus';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface ProjectPipelineProps {
  pipelineInfo: IPipeline;
}

const ProjectPipeline: React.FC<ProjectPipelineProps> = (
  props: ProjectPipelineProps
) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { pipelineInfo } = props;
  const [selectedItems, setSelectedItems] = React.useState<any>([]);

  const goToCreateApplication = () => {
    navigate(`/project/${pipelineInfo.projectId}/application/create`);
  };

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
                <PipelineStatus status={pipelineInfo.status} />
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
            cell: (e: any) => e.name,
          },
          {
            id: 'platform',
            header: t('project:pipeline.platform'),
            cell: (e: any) => e.platform,
          },
          { id: 'sdk', header: 'SDK', cell: (e) => e.sdk },
          {
            id: 'appId',
            header: t('project:pipeline.appId'),
            cell: (e: any) => e.appId,
          },
          {
            id: 'time',
            header: t('project:pipeline.time'),
            cell: (e: any) => e.time,
          },
        ]}
        items={[]}
        loadingText={t('project:pipeline.loading') || ''}
        selectionType="multi"
        trackBy="name"
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
                <Button disabled>{t('button.viewDetails')}</Button>
                <Button disabled>{t('button.delete')}</Button>
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
            currentPageIndex={1}
            pagesCount={2}
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
