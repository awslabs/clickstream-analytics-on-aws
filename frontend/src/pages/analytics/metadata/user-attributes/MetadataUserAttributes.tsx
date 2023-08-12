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
import {
  getMetadataUserAttributesList,
  updateMetadataUserAttribute,
} from 'apis/analytics';
import Navigation from 'components/layouts/Navigation';
import { t } from 'i18next';
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { MetadataSource } from 'ts/const';
import MetadataUserAttributeSplitPanel from './MetadataUserAttributeSplitPanel';
import MetadataSourceFC from '../comps/MetadataSource';
import MetadataTable from '../table/MetadataTable';
import { displayNameRegex, descriptionRegex } from '../table/table-config';

const MetadataUserAttributes: React.FC = () => {
  const { pid, appid } = useParams();

  const [showSplit, setShowSplit] = useState(false);
  const [curUserAttribute, setCurUserAttribute] =
    useState<IMetadataUserAttribute | null>();

  const COLUMN_DEFINITIONS = [
    {
      id: 'name',
      header: t('analytics:metadata.userAttribute.tableColumnName'),
      sortingField: 'name',
      cell: (e: { name: any }) => {
        return e.name;
      },
    },
    {
      id: 'displayName',
      header: t('analytics:metadata.userAttribute.tableColumnDisplayName'),
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
      header: t('analytics:metadata.userAttribute.tableColumnDescription'),
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
      header: t('analytics:metadata.userAttribute.tableColumnMetadataSource'),
      cell: (e: { metadataSource: MetadataSource }) => {
        return <MetadataSourceFC source={e.metadataSource} />;
      },
    },
    {
      id: 'valueType',
      header: t('analytics:metadata.userAttribute.tableColumnDataType'),
      cell: (e: { valueType: string }) => {
        return e.valueType;
      },
    },
    {
      id: 'hasData',
      header: t('analytics:metadata.userAttribute.tableColumnHasData'),
      cell: (e: { hasData: boolean }) => {
        return (
          <StatusIndicator type={e.hasData ? 'success' : 'stopped'}>
            {e.hasData ? 'Yes' : 'No'}
          </StatusIndicator>
        );
      },
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
      propertyLabel: t(
        'analytics:metadata.userAttribute.tableColumnParameterType'
      ),
      key: 'parameterType',
      groupValuesLabel: t(
        'analytics:metadata.userAttribute.tableColumnParameterType'
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
      if (!pid || !appid) {
        return [];
      }
      const {
        success,
        data,
      }: ApiResponse<ResponseTableData<IMetadataUserAttribute>> =
        await getMetadataUserAttributesList({ pid: pid, appId: appid });
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
      const { success, message }: ApiResponse<null> =
        await updateMetadataUserAttribute(newItem as IMetadataUserAttribute);
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
          resourceName="UserAttribute"
          tableColumnDefinitions={COLUMN_DEFINITIONS}
          tableContentDisplay={CONTENT_DISPLAY}
          tableFilteringProperties={FILTERING_PROPERTIES}
          tableI18nStrings={{
            loadingText:
              t('analytics:metadata.userAttribute.tableLoading') || 'Loading',
            emptyText: t('analytics:metadata.userAttribute.tableEmpty'),
            headerTitle: t('analytics:metadata.userAttribute.title'),
            headerRefreshButtonText: t('common:button.refreshMetadata'),
            filteringAriaLabel: t(
              'analytics:metadata.userAttribute.filteringAriaLabel'
            ),
            filteringPlaceholder: t(
              'analytics:metadata.userAttribute.filteringPlaceholder'
            ),
            groupPropertiesText: t(
              'analytics:metadata.userAttribute.groupPropertiesText'
            ),
            operatorsText: t('analytics:metadata.userAttribute.operatorsText'),
            clearFiltersText: t(
              'analytics:metadata.userAttribute.clearFiltersText'
            ),
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
              setCurUserAttribute(data as IMetadataUserAttribute);
            }
          }}
          fetchDataFunc={listMetadataUserAttributes}
          fetchUpdateFunc={updateMetadataUserAttributeInfo}
        ></MetadataTable>
      }
      headerSelector="#header"
      navigation={
        <Navigation
          activeHref={`/analytics/${pid}/app/${appid}/metadata/user-attributes`}
        />
      }
      splitPanelOpen={showSplit}
      onSplitPanelToggle={(e) => {
        setShowSplit(e.detail.open);
      }}
      splitPanel={
        curUserAttribute ? (
          <MetadataUserAttributeSplitPanel attribute={curUserAttribute} />
        ) : (
          ''
        )
      }
    />
  );
};

export default MetadataUserAttributes;
