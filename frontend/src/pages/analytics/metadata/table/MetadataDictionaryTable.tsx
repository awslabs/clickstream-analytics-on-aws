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
  Input,
  Pagination,
  SpaceBetween,
  Table,
} from '@cloudscape-design/components';
import { updateMetadataDisplay } from 'apis/analytics';
import { UserContext } from 'context/UserContext';
import { cloneDeep } from 'lodash';
import {
  TableEmptyState,
  TableNoMatchState,
} from 'pages/common/common-components';
import { useColumnWidths } from 'pages/common/use-column-widths';
import React, { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DICTIONARY_DISPLAY_PREFIX, TABLE_FILTER_OPTIONS } from 'ts/const';
import {
  alertMsg,
  defaultStr,
  getUserInfoFromLocalStorage,
  isAnalystAuthorRole,
} from 'ts/utils';
import { descriptionRegex, displayNameRegex } from './table-config';

interface MetadataDictionaryTableProps {
  parameter: IMetadataEventParameter | undefined;
  tableI18nStrings: {
    loadingText: string;
    emptyText: string;
    headerTitle: string;
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
}

const MetadataDictionaryTable: React.FC<MetadataDictionaryTableProps> = (
  props: MetadataDictionaryTableProps
) => {
  const { t } = useTranslation();
  const currentUser = useContext(UserContext) ?? getUserInfoFromLocalStorage();
  const { parameter, tableI18nStrings } = props;

  const buildEditCell = (
    currentValue: any,
    setValue: any,
    item: IMetadataAttributeValue
  ) => {
    return (
      <Input
        autoFocus={true}
        value={currentValue ?? item.displayValue}
        onChange={(event) => {
          setValue(event.detail.value);
        }}
        placeholder={defaultStr(t('tag.valuePlaceholder'))}
      />
    );
  };

  const getDisplayValueEditConfig = () => {
    if (isAnalystAuthorRole(currentUser?.roles)) {
      return {
        validation(item: any, value: any) {
          return !displayNameRegex.test(value)
            ? undefined
            : t('tag.invalidInput');
        },
        editingCell: (
          item: IMetadataAttributeValue,
          { setValue, currentValue }: any
        ) => buildEditCell(currentValue, setValue, item),
      };
    }
  };

  const COLUMN_DEFINITIONS = [
    {
      id: 'value',
      header: t('analytics:metadata.dictionary.tableColumnValue'),
      sortingField: 'value',
      cell: (e: IMetadataAttributeValue) => {
        return e.value;
      },
    },
    {
      id: 'displayValue',
      header: t('analytics:metadata.dictionary.tableColumnDisplayValue'),
      cell: (e: IMetadataAttributeValue) => {
        return e.displayValue;
      },
      minWidth: 180,
      editConfig: getDisplayValueEditConfig(),
    },
  ];
  const CONTENT_DISPLAY = [
    { id: 'value', visible: true },
    { id: 'displayValue', visible: true },
  ];
  const FILTERING_PROPERTIES: any[] = [
    {
      propertyLabel: t('analytics:metadata.dictionary.tableColumnValue'),
      key: 'value',
      groupValuesLabel: t('analytics:metadata.dictionary.tableColumnValue'),
      operators: TABLE_FILTER_OPTIONS,
    },
    {
      propertyLabel: t('analytics:metadata.dictionary.tableColumnDisplayValue'),
      key: 'displayValue',
      groupValuesLabel: t(
        'analytics:metadata.dictionary.tableColumnDisplayValue'
      ),
      operators: TABLE_FILTER_OPTIONS,
    },
  ];

  const [data, setData] = useState<IMetadataAttributeValue[]>(
    parameter?.values ?? []
  );
  const [itemsSnap, setItemsSnap] = useState<any[]>([]);

  const [columnDefinitions, saveWidths] = useColumnWidths(
    `Metadata-Dictionary-TableSelectFilter-Widths`,
    COLUMN_DEFINITIONS
  );

  const persistChanges = () => {
    setData(cloneDeep(data));
    setItemsSnap([]);
  };

  const {
    items,
    actions,
    collectionProps,
    paginationProps,
    propertyFilterProps,
  } = useCollection(data, {
    propertyFiltering: {
      filteringProperties: FILTERING_PROPERTIES,
      empty: <TableEmptyState resourceName="Dictionary" />,
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

  const tableCollectionProps = {
    ...collectionProps,
    onSortingChange: (event: any) => {
      if (collectionProps.onSortingChange) {
        collectionProps.onSortingChange(event);
      }
      persistChanges();
    },
  };

  const updateAttributeValue = async (attribute: IMetadataAttributeValue) => {
    try {
      if (parameter) {
        const { success, message }: ApiResponse<null> =
          await updateMetadataDisplay({
            id: `${DICTIONARY_DISPLAY_PREFIX}${parameter.projectId}#${parameter.appId}#${parameter.category}#${parameter.name}#${parameter.valueType}#${attribute.value}`,
            projectId: parameter.projectId,
            appId: parameter.appId,
            displayName: attribute.displayValue,
            description: '',
          });
        if (!success) {
          throw new Error(message);
        }
      }
    } catch (error) {
      alertMsg(t('analytics:labels.editError'), 'error');
    }
  };

  const handleSubmit = async (
    currentItem: IMetadataAttributeValue,
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
    await updateAttributeValue(newItem);
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
    <Table
      {...tableCollectionProps}
      resizableColumns={true}
      items={itemsSnap.length > 0 ? itemsSnap : items}
      loadingText={tableI18nStrings.loadingText}
      onColumnWidthsChange={saveWidths}
      columnDefinitions={columnDefinitions}
      submitEdit={handleSubmit}
      columnDisplay={CONTENT_DISPLAY}
      empty={
        <Box margin={{ vertical: 'xs' }} textAlign="center" color="inherit">
          <SpaceBetween size="m">
            <b>{tableI18nStrings.emptyText}</b>
          </SpaceBetween>
        </Box>
      }
      pagination={<Pagination {...tablePaginationProps} />}
    />
  );
};

export default MetadataDictionaryTable;
