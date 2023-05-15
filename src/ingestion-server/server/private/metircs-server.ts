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
import { Alarm, ComparisonOperator, Metric } from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';
import { AlarmsWidgetElement, MetricWidgetElement, MetricsWidgets } from '../../../metrics/metrics-widgets-custom-resource';
import { WIDGETS_ORDER } from '../../../metrics/settings';
import { setCfnNagForAlarms, getAlarmName } from '../../../metrics/util';

export function createMetricsWidgetForServer(scope: Construct, props: {
  projectId: string;
  albFullName: string;
  autoScalingGroupName: string;
  ecsServiceName: string;
  ecsClusterName: string;
}) {


  const albNamespace = 'AWS/ApplicationELB';
  const albDimension = [
    'LoadBalancer',
    props.albFullName,
  ];

  const ecsNamespace = 'ECS/ContainerInsights';
  const ecsDimension = [
    'ClusterName',
    props.ecsClusterName,
    'ServiceName',
    props.ecsServiceName,
  ];

  const asgNamespace = 'AWS/EC2';
  const asgDimension = [
    'AutoScalingGroupName',
    props.autoScalingGroupName,
  ];


  const ecsPendingTaskCountAlarm = new Alarm(scope, 'ecsPendingTaskCountAlarm', {
    comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    threshold: 1,
    evaluationPeriods: 2,
    metric: new Metric({
      metricName: 'PendingTaskCount',
      namespace: ecsNamespace,
      period: Duration.seconds(300),
      statistic: 'Average',
      dimensionsMap: {
        ClusterName: props.ecsClusterName,
        ServiceName: props.ecsServiceName,
      },
    }),
    alarmDescription: 'ECS has PendingTaskCount >= 1',
    alarmName: getAlarmName(scope, props.projectId, 'ECS Pending Task Count'),
  });

  const ecsCpuUtilizedAlarm = new Alarm(scope, 'ecsCpuUtilizedAlarm', {
    comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
    threshold: 85,
    evaluationPeriods: 1,
    metric: new Metric({
      metricName: 'CpuUtilized',
      namespace: ecsNamespace,
      period: Duration.seconds(300),
      statistic: 'Average',
      dimensionsMap: {
        ClusterName: props.ecsClusterName,
        ServiceName: props.ecsServiceName,
      },
    }),
    alarmDescription: 'ECS Cpu Utilized more than 85%',
    alarmName: getAlarmName(scope, props.projectId, 'ECS CPU Utilized'),
  });

  setCfnNagForAlarms([ecsPendingTaskCountAlarm, ecsCpuUtilizedAlarm]);

  const widgets: (MetricWidgetElement | AlarmsWidgetElement)[] = [

    {
      type: 'alarm',
      properties: {
        alarms: [
          ecsPendingTaskCountAlarm.alarmArn,
          ecsCpuUtilizedAlarm.alarmArn,
        ],
        title: 'Ingestion Server Alarms',

      },
    },

    {
      type: 'metric',
      properties: {
        period: 60,
        stat: 'Sum',
        title: 'Server Request Counts',
        metrics: [
          [
            albNamespace,
            'RequestCount',
            ...albDimension,
          ],
        ],
      },
    },

    {
      type: 'metric',
      properties: {
        period: 60,
        stat: 'Sum',
        title: 'Server ELB Error Counts',
        metrics: [
          [
            albNamespace,
            'HTTPCode_ELB_5XX_Count',
            ...albDimension,
          ],
          [
            albNamespace,
            'HTTPCode_ELB_4XX_Count',
            ...albDimension,
          ],
        ],
      },
    },

    {
      type: 'metric',
      properties: {
        period: 60,
        stat: 'Average',
        title: 'Server Response Time',
        metrics: [
          [
            albNamespace,
            'TargetResponseTime',
            ...albDimension,
          ],

        ],

      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Server(ECS) CPU Utilization',
        metrics: [
          [
            ecsNamespace,
            'CpuUtilized',
            ...ecsDimension,
            {
              id: 'cpu',
              yAxis: 'right',
            },
          ],

          [
            ecsNamespace,
            'CpuReserved',
            ...ecsDimension,
          ],
        ],
        yAxis: {
          right: {
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
        title: 'Server(ECS) Memory Utilization',
        metrics: [
          [
            ecsNamespace,
            'MemoryUtilized',
            ...ecsDimension,
            {
              id: 'mem',
              yAxis: 'right',
            },
          ],

          [
            ecsNamespace,
            'MemoryReserved',
            ...ecsDimension,
          ],
        ],
        yAxis: {
          right: {
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
        title: 'Server(ECS) Tasks',
        metrics: [
          [
            ecsNamespace,
            'RunningTaskCount',
            ...ecsDimension,
          ],

          [
            ecsNamespace,
            'DesiredTaskCount',
            ...ecsDimension,
          ],

          [
            ecsNamespace,
            'PendingTaskCount',
            ...ecsDimension,
          ],
        ],

      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Server(Autoscaling group) CPU Utilization',
        metrics: [
          [
            asgNamespace,
            'CPUUtilization',
            ...asgDimension,
          ],
        ],

      },
    },
  ];

  return new MetricsWidgets(scope, 'ingestionServer', {
    order: WIDGETS_ORDER.ingestionServer,
    projectId: props.projectId,
    name: 'ingestionServer',
    description: {
      markdown: '## Ingestion Server',
    },
    widgets,
  });
}
