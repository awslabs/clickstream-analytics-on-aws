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
  AppLayout,
  Input,
  StatusIndicator,
} from '@cloudscape-design/components';
import { getMetadataEventsList, updateMetadataEvent } from 'apis/analytics';
import Navigation from 'components/layouts/Navigation';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { MetadataPlatform, MetadataSource } from 'ts/explore-types-ln';
import MetadataEventSplitPanel from './MetadataEventSplitPanel';
import MetadataDataVolumeFC from '../comps/MetadataDataVolume';
import MetadataPlatformFC from '../comps/MetadataPlatform';
import MetadataSourceFC from '../comps/MetadataSource';
import MetadataTable from '../table/MetadataTable';
import { descriptionRegex, displayNameRegex } from '../table/table-config';

const MetadataEvents: React.FC = () => {
  const { projectId, appId } = useParams();
  const { t } = useTranslation();

  const [showSplit, setShowSplit] = useState(false);
  const [curEvent, setCurEvent] = useState<IMetadataEvent | null>();
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
        ariaLabel: 'Edit display name',
        errorIconAriaLabel: 'Display Name Validation Error',
        editIconAriaLabel: 'editable',
        validation(item: any, value: any) {
          return !displayNameRegex.test(value) ? undefined : 'Invalid input';
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
      minWidth: 180,
      editConfig: {
        ariaLabel: 'Edit description',
        errorIconAriaLabel: 'Description Validation Error',
        editIconAriaLabel: 'editable',
        validation(item: any, value: any) {
          return !descriptionRegex.test(value) ? undefined : 'Invalid input';
        },
        editingCell: (
          item: { description: string },
          { setValue, currentValue }: any
        ) => {
          return (
            <Input
              autoFocus={true}
              ariaLabel="Edit description"
              value={currentValue ?? item.description}
              onChange={(event) => {
                setValue(event.detail.value);
              }}
              placeholder="Enter description"
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

  const updateMetadataEventInfo = async (
    newItem: IMetadataEvent | IMetadataEventParameter | IMetadataUserAttribute
  ) => {
    try {
      const { success, message }: ApiResponse<null> = await updateMetadataEvent(
        newItem as IMetadataEvent
      );
      if (!success) {
        throw new Error(message);
      }
    } catch (error) {
      throw new Error('Edit error');
    }
  };

  return (
    <AppLayout
      toolsHide
      content={
        <MetadataTable
          resourceName="Event"
          tableColumnDefinitions={COLUMN_DEFINITIONS}
          tableContentDisplay={CONTENT_DISPLAY}
          tableFilteringProperties={FILTERING_PROPERTIES}
          tableI18nStrings={{
            loadingText:
              t('analytics:metadata.event.tableLoading') || 'Loading',
            emptyText: t('analytics:metadata.event.tableEmpty'),
            headerTitle: t('analytics:metadata.event.title'),
            headerRefreshButtonText: t('common:button.refreshMetadata'),
            filteringAriaLabel: t(
              'analytics:metadata.event.filteringAriaLabel'
            ),
            filteringPlaceholder: t(
              'analytics:metadata.event.filteringPlaceholder'
            ),
            groupPropertiesText: t(
              'analytics:metadata.event.groupPropertiesText'
            ),
            operatorsText: t('analytics:metadata.event.operatorsText'),
            clearFiltersText: t('analytics:metadata.event.clearFiltersText'),
            useText: t('common:table.useText'),
            matchText: t('common:table.matchText'),
            matchesText: t('common:table.matchesText'),
          }}
          loadHelpPanelContent={() => {
            console.log(1);
          }}
          setShowDetails={(
            show: boolean,
            data?:
              | IMetadataEvent
              | IMetadataEventParameter
              | IMetadataUserAttribute
          ) => {
            setShowSplit(show);
            if (data) {
              setCurEvent(data as IMetadataEvent);
            }
          }}
          fetchDataFunc={listMetadataEvents}
          fetchUpdateFunc={updateMetadataEventInfo}
        ></MetadataTable>
      }
      headerSelector="#header"
      navigation={
        <Navigation
          activeHref={`/analytics/${projectId}/app/${appId}/metadata/events`}
        />
      }
      splitPanelOpen={showSplit}
      onSplitPanelToggle={(e) => {
        setShowSplit(e.detail.open);
      }}
      splitPanel={curEvent ? <MetadataEventSplitPanel event={curEvent} /> : ''}
    />
  );
};

export default MetadataEvents;
