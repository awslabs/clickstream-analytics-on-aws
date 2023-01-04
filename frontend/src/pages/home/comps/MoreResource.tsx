import { Box, Container, Header, Link } from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';

const MoreResource: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Container
      header={<Header variant="h2">{t('home:moreResource.name')}</Header>}
    >
      <Box padding={{ vertical: 'xs' }}>
        <Link href="#">{t('home:moreResource.faq')}</Link>
      </Box>
      <Box padding={{ vertical: 'xs' }}>
        <Link href="#">{t('home:moreResource.submitIssue')}</Link>
      </Box>
    </Container>
  );
};

export default MoreResource;
