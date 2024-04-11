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
  FormField,
  Input,
  Modal,
  SpaceBetween,
  Textarea,
} from '@cloudscape-design/components';
import { trafficSourceAction } from 'apis/traffic';
import { getLngFromLocalStorage } from 'pages/analytics/analytics-utils';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { defaultStr, isJson } from 'ts/utils';
import {
  IChannelGroup,
  ITrafficSource,
  ITrafficSourceAction,
  TrafficSourceAction,
} from '../reducer/trafficReducer';

interface ChannelGroupModalProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  state: ITrafficSource;
  dispatch: React.Dispatch<TrafficSourceAction>;

  visible: boolean;
  modalType: string;
  selectedItems: IChannelGroup[];
  setVisible: (v: boolean) => void;
  setSelectedItems: (items: IChannelGroup[]) => void;
}

const ChannelGroupModal: React.FC<ChannelGroupModalProps> = (
  props: ChannelGroupModalProps
) => {
  const {
    state,
    dispatch,
    loading,
    setLoading,
    visible,
    setVisible,
    modalType,
    selectedItems,
    setSelectedItems,
  } = props;
  const { t } = useTranslation();
  const localeLng = getLngFromLocalStorage();
  const [newName, setNewName] = useState('');
  const [inputNameError, setInputNameError] = useState(false);

  const [newDescription, setNewDescription] = useState('');

  const [newCondition, setNewCondition] = useState('');
  const [inputConditionError, setInputConditionError] = useState(false);

  const resetInput = () => {
    setNewName('');
    setNewDescription('');
    setNewCondition('');
    setInputConditionError(false);
    setInputNameError(false);
  };

  const checkInput = () => {
    if (!newName.trim()) {
      setInputNameError(true);
      return false;
    }
    if (!isJson(newCondition)) {
      setInputConditionError(true);
      return false;
    }
    return true;
  };

  const actionNew = async () => {
    setLoading(true);
    try {
      const channel: IChannelGroup = {
        id: `rule#${new Date().getTime()}`,
        channel: newName,
        displayName: { 'en-US': newName, 'zh-CN': newName },
        description: { 'en-US': newDescription, 'zh-CN': newDescription },
        condition: JSON.parse(newCondition),
      };
      const { success }: ApiResponse<any> = await trafficSourceAction({
        action: ITrafficSourceAction.NEW,
        projectId: state.projectId,
        appId: state.appId,
        channelGroup: channel,
      });
      if (success) {
        dispatch({ type: 'NewItem', channel });
        resetInput();
        setSelectedItems([]);
        setVisible(false);
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  const actionEdit = async () => {
    setLoading(true);
    try {
      const selectedItem = selectedItems[0];
      const channel: IChannelGroup = {
        id: selectedItem.id,
        channel: newName,
        displayName: {
          ...selectedItem.displayName,
          [localeLng]: newName,
        },
        description: {
          ...selectedItem.description,
          [localeLng]: newDescription,
        },
        condition: JSON.parse(newCondition),
      };
      const { success }: ApiResponse<any> = await trafficSourceAction({
        action: ITrafficSourceAction.UPDATE,
        projectId: state.projectId,
        appId: state.appId,
        channelGroup: channel,
      });
      if (success) {
        dispatch({ type: 'UpdateItem', channel });
        resetInput();
        setSelectedItems([]);
        setVisible(false);
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedItems.length === 1) {
      const selectedItem = selectedItems[0];
      setNewName(selectedItem.channel);
      setNewDescription(selectedItem.description[localeLng]);
      setNewCondition(JSON.stringify(selectedItem.condition, null, 2));
    }
    if (modalType === t('analytics:metadata.trafficSource.modalType.new')) {
      resetInput();
    }
  }, [selectedItems, modalType]);

  return (
    <>
      <Modal
        onDismiss={() => {
          setVisible(false);
        }}
        visible={visible}
        closeAriaLabel="Close modal"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                onClick={() => {
                  resetInput();
                  setVisible(false);
                }}
                variant="link"
              >
                {t('button.cancel')}
              </Button>
              <Button
                variant="primary"
                loading={loading}
                onClick={() => {
                  if (checkInput()) {
                    if (
                      modalType ===
                      t('analytics:metadata.trafficSource.modalType.edit')
                    ) {
                      actionEdit();
                    } else {
                      actionNew();
                    }
                  }
                }}
              >
                {t('button.confirm')}
              </Button>
            </SpaceBetween>
          </Box>
        }
        header={
          defaultStr(t('analytics:metadata.trafficSource.channelGroup.title')) +
          ' - ' +
          modalType
        }
      >
        <SpaceBetween direction="vertical" size="m">
          <FormField
            label={t(
              'analytics:metadata.trafficSource.channelGroup.columnName'
            )}
            description={t(
              'analytics:metadata.trafficSource.channelGroup.nameDesc'
            )}
            errorText={
              inputNameError
                ? t('analytics:valid.inputChannelGroupNameError')
                : ''
            }
          >
            <Input
              placeholder={defaultStr(
                t('analytics:header.inputChannelGroupNamePlaceholder')
              )}
              value={newName}
              onChange={(e) => {
                setInputNameError(false);
                setNewName(e.detail.value);
              }}
            />
          </FormField>
          <FormField
            label={t(
              'analytics:metadata.trafficSource.channelGroup.columnDescription'
            )}
            description={t(
              'analytics:metadata.trafficSource.channelGroup.descriptionDesc'
            )}
          >
            <Textarea
              onChange={({ detail }) => {
                setNewDescription(detail.value);
              }}
              rows={3}
              placeholder={defaultStr(
                t('analytics:header.inputSourcePlaceholder')
              )}
              value={newDescription}
            />
          </FormField>
          <FormField
            label={t(
              'analytics:metadata.trafficSource.channelGroup.columnCondition'
            )}
            errorText={
              inputConditionError
                ? t('analytics:valid.inputChannelGroupConditionError')
                : ''
            }
          >
            <Textarea
              onChange={({ detail }) => {
                setInputConditionError(false);
                setNewCondition(detail.value);
              }}
              rows={8}
              value={newCondition}
              placeholder={defaultStr(
                t('analytics:header.inputChannelGroupConditionPlaceholder')
              )}
            />
          </FormField>
        </SpaceBetween>
      </Modal>
    </>
  );
};

export default ChannelGroupModal;
