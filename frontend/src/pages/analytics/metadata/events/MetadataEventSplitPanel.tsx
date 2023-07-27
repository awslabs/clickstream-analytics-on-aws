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
  Textarea,
} from '@cloudscape-design/components';
import { updateMetadataEvent } from 'apis/analytics';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface MetadataEventSplitPanelProps {
  event: IMetadataEvent;
  refreshPage?: () => void;
}

const MetadataEventSplitPanel: React.FC<MetadataEventSplitPanelProps> = (
  props: MetadataEventSplitPanelProps
) => {
  const { t } = useTranslation();
  const { event, refreshPage } = props;
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

  const [newEvent, setNewEvent] = useState(event);
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
        newEvent
      );
      if (success) {
        if (type === 'displayName') {
          setPrevDisplayName(newEvent.displayName);
          setIsEditingDisplayName(false);
        }
        if (type === 'description') {
          setPrevDesc(newEvent.description);
          setIsEditingDesc(false);
        }
        refreshPage && refreshPage();
      }
      setLoadingUpdateDesc(false);
    } catch (error) {
      setLoadingUpdateDesc(false);
    }
  };

  useEffect(() => {
    setIsEditingDesc(false);
    setNewEvent(event);
  }, [event.id]);

  return (
    <SplitPanel
      header={event.name}
      i18nStrings={SPLIT_PANEL_I18NSTRINGS}
      closeBehavior="hide"
    >
      <ColumnLayout columns={2} variant="text-grid">
        <div>
          <Box variant="awsui-key-label">
            {t('analytics:metadata.event.split.id')}
          </Box>
          <div className="mb-10">{event.id}</div>
          <Box variant="awsui-key-label">
            {t('analytics:metadata.event.split.name')}
          </Box>
          <div className="mb-10">{event.name}</div>
          <Box variant="awsui-key-label">
            {t('analytics:metadata.event.split.displayName')}
          </Box>
          <div>
            {!isEditingDisplayName && (
              <div className="flex align-center">
                <div>{newEvent.displayName}</div>
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
                    value={newEvent.displayName}
                    onChange={(e) => {
                      setNewEvent((prev) => {
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
                        setNewEvent((prev) => {
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
          <Box variant="awsui-key-label">
            {t('analytics:metadata.event.split.description')}
          </Box>
          <div>
            {!isEditingDesc && (
              <div className="flex align-center">
                <div>{newEvent.description}</div>
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
                    value={newEvent.description}
                    onChange={(e) => {
                      setNewEvent((prev) => {
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
                        setNewEvent((prev) => {
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
      </ColumnLayout>
    </SplitPanel>
  );
};

export default MetadataEventSplitPanel;
