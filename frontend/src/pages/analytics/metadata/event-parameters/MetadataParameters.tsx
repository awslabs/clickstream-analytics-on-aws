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
  Badge,
  Input,
  StatusIndicator,
} from '@cloudscape-design/components';
import {
  getMetadataParametersList,
  updateMetadataParameter,
} from 'apis/analytics';
import Navigation from 'components/layouts/Navigation';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { MetadataEventType } from 'ts/const';
import MetadataParameterSplitPanel from './MetadataParameterSplitPanel';
import MetadataTable from '../table/MetadataTable';
import { displayNameRegex, descriptionRegex } from '../table/table-config';

const MetadataParameters: React.FC = () => {
  const { pid, appid } = useParams();
  const { t } = useTranslation();

  const [showSplit, setShowSplit] = useState(false);
  const [curEventParameter, setCurEventParameter] =
    useState<IMetadataEventParameter | null>();
  const COLUMN_DEFINITIONS = [
    {
      id: 'name',
      header: t('analytics:metadata.eventParameter.tableColumnName'),
      sortingField: 'name',
      cell: (e: { name: any }) => {
        return e.name;
      },
    },
    {
      id: 'displayName',
      header: t('analytics:metadata.eventParameter.tableColumnDisplayName'),
      cell: (e: { displayName: string }) => {
        return e.displayName;
      },
      minWidth: 180,
      editConfig: {
        ariaLabel: 'Edit display name',
        errorIconAriaLabel: 'Display Name Validation Error',
        editIconAriaLabel: 'editable',
        validation(item: any, value: any) {
          return displayNameRegex.test(value) ? undefined : 'Invalid input';
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
      header: t('analytics:metadata.eventParameter.tableColumnDescription'),
      cell: (e: { description: string }) => {
        return e.description;
      },
      minWidth: 180,
      editConfig: {
        ariaLabel: 'Edit description',
        errorIconAriaLabel: 'Description Validation Error',
        editIconAriaLabel: 'editable',
        validation(item: any, value: any) {
          return descriptionRegex.test(value) ? undefined : 'Invalid input';
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
      id: 'type',
      header: t('analytics:metadata.eventParameter.tableColumnType'),
      cell: (e: { type: string }) => {
        return (
          <Badge color={e.type === MetadataEventType.CUSTOM ? 'blue' : 'grey'}>
            {e.type}
          </Badge>
        );
      },
    },
    {
      id: 'dataType',
      header: t('analytics:metadata.eventParameter.tableColumnDataType'),
      cell: (e: { dataType: string }) => {
        return e.dataType;
      },
    },
    {
      id: 'hasData',
      header: t('analytics:metadata.eventParameter.tableColumnHasData'),
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
      header: t('analytics:metadata.eventParameter.tableColumnPlatform'),
      cell: (e: { platform: string }) => {
        return e.platform;
      },
    },
    {
      id: 'source',
      header: t('analytics:metadata.eventParameter.tableColumnSource'),
      cell: (e: { source: string }) => {
        return e.source;
      },
    },
  ];
  const CONTENT_DISPLAY = [
    { id: 'name', visible: true },
    { id: 'displayName', visible: true },
    { id: 'description', visible: true },
    { id: 'type', visible: true },
    { id: 'hasData', visible: true },
    { id: 'dataType', visible: true },
    { id: 'platform', visible: true },
    { id: 'source', visible: true },
  ];
  const FILTERING_PROPERTIES = [
    {
      propertyLabel: t('analytics:metadata.eventParameter.tableColumnName'),
      key: 'name',
      groupValuesLabel: t('analytics:metadata.eventParameter.tableColumnName'),
      operators: [':', '!:', '=', '!='],
    },
    {
      propertyLabel: t(
        'analytics:metadata.eventParameter.tableColumnDisplayName'
      ),
      key: 'displayName',
      groupValuesLabel: t(
        'analytics:metadata.eventParameter.tableColumnDisplayName'
      ),
      operators: [':', '!:', '=', '!='],
    },
    {
      propertyLabel: t('analytics:metadata.eventParameter.tableColumnType'),
      key: 'type',
      groupValuesLabel: t('analytics:metadata.eventParameter.tableColumnType'),
      operators: [':', '!:', '=', '!='],
    },
    {
      propertyLabel: t('analytics:metadata.eventParameter.tableColumnHasData'),
      key: 'hasData',
      groupValuesLabel: t(
        'analytics:metadata.eventParameter.tableColumnHasData'
      ),
      operators: [':', '!:', '=', '!='],
    },
    {
      propertyLabel: t('analytics:metadata.eventParameter.tableColumnDataType'),
      key: 'dataType',
      groupValuesLabel: t(
        'analytics:metadata.eventParameter.tableColumnDataType'
      ),
      operators: [':', '!:', '=', '!='],
    },
    {
      propertyLabel: t('analytics:metadata.eventParameter.tableColumnPlatform'),
      key: 'platform',
      groupValuesLabel: t(
        'analytics:metadata.eventParameter.tableColumnPlatform'
      ),
      operators: [':', '!:', '=', '!='],
    },
    {
      propertyLabel: t('analytics:metadata.eventParameter.tableColumnSource'),
      key: 'source',
      groupValuesLabel: t(
        'analytics:metadata.eventParameter.tableColumnSource'
      ),
      operators: [':', '!:', '=', '!='],
    },
  ];

  const listMetadataEventParameters = async () => {
    try {
      if (!pid || !appid) {
        return [];
      }
      const { success, data }: ApiResponse<ResponseTableData<IMetadataEvent>> =
        await getMetadataParametersList({ pid: pid, appId: appid });
      if (success) {
        return data.items;
      }
      return [];
    } catch (error) {
      return [];
    }
  };

  const updateMetadataEventParameterInfo = async (
    newItem: IMetadataEvent | IMetadataEventParameter | IMetadataUserAttribute
  ) => {
    try {
      const { success, message }: ApiResponse<null> =
        await updateMetadataParameter(newItem as IMetadataEventParameter);
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
          resourceName="EventParameter"
          tableColumnDefinitions={COLUMN_DEFINITIONS}
          tableContentDisplay={CONTENT_DISPLAY}
          tableFilteringProperties={FILTERING_PROPERTIES}
          tableI18nStrings={{
            loadingText:
              t('analytics:metadata.eventParameter.tableLoading') || 'Loading',
            emptyText: t('analytics:metadata.eventParameter.tableEmpty'),
            headerTitle: t('analytics:metadata.eventParameter.title'),
            headerRefreshButtonText: t(
              'analytics:metadata.eventParameter.refreshButton'
            ),
            filteringAriaLabel: t(
              'analytics:metadata.eventParameter.filteringAriaLabel'
            ),
            filteringPlaceholder: t(
              'analytics:metadata.eventParameter.filteringPlaceholder'
            ),
            groupPropertiesText: t(
              'analytics:metadata.eventParameter.groupPropertiesText'
            ),
            operatorsText: t('analytics:metadata.eventParameter.operatorsText'),
            clearFiltersText: t(
              'analytics:metadata.eventParameter.clearFiltersText'
            ),
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
              setCurEventParameter(data as IMetadataEventParameter);
            }
          }}
          fetchDataFunc={listMetadataEventParameters}
          fetchUpdateFunc={updateMetadataEventParameterInfo}
        ></MetadataTable>
      }
      headerSelector="#header"
      navigation={
        <Navigation
          activeHref={`/analytics/${pid}/app/${appid}/metadata/event-parameters`}
        />
      }
      splitPanelOpen={showSplit}
      onSplitPanelToggle={(e) => {
        setShowSplit(e.detail.open);
      }}
      splitPanel={
        curEventParameter ? (
          <MetadataParameterSplitPanel parameter={curEventParameter} />
        ) : (
          ''
        )
      }
    />
  );
};

export default MetadataParameters;
