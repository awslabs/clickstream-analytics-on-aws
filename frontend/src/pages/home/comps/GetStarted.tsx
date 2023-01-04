import { Box, Container, Header, Link } from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';

const GetStarted: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Container
      header={<Header variant="h2">{t('home:getStarted.name')}</Header>}
    >
      <Box padding={{ vertical: 'xs' }}>
        <Link href="#">{t('home:getStarted.link1')}</Link>
      </Box>
      <Box padding={{ vertical: 'xs' }}>
        <Link href="#">{t('home:getStarted.link2')}</Link>
      </Box>
      <Box padding={{ vertical: 'xs' }}>
        <Link href="#">{t('home:getStarted.link3')}</Link>
      </Box>
      <Box padding={{ vertical: 'xs' }}>
        <Link href="#">{t('home:getStarted.link4')}</Link>
      </Box>
      <Box padding={{ vertical: 'xs' }}>
        <Link href="#">{t('home:getStarted.link5')}</Link>
      </Box>
    </Container>
  );
};

export default GetStarted;
