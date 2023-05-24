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
  Popover,
  SpaceBetween,
  StatusIndicator,
  StatusIndicatorProps,
  Table,
} from '@cloudscape-design/components';
import { disableAlarms, enableAlarms, getAlarmList } from 'apis/resource';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buildAlarmsLink } from 'ts/url';

interface AlarmTableProps {
  selectionType?: 'multi' | 'single';
  title: React.ReactNode;
  desc: React.ReactNode;
  alarmSelectedItems?: IAlarm[];
  region: string;
  projectId: string;
}

const AlarmTable: React.FC<AlarmTableProps> = (props: AlarmTableProps) => {
  const { selectionType, title, desc, alarmSelectedItems, region, projectId } =
    props;
  const { t } = useTranslation();
  const [selectedItems, setSelectedItems] = useState<IAlarm[]>(
    alarmSelectedItems || []
  );
  const [loadingData, setLoadingData] = useState(false);
  const [pageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [alarmList, setAlarmList] = useState<IAlarm[]>([]);
  const [loadingEnable, setLoadingEnable] = useState(false);
  const [loadingDisable, setLoadingDisable] = useState(false);

  const listAlarms = async () => {
    setLoadingData(true);
    try {
      const { success, data }: ApiResponse<ResponseTableData<IAlarm>> =
        await getAlarmList({
          region: region,
          pid: projectId,
          pageNumber: currentPage,
          pageSize: pageSize,
        });
      if (success) {
        setAlarmList(data.items);
        setTotalCount(data.totalCount);
        setLoadingData(false);
      }
    } catch (error) {
      setLoadingData(false);
    }
  };

  const enableAlarm = async (item?: IAlarm) => {
    setLoadingEnable(true);
    try {
      const alarmNames = item
        ? [item?.AlarmName]
        : selectedItems.map((item) => item.AlarmName);
      const resData: ApiResponse<null> = await enableAlarms({
        region,
        alarmNames,
      });
      if (resData.success) {
        setSelectedItems([]);
        listAlarms();
        setLoadingEnable(false);
      }
    } catch (error) {
      setLoadingEnable(false);
    }
  };

  const disableAlarm = async (item?: IAlarm) => {
    setLoadingDisable(true);
    try {
      const alarmNames = item
        ? [item?.AlarmName]
        : selectedItems.map((item) => item.AlarmName);
      const resData: ApiResponse<null> = await disableAlarms({
        region,
        alarmNames,
      });
      if (resData.success) {
        setSelectedItems([]);
        listAlarms();
        setLoadingDisable(false);
      }
    } catch (error) {
      setLoadingDisable(false);
    }
  };

  useEffect(() => {
    listAlarms();
  }, [currentPage]);

  return (
    <div>
      <Table
        variant="embedded"
        onSelectionChange={({ detail }) => {
          setSelectedItems(detail.selectedItems);
        }}
        selectedItems={selectedItems}
        ariaLabels={{
          allItemsSelectionLabel: ({ selectedItems }) =>
            `${selectedItems.length} ${
              selectedItems.length === 1 ? t('item') : t('items')
            } ${t('selected')}`,
          itemSelectionLabel: ({ selectedItems }, item) => {
            const isItemSelected = selectedItems.filter(
              (i) => i.AlarmName === item.AlarmName
            ).length;
            return `${item.AlarmName} is ${isItemSelected ? '' : t('not')} ${t(
              'selected'
            )}`;
          },
        }}
        loading={loadingData}
        columnDefinitions={[
          {
            id: 'name',
            header: t('pipeline:detail.alarmTableColumnName'),
            cell: (e) => {
              return e.AlarmName.replace(`Clickstream|${projectId} `, '');
            },
          },
          {
            id: 'state',
            header: t('pipeline:detail.alarmTableColumnState'),
            cell: (item) => {
              let status = 'stopped' as StatusIndicatorProps.Type;
              if (item.StateValue === 'OK') {
                status = 'success' as StatusIndicatorProps.Type;
              } else if (item.StateValue === 'ALARM') {
                status = 'warning' as StatusIndicatorProps.Type;
              }

              return (
                <SpaceBetween direction="horizontal" size="xs">
                  <Popover
                    dismissButton={false}
                    position="top"
                    size="small"
                    triggerType="custom"
                    content={
                      <StatusIndicator type={status}>
                        {item.StateReason}
                      </StatusIndicator>
                    }
                  >
                    <StatusIndicator type={status}>
                      {item.StateValue}
                    </StatusIndicator>
                  </Popover>
                </SpaceBetween>
              );
            },
          },
          {
            id: 'description',
            header: t('pipeline:detail.alarmDescription'),
            cell: (e) => {
              return e.AlarmDescription;
            },
          },
          {
            id: 'action',
            header: t('pipeline:detail.alarmTableColumnAction'),
            cell: (item) => {
              return (
                <SpaceBetween direction="horizontal" size="xs">
                  {item.ActionsEnabled ? (
                    <StatusIndicator>
                      {t('pipeline:detail.alarmTableActionEnable')}
                    </StatusIndicator>
                  ) : (
                    <StatusIndicator type="stopped">
                      {t('pipeline:detail.alarmTableActionDisable')}
                    </StatusIndicator>
                  )}
                </SpaceBetween>
              );
            },
          },
        ]}
        trackBy="AlarmName"
        items={alarmList}
        loadingText={t('pipeline:detail.alarmTableLoading') || 'Loading'}
        selectionType={selectionType}
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
              counter={
                selectedItems.length
                  ? '(' + selectedItems.length + `/${totalCount})`
                  : `(${totalCount})`
              }
              actions={
                <SpaceBetween direction="horizontal" size="xs">
                  <Button
                    iconName="refresh"
                    loading={loadingData}
                    onClick={() => {
                      listAlarms();
                    }}
                  />
                  <Button
                    loading={loadingEnable}
                    disabled={selectedItems.length <= 0}
                    onClick={() => {
                      enableAlarm();
                    }}
                  >
                    {t('button.enableAll')}
                  </Button>
                  <Button
                    loading={loadingDisable}
                    disabled={selectedItems.length <= 0}
                    onClick={() => {
                      disableAlarm();
                    }}
                  >
                    {t('button.disableAll')}
                  </Button>
                  <Button
                    href={buildAlarmsLink(region, projectId)}
                    iconAlign="right"
                    iconName="external"
                    target="_blank"
                    variant="primary"
                  >
                    {t('button.viewAlarmInCloudWatch')}
                  </Button>
                </SpaceBetween>
              }
            >
              {title}
            </Header>
            {desc}
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

export default AlarmTable;
