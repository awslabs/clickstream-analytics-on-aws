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
  StatusIndicator,
  Tabs,
  TextContent,
  Textarea,
} from '@cloudscape-design/components';
import { getMetadataEventDetails, updateMetadataDisplay } from 'apis/analytics';
import Loading from 'components/common/Loading';
import { UserContext } from 'context/UserContext';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { EVENT_DISPLAY_PREFIX } from 'ts/const';
import { MetadataSource } from 'ts/explore-types';
import {
  defaultStr,
  getUserInfoFromLocalStorage,
  isAnalystAuthorRole,
} from 'ts/utils';
import MetadataPlatformFC from '../comps/MetadataPlatform';
import MetadataSdkFC from '../comps/MetadataSDK';
import MetadataSourceFC from '../comps/MetadataSource';
import MetadataDetailsTable from '../table/MetadataDetailsTable';

interface MetadataEventSplitPanelProps {
  event: IMetadataEvent;
}

const MetadataEventSplitPanel: React.FC<MetadataEventSplitPanelProps> = (
  props: MetadataEventSplitPanelProps
) => {
  const { t } = useTranslation();
  const currentUser = useContext(UserContext) ?? getUserInfoFromLocalStorage();
  const { projectId, appId } = useParams();
  const { event } = props;
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
      id: 'parameterName',
      header: (
        <Box fontWeight="bold">
          {t('analytics:metadata.event.split.parameterName')}
        </Box>
      ),
      cell: (item: { name: string }) => item.name || '-',
      isRowHeader: true,
    },
    {
      id: 'parameterDisplayName',
      header: (
        <Box fontWeight="bold">
          {t('analytics:metadata.event.split.displayName')}
        </Box>
      ),
      cell: (item: { displayName: string }) => item.displayName || '-',
    },
    {
      id: 'parameterDescription',
      header: (
        <Box fontWeight="bold">
          {t('analytics:metadata.event.split.description')}
        </Box>
      ),
      cell: (item: { description: string }) => item.description || '-',
    },
    {
      id: 'parameterValueType',
      header: (
        <Box fontWeight="bold">
          {t('analytics:metadata.event.split.dataType')}
        </Box>
      ),
      cell: (item: { valueType: string }) => item.valueType || '-',
    },
  ];

  const [loadingData, setLoadingData] = useState(false);
  const [eventDetails, setEventDetails] = useState({} as IMetadataEvent);
  const [prevDisplayName, setPrevDisplayName] = useState(event.name);
  const [prevDesc, setPrevDesc] = useState(event.description);
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
        id: `${EVENT_DISPLAY_PREFIX}${eventDetails.projectId}#${eventDetails.appId}#${eventDetails.name}`,
        projectId: eventDetails.projectId,
        appId: eventDetails.appId,
        displayName: eventDetails.displayName,
        description: eventDetails.description,
      });
      if (success) {
        if (type === 'displayName') {
          setPrevDisplayName(eventDetails.displayName);
          setIsEditingDisplayName(false);
        }
        if (type === 'description') {
          setPrevDesc(eventDetails.description);
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

  const metadataEventDetails = async (event: IMetadataEvent) => {
    setLoadingData(true);
    try {
      const { success, data }: ApiResponse<IMetadataEvent> =
        await getMetadataEventDetails({
          projectId: defaultStr(projectId),
          appId: defaultStr(appId),
          eventName: event.name,
        });
      if (success) {
        setEventDetails(data);
        setLoadingData(false);
      }
    } catch (error) {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    setIsEditingDisplayName(false);
    setIsEditingDesc(false);
    metadataEventDetails(event);
  }, [event.name]);

  return (
    <SplitPanel
      header={t('analytics:metadata.event.split.title')}
      i18nStrings={SPLIT_PANEL_I18NSTRINGS}
      closeBehavior="hide"
    >
      {loadingData ? (
        <Loading />
      ) : (
        <div>
          <TextContent>
            <h1>{eventDetails.name}</h1>
            <MetadataSourceFC source={eventDetails.metadataSource} />
          </TextContent>
          <br />
          <ColumnLayout columns={3} variant="text-grid">
            <div>
              <Box variant="awsui-key-label">
                {t('analytics:metadata.event.tableColumnDisplayName')}
              </Box>
              <div>
                {!isAnalystAuthorRole(currentUser?.roles) && (
                  <div className="flex align-center">
                    <div>{eventDetails.displayName}</div>
                  </div>
                )}
                {isAnalystAuthorRole(currentUser?.roles) &&
                  !isEditingDisplayName && (
                    <div className="flex align-center">
                      <div>{eventDetails.displayName}</div>
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
                          value={eventDetails.displayName}
                          onChange={(e) => {
                            setEventDetails((prev) => {
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
                              setEventDetails((prev) => {
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
                {t('analytics:metadata.event.tableColumnDataVolumeLastDay')}
              </Box>
              <div className="mb-10">{event.dataVolumeLastDay}</div>
            </div>
            <div>
              <Box variant="awsui-key-label">
                {t('analytics:metadata.event.tableColumnPlatform')}
              </Box>
              <div className="mb-10">
                <MetadataPlatformFC platform={event.platform} />
              </div>
            </div>
            <div>
              <Box variant="awsui-key-label">
                {t('analytics:metadata.event.tableColumnDescription')}
              </Box>
              <div>
                {!isAnalystAuthorRole(currentUser?.roles) && (
                  <div className="flex align-center">
                    <div>{eventDetails.description}</div>
                  </div>
                )}
                {isAnalystAuthorRole(currentUser?.roles) && !isEditingDesc && (
                  <div className="flex align-center">
                    <div>{eventDetails.description}</div>
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
                        value={eventDetails.description}
                        onChange={(e) => {
                          setEventDetails((prev) => {
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
                            setEventDetails((prev) => {
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
            <div>
              <Box variant="awsui-key-label">
                {t('analytics:metadata.event.tableColumnHasData')}
              </Box>
              <div className="mb-10">
                <StatusIndicator type={event.hasData ? 'success' : 'stopped'}>
                  {event.hasData ? 'Yes' : 'No'}
                </StatusIndicator>
              </div>
            </div>
            <div>
              <Box variant="awsui-key-label">
                {t('analytics:metadata.event.tableColumnSdkVersion')}
              </Box>
              <div className="mb-10">
                <MetadataSdkFC sdkVersion={event.sdkVersion} />
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
                      'analytics:metadata.event.split.associatedPresetParameters'
                    )}
                  </Box>
                ),
                id: 'first',
                content: (
                  <MetadataDetailsTable
                    data={
                      eventDetails.associatedParameters
                        ? eventDetails.associatedParameters?.filter(
                            (p) => p.metadataSource === MetadataSource.PRESET
                          )
                        : []
                    }
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
                    {t(
                      'analytics:metadata.event.split.associatedCustomParameters'
                    )}
                  </Box>
                ),
                id: 'second',
                content: (
                  <MetadataDetailsTable
                    data={
                      eventDetails.associatedParameters
                        ? eventDetails.associatedParameters?.filter(
                            (p) => p.metadataSource === MetadataSource.CUSTOM
                          )
                        : []
                    }
                    tableColumnDefinitions={COLUMN_DEFINITIONS}
                    tableI18nStrings={{
                      loadingText: t('analytics:labels.tableLoading'),
                      emptyText: t('analytics:labels.tableEmpty'),
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

export default MetadataEventSplitPanel;
