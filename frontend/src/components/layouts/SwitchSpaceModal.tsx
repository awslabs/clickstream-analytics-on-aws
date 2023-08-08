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
  Modal,
  Select,
  SelectProps,
  SpaceBetween,
} from '@cloudscape-design/components';
import { getApplicationListByPipeline } from 'apis/application';
import { getProjectList } from 'apis/project';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

interface IHeaderSwitchSpaceModalProps {
  visible: boolean;
  disableClose: boolean;
  setSwichProjectVisible: (v: boolean) => void;
  setAnalyticsInfo: (newValue: any) => void;
}

const HeaderSwitchSpaceModal: React.FC<IHeaderSwitchSpaceModalProps> = (
  props: IHeaderSwitchSpaceModalProps
) => {
  const { visible, disableClose, setSwichProjectVisible, setAnalyticsInfo } =
    props;
  const { t } = useTranslation();
  const location = useLocation();
  const [allProjectOptions, setAllProjectOptions] =
    useState<SelectProps.Options>([]);
  const [selectedProject, setSelectedProject] =
    useState<SelectProps.Option | null>(null);
  const [allAppOptions, setAllAppOptions] = useState<SelectProps.Options>([]);
  const [selectedApp, setSelectedApp] = useState<SelectProps.Option | null>(
    null
  );
  const [projectRequiredError, setProjectRequiredError] = useState(false);
  const [appRequiredError, setAppRequiredError] = useState(false);

  const listProjects = async () => {
    try {
      const { success, data }: ApiResponse<ResponseTableData<IProject>> =
        await getProjectList({
          pageNumber: 1,
          pageSize: 9999,
        });
      if (success) {
        const projectOptions: SelectProps.Options = data.items.map(
          (element) => ({
            label: element.name,
            value: element.id,
            description: element.status,
          })
        );
        setAllProjectOptions(projectOptions);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const listApplicationByProject = async (pid: string) => {
    try {
      const { success, data }: ApiResponse<ResponseTableData<IApplication>> =
        await getApplicationListByPipeline({
          pid: pid,
          pageNumber: 1,
          pageSize: 9999,
        });
      if (success) {
        const appOptions: SelectProps.Options = data.items.map((element) => ({
          label: element.name,
          value: element.appId,
        }));
        setAllAppOptions(appOptions);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const saveAnalyticsIds = () => {
    setAnalyticsInfo({
      pid: selectedProject?.value,
      pname: selectedProject?.label,
      appid: selectedApp?.value,
      appname: selectedApp?.label,
    });
  };

  useEffect(() => {
    if (location.pathname.startsWith('/analytics')) {
      listProjects();
    }
  }, []);

  return (
    <>
      <Modal
        onDismiss={() => {
          if (!disableClose) {
            setSwichProjectVisible(false);
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
                      setSwichProjectVisible(false);
                    }
                  }}
                  variant="link"
                >
                  {t('button.cancel')}
                </Button>
              ) : null}
              <Button
                variant="primary"
                onClick={() => {
                  if (!selectedProject?.value) {
                    setProjectRequiredError(true);
                    return;
                  } else {
                    setProjectRequiredError(false);
                  }
                  if (!selectedApp?.value) {
                    setAppRequiredError(true);
                    return;
                  } else {
                    setAppRequiredError(false);
                  }
                  saveAnalyticsIds();
                  setSwichProjectVisible(false);
                  window.location.href = `/analytics/${selectedProject?.value}/app/${selectedApp?.value}/dashboards`;
                }}
              >
                {t('button.confirm')}
              </Button>
            </SpaceBetween>
          </Box>
        }
        header={t('analytics:header.modalTitle')}
      >
        <FormField
          label={t('analytics:header.selectProjectTitle')}
          errorText={
            projectRequiredError ? t('analytics:valid.projectSelectError') : ''
          }
        >
          <SpaceBetween direction="vertical" size="xs">
            <Select
              selectedOption={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.detail.selectedOption);
                listApplicationByProject(e.detail.selectedOption.value ?? '');
              }}
              options={allProjectOptions}
            />
          </SpaceBetween>
        </FormField>
        <FormField
          label={t('analytics:header.selectAppTitle')}
          errorText={
            appRequiredError ? t('analytics:valid.appSelectError') : ''
          }
        >
          <SpaceBetween direction="vertical" size="xs">
            <Select
              selectedOption={selectedApp}
              onChange={(e) => {
                setSelectedApp(e.detail.selectedOption);
              }}
              options={allAppOptions}
            />
          </SpaceBetween>
        </FormField>
      </Modal>
    </>
  );
};

export default HeaderSwitchSpaceModal;
