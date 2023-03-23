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
  Input,
  SpaceBetween,
  Textarea,
} from '@cloudscape-design/components';
import AndroidConfig from 'assets/images/android.webp';
import IOSConfig from 'assets/images/ios.webp';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { EAppPlatform } from 'ts/const';

const STEP_ONE_TEXT = `buildscript {
  repositories {
  mavenCentral()
      jcenter()
  }
  dependencies {
  // 添加 gradle 3.2.0+ 依赖
      classpath 'com.android.tools.build:gradle:3.5.3'
      // 添加神策分析 android-gradle-plugin2 依赖
      classpath 'com.sensorsdata.analytics.android:android-gradle-plugin2:3.5.2'
  }
}`;

const IOS_STEP_INIT = `init() {
  do {
      try Amplify.add(plugin: AWSCognitoAuthPlugin())
      try Amplify.add(plugin: AWSPinpointAnalyticsPlugin())
      try Amplify.configure()
      print("Amplify configured with Auth and Analytics plugins")
  } catch {
      print("Failed to initialize Amplify with (error)")
  }
}`;

const WEB_STEP_INIT = `import { Amplify, Analytics } from 'aws-amplify';
import awsconfig from './aws-exports';
Amplify.configure(awsconfig);
`;

const WEB_STEP_RECORD = `Analytics.record({
  name: 'albumVisit',
  // Attribute values must be strings
  attributes: { genre: '', artist: '' }
});
`;

interface ConfigSDKProps {
  sdkType: string;
}

const ConfigSDK: React.FC<ConfigSDKProps> = (props: ConfigSDKProps) => {
  const { sdkType } = props;
  const { t } = useTranslation();

  return (
    <>
      {sdkType === EAppPlatform.Andorid && (
        <SpaceBetween direction="vertical" size="l">
          <Grid gridDefinition={[{ colspan: 7 }, { colspan: 5 }]}>
            <div>
              <FormField
                label={t('application:create.downloadJSON')}
                description={t('application:create.downloadJSONAndoridDesc')}
              >
                <Button iconName="download">{t('button.downloadJSON')}</Button>
                <div className="ptb-5">
                  <div>{t('application:create.configAndroidTip1')}</div>
                  <div>{t('application:create.configAndroidTip2')}</div>
                </div>
              </FormField>
            </div>
            <div>
              <FormField>
                <img alt="Android" width="240" src={AndroidConfig} />
              </FormField>
            </div>
          </Grid>
          <FormField label={t('application:create.steupSKD')}>
            <ExpandableSection
              defaultExpanded
              headerText={t('application:create.totalSteps', { step: '2' })}
            >
              <SpaceBetween direction="vertical" size="l">
                <FormField label={t('application:create.androidStep1')}>
                  <Textarea
                    disabled
                    rows={13}
                    onChange={({ detail }) => {
                      console.info(detail);
                    }}
                    value={STEP_ONE_TEXT}
                  />
                </FormField>
                <FormField label={t('application:create.androidStep2')}>
                  <Textarea
                    disabled
                    rows={13}
                    onChange={({ detail }) => {
                      console.info(detail);
                    }}
                    value={STEP_ONE_TEXT}
                  />
                </FormField>
              </SpaceBetween>
            </ExpandableSection>
          </FormField>
        </SpaceBetween>
      )}

      {sdkType === EAppPlatform.IOS && (
        <SpaceBetween direction="vertical" size="l">
          <Grid gridDefinition={[{ colspan: 7 }, { colspan: 5 }]}>
            <div>
              <FormField
                label={t('application:create.downloadJSON')}
                description={t('application:create.downloadJSONIOSDesc')}
              >
                <Button iconName="download">{t('button.downloadJSON')}</Button>
                <div className="ptb-5">
                  <div>{t('application:create.configIOSTips')}</div>
                </div>
              </FormField>
            </div>
            <div>
              <FormField>
                <img alt="IOS" width="240" src={IOSConfig} />
              </FormField>
            </div>
          </Grid>
          <FormField label={t('application:create.steupSKD')}>
            <ExpandableSection
              defaultExpanded
              headerText={t('application:create.totalSteps', { step: '1' })}
            >
              <SpaceBetween direction="vertical" size="l">
                <FormField label={t('application:create.configWebTip1')}>
                  <Textarea
                    disabled
                    rows={11}
                    onChange={({ detail }) => {
                      console.info(detail);
                    }}
                    value={IOS_STEP_INIT}
                  />
                </FormField>
              </SpaceBetween>
            </ExpandableSection>
          </FormField>
        </SpaceBetween>
      )}

      {sdkType === EAppPlatform.Web && (
        <SpaceBetween direction="vertical" size="l">
          <FormField label={t('application:create.steupWebSDK')}>
            <ExpandableSection
              defaultExpanded
              headerText={t('application:create.totalSteps', { step: '3' })}
            >
              <SpaceBetween direction="vertical" size="l">
                <FormField label={t('application:create.webStep1')}>
                  <Input disabled value={'npm install aws-amplify-js'} />
                </FormField>
                <FormField label={t('application:create.webStep2')}>
                  <Textarea
                    disabled
                    rows={4}
                    onChange={({ detail }) => {
                      console.info(detail);
                    }}
                    value={WEB_STEP_INIT}
                  />
                </FormField>
                <FormField label={t('application:create.webStep3')}>
                  <Textarea
                    disabled
                    rows={6}
                    onChange={({ detail }) => {
                      console.info(detail);
                    }}
                    value={WEB_STEP_RECORD}
                  />
                </FormField>
              </SpaceBetween>
            </ExpandableSection>
          </FormField>
        </SpaceBetween>
      )}
    </>
  );
};

export default ConfigSDK;
