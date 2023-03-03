/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { StackRequestInputParameter } from '../common/sfn';

interface IngestionServerSizeProps {
  /**
   * Server size min number
   * default: 2
   */
  readonly serverMin: number;
  /**
   * Server size max number
   * default: 2
   */
  readonly serverMax: number;
  /**
   * Server autoscaling warm pool min size
   * default: 0
   */
  readonly warmPoolSize: number;
  /**
   * Autoscaling on CPU utilization percent
   * default: 50
   */
  readonly scaleOnCpuUtilizationPercent?: number;
}

interface IngestionServerLoadBalancerProps {
  /**
   * Server endpoint path
   * default: '/collect'
   */
  readonly serverEndpointPath: string;
  /**
   * Server CORS origin
   * default: ''
   */
  readonly serverCorsOrigin: string;
  /**
   * Server protocol
   * allowedValues: ['HTTP', 'HTTPS']
   */
  readonly protocol: 'HTTP' | 'HTTPS';
  /**
   * Enable application load balancer access log
   */
  readonly enableApplicationLoadBalancerAccessLog: boolean;
  /**
   * S3 bucket to save log (optional)
   */
  readonly logS3Bucket?: string;
  /**
   * S3 object prefix to save log (optional)
   */
  readonly logS3Prefix?: string;
  /**
   * AutoScaling group notifications SNS topic arn (optional)
   */
  readonly notificationsTopicArn?: string;
}

interface IngestionServerSinkS3Props {
  /**
   * s3 URI
   */
  readonly s3Uri?: string;
  /**
   * s3 prefix
   */
  readonly s3prefix?: string;
  /**
   * s3 buffer size
   */
  readonly s3BufferSize?: number;
  /**
   * s3 buffer interval
   */
  readonly s3BufferInterval?: number;
}

interface IngestionServerSinkKafkaProps {
  /**
   * Host type
   */
  readonly selfHost: boolean;
  /**
   * Kafka brokers string
   */
  readonly kafkaBrokers?: string;
  /**
   * Kafka topic
   */
  readonly kafkaTopic?: string;
  /**
   * Amazon managed streaming for apache kafka (Amazon MSK) cluster name
   */
  readonly mskClusterName?: string;
  /**
   * Amazon managed streaming for apache kafka (Amazon MSK) topic
   */
  readonly mskTopic?: string;
  /**
   * Amazon managed streaming for apache kafka (Amazon MSK) security group id
   */
  readonly mskSecurityGroupId?: string;
}

interface IngestionServerSinkKinesisProps {
  /**
   * Kinesis Data Stream mode
   * allowedValues: ['ON_DEMAND', 'PROVISIONED']
   * default: 'ON_DEMAND'
   */
  readonly kinesisStreamMode: 'ON_DEMAND' | 'PROVISIONED';
  /**
   * Number of Kinesis Data Stream shards, only apply for Provisioned mode
   * default: '3'
   */
  readonly kinesisShardCount?: number;
  /**
   * Data retention hours in Kinesis Data Stream, from 24 hours by default, up to 8760 hours (365 days)
   * default: '24'
   */
  readonly kinesisDataRetentionHours?: number;
  /**
   Batch size for Lambda function to read data from Kinesis Data Stream
   default: '10000'
   */
  readonly kinesisBatchSize?: number;
  /**
   * Max batching window in seconds for Lambda function to read data from Kinesis Data Stream
   * default: '300'
   */
  readonly kinesisMaxBatchingWindowSeconds?: number;
  /**
   * S3 bucket name to save data from Kinesis Data Stream
   */
  readonly kinesisDataS3Bucket?: string;
  /**
   * S3 object prefix to save data from Kinesis Data Stream
   * default: 'kinesis-data'
   */
  readonly kinesisDataS3Prefix?: string;

}

interface IngestionServerDomainProps {
  /**
   * The hosted zone ID in Route 53.
   */
  readonly hostedZoneId?: string;
  /**
   * The hosted zone name in Route 53
   */
  readonly hostedZoneName?: string;
  /**
   * The record name
   */
  readonly recordName?: string;
}

interface IngestionServerNetworkProps {
  /**
   * Select the virtual private cloud (VPC).
   */
  readonly vpcId: string;
  /**
   * public subnet list
   */
  readonly publicSubnetIds: string[];
  /**
   * private subnet ids.
   */
  readonly privateSubnetIds: string[];
}

interface IngestionServer {
  readonly network: IngestionServerNetworkProps;
  readonly size: IngestionServerSizeProps;
  readonly domain?: IngestionServerDomainProps;
  readonly loadBalancer: IngestionServerLoadBalancerProps;
  readonly sinkType: string;
  readonly sinkS3?: IngestionServerSinkS3Props;
  readonly sinkKafka?: IngestionServerSinkKafkaProps;
  readonly sinkKinesis?: IngestionServerSinkKinesisProps;
}

export interface ETL {
}

export interface DataModel {
}

export interface Tag {
  [key: string]: string;
}

export enum PipelineStatus {
  CREATE_IN_PROGRESS = 'CREATE_IN_PROGRESS',
  CREATE_COMPLETE = 'CREATE_COMPLETE',
  CREATE_FAILED = 'CREATE_FAILED',
  UPDATE_IN_PROGRESS = 'UPDATE_IN_PROGRESS',
  UPDATE_COMPLETE = 'UPDATE_COMPLETE',
  UPDATE_FAILED = 'UPDATE_FAILED',
  DELETE_IN_PROGRESS = 'DELETE_IN_PROGRESS',
  DELETE_COMPLETE = 'DELETE_COMPLETE',
  DELETE_FAILED = 'DELETE_FAILED',
}

export interface Pipeline {
  projectId: string;
  pipelineId: string;
  type: string;

  name: string;
  description: string;
  region: string;
  dataCollectionSDK: string;
  status: PipelineStatus | string;
  tags: Tag[];

  ingestionServer: IngestionServer;
  etl: ETL;
  dataModel: DataModel;
  ingestionServerRuntime: any;
  etlRuntime: any;
  dataModelRuntime: any;

  version: string;
  versionTag: string;
  createAt: number;
  updateAt: number;
  operator: string;
  deleted: boolean;
}

export interface PipelineList {
  totalCount: number | undefined;
  items: Pipeline[];
}

export function getIngestionStackParameters(pipeline: Pipeline): StackRequestInputParameter[] {
  let parameters: StackRequestInputParameter[] = [];
  // VPC Information
  parameters.push({
    ParameterKey: 'VpcId',
    ParameterValue: pipeline.ingestionServer.network.vpcId,
  });
  parameters.push({
    ParameterKey: 'PublicSubnetIds',
    ParameterValue: pipeline.ingestionServer.network.publicSubnetIds.join(','),
  });
  parameters.push({
    ParameterKey: 'PrivateSubnetIds',
    ParameterValue: pipeline.ingestionServer.network.privateSubnetIds.join(','),
  });
  // LB
  parameters.push({
    ParameterKey: 'Protocol',
    ParameterValue: pipeline.ingestionServer.loadBalancer.protocol,
  });
  parameters.push({
    ParameterKey: 'ServerCorsOrigin',
    ParameterValue: pipeline.ingestionServer.loadBalancer.serverCorsOrigin,
  });
  parameters.push({
    ParameterKey: 'NotificationsTopicArn',
    ParameterValue: pipeline.ingestionServer.loadBalancer.notificationsTopicArn ?? '',
  });
  parameters.push({
    ParameterKey: 'EnableApplicationLoadBalancerAccessLog',
    ParameterValue: pipeline.ingestionServer.loadBalancer.enableApplicationLoadBalancerAccessLog ? 'Yes' : 'No',
  });
  parameters.push({
    ParameterKey: 'LogS3Bucket',
    ParameterValue: pipeline.ingestionServer.loadBalancer.logS3Bucket ?? '',
  });
  parameters.push({
    ParameterKey: 'LogS3Prefix',
    ParameterValue: pipeline.ingestionServer.loadBalancer.logS3Prefix ?? '',
  });
  // Domain Information
  parameters.push({
    ParameterKey: 'HostedZoneId',
    ParameterValue: pipeline.ingestionServer.domain?.hostedZoneId ?? '',
  });
  parameters.push({
    ParameterKey: 'HostedZoneName',
    ParameterValue: pipeline.ingestionServer.domain?.hostedZoneName ?? '',
  });
  parameters.push({
    ParameterKey: 'RecordName',
    ParameterValue: pipeline.ingestionServer.domain?.recordName ?? '',
  });
  // Server
  parameters.push({
    ParameterKey: 'ServerMax',
    ParameterValue: pipeline.ingestionServer.size.serverMax.toString(),
  });
  parameters.push({
    ParameterKey: 'ServerMin',
    ParameterValue: pipeline.ingestionServer.size.serverMin.toString(),
  });
  parameters.push({
    ParameterKey: 'ScaleOnCpuUtilizationPercent',
    ParameterValue: (pipeline.ingestionServer.size.scaleOnCpuUtilizationPercent ?? 50).toString(),
  });
  parameters.push({
    ParameterKey: 'WarmPoolSize',
    ParameterValue: (pipeline.ingestionServer.size.warmPoolSize ?? 0).toString(),
  });
  // Kafka Cluster
  // TODO: mock kafka
  parameters.push({
    ParameterKey: 'SinkToKafka',
    ParameterValue: 'Yes',
  });
  parameters.push({
    ParameterKey: 'KafkaBrokers',
    ParameterValue: pipeline.ingestionServer.sinkKafka?.kafkaBrokers ?? '',
  });
  parameters.push({
    ParameterKey: 'KafkaTopic',
    ParameterValue: pipeline.ingestionServer.sinkKafka?.kafkaTopic ?? '',
  });
  parameters.push({
    ParameterKey: 'MskClusterName',
    ParameterValue: pipeline.ingestionServer.sinkKafka?.mskClusterName ?? '',
  });
  parameters.push({
    ParameterKey: 'MskSecurityGroupId',
    ParameterValue: pipeline.ingestionServer.sinkKafka?.mskSecurityGroupId ?? '',
  });
  return parameters;
}
