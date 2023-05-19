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
import { Alarm, ComparisonOperator } from 'aws-cdk-lib/aws-cloudwatch';
import { IStateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
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


  const loadEventsWorkflowAlarm = new Alarm(scope, id + 'loadEventsWorkflowAlarm', {
    comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    threshold: 1,
    evaluationPeriods: 1,
    metric: props.loadEventsWorkflow.metricFailed({ period: Duration.hours(1) }),
    alarmDescription: 'Load events workflow failed',
    alarmName: getAlarmName(scope, props.projectId, 'Load events workflow'),
  });

  const upsertUsersWorkflowAlarm = new Alarm(scope, id + 'upsertUsersWorkflowAlarm', {
    comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    threshold: 1,
    evaluationPeriods: 1,
    metric: props.upsertUsersWorkflow.metricFailed({ period: Duration.hours(24) }),
    alarmDescription: 'Upsert users workflow failed',
    alarmName: getAlarmName(scope, props.projectId, 'Upsert users workflow'),
  });

  setCfnNagForAlarms([loadEventsWorkflowAlarm, upsertUsersWorkflowAlarm]);

  const workflowAlarms : (MetricWidgetElement | AlarmsWidgetElement)[]= [
    {
      type: 'alarm',
      properties: {
        alarms: [
          loadEventsWorkflowAlarm.alarmArn,
          upsertUsersWorkflowAlarm.alarmArn,
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
          [statesNamespace, 'ExecutionsSucceeded', ...clearExpiredEventsWorkflowDimension, { id: 'm1', visible: true }],
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
          [statesNamespace, 'ExecutionTime', ...clearExpiredEventsWorkflowDimension, { id: 'm1', visible: true }],
        ],
      },
    },

  ];
  return { workflowAlarms, workflowMetrics };
}