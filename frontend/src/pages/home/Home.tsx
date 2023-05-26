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

import { AppLayout, ContentLayout, Grid } from '@cloudscape-design/components';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import HomeHeader from 'pages/home/comps/HomeHeader';
import React from 'react';
import { useTranslation } from 'react-i18next';
import BenefitsFeatures from './comps/BenefitsFeatures';
import GetStarted from './comps/GetStarted';
import HowItWorks from './comps/HowItWorks';
import MoreResource from './comps/MoreResource';
import UseCases from './comps/UseCases';

const Content: React.FC = () => {
  return (
    <div className="pb-30">
      <Grid
        gridDefinition={[
          { colspan: { l: 8, m: 8, default: 8 } },
          { colspan: { l: 4, m: 4, default: 4 } },
          { colspan: { l: 8, m: 8, default: 8 } },
          { colspan: { l: 4, m: 4, default: 4 } },
          { colspan: { l: 8, m: 8, default: 8 } },
        ]}
      >
        <HowItWorks />
        <div>
          <GetStarted />
          <div className="mt-20">
            <MoreResource />
          </div>
        </div>
        <BenefitsFeatures />
        <div></div>
        <UseCases />
      </Grid>
    </div>
  );
};

const Home: React.FC = () => {
  const { t } = useTranslation();
  const breadcrumbItems = [
    {
      text: t('breadCrumb.name'),
      href: '/',
    },
    {
      text: t('breadCrumb.home'),
      href: '/',
    },
  ];
  return (
    <AppLayout
      toolsHide
      content={
        <ContentLayout header={<HomeHeader />}>
          <Content />
        </ContentLayout>
      }
      headerSelector="#header"
      breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
      navigation={<Navigation activeHref="/" />}
    />
  );
};

export default Home;
