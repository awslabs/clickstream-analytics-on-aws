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
  SpaceBetween,
  Header,
  Button,
  Table,
  Pagination,
  PropertyFilter,
  ButtonDropdown,
} from '@cloudscape-design/components';
import { trafficSourceAction } from 'apis/traffic';
import {
  TableEmptyState,
  TableNoMatchState,
} from 'pages/common/common-components';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TABLE_FILTER_OPTIONS } from 'ts/const';
import { defaultStr } from 'ts/utils';
import { TrafficSourceModalType } from './TrafficSourceHome';
import SourceCategoryModal from './modal/SourceCategoryModal';
import {
  ISourceCategory,
  ITrafficSource,
  ITrafficSourceAction,
  TrafficSourceAction,
} from './reducer/trafficReducer';

interface SourceCategoryProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  state: ITrafficSource;
  dispatch: React.Dispatch<TrafficSourceAction>;
}

const CONTENT_DISPLAY = [
  { id: 'url', visible: true },
  { id: 'source', visible: true },
  { id: 'category', visible: true },
  { id: 'pattern', visible: true },
  { id: 'actions', visible: true },
];

const SourceCategory: React.FC<SourceCategoryProps> = (
  props: SourceCategoryProps
) => {
  const { state, loading, setLoading, dispatch } = props;
  const { t } = useTranslation();
  const [selectedItems, setSelectedItems] = useState<ISourceCategory[]>([]);
  const [itemsSnap, setItemsSnap] = useState<any[]>([]);
  const [visible, setVisible] = useState<boolean>(false);

  const [modalType, setModalType] = useState<TrafficSourceModalType>(
    TrafficSourceModalType.NEW
  );

  const cellRenderer = (item: ISourceCategory) => {
    return (
      <ButtonDropdown
        items={[
          {
            id: 'details',
            iconName: 'status-info',
            text: defaultStr(
              t('analytics:metadata.trafficSource.detailAction')
            ),
          },
          {
            id: 'copy',
            iconName: 'copy',
            text: defaultStr(t('analytics:metadata.trafficSource.copyAction')),
          },
        ]}
        variant="icon"
        onItemClick={(e) => {
          if (e.detail.id === 'details') {
            setModalType(TrafficSourceModalType.DETAIL);
          } else if (e.detail.id === 'copy') {
            setModalType(TrafficSourceModalType.COPY);
          }
          setSelectedItems([item]);
          setVisible(true);
        }}
      />
    );
  };

  const textRenderer = (text: string) => {
    return (
      <div className="cs-analytics-traffic-overflow" title={text}>
        {text}
      </div>
    );
  };

  const actionDelete = async () => {
    setLoading(true);
    try {
      const category = selectedItems[0];
      const { success }: ApiResponse<any> = await trafficSourceAction({
        action: ITrafficSourceAction.DELETE,
        projectId: state.projectId,
        appId: state.appId,
        sourceCategory: category,
      });
      if (success) {
        dispatch({ type: 'DeleteItem', category });
        setItemsSnap([]);
        setSelectedItems([]);
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  const COLUMN_DEFINITIONS = [
    {
      id: 'url',
      header: t('analytics:metadata.trafficSource.sourceCategory.columnDomain'),
      sortingField: 'url',
      cell: (e: ISourceCategory) => {
        return textRenderer(e.url);
      },
    },
    {
      id: 'source',
      header: t('analytics:metadata.trafficSource.sourceCategory.columnName'),
      sortingField: 'source',
      cell: (e: ISourceCategory) => {
        return textRenderer(e.source);
      },
    },
    {
      id: 'category',
      header: t(
        'analytics:metadata.trafficSource.sourceCategory.columnCategory'
      ),
      sortingField: 'category',
      cell: (e: ISourceCategory) => {
        return e.category;
      },
    },
    {
      id: 'pattern',
      header: t(
        'analytics:metadata.trafficSource.sourceCategory.columnPattern'
      ),
      sortingField: 'pattern',
      cell: (e: ISourceCategory) => {
        return e.params.join(', ');
      },
    },
    {
      id: 'actions',
      header: t(
        'analytics:metadata.trafficSource.sourceCategory.columnActions'
      ),
      cell: (item: ISourceCategory) => cellRenderer(item),
      width: 100,
    },
  ];

  const FILTERING_PROPERTIES = [
    {
      propertyLabel: t(
        'analytics:metadata.trafficSource.sourceCategory.columnDomain'
      ),
      key: 'url',
      groupValuesLabel: t(
        'analytics:metadata.trafficSource.sourceCategory.columnDomain'
      ),
      operators: TABLE_FILTER_OPTIONS,
    },
    {
      propertyLabel: t(
        'analytics:metadata.trafficSource.sourceCategory.columnName'
      ),
      key: 'source',
      groupValuesLabel: t(
        'analytics:metadata.trafficSource.sourceCategory.columnName'
      ),
      operators: TABLE_FILTER_OPTIONS,
    },
    {
      propertyLabel: t(
        'analytics:metadata.trafficSource.sourceCategory.columnCategory'
      ),
      key: 'category',
      groupValuesLabel: t(
        'analytics:metadata.trafficSource.sourceCategory.columnCategory'
      ),
      operators: TABLE_FILTER_OPTIONS,
    },
  ];

  const persistChanges = () => {
    setItemsSnap([]);
  };

  const {
    items,
    actions,
    filteredItemsCount,
    collectionProps,
    paginationProps,
    propertyFilterProps,
  } = useCollection(state.sourceCategories, {
    propertyFiltering: {
      filteringProperties: FILTERING_PROPERTIES,
      empty: (
        <TableEmptyState
          resourceName={t(
            'analytics:metadata.trafficSource.sourceCategory.title'
          )}
        />
      ),
      noMatch: (
        <TableNoMatchState
          onClearFilter={() => {
            actions.setPropertyFiltering({ tokens: [], operation: 'and' });
          }}
        />
      ),
    },
    pagination: { pageSize: 10 },
    sorting: { defaultState: { sortingColumn: COLUMN_DEFINITIONS[0] } },
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

  return (
    <SpaceBetween direction="vertical" size="l">
      <div className="cs-analytics-traffic-table">
        <Table
          {...tableCollectionProps}
          resizableColumns={true}
          items={itemsSnap.length > 0 ? itemsSnap : items}
          onSelectionChange={({ detail }) =>
            setSelectedItems(detail.selectedItems)
          }
          selectedItems={selectedItems}
          columnDefinitions={COLUMN_DEFINITIONS}
          columnDisplay={CONTENT_DISPLAY}
          loading={state.appId === ''}
          loadingText={defaultStr(
            t('analytics:metadata.trafficSource.sourceCategory.loadingText')
          )}
          selectionType="single"
          trackBy="url"
          filter={
            <PropertyFilter
              {...tableFilterProps}
              i18nStrings={{
                filteringAriaLabel: defaultStr(
                  t(
                    'analytics:metadata.trafficSource.sourceCategory.filteringAriaLabel'
                  )
                ),
                filteringPlaceholder: defaultStr(
                  t(
                    'analytics:metadata.trafficSource.sourceCategory.filteringPlaceholder'
                  )
                ),
                groupPropertiesText: defaultStr(
                  t('button.groupPropertiesText')
                ),
                operatorsText: defaultStr(t('button.operatorsText')),
                clearFiltersText: defaultStr(t('button.clearFiltersText')),
                applyActionText: defaultStr(t('button.applyActionText')),
                enteredTextLabel: (value) => {
                  return `${defaultStr(t('common:table.useText'))}: ${value}`;
                },
              }}
              countText={`${filteredItemsCount} ${
                filteredItemsCount === 1
                  ? t('common:table.matchText')
                  : t('common:table.matchesText')
              }`}
              expandToViewport={true}
            />
          }
          stickyColumns={{ first: 0, last: 1 }}
          stripedRows
          header={
            <Header
              description={t(
                'analytics:metadata.trafficSource.sourceCategory.description'
              )}
              actions={
                <SpaceBetween direction="horizontal" size="xs">
                  <Button
                    loading={loading}
                    disabled={selectedItems.length <= 0}
                    onClick={() => {
                      actionDelete();
                    }}
                  >
                    {t('button.delete')}
                  </Button>
                  <Button
                    variant="primary"
                    iconName="add-plus"
                    onClick={() => {
                      setModalType(TrafficSourceModalType.NEW);
                      setVisible(true);
                    }}
                  >
                    {t('button.addSourceCategory')}
                  </Button>
                </SpaceBetween>
              }
              counter={
                !loading &&
                collectionProps.selectedItems &&
                collectionProps.selectedItems?.length > 0
                  ? `(${collectionProps.selectedItems.length}/${state.sourceCategories.length})`
                  : `(${state.sourceCategories.length})`
              }
            >
              {t('analytics:metadata.trafficSource.sourceCategory.title')}
            </Header>
          }
          pagination={<Pagination {...tablePaginationProps} />}
        />
      </div>
      <SourceCategoryModal
        state={state}
        loading={loading}
        setLoading={setLoading}
        dispatch={dispatch}
        visible={visible}
        setVisible={setVisible}
        modalType={modalType}
        selectedItems={selectedItems}
        setSelectedItems={setSelectedItems}
      />
    </SpaceBetween>
  );
};

export default SourceCategory;
