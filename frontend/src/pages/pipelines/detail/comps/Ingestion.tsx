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
  Box,
  ColumnLayout,
  SpaceBetween,
  Link,
} from '@cloudscape-design/components';
import CopyText from 'components/common/CopyIcon';
import DomainNameWithStatus from 'pages/common/DomainNameWithStatus';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ProtocalType, SinkType } from 'ts/const';
import { buildSubnetLink } from 'ts/url';

interface TabContentProps {
  pipelineInfo?: IExtPipeline;
}
const Ingestion: React.FC<TabContentProps> = (props: TabContentProps) => {
  const { pipelineInfo } = props;
  const { t } = useTranslation();

  const buildBufferDisplay = (pipelineInfo?: IExtPipeline) => {
    if (pipelineInfo?.ingestionServer.sinkType === SinkType.S3) {
      return `S3 (${pipelineInfo.ingestionServer.sinkS3.sinkBucket.name}/${pipelineInfo.ingestionServer.sinkS3.sinkBucket.prefix})`;
    }
    if (pipelineInfo?.ingestionServer.sinkType === SinkType.KDS) {
      return `KDS (${pipelineInfo.ingestionServer.sinkKinesis.kinesisStreamMode})`;
    }
    // review and launch page
    if (!pipelineInfo?.pipelineId) {
      // self hosted kafka
      if (pipelineInfo?.ingestionServer.sinkType === SinkType.MSK) {
        if (pipelineInfo?.kafkaSelfHost) {
          return `Kafka (${pipelineInfo.ingestionServer.sinkKafka.brokers.join(
            ','
          )})`;
        } else {
          return `MSK (${pipelineInfo?.ingestionServer.sinkKafka.mskCluster.arn})`;
        }
      }
    } else {
      // pipeline detail page
      if (pipelineInfo?.ingestionServer.sinkType === SinkType.MSK) {
        if (pipelineInfo?.ingestionServer.sinkKafka.mskCluster) {
          return `MSK (${pipelineInfo?.ingestionServer.sinkKafka.mskCluster.arn})`;
        } else {
          return `Kafka (${pipelineInfo.ingestionServer.sinkKafka.brokers.join(
            ','
          )})`;
        }
      }
    }
    return '-';
  };

  return (
    <ColumnLayout columns={3} variant="text-grid">
      <SpaceBetween direction="vertical" size="l">
        <div>
          <Box variant="awsui-key-label">
            {t('pipeline:detail.publicSubnet')}
          </Box>
          <div>
            {pipelineInfo?.network?.publicSubnetIds?.map((element) => {
              return (
                <div key={element}>
                  <Link
                    external
                    href={buildSubnetLink(pipelineInfo.region || '', element)}
                  >
                    {element}
                  </Link>
                </div>
              );
            }) || '-'}
          </div>
        </div>

        <div>
          <Box variant="awsui-key-label">
            {t('pipeline:detail.privateSubnet')}
          </Box>
          <div>
            {pipelineInfo?.network?.privateSubnetIds?.map((element) => {
              return (
                <div key={element}>
                  <Link
                    external
                    href={buildSubnetLink(pipelineInfo.region || '', element)}
                  >
                    {element}
                  </Link>
                </div>
              );
            }) || '-'}
          </div>
        </div>

        <div>
          <Box variant="awsui-key-label">
            {t('pipeline:detail.ingestionCapacity')}
          </Box>
          <div>
            {`${t('pipeline:detail.min')}:${
              pipelineInfo?.ingestionServer.size.serverMin
            }, 
              ${t('pipeline:detail.max')}:${
              pipelineInfo?.ingestionServer.size.serverMax
            }, 
              ${t('pipeline:detail.warm')}:${
              pipelineInfo?.ingestionServer.size.warmPoolSize
            }`}
          </div>
        </div>

        <div>
          <Box variant="awsui-key-label">
            {t('pipeline:detail.enableHTTPS')}
          </Box>
          <div>
            {pipelineInfo?.ingestionServer.loadBalancer.protocol ===
            ProtocalType.HTTPS
              ? t('yes')
              : t('no')}
          </div>
        </div>
      </SpaceBetween>

      <SpaceBetween direction="vertical" size="l">
        <div>
          <Box variant="awsui-key-label">{t('pipeline:detail.domainName')}</Box>
          <DomainNameWithStatus
            pipelineId={pipelineInfo?.pipelineId}
            dns={pipelineInfo?.dns}
            customDomain={pipelineInfo?.ingestionServer.domain.domainName}
          />
        </div>

        <div>
          <Box variant="awsui-key-label">{t('pipeline:detail.endpoint')}</Box>
          <div>
            {pipelineInfo?.endpoint && (
              <CopyText text={pipelineInfo?.endpoint || ''} />
            )}
            {pipelineInfo?.endpoint || '-'}
          </div>
        </div>

        <div>
          <Box variant="awsui-key-label">{t('pipeline:detail.acm')}</Box>
          <div>
            {pipelineInfo?.ingestionServer.domain.certificateArn || '-'}
          </div>
        </div>

        <div>
          <Box variant="awsui-key-label">{t('pipeline:detail.enableAGA')}</Box>
          <div>
            {pipelineInfo?.ingestionServer.loadBalancer.enableGlobalAccelerator
              ? t('yes')
              : t('no')}
          </div>
        </div>

        <div>
          <Box variant="awsui-key-label">{t('pipeline:detail.enableAuth')}</Box>
          <div>
            {pipelineInfo?.ingestionServer.loadBalancer.authenticationSecretArn
              ? t('yes')
              : t('no')}
          </div>
        </div>
      </SpaceBetween>

      <SpaceBetween direction="vertical" size="l">
        <div>
          <Box variant="awsui-key-label">{t('pipeline:detail.dataBuffer')}</Box>
          <div>{buildBufferDisplay(pipelineInfo)}</div>
        </div>

        {pipelineInfo?.ingestionServer.sinkType === SinkType.MSK && (
          <div>
            <Box variant="awsui-key-label">{t('pipeline:detail.topic')}</Box>
            <div>
              <div>{pipelineInfo.ingestionServer.sinkKafka.topic || '-'}</div>
            </div>
          </div>
        )}

        <div>
          <Box variant="awsui-key-label">
            {t('pipeline:detail.enableALBLog')}
          </Box>
          <div>
            {pipelineInfo?.ingestionServer.loadBalancer
              .enableApplicationLoadBalancerAccessLog
              ? t('yes')
              : t('no')}
          </div>
        </div>
      </SpaceBetween>
    </ColumnLayout>
  );
};

export default Ingestion;
