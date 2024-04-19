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

import { DEFAULT_DASHBOARD_NAME_PREFIX } from '@aws/clickstream-base-lib';
import {
  Box,
  Button,
  FormField,
  Input,
  Modal,
  Select,
  SelectProps,
  SpaceBetween,
} from '@cloudscape-design/components';
import { getAnalyticsDashboardList } from 'apis/analytics';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { defaultStr } from 'ts/utils';

interface ISaveToDashboardModalProps {
  visible: boolean;
  disableClose: boolean;
  loading: boolean;
  setModalVisible: (v: boolean) => void;
  save: (
    dashboardId: string,
    dashboardName: string,
    sheetId: string,
    sheetName: string,
    chartTitle: string,
    chartSubTitle: string
  ) => void;
}

interface ISaveToDashboardOption extends SelectProps.Option {
  sheets?: IAnalyticsDashboardSheet[];
}

const SaveToDashboardModal: React.FC<ISaveToDashboardModalProps> = (
  props: ISaveToDashboardModalProps
) => {
  const { visible, disableClose, loading, setModalVisible, save } = props;
  const { t } = useTranslation();
  const { projectId, appId } = useParams();

  const [visualName, setVisualName] = useState<string>('');
  const [visualDescription, setVisualDescription] = useState<string>('');
  const [dashboardOptions, setDashboardOptions] = useState<
    ISaveToDashboardOption[]
  >([]);
  const [selectedDashboard, setSelectedDashboard] =
    useState<ISaveToDashboardOption | null>(null);
  const [sheetOptions, setSheetOptions] = useState<SelectProps.Options>([]);
  const [selectedSheet, setSelectedSheet] = useState<SelectProps.Option | null>(
    null
  );
  const [inputVisualNameRequiredError, setInputVisualNameRequiredError] =
    useState(false);
  const [dashboardRequiredError, setDashboardRequiredError] = useState(false);
  const [sheetRequiredError, setSheetRequiredError] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  const listDashboards = async () => {
    try {
      setLoadingDashboard(true);
      const {
        success,
        data,
      }: ApiResponse<ResponseTableData<IAnalyticsDashboard>> =
        await getAnalyticsDashboardList({
          projectId: defaultStr(projectId),
          appId: defaultStr(appId),
          pageNumber: 1,
          pageSize: 999,
        });
      if (success) {
        const customDashboards = data.items.filter(
          (i) => i.name.startsWith(DEFAULT_DASHBOARD_NAME_PREFIX) === false
        );
        const dashboardOptions: ISaveToDashboardOption[] = customDashboards.map(
          (item) => ({
            label: item.name,
            value: item.id,
            sheets: item.sheets,
          })
        );
        setDashboardOptions(dashboardOptions);
        setLoadingDashboard(false);
      }
    } catch (error) {
      setLoadingDashboard(false);
      console.log(error);
    }
  };

  useEffect(() => {
    listDashboards();
  }, [projectId]);

  return (
    <>
      <Modal
        onDismiss={() => {
          if (!disableClose) {
            setModalVisible(false);
          }
        }}
        visible={visible}
        closeAriaLabel="Close modal"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              {!disableClose ? (
                <Button
                  onClick={() => {
                    if (!disableClose) {
                      setModalVisible(false);
                    }
                  }}
                  variant="link"
                >
                  {t('button.cancel')}
                </Button>
              ) : null}
              <Button
                variant="primary"
                loading={loading}
                onClick={() => {
                  if (!visualName) {
                    setInputVisualNameRequiredError(true);
                    return;
                  } else {
                    setInputVisualNameRequiredError(false);
                  }
                  if (!selectedDashboard?.value) {
                    setDashboardRequiredError(true);
                    return;
                  } else {
                    setDashboardRequiredError(false);
                  }
                  if (!selectedSheet?.value) {
                    setSheetRequiredError(true);
                    return;
                  } else {
                    setSheetRequiredError(false);
                  }
                  save(
                    selectedDashboard.value,
                    defaultStr(selectedDashboard.label),
                    selectedSheet.value,
                    defaultStr(selectedSheet.label),
                    visualName,
                    visualDescription
                  );
                }}
              >
                {t('button.confirm')}
              </Button>
            </SpaceBetween>
          </Box>
        }
        header={t('analytics:header.saveToDashboardModalTitle')}
      >
        <SpaceBetween direction="vertical" size="m">
          <FormField
            label={t('analytics:header.inputVisualName')}
            errorText={
              inputVisualNameRequiredError
                ? t('analytics:valid.inputVisualNameError')
                : ''
            }
          >
            <Input
              placeholder={defaultStr(
                t('analytics:header.inputVisualNamePlaceholder')
              )}
              value={defaultStr(visualName)}
              onChange={(e) => {
                setInputVisualNameRequiredError(false);
                setVisualName(e.detail.value);
              }}
            />
          </FormField>
          <FormField label={t('analytics:header.inputVisualDescription')}>
            <Input
              placeholder={defaultStr(
                t('analytics:header.inputVisualDescriptionPlaceholder')
              )}
              value={defaultStr(visualDescription)}
              onChange={(e) => {
                setVisualDescription(e.detail.value);
              }}
            />
          </FormField>
          <FormField
            label={t('analytics:header.selectDashboardTitle')}
            errorText={
              dashboardRequiredError
                ? t('analytics:valid.dashboardSelectError')
                : ''
            }
          >
            <div className="flex gap-10">
              <div className="flex-1">
                <Select
                  statusType={loadingDashboard ? 'loading' : 'finished'}
                  placeholder={defaultStr(
                    t('analytics:header.selectDashboardPlaceholder')
                  )}
                  selectedOption={selectedDashboard}
                  onChange={(e) => {
                    const selectedOption = e.detail
                      .selectedOption as ISaveToDashboardOption;
                    setSelectedDashboard(e.detail.selectedOption);
                    setSelectedSheet(null);
                    if (selectedOption.sheets) {
                      setSheetOptions(
                        selectedOption.sheets.map((item) => ({
                          label: item.name,
                          value: item.id,
                        }))
                      );
                    }
                  }}
                  options={dashboardOptions}
                />
              </div>
              <Button
                loading={loadingDashboard}
                iconName="refresh"
                onClick={() => {
                  listDashboards();
                }}
              />
            </div>
          </FormField>
          <FormField
            label={t('analytics:header.selectSheetTitle')}
            errorText={
              sheetRequiredError ? t('analytics:valid.sheetSelectError') : ''
            }
          >
            <Select
              disabled={loadingDashboard}
              placeholder={defaultStr(
                t('analytics:header.selectSheetPlaceholder')
              )}
              selectedOption={selectedSheet}
              onChange={(e) => {
                setSelectedSheet(e.detail.selectedOption);
              }}
              options={sheetOptions}
            />
          </FormField>
        </SpaceBetween>
      </Modal>
    </>
  );
};

export default SaveToDashboardModal;
