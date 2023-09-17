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
import { Box, SpaceBetween } from '@cloudscape-design/components';
import Pagination from '@cloudscape-design/components/pagination';
import PropertyFilter from '@cloudscape-design/components/property-filter';
import Table from '@cloudscape-design/components/table';

import {
  TableEmptyState,
  TableNoMatchState,
} from 'pages/common/common-components';
import { useColumnWidths } from 'pages/common/use-column-widths';
import React, { useEffect, useState } from 'react';
import { XSS_PATTERN } from 'ts/constant-ln';
import { UserTableHeader } from './UserTableHeader';

interface UserTableProps {
  tableColumnDefinitions: any[];
  tableContentDisplay: any[];
  tableFilteringProperties: any[];
  tableI18nStrings: {
    loadingText: string;
    emptyText: string;
    headerTitle: string;
    filteringAriaLabel: string;
    filteringPlaceholder: string;
    groupPropertiesText: string;
    operatorsText: string;
    clearFiltersText: string;
    applyActionText: string;
    useText: string;
    matchText: string;
    matchesText: string;
  };
  selectionType?: 'multi' | 'single';
  fetchDataFunc: () => Promise<IUser[]>;
  fetchUpdateFunc: (item: IUser) => Promise<void>;
}

const UserTable: React.FC<UserTableProps> = (props: UserTableProps) => {
  const {
    tableColumnDefinitions,
    tableContentDisplay,
    tableFilteringProperties,
    tableI18nStrings,
    fetchDataFunc,
    fetchUpdateFunc,
  } = props;

  const [loadingData, setLoadingData] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [itemsSnap, setItemsSnap] = useState<any[]>([]);

  const [columnDefinitions, saveWidths] = useColumnWidths(
    `User-TableSelectFilter-Widths`,
    tableColumnDefinitions
  );

  const persistChanges = () => {
    setItemsSnap([]);
  };

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const data = await fetchDataFunc();
      setData(data);
      setLoadingData(false);
    } catch (error) {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const {
    items,
    actions,
    filteredItemsCount,
    collectionProps,
    paginationProps,
    propertyFilterProps,
  } = useCollection(data, {
    propertyFiltering: {
      filteringProperties: tableFilteringProperties,
      empty: <TableEmptyState resourceName="User" />,
      noMatch: (
        <TableNoMatchState
          onClearFilter={() => {
            actions.setPropertyFiltering({ tokens: [], operation: 'and' });
          }}
        />
      ),
    },
    pagination: { pageSize: 10 },
    sorting: { defaultState: { sortingColumn: columnDefinitions[0] } },
    selection: {},
  });

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

  const handleSubmit = async (currentItem: IUser, column: any, value: any) => {
    if (column.id === 'name' && new RegExp(XSS_PATTERN).test(value)) {
      throw new Error('Inline error');
    }
    const newItem = { ...currentItem, [column.id]: value };
    await fetchUpdateFunc(newItem);
    let fullCollection = data;

    if (propertyFilterProps.filteringProperties.length > 0) {
      fullCollection = data;
    }

    if (
      collectionProps.sortingColumn === column ||
      propertyFilterProps.filteringProperties.length > 0
    ) {
      setItemsSnap(
        items.map((item) => (item === currentItem ? newItem : item))
      );
    }

    setData(
      fullCollection.map((item) => (item === currentItem ? newItem : item))
    );
  };

  return (
    <div>
      <Table
        {...tableCollectionProps}
        variant="full-page"
        resizableColumns={true}
        selectionType="single"
        loading={loadingData}
        items={itemsSnap.length > 0 ? itemsSnap : items}
        loadingText={tableI18nStrings.loadingText}
        onColumnWidthsChange={saveWidths}
        columnDefinitions={columnDefinitions}
        submitEdit={handleSubmit}
        columnDisplay={tableContentDisplay}
        empty={
          <Box margin={{ vertical: 'xs' }} textAlign="center" color="inherit">
            <SpaceBetween size="m">
              <b>{tableI18nStrings.emptyText}</b>
            </SpaceBetween>
          </Box>
        }
        header={
          <UserTableHeader
            selectedItemsCount={collectionProps.selectedItems?.length ?? 0}
            counter={
              !loadingData &&
              collectionProps.selectedItems &&
              collectionProps.selectedItems?.length > 0
                ? `(${collectionProps.selectedItems.length}/${data.length})`
                : `(${data.length})`
            }
            user={collectionProps.selectedItems?.[0]}
            refreshPage={function (): void {
              collectionProps.selectedItems = [];
              fetchData();
            }}
            setSelectItemEmpty={() => {
              collectionProps.selectedItems = [];
            }}
          />
        }
        filter={
          <PropertyFilter
            {...tableFilterProps}
            i18nStrings={{
              filteringAriaLabel: tableI18nStrings.filteringAriaLabel,
              filteringPlaceholder: tableI18nStrings.filteringPlaceholder,
              groupPropertiesText: tableI18nStrings.groupPropertiesText,
              operatorsText: tableI18nStrings.operatorsText,
              clearFiltersText: tableI18nStrings.clearFiltersText,
              applyActionText: tableI18nStrings.applyActionText,
              enteredTextLabel: (value) => {
                return `${tableI18nStrings.useText}: ${value}`;
              },
            }}
            countText={`${filteredItemsCount} ${
              filteredItemsCount === 1
                ? tableI18nStrings.matchText
                : tableI18nStrings.matchesText
            }`}
            expandToViewport={true}
          />
        }
        pagination={<Pagination {...tablePaginationProps} />}
      />
    </div>
  );
};

export default UserTable;
