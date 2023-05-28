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
  Header,
  Link,
  Pagination,
  SpaceBetween,
  Table,
} from '@cloudscape-design/components';
import { deletePlugin, getPluginList } from 'apis/plugin';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { TIME_FORMAT, XMIND_LINK } from 'ts/const';

interface PluginTableProps {
  pluginType?: string;
  hideAction?: boolean;
  showRefresh?: boolean;
  selectionType?: 'multi' | 'single';
  title: React.ReactNode;
  desc: React.ReactNode;
  pluginSelectedItems?: IPlugin[];
  selectBuitInPlugins?: boolean;
  changePluginSeletedItems?: (items: IPlugin[]) => void;
}

const PluginTable: React.FC<PluginTableProps> = (props: PluginTableProps) => {
  const {
    pluginType,
    hideAction,
    showRefresh,
    selectionType,
    title,
    desc,
    pluginSelectedItems,
    selectBuitInPlugins,
    changePluginSeletedItems,
  } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedItems, setSelectedItems] = useState<IPlugin[]>(
    pluginSelectedItems || []
  );
  const [loadingData, setLoadingData] = useState(false);
  const [pageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pluginList, setPluginList] = useState<IPlugin[]>([]);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const openCreatePluginInNewTab = () => {
    window.open('/plugins/create', '_blank', 'noreferrer');
  };

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
          type: pluginType,
        });
      if (success) {
        setPluginList(data.items);
        setTotalCount(data.totalCount);
        if (selectBuitInPlugins) {
          setSelectedItems(data.items.filter((item) => item.builtIn === true));
          changePluginSeletedItems &&
            changePluginSeletedItems(
              data.items.filter((item) => item.builtIn === true)
            );
        }
        setLoadingData(false);
      }
    } catch (error) {
      setLoadingData(false);
    }
  };

  const confirmDeletePlugin = async () => {
    setLoadingDelete(true);
    try {
      const resData: ApiResponse<null> = await deletePlugin({
        id: selectedItems[0]?.id || '',
      });
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
        isItemDisabled={(item) => !hideAction && item.builtIn === true}
        onSelectionChange={({ detail }) => {
          setSelectedItems(detail.selectedItems);
          changePluginSeletedItems &&
            changePluginSeletedItems(detail.selectedItems);
        }}
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
              return e.createAt ? moment(e.createAt).format(TIME_FORMAT) : '-';
            },
          },
        ]}
        items={pluginList}
        loadingText={t('plugin:list.loading') || 'Loading'}
        selectionType={selectionType}
        trackBy="id"
        empty={
          <Box textAlign="center" color="inherit">
            <b>{t('plugin:list.noPlugin')}</b>
            <Box padding={{ bottom: 's' }} variant="p" color="inherit">
              {t('plugin:list.noPluginDisplay')}
            </Box>
          </Box>
        }
        header={
          <>
            <Header
              counter={
                selectedItems.length
                  ? '(' + selectedItems.length + `/${totalCount})`
                  : `(${totalCount})`
              }
              actions={
                <SpaceBetween direction="horizontal" size="xs">
                  {!hideAction && (
                    <>
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
                        iconName="add-plus"
                        variant="primary"
                        onClick={() => {
                          redirectToCreatePage();
                        }}
                      >
                        {t('button.create')}
                      </Button>
                    </>
                  )}
                  {showRefresh && (
                    <>
                      <Button
                        iconName="refresh"
                        loading={loadingData}
                        onClick={() => {
                          listPlugins();
                        }}
                      />
                      <Button
                        iconName="external"
                        onClick={() => {
                          openCreatePluginInNewTab();
                        }}
                      >
                        {t('button.addPlugin')}
                      </Button>
                    </>
                  )}
                </SpaceBetween>
              }
            >
              {title}
            </Header>
            {desc}
            <>
              {pluginType !== 'Transform' && (
                <div className="maxmind-copyright">
                  * {t('maxmindCopyRight')}
                  <Link external href={XMIND_LINK}>
                    {XMIND_LINK}
                  </Link>
                </div>
              )}
            </>
          </>
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

export default PluginTable;
