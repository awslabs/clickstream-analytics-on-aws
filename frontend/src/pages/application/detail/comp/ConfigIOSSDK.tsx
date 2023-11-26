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
  Button,
  FormField,
  Grid,
  Header,
  Link,
  SpaceBetween,
} from '@cloudscape-design/components';
import IOSConfig from 'assets/images/ios.webp';
import CopyCode from 'components/common/CopyCode';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  IOS_ADD_USER_ATTR,
  IOS_CONFIG_JSON_TEMPLATE,
  IOS_INIT_SDK_TEXT,
  IOS_RECODE_EVENT,
  DOWNLOAD_FILENAME,
  TEMPLATE_SERVER_ENDPOINT,
  TEMPLATE_APP_ID,
  CLICKSTREAM_IOS_REPO_LINK,
} from 'ts/guideConst';
import { buildDocumentLink } from 'ts/url';
import { alertMsg, generateFileDownloadLink } from 'ts/utils';

interface ConfigSDKProps {
  appInfo?: IApplication;
}

const ConfigIOSSDK: React.FC<ConfigSDKProps> = (props: ConfigSDKProps) => {
  const { appInfo } = props;
  const { t, i18n } = useTranslation();

  const generateIOSConfigFile = () => {
    // Define config content
    const fileContent = IOS_CONFIG_JSON_TEMPLATE.replace(
      TEMPLATE_APP_ID,
      appInfo?.appId || ''
    ).replace(TEMPLATE_SERVER_ENDPOINT, appInfo?.pipeline?.endpoint || '');

    // create url object
    const url = generateFileDownloadLink(fileContent);

    // create download link
    const downloadLink: any = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = DOWNLOAD_FILENAME;
    downloadLink.click();
  };

  return (
    <SpaceBetween direction="vertical" size="l">
      <Grid gridDefinition={[{ colspan: 7 }, { colspan: 5 }]}>
        <div>
          <Header variant="h3">{t('application:sdkGuide.downloadJSON')}</Header>
          <div className="mt-10">
            <SpaceBetween direction="vertical" size="s">
              <div>
                {t('application:sdkGuide.iosAddLib')}
                <b>{t('application:sdkGuide.iosSelectFile')}</b> &gt;
                <b>{t('application:sdkGuide.iosAddPackage')}</b>
              </div>
              <div>
                {t('application:sdkGuide.iosEnterRepo1')}
                <code>
                  <b>({CLICKSTREAM_IOS_REPO_LINK})</b>
                </code>
                {t('application:sdkGuide.iosEnterRepo2')}
              </div>
              <div>
                {t('application:sdkGuide.iosDownloadJson', {
                  fileName: DOWNLOAD_FILENAME,
                })}
              </div>
              <Button
                onClick={() => {
                  if (!appInfo?.pipeline?.endpoint) {
                    alertMsg(t('application:sdkGuide.configAlert'), 'info');
                  } else {
                    generateIOSConfigFile();
                  }
                }}
                iconName="download"
              >
                {t('button.downloadJSON')}
              </Button>
            </SpaceBetween>
          </div>
        </div>
        <div>
          <FormField>
            <img alt="IOS" width="300" src={IOSConfig} />
          </FormField>
        </div>
      </Grid>
      <Header variant="h3" description={t('application:sdkGuide.setupSDKDesc')}>
        {t('application:sdkGuide.setupSDK')}
      </Header>

      <SpaceBetween direction="vertical" size="l">
        <FormField
          label={t('application:sdkGuide.iosInitSDK')}
          description={t('application:sdkGuide.iosInitSDKDesc')}
        >
          <div className="mt-10">
            <CopyCode code={IOS_INIT_SDK_TEXT} />
          </div>
        </FormField>
      </SpaceBetween>

      <Header variant="h3" description={t('application:sdkGuide.setupSDKDesc')}>
        {t('application:sdkGuide.startUsing')}
      </Header>

      <SpaceBetween direction="vertical" size="l">
        <FormField
          label={t('application:sdkGuide.recordEvents')}
          description={t('application:sdkGuide.recordEventsDesc')}
        >
          <div className="mt-10">
            <CopyCode code={IOS_RECODE_EVENT} />
          </div>
        </FormField>

        <FormField label={t('application:sdkGuide.addUserAttr')}>
          <div className="mt-10">
            <CopyCode code={IOS_ADD_USER_ATTR} />
          </div>
        </FormField>

        <p>
          {t('application:sdkGuide.moreInfoLink', {
            sdkType: 'iOS',
          })}
          <Link
            href={buildDocumentLink(
              i18n.language,
              '/swift-sdk.html',
              '/sdk-manual/swift'
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

export default ConfigIOSSDK;
