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
  Button,
  Header,
  SpaceBetween,
  StatusIndicator,
  Table,
} from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface TabContentProps {
  pipelineInfo?: IPipeline;
}
const Alarms: React.FC<TabContentProps> = (props: TabContentProps) => {
  const { t } = useTranslation();
  return (
    <div>
      <Table
        variant="embedded"
        columnDefinitions={[
          {
            id: 'name',
            header: t('pipeline:detail.alarmName'),
            cell: (item) => item.name || '-',
          },
          {
            id: 'status',
            header: t('pipeline:detail.status'),
            cell: (item) => {
              return (
                <StatusIndicator
                  type={
                    item.status === 'N/A'
                      ? 'stopped'
                      : item.status === 'Alarm'
                      ? 'error'
                      : 'warning'
                  }
                >
                  {item.status}
                </StatusIndicator>
              );
            },
          },
          {
            id: 'action',
            header: t('pipeline:detail.action'),
            cell: (item) => {
              return (
                <SpaceBetween direction="horizontal" size="xs">
                  <Button variant="link">
                    {item.status === 'N/A'
                      ? t('button.disable')
                      : t('button.enable')}
                  </Button>
                </SpaceBetween>
              );
            },
          },
        ]}
        items={[
          {
            name: 'ECSnode/cpuutilizationgreaterthan90',
            status: 'Warning',
          },
          {
            name: 'Nginx/error500greatthan5inlast5mins',
            status: 'Alarm',
          },
          {
            name: 'Enrichment/failurerategreaterhan5inlast5mins',
            status: 'N/A',
          },
        ]}
        loadingText="Loading resources"
        header={
          <Header
            actions={
              <Button
                href="/"
                iconAlign="right"
                iconName="external"
                target="_blank"
              >
                {t('button.viewAlarmInCloudWatch')}
              </Button>
            }
            variant="h3"
          >
            {t('pipeline:detail.alarms')}
          </Header>
        }
        sortingDisabled
      />
    </div>
  );
};

export default Alarms;
