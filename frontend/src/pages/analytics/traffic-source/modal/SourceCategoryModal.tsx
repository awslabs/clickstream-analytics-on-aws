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
  Input,
  Modal,
  Select,
  SelectProps,
  SpaceBetween,
  TokenGroup,
} from '@cloudscape-design/components';
import { cloneDeep } from 'lodash';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { defaultStr } from 'ts/utils';
import {
  ESourceCategory,
  ISourceCategory,
  ITrafficSource,
} from '../reducer/trafficReducer';

interface SourceCategoryModalProps {
  state: ITrafficSource;
  overwrite: (state: ITrafficSource) => Promise<boolean>;

  loading: boolean;
  visible: boolean;
  modalType: string;
  selectedItems: ISourceCategory[];
  setVisible: (v: boolean) => void;
  setSelectedItems: (items: ISourceCategory[]) => void;
}

const SourceCategoryModal: React.FC<SourceCategoryModalProps> = (
  props: SourceCategoryModalProps
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

  const [newDomain, setNewDomain] = useState('');
  const [inputDomainError, setInputDomainError] = useState(false);

  const [newSource, setNewSource] = useState('');
  const [inputSourceError, setInputSourceError] = useState(false);

  const [selectedCategory, setSelectedCategory] =
    useState<SelectProps.Option | null>(null);
  const [selectedCategoryError, setSelectedCategoryError] = useState(false);

  const [newPattern, setNewPattern] = useState<string>('');
  const [newPatterns, setNewPatterns] = useState<{ label: string }[]>([]);
  const [inputPatternNumError, setInputPatternNumError] = useState(false);

  const categoryOptions = [
    { label: ESourceCategory.SEARCH, value: ESourceCategory.SEARCH },
    { label: ESourceCategory.SOCIAL, value: ESourceCategory.SOCIAL },
    { label: ESourceCategory.SHOPPING, value: ESourceCategory.SHOPPING },
    { label: ESourceCategory.VIDEO, value: ESourceCategory.VIDEO },
    { label: ESourceCategory.INTERNAL, value: ESourceCategory.INTERNAL },
  ];

  const resetInput = () => {
    setNewDomain('');
    setNewSource('');
    setSelectedCategory(null);
    setNewPattern('');
    setNewPatterns([]);
    setInputDomainError(false);
    setInputSourceError(false);
    setSelectedCategoryError(false);
    setInputPatternNumError(false);
  };

  const checkInput = () => {
    if (!newDomain.trim()) {
      setInputDomainError(true);
      return false;
    }
    if (!newSource.trim()) {
      setInputSourceError(true);
      return false;
    }
    if (!selectedCategory) {
      setSelectedCategoryError(true);
      return false;
    }
    if (newPatterns.length > 10) {
      setInputPatternNumError(true);
      return false;
    }
    return true;
  };

  const preAdd = () => {
    const newState = cloneDeep(state);
    newState.sourceCategories.unshift({
      url: newDomain,
      source: newSource,
      category: selectedCategory?.value as ESourceCategory,
      params: newPatterns.map((item) => item.label),
    } as ISourceCategory);
    return newState;
  };

  const preEdit = () => {
    const cloneState = cloneDeep(state);
    const newSourceCategories = cloneState.sourceCategories.map((item) => {
      if (item.url === newDomain) {
        return {
          url: newDomain,
          source: newSource,
          category: selectedCategory?.value as ESourceCategory,
          params: newPatterns.map((item) => item.label),
        } as ISourceCategory;
      }
      return item;
    });

    const newState = { ...cloneState, sourceCategories: newSourceCategories };
    return newState;
  };

  useEffect(() => {
    if (selectedItems.length === 1) {
      const selectedItem = selectedItems[0];
      setNewDomain(selectedItem.url);
      setNewSource(selectedItem.source);
      setSelectedCategory(
        categoryOptions.find((item) => item.value === selectedItem.category) ||
          null
      );
      setNewPatterns(
        selectedItem.params.map((item) => {
          return { label: item };
        })
      );
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
          defaultStr(
            t('analytics:metadata.trafficSource.sourceCategory.title')
          ) +
          ' - ' +
          modalType
        }
      >
        <SpaceBetween direction="vertical" size="m">
          <FormField
            label={t(
              'analytics:metadata.trafficSource.sourceCategory.columnDomain'
            )}
            description={t(
              'analytics:metadata.trafficSource.sourceCategory.domainDesc'
            )}
            errorText={
              inputDomainError ? t('analytics:valid.inputDomainError') : ''
            }
          >
            <Input
              placeholder={defaultStr(
                t('analytics:header.inputDomainPlaceholder')
              )}
              value={newDomain}
              onChange={(e) => {
                setInputDomainError(false);
                setNewDomain(e.detail.value);
              }}
            />
          </FormField>
          <FormField
            label={t(
              'analytics:metadata.trafficSource.sourceCategory.columnName'
            )}
            description={t(
              'analytics:metadata.trafficSource.sourceCategory.sourceDesc'
            )}
            errorText={
              inputSourceError ? t('analytics:valid.inputSourceError') : ''
            }
          >
            <Input
              placeholder={defaultStr(
                t('analytics:header.inputSourcePlaceholder')
              )}
              value={newSource}
              onChange={(e) => {
                setInputSourceError(false);
                setNewSource(e.detail.value);
              }}
            />
          </FormField>
          <FormField
            label={t(
              'analytics:metadata.trafficSource.sourceCategory.columnCategory'
            )}
            description={t(
              'analytics:metadata.trafficSource.sourceCategory.categoryDesc'
            )}
            errorText={
              selectedCategoryError
                ? t('analytics:valid.inputCategoryError')
                : ''
            }
          >
            <Select
              placeholder={defaultStr(
                t('analytics:header.inputCategoryPlaceholder')
              )}
              selectedOption={selectedCategory}
              onChange={(e) => {
                setSelectedCategoryError(false);
                setSelectedCategory(e.detail.selectedOption);
              }}
              options={categoryOptions}
            />
          </FormField>
          <FormField
            label={t(
              'analytics:metadata.trafficSource.sourceCategory.columnPattern'
            )}
            description={t(
              'analytics:metadata.trafficSource.sourceCategory.patternDesc'
            )}
            errorText={
              inputPatternNumError
                ? t('analytics:valid.inputPatternNumError')
                : ''
            }
          >
            <ColumnLayout columns={2} variant="text-grid">
              <Input
                onChange={({ detail }) => setNewPattern(detail.value)}
                value={newPattern}
                placeholder={defaultStr(
                  t('analytics:header.inputPatternPlaceholder')
                )}
              />
              <Button
                iconName="add-plus"
                onClick={() => {
                  if (!newPattern.trim()) {
                    return false;
                  }
                  if (newPatterns.length >= 10 || newPattern.length === 0) {
                    setInputPatternNumError(true);
                    return false;
                  }
                  setNewPatterns(newPatterns.concat({ label: newPattern }));
                }}
              />
            </ColumnLayout>
            <TokenGroup
              onDismiss={({ detail: { itemIndex } }) => {
                setNewPatterns(
                  newPatterns.filter((item, eIndex) => eIndex !== itemIndex)
                );
              }}
              items={newPatterns}
            />
          </FormField>
        </SpaceBetween>
      </Modal>
    </>
  );
};

export default SourceCategoryModal;
