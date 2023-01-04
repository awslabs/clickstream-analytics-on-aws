import {
  Container,
  FormField,
  Header,
  Input,
  RadioGroup,
  Select,
  SpaceBetween,
  Textarea,
} from '@cloudscape-design/components';
import InfoLink from 'components/common/InfoLink';
import Tags from 'pages/common/Tags';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AWS_REGION_LIST,
  AWS_VPC_LIST,
  DATA_COLLECTION_SDK_LIST,
  PIPELINE_EXISTS_TEMPLATE_LIST,
} from 'ts/const';

enum PipelineCreationMethod {
  WIZARD = 'WIZARD',
  TEMPLATE = 'TEMPLATE',
}

const BasicInformation: React.FC = () => {
  const { t } = useTranslation();
  const [pipelineCreateionMethod, setPipelineCreateionMethod] =
    useState<string>(PipelineCreationMethod.WIZARD);

  return (
    <Container
      header={
        <Header variant="h2" info={<InfoLink />}>
          {t('pipeline:create.pipeline')}
        </Header>
      }
    >
      <SpaceBetween direction="vertical" size="l">
        <FormField
          label={t('pipeline:create.name')}
          description={t('pipeline:create.nameDesc')}
          constraintText={t('pipeline:create.nameConstraint')}
        >
          <Input value="" placeholder="my-pipeline" />
        </FormField>

        <FormField label={t('pipeline:create.desc')}>
          <Textarea
            value=""
            placeholder={t('pipeline:create.descPlaceholder') || ''}
          />
        </FormField>

        <FormField
          label={t('pipeline:create.awsRegion')}
          description={t('pipeline:create.awsRegionDesc')}
        >
          <Select
            placeholder={t('pipeline:create.awsRegionPlaceholder') || ''}
            selectedOption={{
              label: 'us-east-1(N.Virginia)',
              value: 'us-east-1',
            }}
            options={AWS_REGION_LIST}
            selectedAriaLabel="Selected"
          />
        </FormField>

        <FormField
          label={t('pipeline:create.vpc')}
          description={t('pipeline:create.vpcDesc')}
        >
          <Select
            placeholder={t('pipeline:create.vpcPlaceholder') || ''}
            selectedOption={{
              label: 'vpc-oaefc00ed733eb61e',
              description: '127.31.0.0/16 (default)',
              value: 'vpc-oaefc00ed733eb61e',
            }}
            options={AWS_VPC_LIST}
            selectedAriaLabel="Selected"
          />
        </FormField>

        <FormField
          label={t('pipeline:create.dataSDK')}
          description={t('pipeline:create.dataSDKDesc')}
        >
          <Select
            placeholder={t('pipeline:create.dataSDKPlaceholder') || ''}
            selectedOption={{
              label: 'Clickstream SDK (AWS Amplify)',
              value: 'clickstream',
              iconName: 'settings',
            }}
            options={DATA_COLLECTION_SDK_LIST}
            selectedAriaLabel="Selected"
          />
        </FormField>

        <FormField
          label={t('pipeline:create.creationMethod')}
          description={t('pipeline:create.creationMethodDesc')}
        >
          <RadioGroup
            onChange={({ detail }) => setPipelineCreateionMethod(detail.value)}
            value={pipelineCreateionMethod}
            items={[
              {
                value: PipelineCreationMethod.WIZARD,
                label: t('pipeline:create.followingWizard'),
                description: t('pipeline:create.followingWizardDesc'),
              },
              {
                value: PipelineCreationMethod.TEMPLATE,
                label: t('pipeline:create.usingTemplate'),
                description: t('pipeline:create.usingTemplateDesc'),
              },
            ]}
          />
        </FormField>

        {pipelineCreateionMethod === PipelineCreationMethod.TEMPLATE && (
          <FormField>
            <Select
              placeholder={t('pipeline:create.selectSDKPlaceholder') || ''}
              selectedOption={{
                label:
                  'Server-based ingestion + S3 data sink + default data model + Quicksight',
                value: '1',
              }}
              options={PIPELINE_EXISTS_TEMPLATE_LIST}
              selectedAriaLabel="Selected"
            />
          </FormField>
        )}

        <Tags />
      </SpaceBetween>
    </Container>
  );
};

export default BasicInformation;
