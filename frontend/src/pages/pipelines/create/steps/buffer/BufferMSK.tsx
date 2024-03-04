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
  XSS_PATTERN,
  ListMSKClustersResponse,
  ListSecurityGroupsResponse,
  IMSKCluster,
} from '@aws/clickstream-base-lib';
import {
  AutosuggestProps,
  Button,
  Container,
  FormField,
  Input,
  Select,
  SelectProps,
  SpaceBetween,
  Tabs,
} from '@cloudscape-design/components';
import { getMSKList, getSecurityGroups } from 'apis/resource';
import { defaultTo } from 'lodash';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MAX_USER_INPUT_LENGTH,
  ResourceCreateMethod,
  SUPPORT_SELF_HOSTED_KAFKA,
} from 'ts/const';
import { checkDisable, defaultStr, isDisabled, ternary } from 'ts/utils';
import MSKRequirements from './MSKRequirements';

interface BufferMSKProps {
  update?: boolean;
  pipelineInfo: IExtPipeline;
  changeSelfHosted: (selfHosted: boolean) => void;
  changeCreateMSKMethod: (type: string) => void;
  changeSelectedMSK: (msk: SelectProps.Option, mskCluster: IMSKCluster) => void;
  changeMSKTopic: (topic: string) => void;
  changeKafkaBrokers: (brokers: string) => void;
  changeKafkaTopic: (topic: string) => void;
  changeSecurityGroup: (sg: SelectProps.Option) => void;
  mskEmptyError: boolean;
  topicFormatError: boolean;
  brokerLinkEmptyError: boolean;
  brokerLinkFormatError: boolean;
  kafkaSGEmptyError: boolean;
}

const BufferMSK: React.FC<BufferMSKProps> = (props: BufferMSKProps) => {
  const { t } = useTranslation();
  const {
    update,
    pipelineInfo,
    changeSelfHosted,
    changeSelectedMSK,
    changeMSKTopic,
    changeKafkaBrokers,
    changeKafkaTopic,
    changeSecurityGroup,
    mskEmptyError,
    topicFormatError,
    brokerLinkEmptyError,
    brokerLinkFormatError,
    kafkaSGEmptyError,
  } = props;
  const [loadingMSK, setLoadingMSK] = useState(false);
  const [loadingSG, setLoadingSG] = useState(false);
  const [mskOptionList, setMSKOptionList] = useState<AutosuggestProps.Options>(
    []
  );
  const [mskClusterList, setMSKClusterList] = useState<IMSKCluster[]>([]);
  const [vpcSGOptionList, setVpcSGOptionList] = useState<SelectProps.Options>(
    []
  );

  // get msk clusters by region
  const getAllMSKClusterList = async () => {
    setLoadingMSK(true);
    try {
      const { success, data }: ApiResponse<ListMSKClustersResponse> =
        await getMSKList({
          vpcId: pipelineInfo.network.vpcId,
          region: pipelineInfo.region,
        });
      if (success) {
        const mskOptions: AutosuggestProps.Options = data.map((element) => ({
          label: element.ClusterName,
          value: element.ClusterArn,
          description: `Authentication: ${element.Authentication.join(
            ','
          )} Client Broker Communication: ${element.ClientBroker}`,
          labelTag: element.ClusterType,
          iconAlt: element.ClusterArn,
          disabled:
            element.ClusterType === 'SERVERLESS' ||
            element.Authentication.indexOf('Unauthenticated') === -1 ||
            element.ClientBroker.indexOf('PLAINTEXT') === -1,
        }));
        setMSKClusterList(data);
        setMSKOptionList(mskOptions);
        setLoadingMSK(false);
      }
    } catch (error) {
      setLoadingMSK(false);
    }
  };

  // get Security Groups By VPC
  const getSecurityGroupByVPC = async () => {
    setLoadingSG(true);
    try {
      const { success, data }: ApiResponse<ListSecurityGroupsResponse> =
        await getSecurityGroups({
          region: pipelineInfo.region,
          vpcId: defaultStr(pipelineInfo.selectedVPC?.value, ''),
        });
      if (success) {
        const sgOptions: SelectProps.Options = data.map((element) => ({
          label: `${element.GroupName}(${element.GroupId})`,
          value: element.GroupId,
          description: element.Description,
        }));
        setVpcSGOptionList(sgOptions);
      }
      setLoadingSG(false);
    } catch (error) {
      setLoadingSG(false);
    }
  };

  useEffect(() => {
    getAllMSKClusterList();
  }, []);

  useEffect(() => {
    if (pipelineInfo.kafkaSelfHost) {
      getSecurityGroupByVPC();
    }
  }, [pipelineInfo.kafkaSelfHost]);

  return (
    <SpaceBetween direction="vertical" size="l">
      <FormField
        label={t('pipeline:create.msk.mskCluster')}
        description={t('pipeline:create.msk.mskClusterDesc')}
      />

      <Container disableContentPaddings={SUPPORT_SELF_HOSTED_KAFKA}>
        {SUPPORT_SELF_HOSTED_KAFKA ? (
          <Tabs
            onChange={(e) => {
              changeSelfHosted(e.detail.activeTabId === 'manual');
            }}
            activeTabId={pipelineInfo.kafkaSelfHost ? 'manual' : 'select'}
            tabs={[
              {
                disabled:
                  (isDisabled(update, pipelineInfo) &&
                    pipelineInfo.kafkaSelfHost) ||
                  !pipelineInfo.serviceStatus.MSK,
                label: t('pipeline:create.msk.select'),
                id: 'select',
                content: (
                  <div className="plr-20">
                    <SpaceBetween direction="vertical" size="l">
                      <MSKRequirements />
                      {pipelineInfo.mskCreateMethod ===
                        ResourceCreateMethod.EXISTING && (
                        <FormField
                          label={t('pipeline:create.msk.existingMSK')}
                          description={t('pipeline:create.msk.existingMSKDesc')}
                          errorText={ternary(
                            mskEmptyError,
                            t('pipeline:valid.mskEmptyError'),
                            undefined
                          )}
                        >
                          <div className="flex">
                            <div className="flex-1">
                              <Select
                                disabled={checkDisable(
                                  isDisabled(update, pipelineInfo),
                                  !pipelineInfo.serviceStatus.MSK
                                )}
                                placeholder={defaultStr(
                                  t('pipeline:create.msk.selectMSK')
                                )}
                                statusType={ternary(
                                  loadingMSK,
                                  'loading',
                                  'finished'
                                )}
                                selectedOption={pipelineInfo.selectedMSK}
                                onChange={({ detail }) => {
                                  const clusters: IMSKCluster[] =
                                    mskClusterList.filter(
                                      (cluster) =>
                                        cluster.ClusterArn ===
                                        detail.selectedOption.value
                                    );
                                  changeSelectedMSK(
                                    detail.selectedOption,
                                    clusters[0]
                                  );
                                }}
                                options={mskOptionList}
                                filteringType="auto"
                              />
                            </div>
                            {!update ? (
                              <div className="ml-20">
                                <Button
                                  loading={loadingMSK}
                                  iconName="refresh"
                                  onClick={() => {
                                    getAllMSKClusterList();
                                  }}
                                />
                              </div>
                            ) : null}
                          </div>
                        </FormField>
                      )}
                      <FormField
                        label={t('pipeline:create.msk.topic')}
                        description={t('pipeline:create.msk.topicDesc')}
                        errorText={ternary(
                          topicFormatError,
                          t('pipeline:valid.topicFormatError'),
                          undefined
                        )}
                      >
                        <Input
                          disabled={checkDisable(
                            isDisabled(update, pipelineInfo),
                            !pipelineInfo.serviceStatus.MSK
                          )}
                          placeholder={defaultStr(
                            t('pipeline:create.msk.enterTopicName')
                          )}
                          value={pipelineInfo.ingestionServer.sinkKafka.topic}
                          onChange={(e) => {
                            if (
                              new RegExp(XSS_PATTERN).test(e.detail.value) ||
                              e.detail.value.length > MAX_USER_INPUT_LENGTH
                            ) {
                              return false;
                            }
                            changeMSKTopic(e.detail.value);
                          }}
                        />
                      </FormField>
                    </SpaceBetween>
                  </div>
                ),
              },
              {
                label: t('pipeline:create.msk.manual'),
                disabled:
                  isDisabled(update, pipelineInfo) &&
                  !pipelineInfo.kafkaSelfHost,
                id: 'manual',
                content: (
                  <SpaceBetween direction="vertical" size="l">
                    <div className="plr-20">
                      <SpaceBetween direction="vertical" size="l">
                        <MSKRequirements />
                        <FormField
                          label={t('pipeline:create.msk.brokerLink')}
                          description={t('pipeline:create.msk.brokerLinkDesc')}
                          errorText={defaultTo(
                            ternary(
                              brokerLinkEmptyError,
                              t('pipeline:valid.kafkaBrokerEmptyError'),
                              undefined
                            ),
                            ternary(
                              brokerLinkFormatError,
                              t('pipeline:valid.kafkaBrokerFormatError'),
                              undefined
                            )
                          )}
                        >
                          <Input
                            disabled={isDisabled(update, pipelineInfo)}
                            placeholder={defaultStr(
                              t('pipeline:create.msk.brokerLindPlaceHolder')
                            )}
                            value={pipelineInfo.kafkaBrokers}
                            onChange={(e) => {
                              if (
                                new RegExp(XSS_PATTERN).test(e.detail.value) ||
                                e.detail.value.length > MAX_USER_INPUT_LENGTH
                              ) {
                                return false;
                              }
                              changeKafkaBrokers(e.detail.value);
                            }}
                          />
                        </FormField>
                        <FormField
                          label={t('pipeline:create.msk.topic')}
                          description={t('pipeline:create.msk.manualTopicDesc')}
                          errorText={ternary(
                            topicFormatError,
                            t('pipeline:valid.topicFormatError'),
                            undefined
                          )}
                        >
                          <Input
                            disabled={isDisabled(update, pipelineInfo)}
                            placeholder={defaultStr(
                              t('pipeline:create.msk.enterTopicName')
                            )}
                            value={pipelineInfo.ingestionServer.sinkKafka.topic}
                            onChange={(e) => {
                              if (
                                new RegExp(XSS_PATTERN).test(e.detail.value) ||
                                e.detail.value.length > MAX_USER_INPUT_LENGTH
                              ) {
                                return false;
                              }
                              changeKafkaTopic(e.detail.value);
                            }}
                          />
                        </FormField>
                        <FormField
                          label={t('pipeline:create.securityGroup')}
                          description={t(
                            'pipeline:create.mskSecurityGroupDesc'
                          )}
                          errorText={ternary(
                            kafkaSGEmptyError,
                            t('pipeline:valid.kafkaSGEmptyError'),
                            undefined
                          )}
                        >
                          <Select
                            filteringType="auto"
                            selectedOption={
                              pipelineInfo.selectedSelfHostedMSKSG
                            }
                            options={vpcSGOptionList}
                            placeholder={defaultStr(
                              t('pipeline:create.securityGroupPlaceholder')
                            )}
                            selectedAriaLabel="Selected"
                            statusType={ternary(
                              loadingSG,
                              'loading',
                              'finished'
                            )}
                            onChange={(e) => {
                              changeSecurityGroup(e.detail.selectedOption);
                            }}
                          />
                        </FormField>
                      </SpaceBetween>
                    </div>
                  </SpaceBetween>
                ),
              },
            ]}
          />
        ) : (
          <div>
            <SpaceBetween direction="vertical" size="l">
              <MSKRequirements />
              {pipelineInfo.mskCreateMethod ===
                ResourceCreateMethod.EXISTING && (
                <FormField
                  controlId="test-select-msk-id"
                  label={t('pipeline:create.msk.existingMSK')}
                  description={t('pipeline:create.msk.existingMSKDesc')}
                  errorText={ternary(
                    mskEmptyError,
                    t('pipeline:valid.mskEmptyError'),
                    undefined
                  )}
                >
                  <div className="flex">
                    <div className="flex-1">
                      <Select
                        disabled={checkDisable(
                          isDisabled(update, pipelineInfo),
                          !pipelineInfo.serviceStatus.MSK
                        )}
                        placeholder={defaultStr(
                          t('pipeline:create.msk.selectMSK')
                        )}
                        statusType={ternary(loadingMSK, 'loading', 'finished')}
                        selectedOption={pipelineInfo.selectedMSK}
                        onChange={({ detail }) => {
                          const clusters: IMSKCluster[] = mskClusterList.filter(
                            (cluster) =>
                              cluster.ClusterArn === detail.selectedOption.value
                          );
                          changeSelectedMSK(detail.selectedOption, clusters[0]);
                        }}
                        options={mskOptionList}
                        filteringType="auto"
                      />
                    </div>
                    {update ? (
                      <div className="ml-20">
                        <Button
                          loading={loadingMSK}
                          iconName="refresh"
                          onClick={() => {
                            getAllMSKClusterList();
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                </FormField>
              )}
              <FormField
                label={t('pipeline:create.msk.topic')}
                description={t('pipeline:create.msk.topicDesc')}
                errorText={ternary(
                  topicFormatError,
                  t('pipeline:valid.topicFormatError'),
                  undefined
                )}
              >
                <Input
                  disabled={checkDisable(
                    isDisabled(update, pipelineInfo),
                    !pipelineInfo.serviceStatus.MSK
                  )}
                  placeholder={defaultStr(
                    t('pipeline:create.msk.enterTopicName')
                  )}
                  value={pipelineInfo.ingestionServer.sinkKafka.topic}
                  onChange={(e) => {
                    if (
                      new RegExp(XSS_PATTERN).test(e.detail.value) ||
                      e.detail.value.length > MAX_USER_INPUT_LENGTH
                    ) {
                      return false;
                    }
                    changeMSKTopic(e.detail.value);
                  }}
                />
              </FormField>
            </SpaceBetween>
          </div>
        )}
      </Container>
    </SpaceBetween>
  );
};

export default BufferMSK;
