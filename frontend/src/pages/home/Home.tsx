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
        <GetStarted />
        <BenefitsFeatures />
        <MoreResource />
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
