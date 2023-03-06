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
  AppLayout,
  ContentLayout,
  Header,
  SelectProps,
  SpaceBetween,
} from '@cloudscape-design/components';
import InfoLink from 'components/common/InfoLink';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConfigSDK from './comp/ConfigSDK';
import RegisterApp from './comp/RegisterApp';

export enum EAppPlatform {
  Andorid = 'Andorid',
  IOS = 'IOS',
  Web = 'Web',
}

export enum SDKType {
  Amplify = 'Amplify',
  Custom = 'Custom',
}

export const AppPlatformOptions: SelectProps.Option[] = [
  {
    label: EAppPlatform.Andorid,
    value: EAppPlatform.Andorid,
    iconName: 'settings',
  },
  {
    label: EAppPlatform.IOS,
    value: EAppPlatform.IOS,
    iconName: 'unlocked',
  },
  {
    label: EAppPlatform.Web,
    value: EAppPlatform.Web,
    iconName: 'share',
  },
];

export interface IApplication {
  platform: SelectProps.Option | null;
  nextEnable: boolean;
  sdkType: string;
}

function Content(props: any) {
  const [application, setApplication] = useState<IApplication>({
    platform: {
      label: EAppPlatform.Andorid,
      value: EAppPlatform.Andorid,
      iconName: 'settings',
    },
    nextEnable: false,
    sdkType: SDKType.Amplify,
  });
  return (
    <ContentLayout
      header={
        <SpaceBetween size="m">
          <Header variant="h1" info={<InfoLink />}>
            Project-demo
          </Header>
        </SpaceBetween>
      }
    >
      <SpaceBetween direction="vertical" size="l">
        <RegisterApp
          application={application}
          changePlatform={(platform) => {
            setApplication((prev) => {
              return {
                ...prev,
                nextEnable: false,
                platform: platform,
              };
            });
          }}
          enableNextStep={(enable) => {
            setApplication((prev) => {
              return {
                ...prev,
                nextEnable: enable,
              };
            });
          }}
        />

        {application.nextEnable && (
          <ConfigSDK
            application={application}
            changeSDKType={(type) => {
              setApplication((prev) => {
                return {
                  ...prev,
                  sdkType: type,
                };
              });
            }}
            enableNextStep={(enable) => {
              setApplication((prev) => {
                return {
                  ...prev,
                  nextEnable: enable,
                };
              });
            }}
          />
        )}
      </SpaceBetween>
    </ContentLayout>
  );
}

const CreateApplication = () => {
  const { t } = useTranslation();
  const breadcrumbItems = [
    {
      text: t('breadCrumb.name'),
      href: '/',
    },
    {
      text: t('breadCrumb.projects'),
      href: '/projects',
    },
    {
      text: 'Project-demo',
      href: '/',
    },
  ];
  return (
    <AppLayout
      content={<Content />}
      headerSelector="#header"
      breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
      navigation={<Navigation activeHref="/projects" />}
    />
  );
};

export default CreateApplication;
