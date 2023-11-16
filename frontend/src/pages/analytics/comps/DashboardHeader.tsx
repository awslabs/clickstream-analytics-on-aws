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
  Modal,
  SpaceBetween,
} from '@cloudscape-design/components';
import { deleteAnalyticsDashboard } from 'apis/analytics';
import InfoLink from 'components/common/InfoLink';
import { DispatchContext } from 'context/StateContext';
import { UserContext } from 'context/UserContext';
import { StateActionType, HelpPanelType } from 'context/reducer';
import React, { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { IUserRole } from 'ts/const';
import { defaultStr, getUserInfoFromLocalStorage } from 'ts/utils';

interface DashboardHeaderProps {
  totalNum: number;
  dashboard?: IAnalyticsDashboard;
  onClickCreate: () => void;
  setSelectItemEmpty: () => void;
  refreshPage: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = (
  props: DashboardHeaderProps
) => {
  const { t } = useTranslation();
  const {
    totalNum,
    dashboard,
    onClickCreate,
    setSelectItemEmpty,
    refreshPage,
  } = props;
  const { projectId, appId } = useParams();
  const currentUser = useContext(UserContext) ?? getUserInfoFromLocalStorage();
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const dispatch = useContext(DispatchContext);

  const confirmDeleteDashboard = async () => {
    setLoadingDelete(true);
    try {
      const resData: ApiResponse<null> = await deleteAnalyticsDashboard(
        defaultStr(projectId),
        defaultStr(appId),
        defaultStr(dashboard?.id)
      );
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
    <>
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
                  confirmDeleteDashboard();
                }}
                loading={loadingDelete}
              >
                {t('button.confirm')}
              </Button>
            </SpaceBetween>
          </Box>
        }
        header={t('common:button.deleteDashboard')}
      >
        {t('analytics:dashboard.deleteTip1')} <b>{dashboard?.name}</b>,
        {t('analytics:dashboard.deleteTip2')}
      </Modal>
      <Header
        variant="h1"
        counter={`(${totalNum})`}
        description={t('analytics:dashboard.description')}
        info={
          <InfoLink
            onFollow={() => {
              dispatch?.({
                type: StateActionType.SHOW_HELP_PANEL,
                payload: HelpPanelType.ANALYTICS_DASHBOARD,
              });
            }}
          />
        }
        actions={
          <SpaceBetween size="xs" direction="horizontal">
            {currentUser.role !== IUserRole.ANALYST_READER && (
              <>
                <Button
                  disabled={!dashboard?.id}
                  onClick={() => {
                    setShowDeleteModal(true);
                  }}
                >
                  {t('button.delete')}
                </Button>
                <Button
                  data-testid="header-btn-create"
                  variant="primary"
                  onClick={onClickCreate}
                >
                  {t('common:button.createDashboard')}
                </Button>
              </>
            )}
          </SpaceBetween>
        }
      >
        {t('analytics:dashboard.title')}
      </Header>
    </>
  );
};

export default DashboardHeader;
