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
  ExpandableSection,
  FormField,
  Grid,
  Header,
  Link,
  SpaceBetween,
  Spinner,
} from '@cloudscape-design/components';
import { fetchStatusWithType } from 'apis/resource';
import AndroidConfig from 'assets/images/android.webp';
import CopyCode from 'components/common/CopyCode';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ANDROID_ADD_DEPENDENCY_TEXT,
  ANDROID_ADD_USER_ATTR,
  ANDROID_CONFIG_JSON_TEMPLATE,
  ANDROID_INIT_SDK_TEXT,
  ANDROID_RECODE_EVENT,
  DOWNLOAD_FILENAME,
  TEMPLATE_SERVER_ENDPOINT,
  TEMPLATE_APP_ID,
  TEMPLATE_ANDROID_SDK_VERSION,
  buildSDKDocumentLink,
} from 'ts/guideConst';
import { alertMsg, generateFileDownloadLink } from 'ts/utils';

interface ConfigSDKProps {
  appInfo?: IApplication;
}

const ConfigAndroidSDK: React.FC<ConfigSDKProps> = (props: ConfigSDKProps) => {
  const { appInfo } = props;
  const { t, i18n } = useTranslation();
  const [sdkLatestVersion, setSdkLatestVersion] = useState('0.4.0');
  const [loadingSdkVersion, setLoadingSdkVersion] = useState(false);

  const generateAndroidConfigFile = () => {
    // Define config content
    const fileContent = ANDROID_CONFIG_JSON_TEMPLATE.replace(
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

  const getAndroidMavenVersion = async () => {
    try {
      setLoadingSdkVersion(true);
      const { data }: ApiResponse<StatusWithTypeResponse> =
        await fetchStatusWithType({
          type: 'AndroidSDK',
        });
      setLoadingSdkVersion(false);
      if (data.ok) {
        const resDataObj = JSON.parse(data.data);
        if (resDataObj.response?.docs?.[0]?.latestVersion) {
          setSdkLatestVersion(resDataObj.response.docs[0].latestVersion);
        }
      }
    } catch (error) {
      setLoadingSdkVersion(false);
      console.error(error);
    }
  };

  useEffect(() => {
    getAndroidMavenVersion();
  }, []);

  return (
    <SpaceBetween direction="vertical" size="l">
      <Grid gridDefinition={[{ colspan: 7 }, { colspan: 5 }]}>
        <div>
          <Header
            variant="h3"
            description={t('application:sdkGuide.downloadJSONAndoridDesc')}
          >
            {t('application:sdkGuide.downloadJSON')}
          </Header>
          <div className="mt-10">
            <SpaceBetween direction="vertical" size="s">
              <Button
                onClick={() => {
                  if (!appInfo?.pipeline?.endpoint) {
                    alertMsg(t('application:sdkGuide.configAlert'), 'info');
                  } else {
                    generateAndroidConfigFile();
                  }
                }}
                iconName="download"
              >
                {t('button.downloadJSON')}
              </Button>
              <div className="ptb-5">
                <div>{t('application:sdkGuide.configAndroidTip1')}</div>
                <div>
                  {t('application:sdkGuide.configAndroidTip2', {
                    fileName: DOWNLOAD_FILENAME,
                  })}
                </div>
              </div>
            </SpaceBetween>
          </div>
        </div>
        <div>
          <FormField>
            <img alt="Android" width="300" src={AndroidConfig} />
          </FormField>
        </div>
      </Grid>
      <Header variant="h3" description={t('application:sdkGuide.setupSDKDesc')}>
        {t('application:sdkGuide.setupSDK')}
      </Header>

      <ExpandableSection
        defaultExpanded
        headerText={t('application:sdkGuide.totalSteps', { step: '3' })}
      >
        <SpaceBetween direction="vertical" size="l">
          <FormField
            label={t('application:sdkGuide.androidStep1')}
            constraintText={t('application:sdkGuide.androidSyncProject')}
          >
            <div className="mt-10">
              {loadingSdkVersion ? (
                <Spinner />
              ) : (
                <CopyCode
                  code={ANDROID_ADD_DEPENDENCY_TEXT.replace(
                    TEMPLATE_ANDROID_SDK_VERSION,
                    sdkLatestVersion
                  )}
                />
              )}
            </div>
          </FormField>
          <FormField label={t('application:sdkGuide.androidStep2')}>
            <div className="mt-10">
              <CopyCode code={ANDROID_INIT_SDK_TEXT} />
            </div>
          </FormField>
        </SpaceBetween>
      </ExpandableSection>

      <Header variant="h3" description={t('application:sdkGuide.setupSDKDesc')}>
        {t('application:sdkGuide.startUsing')}
      </Header>

      <SpaceBetween direction="vertical" size="l">
        <FormField
          label={t('application:sdkGuide.recordEvents')}
          description={t('application:sdkGuide.recordEventsDesc')}
        >
          <div className="mt-10">
            <CopyCode code={ANDROID_RECODE_EVENT} />
          </div>
        </FormField>

        <FormField label={t('application:sdkGuide.addUserAttr')}>
          <div className="mt-10">
            <CopyCode code={ANDROID_ADD_USER_ATTR} />
          </div>
        </FormField>

        <p>
          {t('application:sdkGuide.moreInfoLink', {
            sdkType: 'Android',
          })}
          <Link
            href={buildSDKDocumentLink(i18n.language, '/sdk-manual/android')}
            external
          >
            {t('application:sdkGuide.devGuide')}
          </Link>
        </p>
      </SpaceBetween>
    </SpaceBetween>
  );
};

export default ConfigAndroidSDK;
