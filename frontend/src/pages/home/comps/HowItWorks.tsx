import {
  Box,
  ColumnLayout,
  Container,
  Header,
} from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';

const HowItWorks: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Container
      header={<Header variant="h2">{t('home:howItWorks.name')}</Header>}
    >
      <ColumnLayout columns={3} variant="text-grid">
        <div>
          <Box variant="awsui-key-label">{t('home:howItWorks.step1')}</Box>
          <Box variant="awsui-key-label">
            {t('home:howItWorks.step1SubTitle')}
          </Box>
          <div>{t('home:howItWorks.step1Desc')}</div>
        </div>
        <div>
          <Box variant="awsui-key-label">{t('home:howItWorks.step2')}</Box>
          <Box variant="awsui-key-label">
            {t('home:howItWorks.step2SubTitle')}
          </Box>
          <div>{t('home:howItWorks.step2Desc')}</div>
        </div>
        <div>
          <Box variant="awsui-key-label">{t('home:howItWorks.step3')}</Box>
          <Box variant="awsui-key-label">
            {t('home:howItWorks.step3SubTitle')}
          </Box>
          <div>{t('home:howItWorks.step3Desc')}</div>
        </div>
      </ColumnLayout>
    </Container>
  );
};

export default HowItWorks;
