import {
  AppLayout,
  Box,
  Button,
  ContentLayout,
  Header,
  Link,
  Pagination,
  SpaceBetween,
  StatusIndicator,
  Table,
  TextFilter,
} from '@cloudscape-design/components';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import PipelineHeader from './comps/PipelineHeader';

const PIPELINE_LIST = [
  {
    name: 'my-pipeline-1',
    id: '809e1238-6f2e-11ed-a1eb-0242ac120002',
    region: 'us-east-1',
    status: 'Healthy',
    created: 'Nov 26, 2022, 18:00PM UTC +8:00',
  },
  {
    name: 'my-pipeline-2',
    id: '809e1238-6f2e-11ed-a1eb-0242ac120002',
    region: 'us-west-2',
    status: 'Disabled',
    created: 'Nov 26, 2022, 18:00PM UTC +8:00',
  },
  {
    name: 'my-pipeline-3',
    id: '809e1238-6f2e-11ed-a1eb-0242ac120002',
    region: 'us-east-1',
    status: 'Pending',
    created: 'Nov 26, 2022, 18:00PM UTC +8:00',
  },
];

const Content: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedItems, setSelectedItems] = React.useState<any>([
    { name: 'Item 2' },
  ]);
  return (
    <div>
      <Table
        onSelectionChange={({ detail }) =>
          setSelectedItems(detail.selectedItems)
        }
        selectedItems={selectedItems}
        ariaLabels={{
          allItemsSelectionLabel: ({ selectedItems }) =>
            `${selectedItems.length} ${
              selectedItems.length === 1 ? t('item') : t('items')
            } ${t('selected')}`,
          itemSelectionLabel: ({ selectedItems }, item) => {
            const isItemSelected = selectedItems.filter(
              (i) => i.name === item.name
            ).length;
            return `${item.name} is ${isItemSelected ? '' : t('not')} ${t(
              'selected'
            )}`;
          },
        }}
        columnDefinitions={[
          {
            id: 'id',
            header: t('pipeline:list.id'),
            cell: (e) => {
              return <Link href={`/pipeline/detail/${e.name}`}>{e.id}</Link>;
            },
            sortingField: 'alt',
          },
          {
            id: 'name',
            header: t('pipeline:list.name'),
            cell: (e) => e.name,
            sortingField: 'name',
          },
          {
            id: 'region',
            header: t('pipeline:list.region'),
            cell: (e) => e.region,
          },
          {
            id: 'status',
            header: t('pipeline:list.status'),
            cell: (e) => {
              return (
                <StatusIndicator
                  type={e.status === 'Healthy' ? 'success' : 'stopped'}
                >
                  {e.status}
                </StatusIndicator>
              );
            },
          },
          {
            id: 'created',
            header: t('pipeline:list.created'),
            cell: (e) => e.created,
          },
        ]}
        items={PIPELINE_LIST}
        loadingText={t('pipeline:list.loading') || 'Loading'}
        selectionType="single"
        trackBy="name"
        empty={
          <Box textAlign="center" color="inherit">
            <b>{t('pipeline:list.noPipeline')}</b>
            <Box padding={{ bottom: 's' }} variant="p" color="inherit">
              {t('pipeline:list.noPipelineDisplay')}
            </Box>
            <Button
              iconName="add-plus"
              onClick={() => {
                navigate('/pipelines/create');
              }}
            >
              {t('button.createPipeline')}
            </Button>
          </Box>
        }
        filter={
          <TextFilter
            filteringPlaceholder={t('pipeline:list.findPipeline') || ''}
            filteringText=""
          />
        }
        header={
          <Header
            description={t('pipeline:list.pipelineDesc')}
            counter={
              selectedItems.length
                ? '(' + selectedItems.length + '/10)'
                : '(10)'
            }
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button>{t('button.disable')}</Button>
                <Button>{t('button.delete')}</Button>
                <Button
                  variant="primary"
                  iconName="add-plus"
                  onClick={() => {
                    navigate('/pipelines/create');
                  }}
                >
                  {t('button.createPipeline')}
                </Button>
              </SpaceBetween>
            }
          >
            {t('pipeline:list.pipelineList')}
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
    </div>
  );
};

const PipelineList: React.FC = () => {
  const { t } = useTranslation();
  const breadcrumbItems = [
    {
      text: t('breadCrumb.name'),
      href: '/',
    },
    {
      text: t('breadCrumb.pipelines'),
      href: '/',
    },
  ];
  return (
    <AppLayout
      content={
        <ContentLayout header={<PipelineHeader />}>
          <Content />
        </ContentLayout>
      }
      headerSelector="#header"
      breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
      navigation={<Navigation activeHref="/pipelines" />}
    />
  );
};

export default PipelineList;
