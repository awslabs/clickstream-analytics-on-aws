import { CodeEditor } from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';

const CodePage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div>
      <CodeEditor
        ace={undefined}
        language="javascript"
        value="const pi = 3.14;"
        preferences={undefined}
        onPreferencesChange={(e) => {
          console.info(e);
        }}
        i18nStrings={{
          loadingState: t('code.loadingState'),
          errorState: t('code.errorState'),
          errorStateRecovery: t('code.errorStateRecovery'),
          editorGroupAriaLabel: t('code.editorGroupAriaLabel'),
          statusBarGroupAriaLabel: t('code.statusBarGroupAriaLabel'),
          cursorPosition: (row, column) =>
            `${t('code.cursorPositionLn')} ${row}, ${t(
              'code.cursorPositionCol'
            )} ${column}`,
          errorsTab: t('code.errorsTab'),
          warningsTab: t('code.warningsTab'),
          preferencesButtonAriaLabel: t('code.preferencesButtonAriaLabel'),
          paneCloseButtonAriaLabel: t('code.paneCloseButtonAriaLabel'),
          preferencesModalHeader: t('code.preferencesModalHeader'),
          preferencesModalCancel: t('code.preferencesModalCancel'),
          preferencesModalConfirm: t('code.preferencesModalConfirm'),
          preferencesModalWrapLines: t('code.preferencesModalWrapLines'),
          preferencesModalTheme: t('code.preferencesModalTheme'),
          preferencesModalLightThemes: t('code.preferencesModalLightThemes'),
          preferencesModalDarkThemes: t('code.preferencesModalDarkThemes'),
        }}
      />
    </div>
  );
};

export default CodePage;
