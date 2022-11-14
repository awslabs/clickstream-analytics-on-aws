import { Box, Container, Header, Link } from '@cloudscape-design/components';
import React from 'react';

const MoreResource = () => {
  return (
    <Container header={<Header variant="h2">More resource</Header>}>
      <Box padding={{ vertical: 'xs' }}>
        <Link href="#">FAQ</Link>
      </Box>
      <Box padding={{ vertical: 'xs' }}>
        <Link href="#">Submit Issue</Link>
      </Box>
    </Container>
  );
};

export default MoreResource;
