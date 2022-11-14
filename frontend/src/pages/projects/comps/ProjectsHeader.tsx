// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
import { Button, Header, SpaceBetween } from '@cloudscape-design/components';
import InfoLink from 'components/common/InfoLink';
import React from 'react';

const ProjectsHeader: React.FC = () => {
  return (
    <Header
      variant="h1"
      info={<InfoLink />}
      counter="(9)"
      actions={
        <SpaceBetween size="xs" direction="horizontal">
          <Button>View details</Button>
          <Button>Edit</Button>
          <Button variant="primary">Create</Button>
        </SpaceBetween>
      }
      description="Collection description"
    >
      Projects
    </Header>
  );
};

export default ProjectsHeader;
