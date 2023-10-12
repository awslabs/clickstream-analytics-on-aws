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
  Select,
  SelectProps,
} from '@cloudscape-design/components';
import { getAllUsers, updateUser } from 'apis/user';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import moment from 'moment';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { IUserRole, TIME_FORMAT } from 'ts/const';
import { XSS_PATTERN } from 'ts/constant-ln';
import UserTable from './UserTable';

interface IUserTableItem {
  id: string;
  name: string;
  role: IUserRole;
  createAt: string;
}

const UserList: React.FC = () => {
  const { t } = useTranslation();

  const roleOptions: SelectProps.Options = [
    { value: IUserRole.ADMIN, label: t('user:options.admin') ?? '' },
    { value: IUserRole.OPERATOR, label: t('user:options.operator') ?? '' },
    { value: IUserRole.ANALYST, label: t('user:options.analyst') ?? '' },
    { value: IUserRole.NO_IDENTITY, label: t('user:options.noIdentity') ?? '' },
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
        return t('user:options.noIdentity');
    }
  };

  const renderEditNameCell = (
    item: IUserTableItem,
    setValue: any,
    currentValue: string
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
  };

  const renderEditRoleCell = (
    item: IUserTableItem,
    setValue: any,
    currentValue: string
  ) => {
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
            (option: SelectProps.Option) =>
              option.value === (currentValue ?? item.role)
          ) ?? roleOptions[0]
        }
      />
    );
  };

  const COLUMN_DEFINITIONS = [
    {
      id: 'id',
      header: t('user:labels.tableColumnUserId'),
      cell: (e: IUserTableItem) => {
        return e.id;
      },
    },
    {
      id: 'name',
      header: t('user:labels.tableColumnName'),
      cell: (e: IUserTableItem) => {
        return e.name;
      },
      minWidth: 180,
      editConfig: {
        validation(item: IUserTableItem, value: any) {
          return !new RegExp(XSS_PATTERN).test(value)
            ? undefined
            : t('tag.invalidInput');
        },
        editingCell: (item: IUserTableItem, { setValue, currentValue }: any) =>
          renderEditNameCell(item, setValue, currentValue),
      },
    },
    {
      id: 'role',
      header: t('user:labels.tableColumnRole'),
      minWidth: 200,
      editConfig: {
        editingCell: (item: IUserTableItem, { setValue, currentValue }: any) =>
          renderEditRoleCell(item, setValue, currentValue),
      },
      cell: (e: { role: string }) => {
        return getRoleName(e.role);
      },
    },
    {
      id: 'createAt',
      header: t('user:labels.tableColumnCreateAt'),
      cell: (e: IUserTableItem) => {
        return moment(e.createAt).format(TIME_FORMAT) || '-';
      },
    },
  ];

  const CONTENT_DISPLAY = [
    { id: 'id', visible: true },
    { id: 'name', visible: true },
    { id: 'role', visible: true },
    { id: 'createAt', visible: true },
  ];

  const FILTERING_PROPERTIES = [
    {
      propertyLabel: t('user:labels.tableColumnUserId'),
      key: 'id',
      groupValuesLabel: t('user:labels.tableColumnUserId'),
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

  const breadcrumbItems = [
    {
      text: t('breadCrumb.name'),
      href: '/',
    },
    {
      text: t('breadCrumb.users'),
      href: '/user',
    },
  ];

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
      breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
      navigation={<Navigation activeHref={'/user'} />}
    />
  );
};

export default UserList;
