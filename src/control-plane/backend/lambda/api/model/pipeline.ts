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

import { Parameter } from '@aws-sdk/client-cloudformation';
import { ExecutionStatus } from '@aws-sdk/client-sfn';
import { Plugin } from './plugin';
import { DOMAIN_NAME_PATTERN, KAFKA_BROKERS_PATTERN, KAFKA_TOPIC_PATTERN, SUBNETS_PATTERN, VPC_ID_PARRERN } from '../common/constants-ln';
import { validatePattern } from '../common/stack-params-valid';
import { ClickStreamBadRequestError, WorkflowTemplate } from '../common/types';
import { isEmpty, tryToJson } from '../common/utils';
import { listMSKClusterBrokers } from '../store/aws/kafka';

import { getRedshiftWorkgroupAndNamespace } from '../store/aws/redshift';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

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
  readonly sinkBucket: S3Bucket;
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
   * Kafka
   */
  readonly topic: string;
  readonly brokers: string[];
  /**
   * Amazon managed streaming for apache kafka (Amazon MSK) cluster
   */
  readonly mskCluster?: mskClusterProps;
  /**
   * Kafka Connector
   */
  readonly kafkaConnector?: KafkaS3Connector;
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
  readonly sinkBucket: S3Bucket;

}

interface IngestionServerDomainProps {
  /**
   * The custom domain name.
   */
  readonly domainName: string;
  /**
   * The ACM Certificate arn
   */
  readonly certificateArn: string;
}

interface NetworkProps {
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
  readonly size: IngestionServerSizeProps;
  readonly domain?: IngestionServerDomainProps;
  readonly loadBalancer: IngestionServerLoadBalancerProps;
  readonly sinkType: 's3' | 'kafka' | 'kinesis';
  readonly sinkS3?: IngestionServerSinkS3Props;
  readonly sinkKafka?: IngestionServerSinkKafkaProps;
  readonly sinkKinesis?: IngestionServerSinkKinesisProps;
}

export interface ETL {
  readonly dataFreshnessInHour: number;
  readonly scheduleExpression: string;
  readonly sourceS3Bucket: S3Bucket;
  readonly sinkS3Bucket: S3Bucket;
  readonly pipelineBucket: S3Bucket;
  readonly outputFormat?: 'parquet' | 'json';
  readonly transformPlugin?: string;
  readonly enrichPlugin?: string[];
}

export interface KafkaS3Connector {
  readonly sinkBucket: S3Bucket;
  readonly maxWorkerCount?: number;
  readonly minWorkerCount?: number;
  readonly workerMcuCount?: number;
  readonly pluginUrl: string;
  readonly rotateIntervalMS?: number;
  readonly flushSize?: number;
  readonly customConnectorConfiguration?: string;
}

export interface DataAnalytics {
  readonly ods?: {
    readonly bucket: S3Bucket;
    readonly fileSuffix: '.snappy' | '.parquet';
  };
  readonly redshift?: {
    readonly serverless?: {
      readonly workgroupName: string;
      readonly iamRoleArn: string;
    };
    readonly provisioned?: {};
  };
  readonly athena?: {};
  readonly loadWorkflow?: {
    readonly bucket?: S3Bucket;
    readonly scheduleInterval?: number;
    readonly maxFilesLimit?: number;
    readonly processingFilesLimit?: number;
  };
}

export interface Tag {
  [key: string]: string;
}

interface S3Bucket {
  readonly name: string;
  readonly prefix: string;
}

interface mskClusterProps {
  readonly name: string;
  readonly arn: string;
  readonly securityGroupId: string;
}

export interface Pipeline {
  readonly id: string;
  readonly type: string;
  readonly prefix: string;

  readonly projectId: string;
  readonly appIds: string[];
  readonly pipelineId: string;
  readonly name: string;
  readonly description: string;
  readonly region: string;
  readonly dataCollectionSDK: string;
  readonly tags: Tag[];

  readonly network: NetworkProps;
  readonly bucket: S3Bucket;
  readonly ingestionServer: IngestionServer;
  readonly etl?: ETL;
  readonly dataAnalytics?: DataAnalytics;
  readonly quickSightDataset?: any;

  status: ExecutionStatus | string;
  workflow?: WorkflowTemplate;
  executionName?: string;
  executionArn?: string;

  readonly version: string;
  readonly versionTag: string;
  readonly createAt: number;
  readonly updateAt: number;
  readonly operator: string;
  readonly deleted: boolean;
}

export interface PipelineList {
  totalCount: number | undefined;
  items: Pipeline[];
}

export function getBucketPrefix(pipeline: Pipeline, key: string, value: string | undefined): string {
  if (value === undefined || value === '' || value === '/') {
    const prefixs: Map<string, string> = new Map();
    prefixs.set('logs-alb', `clickstream/${pipeline.projectId}/${pipeline.pipelineId}/logs/alb/`);
    prefixs.set('logs-kafka-connector', `clickstream/${pipeline.projectId}/${pipeline.pipelineId}/logs/kafka-connector/`);
    prefixs.set('data-buffer', `clickstream/${pipeline.projectId}/${pipeline.pipelineId}/data/buffer/`);
    prefixs.set('data-ods', `clickstream/${pipeline.projectId}/${pipeline.pipelineId}/data/ods/`);
    prefixs.set('data-pipeline-temp', `clickstream/${pipeline.projectId}/${pipeline.pipelineId}/data/pipeline-temp/`);
    prefixs.set('kafka-connector-plugin', `clickstream/${pipeline.projectId}/${pipeline.pipelineId}/runtime/ingestion/kafka-connector/plugins/`);
    return prefixs.get(key) ?? '';
  }
  if (!value.endsWith('/')) {
    return `${value}/`;
  }
  return value;
}

export async function getIngestionStackParameters(pipeline: Pipeline) {

  const parameters: Parameter[] = [];
  // VPC Information
  validatePattern('VpcId', VPC_ID_PARRERN, pipeline.network.vpcId);
  parameters.push({
    ParameterKey: 'VpcId',
    ParameterValue: pipeline.network.vpcId,
  });
  validatePattern('PublicSubnetIds', SUBNETS_PATTERN, pipeline.network.publicSubnetIds.join(','));
  parameters.push({
    ParameterKey: 'PublicSubnetIds',
    ParameterValue: pipeline.network.publicSubnetIds.join(','),
  });
  validatePattern('PrivateSubnetIds', SUBNETS_PATTERN, pipeline.network.privateSubnetIds.join(','));
  parameters.push({
    ParameterKey: 'PrivateSubnetIds',
    ParameterValue: isEmpty(pipeline.network.privateSubnetIds) ?
      pipeline.network.publicSubnetIds.join(',') : pipeline.network.privateSubnetIds.join(','),
  });
  // Domain Information
  if (pipeline.ingestionServer.loadBalancer.protocol === 'HTTPS') {
    validatePattern('DomainName', DOMAIN_NAME_PATTERN, pipeline.ingestionServer.domain?.domainName);
    parameters.push({
      ParameterKey: 'DomainName',
      ParameterValue: pipeline.ingestionServer.domain?.domainName ?? '',
    });
    parameters.push({
      ParameterKey: 'ACMCertificateArn',
      ParameterValue: pipeline.ingestionServer.domain?.certificateArn ?? '',
    });
  }
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
    ParameterValue: pipeline.ingestionServer.loadBalancer.serverCorsOrigin ?? '',
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
    ParameterValue: pipeline.ingestionServer.loadBalancer.logS3Bucket?.name ?? pipeline.bucket.name,
  });
  parameters.push({
    ParameterKey: 'LogS3Prefix',
    ParameterValue: getBucketPrefix(pipeline, 'logs-alb', pipeline.ingestionServer.loadBalancer.logS3Bucket?.prefix),
  });

  // S3 sink
  if (pipeline.ingestionServer.sinkType === 's3') {
    parameters.push({
      ParameterKey: 'S3DataBucket',
      ParameterValue: pipeline.ingestionServer.sinkS3?.sinkBucket.name ?? pipeline.bucket.name,
    });
    parameters.push({
      ParameterKey: 'S3DataPrefix',
      ParameterValue: getBucketPrefix(pipeline, 'data-buffer', pipeline.ingestionServer.sinkS3?.sinkBucket.prefix),
    });
    parameters.push({
      ParameterKey: 'S3BatchMaxBytes',
      ParameterValue: (pipeline.ingestionServer.sinkS3?.s3BatchMaxBytes ?? 30000000).toString(),
    });
    parameters.push({
      ParameterKey: 'S3BatchTimeout',
      ParameterValue: (pipeline.ingestionServer.sinkS3?.s3BatchTimeout ?? 300).toString(),
    });

  }

  // Kafka sink
  if (pipeline.ingestionServer.sinkType === 'kafka') {
    if (!isEmpty(pipeline.ingestionServer.sinkKafka?.mskCluster)) { //MSK
      parameters.push({
        ParameterKey: 'MskClusterName',
        ParameterValue: pipeline.ingestionServer.sinkKafka?.mskCluster?.name ?? '',
      });
      parameters.push({
        ParameterKey: 'MskSecurityGroupId',
        ParameterValue: pipeline.ingestionServer.sinkKafka?.mskCluster?.securityGroupId,
      });
      validatePattern('KafkaTopic', KAFKA_TOPIC_PATTERN, pipeline.ingestionServer.sinkKafka?.topic ?? pipeline.projectId);
      parameters.push({
        ParameterKey: 'KafkaTopic',
        ParameterValue: pipeline.ingestionServer.sinkKafka?.topic ?? pipeline.projectId,
      });
      let kafkaBrokers = pipeline.ingestionServer.sinkKafka?.brokers;
      if (isEmpty(kafkaBrokers)) {
        kafkaBrokers = await listMSKClusterBrokers(pipeline.region, pipeline.ingestionServer.sinkKafka?.mskCluster?.arn);
      }
      validatePattern('KafkaBrokers', KAFKA_BROKERS_PATTERN, kafkaBrokers?.join(','));
      parameters.push({
        ParameterKey: 'KafkaBrokers',
        ParameterValue: kafkaBrokers?.join(','),
      });

    } else { //self hosted kafka culster
      validatePattern('KafkaBrokers', KAFKA_BROKERS_PATTERN, pipeline.ingestionServer.sinkKafka?.brokers?.join(','));
      parameters.push({
        ParameterKey: 'KafkaBrokers',
        ParameterValue: pipeline.ingestionServer.sinkKafka?.brokers?.join(','),
      });
      validatePattern('KafkaTopic', KAFKA_TOPIC_PATTERN, pipeline.ingestionServer.sinkKafka?.topic ?? pipeline.projectId);
      parameters.push({
        ParameterKey: 'KafkaTopic',
        ParameterValue: pipeline.ingestionServer.sinkKafka?.topic ?? pipeline.projectId,
      });
    }

  }
  // Kinesis sink
  if (pipeline.ingestionServer.sinkType === 'kinesis') {
    parameters.push({
      ParameterKey: 'KinesisDataS3Bucket',
      ParameterValue: pipeline.ingestionServer.sinkKinesis?.sinkBucket.name ?? pipeline.bucket.name,
    });
    parameters.push({
      ParameterKey: 'KinesisDataS3Prefix',
      ParameterValue: getBucketPrefix(pipeline, 'data-buffer', pipeline.ingestionServer.sinkKinesis?.sinkBucket.prefix),
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
  return parameters;
}

export async function getKafkaConnectorStackParameters(pipeline: Pipeline) {
  const parameters: Parameter[] = [];

  parameters.push({
    ParameterKey: 'DataS3Bucket',
    ParameterValue: pipeline.ingestionServer.sinkKafka?.kafkaConnector?.sinkBucket?.name ?? pipeline.bucket.name,
  });
  parameters.push({
    ParameterKey: 'DataS3Prefix',
    ParameterValue: getBucketPrefix(pipeline, 'data-buffer', pipeline.ingestionServer.sinkKafka?.kafkaConnector?.sinkBucket?.prefix),
  });

  parameters.push({
    ParameterKey: 'LogS3Bucket',
    ParameterValue: pipeline.bucket.name,
  });
  parameters.push({
    ParameterKey: 'LogS3Prefix',
    ParameterValue: getBucketPrefix(pipeline, 'logs-kafka-connector', ''),
  });

  parameters.push({
    ParameterKey: 'PluginS3Bucket',
    ParameterValue: pipeline.bucket.name,
  });
  parameters.push({
    ParameterKey: 'PluginS3Prefix',
    ParameterValue: getBucketPrefix(pipeline, 'kafka-connector-plugin', ''),
  });

  parameters.push({
    ParameterKey: 'SubnetIds',
    ParameterValue: pipeline.network.privateSubnetIds.join(','),
  });

  let kafkaBrokers = pipeline.ingestionServer.sinkKafka?.brokers;
  if (isEmpty(kafkaBrokers)) {
    kafkaBrokers = await listMSKClusterBrokers(pipeline.region, pipeline.ingestionServer.sinkKafka?.mskCluster?.arn);
  }
  validatePattern('KafkaBrokers', KAFKA_BROKERS_PATTERN, kafkaBrokers?.join(','));
  parameters.push({
    ParameterKey: 'KafkaBrokers',
    ParameterValue: kafkaBrokers?.join(','),
  });
  validatePattern('KafkaTopic', KAFKA_TOPIC_PATTERN, pipeline.ingestionServer.sinkKafka?.topic ?? pipeline.projectId);
  parameters.push({
    ParameterKey: 'KafkaTopic',
    ParameterValue: pipeline.ingestionServer.sinkKafka?.topic ?? pipeline.projectId,
  });

  parameters.push({
    ParameterKey: 'MskClusterName',
    ParameterValue: pipeline.ingestionServer.sinkKafka?.mskCluster?.name,
  });
  parameters.push({
    ParameterKey: 'SecurityGroupId',
    ParameterValue: pipeline.ingestionServer.sinkKafka?.mskCluster?.securityGroupId,
  });

  if (pipeline.ingestionServer.sinkKafka?.kafkaConnector?.maxWorkerCount !== undefined) {
    parameters.push({
      ParameterKey: 'MaxWorkerCount',
      ParameterValue: pipeline.ingestionServer.sinkKafka?.kafkaConnector?.maxWorkerCount?.toString(),
    });
  }

  if (pipeline.ingestionServer.sinkKafka?.kafkaConnector?.minWorkerCount !== undefined) {
    parameters.push({
      ParameterKey: 'MinWorkerCount',
      ParameterValue: pipeline.ingestionServer.sinkKafka?.kafkaConnector?.minWorkerCount?.toString(),
    });
  }

  if (pipeline.ingestionServer.sinkKafka?.kafkaConnector?.workerMcuCount !== undefined) {
    parameters.push({
      ParameterKey: 'WorkerMcuCount',
      ParameterValue: pipeline.ingestionServer.sinkKafka?.kafkaConnector?.workerMcuCount?.toString(),
    });
  }

  if (pipeline.ingestionServer.sinkKafka?.kafkaConnector?.pluginUrl !== undefined) {
    parameters.push({
      ParameterKey: 'PluginUrl',
      ParameterValue: pipeline.ingestionServer.sinkKafka?.kafkaConnector.pluginUrl,
    });
  }

  if (pipeline.ingestionServer.sinkKafka?.kafkaConnector?.rotateIntervalMS !== undefined) {
    parameters.push({
      ParameterKey: 'RotateIntervalMS',
      ParameterValue: pipeline.ingestionServer.sinkKafka?.kafkaConnector.rotateIntervalMS.toString(),
    });
  }

  if (pipeline.ingestionServer.sinkKafka?.kafkaConnector?.flushSize !== undefined) {
    parameters.push({
      ParameterKey: 'FlushSize',
      ParameterValue: pipeline.ingestionServer.sinkKafka?.kafkaConnector.flushSize.toString(),
    });
  }

  if (pipeline.ingestionServer.sinkKafka?.kafkaConnector?.customConnectorConfiguration !== undefined) {
    parameters.push({
      ParameterKey: 'CustomConnectorConfiguration',
      ParameterValue: pipeline.ingestionServer.sinkKafka?.kafkaConnector.customConnectorConfiguration,
    });
  }

  return parameters;
}

export async function getETLPipelineStackParameters(pipeline: Pipeline) {

  const store: ClickStreamStore = new DynamoDbStore();
  const apps = await store.listApplication('asc', pipeline.projectId, false, 1, 1);
  const appIds: string[] = apps.items.map(a => a.appId);
  const buildInPluginsDic = await store.getDictionary('BuildInPlugins');
  if (!buildInPluginsDic) {
    throw new Error('Dictionary: BuildInPlugins is no found.');
  }

  const parameters: Parameter[] = [];

  validatePattern('VpcId', VPC_ID_PARRERN, pipeline.network.vpcId);
  parameters.push({
    ParameterKey: 'VpcId',
    ParameterValue: pipeline.network.vpcId,
  });

  validatePattern('PrivateSubnetIds', SUBNETS_PATTERN, pipeline.network.privateSubnetIds.join(','));
  parameters.push({
    ParameterKey: 'PrivateSubnetIds',
    ParameterValue: pipeline.network.privateSubnetIds.join(','),
  });

  parameters.push({
    ParameterKey: 'ProjectId',
    ParameterValue: pipeline.projectId,
  });

  parameters.push({
    ParameterKey: 'AppIds',
    ParameterValue: appIds.join(','),
  });

  parameters.push({
    ParameterKey: 'SourceS3Bucket',
    ParameterValue: pipeline.etl?.sourceS3Bucket.name ?? pipeline.bucket.name,
  });
  parameters.push({
    ParameterKey: 'SourceS3Prefix',
    ParameterValue: getBucketPrefix(pipeline, 'data-buffer', pipeline.etl?.sourceS3Bucket.prefix),
  });

  parameters.push({
    ParameterKey: 'SinkS3Bucket',
    ParameterValue: pipeline.etl?.sinkS3Bucket.name ?? pipeline.bucket.name,
  });
  parameters.push({
    ParameterKey: 'SinkS3Prefix',
    ParameterValue: getBucketPrefix(pipeline, 'data-ods', pipeline.etl?.sinkS3Bucket.prefix),
  });

  parameters.push({
    ParameterKey: 'PipelineS3Bucket',
    ParameterValue: pipeline.etl?.pipelineBucket.name ?? pipeline.bucket.name,
  });
  parameters.push({
    ParameterKey: 'PipelineS3Prefix',
    ParameterValue: getBucketPrefix(pipeline, 'data-pipeline-temp', pipeline.etl?.pipelineBucket.prefix),
  });

  parameters.push({
    ParameterKey: 'DataFreshnessInHour',
    ParameterValue: (pipeline.etl?.dataFreshnessInHour ?? 72).toString(),
  });

  parameters.push({
    ParameterKey: 'ScheduleExpression',
    ParameterValue: pipeline.etl?.scheduleExpression,
  });

  let buildInPlugins = tryToJson(buildInPluginsDic.data) as Plugin[];
  const defaultTransformer = buildInPlugins.filter(p => p.name === 'Transformer')[0];
  const transformPlugin = [!isEmpty(pipeline.etl?.transformPlugin)? pipeline.etl?.transformPlugin : defaultTransformer.mainFunction];
  const transformerAndEnrichClassNames = transformPlugin.concat(pipeline.etl?.enrichPlugin?? []).join(',');

  parameters.push({
    ParameterKey: 'TransformerAndEnrichClassNames',
    ParameterValue: transformerAndEnrichClassNames,
  });

  parameters.push({
    ParameterKey: 'OutputFormat',
    ParameterValue: pipeline.etl?.outputFormat ?? 'parquet',
  });


  return parameters;
}

export async function getDataAnalyticsStackParameters(pipeline: Pipeline) {
  const store: ClickStreamStore = new DynamoDbStore();
  const apps = await store.listApplication('asc', pipeline.projectId, false, 1, 1);
  const appIds: string[] = apps.items.map(a => a.appId);
  if (!pipeline.dataAnalytics?.redshift?.serverless?.workgroupName) {
    throw new ClickStreamBadRequestError('Validate error, workgroupName cannot be undefined. Please check and try again.');
  }
  const workgroup = await getRedshiftWorkgroupAndNamespace(pipeline.region, pipeline.dataAnalytics?.redshift?.serverless?.workgroupName);
  if (!workgroup) {
    throw new ClickStreamBadRequestError('Workgroup no found. Please check and try again.');
  }

  const parameters: Parameter[] = [];

  validatePattern('VpcId', VPC_ID_PARRERN, pipeline.network.vpcId);
  parameters.push({
    ParameterKey: 'VpcId',
    ParameterValue: pipeline.network.vpcId,
  });

  validatePattern('PrivateSubnetIds', SUBNETS_PATTERN, pipeline.network.privateSubnetIds.join(','));
  parameters.push({
    ParameterKey: 'PrivateSubnetIds',
    ParameterValue: pipeline.network.privateSubnetIds.join(','),
  });

  parameters.push({
    ParameterKey: 'ProjectId',
    ParameterValue: pipeline.projectId,
  });

  parameters.push({
    ParameterKey: 'AppIds',
    ParameterValue: appIds.join(','),
  });

  parameters.push({
    ParameterKey: 'ODSEventBucket',
    ParameterValue: pipeline.dataAnalytics?.ods?.bucket.name ?? pipeline.bucket.name,
  });
  parameters.push({
    ParameterKey: 'ODSEventPrefix',
    ParameterValue: getBucketPrefix(pipeline, 'data-ods', pipeline.dataAnalytics?.ods?.bucket.prefix),
  });
  parameters.push({
    ParameterKey: 'ODSEventFileSuffix',
    ParameterValue: pipeline.dataAnalytics?.ods?.fileSuffix ?? '.snappy',
  });

  parameters.push({
    ParameterKey: 'LoadWorkflowBucket',
    ParameterValue: pipeline.dataAnalytics?.loadWorkflow?.bucket?.name ?? pipeline.bucket.name,
  });
  parameters.push({
    ParameterKey: 'LoadWorkflowBucketPrefix',
    ParameterValue: getBucketPrefix(pipeline, 'data-ods', pipeline.dataAnalytics?.loadWorkflow?.bucket?.prefix),
  });
  parameters.push({
    ParameterKey: 'MaxFilesLimit',
    ParameterValue: (pipeline.dataAnalytics?.loadWorkflow?.maxFilesLimit ?? 50).toString(),
  });
  parameters.push({
    ParameterKey: 'ProcessingFilesLimit',
    ParameterValue: (pipeline.dataAnalytics?.loadWorkflow?.processingFilesLimit ?? 100).toString(),
  });

  parameters.push({
    ParameterKey: 'RedshiftServerlessNamespaceId',
    ParameterValue: workgroup.namespaceId,
  });

  parameters.push({
    ParameterKey: 'RedshiftServerlessWorkgroupId',
    ParameterValue: workgroup.workgroupId,
  });

  parameters.push({
    ParameterKey: 'RedshiftServerlessWorkgroupName',
    ParameterValue: pipeline.dataAnalytics?.redshift?.serverless?.workgroupName,
  });

  parameters.push({
    ParameterKey: 'RedshiftServerlessIAMRole',
    ParameterValue: pipeline.dataAnalytics?.redshift?.serverless?.iamRoleArn,
  });

  return parameters;
}
