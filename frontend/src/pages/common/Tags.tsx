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

import { TagEditor, TagEditorProps } from '@cloudscape-design/components';
import { isEqual } from 'lodash';
import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { alertMsg, defaultStr } from 'ts/utils';

interface TagsProps {
  tags: TagEditorProps.Tag[];
  changeTags: (tags: readonly TagEditorProps.Tag[]) => void;
}

const Tags: React.FC<TagsProps> = (props: TagsProps) => {
  const { t } = useTranslation();
  const { tags, changeTags } = props;
  const prevItemsRef = useRef(tags.slice(0, 3));

  const renderTagLimit = (availableTags: number, tagLimit: number) => {
    if (availableTags === tagLimit) {
      return t('tag.tagLimit.add') + tagLimit + t('tag.tagLimit.tags');
    } else if (availableTags === 1) {
      return t('tag.tagLimit.more1');
    } else {
      return (
        t('tag.tagLimit.more2') + availableTags + t('tag.tagLimit.moreTags')
      );
    }
  };

  return (
    <TagEditor
      i18nStrings={{
        keyPlaceholder: defaultStr(t('tag.keyPlaceholder')),
        valuePlaceholder: defaultStr(t('tag.valuePlaceholder')),
        addButton: defaultStr(t('tag.addButton')),
        removeButton: defaultStr(t('tag.removeButton')),
        undoButton: defaultStr(t('tag.undoButton')),
        undoPrompt: defaultStr(t('tag.undoPrompt')),
        loading: defaultStr(t('tag.loading')),
        keyHeader: defaultStr(t('tag.keyHeader')),
        valueHeader: defaultStr(t('tag.valueHeader')),
        optional: defaultStr(t('tag.optional')),
        keySuggestion: defaultStr(t('tag.keySuggestion')),
        valueSuggestion: defaultStr(t('tag.valueSuggestion')),
        emptyTags: defaultStr(t('tag.emptyTags')),
        tooManyKeysSuggestion: defaultStr(t('tag.tooManyKeysSuggestion'), ''),
        tooManyValuesSuggestion: defaultStr(
          t('tag.tooManyValuesSuggestion'),
          ''
        ),
        keysSuggestionLoading: defaultStr(t('tag.keysSuggestionLoading'), ''),
        keysSuggestionError: defaultStr(t('tag.keysSuggestionError')),
        valuesSuggestionLoading: defaultStr(
          t('tag.valuesSuggestionLoading'),
          ''
        ),
        valuesSuggestionError: defaultStr(t('tag.valuesSuggestionError'), ''),
        emptyKeyError: defaultStr(t('tag.emptyKeyError')),
        maxKeyCharLengthError: defaultStr(t('tag.maxKeyCharLengthError'), ''),
        maxValueCharLengthError: defaultStr(
          t('tag.maxValueCharLengthError'),
          ''
        ),
        duplicateKeyError: defaultStr(t('tag.duplicateKeyError')),
        invalidKeyError: defaultStr(t('tag.invalidKeyError')),
        invalidValueError: defaultStr(t('tag.invalidValueError')),
        awsPrefixError: defaultStr(t('tag.awsPrefixError')),
        tagLimit: (availableTags, tagLimit) =>
          renderTagLimit(availableTags, tagLimit),
        tagLimitReached: (tagLimit) =>
          tagLimit === 1
            ? t('tag.tagLimit.reach1')
            : t('tag.tagLimit.reach2') + tagLimit + t('tag.tagLimit.tags'),
        tagLimitExceeded: (tagLimit) =>
          tagLimit === 1
            ? t('tag.tagLimit.exceed1')
            : t('tag.tagLimit.exceed2') + tagLimit + t('tag.tagLimit.tags'),
        enteredKeyLabel: (key) => t('tag.tagLimit.use') + key + '"',
        enteredValueLabel: (value) => t('tag.tagLimit.use') + value + '"',
      }}
      tags={tags}
      onChange={(event) => {
        if (event.detail.tags.length >= 3) {
          const prevItems = prevItemsRef.current;
          const currentItems = event.detail.tags.slice(0, 3);
          let changeCount = 0;
          for (let i = 0; i < currentItems.length; i++) {
            if (!isEqual(prevItems[i], currentItems[i])) {
              changeCount = changeCount + 1;
            }
          }
          if (changeCount > 0) {
            alertMsg(t('tag.deleteTips'), 'error');
            return;
          } else {
            changeTags(event.detail.tags);
          }
        } else {
          changeTags(event.detail.tags);
        }
      }}
    />
  );
};

export default Tags;
