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


import { Duration } from 'aws-cdk-lib';
import { Alarm, ComparisonOperator, Metric, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';
import { METRIC_NAMESPACE_DATAPIPELINE } from '../../common/constant';
import { AlarmsWidgetElement, MetricWidgetElement, MetricsWidgets } from '../../metrics/metrics-widgets-custom-resource';
import { WIDGETS_ORDER } from '../../metrics/settings';
import { setCfnNagForAlarms, getAlarmName } from '../../metrics/util';

export function createMetricsWidget(scope: Construct, props: {
  projectId: string;
  emrApplicationId: string;
}) {
  const dataPipelineNamespace = METRIC_NAMESPACE_DATAPIPELINE;
  const emrServerlessNamespace = 'AWS/EMRServerless';
  const appIdDimension = [
    'ApplicationId',
    props.emrApplicationId,
  ];

  // Alrams

  const failedJobAlarm = new Alarm(scope, 'failedJobAlarm', {
    comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
    threshold: 1,
    evaluationPeriods: 1,
    metric: new Metric({
      metricName: 'FailedJobs',
      namespace: emrServerlessNamespace,
      period: Duration.seconds(3600),
      statistic: 'Sum',
      dimensionsMap: {
        ApplicationId: props.emrApplicationId,
      },
    }),
    alarmDescription: 'Has failed jobs in last hour',
    alarmName: getAlarmName(scope, props.projectId, 'ETL Job Failed'),
  });


  const noDataAlarm = new Alarm(scope, 'noDataAlarm', {
    comparisonOperator: ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
    threshold: 0,
    evaluationPeriods: 1,
    treatMissingData: TreatMissingData.NOT_BREACHING,
    metric: new Metric({
      metricName: 'ETL sink count',
      namespace: dataPipelineNamespace,
      period: Duration.hours(24),
      statistic: 'Sum',
      dimensionsMap: {
        ApplicationId: props.emrApplicationId,
      },
    }),
    alarmDescription: 'No data loaded in past 24 hours',
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
        title: 'Data Pipeline ETL Alarms',

      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Sum',
        title: 'Data Pipeline ETL Jobs',
        metrics: [
          [emrServerlessNamespace, 'SubmittedJobs', ...appIdDimension],
          [emrServerlessNamespace, 'FailedJobs', ...appIdDimension, { id: 'errors', stat: 'Sum', color: '#d13212' }],
          [emrServerlessNamespace, 'SuccessJobs', ...appIdDimension],
          [emrServerlessNamespace, 'RunningJobs', ...appIdDimension],
          [emrServerlessNamespace, 'ScheduledJobs', ...appIdDimension],
          [emrServerlessNamespace, 'PendingJobs', ...appIdDimension],
        ],
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Sum',
        title: 'Data Pipeline ETL Job success rate (%)',
        metrics: [
          [emrServerlessNamespace, 'SuccessJobs', ...appIdDimension, { id: 'succ', stat: 'Sum', visible: false }],
          [emrServerlessNamespace, 'FailedJobs', ...appIdDimension, { id: 'fail', stat: 'Sum', visible: false }],
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
        title: 'Data Pipeline ETL CPUAllocated',
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
        title: 'Data Pipeline ETL MemoryAllocated',
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
        title: 'Data Pipeline ETL StorageAllocated',
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
        title: 'Data Pipeline ETL RunningWorkerCount',
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
        title: 'Data Pipeline ETL Row counts',
        metrics: [
          [
            dataPipelineNamespace,
            'ETL source count',
            ...appIdDimension,
          ],
          [
            dataPipelineNamespace,
            'ETL flatted source count',
            ...appIdDimension,
          ],
          [
            dataPipelineNamespace,
            'ETL corrupted count',
            ...appIdDimension,
          ],
          [
            dataPipelineNamespace,
            'ETL sink count',
            ...appIdDimension,
          ],
        ],
      },
    },
    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Data Pipeline ETL job run time',
        metrics: [
          [
            dataPipelineNamespace,
            'ETL job run time seconds',
            ...appIdDimension,
          ],
        ],
      },
    },
  ];

  return new MetricsWidgets(scope, 'dataPipelineETL', {
    order: WIDGETS_ORDER.dataPipelineETL,
    projectId: props.projectId,
    name: 'dataPipelineETL',
    description: {
      markdown: '## Data Pipeline ETL',
    },
    widgets,
  });
}