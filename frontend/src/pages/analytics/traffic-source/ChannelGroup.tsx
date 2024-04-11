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
  Button,
  ButtonDropdown,
  Header,
  Pagination,
  PropertyFilter,
  SpaceBetween,
  Table,
} from '@cloudscape-design/components';
import { cloneDeep } from 'lodash';
import {
  TableEmptyState,
  TableNoMatchState,
} from 'pages/common/common-components';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { defaultStr } from 'ts/utils';
import ChannelGroupModal from './modal/ChannelGroupModal';
import { IChannelGroup, ITrafficSource } from './reducer/trafficReducer';
import { getLngFromLocalStorage } from '../analytics-utils';

interface ChannelGroupProps {
  loading: boolean;
  state: ITrafficSource;
  overwrite: (state: ITrafficSource) => Promise<boolean>;
}

const ChannelGroup: React.FC<ChannelGroupProps> = (
  props: ChannelGroupProps
) => {
  const { state, loading, overwrite } = props;
  const { t } = useTranslation();
  const localeLng = getLngFromLocalStorage();
  const [selectedItems, setSelectedItems] = useState<IChannelGroup[]>([]);
  const [itemsSnap, setItemsSnap] = useState<any[]>([]);
  const [isReordering, setIsReordering] = useState(false);
  const [reorderState, setReorderState] = useState<ITrafficSource>(
    cloneDeep(state)
  );
  const [visible, setVisible] = useState<boolean>(false);

  const [modalType, setModalType] = useState<string>(
    defaultStr(t('analytics:metadata.trafficSource.modalType.new'))
  );

  const orderInArray = (id: string) => {
    return getChannelGroups().findIndex((e) => e.id === id) + 1;
  };

  const getChannelGroups = () => {
    return isReordering ? reorderState.channelGroups : state.channelGroups;
  };

  const headerRenderer = () => {
    if (isReordering) {
      return (
        <SpaceBetween direction="horizontal" size="xs">
          <Button
            onClick={() => {
              setIsReordering(false);
              setReorderState(cloneDeep(state));
            }}
            variant="link"
          >
            {t('button.cancel')}
          </Button>
          <Button
            variant="primary"
            loading={loading}
            onClick={async () => {
              const success = await overwrite(reorderState);
              if (success) {
                setIsReordering(false);
                setItemsSnap([]);
              }
            }}
          >
            {t('button.apply')}
          </Button>
        </SpaceBetween>
      );
    }
    return (
      <SpaceBetween direction="horizontal" size="xs">
        <Button
          onClick={() => {
            setReorderState(cloneDeep(state));
            setIsReordering(true);
          }}
        >
          {t('button.reorder')}
        </Button>
        <Button
          loading={loading}
          disabled={selectedItems.length <= 0}
          onClick={async () => {
            const newState = preDelete();
            const success = await overwrite(newState);
            if (success) {
              setSelectedItems([]);
            }
          }}
        >
          {t('button.delete')}
        </Button>
        <Button
          variant="primary"
          iconName="add-plus"
          onClick={() => {
            setModalType(
              defaultStr(t('analytics:metadata.trafficSource.modalType.new'))
            );
            setVisible(true);
          }}
        >
          {t('button.addChannelGroup')}
        </Button>
      </SpaceBetween>
    );
  };

  const cellRenderer = (item: IChannelGroup) => {
    if (isReordering) {
      return (
        <div>
          <Button
            variant="icon"
            iconName="angle-up"
            onClick={() => {
              preOrder('up', item);
            }}
          />
          <Button
            variant="icon"
            iconName="angle-down"
            onClick={() => {
              preOrder('down', item);
            }}
          />
        </div>
      );
    }
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
            id: 'reorder',
            iconName: 'upload-download',
            text: defaultStr(
              t('analytics:metadata.trafficSource.reorderAction')
            ),
          },
        ]}
        variant="icon"
        onItemClick={(e) => {
          if (e.detail.id === 'reorder') {
            setReorderState(cloneDeep(state));
            setIsReordering(true);
          } else if (e.detail.id === 'details') {
            setSelectedItems([item]);
            setModalType(
              defaultStr(t('analytics:metadata.trafficSource.modalType.edit'))
            );
            setVisible(true);
          }
        }}
      />
    );
  };

  const COLUMN_DEFINITIONS = [
    {
      id: 'order',
      header: t('analytics:metadata.trafficSource.channelGroup.columnOrder'),
      sortingField: 'order',
      cell: (e: IChannelGroup) => {
        return orderInArray(e.id);
      },
      width: 90,
    },
    {
      id: 'channel',
      header: t('analytics:metadata.trafficSource.channelGroup.columnName'),
      sortingField: 'channel',
      cell: (e: IChannelGroup) => {
        return e.channel;
      },
      width: 150,
    },
    {
      id: 'description',
      header: t(
        'analytics:metadata.trafficSource.channelGroup.columnDescription'
      ),
      cell: (e: IChannelGroup) => {
        return e.description[localeLng];
      },
      minWidth: 380,
    },
    {
      id: 'actions',
      header: t('analytics:metadata.trafficSource.channelGroup.columnActions'),
      cell: (item: IChannelGroup) => cellRenderer(item),
      width: 80,
    },
  ];

  const CONTENT_DISPLAY = [
    { id: 'order', visible: true },
    { id: 'channel', visible: true },
    { id: 'description', visible: true },
    { id: 'actions', visible: true },
  ];

  const FILTERING_PROPERTIES = [
    {
      propertyLabel: t(
        'analytics:metadata.trafficSource.channelGroup.columnName'
      ),
      key: 'channel',
      groupValuesLabel: t(
        'analytics:metadata.trafficSource.channelGroup.columnName'
      ),
      operators: [':', '!:', '=', '!='],
    },
    {
      propertyLabel: t(
        'analytics:metadata.trafficSource.channelGroup.columnDescription'
      ),
      key: 'description',
      groupValuesLabel: t(
        'analytics:metadata.trafficSource.channelGroup.columnDescription'
      ),
      operators: [':', '!:', '=', '!='],
    },
  ];

  const preOrder = (order: string, item: IChannelGroup) => {
    const cloneState = cloneDeep(reorderState);
    const index = cloneState.channelGroups.findIndex((e) => e.id === item.id);
    if (index === 0 && order === 'up') {
      return cloneState;
    }
    if (index === cloneState.channelGroups.length - 1 && order === 'down') {
      return cloneState;
    }
    const swapIndex = order === 'up' ? index - 1 : index + 1;
    const newChannelGroups = [...cloneState.channelGroups];
    // swap array elements index and swapIndex
    [newChannelGroups[index], newChannelGroups[swapIndex]] = [
      newChannelGroups[swapIndex],
      newChannelGroups[index],
    ];
    const newState = { ...cloneState, channelGroups: newChannelGroups };
    setReorderState(newState);
    return newState;
  };

  const preDelete = () => {
    const cloneState = cloneDeep(state);
    const newChannelGroups = cloneState.channelGroups.filter(
      (item) => item.id !== selectedItems[0].id
    );
    const newState = { ...cloneState, channelGroups: newChannelGroups };
    return newState;
  };

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
  } = useCollection(getChannelGroups(), {
    propertyFiltering: {
      filteringProperties: FILTERING_PROPERTIES,
      empty: (
        <TableEmptyState
          resourceName={t(
            'analytics:metadata.trafficSource.channelGroup.title'
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
            t('analytics:metadata.trafficSource.channelGroup.loadingText')
          )}
          selectionType="single"
          trackBy="id"
          stripedRows
          filter={
            <PropertyFilter
              {...tableFilterProps}
              i18nStrings={{
                filteringAriaLabel: defaultStr(
                  t(
                    'analytics:metadata.trafficSource.channelGroup.filteringAriaLabel'
                  )
                ),
                filteringPlaceholder: defaultStr(
                  t(
                    'analytics:metadata.trafficSource.channelGroup.filteringPlaceholder'
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
          header={
            <Header
              description={t(
                'analytics:metadata.trafficSource.channelGroup.description'
              )}
              actions={headerRenderer()}
              counter={
                !loading &&
                collectionProps.selectedItems &&
                collectionProps.selectedItems?.length > 0
                  ? `(${collectionProps.selectedItems.length}/${
                      getChannelGroups().length
                    })`
                  : `(${getChannelGroups().length})`
              }
            >
              {t('analytics:metadata.trafficSource.channelGroup.title')}
            </Header>
          }
          pagination={<Pagination {...tablePaginationProps} />}
        />
      </div>
      <ChannelGroupModal
        state={state}
        overwrite={overwrite}
        loading={loading}
        visible={visible}
        setVisible={setVisible}
        modalType={modalType}
        selectedItems={selectedItems}
        setSelectedItems={setSelectedItems}
      />
    </SpaceBetween>
  );
};

export default ChannelGroup;
