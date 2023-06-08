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
import { IStateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { AnalyticsCustomMetricsName, MetricsNamespace, MetricsService } from '../../common/model';
import { AlarmsWidgetElement, MetricWidgetElement } from '../../metrics/metrics-widgets-custom-resource';
import { getAlarmName, setCfnNagForAlarms } from '../../metrics/util';


export function buildMetricsWidgetForWorkflows(scope: Construct, id: string, props: {
  projectId: string;
  loadEventsWorkflow: IStateMachine;
  upsertUsersWorkflow: IStateMachine;
  clearExpiredEventsWorkflow: IStateMachine;
}) {

  const statesNamespace = 'AWS/States';
  const loadEventsWorkflowDimension = [
    'StateMachineArn', props.loadEventsWorkflow.stateMachineArn,
  ];

  const upsertUsersWorkflowDimension = [
    'StateMachineArn', props.upsertUsersWorkflow.stateMachineArn,
  ];

  const clearExpiredEventsWorkflowDimension = [
    'StateMachineArn', props.clearExpiredEventsWorkflow.stateMachineArn,
  ];

  const customNamespace = MetricsNamespace.REDSHIFT_ANALYTICS;
  const customDimension = [
    'ProjectId', props.projectId,
    'service', MetricsService.WORKFLOW,
  ];

  const loadEventsWorkflowAlarm = new Alarm(scope, id + 'loadEventsWorkflowAlarm', {
    comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    threshold: 1,
    evaluationPeriods: 1,
    treatMissingData: TreatMissingData.NOT_BREACHING,
    metric: props.loadEventsWorkflow.metricFailed({ period: Duration.hours(1) }),
    alarmDescription: 'Load events workflow failed',
    alarmName: getAlarmName(scope, props.projectId, 'Load events workflow'),
  });

  const upsertUsersWorkflowAlarm = new Alarm(scope, id + 'upsertUsersWorkflowAlarm', {
    comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    threshold: 1,
    evaluationPeriods: 1,
    treatMissingData: TreatMissingData.NOT_BREACHING,
    metric: props.upsertUsersWorkflow.metricFailed({ period: Duration.hours(24) }),
    alarmDescription: 'Upsert users workflow failed',
    alarmName: getAlarmName(scope, props.projectId, 'Upsert users workflow'),
  });

  const newFilesCountAlarm = new Alarm(scope, id + 'maxFileAageAlarm', {
    comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    threshold: 1800, // half hour
    evaluationPeriods: 1,
    treatMissingData: TreatMissingData.NOT_BREACHING,
    metric: new Metric({
      metricName: AnalyticsCustomMetricsName.FILE_MAX_AGE,
      namespace: MetricsNamespace.REDSHIFT_ANALYTICS,
      period: Duration.minutes(10),
      statistic: 'Average',
      dimensionsMap: {
        ProjectId: props.projectId,
        service: MetricsService.WORKFLOW,
      },
    }),
    alarmDescription: 'Max file age more than 1800 seconds',
    alarmName: getAlarmName(scope, props.projectId, 'Max file age'),
  });


  setCfnNagForAlarms([loadEventsWorkflowAlarm, upsertUsersWorkflowAlarm, newFilesCountAlarm]);

  const workflowAlarms : (MetricWidgetElement | AlarmsWidgetElement)[]= [
    {
      type: 'alarm',
      properties: {
        alarms: [
          loadEventsWorkflowAlarm.alarmArn,
          upsertUsersWorkflowAlarm.alarmArn,
          newFilesCountAlarm.alarmArn,
        ],
        title: 'Analytics Alarms',
      },
    },
  ];
  const workflowMetrics: (MetricWidgetElement | AlarmsWidgetElement)[] = [
    {
      type: 'metric',
      properties: {
        stat: 'Sum',
        title: 'Load events workflow',
        metrics: [
          [statesNamespace, 'ExecutionsSucceeded', ...loadEventsWorkflowDimension],
          ['.', 'ExecutionsFailed', '.', '.'],
          ['.', 'ExecutionsStarted', '.', '.'],
        ],
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Load events workflow execution time',
        metrics: [
          [statesNamespace, 'ExecutionTime', ...loadEventsWorkflowDimension],
        ],
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Sum',
        title: 'Upsert users workflow',
        metrics: [
          [statesNamespace, 'ExecutionsSucceeded', ...upsertUsersWorkflowDimension],
          ['.', 'ExecutionsFailed', '.', '.'],
          ['.', 'ExecutionsStarted', '.', '.'],
        ],
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Upsert users workflow execution time',
        metrics: [
          [statesNamespace, 'ExecutionTime', ...upsertUsersWorkflowDimension],
        ],
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Sum',
        title: 'Clear expired events workflow',
        view: 'timeSeries',
        metrics: [
          [statesNamespace, 'ExecutionsSucceeded', ...clearExpiredEventsWorkflowDimension],
          ['.', 'ExecutionsStarted', '.', '.'],
          ['.', 'ExecutionsFailed', '.', '.'],
        ],
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Clear expired events execution time',
        view: 'timeSeries',
        metrics: [
          [statesNamespace, 'ExecutionTime', ...clearExpiredEventsWorkflowDimension],
        ],
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Sum',
        title: 'Files count',
        metrics: [
          [customNamespace, AnalyticsCustomMetricsName.FILE_NEW, ...customDimension],
          ['.', AnalyticsCustomMetricsName.FILE_PROCESSING, '.', '.', '.', '.'],
          ['.', AnalyticsCustomMetricsName.FILE_LOADED, '.', '.', '.', '.'],
          ['.', AnalyticsCustomMetricsName.FILE_ENQUEUE, '.', '.', '.', '.'],
        ],
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'File max age',
        metrics: [
          [customNamespace, AnalyticsCustomMetricsName.FILE_MAX_AGE, ...customDimension],
        ],
      },
    },
  ];
  return { workflowAlarms, workflowMetrics };
}