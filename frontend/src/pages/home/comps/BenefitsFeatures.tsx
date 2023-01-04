import {
  Box,
  ColumnLayout,
  Container,
  Header,
} from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';

const BenefitsFeatures: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Container header={<Header variant="h2">{t('home:benefits.name')}</Header>}>
      <ColumnLayout columns={2} variant="text-grid">
        <div>
          <Box variant="awsui-key-label">{t('home:benefits.benefit1')}</Box>
          <div>{t('home:benefits.benefit1Desc')}</div>
        </div>
        <div>
          <Box variant="awsui-key-label">{t('home:benefits.benefit2')}</Box>
          <div>{t('home:benefits.benefit2Desc')}</div>
        </div>
        <div>
          <Box variant="awsui-key-label">{t('home:benefits.benefit3')}</Box>
          <div>{t('home:benefits.benefit3Desc')}</div>
        </div>
        <div>
          <Box variant="awsui-key-label">{t('home:benefits.benefit4')}</Box>
          <div>{t('home:benefits.benefit4Desc')}</div>
        </div>
      </ColumnLayout>
    </Container>
  );
};

export default BenefitsFeatures;
