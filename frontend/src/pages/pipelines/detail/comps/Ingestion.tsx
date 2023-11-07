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
import DomainNameWithStatus from 'pages/common/DomainNameWithStatus';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ProtocalType, SinkType } from 'ts/const';
import { buildMSKLink, buildS3Link, buildSubnetLink } from 'ts/url';
import { defaultStr, ternary } from 'ts/utils';

interface TabContentProps {
  pipelineInfo?: IExtPipeline;
}
const Ingestion: React.FC<TabContentProps> = (props: TabContentProps) => {
  const { pipelineInfo } = props;
  const { t } = useTranslation();

  const buildBufferDisplay = (pipelineInfo?: IExtPipeline) => {
    if (!pipelineInfo) return '-';

    const linkProps = {
      S3: (info: IExtPipeline) =>
        buildS3Link(info.region, info.bucket.name, info.bucket.prefix),
      MSK: (info: IExtPipeline) =>
        buildMSKLink(
          info.region,
          encodeURIComponent(info.ingestionServer.sinkKafka.mskCluster.arn)
        ),
    };

    const sinkType = pipelineInfo.ingestionServer.sinkType;

    if (sinkType === SinkType.S3) {
      return (
        <div>
          S3 (
          <Link href={linkProps['S3'](pipelineInfo)} external>
            S3://{pipelineInfo.bucket.name}/{pipelineInfo.bucket.prefix}
          </Link>
          )
        </div>
      );
    }

    if (sinkType === SinkType.KDS) {
      return `KDS (${pipelineInfo.ingestionServer.sinkKinesis.kinesisStreamMode})`;
    }

    if (sinkType === SinkType.MSK) {
      const hasMskCluster = pipelineInfo.ingestionServer.sinkKafka.mskCluster;
      if (hasMskCluster) {
        return (
          <div>
            MSK (
            <Link href={linkProps['MSK'](pipelineInfo)} external>
              {pipelineInfo.ingestionServer.sinkKafka.mskCluster.name}
            </Link>
            )
          </div>
        );
      } else {
        return `Kafka (${pipelineInfo.ingestionServer.sinkKafka.brokers.join(
          ','
        )})`;
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
            {pipelineInfo?.network?.publicSubnetIds &&
            pipelineInfo?.network?.publicSubnetIds?.length > 0
              ? pipelineInfo.network.publicSubnetIds.map((element) => {
                  return (
                    <div key={element}>
                      <Link
                        external
                        href={buildSubnetLink(
                          pipelineInfo.region || '',
                          element
                        )}
                      >
                        {element}
                      </Link>
                    </div>
                  );
                })
              : '-'}
          </div>
        </div>

        <div>
          <Box variant="awsui-key-label">
            {t('pipeline:detail.privateSubnet')}
          </Box>
          <div>
            {pipelineInfo?.network?.privateSubnetIds &&
            pipelineInfo?.network?.privateSubnetIds.length > 0
              ? pipelineInfo?.network?.privateSubnetIds?.map((element) => {
                  return (
                    <div key={element}>
                      <Link
                        external
                        href={buildSubnetLink(
                          pipelineInfo.region || '',
                          element
                        )}
                      >
                        {element}
                      </Link>
                    </div>
                  );
                })
              : '-'}
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

        <div>
          <Box variant="awsui-key-label">{t('pipeline:detail.acm')}</Box>
          <div>
            {defaultStr(
              pipelineInfo?.ingestionServer.domain.certificateArn,
              '-'
            )}
          </div>
        </div>
      </SpaceBetween>

      <SpaceBetween direction="vertical" size="l">
        <div>
          <Box variant="awsui-key-label">{t('pipeline:detail.domainName')}</Box>
          <DomainNameWithStatus
            type="domain"
            projectId={pipelineInfo?.projectId}
            pipelineId={pipelineInfo?.pipelineId}
            customDomain={pipelineInfo?.ingestionServer.domain.domainName}
            fetch={ternary(pipelineInfo?.pipelineId, true, false)}
          />
        </div>

        {pipelineInfo?.pipelineId && (
          <>
            <div>
              <Box variant="awsui-key-label">{t('pipeline:detail.dns')}</Box>
              <DomainNameWithStatus
                type="dns"
                projectId={pipelineInfo?.projectId}
                pipelineId={pipelineInfo?.pipelineId}
                dns={pipelineInfo?.dns}
                fetch={false}
              />
            </div>

            <div>
              <Box variant="awsui-key-label">
                {t('pipeline:detail.endpoint')}
              </Box>
              <DomainNameWithStatus
                type="endpoint"
                projectId={pipelineInfo?.projectId}
                pipelineId={pipelineInfo?.pipelineId}
                endpoint={pipelineInfo?.endpoint}
                fetch={ternary(pipelineInfo?.pipelineId, true, false)}
              />
            </div>
          </>
        )}

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

      <SpaceBetween direction="vertical" size="l">
        <div>
          <Box variant="awsui-key-label">{t('pipeline:detail.dataBuffer')}</Box>
          <div>{buildBufferDisplay(pipelineInfo)}</div>
        </div>

        {pipelineInfo?.ingestionServer.sinkType === SinkType.S3 && (
          <>
            <div>
              <Box variant="awsui-key-label">
                {t('pipeline:detail.bufferSize')}
              </Box>
              <div>
                <div>
                  {pipelineInfo.ingestionServer.sinkS3.s3BufferSize || '-'}
                </div>
              </div>
            </div>
            <div>
              <Box variant="awsui-key-label">
                {t('pipeline:detail.bufferInterval')}
              </Box>
              <div>
                <div>
                  {pipelineInfo.ingestionServer.sinkS3.s3BufferInterval || '-'}
                </div>
              </div>
            </div>
          </>
        )}

        {pipelineInfo?.ingestionServer.sinkType === SinkType.MSK && (
          <div>
            <Box variant="awsui-key-label">{t('pipeline:detail.topic')}</Box>
            <div>
              <div>{pipelineInfo.ingestionServer.sinkKafka.topic || '-'}</div>
            </div>
          </div>
        )}

        {(pipelineInfo?.ingestionServer.sinkType === SinkType.KDS ||
          pipelineInfo?.ingestionServer.sinkType === SinkType.MSK) && (
          <>
            <div>
              <Box variant="awsui-key-label">
                {t('pipeline:create.sinkMaxInterval')}
              </Box>
              <div>
                {pipelineInfo?.ingestionServer?.sinkBatch?.intervalSeconds}
              </div>
            </div>

            <div>
              <Box variant="awsui-key-label">
                {t('pipeline:create.sinkBatchSize')}
              </Box>
              <div>{pipelineInfo?.ingestionServer?.sinkBatch?.size}</div>
            </div>
          </>
        )}
      </SpaceBetween>
    </ColumnLayout>
  );
};

export default Ingestion;
