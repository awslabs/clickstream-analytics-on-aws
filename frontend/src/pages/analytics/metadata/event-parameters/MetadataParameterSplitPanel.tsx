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
  Tabs,
  TextContent,
  Textarea,
} from '@cloudscape-design/components';
import {
  getMetadataParametersDetails,
  updateMetadataDisplay,
} from 'apis/analytics';
import Loading from 'components/common/Loading';
import { UserContext } from 'context/UserContext';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { EVENT_PARAMETER_DISPLAY_PREFIX } from 'ts/const';
import { MetadataSource } from 'ts/explore-types';
import {
  alertMsg,
  defaultStr,
  getUserInfoFromLocalStorage,
  isAnalystAuthorRole,
} from 'ts/utils';
import MetadataPlatformFC from '../comps/MetadataPlatform';
import MetadataSourceFC from '../comps/MetadataSource';
import MetadataDetailsTable from '../table/MetadataDetailsTable';
import MetadataDictionaryTable from '../table/MetadataDictionaryTable';

interface MetadataParameterSplitPanelProps {
  parameter: IMetadataEventParameter;
}

const MetadataParameterSplitPanel: React.FC<
  MetadataParameterSplitPanelProps
> = (props: MetadataParameterSplitPanelProps) => {
  const { t } = useTranslation();
  const { projectId, appId } = useParams();
  const currentUser = useContext(UserContext) ?? getUserInfoFromLocalStorage();
  const { parameter } = props;
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

  const COLUMN_DEFINITIONS = [
    {
      id: 'eventName',
      header: (
        <Box fontWeight="bold">
          {t('analytics:metadata.event.tableColumnName')}
        </Box>
      ),
      cell: (item: { name: string }) => item.name || '-',
      sortingField: 'eventName',
      isRowHeader: true,
    },
    {
      id: 'eventDisplayName',
      header: (
        <Box fontWeight="bold">
          {t('analytics:metadata.event.tableColumnDisplayName')}
        </Box>
      ),
      cell: (item: { displayName: string }) => item.displayName || '-',
    },
    {
      id: 'eventDescription',
      header: (
        <Box fontWeight="bold">
          {t('analytics:metadata.event.tableColumnDescription')}
        </Box>
      ),
      cell: (item: { description: string }) => item.description || '-',
    },
  ];

  const [loadingData, setLoadingData] = useState(false);
  const [parameterDetails, setParameterDetails] = useState(
    {} as IMetadataEventParameter
  );
  const [prevDisplayName, setPrevDisplayName] = useState(parameter.name);
  const [prevDesc, setPrevDesc] = useState(parameter.description);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [loadingUpdateDesc, setLoadingUpdateDesc] = useState(false);
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [loadingUpdateDisplayName, setLoadingUpdateDisplayName] =
    useState(false);

  const updateEventInfo = async (type: 'displayName' | 'description') => {
    if (type === 'displayName') {
      setLoadingUpdateDisplayName(true);
    }
    if (type === 'description') {
      setLoadingUpdateDesc(true);
    }

    try {
      const { success }: ApiResponse<null> = await updateMetadataDisplay({
        id: `${EVENT_PARAMETER_DISPLAY_PREFIX}${parameterDetails.projectId}#${parameterDetails.appId}#${parameterDetails.category}#${parameterDetails.name}#${parameterDetails.valueType}`,
        projectId: parameterDetails.projectId,
        appId: parameterDetails.appId,
        displayName: parameterDetails.displayName,
        description: parameterDetails.description,
      });
      if (success) {
        if (type === 'displayName') {
          setPrevDisplayName(parameterDetails.displayName);
          setIsEditingDisplayName(false);
        }
        if (type === 'description') {
          setPrevDesc(parameterDetails.description);
          setIsEditingDesc(false);
        }
      }
      setLoadingUpdateDisplayName(false);
      setLoadingUpdateDesc(false);
    } catch (error) {
      setLoadingUpdateDisplayName(false);
      setLoadingUpdateDesc(false);
    }
  };

  const metadataParameterDetails = async (
    parameter: IMetadataEventParameter
  ) => {
    setLoadingData(true);
    try {
      const { success, data }: ApiResponse<IMetadataEventParameter> =
        await getMetadataParametersDetails({
          projectId: defaultStr(projectId),
          appId: defaultStr(appId),
          parameterName: parameter.name,
          parameterCategory: parameter.category,
          parameterType: parameter.valueType,
        });
      if (success) {
        setParameterDetails(data);
        setPrevDisplayName(data.displayName);
        setPrevDesc(data.description);
        setLoadingData(false);
      }
    } catch (error) {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    setIsEditingDisplayName(false);
    setIsEditingDesc(false);
    metadataParameterDetails(parameter);
  }, [parameter.id]);

  return (
    <SplitPanel
      header={t('analytics:metadata.eventParameter.split.title')}
      i18nStrings={SPLIT_PANEL_I18NSTRINGS}
      closeBehavior="hide"
    >
      {loadingData ? (
        <Loading />
      ) : (
        <div>
          <TextContent>
            <h1>{parameterDetails.name}</h1>
            <MetadataSourceFC source={parameterDetails.metadataSource} />
          </TextContent>
          <br />
          <ColumnLayout columns={3} variant="text-grid">
            <div>
              <Box variant="awsui-key-label">
                {t('analytics:metadata.eventParameter.tableColumnDisplayName')}
              </Box>
              <div>
                {!isAnalystAuthorRole(currentUser?.roles) && (
                  <div className="flex align-center">
                    <div>{parameterDetails.displayName}</div>
                  </div>
                )}
                {isAnalystAuthorRole(currentUser?.roles) &&
                  !isEditingDisplayName && (
                    <div className="flex align-center">
                      <div>{parameterDetails.displayName}</div>
                      <Button
                        onClick={() => {
                          setIsEditingDisplayName(true);
                        }}
                        variant="icon"
                        iconName="edit"
                      />
                    </div>
                  )}
                {isAnalystAuthorRole(currentUser?.roles) &&
                  isEditingDisplayName && (
                    <div>
                      <FormField>
                        <Textarea
                          rows={3}
                          value={parameterDetails.displayName}
                          onChange={(e) => {
                            setParameterDetails((prev) => {
                              return {
                                ...prev,
                                displayName: e.detail.value,
                              };
                            });
                          }}
                        />
                      </FormField>
                      <div className="mt-5">
                        <SpaceBetween direction="horizontal" size="xs">
                          <Button
                            onClick={() => {
                              setParameterDetails((prev) => {
                                return {
                                  ...prev,
                                  displayName: prevDisplayName,
                                };
                              });
                              setIsEditingDisplayName(false);
                            }}
                          >
                            {t('button.cancel')}
                          </Button>
                          <Button
                            loading={loadingUpdateDisplayName}
                            variant="primary"
                            onClick={() => {
                              if (
                                parameterDetails.metadataSource ===
                                MetadataSource.PRESET
                              ) {
                                alertMsg(
                                  t(
                                    'analytics:valid.metadataNotAllowEditError'
                                  ),
                                );
                                return;
                              }
                              updateEventInfo('displayName');
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
                {t('analytics:metadata.eventParameter.tableColumnDataType')}
              </Box>
              <div className="mb-10">{parameter.valueType}</div>
            </div>
            <div>
              <Box variant="awsui-key-label">
                {t('analytics:metadata.eventParameter.tableColumnPlatform')}
              </Box>
              <div className="mb-10">
                <MetadataPlatformFC platform={parameter.platform} />
              </div>
            </div>
            <div>
              <Box variant="awsui-key-label">
                {t('analytics:metadata.eventParameter.tableColumnDescription')}
              </Box>
              <div>
                {!isAnalystAuthorRole(currentUser?.roles) && (
                  <div className="flex align-center">
                    <div>{parameterDetails.description}</div>
                  </div>
                )}
                {isAnalystAuthorRole(currentUser?.roles) && !isEditingDesc && (
                  <div className="flex align-center">
                    <div>{parameterDetails.description}</div>
                    <Button
                      onClick={() => {
                        setIsEditingDesc(true);
                      }}
                      variant="icon"
                      iconName="edit"
                    />
                  </div>
                )}
                {isAnalystAuthorRole(currentUser?.roles) && isEditingDesc && (
                  <div>
                    <FormField>
                      <Textarea
                        rows={3}
                        value={parameterDetails.description}
                        onChange={(e) => {
                          setParameterDetails((prev) => {
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
                            setParameterDetails((prev) => {
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
                            if (
                              parameterDetails.metadataSource ===
                              MetadataSource.PRESET
                            ) {
                              alertMsg(
                                t('analytics:valid.metadataNotAllowEditError'),
                              );
                              return;
                            }
                            updateEventInfo('description');
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
          <br />
          <Tabs
            tabs={[
              {
                label: (
                  <Box fontWeight="bold">
                    {t(
                      'analytics:metadata.eventParameter.split.associatedEvents'
                    )}
                  </Box>
                ),
                id: 'first',
                content: (
                  <MetadataDetailsTable
                    data={parameterDetails.associatedEvents ?? []}
                    tableColumnDefinitions={COLUMN_DEFINITIONS}
                    tableI18nStrings={{
                      loadingText: t('analytics:labels.tableLoading'),
                      emptyText: t('analytics:labels.tableEmpty'),
                    }}
                  />
                ),
              },
              {
                label: (
                  <Box fontWeight="bold">
                    {t('analytics:metadata.eventParameter.split.dictionary')}
                  </Box>
                ),
                id: 'second',
                content: (
                  <MetadataDictionaryTable
                    parameter={parameterDetails}
                    tableI18nStrings={{
                      loadingText: '',
                      emptyText: '',
                      headerTitle: '',
                      headerRefreshButtonText: '',
                      filteringAriaLabel: '',
                      filteringPlaceholder: '',
                      groupPropertiesText: '',
                      operatorsText: '',
                      clearFiltersText: '',
                      applyActionText: '',
                      useText: '',
                      matchText: '',
                      matchesText: '',
                    }}
                  />
                ),
              },
            ]}
          />
        </div>
      )}
    </SplitPanel>
  );
};

export default MetadataParameterSplitPanel;
