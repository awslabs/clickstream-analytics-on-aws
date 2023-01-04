import {
  Button,
  ColumnLayout,
  Container,
  ExpandableSection,
  FormField,
  Header,
  Input,
  Multiselect,
  RadioGroup,
  Select,
  SpaceBetween,
  Tiles,
  Toggle,
} from '@cloudscape-design/components';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ECS_CLUSTER_SIZE_LIST } from 'ts/const';
import SinkKDS from './sinks/SinkKDS';
import SinkMSK from './sinks/SinkMSK';
import SinkS3 from './sinks/SinkS3';

enum DeploymentMode {
  SERVER_BASE = 'ServerBase',
  SERVERLESS = 'Serverless',
}

enum SinkType {
  S3 = 'S3',
  MSK = 'MSK',
  KDS = 'KDS',
}

const ConfigIngestion: React.FC = () => {
  const { t } = useTranslation();
  const [deployMode, setDeployMode] = useState<string>(
    DeploymentMode.SERVER_BASE
  );
  const [isHttps, setIsHttps] = useState(true);
  const [subnets, setSubnets] = useState<any>([
    {
      label: 'subnet-0cc4f589548a658a0',
      value: 'subnet-0cc4f589548a658a0',
      description: 'AZL us-east-1a',
    },
    {
      label: 'subnet-0cc4f589548a658ad',
      value: 'subnet-0cc4f589548a658ad',
      description: 'AZ: us-east-1f',
    },
    {
      label: 'subnet-0cc4f5812128a658d',
      value: 'subnet-0cc4f5812128a658d',
      description: 'AZ: us-east-2a',
    },
  ]);
  const [sinkType, setSinkType] = useState<string>(SinkType.S3);
  return (
    <SpaceBetween direction="vertical" size="l">
      <Container
        header={
          <Header
            description={t('pipeline:create.edpSettingsDesc')}
            variant="h2"
          >
            {t('pipeline:create.edpSettings')}
          </Header>
        }
      >
        <SpaceBetween direction="vertical" size="l">
          <FormField
            stretch
            label={t('pipeline:create.deployMode')}
            description={t('pipeline:create.deployModeDesc')}
          >
            <Tiles
              onChange={({ detail }) => setDeployMode(detail.value)}
              value={deployMode}
              items={[
                {
                  label: t('pipeline:create.serverBase'),
                  description: t('pipeline:create.serverBaseDesc'),
                  value: DeploymentMode.SERVER_BASE,
                },
                {
                  label: t('pipeline:create.serverless'),
                  description: t('pipeline:create.serverlessDesc'),
                  value: DeploymentMode.SERVERLESS,
                },
              ]}
            />
          </FormField>

          <FormField
            label={t('pipeline:create.ecsSize')}
            description={t('pipeline:create.ecsSizeDesc')}
          >
            <RadioGroup value={'Medium'} items={ECS_CLUSTER_SIZE_LIST} />
          </FormField>

          <FormField>
            <Toggle
              onChange={({ detail }) => setIsHttps(detail.checked)}
              checked={isHttps}
            >
              <b>{t('pipeline:create.enableHttps')}</b>
            </Toggle>
          </FormField>

          {isHttps && (
            <>
              <FormField
                label={t('pipeline:create.domainName')}
                description={t('pipeline:create.domainNameDesc')}
                secondaryControl={<Button iconName="refresh" />}
              >
                <ColumnLayout columns={3}>
                  <Input
                    placeholder={
                      t('pipeline:create.domainNamePlaceholder') || ''
                    }
                    controlId="input-1"
                    value=""
                  />
                  <Select
                    placeholder={
                      t('pipeline:create.domainNameR53Placeholder') || ''
                    }
                    selectedOption={null}
                    options={[]}
                  />
                </ColumnLayout>
              </FormField>

              <FormField
                label={t('pipeline:create.sslName')}
                description={t('pipeline:create.sslNameDesc')}
                secondaryControl={<Button iconName="refresh" />}
              >
                <Select
                  placeholder={t('pipeline:create.chooseCertPlaceholder') || ''}
                  selectedOption={null}
                  options={[]}
                />
              </FormField>

              <FormField
                label={t('pipeline:create.requestPath')}
                description={t('pipeline:create.requestPathDesc')}
              >
                <Input
                  placeholder={t('pipeline:create.requestPlaceholder') || ''}
                  value=""
                />
              </FormField>

              <ExpandableSection header={t('addtionalSettings')}>
                <SpaceBetween direction="vertical" size="l">
                  <FormField
                    label={t('pipeline:create.asName')}
                    description={t('pipeline:create.asNameDesc')}
                    stretch
                  >
                    <ColumnLayout columns={3}>
                      <div>
                        <div>{t('pipeline:create.minSize')}</div>
                        <Input controlId="input-1" value="2" />
                      </div>
                      <div>
                        <div>{t('pipeline:create.maxSize')}</div>
                        <Input controlId="input-2" value="4" />
                      </div>
                      <div>
                        <div>{t('pipeline:create.warmPool')}</div>
                        <Input controlId="input-3" value="2" />
                      </div>
                    </ColumnLayout>
                  </FormField>

                  <FormField
                    label={t('pipeline:create.subnet')}
                    description={t('pipeline:create.subnetDesc')}
                    stretch
                  >
                    <Multiselect
                      selectedOptions={subnets}
                      onChange={({ detail }) =>
                        setSubnets(detail.selectedOptions)
                      }
                      tokenLimit={2}
                      deselectAriaLabel={(e) => `Remove ${e.label}`}
                      options={[
                        {
                          label: 'subnet-0cc4f589548a658a0',
                          value: 'subnet-0cc4f589548a658a0',
                          description: 'AZL us-east-1a',
                        },
                        {
                          label: 'subnet-0cc4f589548a658ad',
                          value: 'subnet-0cc4f589548a658ad',
                          description: 'AZ: us-east-1f',
                        },
                        {
                          label: 'subnet-0cc4f5812128a658d',
                          value: 'subnet-0cc4f5812128a658d',
                          description: 'AZ: us-east-2a',
                        },
                      ]}
                      placeholder={t('pipeline:create.subnetPlaceholder') || ''}
                      selectedAriaLabel="Selected"
                    />
                  </FormField>
                </SpaceBetween>
              </ExpandableSection>
            </>
          )}
        </SpaceBetween>
      </Container>
      <Container
        header={
          <Header variant="h2" description={t('pipeline:create.dataSinkDesc')}>
            {t('pipeline:create.dataSink')}
          </Header>
        }
      >
        <SpaceBetween direction="vertical" size="l">
          <FormField
            label={t('pipeline:create.sinkType')}
            description={t('pipeline:create.sinkTypeDesc')}
            stretch
          >
            <Tiles
              onChange={({ detail }) => setSinkType(detail.value)}
              value={sinkType}
              columns={1}
              items={[
                {
                  label: t('pipeline:create.sinkS3'),
                  description: t('pipeline:create.sinkS3Desc'),
                  value: SinkType.S3,
                },
                {
                  label: t('pipeline:create.sinkMSK'),
                  description: t('pipeline:create.sinkMSKDesc'),
                  value: SinkType.MSK,
                },
                {
                  label: t('pipeline:create.sinkKDS'),
                  description: t('pipeline:create.sinkKDSDesc'),
                  value: SinkType.KDS,
                },
              ]}
            />
          </FormField>

          {sinkType === SinkType.S3 && <SinkS3 />}
          {sinkType === SinkType.MSK && <SinkMSK />}
          {sinkType === SinkType.KDS && <SinkKDS />}
        </SpaceBetween>
      </Container>
    </SpaceBetween>
  );
};

export default ConfigIngestion;
