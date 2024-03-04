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

import { IUser, UserRole } from '@aws/clickstream-base-lib';
import {
  Box,
  Button,
  FormField,
  Input,
  Modal,
  Multiselect,
  SelectProps,
  SpaceBetween,
} from '@cloudscape-design/components';
import { addUser } from 'apis/user';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { defaultStr } from 'ts/utils';

interface CreateUserProps {
  openModel: boolean;
  closeModel: () => void;
  refreshPage: () => void;
}

const CreateUser: React.FC<CreateUserProps> = (props: CreateUserProps) => {
  const { t } = useTranslation();
  const { openModel, closeModel, refreshPage } = props;
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [visible, setVisible] = useState(openModel);
  const defaultUser: IUser = {
    id: '',
    name: '',
    roles: [],
    createAt: 0,
    operator: '',
  };
  const [curUser, setCurUser] = useState<IUser>(defaultUser);

  const [userEmailRequiredError, setUserEmailRequiredError] = useState(false);
  const [selectedRoleOptions, setSelectedRoleOptions] =
    useState<SelectProps.Options>([]);

  const roleOptions: SelectProps.Options = [
    { value: UserRole.ADMIN, label: defaultStr(t('user:options.admin')) },
    {
      value: UserRole.OPERATOR,
      label: defaultStr(t('user:options.operator')),
    },
    { value: UserRole.ANALYST, label: defaultStr(t('user:options.analyst')) },
    {
      value: UserRole.ANALYST_READER,
      label: defaultStr(t('user:options.analystReader')),
    },
  ];

  useEffect(() => {
    setUserEmailRequiredError(false);
    setVisible(openModel);
    setCurUser(defaultUser);
  }, [openModel]);

  const confirmCreateUser = async () => {
    setLoadingCreate(true);
    try {
      const { success, data }: ApiResponse<ResponseCreate> = await addUser({
        id: curUser.id,
        name: defaultStr(curUser.name),
        roles: curUser.roles,
      });
      if (success && data.id) {
        closeModel();
        refreshPage();
      }
      setLoadingCreate(false);
    } catch (error) {
      setLoadingCreate(false);
    }
  };

  return (
    <Modal
      onDismiss={() => {
        closeModel();
      }}
      visible={visible}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              variant="link"
              onClick={() => {
                closeModel();
              }}
            >
              {t('button.cancel')}
            </Button>
            <Button
              loading={loadingCreate}
              variant="primary"
              onClick={() => {
                if (!curUser.id.trim()) {
                  setUserEmailRequiredError(true);
                  return false;
                }
                confirmCreateUser();
              }}
            >
              {t('button.create')}
            </Button>
          </SpaceBetween>
        </Box>
      }
      header={t('user:labels.createTitle')}
    >
      <FormField
        label={t('user:labels.createUserEmail')}
        errorText={
          userEmailRequiredError ? t('user:valid.userEmailEmptyError') : ''
        }
      >
        <Input
          placeholder={defaultStr(t('user:labels.createUserEmailPlaceholder'))}
          value={defaultStr(curUser.id)}
          onChange={(e) => {
            setUserEmailRequiredError(false);
            setCurUser((prev) => {
              return {
                ...prev,
                id: e.detail.value,
              };
            });
          }}
        />
      </FormField>
      <FormField label={t('user:labels.createUserName')}>
        <Input
          placeholder={defaultStr(t('user:labels.createUserNamePlaceholder'))}
          value={defaultStr(curUser.name)}
          onChange={(e) => {
            setCurUser((prev) => {
              return {
                ...prev,
                name: e.detail.value,
              };
            });
          }}
        />
      </FormField>
      <FormField label={t('user:labels.createUserRole')}>
        <Multiselect
          options={roleOptions}
          placeholder={defaultStr(t('user:labels.selectUserRolePlaceholder'))}
          onChange={({ detail }) => {
            setSelectedRoleOptions(detail.selectedOptions);
            setCurUser((prev) => {
              return {
                ...prev,
                roles: detail.selectedOptions.map(
                  (option) => option.value
                ) as UserRole[],
              };
            });
          }}
          selectedOptions={selectedRoleOptions}
        />
      </FormField>
    </Modal>
  );
};

export default CreateUser;
