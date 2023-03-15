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
  AutosuggestProps,
  Container,
  FormField,
  Input,
  RadioGroup,
  Select,
  SelectProps,
  SpaceBetween,
  Tabs,
} from '@cloudscape-design/components';
import { getMSKList } from 'apis/resource';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ResourceCreateMehod } from 'ts/const';

interface BufferMSKProps {
  pipelineInfo: IExtPipeline;
  changeSelfHosted: (selfHosted: boolean) => void;
  changeCreateMSKMethod: (type: string) => void;
  changeSelectedMSK: (msk: SelectProps.Option) => void;
  changeMSKTopic: (topic: string) => void;
  changeKafkaBrokers: (brokers: string) => void;
  changeKafkaTopic: (topic: string) => void;
}

const BufferMSK: React.FC<BufferMSKProps> = (props: BufferMSKProps) => {
  const { t } = useTranslation();
  const {
    pipelineInfo,
    changeSelfHosted,
    changeCreateMSKMethod,
    changeSelectedMSK,
    changeMSKTopic,
    changeKafkaBrokers,
    changeKafkaTopic,
  } = props;
  const [loadingMSK, setLoadingMSK] = useState(false);
  const [mskOptionList, setMSKOptionList] = useState<AutosuggestProps.Options>(
    []
  );
  // get all s3 bucket
  const getAllMSKClusterList = async () => {
    setLoadingMSK(true);
    try {
      const { success, data }: ApiResponse<MSKResponse[]> = await getMSKList(
        pipelineInfo.ingestionServer.network.vpcId,
        pipelineInfo.region
      );
      if (success) {
        const mskOptions: AutosuggestProps.Options = data.map((element) => ({
          label: element.name,
          value: element.arn,
          description: element.securityGroupId,
          labelTag: element.type,
        }));
        setMSKOptionList(mskOptions);
        setLoadingMSK(false);
      }
    } catch (error) {
      setLoadingMSK(false);
    }
  };

  useEffect(() => {
    getAllMSKClusterList();
  }, []);

  return (
    <SpaceBetween direction="vertical" size="l">
      <FormField
        label={t('pipeline:create.msk.mskCluster')}
        description={t('pipeline:create.msk.mskClusterDesc')}
      />

      <Container disableContentPaddings>
        <Tabs
          onChange={(e) => {
            changeSelfHosted(e.detail.activeTabId === 'manual' ? true : false);
          }}
          activeTabId={
            pipelineInfo.ingestionServer.sinkKafka.selfHost
              ? 'manual'
              : 'select'
          }
          tabs={[
            {
              label: t('pipeline:create.msk.select'),
              id: 'select',
              content: (
                <div className="plr-20">
                  <SpaceBetween direction="vertical" size="l">
                    <RadioGroup
                      onChange={({ detail }) =>
                        changeCreateMSKMethod(detail.value)
                      }
                      value={pipelineInfo.mskCreateMethod}
                      items={[
                        {
                          value: ResourceCreateMehod.CREATE,
                          label: t('pipeline:create.msk.createMSK'),
                          description: t('pipeline:create.msk.createMSKDesc'),
                        },
                        {
                          value: ResourceCreateMehod.EXSITING,
                          label: t('pipeline:create.msk.exsitingMSK'),
                          description: t('pipeline:create.msk.exsitingMSKDesc'),
                        },
                      ]}
                    />

                    {pipelineInfo.mskCreateMethod ===
                      ResourceCreateMehod.EXSITING && (
                      <FormField>
                        <Select
                          placeholder={t('pipeline:create.msk.selectMSK') || ''}
                          statusType={loadingMSK ? 'loading' : 'finished'}
                          selectedOption={pipelineInfo.selectedMSK}
                          onChange={({ detail }) =>
                            changeSelectedMSK(detail.selectedOption)
                          }
                          options={mskOptionList}
                          filteringType="auto"
                          selectedAriaLabel="Selected"
                        />
                      </FormField>
                    )}
                    <FormField
                      label={t('pipeline:create.msk.topic')}
                      description={t('pipeline:create.msk.topicDesc')}
                    >
                      <Input
                        placeholder={
                          t('pipeline:create.msk.enterTopicName') || ''
                        }
                        value={pipelineInfo.ingestionServer.sinkKafka.mskTopic}
                        onChange={(e) => {
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
              id: 'manual',
              content: (
                <SpaceBetween direction="vertical" size="l">
                  <div className="plr-20">
                    <SpaceBetween direction="vertical" size="l">
                      <FormField
                        label={t('pipeline:create.msk.brokerLink')}
                        description={t('pipeline:create.msk.brokerLinkDesc')}
                      >
                        <Input
                          placeholder={
                            t('pipeline:create.msk.brokerLindPlaceHolder') || ''
                          }
                          value={
                            pipelineInfo.ingestionServer.sinkKafka.kafkaBrokers
                          }
                          onChange={(e) => {
                            changeKafkaBrokers(e.detail.value);
                          }}
                        />
                      </FormField>
                      <FormField
                        label={t('pipeline:create.msk.topic')}
                        description={t('pipeline:create.msk.manualTopicDesc')}
                      >
                        <Input
                          placeholder={
                            t('pipeline:create.msk.enterTopicName') || ''
                          }
                          value={
                            pipelineInfo.ingestionServer.sinkKafka.kafkaTopic
                          }
                          onChange={(e) => {
                            changeKafkaTopic(e.detail.value);
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
      </Container>
    </SpaceBetween>
  );
};

export default BufferMSK;
