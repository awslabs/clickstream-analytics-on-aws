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
  Button,
  Container,
  ExpandableSection,
  SpaceBetween,
} from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { buildMetricsDashboardLink } from 'ts/url';

interface TabContentProps {
  pipelineInfo?: IPipeline;
}
const Monitoring: React.FC<TabContentProps> = (props: TabContentProps) => {
  const { t } = useTranslation();
  const { pipelineInfo } = props;
  return (
    <SpaceBetween direction="vertical" size="l">
      <Container>
        <ExpandableSection
          defaultExpanded
          headerText={t('pipeline:detail.accessFromConsole')}
        >
          <SpaceBetween direction="vertical" size="s">
            <div className="mt-10">
              <Button
                href={buildMetricsDashboardLink(
                  pipelineInfo?.region || '',
                  pipelineInfo?.metricsDashboardName || ''
                )}
                iconAlign="right"
                iconName="external"
                target="_blank"
                disabled={
                  pipelineInfo?.region === undefined ||
                  pipelineInfo?.metricsDashboardName === undefined
                }
              >
                {t('button.viewInCloudWatch')}
              </Button>
            </div>
            <Box variant="p">{t('pipeline:detail.accessFromConsoleDesc')}</Box>
          </SpaceBetween>
        </ExpandableSection>
      </Container>
    </SpaceBetween>
  );
};

export default Monitoring;
