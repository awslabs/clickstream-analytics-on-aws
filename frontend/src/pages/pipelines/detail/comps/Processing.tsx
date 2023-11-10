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
import { getLngFromLocalStorage } from 'pages/analytics/analytics-utils';
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
  const localeLng = getLngFromLocalStorage();

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
      if (pipelineInfo?.dataModeling?.redshift?.newServerless) {
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

  const buildProcessingIntevalFixedRateDisplay = () => {
    if (
      pipelineInfo?.selectedExcutionType?.value === ExecutionType.FIXED_RATE
    ) {
      return `${pipelineInfo.excutionFixedValue} ${pipelineInfo.selectedExcutionUnit?.label} `;
    } else {
      return `${pipelineInfo?.exeCronExp}`;
    }
  };

  const buildProcessingIntevalCronDisplay = () => {
    if (pipelineInfo?.dataProcessing.scheduleExpression.startsWith('cron')) {
      return pipelineInfo?.dataProcessing.scheduleExpression;
    } else {
      const pattern = /rate\((\d+\s\w+)\)/;
      const match =
        pipelineInfo?.dataProcessing.scheduleExpression.match(pattern);

      if (match) {
        const rateValue = match[1];
        const formattedRateValue = rateValue.replace(/\b\s+(\w)/, (match) =>
          match.toUpperCase()
        );
        return formattedRateValue;
      }
    }
  };

  const getDataProcessingIntervalDisplay = () => {
    if (pipelineInfo) {
      if (pipelineInfo.selectedExcutionType) {
        return buildProcessingIntevalFixedRateDisplay();
      } else if (pipelineInfo?.dataProcessing?.scheduleExpression) {
        if (pipelineInfo.dataProcessing.scheduleExpression) {
          return buildProcessingIntevalCronDisplay();
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
        const minutes = pipelineInfo?.dataModeling?.redshift?.dataRange;
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

  const renderDescription = (e: IPlugin) => {
    if (localeLng === 'zh-CN') {
      return e.description['zh-CN'];
    }
    return e.description['en-US'];
  };

  const getEnrichPluginDisplay = () => {
    let renderEnrichPlugins: any = [];
    if (pipelineInfo?.selectedEnrichPlugins) {
      // Create Pipeline
      renderEnrichPlugins = pipelineInfo?.selectedEnrichPlugins;
    } else {
      // Pipeline detail
      renderEnrichPlugins = pipelineInfo?.dataProcessing?.enrichPlugin || [];
    }
    if (renderEnrichPlugins.length > 0) {
      const returnElement = renderEnrichPlugins.map((element: IPlugin) => {
        return (
          <div key={element.name}>
            {element.name}{' '}
            <Box variant="small">{renderDescription(element)}</Box>
          </div>
        );
      });
      return returnElement;
    } else {
      return '-';
    }
  };

  const getTransformPluginDisplay = () => {
    let renderTransformPlugins: any = [];
    if (pipelineInfo?.selectedTransformPlugins) {
      // Create Pipeline
      renderTransformPlugins = pipelineInfo?.selectedTransformPlugins;
    } else {
      // Pipeline detail
      renderTransformPlugins =
        pipelineInfo?.dataProcessing?.transformPlugin || [];
    }
    if (renderTransformPlugins.length > 0) {
      const returnElement = renderTransformPlugins.map((element: IPlugin) => {
        return (
          <div key={element.name}>
            {element.name}{' '}
            <Box variant="small">{renderDescription(element)}</Box>
          </div>
        );
      });
      return returnElement;
    } else {
      return '-';
    }
  };

  const isDataProcessingEnable = () => {
    // Pipeline Detail
    if (pipelineInfo?.pipelineId) {
      if (
        pipelineInfo.dataProcessing?.dataFreshnessInHour &&
        pipelineInfo.dataProcessing?.scheduleExpression
      ) {
        return true;
      }
    } else {
      // Create Pipeline
      if (pipelineInfo?.enableDataProcessing) {
        return true;
      }
    }
    return false;
  };

  const isRedshiftEnable = () => {
    // Pipeline Detail
    if (pipelineInfo?.pipelineId) {
      if (pipelineInfo.dataModeling?.redshift) {
        return true;
      }
    } else {
      // Create pipeline
      if (pipelineInfo?.enableRedshift) {
        return true;
      }
    }
    return false;
  };

  return (
    <ColumnLayout columns={3} variant="text-grid">
      <SpaceBetween direction="vertical" size="l">
        <div>
          <Box variant="awsui-key-label">{t('pipeline:detail.status')}</Box>
          <div>
            {isDataProcessingEnable() ? (
              <StatusIndicator type="success">{t('enabled')}</StatusIndicator>
            ) : (
              <StatusIndicator type="stopped">{t('disabled')}</StatusIndicator>
            )}
          </div>
        </div>

        {isDataProcessingEnable() && (
          <>
            <div>
              <Box variant="awsui-key-label">
                {t('pipeline:detail.dataProcessingInt')}
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
              <Box variant="awsui-key-label">
                {t('pipeline:detail.transform')}
              </Box>
              {getTransformPluginDisplay()}
            </div>

            <div>
              <Box variant="awsui-key-label">
                {t('pipeline:detail.enrichment')}
              </Box>
              <div>{getEnrichPluginDisplay()}</div>
            </div>
          </>
        )}
      </SpaceBetween>

      {isDataProcessingEnable() && (
        <>
          <SpaceBetween direction="vertical" size="l">
            <div>
              <Box variant="awsui-key-label">
                {t('pipeline:detail.redshift')}
              </Box>
              <div>
                {isRedshiftEnable() ? (
                  <StatusIndicator type="success">
                    {t('enabled')}
                  </StatusIndicator>
                ) : (
                  <StatusIndicator type="stopped">
                    {t('disabled')}
                  </StatusIndicator>
                )}
              </div>
            </div>

            {isRedshiftEnable() && (
              <>
                <div>
                  <Box variant="awsui-key-label">
                    {t('pipeline:detail.analyticEngine')}
                  </Box>
                  <div>{buildRedshiftDisplay(pipelineInfo)}</div>
                </div>

                <div>
                  <Box variant="awsui-key-label">
                    {t('pipeline:detail.redshiftPermission')}
                  </Box>
                  <div>
                    {pipelineInfo?.dataModeling?.redshift?.provisioned
                      ?.dbUser || '-'}
                  </div>
                </div>

                <div>
                  <Box variant="awsui-key-label">
                    {t('pipeline:detail.dataRange')}
                  </Box>
                  <div>{getRedshiftDataRangeDisplay()}</div>
                </div>
              </>
            )}
          </SpaceBetween>

          <SpaceBetween direction="vertical" size="l">
            <div>
              <Box variant="awsui-key-label">{t('pipeline:detail.athena')}</Box>
              <div>
                {pipelineInfo?.dataModeling.athena ? (
                  <StatusIndicator type="success">
                    {t('enabled')}
                  </StatusIndicator>
                ) : (
                  <StatusIndicator type="stopped">
                    {t('disabled')}
                  </StatusIndicator>
                )}
              </div>
            </div>
          </SpaceBetween>
        </>
      )}
    </ColumnLayout>
  );
};

export default Processing;
