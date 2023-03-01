import {
  Box,
  ColumnLayout,
  Container,
  FormField,
  Header,
  SpaceBetween,
  Table,
} from '@cloudscape-design/components';
import moment from 'moment';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { TIME_FORMAT } from 'ts/const';

interface BasicInfoProps {
  pipelineInfo?: IPipeline;
}

const BasicInfo: React.FC<BasicInfoProps> = (props: BasicInfoProps) => {
  const { t } = useTranslation();
  const { pipelineInfo } = props;
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
            <div>{pipelineInfo?.name}</div>
          </div>
          <div>
            <Box variant="awsui-key-label">{t('pipeline:desc')}</Box>
            <div>{pipelineInfo?.description}</div>
          </div>
          <div>
            <Box variant="awsui-key-label">{t('pipeline:lastEditDate')}</Box>
            <div>{moment(pipelineInfo?.updateAt).format(TIME_FORMAT)}</div>
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
              items={pipelineInfo?.tags || []}
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
