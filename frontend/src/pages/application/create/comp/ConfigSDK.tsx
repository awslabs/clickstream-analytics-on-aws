import {
  Button,
  Container,
  ExpandableSection,
  FormField,
  Grid,
  Header,
  Input,
  RadioGroup,
  SpaceBetween,
  Textarea,
} from '@cloudscape-design/components';
import AndroidConfig from 'assets/images/android.webp';
import IOSConfig from 'assets/images/ios.webp';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { EAppPlatform, IApplication, SDKType } from '../CreateApplication';

interface ConfigSDKProps {
  application: IApplication;
  changeSDKType: (type: string) => void;
  enableNextStep: (enable: boolean) => void;
}

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

const ConfigSDK: React.FC<ConfigSDKProps> = (props: ConfigSDKProps) => {
  const { application, changeSDKType, enableNextStep } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const goToProjectPage = () => {
    navigate('/project/detail/Project-01');
  };
  const handleClickPrevious = () => {
    enableNextStep(false);
  };
  return (
    <Container
      header={<Header variant="h2">{t('application:create.configSDK')}</Header>}
    >
      {application.platform?.value === EAppPlatform.Andorid && (
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
            <RadioGroup
              onChange={({ detail }) => changeSDKType(detail.value)}
              value={application.sdkType}
              items={[
                {
                  value: SDKType.Amplify,
                  label: t('application:create.amplifyAndoridSDK'),
                },
                {
                  value: SDKType.Custom,
                  label: t('application:create.mySDK'),
                },
              ]}
            />
          </FormField>
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
        </SpaceBetween>
      )}

      {application.platform?.value === EAppPlatform.IOS && (
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
            <RadioGroup
              onChange={({ detail }) => changeSDKType(detail.value)}
              value={application.sdkType}
              items={[
                {
                  value: SDKType.Amplify,
                  label: t('application:create.amplifyIOSSDK'),
                },
                { value: SDKType.Custom, label: t('application:create.mySDK') },
              ]}
            />
          </FormField>
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
        </SpaceBetween>
      )}

      {application.platform?.value === EAppPlatform.Web && (
        <SpaceBetween direction="vertical" size="l">
          <FormField label={t('application:create.steupWebSKD')}>
            <RadioGroup
              onChange={({ detail }) => changeSDKType(detail.value)}
              value={application.sdkType}
              items={[
                {
                  value: SDKType.Amplify,
                  label: t('application:create.amplifyWebSDK'),
                },
                { value: SDKType.Custom, label: t('application:create.mySDK') },
              ]}
            />
          </FormField>
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
        </SpaceBetween>
      )}
      <div className="text-right button-actions">
        <Button onClick={handleClickPrevious}>{t('button.previous')}</Button>
        <Button
          variant="primary"
          onClick={() => {
            goToProjectPage();
          }}
        >
          {t('button.complete')}
        </Button>
      </div>
    </Container>
  );
};

export default ConfigSDK;
