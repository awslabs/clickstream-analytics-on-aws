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


export function createMetricsWidgetForRedshiftCluster(scope: Construct, props: {
  projectId: string;
  redshiftClusterIdentifier: string;
}) {

  const namespace = 'AWS/Redshift';
  const dimension = [
    'ClusterIdentifier',
    props.redshiftClusterIdentifier,
  ];

  const widgets: MetricWidgetElement[] = [
    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Redshift Cluster Status',
        metrics: [
          [
            namespace,
            'HealthStatus',
            ...dimension,
          ],
          [
            namespace,
            'MaintenanceMode',
            ...dimension,
          ],

        ],
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Redshift Cluster PercentageDiskSpaceUsed',

        metrics: [
          [
            namespace,
            'PercentageDiskSpaceUsed',
            ...dimension,
          ],
        ],
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Redshift Cluster CPUUtilization',
        metrics: [
          [
            namespace,
            'CPUUtilization',
            ...dimension,
          ],
        ],
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Redshift Cluster RedshiftManagedStorageTotalCapacity',
        metrics: [
          [
            namespace,
            'RedshiftManagedStorageTotalCapacity',
            ...dimension,
          ],
        ],
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Redshift Cluster Read/Write IOPS',

        metrics: [

          [
            namespace,
            'WriteIOPS',
            ...dimension,
          ],

          [
            namespace,
            'ReadIOPS',
            ...dimension,
          ],

        ],
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Redshift Cluster Read/Write Throughput',

        metrics: [
          [
            namespace,
            'WriteThroughput',
            ...dimension,
          ],

          [
            namespace,
            'ReadThroughput',
            ...dimension,
          ],

        ],
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Redshift Cluster ReadLatency',
        metrics: [
          [
            namespace,
            'ReadLatency',
            ...dimension,
          ],
        ],
      },
    },


    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Redshift Cluster CommitQueueLength',
        metrics: [

          [
            namespace,
            'CommitQueueLength',
            ...dimension,
          ],

        ],
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Redshift Cluster Connections and Tables',
        metrics: [

          [
            namespace,
            'DatabaseConnections',
            ...dimension,
          ],
          [
            namespace,
            'TotalTableCount',
            ...dimension,
          ],
        ],
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Average',
        title: 'Redshift Cluster Queries',
        metrics: [

          [
            namespace,
            'QueriesCompletedPerSecond',
            ...dimension,
            'latency',
            'long',
          ],
          [
            namespace,
            'QueriesCompletedPerSecond',
            ...dimension,
            'latency',
            'medium',
          ],
          [
            namespace,
            'QueriesCompletedPerSecond',
            ...dimension,
            'latency',
            'short',
          ],

          [
            namespace,
            'QueryDuration',
            ...dimension,
            'latency',
            'long',
          ],
          [
            namespace,
            'QueryDuration',
            ...dimension,
            'latency',
            'medium',
          ],
          [
            namespace,
            'QueryDuration',
            ...dimension,
            'latency',
            'short',
          ],
        ],
      },
    },

  ];


  return new MetricsWidgets(scope, 'redshiftProvisionedCluster', {
    order: WIDGETS_ORDER.redshiftProvisionedCluster,
    projectId: props.projectId,
    name: 'redshiftProvisionedCluster',
    description: {
      markdown: '## Analytics Redshift Provisioned Cluster',
    },
    widgets,
  });

}