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
import InfoLink from 'components/common/InfoLink';
import { DispatchContext } from 'context/StateContext';
import { HelpPanelType, StateActionType } from 'context/reducer';
import { cloneDeep } from 'lodash';
import { getLngFromLocalStorage } from 'pages/analytics/analytics-utils';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { defaultStr, isJson } from 'ts/utils';
import { IChannelGroup, ITrafficSource } from '../reducer/trafficReducer';

interface ChannelGroupModalProps {
  state: ITrafficSource;
  overwrite: (state: ITrafficSource) => Promise<boolean>;

  loading: boolean;
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
    overwrite,

    loading,
    visible,
    setVisible,
    modalType,
    selectedItems,
    setSelectedItems,
  } = props;
  const { t } = useTranslation();
  const localeLng = getLngFromLocalStorage();
  const helpPanelDispatch = React.useContext(DispatchContext);

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

  const preAdd = () => {
    const newState = cloneDeep(state);
    newState.channelGroups.unshift({
      id: `channelGroup-${new Date().getTime()}`,
      channel: newName,
      displayName: { [localeLng]: newName },
      description: { [localeLng]: newDescription },
      condition: JSON.parse(newCondition),
    });
    return newState;
  };

  const preEdit = () => {
    const cloneState = cloneDeep(state);
    return cloneState;
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
                onClick={async () => {
                  if (checkInput()) {
                    let newState = preAdd();
                    if (
                      modalType ===
                      t('analytics:metadata.trafficSource.modalType.edit')
                    ) {
                      newState = preEdit();
                    }
                    const success = await overwrite(newState);
                    if (success) {
                      setSelectedItems([]);
                      resetInput();
                      setVisible(false);
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
            <Input
              placeholder={defaultStr(
                t('analytics:header.inputSourcePlaceholder')
              )}
              value={newDescription}
              onChange={(e) => {
                setNewDescription(e.detail.value);
              }}
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
            info={
              <InfoLink
                onFollow={() => {
                  helpPanelDispatch?.({
                    type: StateActionType.SHOW_HELP_PANEL,
                    payload: HelpPanelType.CHANNEL_GROUP_CONDITION_INFO,
                  });
                }}
              />
            }
          >
            <Textarea
              onChange={({ detail }) => {
                setInputConditionError(false);
                setNewCondition(detail.value);
              }}
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
