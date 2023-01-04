import {
  AppLayout,
  Container,
  ContentLayout,
  Header,
  SpaceBetween,
  Tabs,
} from '@cloudscape-design/components';
import InfoLink from 'components/common/InfoLink';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import BasicInfo from '../comps/BasicInfo';

function Content(props: any) {
  const { id } = useParams();
  const { t } = useTranslation();
  return (
    <ContentLayout
      header={
        <SpaceBetween size="m">
          <Header variant="h1" info={<InfoLink />}>
            {id}
          </Header>
        </SpaceBetween>
      }
    >
      <SpaceBetween direction="vertical" size="l">
        <BasicInfo />
        <Container disableContentPaddings>
          <Tabs
            tabs={[
              {
                label: t('pipeline:detail.ingestionEdp'),
                id: 'endpoint',
                content: (
                  <div className="pd-20">
                    {t('pipeline:detail.ingestionEdp')}
                  </div>
                ),
              },
              {
                label: t('pipeline:detail.enrichment'),
                id: 'enrich',
                content: (
                  <div className="pd-20">{t('pipeline:detail.enrichment')}</div>
                ),
              },
              {
                label: t('pipeline:detail.dataModeling'),
                id: 'model',
                content: (
                  <div className="pd-20">
                    {t('pipeline:detail.dataModeling')}
                  </div>
                ),
              },
            ]}
          />
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
}

const PipelineDetail: React.FC = () => {
  const { t } = useTranslation();
  const breadcrumbItems = [
    {
      text: t('breadCrumb.name'),
      href: '/',
    },
    {
      text: t('breadCrumb.home'),
      href: '/',
    },
    {
      text: 'test-pipeline',
      href: '/',
    },
  ];
  return (
    <AppLayout
      content={<Content />}
      headerSelector="#header"
      breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
      navigation={<Navigation activeHref="/pipelines" />}
    />
  );
};

export default PipelineDetail;
