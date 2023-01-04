import { TagEditor } from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';

const Tags: React.FC = () => {
  const { t } = useTranslation();
  const [tags, setTags] = React.useState<any>([
    {
      key: 'some-custom-key-1',
      value: 'some-value-1',
      existing: false,
    },
  ]);
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
      onChange={({ detail }) => setTags(detail.tags)}
      keysRequest={() => Promise.resolve(['some-existing-key-3'])}
      valuesRequest={(key, value) =>
        key ? Promise.resolve(['value 1']) : Promise.reject()
      }
    />
  );
};

export default Tags;
