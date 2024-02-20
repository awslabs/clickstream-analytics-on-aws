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
import { HelpPanelType } from 'context/reducer';
import { cloneDeep } from 'lodash';
import {
  TableEmptyState,
  TableNoMatchState,
} from 'pages/common/common-components';
import { useColumnWidths } from 'pages/common/use-column-widths';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { MetadataSource } from 'ts/explore-types';
import { alertMsg } from 'ts/utils';
import { MetadataTableHeader } from './MetadataTableHeader';
import '../../styles/table-select.scss';
import { descriptionRegex, displayNameRegex } from './table-config';

interface MetadataTableProps {
  analysisStudioEnabled: boolean;
  infoType: HelpPanelType;
  resourceName: string;
  tableColumnDefinitions: any[];
  tableContentDisplay: any[];
  tableFilteringProperties: any[];
  tableI18nStrings: {
    loadingText: string;
    emptyText: string;
    headerTitle: string;
    headerDescription: string;
    headerRefreshButtonText: string;
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
  setShowDetails: (show: boolean, data?: IMetadataType) => void;
  fetchDataFunc: () => Promise<IMetadataType[]>;
  fetchUpdateFunc: (item: IMetadataType) => Promise<void>;
}

const MetadataTable: React.FC<MetadataTableProps> = (
  props: MetadataTableProps
) => {
  const {
    analysisStudioEnabled,
    infoType,
    selectionType,
    resourceName,
    tableColumnDefinitions,
    tableContentDisplay,
    tableFilteringProperties,
    tableI18nStrings,
    setShowDetails,
    fetchDataFunc,
    fetchUpdateFunc,
  } = props;

  const { t } = useTranslation();

  const { projectId, appId } = useParams();
  const [loadingData, setLoadingData] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [itemsSnap, setItemsSnap] = useState<any[]>([]);

  const [columnDefinitions, saveWidths] = useColumnWidths(
    `Metadata-${resourceName}-TableSelectFilter-Widths`,
    tableColumnDefinitions
  );

  const persistChanges = () => {
    setData(cloneDeep(data));
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
    if (projectId && appId && analysisStudioEnabled) {
      fetchData();
    }
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
      empty: <TableEmptyState resourceName={resourceName} />,
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

  const handleSubmit = async (
    currentItem:
      | IMetadataEvent
      | IMetadataEventParameter
      | IMetadataUserAttribute,
    column: any,
    value: any
  ) => {
    if (
      (column.id === 'displayName' && displayNameRegex.test(value)) ||
      (column.id === 'description' && descriptionRegex.test(value))
    ) {
      throw new Error('Inline error');
    }
    const newItem = { ...currentItem, [column.id]: value };
    if (newItem.metadataSource === MetadataSource.PRESET) {
      alertMsg(t('analytics:valid.metadataNotAllowEditError'));
      return;
    }
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
        variant="embedded"
        resizableColumns={true}
        loading={loadingData}
        items={itemsSnap.length > 0 ? itemsSnap : items}
        loadingText={tableI18nStrings.loadingText}
        selectionType={selectionType ?? 'single'}
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
          <MetadataTableHeader
            title={tableI18nStrings.headerTitle}
            infoType={infoType}
            description={tableI18nStrings.headerDescription}
            selectedItemsCount={collectionProps.selectedItems?.length ?? 0}
            counter={
              !loadingData &&
              collectionProps.selectedItems &&
              collectionProps.selectedItems?.length > 0
                ? `(${collectionProps.selectedItems.length}/${data.length})`
                : `(${data.length})`
            }
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

export default MetadataTable;
