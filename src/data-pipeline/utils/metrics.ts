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


import { CfnResource, Duration } from 'aws-cdk-lib';
import { Alarm, ComparisonOperator, Metric, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';
import { DataPipelineCustomMetricsName, MetricsNamespace, MetricsService } from '../../common/model';
import { GetInterval } from '../../metrics/get-interval-custom-resource';
import { AlarmsWidgetElement, MetricWidgetElement, MetricsWidgets } from '../../metrics/metrics-widgets-custom-resource';
import { WIDGETS_ORDER } from '../../metrics/settings';
import { setCfnNagForAlarms, getAlarmName } from '../../metrics/util';

export function createMetricsWidget(scope: Construct, props: {
  projectId: string;
  emrApplicationId: string;
  dataProcessingCronOrRateExpression: string;
}) {

  const processingJobInterval = new GetInterval(scope, 'dataProcess', {
    expression: props.dataProcessingCronOrRateExpression,
  });

  const processingJobIntervalSeconds = processingJobInterval.getIntervalSeconds();

  const dataPipelineNamespace = MetricsNamespace.DATAPIPELINE;
  const emrServerlessNamespace = 'AWS/EMRServerless';
  const appIdDimension = [
    'ApplicationId',
    props.emrApplicationId,
  ];

  const customDimension = [
    'ApplicationId', props.emrApplicationId,
    'service', MetricsService.EMR_SERVERLESS,
  ];

  // Alarms

  const failedJobAlarm = new Alarm(scope, 'failedJobAlarm', {
    comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
    threshold: 1,
    evaluationPeriods: 1,
    treatMissingData: TreatMissingData.NOT_BREACHING,
    metric: new Metric({
      metricName: 'FailedJobs',
      namespace: emrServerlessNamespace,
      period: Duration.seconds(3600),
      statistic: 'Sum',
      dimensionsMap: {
        ApplicationId: props.emrApplicationId,
      },
    }),
    alarmDescription: `Has failed jobs, projectId: ${props.projectId}`,
    alarmName: getAlarmName(scope, props.projectId, 'Data Processing Job Failed'),
  });
  (failedJobAlarm.node.defaultChild as CfnResource).addPropertyOverride('Period', processingJobIntervalSeconds);


  const noDataAlarm = new Alarm(scope, 'noDataAlarm', {
    comparisonOperator: ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
    threshold: 0,
    evaluationPeriods: 1,
    treatMissingData: TreatMissingData.NOT_BREACHING,
    metric: new Metric({
      metricName: DataPipelineCustomMetricsName.SINK,
      namespace: dataPipelineNamespace,
      period: Duration.hours(24),
      statistic: 'Sum',
      dimensionsMap: {
        ApplicationId: props.emrApplicationId,
        service: MetricsService.EMR_SERVERLESS,
      },
    }),
    alarmDescription: `No data loaded in past 24 hours, projectId: ${props.projectId}`,
    alarmName: getAlarmName(scope, props.projectId, 'No Data Loaded'),
  });

  setCfnNagForAlarms([failedJobAlarm, noDataAlarm]);

  // Widgets
  const widgets: (MetricWidgetElement | AlarmsWidgetElement)[] = [
    {
      type: 'alarm',
      properties: {
        alarms: [
          failedJobAlarm.alarmArn,
          noDataAlarm.alarmArn,
        ],
        title: 'Data Processing Alarms',

      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Sum',
        title: 'Data Processing Jobs',
        metrics: [
          [emrServerlessNamespace, 'SubmittedJobs', ...appIdDimension],
          ['.', 'FailedJobs', '.', '.', { id: 'errors', stat: 'Sum', color: '#d13212' }],
          ['.', 'SuccessJobs', '.', '.'],
        ],
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Sum',
        title: 'Data Processing Job success rate (%)',
        metrics: [
          [emrServerlessNamespace, 'SuccessJobs', ...appIdDimension, { id: 'succ', stat: 'Sum', visible: false }],
          ['.', 'FailedJobs', '.', '.', { id: 'fail', stat: 'Sum', visible: false }],
          [{ expression: 'SUM(METRICS())', label: 'Completed Jobs', id: 'all', visible: false }],
          [{
            expression: '100 * succ / all',
            label: 'Success rate (%)',
            id: 'succRate',
            yAxis: 'left',
          }],
        ],
        view: 'gauge', // If you specify gauge, you must set a value for min and max on the `left` side of yAxis.
        yAxis: {
          left: {
            min: 0,
            max: 100,
          },
        },
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Data Processing CPUAllocated',
        metrics: [
          [
            emrServerlessNamespace,
            'CPUAllocated',
            ...appIdDimension,
          ],
        ],
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Data Processing MemoryAllocated',
        metrics: [
          [
            emrServerlessNamespace,
            'MemoryAllocated',
            ...appIdDimension,
          ],
        ],
      },
    },
    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Data Processing StorageAllocated',
        metrics: [
          [
            emrServerlessNamespace,
            'StorageAllocated',
            ...appIdDimension,
          ],
        ],
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Data Processing RunningWorkerCount',
        metrics: [
          [
            emrServerlessNamespace,
            'RunningWorkerCount',
            ...appIdDimension,
          ],
        ],
      },
    },


    {
      type: 'metric',
      properties: {
        stat: 'Sum',
        title: 'Data Processing Row counts',
        metrics: [
          [
            dataPipelineNamespace,
            DataPipelineCustomMetricsName.SOURCE,
            ...customDimension,
          ],
          [
            dataPipelineNamespace,
            DataPipelineCustomMetricsName.FLATTED_SOURCE,
            '.', '.', '.', '.',
          ],
          [
            dataPipelineNamespace,
            DataPipelineCustomMetricsName.CORRUPTED,
            '.', '.', '.', '.',
          ],
          [
            dataPipelineNamespace,
            DataPipelineCustomMetricsName.SINK,
            '.', '.', '.', '.',
          ],
        ],
      },
    },
    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Data Processing job run time',
        metrics: [
          [
            dataPipelineNamespace,
            DataPipelineCustomMetricsName.RUN_TIME,
            ...customDimension,
          ],
        ],
      },
    },
  ];

  return new MetricsWidgets(scope, 'dataProcessing', {
    order: WIDGETS_ORDER.dataProcessing,
    projectId: props.projectId,
    name: 'dataProcessing',
    description: {
      markdown: '## Data Processing',
    },
    widgets,
  });
}