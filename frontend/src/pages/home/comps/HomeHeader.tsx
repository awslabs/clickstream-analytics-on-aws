// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
import { Button, Header, SpaceBetween } from '@cloudscape-design/components';
import InfoLink from 'components/common/InfoLink';
import React from 'react';

const HomeHeader: React.FC = () => {
  return (
    <Header
      variant="h1"
      info={<InfoLink />}
      actions={
        <SpaceBetween size="xs" direction="horizontal">
          <Button variant="primary">Create project</Button>
          <Button>Create pipeline</Button>
        </SpaceBetween>
      }
      description="Build a robust, cost-efffecitve, and flexible analytics platform to collect and analyze clickstream data from your websites and mobile apps, 
    providing 100% ownership and control over data that enables you to unlock full potentials of your business. "
    >
      Clickstream Analytics on AWS
    </Header>
  );
};

export default HomeHeader;
