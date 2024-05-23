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
  REACT_NATIVE_INSTALL_GUIDE,
  REACT_NATIVE_INIT_SDK_TEXT,
  REACT_NATIVE_RECORD_EVENT,
  REACT_NATIVE_ADD_USER_ATTR,
  REACT_NATIVE_POD_GUIDE,
} from 'ts/guideConst';
import { buildDocumentLink } from 'ts/url';
import { defaultStr } from 'ts/utils';

interface ConfigSDKProps {
  appInfo?: IApplication;
}

const ConfigReactNativeSDK: React.FC<ConfigSDKProps> = (
  props: ConfigSDKProps
) => {
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
            <CopyCode code={REACT_NATIVE_INSTALL_GUIDE} />
          </FormField>
        </div>
        <Header
          variant="h3"
          description={t('application:sdkGuide.reactNativeSDKPodDesc')}
        ></Header>
        <div className="mt-10">
          <FormField>
            <CopyCode code={REACT_NATIVE_POD_GUIDE} />
          </FormField>
        </div>
      </div>

      <Header
        variant="h3"
        description={t('application:sdkGuide.reactNativeSDKSetupDesc')}
      >
        {t('application:sdkGuide.setupSDK')}
      </Header>

      <SpaceBetween direction="vertical" size="l">
        <FormField>
          <CopyCode
            code={REACT_NATIVE_INIT_SDK_TEXT.replace(
              TEMPLATE_APP_ID,
              defaultStr(appInfo?.appId)
            ).replace(
              TEMPLATE_SERVER_ENDPOINT,
              defaultStr(appInfo?.pipeline?.endpoint)
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
          <CopyCode code={REACT_NATIVE_RECORD_EVENT} />
        </FormField>

        <FormField label={t('application:sdkGuide.addUserAttr')}>
          <div className="mt-10">
            <CopyCode code={REACT_NATIVE_ADD_USER_ATTR} />
          </div>
        </FormField>

        <p>
          {t('application:sdkGuide.moreInfoLink', {
            sdkType: 'React Native',
          })}
          <Link
            href={buildDocumentLink(
              i18n.language,
              defaultStr(t('help:sdkRNGuideInfo.links.docLink'))
            )}
            external
          >
            {t('application:sdkGuide.devGuide')}
          </Link>
        </p>
      </SpaceBetween>
    </SpaceBetween>
  );
};

export default ConfigReactNativeSDK;
