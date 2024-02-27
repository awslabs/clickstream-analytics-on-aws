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

import { XSS_PATTERN } from '@aws/clickstream-base-lib';
import {
  AppLayout,
  Input,
  Multiselect,
  SelectProps,
} from '@cloudscape-design/components';
import { getAllUsers, updateUser } from 'apis/user';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import moment from 'moment';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { IUserRole, TIME_FORMAT } from 'ts/const';
import { defaultStr } from 'ts/utils';
import UserTable from './UserTable';

interface IUserTableItem {
  id: string;
  name: string;
  roles: IUserRole[];
  createAt: string;
}

const UserList: React.FC = () => {
  const { t } = useTranslation();

  const roleOptions: SelectProps.Options = [
    { value: IUserRole.ADMIN, label: defaultStr(t('user:options.admin')) },
    {
      value: IUserRole.OPERATOR,
      label: defaultStr(t('user:options.operator')),
    },
    { value: IUserRole.ANALYST, label: defaultStr(t('user:options.analyst')) },
    {
      value: IUserRole.ANALYST_READER,
      label: defaultStr(t('user:options.analystReader')),
    },
  ];
  const getRolesLabel = (roles: IUserRole[]) => {
    const roleLabels: string[] = [];
    for (const role of roles) {
      roleLabels.push(getRoleName(role));
    }
    return roleLabels.join(',');
  };

  const getRoleName = (role: IUserRole): string => {
    switch (role) {
      case IUserRole.ADMIN:
        return t('user:options.admin');
      case IUserRole.OPERATOR:
        return t('user:options.operator');
      case IUserRole.ANALYST:
        return t('user:options.analyst');
      case IUserRole.ANALYST_READER:
        return t('user:options.analystReader');
      default:
        return '';
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
        placeholder={defaultStr(t('tag.valuePlaceholder'))}
      />
    );
  };

  const getRoleEditOptions = (
    item: IUserTableItem,
    currentValue: SelectProps.Option[] | undefined
  ) => {
    const options: SelectProps.Option[] = [];
    if (!currentValue) {
      for (const r of item.roles) {
        options.push({
          value: r,
          label: getRoleName(r),
        });
      }
    } else {
      for (const v of currentValue) {
        options.push({
          value: v.value,
          label: getRoleName(v.value as IUserRole),
        });
      }
    }
    return options;
  };

  const renderEditRoleCell = (
    item: IUserTableItem,
    setValue: any,
    currentValue: SelectProps.Option[]
  ) => {
    return (
      <Multiselect
        placeholder={defaultStr(t('user:labels.selectUserRolePlaceholder'))}
        autoFocus={true}
        expandToViewport={true}
        options={roleOptions}
        onChange={({ detail }) => {
          setValue(detail.selectedOptions);
        }}
        selectedOptions={getRoleEditOptions(item, currentValue)}
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
      minWidth: 140,
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
      id: 'roles',
      header: t('user:labels.tableColumnRole'),
      minWidth: 240,
      editConfig: {
        editingCell: (item: IUserTableItem, { setValue, currentValue }: any) =>
          renderEditRoleCell(item, setValue, currentValue),
      },
      cell: (e: IUserTableItem) => {
        return getRolesLabel(e.roles);
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
    { id: 'roles', visible: true },
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
      key: 'roles',
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
