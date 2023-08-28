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
  ColumnLayout,
  FormField,
  SpaceBetween,
  SplitPanel,
  TextContent,
  Textarea,
} from '@cloudscape-design/components';
import { updateUser } from 'apis/user';
import Loading from 'components/common/Loading';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IUserRole } from 'ts/const';

interface UserSplitPanelProps {
  user: IUser;
}

const UserSplitPanel: React.FC<UserSplitPanelProps> = (
  props: UserSplitPanelProps
) => {
  const { t } = useTranslation();
  const { user } = props;
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

  const [loadingData, setLoadingData] = useState(false);
  const [userDetails, setUserDetails] = useState(user);
  const [prevName, setPrevName] = useState(user.name);
  const [prevRole, setPrevRole] = useState(user.role);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [loadingUpdateRole, setLoadingUpdateRole] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [loadingUpdateName, setLoadingUpdateName] = useState(false);

  const updateUserInfo = async (type: 'name' | 'role') => {
    if (type === 'name') {
      setLoadingUpdateName(true);
    }
    if (type === 'role') {
      setLoadingUpdateRole(true);
    }

    try {
      const { success }: ApiResponse<null> = await updateUser(user);
      if (success) {
        if (type === 'name') {
          setPrevName(user.name);
          setIsEditingName(false);
        }
        if (type === 'role') {
          setPrevRole(user.role);
          setIsEditingRole(false);
        }
      }
    } catch (error) {
      console.log(error);
    }
    setLoadingUpdateName(false);
    setLoadingUpdateRole(false);
  };

  useEffect(() => {
    setIsEditingName(false);
    setIsEditingRole(false);
    setUserDetails(user);
  }, [user.email]);

  return (
    <SplitPanel
      header={t('user:split.title')}
      i18nStrings={SPLIT_PANEL_I18NSTRINGS}
      closeBehavior="hide"
    >
      {loadingData ? (
        <Loading />
      ) : (
        <div>
          <TextContent>
            <h1>{userDetails.email}</h1>
            {userDetails.email}
          </TextContent>
          <br />
          <ColumnLayout columns={3} variant="text-grid">
            <div>
              <Box variant="awsui-key-label">
                {t('user:labels.tableColumnName')}
              </Box>
              <div>
                {!isEditingName && (
                  <div className="flex align-center">
                    <div>{userDetails.name}</div>
                    <Button
                      onClick={() => {
                        setIsEditingName(true);
                      }}
                      variant="icon"
                      iconName="edit"
                    />
                  </div>
                )}
                {isEditingName && (
                  <div>
                    <FormField>
                      <Textarea
                        rows={3}
                        value={userDetails.name ?? ''}
                        onChange={(e) => {
                          setUserDetails((prev) => {
                            return {
                              ...prev,
                              name: e.detail.value,
                            };
                          });
                        }}
                      />
                    </FormField>
                    <div className="mt-5">
                      <SpaceBetween direction="horizontal" size="xs">
                        <Button
                          onClick={() => {
                            setUserDetails((prev) => {
                              return {
                                ...prev,
                                name: prevName,
                              };
                            });
                            setIsEditingName(false);
                          }}
                        >
                          {t('button.cancel')}
                        </Button>
                        <Button
                          loading={loadingUpdateName}
                          variant="primary"
                          onClick={() => {
                            updateUserInfo('name');
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
              <Box variant="awsui-key-label">
                {t('user:labels.tableColumnRole')}
              </Box>
              <div>
                {!isEditingRole && (
                  <div className="flex align-center">
                    <div>{userDetails.role}</div>
                    <Button
                      onClick={() => {
                        setIsEditingRole(true);
                      }}
                      variant="icon"
                      iconName="edit"
                    />
                  </div>
                )}
                {isEditingRole && (
                  <div>
                    <FormField>
                      <Textarea
                        rows={3}
                        value={userDetails.role ?? ''}
                        onChange={(e) => {
                          setUserDetails((prev) => {
                            return {
                              ...prev,
                              role: e.detail.value as IUserRole,
                            };
                          });
                        }}
                      />
                    </FormField>
                    <div className="mt-5">
                      <SpaceBetween direction="horizontal" size="xs">
                        <Button
                          onClick={() => {
                            setUserDetails((prev) => {
                              return {
                                ...prev,
                                role: prevRole,
                              };
                            });
                            setIsEditingName(false);
                          }}
                        >
                          {t('button.cancel')}
                        </Button>
                        <Button
                          loading={loadingUpdateRole}
                          variant="primary"
                          onClick={() => {
                            updateUserInfo('role');
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
          </ColumnLayout>
        </div>
      )}
    </SplitPanel>
  );
};

export default UserSplitPanel;
