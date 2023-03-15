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
  Alert,
  Box,
  Button,
  FormField,
  Icon,
  Input,
  Modal,
  Select,
  SelectProps,
  SpaceBetween,
} from '@cloudscape-design/components';
import { createProject } from 'apis/project';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PROJECT_STAGE_LIST } from 'ts/const';
import { INIT_PROJECT_DATA } from 'ts/init';
import { generateStr, validateEmails } from 'ts/utils';

interface CreateProjectProps {
  openModel: boolean;
  closeModel: () => void;
}

const CreateProject: React.FC<CreateProjectProps> = (
  props: CreateProjectProps
) => {
  const { t } = useTranslation();
  const { openModel, closeModel } = props;
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [visible, setVisible] = useState(openModel);
  const [curStep, setCurStep] = useState(0);
  const [selectedEnv, setSelectedEnv] = useState<SelectProps.Option | null>(
    null
  );
  const [editing, setEditing] = useState(false);
  const [curProject, setCurProject] = useState<IProject>(INIT_PROJECT_DATA);

  const [projectNameRequiredError, setProjectNameRequiredError] =
    useState(false);
  const [emailsInvalidError, setEmailsInvalidError] = useState(false);

  const STEP_TITLE = [
    t('project:create.createProject'),
    t('project:create.addEmail'),
    t('project:create.specifyEnv'),
  ];

  const navigate = useNavigate();
  useEffect(() => {
    setProjectNameRequiredError(false);
    setEmailsInvalidError(false);
    setCurProject(INIT_PROJECT_DATA);
    setCurStep(0);
    setVisible(openModel);
  }, [openModel]);

  const confirmCreateProject = async () => {
    setLoadingCreate(true);
    try {
      curProject.environment = selectedEnv?.value || 'Unspecified';
      const { success, data }: ApiResponse<ResponseCreate> =
        await createProject(curProject);
      if (success && data.id) {
        navigate(`/project/detail/${data.id}`);
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
              {curStep > 0 && curStep < 3 && (
                <Button
                  onClick={() => {
                    setCurStep((prev) => {
                      return prev - 1;
                    });
                  }}
                >
                  {t('button.previous')}
                </Button>
              )}
              {curStep < 2 ? (
                <Button
                  variant="primary"
                  onClick={() => {
                    if (curStep === 0 && !curProject.name.trim()) {
                      setProjectNameRequiredError(true);
                      return false;
                    }
                    if (
                      curStep === 1 &&
                      curProject.emails &&
                      !validateEmails(curProject.emails)
                    ) {
                      setEmailsInvalidError(true);
                      return false;
                    }
                    setCurStep((prev) => {
                      return prev + 1;
                    });
                  }}
                >
                  {t('button.next')}
                </Button>
              ) : (
                <Button
                  loading={loadingCreate}
                  variant="primary"
                  onClick={() => {
                    confirmCreateProject();
                  }}
                >
                  {t('button.create')}
                </Button>
              )}
            </SpaceBetween>
          </Box>
        }
        header={STEP_TITLE[curStep]}
      >
        {curStep === 0 && (
          <>
            <FormField
              label={t('project:create.inputName')}
              errorText={
                projectNameRequiredError ? t('project:valid.nameEmpty') : ''
              }
            >
              <SpaceBetween direction="vertical" size="s">
                <Input
                  placeholder={t('project:create.inputNamePlaceholder') || ''}
                  value={curProject.name}
                  onChange={(e) => {
                    setProjectNameRequiredError(false);
                    setCurProject((prev) => {
                      return {
                        ...prev,
                        name: e.detail.value,
                        tableName: `${e.detail.value.replace(
                          /\s+/g,
                          '-'
                        )}-${generateStr(8)}`,
                      };
                    });
                  }}
                />
              </SpaceBetween>
            </FormField>
            {!editing && (
              <div
                onClick={() => {
                  setEditing(true);
                }}
                className="project-id mt-10"
              >
                {curProject.tableName} <Icon name="edit" />
              </div>
            )}

            {editing && (
              <>
                <div className="mt-10">
                  <SpaceBetween direction="horizontal" size="s">
                    <Input
                      value={curProject.tableName}
                      onChange={(e) => {
                        setCurProject((prev) => {
                          return { ...prev, tableName: e.detail.value };
                        });
                      }}
                    />
                    <Button
                      onClick={() => {
                        setEditing(false);
                      }}
                    >
                      {t('button.save')}
                    </Button>
                  </SpaceBetween>
                </div>
                <div className="mt-10">
                  <Alert>{t('project:create.projectNameAlert')}</Alert>
                </div>
              </>
            )}
          </>
        )}

        {curStep === 1 && (
          <SpaceBetween direction="vertical" size="xs">
            <FormField
              label={t('project:create.inputEmail')}
              stretch
              errorText={
                emailsInvalidError ? t('project:valid.emailInvalid') : ''
              }
            >
              <Input
                placeholder={t('project:create.inputEmailPlaceholder') || ''}
                value={curProject.emails}
                onChange={(e) => {
                  setEmailsInvalidError(false);
                  setCurProject((prev) => {
                    return {
                      ...prev,
                      emails: e.detail.value,
                    };
                  });
                }}
              />
            </FormField>
            <Alert>{t('project:create.inputEmailAlert')}</Alert>
          </SpaceBetween>
        )}

        {curStep === 2 && (
          <FormField label={t('project:create.inputEnv')}>
            <SpaceBetween direction="vertical" size="xs">
              <Select
                selectedOption={selectedEnv}
                onChange={(e) => {
                  setSelectedEnv(e.detail.selectedOption);
                  setCurProject((prev) => {
                    return {
                      ...prev,
                      environment: e.detail.selectedOption.value || '',
                    };
                  });
                }}
                options={PROJECT_STAGE_LIST}
              />
              <Alert>{t('project:create.inputEnvAlert')}</Alert>
            </SpaceBetween>
          </FormField>
        )}
      </Modal>
    </div>
  );
};

export default CreateProject;
