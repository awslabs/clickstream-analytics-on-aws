/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

import {
  Alert,
  Button,
  Checkbox,
  ColumnLayout,
  Container,
  ExpandableSection,
  FormField,
  Grid,
  Header,
  Input,
  Link,
  Multiselect,
  Select,
  SelectProps,
  SpaceBetween,
  Tiles,
} from '@cloudscape-design/components';
import { OptionDefinition } from '@cloudscape-design/components/internal/components/option/interfaces';
import { getCertificates, getSSMSecrets, getSubnetList } from 'apis/resource';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProtocalType, SinkType } from 'ts/const';
import BufferKDS from './buffer/BufferKDS';
import BufferMSK from './buffer/BufferMSK';
import BufferS3 from './buffer/BufferS3';

interface ConfigIngestionProps {
  pipelineInfo: IExtPipeline;
  changePublicSubnets: (subnets: OptionDefinition[]) => void;
  changePrivateSubnets: (subnets: OptionDefinition[]) => void;
  changeServerMin: (min: string) => void;
  changeServerMax: (max: string) => void;
  changeWarmSize: (size: string) => void;
  changeDomainName: (name: string) => void;
  changeEnableALBAccessLog: (enable: boolean) => void;
  changeEnableAGA: (enable: boolean) => void;
  changeProtocal: (protocal: string) => void;
  changeServerEdp: (endpoint: string) => void;
  changeCertificate: (cert: SelectProps.Option) => void;
  changeSSMSecret: (secret: SelectProps.Option) => void;
  changeBufferType: (type: string) => void;
  changeBufferS3Bucket: (s3: string) => void;
  changeBufferS3Prefix: (prefix: string) => void;
  changeS3BufferSize: (size: string) => void;
  changeBufferInterval: (interval: string) => void;

  changeSelfHosted: (selfHosted: boolean) => void;
  changeCreateMSKMethod: (type: string) => void;
  changeSelectedMSK: (msk: SelectProps.Option) => void;
  changeMSKTopic: (topic: string) => void;
  changeKafkaBrokers: (brokers: string) => void;
  changeKafkaTopic: (topic: string) => void;
  changeEnableKafkaConnector: (enable: boolean) => void;

  changeKDSProvisionType: (provision: SelectProps.Option) => void;
  changeKDSShardNumber: (num: string) => void;
  changeEnableALBAuthentication: (enable: boolean) => void;
  changeAckownledge: () => void;

  publicSubnetError: boolean;
  privateSubnetError: boolean;
  domainNameEmptyError: boolean;
  certificateEmptyError: boolean;
  bufferS3BucketEmptyError: boolean;
  acknowledgedHTTPSecurity: boolean;
}

const ConfigIngestion: React.FC<ConfigIngestionProps> = (
  props: ConfigIngestionProps
) => {
  const { t } = useTranslation();
  const {
    pipelineInfo,
    changePublicSubnets,
    changePrivateSubnets,
    changeServerMin,
    changeServerMax,
    changeWarmSize,
    changeDomainName,
    changeEnableALBAccessLog,
    changeEnableAGA,
    changeProtocal,
    changeServerEdp,
    changeCertificate,
    changeSSMSecret,
    changeBufferType,
    changeBufferS3Bucket,
    changeBufferS3Prefix,
    changeS3BufferSize,
    changeBufferInterval,
    changeSelfHosted,
    changeCreateMSKMethod,
    changeSelectedMSK,
    changeMSKTopic,
    changeKafkaBrokers,
    changeKafkaTopic,
    changeEnableKafkaConnector,
    changeKDSProvisionType,
    changeKDSShardNumber,
    changeAckownledge,
    changeEnableALBAuthentication,
    publicSubnetError,
    privateSubnetError,
    domainNameEmptyError,
    certificateEmptyError,
    bufferS3BucketEmptyError,
    acknowledgedHTTPSecurity,
  } = props;
  const [loadingSubnet, setLoadingSubnet] = useState(false);
  const [loadingCertificate, setLoadingCertificate] = useState(false);
  const [loadingSecret, setLoadingSecret] = useState(false);
  const [publicSubnetOptionList, setPublicSubnetOptionList] =
    useState<SelectProps.Options>([]);
  const [privateSubnetOptionList, setPrivateSubnetOptionList] =
    useState<SelectProps.Options>([]);
  const [certificateOptionList, setCertificateOptionList] =
    useState<SelectProps.Options>([]);
  const [ssmSecretOptionList, setSsmSecretOptionList] =
    useState<SelectProps.Options>([]);

  // get subnet list
  const getSubnetListByRegionAndVPC = async (region: string, vpcId: string) => {
    setLoadingSubnet(true);
    try {
      const { success, data }: ApiResponse<SubnetResponse[]> =
        await getSubnetList({
          region: region,
          vpcId: vpcId,
        });
      if (success) {
        const publicSubnets = data.filter(
          (element) => element.type === 'public'
        );
        const privateSubnets = data.filter(
          (element) => element.type === 'private'
        );
        const publicSubnetOptions = publicSubnets.map((element) => ({
          label: `${element.name}(${element.id})`,
          value: element.id,
          description: `${element.availabilityZone}:${element.cidr}`,
        }));
        const privateSubnetOptions = privateSubnets.map((element) => ({
          label: `${element.name}(${element.id})`,
          value: element.id,
          description: `${element.availabilityZone}:${element.cidr}`,
        }));
        setPublicSubnetOptionList(publicSubnetOptions);
        setPrivateSubnetOptionList(privateSubnetOptions);
        setLoadingSubnet(false);
      }
    } catch (error) {
      setLoadingSubnet(false);
    }
  };

  // get certificate list
  const getCetificateListByRegion = async () => {
    setLoadingCertificate(true);
    try {
      const { success, data }: ApiResponse<CetificateResponse[]> =
        await getCertificates({ region: pipelineInfo.region });
      if (success) {
        const certificateOptions: SelectProps.Options = data.map((element) => ({
          label: element.domain,
          value: element.arn,
        }));
        setCertificateOptionList(certificateOptions);
        setLoadingCertificate(false);
      }
    } catch (error) {
      setLoadingCertificate(false);
    }
  };

  // get ssm secret list
  const getSSMSecretListByReion = async () => {
    setLoadingSecret(true);
    try {
      const { success, data }: ApiResponse<SSMSecretRepoose[]> =
        await getSSMSecrets({ region: pipelineInfo.region });
      if (success) {
        const secretOptions: SelectProps.Options = data.map((element) => ({
          label: element.name,
          value: element.arn,
        }));
        setSsmSecretOptionList(secretOptions);
        setLoadingSecret(false);
      }
    } catch (error) {
      setLoadingSecret(false);
    }
  };

  useEffect(() => {
    if (pipelineInfo.selectedRegion && pipelineInfo.selectedVPC) {
      getSubnetListByRegionAndVPC(
        pipelineInfo.selectedRegion.value || '',
        pipelineInfo.selectedVPC.value || ''
      );
    }
  }, [pipelineInfo.selectedRegion, pipelineInfo.selectedVPC]);

  useEffect(() => {
    getCetificateListByRegion();
    getSSMSecretListByReion();
  }, []);

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
            label={t('pipeline:create.publicSubnet')}
            description={t('pipeline:create.publicSubnetDesc')}
            stretch
            errorText={
              publicSubnetError ? t('pipeline:valid.publicSubnetEmpty') : ''
            }
          >
            <Multiselect
              selectedOptions={pipelineInfo.selectedPublicSubnet}
              tokenLimit={2}
              deselectAriaLabel={(e) => `${t('remove')} ${e.label}`}
              options={publicSubnetOptionList}
              placeholder={t('pipeline:create.subnetPlaceholder') || ''}
              selectedAriaLabel="Selected"
              statusType={loadingSubnet ? 'loading' : 'finished'}
              onChange={(e) => {
                changePublicSubnets(e.detail.selectedOptions as any);
              }}
            />
          </FormField>

          <FormField
            label={t('pipeline:create.privateSubnet')}
            description={t('pipeline:create.privateSubnetDesc')}
            stretch
            errorText={
              privateSubnetError ? t('pipeline:valid.privateSubnetEmpty') : ''
            }
          >
            <Multiselect
              selectedOptions={pipelineInfo.selectedPrivateSubnet}
              tokenLimit={2}
              deselectAriaLabel={(e) => `${t('remove')} ${e.label}`}
              options={privateSubnetOptionList}
              placeholder={t('pipeline:create.subnetPlaceholder') || ''}
              selectedAriaLabel="Selected"
              statusType={loadingSubnet ? 'loading' : 'finished'}
              onChange={(e) => {
                changePrivateSubnets(e.detail.selectedOptions as any);
              }}
            />
          </FormField>

          <FormField
            label={t('pipeline:create.ingestionCapacity')}
            description={t('pipeline:create.ingestionCapacityDesc')}
            stretch
          >
            <ColumnLayout columns={3}>
              <div>
                <div>{t('pipeline:create.minSize')}</div>
                <Input
                  type="number"
                  value={pipelineInfo.ingestionServer.size.serverMin}
                  onChange={(e) => {
                    changeServerMin(e.detail.value);
                  }}
                />
              </div>
              <div>
                <div>{t('pipeline:create.maxSize')}</div>
                <Input
                  type="number"
                  value={pipelineInfo.ingestionServer.size.serverMax}
                  onChange={(e) => {
                    changeServerMax(e.detail.value);
                  }}
                />
              </div>
              <div>
                <div>{t('pipeline:create.warmPool')}</div>
                <Input
                  type="number"
                  value={pipelineInfo.ingestionServer.size.warmPoolSize}
                  onChange={(e) => {
                    changeWarmSize(e.detail.value);
                  }}
                />
              </div>
            </ColumnLayout>
          </FormField>

          <FormField>
            <Checkbox
              onChange={({ detail }) =>
                changeProtocal(
                  detail.checked ? ProtocalType.HTTPS : ProtocalType.HTTP
                )
              }
              checked={
                pipelineInfo.ingestionServer.loadBalancer.protocol ===
                ProtocalType.HTTPS
              }
            >
              <b>{t('pipeline:create.enableHttps')}</b>
            </Checkbox>
          </FormField>

          {pipelineInfo.ingestionServer.loadBalancer.protocol ===
            ProtocalType.HTTP && (
            <FormField
              stretch
              errorText={
                !acknowledgedHTTPSecurity &&
                t('pipeline:valid.acknowledgeHTTPSecurity')
              }
            >
              <div className="mb-5">
                <Alert
                  type="warning"
                  action={
                    !acknowledgedHTTPSecurity && (
                      <Button
                        onClick={() => {
                          changeAckownledge();
                        }}
                      >
                        {t('button.acknowledge')}
                      </Button>
                    )
                  }
                  header={t('pipeline:create.securityWarning')}
                >
                  {t('pipeline:create.securityWarningDesc')}
                </Alert>
              </div>
            </FormField>
          )}

          {pipelineInfo.ingestionServer.loadBalancer.protocol ===
            ProtocalType.HTTPS && (
            <Grid
              gridDefinition={[{ colspan: 4 }, { colspan: 4 }, { colspan: 4 }]}
            >
              <div>
                <FormField
                  label={t('pipeline:create.domainName')}
                  errorText={
                    domainNameEmptyError
                      ? t('pipeline:valid.domainNameEmpty')
                      : ''
                  }
                >
                  <Input
                    placeholder="example.domain.com"
                    value={pipelineInfo.ingestionServer.domain.domainName}
                    onChange={(e) => {
                      changeDomainName(e.detail.value);
                    }}
                  />
                </FormField>
              </div>
              <div>
                <FormField
                  label={t('pipeline:create.certificate')}
                  errorText={
                    certificateEmptyError
                      ? t('pipeline:valid.certificateEmpty')
                      : ''
                  }
                >
                  <Select
                    statusType={loadingCertificate ? 'loading' : 'finished'}
                    placeholder={t('pipeline:create.selectCertificate') || ''}
                    selectedOption={pipelineInfo.selectedCertificate}
                    options={certificateOptionList}
                    onChange={(e) => {
                      changeCertificate(e.detail.selectedOption);
                    }}
                  />
                </FormField>
              </div>
              <div
                style={{
                  paddingTop: 25,
                }}
              >
                <Button
                  iconName="refresh"
                  loading={loadingCertificate}
                  onClick={() => {
                    getCetificateListByRegion();
                  }}
                />
              </div>
            </Grid>
          )}

          {pipelineInfo.ingestionServer.loadBalancer.protocol ===
            ProtocalType.HTTPS && (
            <Alert header={t('pipeline:create.nextSteps')}>
              {t('pipeline:create.nextStepsDesc')}
            </Alert>
          )}

          <ExpandableSection headerText={t('addtionalSettings')}>
            <SpaceBetween direction="vertical" size="l">
              <FormField
                label={t('pipeline:create.requestPath')}
                description={t('pipeline:create.requestPathDesc')}
              >
                <Input
                  placeholder={t('pipeline:create.requestPlaceholder') || ''}
                  value={
                    pipelineInfo.ingestionServer.loadBalancer.serverEndpointPath
                  }
                  onChange={(e) => {
                    changeServerEdp(e.detail.value);
                  }}
                />
              </FormField>

              <Checkbox
                onChange={({ detail }) => {
                  changeEnableAGA(detail.checked);
                }}
                checked={
                  pipelineInfo.ingestionServer.loadBalancer
                    .enableGlobalAccelerator
                }
                description={t('pipeline:create.agaDesc')}
              >
                <b>{t('pipeline:create.aga')}</b>
              </Checkbox>

              <div>
                <Checkbox
                  onChange={({ detail }) =>
                    changeEnableALBAuthentication(detail.checked)
                  }
                  checked={pipelineInfo.enableAuthentication}
                  description={t('pipeline:create.authDesc')}
                >
                  <b>{t('pipeline:create.auth')}</b>
                </Checkbox>
                <div className="plr-20">
                  {pipelineInfo.enableAuthentication && (
                    <FormField label={t('pipeline:create.secret')}>
                      <Select
                        statusType={loadingSecret ? 'loading' : 'finished'}
                        placeholder={t('pipeline:create.selectSecret') || ''}
                        selectedOption={pipelineInfo.selectedSecret}
                        options={ssmSecretOptionList}
                        onChange={(e) => {
                          changeSSMSecret(e.detail.selectedOption);
                        }}
                      />
                    </FormField>
                  )}
                </div>
              </div>

              <Checkbox
                onChange={({ detail }) =>
                  changeEnableALBAccessLog(detail.checked)
                }
                checked={
                  pipelineInfo.ingestionServer.loadBalancer
                    .enableApplicationLoadBalancerAccessLog
                }
                description={t('pipeline:create.enableALBLogDesc')}
              >
                <b>{t('pipeline:create.enableALBLog')}</b>
              </Checkbox>
            </SpaceBetween>
          </ExpandableSection>
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
            label={t('pipeline:create.bufferType')}
            description={t('pipeline:create.bufferTypeDesc')}
            stretch
          >
            <Tiles
              onChange={({ detail }) => changeBufferType(detail.value)}
              value={pipelineInfo.ingestionServer.sinkType}
              columns={1}
              items={[
                {
                  label: t('pipeline:create.bufferMSK'),
                  description: t('pipeline:create.bufferMSKDesc'),
                  value: SinkType.MSK,
                },
                {
                  label: t('pipeline:create.bufferS3'),
                  description: t('pipeline:create.bufferS3Desc'),
                  value: SinkType.S3,
                },
                {
                  label: t('pipeline:create.bufferKDS'),
                  description: t('pipeline:create.bufferKDSDesc'),
                  value: SinkType.KDS,
                },
              ]}
            />
          </FormField>

          {pipelineInfo.ingestionServer.sinkType === SinkType.S3 && (
            <BufferS3
              pipelineInfo={pipelineInfo}
              bufferS3BucketEmptyError={bufferS3BucketEmptyError}
              changeS3Bucket={(bucket) => {
                changeBufferS3Bucket(bucket);
              }}
              changeS3Prefix={(prefix) => {
                changeBufferS3Prefix(prefix);
              }}
              changeS3BufferSize={(size) => {
                changeS3BufferSize(size);
              }}
              changeBufferInterval={(interval) => {
                changeBufferInterval(interval);
              }}
            />
          )}
          {pipelineInfo.ingestionServer.sinkType === SinkType.MSK && (
            <BufferMSK
              pipelineInfo={pipelineInfo}
              changeCreateMSKMethod={(type) => {
                changeCreateMSKMethod(type);
              }}
              changeSelectedMSK={(msk) => {
                changeSelectedMSK(msk);
              }}
              changeMSKTopic={(topic) => {
                changeMSKTopic(topic);
              }}
              changeSelfHosted={(selfHosted) => {
                changeSelfHosted(selfHosted);
              }}
              changeKafkaBrokers={(brokers) => {
                changeKafkaBrokers(brokers);
              }}
              changeKafkaTopic={(topic) => {
                changeKafkaTopic(topic);
              }}
            />
          )}
          {pipelineInfo.ingestionServer.sinkType === SinkType.KDS && (
            <BufferKDS
              pipelineInfo={pipelineInfo}
              changeKDSProvisionType={(type) => {
                changeKDSProvisionType(type);
              }}
              changeKDSShardNumber={(num) => {
                changeKDSShardNumber(num);
              }}
            />
          )}

          {pipelineInfo.ingestionServer.sinkType === SinkType.MSK && (
            <Container
              header={
                <Header
                  description={t('pipeline:create.connectorDesc')}
                  variant="h3"
                >
                  {t('pipeline:create.connector')}
                </Header>
              }
            >
              <FormField>
                <Checkbox
                  onChange={({ detail }) =>
                    changeEnableKafkaConnector(detail.checked)
                  }
                  checked={
                    pipelineInfo.ingestionServer.sinkKafka.kafkaConnector.enable
                  }
                  description={
                    <div>
                      {t('pipeline:create.connectorCheck1')}
                      <Link external> {t('pipeline:create.s3Connector')}</Link>
                      {t('pipeline:create.connectorCheck2')}
                    </div>
                  }
                >
                  {t('pipeline:create.connectorCheckDesc')}
                </Checkbox>
              </FormField>
            </Container>
          )}
        </SpaceBetween>
      </Container>
    </SpaceBetween>
  );
};

export default ConfigIngestion;
