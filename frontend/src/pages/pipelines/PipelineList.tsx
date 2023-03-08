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
import { deletePipeline, getPipelineList } from 'apis/pipeline';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TIME_FORMAT } from 'ts/const';
import PipelineHeader from './comps/PipelineHeader';

const Content: React.FC = () => {
  const { t } = useTranslation();
  const [selectedItems, setSelectedItems] = useState<IPipeline[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [pageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pipelineList, setPipelineList] = useState<IPipeline[]>([]);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const listPipelines = async () => {
    setLoadingData(true);
    try {
      const { success, data }: ApiResponse<ResponseTableData<IPipeline>> =
        await getPipelineList({
          pageNumber: currentPage,
          pageSize: pageSize,
        });
      if (success) {
        setPipelineList(data.items);
        setTotalCount(data.totalCount);
        setLoadingData(false);
      }
    } catch (error) {
      setLoadingData(false);
    }
  };

  const confirmDeletePipeline = async () => {
    setLoadingDelete(true);
    try {
      const resData: ApiResponse<null> = await deletePipeline(
        selectedItems[0]?.pipelineId || '',
        selectedItems[0].projectId || ''
      );
      if (resData.success) {
        setSelectedItems([]);
        listPipelines();
        setLoadingDelete(false);
      }
    } catch (error) {
      setLoadingDelete(false);
    }
  };

  useEffect(() => {
    listPipelines();
  }, [currentPage]);

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
        loading={loadingData}
        columnDefinitions={[
          {
            id: 'id',
            header: t('pipeline:list.id'),
            cell: (e) => {
              return (
                <Link href={`/project/${e.projectId}/pipeline/${e.pipelineId}`}>
                  {e.pipelineId}
                </Link>
              );
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
                  type={e.status === '1' ? 'success' : 'stopped'}
                >
                  {e.status}
                </StatusIndicator>
              );
            },
          },
          {
            id: 'created',
            header: t('pipeline:list.created'),
            cell: (e) => {
              return moment(e.createAt).format(TIME_FORMAT) || '-';
            },
          },
        ]}
        items={pipelineList}
        loadingText={t('pipeline:list.loading') || 'Loading'}
        selectionType="single"
        trackBy="name"
        empty={
          <Box textAlign="center" color="inherit">
            <b>{t('pipeline:list.noPipeline')}</b>
            <Box padding={{ bottom: 's' }} variant="p" color="inherit">
              {t('pipeline:list.noPipelineDisplay')}
            </Box>
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
                ? '(' + selectedItems.length + `/${totalCount})`
                : `(${totalCount})`
            }
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  loading={loadingDelete}
                  disabled={selectedItems.length <= 0}
                  onClick={() => {
                    confirmDeletePipeline();
                  }}
                >
                  {t('button.delete')}
                </Button>
              </SpaceBetween>
            }
          >
            {t('pipeline:list.pipelineList')}
          </Header>
        }
        pagination={
          <Pagination
            currentPageIndex={currentPage}
            pagesCount={Math.ceil(totalCount / pageSize)}
            onChange={(e) => {
              setCurrentPage(e.detail.currentPageIndex);
            }}
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
