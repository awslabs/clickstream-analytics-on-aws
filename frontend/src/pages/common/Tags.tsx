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
import { alertMsg } from 'ts/utils';

interface TagsProps {
  tags: TagEditorProps.Tag[];
  changeTags: (tags: TagEditorProps.Tag[]) => void;
}

const Tags: React.FC<TagsProps> = (props: TagsProps) => {
  const { t } = useTranslation();
  const { tags, changeTags } = props;
  const prevItemsRef = useRef(tags.slice(0, 3));
  return (
    <TagEditor
      i18nStrings={{
        keyPlaceholder: t('tag.keyPlaceholder'),
        valuePlaceholder: t('tag.valuePlaceholder'),
        addButton: t('tag.addButton'),
        removeButton: t('tag.removeButton'),
        undoButton: t('tag.undoButton'),
        undoPrompt: t('tag.undoPrompt'),
        loading: t('tag.loading'),
        keyHeader: t('tag.keyHeader'),
        valueHeader: t('tag.valueHeader'),
        optional: t('tag.optional'),
        keySuggestion: t('tag.keySuggestion'),
        valueSuggestion: t('tag.valueSuggestion'),
        emptyTags: t('tag.emptyTags'),
        tooManyKeysSuggestion: t('tag.tooManyKeysSuggestion'),
        tooManyValuesSuggestion: t('tag.tooManyValuesSuggestion'),
        keysSuggestionLoading: t('tag.keysSuggestionLoading'),
        keysSuggestionError: t('tag.keysSuggestionError'),
        valuesSuggestionLoading: t('tag.valuesSuggestionLoading'),
        valuesSuggestionError: t('tag.valuesSuggestionError'),
        emptyKeyError: t('tag.emptyKeyError'),
        maxKeyCharLengthError: t('tag.maxKeyCharLengthError'),
        maxValueCharLengthError: t('tag.maxValueCharLengthError'),
        duplicateKeyError: t('tag.duplicateKeyError'),
        invalidKeyError: t('tag.invalidKeyError'),
        invalidValueError: t('tag.invalidValueError'),
        awsPrefixError: t('tag.awsPrefixError'),
        tagLimit: (availableTags, tagLimit) =>
          availableTags === tagLimit
            ? t('tag.tagLimit.add') + tagLimit + t('tag.tagLimit.tags')
            : availableTags === 1
            ? t('tag.tagLimit.more1')
            : t('tag.tagLimit.more2') +
              availableTags +
              t('tag.tagLimit.moreTags'),
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
            changeTags(event.detail.tags as any);
          }
        } else {
          changeTags(event.detail.tags as any);
        }
      }}
    />
  );
};

export default Tags;
