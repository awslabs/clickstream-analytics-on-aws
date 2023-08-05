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

import { useCollection } from '@cloudscape-design/collection-hooks';
import {
  Badge,
  Box,
  Input,
  StatusIndicator,
} from '@cloudscape-design/components';
import Pagination from '@cloudscape-design/components/pagination';
import PropertyFilter from '@cloudscape-design/components/property-filter';
import Table from '@cloudscape-design/components/table';

import { getMetadataEventsList, updateMetadataEvent } from 'apis/analytics';
import {
  TableEmptyState,
  TableNoMatchState,
} from 'pages/common/common-components';
import { useColumnWidths } from 'pages/common/use-column-widths';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EventsTableHeader } from './EventsTableHeader';
import { DEFAULT_PREFERENCES } from './table-config';
import '../styles/table-select.scss';
import { MetadataEventType } from 'ts/const';

const displayNameRegex = /^[a-z][a-z0-9_]{0,126}/i;
const descriptionRegex = /^[a-z][a-z0-9_]{0,126}/i;

interface EventTableProps {
  selectionType?: 'multi' | 'single';
  projectId: string;
  appId: string;
  loadHelpPanelContent: () => void;
  setShowDetails: (show: boolean, data?: IMetadataEvent) => void;
}

const EventTable: React.FC<EventTableProps> = (props: EventTableProps) => {
  const {
    selectionType,
    projectId,
    appId,
    loadHelpPanelContent,
    setShowDetails,
  } = props;
  const { t } = useTranslation();
  const [loadingData, setLoadingData] = useState(false);
  const [eventList, setEventList] = useState<IMetadataEvent[]>([]);
  const [itemsSnap, setItemsSnap] = useState<IMetadataEvent[]>([]);

  const COLUMN_DEFINITIONS = [
    {
      id: 'name',
      header: t('analytics:metadata.event.tableColumnName'),
      cell: (e: { name: string }) => {
        return e.name;
      },
    },
    {
      id: 'displayName',
      header: t('analytics:metadata.event.tableColumnDisplayName'),
      cell: (e: { displayName: string }) => {
        return e.displayName;
      },
      minWidth: 180,
      editConfig: {
        ariaLabel: 'Edit domain name',
        errorIconAriaLabel: 'Domain Name Validation Error',
        editIconAriaLabel: 'editable',
        validation(item: any, value: any) {
          return displayNameRegex.test(value)
            ? undefined
            : 'Invalid display name';
        },
        editingCell: (
          item: { displayName: string },
          { setValue, currentValue }: any
        ) => {
          return (
            <Input
              autoFocus={true}
              ariaLabel="Edit display name"
              value={currentValue ?? item.displayName}
              onChange={(event) => {
                setValue(event.detail.value);
              }}
              placeholder="Enter display name"
            />
          );
        },
      },
    },
    {
      id: 'description',
      header: t('analytics:metadata.event.tableColumnDescription'),
      cell: (e: { description: string }) => {
        return e.description;
      },
    },
    {
      id: 'type',
      header: t('analytics:metadata.event.tableColumnType'),
      sortingField: 'type',
      cell: (e: { type: string }) => {
        return (
          <Badge color={e.type === MetadataEventType.CUSTOM ? 'blue' : 'grey'}>
            {e.type}
          </Badge>
        );
      },
    },
    {
      id: 'hasData',
      header: t('analytics:metadata.event.tableColumnHasData'),
      sortingField: 'hasData',
      cell: (e: { hasData: boolean }) => {
        return (
          <StatusIndicator type={e.hasData ? 'success' : 'stopped'}>
            {e.hasData ? 'Yes' : 'No'}
          </StatusIndicator>
        );
      },
    },
    {
      id: 'platform',
      header: t('analytics:metadata.event.tableColumnPlatform'),
      sortingField: 'platform',
      cell: (e: { platform: string }) => {
        return e.platform;
      },
    },
    {
      id: 'dataVolumeLastDay',
      header: t('analytics:metadata.event.tableColumnDataVolumeLastDay'),
      sortingField: 'platform',
      cell: (e: { dataVolumeLastDay: number }) => {
        return e.dataVolumeLastDay;
      },
    },
  ];
  const [columnDefinitions, saveWidths] = useColumnWidths(
    'Metadata-Event-TableSelectFilter-Widths',
    COLUMN_DEFINITIONS
  );

  const persistChanges = () => {
    setEventList(eventList);
    setItemsSnap([]);
  };

  const listMetadataEvents = async () => {
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
        setLoadingData(false);
      }
    } catch (error) {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    listMetadataEvents();
  }, []);

  const {
    items,
    actions,
    filteredItemsCount,
    collectionProps,
    paginationProps,
    propertyFilterProps,
  } = useCollection(eventList, {
    propertyFiltering: {
      filteringProperties: [
        {
          propertyLabel: t('analytics:metadata.event.tableColumnName'),
          key: 'name',
          groupValuesLabel: t('analytics:metadata.event.tableColumnName'),
          operators: [':', '!:', '=', '!='],
        },
        {
          propertyLabel: t('analytics:metadata.event.tableColumnDisplayName'),
          key: 'displayName',
          groupValuesLabel: t(
            'analytics:metadata.event.tableColumnDisplayName'
          ),
          operators: [':', '!:', '=', '!='],
        },
        {
          propertyLabel: t('analytics:metadata.event.tableColumnType'),
          key: 'type',
          groupValuesLabel: t('analytics:metadata.event.tableColumnType'),
          operators: [':', '!:', '=', '!='],
        },
        {
          propertyLabel: t('analytics:metadata.event.tableColumnHasData'),
          key: 'hasData',
          groupValuesLabel: t('analytics:metadata.event.tableColumnHasData'),
          operators: [':', '!:', '=', '!='],
        },
        {
          propertyLabel: t('analytics:metadata.event.tableColumnPlatform'),
          key: 'platform',
          groupValuesLabel: t('analytics:metadata.event.tableColumnPlatform'),
          operators: [':', '!:', '=', '!='],
        },
      ],
      empty: <TableEmptyState resourceName="Events" />,
      noMatch: (
        <TableNoMatchState
          onClearFilter={() => {
            actions.setPropertyFiltering({ tokens: [], operation: 'and' });
          }}
        />
      ),
    },
    pagination: { pageSize: DEFAULT_PREFERENCES.pageSize },
    sorting: { defaultState: { sortingColumn: columnDefinitions[0] } },
    selection: { keepSelection: true },
  });

  useEffect(() => {
    if (
      collectionProps.selectedItems &&
      collectionProps.selectedItems?.length > 0
    ) {
      setShowDetails(true, collectionProps.selectedItems[0]);
    } else {
      setShowDetails(false);
    }
  }, [collectionProps.selectedItems]);

  const tablePaginationProps = {
    ...paginationProps,
    onChange: (event: any) => {
      paginationProps.onChange(event);
      persistChanges();
    },
  };

  const tableFilterProps = {
    ...propertyFilterProps,
    onChange: (event: any) => {
      propertyFilterProps.onChange(event);
      persistChanges();
    },
  };

  const tableCollectionProps = {
    ...collectionProps,
    onSortingChange: (event: any) => {
      if (collectionProps.onSortingChange) {
        collectionProps.onSortingChange(event);
      }
      persistChanges();
    },
  };

  const updateEventInfo = async (newItem: IMetadataEvent) => {
    try {
      const { success, message }: ApiResponse<null> = await updateMetadataEvent(
        newItem
      );
      if (!success) {
        throw new Error(message);
      }
    } catch (error) {
      throw new Error('Inline error');
    }
  };

  const handleSubmit = async (
    currentItem: IMetadataEvent,
    column: any,
    value: any
  ) => {
    if (column.id === 'displayName' && !displayNameRegex.test(value)) {
      throw new Error('Inline error');
    }
    const newItem = { ...currentItem, [column.id]: value };
    await updateEventInfo(newItem);
    let fullCollection = eventList;

    if (propertyFilterProps.filteringProperties.length > 0) {
      fullCollection = eventList;
    }

    if (
      collectionProps.sortingColumn === column ||
      propertyFilterProps.filteringProperties.length > 0
    ) {
      setItemsSnap(
        items.map((item) => (item === currentItem ? newItem : item))
      );
    }

    setEventList(
      fullCollection.map((item) => (item === currentItem ? newItem : item))
    );
  };

  return (
    <div>
      <Table
        {...tableCollectionProps}
        variant="full-page"
        stickyHeader={true}
        resizableColumns={true}
        loading={loadingData}
        items={itemsSnap.length > 0 ? itemsSnap : items}
        loadingText={t('analytics:metadata.event.tableLoading') || 'Loading'}
        selectionType={selectionType ?? 'single'}
        onColumnWidthsChange={saveWidths}
        columnDefinitions={columnDefinitions}
        submitEdit={handleSubmit}
        columnDisplay={DEFAULT_PREFERENCES.contentDisplay}
        empty={
          <Box textAlign="center" color="inherit">
            <b>{t('analytics:metadata.event.tableEmpty')}</b>
            <Box padding={{ bottom: 's' }} variant="p" color="inherit">
              {t('analytics:metadata.event.tableNoDataDisplay')}
            </Box>
          </Box>
        }
        header={
          <EventsTableHeader
            title={t('analytics:metadata.event.title') ?? ''}
            refreshButtonText={
              t('analytics:metadata.event.refreshButton') ?? ''
            }
            detailsButtonText={
              t('analytics:metadata.event.detailsButton') ?? ''
            }
            selectedItemsCount={collectionProps.selectedItems?.length ?? 0}
            counter={
              !loadingData &&
              collectionProps.selectedItems &&
              collectionProps.selectedItems?.length > 0
                ? `(${collectionProps.selectedItems.length}/${eventList.length})`
                : `(${eventList.length})`
            }
            onInfoLinkClick={loadHelpPanelContent}
            onRefreshButtonClick={() => {
              console.log('refresh button clicked');
            }}
            onDetailsButtonClick={() => {
              console.log('details button clicked');
            }}
          />
        }
        filter={
          <PropertyFilter
            {...tableFilterProps}
            i18nStrings={{
              filteringAriaLabel: 'Find events',
              filteringPlaceholder: 'Find events',
              groupPropertiesText: 'Properties',
              operatorsText: 'Operators',
              clearFiltersText: 'Clear filters',
              enteredTextLabel: (value) => {
                return `Use: ${value}`;
              },
            }}
            countText={`${filteredItemsCount} ${
              filteredItemsCount === 1 ? 'match' : 'matches'
            }`}
            expandToViewport={true}
          />
        }
        pagination={<Pagination {...tablePaginationProps} />}
      />
    </div>
  );
};

export default EventTable;
