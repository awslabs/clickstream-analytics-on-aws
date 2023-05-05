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
  Badge,
  Box,
  Button,
  ColumnLayout,
  FormField,
  Input,
  Select,
  SelectProps,
  SpaceBetween,
  SplitPanel,
} from '@cloudscape-design/components';
import { updateProject } from 'apis/project';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PROJECT_STAGE_LIST, TIME_FORMAT } from 'ts/const';
import { validateEmails } from 'ts/utils';

interface SplitPanelContentProps {
  project: IProject;
  changeProjectEnv: (env: string) => void;
}

const SplitPanelContent: React.FC<SplitPanelContentProps> = (
  props: SplitPanelContentProps
) => {
  const { t } = useTranslation();
  const { project, changeProjectEnv } = props;
  const SPLIT_PANEL_I18NSTRINGS = {
    preferencesTitle: t('splitPanel.preferencesTitle'),
    preferencesPositionLabel: t('splitPanel.preferencesPositionLabel'),
    preferencesPositionDescription: t(
      'splitPanel.preferencesPositionDescription'
    ),
    preferencesPositionSide: t('splitPanel.preferencesPositionSide'),
    preferencesPositionBottom: t('splitPanel.preferencesPositionBottom'),
    preferencesConfirm: t('splitPanel.preferencesConfirm'),
    preferencesCancel: t('splitPanel.preferencesCancel'),
    closeButtonAriaLabel: t('splitPanel.closeButtonAriaLabel'),
    openButtonAriaLabel: t('splitPanel.openButtonAriaLabel'),
    resizeHandleAriaLabel: t('splitPanel.resizeHandleAriaLabel'),
  };

  const [newProject, setNewProject] = useState(project);
  const [prevEmail, setPrevEmail] = useState(project.emails);
  const [prevEnvOption, setPrevEnvOption] = useState<SelectProps.Option>(
    PROJECT_STAGE_LIST.find(
      (element) => element.value === project.environment
    ) || PROJECT_STAGE_LIST[0]
  );
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingEvn, setIsEditingEvn] = useState(false);
  const [loadingUpdateEmail, setLoadingUpdateEmail] = useState(false);
  const [loadingUpdateEnv, setLoadingUpdateEnv] = useState(false);
  const [emailsEmptyError, setEmailsEmptyError] = useState(false);
  const [emailsInvalidError, setEmailsInvalidError] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState<SelectProps.Option>(
    PROJECT_STAGE_LIST.find(
      (element) => element.value === project.environment
    ) || PROJECT_STAGE_LIST[0]
  );

  const updateProjectInfo = async (type: 'email' | 'env') => {
    if (type === 'email') {
      if (!newProject.emails) {
        setEmailsEmptyError(true);
        return false;
      }
      if (!validateEmails(newProject.emails)) {
        setEmailsInvalidError(true);
        return false;
      }
      setLoadingUpdateEmail(true);
    }

    if (type === 'env') {
      setLoadingUpdateEnv(true);
    }

    try {
      const { success }: ApiResponse<null> = await updateProject(newProject);
      if (success) {
        if (type === 'email') {
          setPrevEmail(newProject.emails);
          setIsEditingEmail(false);
        }
        if (type === 'env') {
          setPrevEnvOption(
            PROJECT_STAGE_LIST.find(
              (element) => element.value === newProject.environment
            ) || PROJECT_STAGE_LIST[0]
          );
          setIsEditingEvn(false);
          changeProjectEnv(newProject.environment);
        }
      }
      setLoadingUpdateEmail(false);
      setLoadingUpdateEnv(false);
    } catch (error) {
      setLoadingUpdateEmail(false);
      setLoadingUpdateEnv(false);
    }
  };

  useEffect(() => {
    setIsEditingEmail(false);
    setIsEditingEvn(false);
  }, [project.id]);

  return (
    <SplitPanel header={project.name} i18nStrings={SPLIT_PANEL_I18NSTRINGS}>
      <ColumnLayout columns={2} variant="text-grid">
        <div>
          <Box variant="awsui-key-label">{t('project:split.id')}</Box>
          <div className="mb-10">{project.id}</div>
          <Box variant="awsui-key-label">{t('project:split.name')}</Box>
          <div className="mb-10">{project.name}</div>
          <Box variant="awsui-key-label">{t('project:split.description')}</Box>
          <div className="mb-10">{project.description}</div>
          <Box variant="awsui-key-label">{t('project:split.notifyEmail')}</Box>
          <div className="mb-10">
            {!isEditingEmail && (
              <div className="flex align-center">
                <div>{newProject.emails}</div>
                <Button
                  onClick={() => {
                    setIsEditingEmail(true);
                  }}
                  variant="icon"
                  iconName="edit"
                />
              </div>
            )}
            {isEditingEmail && (
              <div>
                <FormField
                  errorText={
                    emailsEmptyError
                      ? t('project:valid.emailEmpty')
                      : emailsInvalidError
                      ? t('project:valid.emailInvalid')
                      : ''
                  }
                >
                  <Input
                    value={newProject.emails}
                    onChange={(e) => {
                      setEmailsEmptyError(false);
                      setEmailsInvalidError(false);
                      setNewProject((prev) => {
                        return {
                          ...prev,
                          emails: e.detail.value,
                        };
                      });
                    }}
                  />
                </FormField>
                <div className="mt-5">
                  <SpaceBetween direction="horizontal" size="xs">
                    <Button
                      onClick={() => {
                        setNewProject((prev) => {
                          return {
                            ...prev,
                            emails: prevEmail,
                          };
                        });
                        setIsEditingEmail(false);
                      }}
                    >
                      {t('button.cancel')}
                    </Button>
                    <Button
                      loading={loadingUpdateEmail}
                      variant="primary"
                      onClick={() => {
                        updateProjectInfo('email');
                      }}
                    >
                      {t('button.save')}
                    </Button>
                  </SpaceBetween>
                </div>
              </div>
            )}
          </div>
        </div>
        <div>
          <Box variant="awsui-key-label">{t('project:split.envType')}</Box>
          <div className="mb-10">
            {!isEditingEvn && (
              <div className="flex align-center">
                <Badge>
                  {project.environment
                    ? PROJECT_STAGE_LIST.find(
                        (ele) => ele.value === project.environment
                      )?.label
                    : t('project:create.unspecified')}
                </Badge>
                <Button
                  onClick={() => {
                    setIsEditingEvn(true);
                  }}
                  variant="icon"
                  iconName="edit"
                />
              </div>
            )}
            {isEditingEvn && (
              <div className="flex">
                <div className="w-45p mr-5">
                  <Select
                    selectedOption={selectedEnv}
                    onChange={(e) => {
                      setSelectedEnv(e.detail.selectedOption);
                      setNewProject((prev) => {
                        return {
                          ...prev,
                          environment: e.detail.selectedOption.value || '',
                        };
                      });
                    }}
                    options={PROJECT_STAGE_LIST}
                  />
                </div>
                <div>
                  <SpaceBetween direction="horizontal" size="xs">
                    <Button
                      onClick={() => {
                        setPrevEnvOption(prevEnvOption);
                        setIsEditingEvn(false);
                      }}
                    >
                      {t('button.cancel')}
                    </Button>
                    <Button
                      loading={loadingUpdateEnv}
                      variant="primary"
                      onClick={() => {
                        updateProjectInfo('env');
                      }}
                    >
                      {t('button.save')}
                    </Button>
                  </SpaceBetween>
                </div>
              </div>
            )}
          </div>
          <Box variant="awsui-key-label">{t('project:split.created')}</Box>
          <div className="mb-10">
            {moment(project.createAt).format(TIME_FORMAT)}
          </div>
        </div>
      </ColumnLayout>
    </SplitPanel>
  );
};

export default SplitPanelContent;
