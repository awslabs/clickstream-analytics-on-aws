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
import { getPipelineList } from 'apis/pipeline';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { TIME_FORMAT } from 'ts/const';
import PipelineHeader from './comps/PipelineHeader';

const Content: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedItems, setSelectedItems] = useState<IPipeline[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [pageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pipelineList, setPipelineList] = useState<IPipeline[]>([]);

  const listPipelines = async () => {
    setLoadingData(true);
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
                <Link href={`/pipeline/detail/${e.name}`}>{e.pipelineId}</Link>
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
