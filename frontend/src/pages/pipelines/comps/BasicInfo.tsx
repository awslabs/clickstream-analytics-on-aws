import {
  Box,
  ColumnLayout,
  Container,
  FormField,
  Header,
  SpaceBetween,
  Table,
} from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';

const BasicInfo: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Container
      header={
        <Header variant="h2" description="Container description">
          {t('pipeline:basic')}
        </Header>
      }
    >
      <ColumnLayout columns={2} variant="text-grid">
        <SpaceBetween direction="vertical" size="l">
          <div>
            <Box variant="awsui-key-label">{t('pipeline:name')}</Box>
            <div>my-first-pipeline</div>
          </div>
          <div>
            <Box variant="awsui-key-label">{t('pipeline:desc')}</Box>
            <div>
              A data pipeline to collect and process data for all the games in
              US region.{' '}
            </div>
          </div>
          <div>
            <Box variant="awsui-key-label">{t('pipeline:creationMethod')}</Box>
            <div>Pipeline wizard</div>
          </div>
          <div>
            <Box variant="awsui-key-label">{t('pipeline:lastEditDate')}</Box>
            <div>Nov 26, 2022, 18:00PM UTC +8:00</div>
          </div>
        </SpaceBetween>
        <div>
          <FormField label={t('tag.name')} description={t('pipeline:tagDesc')}>
            <Table
              variant="embedded"
              columnDefinitions={[
                {
                  id: 'key',
                  header: t('tag.keyHeader'),
                  cell: (item) => item.key || '-',
                },
                {
                  id: 'value',
                  header: t('tag.valueHeader'),
                  cell: (item) => item.value || '-',
                },
              ]}
              items={[
                {
                  key: 'owner',
                  value: 'luorobin@',
                },
                {
                  key: 'project',
                  value: 'clickstream',
                },
                {
                  key: 'cost center',
                  value: '089999',
                },
                {
                  key: 'project-dev',
                  value: 'clickstream-dev',
                },
              ]}
              sortingDisabled
              empty={''}
            />
          </FormField>
        </div>
      </ColumnLayout>
    </Container>
  );
};

export default BasicInfo;
