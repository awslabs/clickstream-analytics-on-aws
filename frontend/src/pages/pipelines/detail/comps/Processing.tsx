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
  ColumnLayout,
  SpaceBetween,
  Box,
  StatusIndicator,
} from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface TabContentProps {
  pipelineInfo?: IPipeline;
}
const Processing: React.FC<TabContentProps> = (props: TabContentProps) => {
  const { pipelineInfo } = props;
  const { t } = useTranslation();
  return (
    <ColumnLayout columns={3} variant="text-grid">
      <SpaceBetween direction="vertical" size="l">
        <div>
          <Box variant="awsui-key-label">{t('pipeline:detail.status')}</Box>
          <div>
            {pipelineInfo?.etl ? (
              <StatusIndicator type="success">{t('enabled')}</StatusIndicator>
            ) : (
              <StatusIndicator type="stopped">{t('disabled')}</StatusIndicator>
            )}
          </div>
        </div>

        <div>
          <Box variant="awsui-key-label">
            {t('pipeline:detail.dataProcesingInt')}
          </Box>
          <div>{pipelineInfo?.etl.scheduleExpression || '-'}</div>
        </div>

        <div>
          <Box variant="awsui-key-label">
            {t('pipeline:detail.eventFreshness')}
          </Box>
          <div>
            {pipelineInfo?.etl.dataFreshnessInHour ? (
              <div>
                {pipelineInfo?.etl.dataFreshnessInHour}{' '}
                {t('pipeline:detail.hours')}
              </div>
            ) : (
              '-'
            )}
          </div>
        </div>

        <div>
          <Box variant="awsui-key-label">{t('pipeline:detail.transform')}</Box>
          <div>{pipelineInfo?.etl.transformPlugin || '-'}</div>
        </div>
      </SpaceBetween>

      <SpaceBetween direction="vertical" size="l">
        <div>
          <Box variant="awsui-key-label">{t('pipeline:detail.enrichment')}</Box>
          <div>
            {pipelineInfo?.etl.enrichPlugin.map((element) => {
              return <div key={element}>{element}</div>;
            }) || '-'}
          </div>
        </div>

        <div>
          <Box variant="awsui-key-label">{t('pipeline:detail.anlyEngine')}</Box>
          <div>
            {pipelineInfo?.dataAnalytics?.redshift?.serverless?.workgroupName ||
              '-'}
          </div>
        </div>

        <div>
          <Box variant="awsui-key-label">
            {t('pipeline:detail.redshiftPermission')}
          </Box>
          <div>
            {pipelineInfo?.dataAnalytics?.redshift?.serverless?.iamRoleArn ||
              '-'}
          </div>
        </div>

        <div>
          <Box variant="awsui-key-label">{t('pipeline:detail.dataRange')}</Box>
          <div>
            {pipelineInfo?.dataAnalytics?.loadWorkflow?.scheduleInterval ? (
              <div>
                {pipelineInfo?.dataAnalytics?.loadWorkflow?.scheduleInterval ||
                  '-'}{' '}
                {t('pipeline:detail.minutes')}
              </div>
            ) : (
              '-'
            )}
          </div>
        </div>
      </SpaceBetween>

      <SpaceBetween direction="vertical" size="l">
        <div>
          <Box variant="awsui-key-label">{t('pipeline:detail.athena')}</Box>
          <div>
            <StatusIndicator type="stopped">{t('disabled')}</StatusIndicator>
          </div>
        </div>
      </SpaceBetween>
    </ColumnLayout>
  );
};

export default Processing;
