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
  Container,
  FormField,
  Header,
  Link,
  SpaceBetween,
  Table,
} from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { buildS3Link, buildVPCLink } from 'ts/url';

interface BasicInfoProps {
  pipelineInfo?: IPipeline;
}

const BasicInfo: React.FC<BasicInfoProps> = (props: BasicInfoProps) => {
  const { t } = useTranslation();
  const { pipelineInfo } = props;
  return (
    <Container
      header={
        <Header variant="h2" description="">
          {t('pipeline:basic')}
        </Header>
      }
    >
      <ColumnLayout columns={3} variant="text-grid">
        <SpaceBetween direction="vertical" size="l">
          <div>
            <Box variant="awsui-key-label">
              {t('pipeline:create.awsRegion')}
            </Box>
            <div>{pipelineInfo?.region}</div>
          </div>
        </SpaceBetween>
        <SpaceBetween direction="vertical" size="l">
          <div>
            <Box variant="awsui-key-label">{t('pipeline:detail.vpc')}</Box>
            <Link
              external
              href={buildVPCLink(
                pipelineInfo?.region || '',
                pipelineInfo?.network.vpcId || ''
              )}
            >
              {pipelineInfo?.network.vpcId}
            </Link>
          </div>
          <div>
            <Box variant="awsui-key-label">{t('pipeline:detail.s3Bucket')}</Box>
            <Link
              external
              href={buildS3Link(
                pipelineInfo?.region || '',
                pipelineInfo?.bucket.name || '',
                `clickstream/${pipelineInfo?.projectId}/data/`
              )}
            >
              {pipelineInfo?.bucket.name}
            </Link>
          </div>
          <div>
            <Box variant="awsui-key-label">{t('pipeline:detail.sdk')}</Box>
            <div>{pipelineInfo?.dataCollectionSDK}</div>
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
