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


export function createMetricsWidgetForS3Connector(scope: Construct, props: {
  projectId: string;
  mskClusterName: string;
  connectorName: string;
  kafkaTopic: string;
}) {

  const connectorNamespace = 'AWS/KafkaConnect';
  const connectorDimension = [
    'ConnectorName',
    props.connectorName,
  ];


  const consumerGroup = `connect-${props.connectorName}`;

  const kafkaNamespace = 'AWS/Kafka';
  const topicDimension = [
    'Consumer Group',
    consumerGroup,
    'Cluster Name',
    props.mskClusterName,
    'Topic',
    props.kafkaTopic,
  ];


  const widgets: MetricWidgetElement[] = [
    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Kafka S3 Sink Connector RunningTaskCount',
        metrics: [
          [
            connectorNamespace,
            'RunningTaskCount',
            ...connectorDimension,
          ],
        ],
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Kafka S3 Sink Connector CpuUtilization',
        metrics: [

          [
            connectorNamespace,
            'CpuUtilization',
            ...connectorDimension,
          ],
        ],
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Kafka S3 Sink Connector SinkRecordSendRate',
        metrics: [

          [
            connectorNamespace,
            'SinkRecordSendRate',
            ...connectorDimension,
          ],

        ],
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Sum',
        title: `Kafka S3 Sink Connector Lag for topic ${props.kafkaTopic}`,
        metrics: [
          [
            kafkaNamespace,
            'EstimatedMaxTimeLag',
            ...topicDimension,
          ],
          [
            '.',
            'MaxOffsetLag',
            '.', '.', '.', '.', '.', '.',
          ],
          [
            '.',
            'SumOffsetLag',
            '.', '.', '.', '.', '.', '.',
          ],

        ],
      },
    },
  ];


  return new MetricsWidgets(scope, 'kafkaConnector', {
    order: WIDGETS_ORDER.kafkaS3Connector,
    projectId: props.projectId,
    name: 'kafkaS3SinkConnector',
    description: {
      markdown: '## Data Ingestion - Sink - Kafka S3 Connector',
    },
    widgets,
  });

}