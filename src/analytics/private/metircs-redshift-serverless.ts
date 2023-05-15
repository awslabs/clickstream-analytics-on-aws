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


import { Construct } from 'constructs';
import { MetricWidgetElement, MetricsWidgets } from '../../metrics/metrics-widgets-custom-resource';
import { WIDGETS_ORDER } from '../../metrics/settings';


export function createMetricsWidgetForRedshiftServerless(scope: Construct, props: {
  projectId: string;
  redshiftServerlessNamespace?: string;
  redshiftServerlessWorkgroupName: string;
}) {

  const namespace = 'AWS/Redshift-Serverless';
  const workgroupDimension = [
    'Workgroup', props.redshiftServerlessWorkgroupName,
  ];

  const widgets: MetricWidgetElement[] = [
    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Redshift-Serverless ComputeSeconds',
        metrics: [
          [namespace, 'ComputeSeconds', ...workgroupDimension],

        ],
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Redshift-Serverless ComputeCapacity',
        metrics: [
          [namespace, 'ComputeCapacity', ...workgroupDimension],
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
            [namespace, 'DataStorage', 'Namespace', props.redshiftServerlessNamespace],
          ],
        },
      });
  }

  return new MetricsWidgets(scope, 'redshiftServerless', {
    order: WIDGETS_ORDER.redshiftServerless,
    projectId: props.projectId,
    name: 'redshiftServerless',
    description: {
      markdown: '## Analytics Redshift Serverless',
    },
    widgets,
  });

}