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
  FormField,
  Header,
  Link,
  SpaceBetween,
} from '@cloudscape-design/components';
import CopyCode from 'components/common/CopyCode';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  TEMPLATE_SERVER_ENDPOINT,
  TEMPLATE_APP_ID,
  WEB_INSTALL_GUIDE,
  WEB_INIT_SDK_TEXT,
  WEB_RECORD_EVENT,
  WEB_ADD_USER_ATTR,
  buildSDKDocumentLink,
} from 'ts/guideConst';

interface ConfigSDKProps {
  appInfo?: IApplication;
}

const ConfigWebSDK: React.FC<ConfigSDKProps> = (props: ConfigSDKProps) => {
  const { appInfo } = props;
  const { t, i18n } = useTranslation();

  return (
    <SpaceBetween direction="vertical" size="l">
      <div>
        <Header
          variant="h3"
          description={t('application:sdkGuide.webInstallSDKDesc')}
        >
          {t('application:sdkGuide.webInstallSDK')}
        </Header>
        <div className="mt-10">
          <FormField>
            <CopyCode code={WEB_INSTALL_GUIDE} />
          </FormField>
        </div>
      </div>

      <Header
        variant="h3"
        description={t('application:sdkGuide.webSDKSetupDesc')}
      >
        {t('application:sdkGuide.setupSDK')}
      </Header>

      <SpaceBetween direction="vertical" size="l">
        <FormField>
          <CopyCode
            code={WEB_INIT_SDK_TEXT.replace(
              TEMPLATE_APP_ID,
              appInfo?.appId ?? ''
            ).replace(
              TEMPLATE_SERVER_ENDPOINT,
              appInfo?.pipeline?.endpoint ?? ''
            )}
          />
        </FormField>
      </SpaceBetween>

      <Header variant="h3">{t('application:sdkGuide.startUsing')}</Header>

      <SpaceBetween direction="vertical" size="l">
        <FormField
          label={t('application:sdkGuide.recordEvents')}
          description={t('application:sdkGuide.recordEventsDesc')}
        >
          <CopyCode code={WEB_RECORD_EVENT} />
        </FormField>

        <FormField label={t('application:sdkGuide.addUserAttr')}>
          <div className="mt-10">
            <CopyCode code={WEB_ADD_USER_ATTR} />
          </div>
        </FormField>

        <p>
          {t('application:sdkGuide.moreInfoLink', {
            sdkType: 'Web',
          })}
          <Link
            href={buildSDKDocumentLink(i18n.language, '/sdk-manual/web')}
            external
          >
            {t('application:sdkGuide.devGuide')}
          </Link>
        </p>
      </SpaceBetween>
    </SpaceBetween>
  );
};

export default ConfigWebSDK;
