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
  Box,
  Button,
  FormField,
  Header,
  Input,
  Pagination,
  Select,
  SelectProps,
  SpaceBetween,
  Table,
} from '@cloudscape-design/components';
import { OptionDefinition } from '@cloudscape-design/components/internal/components/option/interfaces';
import { getMetadataEventsList } from 'apis/analytics';
import {
  TableEmptyState,
  TableNoMatchState,
} from 'pages/common/common-components';
import { useColumnWidths } from 'pages/common/use-column-widths';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_PREFERENCES, SEARCHABLE_COLUMNS } from './table-config';
import '../styles/table-select.scss';

const defaultEventType = { value: '0', label: 'Any Type' };

interface EventTableProps {
  selectionType?: 'multi' | 'single';
  projectId: string;
  appId: string;
  refresh: number;
  defaultSelectedItems: IMetadataEvent[];
  changeSelectedItems: (item: IMetadataEvent[]) => void;
}

const EventTable: React.FC<EventTableProps> = (props: EventTableProps) => {
  const {
    selectionType,
    projectId,
    appId,
    defaultSelectedItems,
    changeSelectedItems,
  } = props;
  const { t } = useTranslation();
  const [loadingData, setLoadingData] = useState(false);
  const [selectedItems, setSelectedItems] = useState(defaultSelectedItems);
  const [eventList, setEventList] = useState<IMetadataEvent[]>([]);
  const COLUMN_DEFINITIONS = [
    {
      id: 'id',
      header: t('analytics:metadata.event.tableColumnID'),
      sortingField: 'id',
      cell: (e: { id: any }) => {
        return e.id;
      },
    },
    {
      id: 'name',
      header: t('analytics:metadata.event.tableColumnName'),
      sortingField: 'name',
      cell: (e: { name: any }) => {
        return e.name;
      },
    },
    {
      id: 'displayName',
      header: t('analytics:metadata.event.tableColumnDisplayName'),
      sortingField: 'displayName',
      cell: (e: { displayName: any }) => {
        return e.displayName;
      },
    },
    {
      id: 'description',
      header: t('analytics:metadata.event.tableColumnDescription'),
      cell: (e: { description: any }) => {
        return e.description;
      },
    },
    {
      id: 'type',
      header: t('analytics:metadata.event.tableColumnType'),
      cell: (e: { type: any }) => {
        return e.type;
      },
    },
  ];
  const [columnDefinitions, saveWidths] = useColumnWidths(
    'Metadata-Event-TableSelectFilter-Widths',
    COLUMN_DEFINITIONS
  );
  const [eventType, setEventType] =
    useState<OptionDefinition>(defaultEventType);

  const eventTypeOptions = [
    defaultEventType,
    { value: '1', label: 'built-in' },
    { value: '2', label: 'customer' },
  ];

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

  function matchesEventType(item: any, selectedType: SelectProps.Option) {
    return (
      selectedType === defaultEventType || item.type === selectedType.label
    );
  }

  const {
    items,
    actions,
    filteredItemsCount,
    collectionProps,
    filterProps,
    paginationProps,
  } = useCollection(JSON.parse(JSON.stringify(eventList)), {
    filtering: {
      empty: <TableEmptyState resourceName="Event" />,
      noMatch: <TableNoMatchState onClearFilter={clearFilter} />,
      filteringFunction: (item: any, filteringText) => {
        if (!matchesEventType(item, eventType)) {
          return false;
        }
        const filteringTextLowerCase = filteringText.toLowerCase();

        return SEARCHABLE_COLUMNS.map((key) => item[key]).some(
          (value) =>
            typeof value === 'string' &&
            value.toLowerCase().indexOf(filteringTextLowerCase) > -1
        );
      },
    },
    pagination: { pageSize: DEFAULT_PREFERENCES.pageSize },
    sorting: { defaultState: { sortingColumn: columnDefinitions[0] } },
    selection: {},
  });
  useLayoutEffect(() => {
    collectionProps.ref.current?.scrollToTop();
  }, [eventType, collectionProps.ref, filterProps.filteringText]);

  function clearFilter() {
    actions.setFiltering('');
    setEventType(defaultEventType);
  }

  return (
    <div>
      <Table
        {...collectionProps}
        variant="full-page"
        selectedItems={selectedItems}
        stickyHeader={true}
        resizableColumns={true}
        loading={loadingData}
        items={items}
        trackBy="id"
        loadingText={t('analytics:metadata.event.tableLoading') || 'Loading'}
        selectionType={selectionType ?? 'single'}
        onSelectionChange={({ detail }) => {
          setSelectedItems(detail.selectedItems);
          changeSelectedItems(detail.selectedItems);
        }}
        onColumnWidthsChange={saveWidths}
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
        columnDefinitions={columnDefinitions}
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
          <>
            <Header
              counter={`(${eventList.length})`}
              actions={
                <SpaceBetween size="xs" direction="horizontal">
                  <Button data-testid="header-btn-create" variant="primary">
                    Create Events
                  </Button>
                </SpaceBetween>
              }
            >
              {t('analytics:metadata.event.title')}
            </Header>
            {t('analytics:metadata.event.description')}
          </>
        }
        filter={
          <div className="input-container">
            <div className="input-filter">
              <Input
                data-testid="input-filter"
                type="search"
                value={filterProps.filteringText}
                onChange={(event) => {
                  actions.setFiltering(event.detail.value);
                }}
                ariaLabel="Find instances"
                placeholder="Find instances"
                clearAriaLabel="clear"
              />
            </div>
            <div className="select-filter">
              <FormField label="Filter Type">
                <Select
                  data-testid="type-filter"
                  options={eventTypeOptions}
                  selectedAriaLabel="Selected"
                  selectedOption={eventType}
                  onChange={(event) => {
                    setEventType(event.detail.selectedOption);
                  }}
                  expandToViewport={true}
                />
              </FormField>
            </div>
            <div aria-live="polite">
              {(filterProps.filteringText ||
                eventType !== defaultEventType) && (
                <span className="filtering-results">
                  {`${filteredItemsCount} ${
                    filteredItemsCount === 1 ? 'match' : 'matches'
                  }`}
                </span>
              )}
            </div>
          </div>
        }
        pagination={<Pagination {...paginationProps} />}
      />
    </div>
  );
};

export default EventTable;
