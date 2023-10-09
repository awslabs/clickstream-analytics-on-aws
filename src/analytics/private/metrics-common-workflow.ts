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
import { IStateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { LoadDataWorkflows } from './metrics-redshift-serverless';
import { AnalyticsCustomMetricsName, MetricsNamespace, MetricsService } from '../../common/model';
import { GetInterval } from '../../metrics/get-interval-custom-resource';
import { AlarmsWidgetElement, MetricWidgetElement } from '../../metrics/metrics-widgets-custom-resource';
import { getAlarmName, setCfnNagForAlarms } from '../../metrics/util';


export function buildMetricsWidgetForWorkflows(scope: Construct, id: string, props: {
  projectId: string;
  dataProcessingCronOrRateExpression: string;
  upsertUsersCronOrRateExpression: string;
  loadDataWorkflows: LoadDataWorkflows;
  upsertUsersWorkflow: IStateMachine;
  clearExpiredEventsWorkflow: IStateMachine;
}) {

  const processingJobInterval = new GetInterval(scope, 'dataProcess', {
    expression: props.dataProcessingCronOrRateExpression,
  });

  const upsertUsersInterval = new GetInterval(scope, 'upsertUsers', {
    expression: props.upsertUsersCronOrRateExpression,
  });

  const statesNamespace = 'AWS/States';
  const loadOdsEventsWorkflowDimension = [
    'StateMachineArn', props.loadDataWorkflows.ods_events.stateMachineArn,
  ];

  const loadEventWorkflowDimension = [
    'StateMachineArn', props.loadDataWorkflows.event.stateMachineArn,
  ];

  const loadEventParameterWorkflowDimension = [
    'StateMachineArn', props.loadDataWorkflows.event_parameter.stateMachineArn,
  ];

  const loadUserWorkflowDimension = [
    'StateMachineArn', props.loadDataWorkflows.user.stateMachineArn,
  ];

  const loadItemWorkflowDimension = [
    'StateMachineArn', props.loadDataWorkflows.item.stateMachineArn,
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

  const loadEventsWorkflowAlarm = new Alarm(scope, id + 'LoadDataWorkflowAlarm', {
    comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    threshold: 1,
    evaluationPeriods: 1,
    treatMissingData: TreatMissingData.NOT_BREACHING,
    metric: props.loadDataWorkflows.event.metricFailed({ period: Duration.hours(1) }), // place-holder value here, Override by addPropertyOverride below
    alarmDescription: `Load event workflow failed, projectId: ${props.projectId}`,
    alarmName: getAlarmName(scope, props.projectId, 'Load event workflow'),
  });
  (loadEventsWorkflowAlarm.node.defaultChild as CfnResource).addPropertyOverride('Period', processingJobInterval.getIntervalSeconds());

  const upsertUsersWorkflowAlarm = new Alarm(scope, id + 'UpsertUsersWorkflowAlarm', {
    comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    threshold: 1,
    evaluationPeriods: 1,
    treatMissingData: TreatMissingData.NOT_BREACHING,
    metric: props.upsertUsersWorkflow.metricFailed({ period: Duration.hours(24) }), // place-holder value here, Override by addPropertyOverride below
    alarmDescription: `Upsert users workflow failed, projectId: ${props.projectId}`,
    alarmName: getAlarmName(scope, props.projectId, 'Upsert users workflow'),
  });
  (upsertUsersWorkflowAlarm.node.defaultChild as CfnResource).addPropertyOverride('Period', upsertUsersInterval.getIntervalSeconds());


  const newFilesCountAlarm = new Alarm(scope, id + 'MaxFileAgeAlarm', {
    comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    threshold: 1800, // place-holder value here, Override by addPropertyOverride below
    evaluationPeriods: 1,
    treatMissingData: TreatMissingData.NOT_BREACHING,
    metric: new Metric({
      metricName: AnalyticsCustomMetricsName.FILE_MAX_AGE,
      namespace: MetricsNamespace.REDSHIFT_ANALYTICS,
      period: Duration.minutes(10), // place-holder value here, Override by addPropertyOverride below
      statistic: 'Average',
      dimensionsMap: {
        ProjectId: props.projectId,
        service: MetricsService.WORKFLOW,
      },
    }),
    alarmDescription: `Max file age more than ${processingJobInterval.getIntervalSeconds()} seconds, projectId: ${props.projectId}`,
    alarmName: getAlarmName(scope, props.projectId, 'Max file age'),
  });
  (newFilesCountAlarm.node.defaultChild as CfnResource).addPropertyOverride('Period', processingJobInterval.getIntervalSeconds());
  (newFilesCountAlarm.node.defaultChild as CfnResource).addPropertyOverride('Threshold', processingJobInterval.getIntervalSeconds());


  setCfnNagForAlarms([loadEventsWorkflowAlarm, newFilesCountAlarm, upsertUsersWorkflowAlarm]);

  const workflowAlarms: (MetricWidgetElement | AlarmsWidgetElement)[] = [
    {
      type: 'alarm',
      properties: {
        alarms: [
          loadEventsWorkflowAlarm.alarmArn,
          newFilesCountAlarm.alarmArn,
        ],
        title: 'Data Modeling Alarms',
      },
    },
  ];


  const workflowExecMetrics: MetricWidgetElement[] = [
    [loadEventWorkflowDimension, 'event'],
    [loadEventParameterWorkflowDimension, 'event parameter'],
    [loadUserWorkflowDimension, 'user'],
    [loadItemWorkflowDimension, 'item'],
    [clearExpiredEventsWorkflowDimension, 'clear expired events'],
    [upsertUsersWorkflowDimension, 'upsert user'],
    [loadOdsEventsWorkflowDimension, 'ods_events'],
  ].flatMap(dimName => {
    return [
      {
        type: 'metric',
        properties: {
          stat: 'Sum',
          title: `Load '${dimName[1]}' workflow`,
          metrics: [
            [statesNamespace, 'ExecutionsSucceeded', ...dimName[0]],
            ['.', 'ExecutionsFailed', '.', '.'],
            ['.', 'ExecutionsStarted', '.', '.'],
          ],
        },
      },

      {
        type: 'metric',
        properties: {
          stat: 'Average',
          title: `Load '${dimName[1]}' workflow execution time`,
          metrics: [
            [statesNamespace, 'ExecutionTime', ...dimName[0]],
          ],
        },
      },
    ];
  });

  const workflowMetrics: (MetricWidgetElement | AlarmsWidgetElement)[] = [
    ...workflowExecMetrics,
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