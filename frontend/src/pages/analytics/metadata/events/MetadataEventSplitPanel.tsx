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
  Pagination,
  SpaceBetween,
  SplitPanel,
  StatusIndicator,
  Table,
  Tabs,
  TextContent,
  Textarea,
} from '@cloudscape-design/components';
import { getMetadataEventDetails, updateMetadataEvent } from 'apis/analytics';
import Loading from 'components/common/Loading';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { MetadataEventType } from 'ts/const';
import EventsDetailsTable from './EventsDetailsTable';

interface MetadataEventSplitPanelProps {
  event: IMetadataEvent;
}

const MetadataEventSplitPanel: React.FC<MetadataEventSplitPanelProps> = (
  props: MetadataEventSplitPanelProps
) => {
  const { t } = useTranslation();
  const { pid, appid } = useParams();
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
      const { success }: ApiResponse<null> = await updateMetadataEvent(
        eventDetails
      );
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
          pid: pid ?? '',
          appId: appid ?? '',
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
            {eventDetails.type === MetadataEventType.CUSTOM ? (
              <Badge color="blue">{MetadataEventType.CUSTOM}</Badge>
            ) : (
              <Badge>{MetadataEventType.PRESET}</Badge>
            )}
          </TextContent>
          <br />
          <ColumnLayout columns={3} variant="text-grid">
            <div>
              <Box variant="awsui-key-label">
                {t('analytics:metadata.event.tableColumnDisplayName')}
              </Box>
              <div>
                {!isEditingDisplayName && (
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
                {isEditingDisplayName && (
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
              <div className="mb-10">{event.platform}</div>
            </div>
            <div>
              <Box variant="awsui-key-label">
                {t('analytics:metadata.event.tableColumnDescription')}
              </Box>
              <div>
                {!isEditingDesc && (
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
                {isEditingDesc && (
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
                  <EventsDetailsTable
                    data={
                      eventDetails.parameters
                        ? eventDetails.parameters?.filter(
                            (p) => p.type === MetadataEventType.PRESET
                          )
                        : []
                    }
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
                  <EventsDetailsTable
                    data={
                      eventDetails.parameters
                        ? eventDetails.parameters?.filter(
                            (p) => p.type === MetadataEventType.CUSTOM
                          )
                        : []
                    }
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
