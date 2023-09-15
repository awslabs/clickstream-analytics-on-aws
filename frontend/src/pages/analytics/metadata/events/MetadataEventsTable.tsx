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
  Input,
  StatusIndicator,
} from '@cloudscape-design/components';
import { getMetadataEventsList, updateMetadataDisplay } from 'apis/analytics';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { EVENT_DISPLAY_PREFIX } from 'ts/const';
import { MetadataPlatform, MetadataSource } from 'ts/explore-types';
import MetadataDataVolumeFC from '../comps/MetadataDataVolume';
import MetadataPlatformFC from '../comps/MetadataPlatform';
import MetadataSourceFC from '../comps/MetadataSource';
import MetadataTable from '../table/MetadataTable';
import { descriptionRegex, displayNameRegex } from '../table/table-config';

interface MetadataEventsTableProps {
  setShowDetails: (show: boolean, data?: IMetadataType) => void;
}

const MetadataEventsTable: React.FC<MetadataEventsTableProps> = (
  props: MetadataEventsTableProps
) => {
  const { projectId, appId } = useParams();
  const { t } = useTranslation();
  const { setShowDetails } = props;

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
        validation(item: any, value: any) {
          return !displayNameRegex.test(value)
            ? undefined
            : t('tag.invalidInput');
        },
        editingCell: (
          item: { displayName: string },
          { setValue, currentValue }: any
        ) => {
          return (
            <Input
              autoFocus={true}
              value={currentValue ?? item.displayName}
              onChange={(event) => {
                setValue(event.detail.value);
              }}
              placeholder={t('tag.valuePlaceholder') ?? ''}
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
      minWidth: 180,
      editConfig: {
        validation(item: any, value: any) {
          return !descriptionRegex.test(value)
            ? undefined
            : t('tag.invalidInput');
        },
        editingCell: (
          item: { description: string },
          { setValue, currentValue }: any
        ) => {
          return (
            <Input
              autoFocus={true}
              value={currentValue ?? item.description}
              onChange={(event) => {
                setValue(event.detail.value);
              }}
              placeholder={t('tag.valuePlaceholder') ?? ''}
            />
          );
        },
      },
    },
    {
      id: 'metadataSource',
      header: t('analytics:metadata.event.tableColumnMetadataSource'),
      sortingField: 'metadataSource',
      cell: (e: { metadataSource: MetadataSource }) => {
        return <MetadataSourceFC source={e.metadataSource} />;
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
      cell: (e: { platform: MetadataPlatform[] }) => {
        return <MetadataPlatformFC platform={e.platform} />;
      },
    },
    {
      id: 'dataVolumeLastDay',
      header: t('analytics:metadata.event.tableColumnDataVolumeLastDay'),
      sortingField: 'dataVolumeLastDay',
      cell: (e: { dataVolumeLastDay: number }) => {
        return <MetadataDataVolumeFC dataVolume={e.dataVolumeLastDay} />;
      },
    },
  ];
  const CONTENT_DISPLAY = [
    { id: 'name', visible: true },
    { id: 'displayName', visible: true },
    { id: 'description', visible: true },
    { id: 'metadataSource', visible: true },
    { id: 'hasData', visible: true },
    { id: 'platform', visible: true },
    { id: 'dataVolumeLastDay', visible: true },
  ];
  const FILTERING_PROPERTIES = [
    {
      propertyLabel: t('analytics:metadata.event.tableColumnName'),
      key: 'name',
      groupValuesLabel: t('analytics:metadata.event.tableColumnName'),
      operators: [':', '!:', '=', '!='],
    },
    {
      propertyLabel: t('analytics:metadata.event.tableColumnDisplayName'),
      key: 'displayName',
      groupValuesLabel: t('analytics:metadata.event.tableColumnDisplayName'),
      operators: [':', '!:', '=', '!='],
    },
    {
      propertyLabel: t('analytics:metadata.event.tableColumnMetadataSource'),
      key: 'metadataSource',
      groupValuesLabel: t('analytics:metadata.event.tableColumnMetadataSource'),
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
  ];

  const listMetadataEvents = async () => {
    try {
      if (!projectId || !appId) {
        return [];
      }
      const { success, data }: ApiResponse<ResponseTableData<IMetadataEvent>> =
        await getMetadataEventsList({ projectId, appId });
      if (success) {
        return data.items;
      }
      return [];
    } catch (error) {
      return [];
    }
  };

  const updateMetadataEventInfo = async (newItem: IMetadataType) => {
    try {
      const { success, message }: ApiResponse<null> =
        await updateMetadataDisplay({
          id: `${EVENT_DISPLAY_PREFIX}${newItem.projectId}#${newItem.appId}#${newItem.name}`,
          projectId: newItem.projectId,
          appId: newItem.appId,
          displayName: newItem.displayName,
          description: newItem.description,
        });
      if (!success) {
        throw new Error(message);
      }
    } catch (error) {
      throw new Error('Edit error');
    }
  };

  return (
    <MetadataTable
      resourceName="Event"
      tableColumnDefinitions={COLUMN_DEFINITIONS}
      tableContentDisplay={CONTENT_DISPLAY}
      tableFilteringProperties={FILTERING_PROPERTIES}
      tableI18nStrings={{
        loadingText: t('analytics:metadata.event.tableLoading') || 'Loading',
        emptyText: t('analytics:metadata.event.tableEmpty'),
        headerTitle: t('analytics:metadata.event.title'),
        headerDescription: t('analytics:metadata.event.description'),
        headerRefreshButtonText: t('common:button.refreshMetadata'),
        filteringAriaLabel: t('analytics:metadata.event.filteringAriaLabel'),
        filteringPlaceholder: t(
          'analytics:metadata.event.filteringPlaceholder'
        ),
        groupPropertiesText: t('button.groupPropertiesText'),
        operatorsText: t('button.operatorsText'),
        clearFiltersText: t('button.clearFiltersText'),
        applyActionText: t('button.applyActionText'),
        useText: t('common:table.useText'),
        matchText: t('common:table.matchText'),
        matchesText: t('common:table.matchesText'),
      }}
      loadHelpPanelContent={() => {
        console.log(1);
      }}
      setShowDetails={setShowDetails}
      fetchDataFunc={listMetadataEvents}
      fetchUpdateFunc={updateMetadataEventInfo}
    ></MetadataTable>
  );
};

export default MetadataEventsTable;
