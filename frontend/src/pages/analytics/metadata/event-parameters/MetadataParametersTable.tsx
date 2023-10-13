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

import { Input, StatusIndicator } from '@cloudscape-design/components';
import {
  getMetadataParametersList,
  updateMetadataDisplay,
} from 'apis/analytics';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { EVENT_PARAMETER_DISPLAY_PREFIX } from 'ts/const';
import MetadataPlatformFC from '../comps/MetadataPlatform';
import MetadataSourceFC from '../comps/MetadataSource';
import MetadataTable from '../table/MetadataTable';
import { displayNameRegex, descriptionRegex } from '../table/table-config';

interface MetadataParametersTableProps {
  setShowDetails: (show: boolean, data?: IMetadataType) => void;
}

const MetadataParametersTable: React.FC<MetadataParametersTableProps> = (
  props: MetadataParametersTableProps
) => {
  const { projectId, appId } = useParams();
  const { setShowDetails } = props;

  const { t } = useTranslation();

  const renderEditNameCell = (
    item: IMetadataEventParameter,
    setValue: any,
    currentValue: string
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
  };

  const renderEditDescCell = (
    item: IMetadataEventParameter,
    setValue: any,
    currentValue: string
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
  };

  const renderDataSource = (e: IMetadataEventParameter) => {
    return <MetadataSourceFC source={e.metadataSource} />;
  };

  const renderHasData = (e: IMetadataEventParameter) => {
    return (
      <StatusIndicator type={e.hasData ? 'success' : 'stopped'}>
        {e.hasData ? 'Yes' : 'No'}
      </StatusIndicator>
    );
  };

  const renderPlatform = (e: IMetadataEventParameter) => {
    return <MetadataPlatformFC platform={e.platform} />;
  };

  const COLUMN_DEFINITIONS = [
    {
      id: 'name',
      header: t('analytics:metadata.eventParameter.tableColumnName'),
      sortingField: 'name',
      cell: (e: IMetadataEventParameter) => {
        return e.name;
      },
    },
    {
      id: 'displayName',
      header: t('analytics:metadata.eventParameter.tableColumnDisplayName'),
      cell: (e: IMetadataEventParameter) => {
        return e.displayName;
      },
      minWidth: 180,
      editConfig: {
        validation(item: IMetadataEventParameter, value: string) {
          return !displayNameRegex.test(value)
            ? undefined
            : t('tag.invalidInput');
        },
        editingCell: (
          item: IMetadataEventParameter,
          { setValue, currentValue }: any
        ) => renderEditNameCell(item, setValue, currentValue),
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
        validation(item: any, value: any) {
          return !descriptionRegex.test(value)
            ? undefined
            : t('tag.invalidInput');
        },
        editingCell: (
          item: IMetadataEventParameter,
          { setValue, currentValue }: any
        ) => renderEditDescCell(item, setValue, currentValue),
      },
    },
    {
      id: 'metadataSource',
      header: t('analytics:metadata.eventParameter.tableColumnMetadataSource'),
      cell: (e: IMetadataEventParameter) => renderDataSource(e),
    },
    {
      id: 'parameterType',
      header: t('analytics:metadata.eventParameter.tableColumnParameterType'),
      cell: (e: IMetadataEventParameter) => {
        return e.parameterType;
      },
    },
    {
      id: 'valueType',
      header: t('analytics:metadata.eventParameter.tableColumnDataType'),
      cell: (e: IMetadataEventParameter) => {
        return e.valueType;
      },
    },
    {
      id: 'hasData',
      header: t('analytics:metadata.eventParameter.tableColumnHasData'),
      cell: (e: IMetadataEventParameter) => renderHasData(e),
    },
    {
      id: 'platform',
      header: t('analytics:metadata.eventParameter.tableColumnPlatform'),
      cell: (e: IMetadataEventParameter) => renderPlatform(e),
    },
  ];
  const CONTENT_DISPLAY = [
    { id: 'name', visible: true },
    { id: 'displayName', visible: true },
    { id: 'description', visible: true },
    { id: 'metadataSource', visible: true },
    { id: 'parameterType', visible: true },
    { id: 'hasData', visible: true },
    { id: 'valueType', visible: true },
    { id: 'platform', visible: true },
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
      propertyLabel: t(
        'analytics:metadata.eventParameter.tableColumnMetadataSource'
      ),
      key: 'metadataSource',
      groupValuesLabel: t(
        'analytics:metadata.eventParameter.tableColumnMetadataSource'
      ),
      operators: [':', '!:', '=', '!='],
    },
    {
      propertyLabel: t(
        'analytics:metadata.eventParameter.tableColumnParameterType'
      ),
      key: 'parameterType',
      groupValuesLabel: t(
        'analytics:metadata.eventParameter.tableColumnParameterType'
      ),
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
      key: 'valueType',
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
  ];

  const listMetadataEventParameters = async () => {
    try {
      if (!projectId || !appId) {
        return [];
      }
      const { success, data }: ApiResponse<ResponseTableData<IMetadataEvent>> =
        await getMetadataParametersList({ projectId, appId });
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
        await updateMetadataDisplay({
          id: `${EVENT_PARAMETER_DISPLAY_PREFIX}${newItem.projectId}#${newItem.appId}#${newItem.name}`,
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
      resourceName="EventParameter"
      tableColumnDefinitions={COLUMN_DEFINITIONS}
      tableContentDisplay={CONTENT_DISPLAY}
      tableFilteringProperties={FILTERING_PROPERTIES}
      tableI18nStrings={{
        infoContent:
          t('analytics:information.metadataEventParametersInfo') ?? '',
        loadingText: t('analytics:labels.tableLoading') || 'Loading',
        emptyText: t('analytics:labels.tableEmpty'),
        headerTitle: t('analytics:metadata.eventParameter.title'),
        headerDescription: t('analytics:metadata.eventParameter.description'),
        headerRefreshButtonText: t('common:button.refreshMetadata'),
        filteringAriaLabel: t(
          'analytics:metadata.eventParameter.filteringAriaLabel'
        ),
        filteringPlaceholder: t(
          'analytics:metadata.eventParameter.filteringPlaceholder'
        ),
        groupPropertiesText: t('button.groupPropertiesText'),
        operatorsText: t('button.operatorsText'),
        clearFiltersText: t('button.clearFiltersText'),
        applyActionText: t('button.applyActionText'),
        useText: t('common:table.useText'),
        matchText: t('common:table.matchText'),
        matchesText: t('common:table.matchesText'),
      }}
      setShowDetails={setShowDetails}
      fetchDataFunc={listMetadataEventParameters}
      fetchUpdateFunc={updateMetadataEventParameterInfo}
    ></MetadataTable>
  );
};

export default MetadataParametersTable;
