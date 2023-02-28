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
  readonly protocol: string;
  /**
   * Enable application load balancer access log
   * allowedValues: ['Yes', 'No']
   */
  readonly enableApplicationLoadBalancerAccessLog: string;
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

interface IngestionServerSinkProps {
  /**
   * Sink type
   * allowedValues: ['s3', 'kafka', 'kinesis']
   */
  readonly sinkType: string;
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
   * Amazon managed streaming for apache kafka (Amazon MSK) security group id
   */
  readonly mskSecurityGroupId?: string;
  /**
   * S3 bucket name to save data from Kinesis Data Stream
   */
  readonly kinesisDataS3Bucket?: string;
  /**
   * S3 object prefix to save data from Kinesis Data Stream
   * default: 'kinesis-data'
   */
  readonly kinesisDataS3Prefix?: string;
  /**
   * Kinesis Data Stream mode
   * allowedValues: ['ON_DEMAND', 'PROVISIONED']
   * default: 'ON_DEMAND'
   */
  readonly kinesisStreamMode?: string;
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
   * Comma delimited public subnet ids
   */
  readonly publicSubnetIds: string;
  /**
   * Comma delimited private subnet ids.
   */
  readonly privateSubnetIds: string;
}

interface IngestionServer {
  readonly network: IngestionServerNetworkProps;
  readonly size: IngestionServerSizeProps;
  readonly domain?: IngestionServerDomainProps;
  readonly loadBalancer: IngestionServerLoadBalancerProps;
  readonly sink: IngestionServerSinkProps;
}

export interface ETL {
}

export interface DataModel {
}

export interface Tag {
  key?: string;
  value?: string;
}

export interface Pipeline {
  projectId: string;
  pipelineId: string;
  type: string;

  name: string;
  description: string;
  region: string;
  dataCollectionSDK: string;
  tags: Tag[];

  ingestionServer: IngestionServer;
  etl: ETL;
  dataModel: DataModel;
  ingestionServerRuntime: any;
  etlRuntime: any;
  dataModelRuntime: any;

  version: string;
  createAt: number;
  updateAt: number;
  operator: string;
  deleted: boolean;
}

export interface PipelineList {
  totalCount: number | undefined;
  items: Pipeline[];
}
