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
  Pagination,
  SpaceBetween,
  Table,
} from '@cloudscape-design/components';
import { getMetadataEventsList } from 'apis/analytics';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface EventTableProps {
  selectionType?: 'multi' | 'single';
  projectId: string;
  appId: string;
}

const EventTable: React.FC<EventTableProps> = (props: EventTableProps) => {
  const { selectionType, projectId, appId } = props;
  const { t } = useTranslation();
  const [loadingData, setLoadingData] = useState(false);
  const [pageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [eventList, setEventList] = useState<IMetadataEvent[]>([]);
  const [selectedItems, setSelectedItems] = useState<IMetadataEvent[]>([]);

  const listAlarms = async () => {
    setLoadingData(true);
    try {
      const { success, data }: ApiResponse<ResponseTableData<IMetadataEvent>> =
        await getMetadataEventsList({
          pid: projectId,
          appId: appId,
          pageNumber: 1,
          pageSize: 9999,
        });
      if (success) {
        setEventList(data.items);
        setTotalCount(data.totalCount);
        setLoadingData(false);
      }
    } catch (error) {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    listAlarms();
  }, [currentPage]);

  return (
    <div>
      <Table
        variant="full-page"
        selectedItems={selectedItems}
        stickyHeader={true}
        resizableColumns={true}
        loading={loadingData}
        items={eventList}
        loadingText={t('pipeline:detail.alarmTableLoading') || 'Loading'}
        selectionType={selectionType ?? 'single'}
        stripedRows={true}
        onSelectionChange={({ detail }) => {
          setSelectedItems(detail.selectedItems);
        }}
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
            header: 'ID',
            cell: (e) => {
              return e.id;
            },
          },
          {
            id: 'name',
            header: t('pipeline:detail.alarmTableColumnName'),
            cell: (e) => {
              return e.name;
            },
          },
          {
            id: 'description',
            header: t('pipeline:detail.alarmDescription'),
            cell: (e) => {
              return e.description;
            },
          },
        ]}
        empty={
          <Box textAlign="center" color="inherit">
            <b>{t('pipeline:detail.alarmTableNoAlarm')}</b>
            <Box padding={{ bottom: 's' }} variant="p" color="inherit">
              {t('pipeline:detail.alarmTableNoAlarmDisplay')}
            </Box>
          </Box>
        }
        header={
          <>
            <Header
              counter={`(${eventList.length})`}
              actions={
                <SpaceBetween direction="horizontal" size="xs">
                  <Button
                    iconName="refresh"
                    loading={loadingData}
                    onClick={() => {
                      listAlarms();
                    }}
                  />
                </SpaceBetween>
              }
            >
              title
            </Header>
            desc
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

export default EventTable;
