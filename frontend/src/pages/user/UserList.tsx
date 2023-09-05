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

import { AppLayout, Input, Select } from '@cloudscape-design/components';
import { getAllUsers, updateUser } from 'apis/user';
import Navigation from 'components/layouts/Navigation';
import moment from 'moment';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { IUserRole, TIME_FORMAT } from 'ts/const';
import { XSS_PATTERN } from 'ts/constant-ln';
import UserTable from './UserTable';

const UserList: React.FC = () => {
  const { t } = useTranslation();

  const roleOptions = [
    { value: IUserRole.ADMIN, label: t('user:options.admin') },
    { value: IUserRole.OPERATOR, label: t('user:options.operator') },
    { value: IUserRole.ANALYST, label: t('user:options.analyst') },
  ];

  const getRoleName = (role: string) => {
    switch (role) {
      case IUserRole.ADMIN:
        return t('user:options.admin');
      case IUserRole.OPERATOR:
        return t('user:options.operator');
      case IUserRole.ANALYST:
        return t('user:options.analyst');
      default:
        return t('user:options.operator');
    }
  };

  const COLUMN_DEFINITIONS = [
    {
      id: 'uid',
      header: t('user:labels.tableColumnUserId'),
      cell: (e: { uid: string }) => {
        return e.uid;
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
        validation(item: any, value: any) {
          return !new RegExp(XSS_PATTERN).test(value)
            ? undefined
            : t('tag.invalidInput');
        },
        editingCell: (
          item: { name: string },
          { setValue, currentValue }: any
        ) => {
          return (
            <Input
              autoFocus={true}
              value={currentValue ?? item.name}
              onChange={(item) => {
                setValue(item.detail.value);
              }}
              placeholder={t('tag.valuePlaceholder') ?? ''}
            />
          );
        },
      },
    },
    {
      id: 'role',
      header: t('user:labels.tableColumnRole'),
      minWidth: 200,
      editConfig: {
        editingCell: (item: { role: any }, { setValue, currentValue }: any) => {
          return (
            <Select
              autoFocus={true}
              expandToViewport={true}
              options={roleOptions}
              onChange={(event: any) => {
                setValue(event.detail.selectedOption.value);
              }}
              selectedOption={
                roleOptions.find(
                  (option) => option.value === (currentValue ?? item.role)
                ) ?? roleOptions[0]
              }
            />
          );
        },
      },
      cell: (e: { role: string }) => {
        return getRoleName(e.role);
      },
    },
    {
      id: 'createAt',
      header: t('user:labels.tableColumnCreateAt'),
      cell: (e: { createAt: string }) => {
        return moment(e.createAt).format(TIME_FORMAT) || '-';
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
            groupPropertiesText: t('button.groupPropertiesText'),
            operatorsText: t('button.operatorsText'),
            clearFiltersText: t('button.clearFiltersText'),
            applyActionText: t('button.applyActionText'),
            useText: t('common:table.useText'),
            matchText: t('common:table.matchText'),
            matchesText: t('common:table.matchesText'),
          }}
          fetchDataFunc={listAllUsers}
          fetchUpdateFunc={updateUserInfo}
        ></UserTable>
      }
      headerSelector="#header"
      navigation={<Navigation activeHref={'/user'} />}
    />
  );
};

export default UserList;
