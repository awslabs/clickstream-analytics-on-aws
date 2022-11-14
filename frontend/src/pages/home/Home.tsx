import {
  AppLayout,
  BreadcrumbGroup,
  ContentLayout,
  Grid,
} from '@cloudscape-design/components';
import Navigation from 'components/layouts/Navigation';
import HomeHeader from 'pages/home/comps/HomeHeader';
import React, { useRef } from 'react';
import BenefitsFeatures from './comps/BenefitsFeatures';
import GetStarted from './comps/GetStarted';
import HowItWorks from './comps/HowItWorks';
import MoreResource from './comps/MoreResource';
import UseCases from './comps/UseCases';

function Breadcrumbs() {
  const breadcrumbItems = [
    {
      text: 'Clickstream Analytics',
      href: '/',
    },
    {
      text: 'Home',
      href: '/',
    },
  ];
  return (
    <BreadcrumbGroup
      items={breadcrumbItems}
      expandAriaLabel="Show path"
      ariaLabel="Breadcrumbs"
    />
  );
}

function Content(props: any) {
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
}

const Home: React.FC = () => {
  const appLayout: any = useRef();
  return (
    <AppLayout
      ref={appLayout}
      content={
        <ContentLayout header={<HomeHeader />}>
          <Content />
        </ContentLayout>
      }
      headerSelector="#header"
      breadcrumbs={<Breadcrumbs />}
      navigation={<Navigation activeHref="/" />}
    />
  );
};

export default Home;
