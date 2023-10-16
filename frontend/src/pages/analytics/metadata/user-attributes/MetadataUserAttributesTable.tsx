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
  getMetadataUserAttributesList,
  updateMetadataDisplay,
} from 'apis/analytics';
import { t } from 'i18next';
import React from 'react';
import { useParams } from 'react-router-dom';
import { USER_ATTRIBUTE_DISPLAY_PREFIX } from 'ts/const';
import { MetadataSource } from 'ts/explore-types';
import MetadataSourceFC from '../comps/MetadataSource';
import MetadataTable from '../table/MetadataTable';
import { displayNameRegex, descriptionRegex } from '../table/table-config';

interface IAttributeTableItem {
  name: string;
  displayName: string;
  description: string;
  metadataSource: MetadataSource;
  valueType: string;
  hasData: boolean;
}

interface MetadataUserAttributesTableProps {
  setShowDetails: (show: boolean, data?: IMetadataType) => void;
}

const MetadataUserAttributesTable: React.FC<
  MetadataUserAttributesTableProps
> = (props: MetadataUserAttributesTableProps) => {
  const { projectId, appId } = useParams();
  const { setShowDetails } = props;

  const renderEditNameCell = (
    item: IAttributeTableItem,
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
    item: IAttributeTableItem,
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

  const renderDataSource = (e: IAttributeTableItem) => {
    return <MetadataSourceFC source={e.metadataSource} />;
  };

  const renderHasData = (e: IAttributeTableItem) => {
    return (
      <StatusIndicator type={e.hasData ? 'success' : 'stopped'}>
        {e.hasData ? 'Yes' : 'No'}
      </StatusIndicator>
    );
  };

  const COLUMN_DEFINITIONS = [
    {
      id: 'name',
      header: t('analytics:metadata.userAttribute.tableColumnName'),
      sortingField: 'name',
      cell: (e: IAttributeTableItem) => {
        return e.name;
      },
    },
    {
      id: 'displayName',
      header: t('analytics:metadata.userAttribute.tableColumnDisplayName'),
      cell: (e: IAttributeTableItem) => {
        return e.displayName;
      },
      minWidth: 180,
      editConfig: {
        validation(item: IAttributeTableItem, value: any) {
          return !displayNameRegex.test(value)
            ? undefined
            : t('tag.invalidInput');
        },
        editingCell: (
          item: IAttributeTableItem,
          { setValue, currentValue }: any
        ) => renderEditNameCell(item, setValue, currentValue),
      },
    },
    {
      id: 'description',
      header: t('analytics:metadata.userAttribute.tableColumnDescription'),
      cell: (e: IAttributeTableItem) => {
        return e.description;
      },
      minWidth: 180,
      editConfig: {
        validation(item: IAttributeTableItem, value: any) {
          return !descriptionRegex.test(value)
            ? undefined
            : t('tag.invalidInput');
        },
        editingCell: (
          item: IAttributeTableItem,
          { setValue, currentValue }: any
        ) => renderEditDescCell(item, setValue, currentValue),
      },
    },
    {
      id: 'metadataSource',
      header: t('analytics:metadata.userAttribute.tableColumnMetadataSource'),
      cell: (e: IAttributeTableItem) => renderDataSource(e),
    },
    {
      id: 'valueType',
      header: t('analytics:metadata.userAttribute.tableColumnDataType'),
      cell: (e: IAttributeTableItem) => {
        return e.valueType;
      },
    },
    {
      id: 'hasData',
      header: t('analytics:metadata.userAttribute.tableColumnHasData'),
      cell: (e: IAttributeTableItem) => renderHasData(e),
    },
  ];
  const CONTENT_DISPLAY = [
    { id: 'name', visible: true },
    { id: 'displayName', visible: true },
    { id: 'description', visible: true },
    { id: 'metadataSource', visible: true },
    { id: 'hasData', visible: true },
    { id: 'valueType', visible: true },
    { id: 'platform', visible: true },
  ];
  const FILTERING_PROPERTIES = [
    {
      propertyLabel: t('analytics:metadata.userAttribute.tableColumnName'),
      key: 'name',
      groupValuesLabel: t('analytics:metadata.userAttribute.tableColumnName'),
      operators: [':', '!:', '=', '!='],
    },
    {
      propertyLabel: t(
        'analytics:metadata.userAttribute.tableColumnDisplayName'
      ),
      key: 'displayName',
      groupValuesLabel: t(
        'analytics:metadata.userAttribute.tableColumnDisplayName'
      ),
      operators: [':', '!:', '=', '!='],
    },
    {
      propertyLabel: t(
        'analytics:metadata.userAttribute.tableColumnMetadataSource'
      ),
      key: 'metadataSource',
      groupValuesLabel: t(
        'analytics:metadata.userAttribute.tableColumnMetadataSource'
      ),
      operators: [':', '!:', '=', '!='],
    },
    {
      propertyLabel: t('analytics:metadata.userAttribute.tableColumnHasData'),
      key: 'hasData',
      groupValuesLabel: t(
        'analytics:metadata.userAttribute.tableColumnHasData'
      ),
      operators: [':', '!:', '=', '!='],
    },
    {
      propertyLabel: t('analytics:metadata.userAttribute.tableColumnDataType'),
      key: 'valueType',
      groupValuesLabel: t(
        'analytics:metadata.userAttribute.tableColumnDataType'
      ),
      operators: [':', '!:', '=', '!='],
    },
    {
      propertyLabel: t('analytics:metadata.userAttribute.tableColumnPlatform'),
      key: 'platform',
      groupValuesLabel: t(
        'analytics:metadata.userAttribute.tableColumnPlatform'
      ),
      operators: [':', '!:', '=', '!='],
    },
  ];

  const listMetadataUserAttributes = async () => {
    try {
      if (!projectId || !appId) {
        return [];
      }
      const {
        success,
        data,
      }: ApiResponse<ResponseTableData<IMetadataUserAttribute>> =
        await getMetadataUserAttributesList({ projectId, appId });
      if (success) {
        return data.items;
      }
      return [];
    } catch (error) {
      return [];
    }
  };

  const updateMetadataUserAttributeInfo = async (
    newItem: IMetadataEvent | IMetadataEventParameter | IMetadataUserAttribute
  ) => {
    try {
      const attribute = newItem as IMetadataUserAttribute;
      const { success, message }: ApiResponse<null> =
        await updateMetadataDisplay({
          id: `${USER_ATTRIBUTE_DISPLAY_PREFIX}${attribute.projectId}#${attribute.appId}#${attribute.name}#${attribute.valueType}`,
          projectId: attribute.projectId,
          appId: attribute.appId,
          displayName: attribute.displayName,
          description: attribute.description,
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
      resourceName="UserAttribute"
      tableColumnDefinitions={COLUMN_DEFINITIONS}
      tableContentDisplay={CONTENT_DISPLAY}
      tableFilteringProperties={FILTERING_PROPERTIES}
      tableI18nStrings={{
        infoContent:
          t('analytics:information.metadataUserAttributesInfo') ?? '',
        loadingText: t('analytics:labels.tableLoading') || 'Loading',
        emptyText: t('analytics:labels.tableEmpty'),
        headerTitle: t('analytics:metadata.userAttribute.title'),
        headerDescription: t('analytics:metadata.userAttribute.description'),
        headerRefreshButtonText: t('common:button.refreshMetadata'),
        filteringAriaLabel: t(
          'analytics:metadata.userAttribute.filteringAriaLabel'
        ),
        filteringPlaceholder: t(
          'analytics:metadata.userAttribute.filteringPlaceholder'
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
      fetchDataFunc={listMetadataUserAttributes}
      fetchUpdateFunc={updateMetadataUserAttributeInfo}
    ></MetadataTable>
  );
};

export default MetadataUserAttributesTable;
