import { Box, Container, Header, Link } from '@cloudscape-design/components';
import React from 'react';

const GetStarted = () => {
  return (
    <Container header={<Header variant="h2">Getting started</Header>}>
      <Box padding={{ vertical: 'xs' }}>
        <Link href="#">Amazon EC2 Fleet Functionality</Link>
      </Box>
      <Box padding={{ vertical: 'xs' }}>
        <Link href="#">Hands-on Workshop</Link>
      </Box>
      <Box padding={{ vertical: 'xs' }}>
        <Link href="#">Pipeline configuration</Link>
      </Box>
      <Box padding={{ vertical: 'xs' }}>
        <Link href="#">Use third-party SDK </Link>
      </Box>
      <Box padding={{ vertical: 'xs' }}>
        <Link href="#">Documentation</Link>
      </Box>
    </Container>
  );
};

export default GetStarted;
