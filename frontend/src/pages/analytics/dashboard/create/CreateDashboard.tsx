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
  Textarea,
  TokenGroup,
} from '@cloudscape-design/components';
import { createAnalyticsDashboard } from 'apis/analytics';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MAX_USER_INPUT_LENGTH } from 'ts/const';
import { XSS_PATTERN } from 'ts/constant-ln';

interface CreateDashboardProps {
  projectId: string;
  appId: string;
  openModel: boolean;
  closeModel: () => void;
}

const CreateDashboard: React.FC<CreateDashboardProps> = (
  props: CreateDashboardProps
) => {
  const { t } = useTranslation();
  const { projectId, appId, openModel, closeModel } = props;
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [visible, setVisible] = useState(openModel);
  const [curDashboard, setCurDashboard] = useState<IAnalyticsDashboard>({
    name: '',
    description: '',
  } as IAnalyticsDashboard);

  const [dashboardNameRequiredError, setDashboardNameRequiredError] =
    useState(false);
  const [dashboardSheetTooMuchError, setDashboardSheetTooMuchError] =
    useState(false);
  const [sheetName, setSheetName] = React.useState('');
  const [sheetNames, setSheetNames] = React.useState([{ label: 'Sheet 1' }]);

  const navigate = useNavigate();
  useEffect(() => {
    setDashboardNameRequiredError(false);
    setVisible(openModel);
  }, [openModel]);

  const confirmCreateDashboard = async () => {
    setLoadingCreate(true);
    try {
      const params = {
        ...curDashboard,
        projectId: projectId,
        appId: appId,
        sheets: sheetNames.map((item) => item.label),
        
      } as IAnalyticsDashboard;
      const { success, data }: ApiResponse<ResponseCreate> =
        await createAnalyticsDashboard(params);
      if (success && data.id) {
        navigate(`analytics/${projectId}/app/${appId}/dashboards`);
      }
      setLoadingCreate(false);
    } catch (error) {
      setLoadingCreate(false);
    }
  };

  return (
    <div>
      <Modal
        onDismiss={() => {
          closeModel();
        }}
        visible={visible}
        closeAriaLabel="Close modal"
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
                  if (!curDashboard.name.trim()) {
                    setDashboardNameRequiredError(true);
                    return false;
                  }
                  confirmCreateDashboard();
                }}
              >
                {t('button.create')}
              </Button>
            </SpaceBetween>
          </Box>
        }
        header={t('analytics:dashboard.createTitle')}
      >
        <>
          <FormField
            label={t('analytics:dashboard.createInputName')}
            errorText={
              dashboardNameRequiredError
                ? t('analytics:valid.dashboardNameEmptyError')
                : ''
            }
          >
            <SpaceBetween direction="vertical" size="s">
              <Input
                placeholder={
                  t('analytics:dashboard.createInputNamePlaceholder') || ''
                }
                value={curDashboard.name ?? ''}
                onChange={(e) => {
                  setDashboardNameRequiredError(false);
                  setCurDashboard((prev) => {
                    return {
                      ...prev,
                      name: e.detail.value,
                    };
                  });
                }}
              />
            </SpaceBetween>
          </FormField>
          <div className="mt-10">
            <FormField label={t('analytics:dashboard.createDesc')}>
              <Textarea
                placeholder={
                  t('analytics:dashboard.createDescPlaceholder') || ''
                }
                rows={3}
                value={curDashboard.description}
                onChange={(e) => {
                  if (
                    new RegExp(XSS_PATTERN).test(e.detail.value) ||
                    e.detail.value.length > MAX_USER_INPUT_LENGTH
                  ) {
                    return false;
                  }
                  setCurDashboard((prev) => {
                    return { ...prev, description: e.detail.value };
                  });
                }}
              />
            </FormField>
          </div>

          <FormField
            label={t('analytics:dashboard.createSheets')}
            errorText={
              dashboardSheetTooMuchError
                ? t('analytics:valid.dashboardSheetTooMuchError')
                : ''
            }
            secondaryControl={
              <Button
                iconName="add-plus"
                onClick={() => {
                  if (!sheetName.trim()) {
                    return false;
                  }
                  if (sheetNames.length >= 10) {
                    setDashboardSheetTooMuchError(true);
                    return false;
                  }
                  setSheetNames(sheetNames.concat({ label: sheetName }));
                }}
              />
            }
          >
            <Input
              onChange={({ detail }) => setSheetName(detail.value)}
              value={sheetName}
            />
          </FormField>
          <TokenGroup
            onDismiss={({ detail: { itemIndex } }) => {
              setSheetNames([
                ...sheetNames.slice(0, itemIndex),
                ...sheetNames.slice(itemIndex + 1),
              ]);
            }}
            items={sheetNames}
          />
        </>
      </Modal>
    </div>
  );
};

export default CreateDashboard;
