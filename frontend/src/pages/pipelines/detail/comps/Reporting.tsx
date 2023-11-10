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
  Link,
} from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { buildQuickSightDashboardLink } from '../../../../ts/url';

interface TabContentProps {
  pipelineInfo?: IExtPipeline;
}
const Reporting: React.FC<TabContentProps> = (props: TabContentProps) => {
  const { t } = useTranslation();
  const { pipelineInfo } = props;

  const getReportingEnableStatus = () => {
    if (pipelineInfo?.pipelineId) {
      // pipeline detail page
      if (
        pipelineInfo.reporting &&
        pipelineInfo.reporting.quickSight &&
        pipelineInfo.reporting.quickSight.accountName
      ) {
        return true;
      }
    } else {
      // create pipeline page
      if (pipelineInfo?.enableReporting) {
        return true;
      }
    }
    return false;
  };

  const getReportingDashboardLink = (appId: string, dashboardId: string) => {
    if (pipelineInfo?.templateVersion?.startsWith('v1.0')) {
      return buildQuickSightDashboardLink(
        pipelineInfo.region || '',
        dashboardId
      );
    }
    return `/analytics/${pipelineInfo?.projectId}/app/${appId}/dashboard/${dashboardId}`;
  };

  return (
    <ColumnLayout columns={3} variant="text-grid">
      <SpaceBetween direction="vertical" size="l">
        <div>
          <Box variant="awsui-key-label">{t('pipeline:detail.status')}</Box>
          {getReportingEnableStatus() ? (
            <StatusIndicator type="success">{t('enabled')}</StatusIndicator>
          ) : (
            <StatusIndicator type="stopped">{t('disabled')}</StatusIndicator>
          )}
        </div>
      </SpaceBetween>

      {getReportingEnableStatus() && (
        <>
          <SpaceBetween direction="vertical" size="l">
            <div>
              <Box variant="awsui-key-label">
                {t('pipeline:detail.dashboards')}
              </Box>
              {pipelineInfo?.dashboards && pipelineInfo?.dashboards.length > 0
                ? pipelineInfo?.dashboards.map((element) => {
                    return (
                      <div key={element.appId}>
                        <Link
                          external
                          href={getReportingDashboardLink(
                            element.appId,
                            element.dashboardId
                          )}
                        >
                          {element.appId}
                        </Link>
                      </div>
                    );
                  })
                : '-'}
            </div>
          </SpaceBetween>

          <SpaceBetween direction="vertical" size="l">
            <div>
              <Box variant="awsui-key-label">
                {t('pipeline:create.qsAccountName')}
              </Box>
              <div>
                {pipelineInfo?.reporting?.quickSight?.accountName || '-'}
              </div>
            </div>
          </SpaceBetween>
        </>
      )}
    </ColumnLayout>
  );
};

export default Reporting;
