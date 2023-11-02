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
  TextContent,
  Textarea,
} from '@cloudscape-design/components';
import { updateMetadataDisplay } from 'apis/analytics';
import Loading from 'components/common/Loading';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { USER_ATTRIBUTE_DISPLAY_PREFIX } from 'ts/const';
import MetadataSourceFC from '../comps/MetadataSource';

interface MetadataUserAttributeSplitPanelProps {
  attribute: IMetadataUserAttribute;
}

const MetadataUserAttributeSplitPanel: React.FC<
  MetadataUserAttributeSplitPanelProps
> = (props: MetadataUserAttributeSplitPanelProps) => {
  const { t } = useTranslation();
  const { attribute } = props;
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
  const [attributeDetails, setAttributeDetails] = useState(attribute);
  const [prevDisplayName, setPrevDisplayName] = useState(attribute.name);
  const [prevDesc, setPrevDesc] = useState(attribute.description);
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
        id: `${USER_ATTRIBUTE_DISPLAY_PREFIX}${attributeDetails.projectId}#${attributeDetails.appId}#${attributeDetails.category}#${attributeDetails.name}#${attributeDetails.valueType}`,
        projectId: attributeDetails.projectId,
        appId: attributeDetails.appId,
        displayName: attributeDetails.displayName,
        description: attributeDetails.description,
      });
      if (success) {
        if (type === 'displayName') {
          setPrevDisplayName(attributeDetails.displayName);
          setIsEditingDisplayName(false);
        }
        if (type === 'description') {
          setPrevDesc(attributeDetails.description);
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

  useEffect(() => {
    setLoadingData(true);
    setIsEditingDisplayName(false);
    setIsEditingDesc(false);
    setAttributeDetails(attribute);
    setLoadingData(false);
  }, [attribute.id]);

  return (
    <SplitPanel
      header={t('analytics:metadata.userAttribute.split.title')}
      i18nStrings={SPLIT_PANEL_I18NSTRINGS}
      closeBehavior="hide"
    >
      {loadingData ? (
        <Loading />
      ) : (
        <div>
          <TextContent>
            <h1>{attributeDetails.name}</h1>
            <MetadataSourceFC source={attributeDetails.metadataSource} />
          </TextContent>
          <br />
          <ColumnLayout columns={3} variant="text-grid">
            <div>
              <Box variant="awsui-key-label">
                {t('analytics:metadata.userAttribute.tableColumnDisplayName')}
              </Box>
              <div>
                {!isEditingDisplayName && (
                  <div className="flex align-center">
                    <div>{attributeDetails.displayName}</div>
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
                        value={attributeDetails.displayName}
                        onChange={(e) => {
                          setAttributeDetails((prev) => {
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
                            setAttributeDetails((prev) => {
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
                {t('analytics:metadata.userAttribute.tableColumnDataType')}
              </Box>
              <div className="mb-10">{attribute.valueType}</div>
            </div>
            <div>
              <Box variant="awsui-key-label">
                {t('analytics:metadata.userAttribute.tableColumnHasData')}
              </Box>
              <div className="mb-10">
                <StatusIndicator
                  type={attribute.hasData ? 'success' : 'stopped'}
                >
                  {attribute.hasData ? 'Yes' : 'No'}
                </StatusIndicator>
              </div>
            </div>
            <div>
              <Box variant="awsui-key-label">
                {t('analytics:metadata.userAttribute.tableColumnDescription')}
              </Box>
              <div>
                {!isEditingDesc && (
                  <div className="flex align-center">
                    <div>{attributeDetails.description}</div>
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
                        value={attributeDetails.description}
                        onChange={(e) => {
                          setAttributeDetails((prev) => {
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
                            setAttributeDetails((prev) => {
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
        </div>
      )}
    </SplitPanel>
  );
};

export default MetadataUserAttributeSplitPanel;
