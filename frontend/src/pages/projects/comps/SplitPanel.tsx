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
  XSS_PATTERN,
  IProject,
  ProjectEnvironment,
} from '@aws/clickstream-base-lib';
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
  Textarea,
} from '@cloudscape-design/components';
import { updateProject } from 'apis/project';
import { cloneDeep, defaultTo } from 'lodash';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MAX_USER_INPUT_LENGTH,
  PROJECT_STAGE_LIST,
  TIME_FORMAT,
} from 'ts/const';
import { ternary, validateEmails } from 'ts/utils';

interface SplitPanelContentProps {
  project: IProject;
  changeProjectEnv: (env: string) => void;
  refreshPage?: () => void;
}

const SplitPanelContent: React.FC<SplitPanelContentProps> = (
  props: SplitPanelContentProps
) => {
  const { t } = useTranslation();
  const { project, changeProjectEnv, refreshPage } = props;
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
  const [prevDesc, setPrevDesc] = useState(project.description);
  const [prevEnvOption, setPrevEnvOption] = useState<SelectProps.Option>(
    PROJECT_STAGE_LIST.find(
      (element) => element.value === project.environment.toString()
    ) || PROJECT_STAGE_LIST[0]
  );
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingEvn, setIsEditingEvn] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [loadingUpdateEmail, setLoadingUpdateEmail] = useState(false);
  const [loadingUpdateEnv, setLoadingUpdateEnv] = useState(false);
  const [loadingUpdateDesc, setLoadingUpdateDesc] = useState(false);
  const [emailsEmptyError, setEmailsEmptyError] = useState(false);
  const [emailsInvalidError, setEmailsInvalidError] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState<SelectProps.Option>(
    PROJECT_STAGE_LIST.find(
      (element) => element.value === project.environment.toString()
    ) || PROJECT_STAGE_LIST[0]
  );

  const updateProjectData = (type: string) => {
    if (type === 'email') {
      setPrevEmail(newProject.emails);
      setIsEditingEmail(false);
    }
    if (type === 'description') {
      setPrevDesc(newProject.description);
      setIsEditingDesc(false);
    }
    if (type === 'env') {
      setPrevEnvOption(
        PROJECT_STAGE_LIST.find(
          (element) => element.value === newProject.environment.toString()
        ) || PROJECT_STAGE_LIST[0]
      );
      setIsEditingEvn(false);
      changeProjectEnv(newProject.environment);
    }
    refreshPage && refreshPage();
  };

  const updateProjectInfo = async (type: 'email' | 'env' | 'description') => {
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
      newProject.environment = selectedEnv.value as ProjectEnvironment;
      setLoadingUpdateEnv(true);
    }

    if (type === 'description') {
      setLoadingUpdateDesc(true);
    }

    try {
      const { success }: ApiResponse<null> = await updateProject(newProject);
      if (success) {
        updateProjectData(type);
      }
      setLoadingUpdateEmail(false);
      setLoadingUpdateEnv(false);
      setLoadingUpdateDesc(false);
    } catch (error) {
      setLoadingUpdateEmail(false);
      setLoadingUpdateEnv(false);
      setLoadingUpdateDesc(false);
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
          <div>
            {!isEditingDesc && (
              <div className="flex align-center">
                <div>{newProject.description}</div>
                <Button
                  onClick={() => {
                    setIsEditingDesc(true);
                  }}
                  variant="icon"
                  iconName="edit"
                />
              </div>
            )}
            {isEditingDesc && (
              <div>
                <FormField>
                  <Textarea
                    rows={3}
                    value={newProject.description}
                    onChange={(e) => {
                      if (
                        new RegExp(XSS_PATTERN).test(e.detail.value) ||
                        e.detail.value.length > MAX_USER_INPUT_LENGTH
                      ) {
                        return false;
                      }
                      setNewProject((prev) => {
                        return {
                          ...prev,
                          description: e.detail.value,
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
                            description: prevDesc,
                          };
                        });
                        setIsEditingDesc(false);
                      }}
                    >
                      {t('button.cancel')}
                    </Button>
                    <Button
                      loading={loadingUpdateDesc}
                      variant="primary"
                      onClick={() => {
                        updateProjectInfo('description');
                      }}
                    >
                      {t('button.save')}
                    </Button>
                  </SpaceBetween>
                </div>
              </div>
            )}
          </div>
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
                  errorText={defaultTo(
                    ternary(
                      emailsEmptyError,
                      t('project:valid.emailEmpty'),
                      undefined
                    ),
                    ternary(
                      emailsInvalidError,
                      t('project:valid.emailInvalid'),
                      undefined
                    )
                  )}
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
                        (ele) => ele.value === project.environment.toString()
                      )?.label
                    : t('project:create.unspecified')}
                </Badge>
                <Button
                  onClick={() => {
                    setSelectedEnv(
                      PROJECT_STAGE_LIST.find(
                        (element) =>
                          element.value === project.environment.toString()
                      ) || PROJECT_STAGE_LIST[0]
                    );
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
                          environment: e.detail.selectedOption
                            .value as ProjectEnvironment,
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
                        setPrevEnvOption(cloneDeep(prevEnvOption));
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
