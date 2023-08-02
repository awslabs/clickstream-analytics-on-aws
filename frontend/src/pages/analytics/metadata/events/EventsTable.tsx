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
import { Box } from '@cloudscape-design/components';
import Pagination from '@cloudscape-design/components/pagination';
import PropertyFilter from '@cloudscape-design/components/property-filter';
import Table from '@cloudscape-design/components/table';

import { getMetadataEventsList } from 'apis/analytics';
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

interface EventTableProps {
  selectionType?: 'multi' | 'single';
  projectId: string;
  appId: string;
  refresh: number;
  defaultSelectedItems: IMetadataEvent[];
  changeSelectedItems: (item: IMetadataEvent[]) => void;
  loadHelpPanelContent: () => void;
}

const EventTable: React.FC<EventTableProps> = (props: EventTableProps) => {
  const {
    selectionType,
    projectId,
    appId,
    defaultSelectedItems,
    changeSelectedItems,
    loadHelpPanelContent,
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
          propertyLabel: 'Event name',
          key: 'name',
          groupValuesLabel: 'Event name values',
          operators: [':', '!:', '=', '!='],
        },
        {
          propertyLabel: 'Event display name',
          key: 'displayName',
          groupValuesLabel: 'Event display name values',
          operators: [':', '!:', '=', '!='],
        },
        {
          propertyLabel: 'Event type',
          key: 'type',
          groupValuesLabel: 'Event type values',
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
    selection: {},
  });

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
        loadingText={t('analytics:metadata.event.tableLoading') || 'Loading'}
        selectionType={selectionType ?? 'multi'}
        onColumnWidthsChange={saveWidths}
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
          <EventsTableHeader
            title={t('analytics:metadata.event.title') ?? ''}
            createButtonText={t('analytics:metadata.event.createButton') ?? ''}
            selectedItemsCount={collectionProps.selectedItems?.length ?? 0}
            counter={
              !loadingData &&
              collectionProps.selectedItems &&
              collectionProps.selectedItems?.length > 0
                ? `(${collectionProps.selectedItems.length}/${eventList.length})`
                : `(${eventList.length})`
            }
            onInfoLinkClick={loadHelpPanelContent}
          />
        }
        // header={
        //   <>
        //     <Header
        //       counter={`(${eventList.length})`}
        //       actions={
        //         <SpaceBetween size="xs" direction="horizontal">
        //           <Button data-testid="header-btn-create" variant="primary">
        //             Create Events
        //           </Button>
        //         </SpaceBetween>
        //       }
        //     >
        //       {t('analytics:metadata.event.title')}
        //     </Header>
        //     {t('analytics:metadata.event.description')}
        //   </>
        // }
        filter={
          <PropertyFilter
            {...propertyFilterProps}
            i18nStrings={{
              filteringAriaLabel: 'Find events',
              filteringPlaceholder: 'Find events',
            }}
            countText={`${filteredItemsCount} ${
              filteredItemsCount === 1 ? 'match' : 'matches'
            }`}
            expandToViewport={true}
          />
        }
        pagination={<Pagination {...paginationProps} />}
      />
    </div>
  );
};

export default EventTable;
