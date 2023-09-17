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
  Header,
  HeaderProps,
  Modal,
  SpaceBetween,
} from '@cloudscape-design/components';
import { deleteUser } from 'apis/user';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import CreateUser from './CreateUser';

interface UserTableHeaderProps extends HeaderProps {
  selectedItemsCount: number;
  user?: IUser;
  refreshPage: () => void;
  setSelectItemEmpty: () => void;
}

export function UserTableHeader({
  selectedItemsCount,
  ...props
}: UserTableHeaderProps) {
  const { t } = useTranslation();
  const { user, refreshPage, setSelectItemEmpty } = props;
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const confirmDeleteUser = async () => {
    setLoadingDelete(true);
    try {
      const resData: ApiResponse<null> = await deleteUser(user?.id ?? '');
      if (resData.success) {
        refreshPage();
        setLoadingDelete(false);
        setShowDeleteModal(false);
        setSelectItemEmpty();
      }
    } catch (error) {
      setLoadingDelete(false);
    }
  };
  return (
    <div>
      <CreateUser
        openModel={showCreateModal}
        closeModel={() => {
          setShowCreateModal(false);
        }}
        refreshPage={refreshPage}
      />
      <Modal
        onDismiss={() => setShowDeleteModal(false)}
        visible={showDeleteModal}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                onClick={() => {
                  setShowDeleteModal(false);
                }}
                variant="link"
              >
                {t('button.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  confirmDeleteUser();
                }}
                loading={loadingDelete}
              >
                {t('button.confirm')}
              </Button>
            </SpaceBetween>
          </Box>
        }
        header={t('user:labels.deleteTitle')}
      >
        {t('user:labels.deleteTip1')} <b>{user?.id}</b>,
        {t('user:labels.deleteTip2')}
      </Modal>
      <Header
        variant="awsui-h1-sticky"
        actions={
          <SpaceBetween size="xs" direction="horizontal">
            <Button
              disabled={!user?.id}
              onClick={() => {
                setShowDeleteModal(true);
              }}
            >
              {t('button.delete')}
            </Button>
            <Button
              onClick={() => {
                console.log('setting');
              }}
              iconName="settings"
            >
              {t('button.settings')}
            </Button>
            <Button
              variant="primary"
              iconName="add-plus"
              onClick={() => {
                setShowCreateModal(true);
              }}
            >
              {t('button.create')}
            </Button>
          </SpaceBetween>
        }
        {...props}
      >
        {t('user:labels.title')}
      </Header>
    </div>
  );
}
