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
