import {
  Alert,
  Box,
  Button,
  FormField,
  Icon,
  Input,
  Modal,
  Select,
  SpaceBetween,
} from '@cloudscape-design/components';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface CreateProjectProps {
  openModel: boolean;
  closeModel: () => void;
}

const CreateProject: React.FC<CreateProjectProps> = (
  props: CreateProjectProps
) => {
  const { t } = useTranslation();
  const { openModel, closeModel } = props;
  const [visible, setVisible] = useState(openModel);
  const [curStep, setCurStep] = useState(0);
  const [selectedOption, setSelectedOption] = useState<any>();
  const [editing, setEditing] = useState(false);

  const STEP_TITLE = [
    t('project:create.createProject'),
    t('project:create.addEmail'),
    t('project:create.specifyEnv'),
  ];

  const navigate = useNavigate();
  useEffect(() => {
    setCurStep(0);
    setVisible(openModel);
  }, [openModel]);

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
                    setCurStep((prev) => {
                      return prev + 1;
                    });
                  }}
                >
                  {t('button.next')}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => {
                    closeModel();
                    navigate('/project/detail/new');
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
          <FormField label={t('project:create.inputName')}>
            <SpaceBetween direction="vertical" size="s">
              <Input
                placeholder={t('project:create.inputNamePlaceholder') || ''}
                value=""
              />
            </SpaceBetween>

            {!editing && (
              <div
                onClick={() => {
                  setEditing(true);
                }}
                className="project-id mt-10"
              >
                my-project-asdffa <Icon name="edit" />
              </div>
            )}

            {editing && (
              <>
                <div className="mt-10">
                  <SpaceBetween direction="horizontal" size="s">
                    <Input
                      placeholder={
                        t('project:create.inputNamePlaceholder') || ''
                      }
                      value="my-project-asdffa"
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
          </FormField>
        )}

        {curStep === 1 && (
          <FormField label={t('project:create.inputEmail')} stretch>
            <SpaceBetween direction="vertical" size="xs">
              <Input
                placeholder={t('project:create.inputEmailPlaceholder') || ''}
                value=""
              />
              <Alert>{t('project:create.inputEmailAlert')}</Alert>
            </SpaceBetween>
          </FormField>
        )}

        {curStep === 2 && (
          <FormField label={t('project:create.inputEnv')}>
            <SpaceBetween direction="vertical" size="xs">
              <Select
                selectedOption={selectedOption}
                onChange={({ detail }) =>
                  setSelectedOption(detail.selectedOption)
                }
                options={[
                  { label: 'Dev', value: 'dev' },
                  { label: 'Test', value: 'test' },
                  { label: 'Prod', value: 'prod' },
                ]}
                selectedAriaLabel="Selected"
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
