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

import { AppLayout, Input } from '@cloudscape-design/components';
import { getAllUsers, updateUser } from 'apis/user';
import Navigation from 'components/layouts/Navigation';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { XSS_PATTERN } from 'ts/constant-ln';
import UserSplitPanel from './UserSplitPanel';
import UserTable from './UserTable';

const UserList: React.FC = () => {
  const { projectId, appId } = useParams();
  const { t } = useTranslation();

  const [showSplit, setShowSplit] = useState(false);
  const [curUser, setCurUser] = useState<IUser | null>();
  const COLUMN_DEFINITIONS = [
    {
      id: 'email',
      header: t('user:labels.tableColumnEmail'),
      cell: (e: { email: string }) => {
        return e.email;
      },
    },
    {
      id: 'name',
      header: t('user:labels.tableColumnName'),
      cell: (e: { name: string }) => {
        return e.name;
      },
      minWidth: 180,
      editConfig: {
        ariaLabel: 'Edit display name',
        errorIconAriaLabel: 'Display Name Validation Error',
        editIconAriaLabel: 'editable',
        validation(item: any, value: any) {
          return !new RegExp(XSS_PATTERN).test(value)
            ? undefined
            : 'Invalid input';
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
      id: 'role',
      header: t('user:labels.tableColumnRole'),
      cell: (e: { role: string }) => {
        return e.role;
      },
    },
    {
      id: 'createAt',
      header: t('user:labels.tableColumnCreateAt'),
      cell: (e: { createAt: string }) => {
        return e.createAt;
      },
    },
  ];
  const CONTENT_DISPLAY = [
    { id: 'email', visible: true },
    { id: 'name', visible: true },
    { id: 'role', visible: true },
    { id: 'createAt', visible: true },
  ];
  const FILTERING_PROPERTIES = [
    {
      propertyLabel: t('user:labels.tableColumnEmail'),
      key: 'email',
      groupValuesLabel: t('user:labels.tableColumnEmail'),
      operators: [':', '!:', '=', '!='],
    },
    {
      propertyLabel: t('user:labels.tableColumnName'),
      key: 'name',
      groupValuesLabel: t('user:labels.tableColumnName'),
      operators: [':', '!:', '=', '!='],
    },
    {
      propertyLabel: t('user:labels.tableColumnRole'),
      key: 'role',
      groupValuesLabel: t('user:labels.tableColumnRole'),
      operators: [':', '!:', '=', '!='],
    },
  ];

  const listAllUsers = async () => {
    try {
      const { success, data }: ApiResponse<ResponseTableData<IUser>> =
        await getAllUsers();
      if (success) {
        return data.items;
      }
      return [];
    } catch (error) {
      return [];
    }
  };

  const updateUserInfo = async (newItem: IUser) => {
    try {
      const { success, message }: ApiResponse<null> = await updateUser(newItem);
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
        <UserTable
          tableColumnDefinitions={COLUMN_DEFINITIONS}
          tableContentDisplay={CONTENT_DISPLAY}
          tableFilteringProperties={FILTERING_PROPERTIES}
          tableI18nStrings={{
            loadingText: t('user:labels.tableLoading') || 'Loading',
            emptyText: t('user:labels.tableEmpty'),
            headerTitle: t('user:labels.title'),
            filteringAriaLabel: t('user:labels.filteringAriaLabel'),
            filteringPlaceholder: t('user:labels.filteringPlaceholder'),
            groupPropertiesText: t('user:labels.groupPropertiesText'),
            operatorsText: t('user:labels.operatorsText'),
            clearFiltersText: t('user:labels.clearFiltersText'),
            useText: t('common:table.useText'),
            matchText: t('common:table.matchText'),
            matchesText: t('common:table.matchesText'),
          }}
          loadHelpPanelContent={() => {
            console.log(1);
          }}
          setShowDetails={(show: boolean, data?: IUser) => {
            setShowSplit(show);
            if (data) {
              setCurUser(data as IUser);
            }
          }}
          fetchDataFunc={listAllUsers}
          fetchUpdateFunc={updateUserInfo}
        ></UserTable>
      }
      headerSelector="#header"
      navigation={<Navigation activeHref={'/user'} />}
      splitPanelOpen={showSplit}
      onSplitPanelToggle={(e) => {
        setShowSplit(e.detail.open);
      }}
      splitPanel={curUser ? <UserSplitPanel user={curUser} /> : ''}
    />
  );
};

export default UserList;
