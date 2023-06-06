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
  Link,
  SpaceBetween,
  StatusIndicator,
} from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExecutionType } from 'ts/const';
import { buildReshiftLink } from 'ts/url';

interface TabContentProps {
  pipelineInfo?: IExtPipeline;
}
const Processing: React.FC<TabContentProps> = (props: TabContentProps) => {
  const { pipelineInfo } = props;
  const { t } = useTranslation();

  const buildRedshiftDisplay = (pipelineInfo?: IExtPipeline) => {
    // in creating process
    if (!pipelineInfo?.pipelineId) {
      if (pipelineInfo?.redshiftType === 'serverless') {
        return 'New Serverless';
      } else {
        return (
          <Link
            external
            href={buildReshiftLink(
              pipelineInfo?.region || '',
              pipelineInfo?.dataModeling?.redshift?.provisioned
                ?.clusterIdentifier || '',
              'provisioned'
            )}
          >
            {
              pipelineInfo?.dataModeling?.redshift?.provisioned
                ?.clusterIdentifier
            }
          </Link>
        );
      }
    } else {
      // in detail page
      if (pipelineInfo?.dataModeling.redshift.newServerless) {
        return (
          <Link
            external
            href={buildReshiftLink(
              pipelineInfo?.region || '',
              '',
              'serverless'
            )}
          >
            {t('pipeline:detail.redshiftServerless')}
          </Link>
        );
      } else {
        return (
          <Link
            external
            href={buildReshiftLink(
              pipelineInfo?.region || '',
              pipelineInfo?.dataModeling?.redshift?.provisioned
                ?.clusterIdentifier || '',
              'provisioned'
            )}
          >
            {
              pipelineInfo?.dataModeling?.redshift?.provisioned
                ?.clusterIdentifier
            }
          </Link>
        );
      }
    }
  };

  const getDataProcessingIntervalDisplay = () => {
    if (pipelineInfo) {
      if (pipelineInfo.selectedExcutionType) {
        if (
          pipelineInfo.selectedExcutionType.value === ExecutionType.FIXED_RATE
        ) {
          return `${pipelineInfo.excutionFixedValue} ${pipelineInfo.selectedExcutionUnit?.label} `;
        } else {
          return `${pipelineInfo.exeCronExp}`;
        }
      } else if (pipelineInfo.dataProcessing.scheduleExpression) {
        if (pipelineInfo.dataProcessing.scheduleExpression) {
          if (pipelineInfo.dataProcessing.scheduleExpression.startsWith('cron')) {
            return pipelineInfo.dataProcessing.scheduleExpression;
          } else {
            const pattern = /rate\((\d+\s\w+)\)/;
            const match = pipelineInfo.dataProcessing.scheduleExpression.match(pattern);

            if (match) {
              const rateValue = match[1];
              const formattedRateValue = rateValue.replace(
                /\b\s+(\w)/,
                (match) => match.toUpperCase()
              );
              return formattedRateValue;
            }
          }
        } else {
          return '-';
        }
      }
    }
    return '-';
  };

  const getRefreshDataDisplay = () => {
    if (pipelineInfo) {
      if (pipelineInfo.selectedEventFreshUnit?.value) {
        return `${pipelineInfo.eventFreshValue} ${pipelineInfo.selectedEventFreshUnit.label}`;
      } else {
        if (pipelineInfo.dataProcessing.dataFreshnessInHour) {
          const hours = pipelineInfo.dataProcessing.dataFreshnessInHour;
          if (hours >= 24 && hours % 24 === 0) {
            const days = hours / 24;
            return `${days} Days`;
          } else {
            return `${hours} Hours`;
          }
        } else {
          return '3 Days';
        }
      }
    }
    return '-';
  };

  const getRedshiftDataRangeDisplay = () => {
    if (pipelineInfo) {
      if (pipelineInfo.selectedRedshiftExecutionUnit?.value) {
        return `${pipelineInfo.redshiftExecutionValue} ${pipelineInfo.selectedRedshiftExecutionUnit.label}`;
      } else {
        const minutes = pipelineInfo.dataModeling.redshift.dataRange;
        if (minutes >= 60 * 24 * 30 && minutes % (60 * 24 * 30) === 0) {
          const months = minutes / (60 * 24 * 30);
          return `${months} Months`;
        } else if (minutes >= 60 * 24 && minutes % (60 * 24) === 0) {
          const days = minutes / (60 * 24);
          return `${days} Days`;
        } else {
          return `${minutes} Minutes`;
        }
      }
    }
  };

  const getRedshiftUpsertFrequncyDisplay = () => {
    if (pipelineInfo) {
      if (pipelineInfo.selectedUpsertType) {
        if (
          pipelineInfo.selectedUpsertType.value === ExecutionType.FIXED_RATE
        ) {
          return `${pipelineInfo.redshiftUpsertFreqValue} ${pipelineInfo.redshiftUpsertFreqUnit?.label} `;
        } else {
          return `${pipelineInfo.upsertCronExp}`;
        }
      } else if (pipelineInfo.dataModeling.upsertUsers.scheduleExpression) {
        if (pipelineInfo.dataModeling.upsertUsers.scheduleExpression) {
          if (
            pipelineInfo.dataModeling.upsertUsers.scheduleExpression.startsWith(
              'cron'
            )
          ) {
            return pipelineInfo.dataModeling.upsertUsers.scheduleExpression;
          } else {
            const pattern = /rate\((\d+\s\w+)\)/;
            const match =
              pipelineInfo.dataModeling.upsertUsers.scheduleExpression.match(
                pattern
              );

            if (match) {
              const rateValue = match[1];
              const formattedRateValue = rateValue.replace(
                /\b\s+(\w)/,
                (match) => match.toUpperCase()
              );
              return formattedRateValue;
            }
          }
        } else {
          return '-';
        }
      }
    }
    return '-';
  };

  const getRedshiftDataLoadFrequencyDisplay = () => {
    if (pipelineInfo) {
      if (pipelineInfo.selectedDataLoadType) {
        if (
          pipelineInfo.selectedDataLoadType.value === ExecutionType.FIXED_RATE
        ) {
          return `${pipelineInfo.redshiftDataLoadValue} ${pipelineInfo.redshiftDataLoadUnit?.label} `;
        } else {
          return `${pipelineInfo.dataLoadCronExp}`;
        }
      } else if (
        pipelineInfo.dataModeling.loadWorkflow
          .loadJobScheduleIntervalExpression
      ) {
        if (
          pipelineInfo.dataModeling.loadWorkflow
            .loadJobScheduleIntervalExpression
        ) {
          if (
            pipelineInfo.dataModeling.loadWorkflow.loadJobScheduleIntervalExpression.startsWith(
              'cron'
            )
          ) {
            return pipelineInfo.dataModeling.loadWorkflow
              .loadJobScheduleIntervalExpression;
          } else {
            const pattern = /rate\((\d+\s\w+)\)/;
            const match =
              pipelineInfo.dataModeling.loadWorkflow.loadJobScheduleIntervalExpression.match(
                pattern
              );

            if (match) {
              const rateValue = match[1];
              const formattedRateValue = rateValue.replace(
                /\b\s+(\w)/,
                (match) => match.toUpperCase()
              );
              return formattedRateValue;
            }
          }
        } else {
          return '-';
        }
      }
    }
    return '-';
  };

  const getEnrichPluginDisplay = () => {
    if (pipelineInfo?.selectedEnrichPlugins) {
      // Create Pipeline
      return (
        pipelineInfo?.selectedEnrichPlugins
          ?.map((element) => element.name)
          .join(', ') || '-'
      );
    } else {
      // Pipeline detail
      if (
        pipelineInfo?.dataProcessing.enrichPlugin &&
        pipelineInfo?.dataProcessing.enrichPlugin.length > 0
      ) {
        const enrichPluginData: IPlugin[] = pipelineInfo.dataProcessing
          .enrichPlugin as any;
        console.info('enrichPluginData:', enrichPluginData);
        const returnElement = enrichPluginData.map((element) => {
          return (
            <div key={element.id}>
              {element.name} <Box variant="small">{element.description}</Box>
            </div>
          );
        });
        return returnElement;
      } else {
        return '-';
      }
    }
  };

  const getTransformPluginDisplay = () => {
    if (pipelineInfo?.selectedTransformPlugins) {
      // Create pipeline
      return (
        pipelineInfo?.selectedTransformPlugins
          ?.map((element) => element.name)
          .join(', ') || '-'
      );
    } else {
      // pipeline detail
      if (pipelineInfo?.dataProcessing.transformPlugin) {
        const transformPluginData: IPlugin = pipelineInfo?.dataProcessing
          .transformPlugin as any;
        return (
          <div>
            <div>{transformPluginData.name}</div>
            <Box variant="small">{transformPluginData.description}</Box>
          </div>
        );
      } else {
        return '-';
      }
    }
  };

  return (
    <ColumnLayout columns={3} variant="text-grid">
      <SpaceBetween direction="vertical" size="l">
        <div>
          <Box variant="awsui-key-label">{t('pipeline:detail.status')}</Box>
          <div>
            {pipelineInfo?.dataProcessing ? (
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
          <div>{getDataProcessingIntervalDisplay()}</div>
        </div>

        <div>
          <Box variant="awsui-key-label">
            {t('pipeline:detail.eventFreshness')}
          </Box>
          <div>{getRefreshDataDisplay()}</div>
        </div>

        <div>
          <Box variant="awsui-key-label">{t('pipeline:detail.transform')}</Box>
          {getTransformPluginDisplay()}
        </div>
      </SpaceBetween>

      <SpaceBetween direction="vertical" size="l">
        <div>
          <Box variant="awsui-key-label">{t('pipeline:detail.enrichment')}</Box>
          <div>{getEnrichPluginDisplay()}</div>
        </div>

        <div>
          <Box variant="awsui-key-label">{t('pipeline:detail.anlyEngine')}</Box>
          <div>{buildRedshiftDisplay(pipelineInfo)}</div>
        </div>

        <div>
          <Box variant="awsui-key-label">
            {t('pipeline:detail.redshiftPermission')}
          </Box>
          <div>
            {pipelineInfo?.dataModeling?.redshift?.provisioned?.dbUser || '-'}
          </div>
        </div>

        <div>
          <Box variant="awsui-key-label">{t('pipeline:detail.dataRange')}</Box>
          <div>{getRedshiftDataRangeDisplay()}</div>
        </div>
      </SpaceBetween>

      <SpaceBetween direction="vertical" size="l">
        <div>
          <Box variant="awsui-key-label">
            {t('pipeline:detail.redshiftDataLoadFrequency')}
          </Box>
          <div>{getRedshiftDataLoadFrequencyDisplay()}</div>
        </div>
        <div>
          <Box variant="awsui-key-label">
            {t('pipeline:detail.redshiftUserTableUpsertFrequency')}
          </Box>
          <div>{getRedshiftUpsertFrequncyDisplay()}</div>
        </div>
        <div>
          <Box variant="awsui-key-label">{t('pipeline:detail.athena')}</Box>
          <div>
            {pipelineInfo?.dataModeling.athena ? (
              <StatusIndicator type="success">{t('enabled')}</StatusIndicator>
            ) : (
              <StatusIndicator type="stopped">{t('disabled')}</StatusIndicator>
            )}
          </div>
        </div>
      </SpaceBetween>
    </ColumnLayout>
  );
};

export default Processing;
