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
import { MetricWidgetElement, MetricsWidgets, TextWidgetElement } from '../../../metrics/metrics-widgets-custom-resource';
import { WIDGETS_ORDER } from '../../../metrics/settings';


export function createMetricsWidgetForKafka(scope: Construct, props: {
  projectId: string;
  mskClusterName: string;
  kafkaBrokers: string;
  kafkaTopic: string;
}) {

  const namespace = 'AWS/Kafka';
  const clusterNameDimension = [
    'Cluster Name', props.mskClusterName,
  ];

  const brokerIdList = [1, 2];

  const widgets: (MetricWidgetElement | TextWidgetElement)[] = [
    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'MSK Cluster ClientConnectionCount',
        metrics: [
          [namespace, 'ClientConnectionCount', ...clusterNameDimension],
        ],
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'MSK Cluster Broker CPU',
        metrics: brokerIdList.flatMap((brokerId) => {
          return [
            [namespace, 'CpuIdle', ...clusterNameDimension, 'Broker ID', `${brokerId}`],
            ['.', 'CpuSystem', '.', '.', 'Broker ID', `${brokerId}`],
            ['.', 'CpuUser', '.', '.', 'Broker ID', `${brokerId}`],
            ['.', 'CpuIoWait', '.', '.', 'Broker ID', `${brokerId}`],
          ];
        }),
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'MSK Cluster Broker Memory',
        metrics: brokerIdList.flatMap((brokerId) => {
          return [
            [namespace, 'MemoryFree', ...clusterNameDimension, 'Broker ID', `${brokerId}`],
            ['.', 'MemoryUsed', '.', '.', 'Broker ID', `${brokerId}`],
          ];
        }),
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'MSK Cluster Broker RootDiskUsed',
        metrics: brokerIdList.flatMap((brokerId) => {
          return [
            [namespace, 'RootDiskUsed', ...clusterNameDimension, 'Broker ID', `${brokerId}`],
          ];
        }),
      },
    },
  ];


  return new MetricsWidgets(scope, 'kafkaCluster', {
    order: WIDGETS_ORDER.kafkaCluster,
    projectId: props.projectId,
    name: 'kafkaCluster',
    description: {
      markdown: '## Data Ingestion - Sink - Kafka Cluster',
    },
    widgets,
  });

}