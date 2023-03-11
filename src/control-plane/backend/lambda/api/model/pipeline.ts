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
   * AutoScaling group notifications SNS topic arn (optional)
   */
  readonly notificationsTopicArn?: string;
  /**
   * Enable application load balancer access log
   */
  readonly enableApplicationLoadBalancerAccessLog: boolean;
  /**
   * S3 bucket to save log (optional)
   */
  readonly logS3Bucket?: S3Bucket;
}

interface IngestionServerSinkS3Props {
  /**
   * S3 bucket
   */
  readonly s3DataBucket: S3Bucket;
  /**
   * s3 Batch max bytes
   */
  readonly s3BatchMaxBytes?: number;
  /**
   * s3 Batch timeout seconds
   */
  readonly s3BatchTimeout?: number;
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
   * S3 bucket to save data from Kinesis Data Stream
   */
  readonly kinesisDataS3Bucket?: S3Bucket;

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
  readonly appIds: string[];
  readonly sourceS3Bucket: S3Bucket;
  readonly sinkS3Bucket: S3Bucket;
}

export interface DataModel {
}

export interface Tag {
  [key: string]: string;
}

interface S3Bucket {
  readonly name: string;
  readonly prefix: string;
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
  id: string;
  type: string;
  prefix: string;

  projectId: string;
  pipelineId: string;
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

export interface StackParameter {
  readonly result: boolean;
  readonly message: string;
  readonly parameters: StackRequestInputParameter[];
}

export function getIngestionStackParameters(pipeline: Pipeline): StackParameter {
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
    ParameterKey: 'Protocol',
    ParameterValue: pipeline.ingestionServer.loadBalancer.protocol,
  });
  parameters.push({
    ParameterKey: 'ServerEndpointPath',
    ParameterValue: pipeline.ingestionServer.loadBalancer.serverEndpointPath,
  });
  parameters.push({
    ParameterKey: 'ServerCorsOrigin',
    ParameterValue: pipeline.ingestionServer.loadBalancer.serverCorsOrigin,
  });
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
  parameters.push({
    ParameterKey: 'NotificationsTopicArn',
    ParameterValue: pipeline.ingestionServer.loadBalancer.notificationsTopicArn ?? '',
  });
  // Logs
  parameters.push({
    ParameterKey: 'EnableApplicationLoadBalancerAccessLog',
    ParameterValue: pipeline.ingestionServer.loadBalancer.enableApplicationLoadBalancerAccessLog ? 'Yes' : 'No',
  });
  parameters.push({
    ParameterKey: 'LogS3Bucket',
    ParameterValue: pipeline.ingestionServer.loadBalancer.logS3Bucket?.name ?? '',
  });
  parameters.push({
    ParameterKey: 'LogS3Prefix',
    ParameterValue: pipeline.ingestionServer.loadBalancer.logS3Bucket?.prefix ?? '',
  });
  // S3 sink
  if (pipeline.ingestionServer.sinkType === 's3') {
    if (!pipeline.ingestionServer.sinkS3?.s3DataBucket.name) {
      return {
        result: false,
        message: 'S3 Sink must have s3DataBucket.',
        parameters,
      };
    }
    if (!pipeline.ingestionServer.sinkS3?.s3DataBucket.prefix) {
      return {
        result: false,
        message: 'S3 Sink must have s3DataPrefix.',
        parameters,
      };
    }
    parameters.push({
      ParameterKey: 'S3DataBucket',
      ParameterValue: pipeline.ingestionServer.sinkS3?.s3DataBucket.name,
    });
    parameters.push({
      ParameterKey: 'S3DataPrefix',
      ParameterValue: pipeline.ingestionServer.sinkS3?.s3DataBucket.prefix,
    });
    parameters.push({
      ParameterKey: 'S3BatchMaxBytes',
      ParameterValue: (pipeline.ingestionServer.sinkS3?.s3BatchMaxBytes?? 30000000).toString(),
    });
    parameters.push({
      ParameterKey: 'S3BatchTimeout',
      ParameterValue: (pipeline.ingestionServer.sinkS3?.s3BatchTimeout?? 300).toString(),
    });

  }
  // Kafka sink
  if (pipeline.ingestionServer.sinkType === 'kafka') {
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
  }
  // Kinesis sink
  if (pipeline.ingestionServer.sinkType === 'kinesis') {
    if (!pipeline.ingestionServer.sinkKinesis?.kinesisDataS3Bucket?.name) {
      return {
        result: false,
        message: 'Kinesis Sink must have kinesisDataS3Bucket.',
        parameters,
      };
    }
    if (!pipeline.ingestionServer.sinkKinesis?.kinesisDataS3Bucket.prefix) {
      return {
        result: false,
        message: 'Kinesis Sink must have kinesisDataS3Prefix.',
        parameters,
      };
    }
    parameters.push({
      ParameterKey: 'KinesisDataS3Bucket',
      ParameterValue: pipeline.ingestionServer.sinkKinesis?.kinesisDataS3Bucket.name,
    });
    parameters.push({
      ParameterKey: 'KinesisDataS3Prefix',
      ParameterValue: pipeline.ingestionServer.sinkKinesis?.kinesisDataS3Bucket.prefix,
    });
    parameters.push({
      ParameterKey: 'KinesisStreamMode',
      ParameterValue: pipeline.ingestionServer.sinkKinesis?.kinesisStreamMode ?? 'ON_DEMAND',
    });
    parameters.push({
      ParameterKey: 'KinesisShardCount',
      ParameterValue: (pipeline.ingestionServer.sinkKinesis?.kinesisShardCount ?? 3).toString(),
    });
    parameters.push({
      ParameterKey: 'KinesisDataRetentionHours',
      ParameterValue: (pipeline.ingestionServer.sinkKinesis?.kinesisDataRetentionHours ?? 24).toString(),
    });
    parameters.push({
      ParameterKey: 'KinesisBatchSize',
      ParameterValue: (pipeline.ingestionServer.sinkKinesis?.kinesisBatchSize ?? 10000).toString(),
    });
    parameters.push({
      ParameterKey: 'KinesisMaxBatchingWindowSeconds',
      ParameterValue: (pipeline.ingestionServer.sinkKinesis?.kinesisMaxBatchingWindowSeconds ?? 300).toString(),
    });
  }
  return {
    result: true,
    message: '',
    parameters,
  };
}
