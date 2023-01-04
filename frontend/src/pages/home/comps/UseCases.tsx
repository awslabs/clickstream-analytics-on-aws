import {
  Box,
  ColumnLayout,
  Container,
  Header,
} from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';

const UseCases: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="mt-20">
      <Container
        header={<Header variant="h2">{t('home:useCase.name')}</Header>}
      >
        <ColumnLayout columns={2} variant="text-grid">
          <div>
            <Box variant="awsui-key-label">{t('home:useCase.useCase1')}</Box>
            <div>{t('home:useCase.useCase1Desc')}</div>
          </div>
          <div>
            <Box variant="awsui-key-label">{t('home:useCase.useCase2')}</Box>
            <div>{t('home:useCase.useCase2Desc')}</div>
          </div>
        </ColumnLayout>
      </Container>
    </div>
  );
};

export default UseCases;
