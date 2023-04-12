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
  StatusIndicator,
} from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface TabContentProps {
  pipelineInfo?: IPipeline;
}
const Reporting: React.FC<TabContentProps> = () => {
  const { t } = useTranslation();
  return (
    <ColumnLayout columns={3} variant="text-grid">
      <SpaceBetween direction="vertical" size="l">
        <div>
          <Box variant="awsui-key-label">{t('pipeline:detail.status')}</Box>
          <div>
            <StatusIndicator type="stopped">{t('disabled')}</StatusIndicator>
          </div>
        </div>
      </SpaceBetween>

      <SpaceBetween direction="vertical" size="l">
        <div>
          <Box variant="awsui-key-label">
            {t('pipeline:detail.quicksightRole')}
          </Box>
          <div>-</div>
        </div>
      </SpaceBetween>

      <SpaceBetween direction="vertical" size="l">
        <div>
          <Box variant="awsui-key-label">
            {t('pipeline:detail.datasetName')}
          </Box>
          <div>-</div>
        </div>
      </SpaceBetween>
    </ColumnLayout>
  );
};

export default Reporting;
