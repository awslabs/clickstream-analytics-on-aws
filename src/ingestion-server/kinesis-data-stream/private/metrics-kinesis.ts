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
import { MetricWidgetElement, MetricsWidgets } from '../../../metrics/metrics-widgets-custom-resource';
import { WIDGETS_ORDER } from '../../../metrics/settings';


export function createMetricsWidgetForKinesis(scope: Construct, props: {
  projectId: string;
  streamName: string;
  kinesisToS3FunctionName: string;
}) {

  const kinesisNamespace = 'AWS/Kinesis';
  const kinesisDimension = [
    'StreamName', props.streamName,
  ];

  const lambdaNamespace = 'AWS/Lambda';
  const lambdaDimension = [
    'FunctionName',
    props.kinesisToS3FunctionName,
  ];


  const widgets: MetricWidgetElement[] = [
    {
      type: 'metric',
      properties: {
        stat: 'Sum',
        title: 'Kinesis Incoming Records',
        metrics: [
          [kinesisNamespace, 'IncomingRecords', ...kinesisDimension],
          [kinesisNamespace, 'GetRecords.Records', ...kinesisDimension],
        ],
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Sum',
        title: 'Kinesis Incoming Bytes',
        metrics: [
          [kinesisNamespace, 'IncomingBytes', ...kinesisDimension],
          [kinesisNamespace, 'GetRecords.Bytes', ...kinesisDimension],

        ],
      },
    },
    {
      type: 'metric',
      properties: {
        stat: 'Sum',
        title: 'Kinesis Throttled and Failed Records',
        metrics: [
          [
            kinesisNamespace,
            'PutRecords.ThrottledRecords',
            ...kinesisDimension,
          ],

          [
            kinesisNamespace,
            'PutRecords.FailedRecords',
            ...kinesisDimension,
          ],
        ],
      },
    },


    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Kinesis Latency',
        metrics: [
          [kinesisNamespace, 'PutRecords.Latency', ...kinesisDimension],
          [
            kinesisNamespace,
            'GetRecords.IteratorAgeMilliseconds',
            ...kinesisDimension,
          ],

        ],
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Sum',
        title: 'Kinesis Throughput Exceeded',
        metrics: [
          [
            kinesisNamespace,
            'WriteProvisionedThroughputExceeded',
            ...kinesisDimension,
          ],

          [
            kinesisNamespace,
            'ReadProvisionedThroughputExceeded',
            ...kinesisDimension,
          ],

        ],
      },
    },

    {
      type: 'metric',
      properties: {
        period: 60,
        stat: 'Sum',
        title: 'Kinesis to S3 Lambda Invocations',
        metrics: [
          [
            lambdaNamespace,
            'Invocations',
            ...lambdaDimension,
          ],
        ],
      },
    },

    {
      type: 'metric',
      properties: {
        period: 60,
        stat: 'Sum',
        title: 'Kinesis to S3 Lambda Throttles',
        metrics: [
          [
            lambdaNamespace,
            'Throttles',
            ...lambdaDimension,
          ],
        ],
      },
    },

    {
      type: 'metric',
      properties: {
        period: 60,
        stat: 'Sum',
        title: 'Kinesis to S3 Lambda ConcurrentExecutions',
        metrics: [
          [
            lambdaNamespace,
            'ConcurrentExecutions',
            ...lambdaDimension,
          ],

        ],
      },
    },

    {
      type: 'metric',
      properties: {
        period: 60,
        stat: 'Sum',
        title: 'Kinesis to S3 Lambda Error count',
        metrics: [
          [lambdaNamespace,
            'Errors',
            ...lambdaDimension,
            { id: 'errors', stat: 'Sum', color: '#d13212' }],
        ],
      },
    },

    {
      type: 'metric',
      properties: {
        period: 60,
        stat: 'Sum',
        title: 'Kinesis to S3 Lambda success rate (%)',
        metrics: [
          [lambdaNamespace,
            'Errors',
            ...lambdaDimension,
            { id: 'errors', stat: 'Sum', visible: false }],

          ['.', 'Invocations', '.', '.', { id: 'invocations', stat: 'Sum', visible: false }],

          [{
            expression: '100 - 100 * errors / MAX([errors, invocations])',
            label: 'Success rate (%)',
            id: 'availability',
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

  ];


  return new MetricsWidgets(scope, 'kinesisDataStream', {
    order: WIDGETS_ORDER.kinesisDataStream,
    projectId: props.projectId,
    name: 'kinesisDataStream',
    description: {
      markdown: '## Kinesis Data Stream',
    },
    widgets,
  });


}