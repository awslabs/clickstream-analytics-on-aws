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
  ContentLayout,
  Header,
  Pagination,
  SpaceBetween,
  Table,
  TextFilter,
} from '@cloudscape-design/components';
import { deletePlugin, getPluginList } from 'apis/plugin';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { TIME_FORMAT } from 'ts/const';
import PluginHeader from './comps/PluginHeader';

const Content: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedItems, setSelectedItems] = useState<IPlugin[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [pageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pluginList, setPluginList] = useState<IPlugin[]>([]);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const redirectToCreatePage = () => {
    navigate(`/plugins/create`);
  };

  const listPlugins = async () => {
    setLoadingData(true);
    try {
      const { success, data }: ApiResponse<ResponseTableData<IPlugin>> =
        await getPluginList({
          pageNumber: currentPage,
          pageSize: pageSize,
        });
      if (success) {
        setPluginList(data.items);
        setTotalCount(data.totalCount);
        setLoadingData(false);
      }
    } catch (error) {
      setLoadingData(false);
    }
  };

  const confirmDeletePlugin = async () => {
    setLoadingDelete(true);
    try {
      const resData: ApiResponse<null> = await deletePlugin(
        selectedItems[0]?.id || ''
      );
      if (resData.success) {
        setSelectedItems([]);
        listPlugins();
        setLoadingDelete(false);
      }
    } catch (error) {
      setLoadingDelete(false);
    }
  };

  useEffect(() => {
    listPlugins();
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
            id: 'name',
            header: t('plugin:list.name'),
            cell: (e) => e.name,
            sortingField: 'name',
          },
          {
            id: 'description',
            header: t('plugin:list.desc'),
            cell: (e) => e.description,
            sortingField: 'desc',
          },
          {
            id: 'pluginType',
            header: t('plugin:list.type'),
            cell: (e) => e.pluginType,
            sortingField: 'pluginType',
          },
          {
            id: 'created',
            header: t('pipeline:list.created'),
            cell: (e) => {
              return moment(e.createAt).format(TIME_FORMAT) || '-';
            },
          },
        ]}
        items={pluginList}
        loadingText={t('plugin:list.loading') || 'Loading'}
        selectionType="single"
        trackBy="name"
        empty={
          <Box textAlign="center" color="inherit">
            <b>{t('plugin:list.noPlugin')}</b>
            <Box padding={{ bottom: 's' }} variant="p" color="inherit">
              {t('plugin:list.noPluginDisplay')}
            </Box>
          </Box>
        }
        filter={
          <TextFilter
            filteringPlaceholder={t('plugin:list.findPlugin') || ''}
            filteringText=""
          />
        }
        header={
          <Header
            description={t('plugin:list.desc')}
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
                    confirmDeletePlugin();
                  }}
                >
                  {t('button.delete')}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    redirectToCreatePage();
                  }}
                >
                  {t('button.create')}
                </Button>
              </SpaceBetween>
            }
          >
            {t('plugin:list.pluginList')}
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

const PluginList: React.FC = () => {
  const { t } = useTranslation();
  const breadcrumbItems = [
    {
      text: t('breadCrumb.name'),
      href: '/',
    },
    {
      text: t('breadCrumb.plugins'),
      href: '/',
    },
  ];
  return (
    <AppLayout
      content={
        <ContentLayout header={<PluginHeader />}>
          <Content />
        </ContentLayout>
      }
      headerSelector="#header"
      breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
      navigation={<Navigation activeHref="/plugins" />}
    />
  );
};

export default PluginList;
