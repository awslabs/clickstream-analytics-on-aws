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
  Box,
  Button,
  FormField,
  Input,
  Modal,
  SpaceBetween,
} from '@cloudscape-design/components';
import { getUserSettings, updateUserSettings } from 'apis/user';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { defaultStr } from 'ts/utils';

interface SettingUserProps {
  openModel: boolean;
  closeModel: () => void;
}

const SettingUser: React.FC<SettingUserProps> = (props: SettingUserProps) => {
  const { t } = useTranslation();
  const { openModel, closeModel } = props;
  const [loadingCreate, setLoadingCreate] = useState(false);
  const defaultUserSetting = {
    roleJsonPath: '',
    adminRoleNames: '',
    operatorRoleNames: '',
    analystRoleNames: '',
    analystReaderRoleNames: '',
  } as IUserSettings;
  const [curUserSetting, setCurUserSetting] =
    useState<IUserSettings>(defaultUserSetting);

  useEffect(() => {
    getSettingUser();
  }, [openModel]);

  const getSettingUser = async () => {
    setLoadingCreate(true);
    try {
      const { success, data }: ApiResponse<IUserSettings> =
        await getUserSettings();
      if (success) {
        setCurUserSetting(data);
      }
      setLoadingCreate(false);
    } catch (error) {
      setLoadingCreate(false);
    }
  };

  const confirmSettingUser = async () => {
    setLoadingCreate(true);
    try {
      const { success }: ApiResponse<ResponseCreate> = await updateUserSettings(
        curUserSetting
      );
      if (success) {
        closeModel();
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
      visible={openModel}
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
                confirmSettingUser();
              }}
            >
              {t('button.save')}
            </Button>
          </SpaceBetween>
        </Box>
      }
      header={t('user:labels.userSetting')}
    >
      <FormField
        label={t('user:labels.settingUserRoleJsonPath')}
        description={t('user:labels.settingUserRoleJsonPathDesc')}
      >
        <Input
          value={defaultStr(curUserSetting.roleJsonPath)}
          onChange={(e) => {
            setCurUserSetting((prev) => {
              return {
                ...prev,
                roleJsonPath: e.detail.value,
              };
            });
          }}
        />
      </FormField>
      <FormField
        label={t('user:labels.settingUserAdminRoleNames')}
        description={t('user:labels.settingUserAdminRoleNamesDesc')}
      >
        <Input
          value={defaultStr(curUserSetting.adminRoleNames)}
          onChange={(e) => {
            setCurUserSetting((prev) => {
              return {
                ...prev,
                adminRoleNames: e.detail.value,
              };
            });
          }}
        />
      </FormField>
      <FormField
        label={t('user:labels.settingUserOperatorRoleNames')}
        description={t('user:labels.settingUserOperatorRoleNamesDesc')}
      >
        <Input
          value={defaultStr(curUserSetting.operatorRoleNames)}
          onChange={(e) => {
            setCurUserSetting((prev) => {
              return {
                ...prev,
                operatorRoleNames: e.detail.value,
              };
            });
          }}
        />
      </FormField>
      <FormField
        label={t('user:labels.settingUserAnalystRoleNames')}
        description={t('user:labels.settingUserAnalystRoleNamesDesc')}
      >
        <Input
          value={defaultStr(curUserSetting.analystRoleNames)}
          onChange={(e) => {
            setCurUserSetting((prev) => {
              return {
                ...prev,
                analystRoleNames: e.detail.value,
              };
            });
          }}
        />
      </FormField>
      <FormField
        label={t('user:labels.settingUserAnalystReaderRoleNames')}
        description={t('user:labels.settingUserAnalystReaderRoleNamesDesc')}
      >
        <Input
          value={defaultStr(curUserSetting.analystReaderRoleNames)}
          onChange={(e) => {
            setCurUserSetting((prev) => {
              return {
                ...prev,
                analystReaderRoleNames: e.detail.value,
              };
            });
          }}
        />
      </FormField>
    </Modal>
  );
};

export default SettingUser;
