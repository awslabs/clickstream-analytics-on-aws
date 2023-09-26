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


import { IStateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { buildMetricsWidgetForWorkflows } from './metrics-common-workflow';
import { AlarmsWidgetElement, MetricWidgetElement, MetricsWidgets } from '../../metrics/metrics-widgets-custom-resource';
import { WIDGETS_ORDER } from '../../metrics/settings';


export function createMetricsWidgetForRedshiftServerless(scope: Construct, id: string, props: {
  projectId: string;
  dataProcessingCronOrRateExpression: string;
  upsertUsersCronOrRateExpression: string;
  scanMetadataCronOrRateExpression: string;
  redshiftServerlessNamespace?: string;
  redshiftServerlessWorkgroupName: string;
  loadEventsWorkflow: IStateMachine;
  upsertUsersWorkflow: IStateMachine;
  scanMetadataWorkflow: IStateMachine;
  clearExpiredEventsWorkflow: IStateMachine;
}) {

  const namespace = 'AWS/Redshift-Serverless';
  const workgroupDimension = [
    'Workgroup', props.redshiftServerlessWorkgroupName,
  ];

  const { workflowAlarms, workflowMetrics } = buildMetricsWidgetForWorkflows(scope, id + 'serverless', props);

  const widgets: (MetricWidgetElement | AlarmsWidgetElement)[] = [
    ... workflowAlarms,
    ... workflowMetrics,
    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Redshift-Serverless ComputeSeconds',
        metrics: [
          [namespace, 'ComputeSeconds', ...workgroupDimension, { id: 'm1', visible: true }],
        ],
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Redshift-Serverless ComputeCapacity',
        metrics: [
          [namespace, 'ComputeCapacity', ...workgroupDimension, { id: 'm1', visible: true }],
        ],
      },
    },
  ];

  if (props.redshiftServerlessNamespace) {
    widgets.push(
      {
        type: 'metric',
        properties: {
          stat: 'Average',
          title: 'Redshift-Serverless DataStorage',
          metrics: [
            [namespace, 'DataStorage', 'Namespace', props.redshiftServerlessNamespace, { id: 'm1', visible: true }],
          ],
        },
      });
  }

  return new MetricsWidgets(scope, 'redshiftServerless', {
    order: WIDGETS_ORDER.redshiftServerless,
    projectId: props.projectId,
    name: 'redshiftServerless',
    description: {
      markdown: '## Data Modeling - Redshift Serverless',
    },
    widgets,
  });

}