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
  Container,
  FormField,
  Header,
  Input,
  Link,
  Modal,
  Select,
  SelectProps,
  SpaceBetween,
  Spinner,
  Toggle,
} from '@cloudscape-design/components';
import {
  createQuickSightUser,
  getQuickSightDetail,
  getQuickSightStatus,
  getQuickSightUsers,
} from 'apis/resource';
import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  PIPELINE_QUICKSIGHT_GUIDE_LINK,
  PIPELINE_QUICKSIGHT_LEARNMORE_LINK,
} from 'ts/const';
import { EMAIL_PATTERN } from 'ts/constant-ln';
import { buildQuickSightSubscriptionLink } from 'ts/url';
import { checkStringValidRegex, isDisabled } from 'ts/utils';

interface ReportingProps {
  update?: boolean;
  pipelineInfo: IExtPipeline;
  changeEnableReporting: (enable: boolean) => void;
  changeQuickSightSelectedUser: (user: SelectProps.Option) => void;
  changeQuickSightAccountName: (accountName: string) => void;
  quickSightUserEmptyError: boolean;
}

const Reporting: React.FC<ReportingProps> = (props: ReportingProps) => {
  const { t } = useTranslation();
  const {
    update,
    pipelineInfo,
    changeEnableReporting,
    changeQuickSightSelectedUser,
    changeQuickSightAccountName,
    quickSightUserEmptyError,
  } = props;
  const [quickSightRoleOptions, setQuickSightRoleOptions] =
    useState<SelectProps.Options>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [loadingQuickSight, setLoadingQuickSight] = useState(false);
  const [loadingCreateUser, setLoadingCreateUser] = useState(false);
  const [quickSightEnabled, setQuickSightEnabled] = useState(false);
  const [quickSightEnterprise, setQuickSightEnterprise] = useState(false);
  const [userActiveLink, setUserActiveLink] = useState('');

  const [newUserEmail, setNewUserEmail] = useState('');
  const [emailInvalid, setEmailInvalid] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);

  // get quicksight details
  const getTheQuickSightDetail = async () => {
    try {
      const { success, data }: ApiResponse<QuickSightDetailResponse> =
        await getQuickSightDetail();
      setLoadingQuickSight(false);
      if (
        success &&
        data &&
        data.accountSubscriptionStatus === 'ACCOUNT_CREATED'
      ) {
        setQuickSightEnabled(true);
        changeQuickSightAccountName(data.accountName);
      }
      if (success && data && data.edition.includes('ENTERPRISE')) {
        setQuickSightEnterprise(true);
      }
    } catch (error) {
      setLoadingQuickSight(false);
    }
  };

  // get quicksight users
  const checkTheQuickSightStatus = async () => {
    setLoadingQuickSight(true);
    try {
      const { success, data }: ApiResponse<boolean> =
        await getQuickSightStatus();
      if (success && data) {
        getTheQuickSightDetail();
      } else {
        setLoadingQuickSight(false);
      }
    } catch (error) {
      setLoadingQuickSight(false);
    }
  };

  // get quicksight users
  const getQuickSightUserList = async () => {
    setLoadingUsers(true);
    try {
      const { success, data }: ApiResponse<QuickSightUserResponse[]> =
        await getQuickSightUsers();
      if (success) {
        const mskOptions: SelectProps.Options = data.map((element) => ({
          label: element.userName,
          value: element.userName,
          description: element.email,
          labelTag: element.role,
        }));
        setQuickSightRoleOptions(mskOptions);
        setLoadingUsers(false);
      }
    } catch (error) {
      setLoadingUsers(false);
    }
  };

  // create quicksight user
  const createNewQuickSightUser = async () => {
    if (!checkStringValidRegex(newUserEmail, new RegExp(EMAIL_PATTERN))) {
      setEmailInvalid(true);
      return;
    }
    setLoadingCreateUser(true);
    try {
      const { success, data }: ApiResponse<string> = await createQuickSightUser(
        {
          email: newUserEmail,
          accountName: pipelineInfo.reporting.quickSight.accountName,
        }
      );
      setLoadingCreateUser(false);
      if (success && data) {
        setNewUserEmail('');
        setUserActiveLink(data);
      }
    } catch (error) {
      setLoadingCreateUser(false);
    }
  };

  const closeNewUserModal = () => {
    setUserActiveLink('');
    setShowCreateUser(false);
  };

  useEffect(() => {
    if (quickSightEnabled) {
      getQuickSightUserList();
    }
  }, [quickSightEnabled]);

  useEffect(() => {
    if (pipelineInfo.enableDataProcessing && pipelineInfo.enableReporting) {
      checkTheQuickSightStatus();
    }
  }, [pipelineInfo.enableReporting]);

  return (
    <Container
      header={
        <Header
          variant="h2"
          description={t('pipeline:create.reportSettingsDesc')}
        >
          {t('pipeline:create.reportSettings')}
        </Header>
      }
    >
      {pipelineInfo.enableDataProcessing ? (
        <>
          <SpaceBetween direction="vertical" size="l">
            <FormField>
              <Toggle
                controlId="test-quicksight-id"
                disabled={
                  isDisabled(update, pipelineInfo) ||
                  !pipelineInfo.serviceStatus?.QUICK_SIGHT
                }
                onChange={({ detail }) => changeEnableReporting(detail.checked)}
                checked={pipelineInfo.enableReporting}
                description={
                  <div>
                    <Trans
                      i18nKey="pipeline:create.createSampleQuickSightDesc"
                      components={{
                        learnmore_anchor: (
                          <Link
                            external
                            href={PIPELINE_QUICKSIGHT_LEARNMORE_LINK}
                          />
                        ),
                        guide_anchor: (
                          <Link
                            external
                            href={PIPELINE_QUICKSIGHT_GUIDE_LINK}
                          />
                        ),
                      }}
                    />
                  </div>
                }
              >
                <b>{t('pipeline:create.createSampleQuickSight')}</b>
              </Toggle>
            </FormField>

            {pipelineInfo.enableReporting &&
              (loadingQuickSight ? (
                <Spinner />
              ) : (
                <>
                  {!quickSightEnabled && (
                    <Alert
                      type="warning"
                      header={t('pipeline:create.quickSightNotSub')}
                    >
                      {t('pipeline:create.quickSightNotSubDesc1')}
                      <Link external href={buildQuickSightSubscriptionLink()}>
                        {t('pipeline:create.quickSightSubscription')}
                      </Link>
                      {t('pipeline:create.quickSightNotSubDesc2')}
                    </Alert>
                  )}

                  {quickSightEnabled && !quickSightEnterprise && (
                    <Alert
                      type="warning"
                      header={t('pipeline:create.quickSightNotEnterprise')}
                    >
                      {t('pipeline:create.quickSightNotEnterpriseDesc')}
                    </Alert>
                  )}

                  {quickSightEnabled && quickSightEnterprise && (
                    <>
                      <FormField
                        label={t('pipeline:create.quickSightUser')}
                        description={t('pipeline:create.quickSightUserDesc')}
                        errorText={
                          quickSightUserEmptyError
                            ? t('pipeline:valid.quickSightUserEmptyError')
                            : ''
                        }
                      >
                        <div className="flex">
                          <div className="flex-1">
                            <Select
                              statusType={loadingUsers ? 'loading' : 'finished'}
                              placeholder={
                                t('pipeline:create.quickSIghtPlaceholder') || ''
                              }
                              selectedOption={
                                pipelineInfo.selectedQuickSightUser
                              }
                              onChange={({ detail }) =>
                                changeQuickSightSelectedUser(
                                  detail.selectedOption
                                )
                              }
                              options={quickSightRoleOptions}
                              filteringType="auto"
                            />
                          </div>
                          <div className="ml-10">
                            <Button
                              loading={loadingUsers}
                              onClick={() => {
                                getQuickSightUserList();
                              }}
                              iconName="refresh"
                            />
                          </div>
                          <div className="ml-10">
                            <Button
                              onClick={() => {
                                setShowCreateUser(true);
                              }}
                            >
                              {t('button.createNew')}
                            </Button>
                          </div>
                        </div>
                      </FormField>
                    </>
                  )}
                </>
              ))}
          </SpaceBetween>

          {/* Create User Modal */}
          <Modal
            onDismiss={() => {
              closeNewUserModal();
            }}
            visible={showCreateUser}
            footer={
              <Box float="right">
                <SpaceBetween direction="horizontal" size="xs">
                  <Button
                    variant="link"
                    onClick={() => {
                      closeNewUserModal();
                    }}
                  >
                    {t('button.close')}
                  </Button>
                </SpaceBetween>
              </Box>
            }
            header={t('pipeline:create.createQSUser')}
          >
            <FormField
              label={t('pipeline:create.qsUserEmail')}
              description={t('pipeline:create.qsCreateUserDesc')}
              errorText={emailInvalid ? t('pipeline:valid.emailInvalid') : ''}
            >
              <div className="flex">
                <div className="flex-1">
                  <Input
                    placeholder="email@example.com"
                    value={newUserEmail}
                    onChange={(e) => {
                      setEmailInvalid(false);
                      setNewUserEmail(e.detail.value);
                    }}
                  />
                </div>
                <div className="ml-10">
                  <Button
                    loading={loadingCreateUser}
                    onClick={() => {
                      createNewQuickSightUser();
                    }}
                  >
                    {t('button.create')}
                  </Button>
                </div>
              </div>
              <div className="mt-10">
                {userActiveLink && (
                  <Alert header={t('pipeline:create.qsUserActive')}>
                    <Link external href={userActiveLink}>
                      {userActiveLink}
                    </Link>
                  </Alert>
                )}
              </div>
            </FormField>
          </Modal>
        </>
      ) : (
        <Alert header={t('pipeline:create.reportNotSupported')}>
          {t('pipeline:create.reportNotSupportedDesc')}
        </Alert>
      )}
    </Container>
  );
};

export default Reporting;
