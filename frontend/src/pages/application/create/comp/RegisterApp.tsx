import {
  Button,
  Container,
  FormField,
  Grid,
  Header,
  Input,
  Select,
  SelectProps,
  SpaceBetween,
} from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  AppPlatformOptions,
  EAppPlatform,
  IApplication,
} from '../CreateApplication';

interface IRegisterAppProps {
  application: IApplication;
  changePlatform: (platform: SelectProps.Option) => void;
  enableNextStep: (enable: boolean) => void;
}

const RegisterApp: React.FC<IRegisterAppProps> = (props: IRegisterAppProps) => {
  const { t } = useTranslation();
  const { application, changePlatform, enableNextStep } = props;
  return (
    <Container
      header={
        <Header variant="h2">{t('application:create.registerApp')}</Header>
      }
    >
      <SpaceBetween direction="vertical" size="l">
        <FormField label={t('application:create.selectPlatform')}>
          <Select
            selectedOption={application.platform}
            onChange={({ detail }) => changePlatform(detail.selectedOption)}
            options={AppPlatformOptions}
            selectedAriaLabel="Selected"
          />
        </FormField>

        {application.platform?.value && (
          <>
            <FormField label={t('application:create.provideInfo')}>
              {application.platform?.value === EAppPlatform.Andorid && (
                <>
                  <Grid gridDefinition={[{ colspan: 6 }, { colspan: 6 }]}>
                    <div>
                      <FormField
                        label={t('application:create.androidPackageName')}
                      >
                        <Input placeholder="com.company.appname" value="" />
                      </FormField>
                    </div>
                    <div>
                      <FormField label={t('application:create.appNickName')}>
                        <Input placeholder="My Android App" value="" />
                      </FormField>
                    </div>
                  </Grid>
                </>
              )}

              {application.platform?.value === EAppPlatform.IOS && (
                <>
                  <Grid
                    gridDefinition={[
                      { colspan: 4 },
                      { colspan: 4 },
                      { colspan: 4 },
                    ]}
                  >
                    <div>
                      <FormField label={t('application:create.iosAppBundleId')}>
                        <Input placeholder="com.company.appname" value="" />
                      </FormField>
                    </div>
                    <div>
                      <FormField label={t('application:create.appNickName')}>
                        <Input placeholder="My iOS App" value="" />
                      </FormField>
                    </div>
                    <div>
                      <FormField
                        label={
                          <span>
                            {t('application:create.iosAppStoreId')}
                            <i> - {t('optional')}</i>
                          </span>
                        }
                      >
                        <Input placeholder="12345678" value="" />
                      </FormField>
                    </div>
                  </Grid>
                </>
              )}

              {application.platform?.value === EAppPlatform.Web && (
                <>
                  <Grid gridDefinition={[{ colspan: 12 }]}>
                    <div>
                      <FormField label={t('application:create.appNickName')}>
                        <Input placeholder="My Web App" value="" />
                      </FormField>
                    </div>
                  </Grid>
                </>
              )}
            </FormField>
            <div className="text-right">
              <Button
                variant="primary"
                onClick={() => {
                  enableNextStep(true);
                }}
              >
                {t('button.next')}
              </Button>
            </div>
          </>
        )}
      </SpaceBetween>
    </Container>
  );
};

export default RegisterApp;
