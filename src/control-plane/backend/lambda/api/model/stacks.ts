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

import {
  CORS_PATTERN,
  DOMAIN_NAME_PATTERN,
  KAFKA_BROKERS_PATTERN,
  KAFKA_TOPIC_PATTERN,
  MULTI_EMAIL_PATTERN,
  MULTI_SECURITY_GROUP_PATTERN,
  OUTPUT_DATA_MODELING_REDSHIFT_BI_USER_CREDENTIAL_PARAMETER_SUFFIX,
  OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_ENDPOINT_ADDRESS,
  OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_ENDPOINT_PORT,
  OUTPUT_DATA_PROCESSING_EMR_SERVERLESS_APPLICATION_ID_SUFFIX,
  OUTPUT_DATA_PROCESSING_GLUE_DATABASE_SUFFIX,
  OUTPUT_DATA_PROCESSING_GLUE_EVENT_TABLE_SUFFIX,
  QUICKSIGHT_NAMESPACE_PATTERN,
  QUICKSIGHT_USER_NAME_PATTERN,
  REDSHIFT_CLUSTER_IDENTIFIER_PATTERN,
  REDSHIFT_DB_USER_NAME_PATTERN,
  S3_PATH_PLUGIN_FILES_PATTERN,
  S3_PATH_PLUGIN_JARS_PATTERN,
  S3_PREFIX_PATTERN,
  SCHEDULE_EXPRESSION_PATTERN,
  SECURITY_GROUP_PATTERN,
  SUBNETS_PATTERN,
  SUBNETS_THREE_AZ_PATTERN,
  TRANSFORMER_AND_ENRICH_CLASS_NAMES,
  VPC_ID_PATTERN,
} from '@aws/clickstream-base-lib';
import { Parameter } from '@aws-sdk/client-cloudformation';
import { JSONObject } from 'ts-json-object';
import { CPipelineResources, IPipeline } from './pipeline';
import { analyticsMetadataTable, awsAccountId, awsRegion, clickStreamTableName } from '../common/constants';
import { PipelineStackType, REDSHIFT_MODE } from '../common/model-ln';
import { isSupportVersion } from '../common/parameter-reflect';
import {
  validateDataProcessingInterval,
  validatePattern,
  validateServerlessRedshiftRPU,
  validateSinkBatch,
} from '../common/stack-params-valid';
import {
  BucketPrefix,
  ClickStreamBadRequestError,
  DataCollectionSDK,
  ENetworkType,
  IngestionType,
  KinesisStreamMode,
  MetricsLegendPosition,
  PipelineServerProtocol,
  PipelineSinkType,
  ProjectEnvironment,
} from '../common/types';
import {
  corsStackInput,
  getAppRegistryApplicationArn,
  getBucketPrefix,
  getIamRoleBoundaryArn,
  getKafkaTopic,
  getPluginInfo,
  getSinkType,
  getValueFromStackOutputSuffix,
  isEmail,
  isEmpty,
} from '../common/utils';

export function getStackParameters(stack: JSONObject, version: string): Parameter[] {
  const parameters: Parameter[] = [];
  Object.entries(stack).forEach(([k, v]) => {
    if (isSupportVersion(stack, k, version) && !k.startsWith('_') && v !== undefined) {
      let key = k;
      if (v && typeof v === 'string' && v.startsWith('#.')) {
        key = `${k}.#`;
      }
      if (v && typeof v === 'string' && v.startsWith('$.')) {
        key = `${k}.$`;
      }
      parameters.push({
        ParameterKey: key,
        ParameterValue: v || v===0 ? v.toString() : '',
      });
    }
  });
  return parameters;
}

export class CIngestionServerStack extends JSONObject {

  public static editAllowedList(): string[] {
    const allowedList:string[] = [
      'ServerEndpointPath',
      'ServerCorsOrigin',
      'ServerMax',
      'ServerMin',
      'WarmPoolSize',
      'ScaleOnCpuUtilizationPercent',
      'NotificationsTopicArn',
      'LogS3Bucket',
      'LogS3Prefix',
      'S3DataBucket',
      'S3DataPrefix',
      'S3BatchMaxBytes',
      'S3BatchTimeout',
      'WorkerStopTimeout',
      'MskClusterName',
      'MskSecurityGroupId',
      'KafkaTopic',
      'KafkaBrokers',
      'KinesisShardCount',
      'KinesisDataRetentionHours',
      'KinesisBatchSize',
      'KinesisMaxBatchingWindowSeconds',
      'KinesisDataS3Bucket',
      'KinesisDataS3Prefix',
      'DomainName',
      'ACMCertificateArn',
      'EnableGlobalAccelerator',
      'EnableAuthentication',
      'AuthenticationSecretArn',
      'EnableApplicationLoadBalancerAccessLog',
      'Protocol',
      'SinkType',
    ];
    return allowedList;
  }

  @JSONObject.required
    _pipeline?: IPipeline;

  @JSONObject.required
    _resources?: CPipelineResources;

  @JSONObject.optional('No')
  @JSONObject.custom( (stack :CIngestionServerStack, _key:string, _value:any) => {
    return stack._resources?.project?.environment == ProjectEnvironment.DEV ? 'Yes' : 'No';
  })
    DevMode?: string;

  @JSONObject.optional('No')
  @JSONObject.custom( (stack :CIngestionServerStack, _key:string, _value:any) => {
    return stack._pipeline?.dataCollectionSDK == DataCollectionSDK.CLICKSTREAM ? 'Yes' : 'No';
  })
    ClickStreamSDK?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CIngestionServerStack, _key:string, _value:any) => {
    return stack._pipeline?.projectId;
  })
    ProjectId?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CIngestionServerStack, _key:string, _value:any) => {
    return stack._resources?.appIds?.join(',');
  })
    AppIds?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CIngestionServerStack, key:string, _value:any) => {
    const defaultValue = stack._pipeline?.network.vpcId;
    validatePattern(key, VPC_ID_PATTERN, defaultValue);
    return defaultValue;
  })
    VpcId?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CIngestionServerStack, key:string, _value:any) => {
    let defaultValue = stack._pipeline?.network.publicSubnetIds.join(',');
    if (stack._pipeline?.network.type === ENetworkType.Private) {
      defaultValue = stack._pipeline?.network.privateSubnetIds.join(',');
    }
    validatePattern(key, SUBNETS_PATTERN, defaultValue);
    return defaultValue;
  })
    PublicSubnetIds?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CIngestionServerStack, key:string, _value:any) => {
    let defaultValue = stack._pipeline?.network.privateSubnetIds.join(',');
    if (isEmpty(defaultValue)) {
      defaultValue = stack._pipeline?.network.publicSubnetIds.join(',');
    }
    validatePattern(key, SUBNETS_PATTERN, defaultValue);
    return defaultValue;
  })
    PrivateSubnetIds?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CIngestionServerStack, _key:string, _value:any) => {
    return stack._pipeline?.ingestionServer.loadBalancer.protocol;
  })
    Protocol?: PipelineServerProtocol;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CIngestionServerStack, key:string, _value:string) => {
    const defaultValue = stack._pipeline?.ingestionServer.domain?.domainName;
    if (stack.Protocol == PipelineServerProtocol.HTTPS) {
      validatePattern(key, DOMAIN_NAME_PATTERN, defaultValue);
    }
    return stack.Protocol == PipelineServerProtocol.HTTPS ? defaultValue : '';
  })
    DomainName?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, _value:string) => {
    return stack._pipeline?.ingestionServer.domain?.certificateArn ?? '';
  })
    ACMCertificateArn?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, _value:string) => {
    return stack._pipeline?.ingestionServer.loadBalancer.serverEndpointPath;
  })
    ServerEndpointPath?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CIngestionServerStack, key:string, _value:string) => {
    const defaultValue = stack._pipeline?.ingestionServer.loadBalancer.serverCorsOrigin;
    if (!isEmpty(defaultValue)) {
      validatePattern(key, CORS_PATTERN, defaultValue);
      return corsStackInput(defaultValue ?? '');
    }
    return defaultValue;
  })
    ServerCorsOrigin?: string;

  @JSONObject.optional(0)
  @JSONObject.gt(0)
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, _value:string) => {
    const defaultValue = stack._pipeline?.ingestionServer.size.serverMax ?? 0;
    if (defaultValue <= 1) {
      throw new ClickStreamBadRequestError('ServerMax must be greater than 1.');
    }
    return defaultValue;
  })
    ServerMax?: number;

  @JSONObject.optional(0)
  @JSONObject.gt(0)
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, _value:string) => {
    const defaultValue = stack._pipeline?.ingestionServer.size.serverMin ?? 0;
    if (stack.ServerMax && stack.ServerMax < defaultValue) {
      throw new ClickStreamBadRequestError('ServerMax must greater than or equal ServerMin.');
    }
    return defaultValue;
  })
    ServerMin?: number;

  @JSONObject.optional(0)
  @JSONObject.gte(0)
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, _value:string) => {
    return stack._pipeline?.ingestionServer.size.warmPoolSize ?? 0;
  })
    WarmPoolSize?: number;

  @JSONObject.optional(50)
  @JSONObject.gte(0)
  @JSONObject.lte(100)
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, _value:string) => {
    return stack._pipeline?.ingestionServer.size.scaleOnCpuUtilizationPercent ?? 50;
  })
    ScaleOnCpuUtilizationPercent?: number;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, _value:string) => {
    return stack._pipeline?.ingestionServer.loadBalancer.notificationsTopicArn ?? '';
  })
    NotificationsTopicArn?: string;

  @JSONObject.optional('No')
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, _value:string) => {
    return stack._pipeline?.ingestionServer.loadBalancer.enableGlobalAccelerator ? 'Yes' : 'No';
  })
    EnableGlobalAccelerator?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, _value:string) => {
    return stack._pipeline?.ingestionServer.loadBalancer.authenticationSecretArn ?? '';
  })
    AuthenticationSecretArn?: string;

  @JSONObject.optional('No')
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, _value:string) => {
    return stack._pipeline?.ingestionServer.loadBalancer.authenticationSecretArn ? 'Yes' : 'No';
  })
    EnableAuthentication?: string;

  @JSONObject.optional('No')
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, _value:string) => {
    return stack._pipeline?.ingestionServer.loadBalancer.enableApplicationLoadBalancerAccessLog ? 'Yes' : 'No';
  })
    EnableApplicationLoadBalancerAccessLog?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, _value:string) => {
    return stack._pipeline?.ingestionServer.loadBalancer.logS3Bucket?.name ?? stack._pipeline?.bucket.name;
  })
    LogS3Bucket?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CIngestionServerStack, key:string, _value:string) => {
    const defaultValue = getBucketPrefix(
      stack._pipeline?.projectId ?? '',
      BucketPrefix.LOGS_ALB,
      stack._pipeline?.ingestionServer.loadBalancer.logS3Bucket?.prefix,
    );
    validatePattern(key, S3_PREFIX_PATTERN, defaultValue);
    return defaultValue;
  })
    LogS3Prefix?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, _value:string) => {
    if (stack._pipeline?.ingestionServer.sinkType !== PipelineSinkType.S3) {
      return undefined;
    }
    return stack._pipeline?.ingestionServer.sinkS3?.sinkBucket.name ?? stack._pipeline?.bucket.name;
  })
    S3DataBucket?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CIngestionServerStack, key:string, _value:string) => {
    if (stack._pipeline?.ingestionServer.sinkType !== PipelineSinkType.S3) {
      return undefined;
    }
    const defaultValue = getBucketPrefix(
      stack._pipeline?.projectId ?? '',
      BucketPrefix.DATA_BUFFER,
      stack._pipeline?.ingestionServer.sinkS3?.sinkBucket.prefix);
    validatePattern(key, S3_PREFIX_PATTERN, defaultValue);
    return defaultValue;
  })
    S3DataPrefix?: string;

  @JSONObject.optional(30000000)
  @JSONObject.gte(1000000)
  @JSONObject.lte(50000000)
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, _value:string) => {
    if (stack._pipeline?.ingestionServer.sinkType !== PipelineSinkType.S3) {
      return undefined;
    }
    const defaultValue = stack._pipeline?.ingestionServer.sinkS3?.s3BufferSize ?? 30;
    return defaultValue * 1000 * 1000;
  })
    S3BatchMaxBytes?: number;

  @JSONObject.optional(300)
  @JSONObject.gte(30)
  @JSONObject.lte(1800)
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, _value:string) => {
    if (stack._pipeline?.ingestionServer.sinkType !== PipelineSinkType.S3) {
      return undefined;
    }
    return stack._pipeline?.ingestionServer.sinkS3?.s3BufferInterval ?? 300;
  })
    S3BatchTimeout?: number;

  @JSONObject.optional(330)
  @JSONObject.gte(60)
  @JSONObject.lte(1830)
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, _value:string) => {
    if (stack._pipeline?.ingestionServer.ingestionType === IngestionType.Fargate) {
      return 120;
    } else if (stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.S3) {
      return stack.S3BatchTimeout ? stack.S3BatchTimeout + 30 : 330;
    }
    return undefined;
  })
    WorkerStopTimeout?: number;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, _value:string) => {
    if (stack._pipeline?.ingestionServer.sinkType !== PipelineSinkType.KAFKA) {
      return undefined;
    }
    return stack._pipeline?.ingestionServer.sinkKafka?.mskCluster?.name ?? '';
  })
    MskClusterName?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CIngestionServerStack, key:string, _value:string) => {
    if (stack._pipeline?.ingestionServer.sinkType !== PipelineSinkType.KAFKA) {
      return undefined;
    }
    const defaultValue = stack._pipeline?.ingestionServer.sinkKafka?.securityGroupId;
    validatePattern(key, MULTI_SECURITY_GROUP_PATTERN, defaultValue);
    return defaultValue;
  })
    MskSecurityGroupId?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CIngestionServerStack, key:string, _value:string) => {
    if (stack._pipeline?.ingestionServer.sinkType !== PipelineSinkType.KAFKA) {
      return undefined;
    }
    const defaultValue = getKafkaTopic(stack._pipeline);
    validatePattern(key, KAFKA_TOPIC_PATTERN, defaultValue);
    return defaultValue;
  })
    KafkaTopic?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CIngestionServerStack, key:string, _value:string) => {
    if (stack._pipeline?.ingestionServer.sinkType !== PipelineSinkType.KAFKA) {
      return undefined;
    }
    let defaultValue = stack._pipeline?.ingestionServer.sinkKafka?.brokers.join(',');
    if (stack._pipeline.ingestionServer.sinkKafka?.mskCluster?.arn) {
      defaultValue = stack._resources?.mskBrokers?.join(',') ?? '';
    }
    validatePattern(key, KAFKA_BROKERS_PATTERN, defaultValue);
    return defaultValue;
  })
    KafkaBrokers?: string;

  @JSONObject.optional(KinesisStreamMode.ON_DEMAND)
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, _value:string) => {
    if (stack._pipeline?.ingestionServer.sinkType !== PipelineSinkType.KINESIS) {
      return undefined;
    }
    return stack._pipeline?.ingestionServer.sinkKinesis?.kinesisStreamMode ?? KinesisStreamMode.ON_DEMAND;
  })
    KinesisStreamMode?: KinesisStreamMode;

  @JSONObject.optional(3)
  @JSONObject.gte(1)
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, _value:string) => {
    if (stack._pipeline?.ingestionServer.sinkType !== PipelineSinkType.KINESIS) {
      return undefined;
    }
    return stack._pipeline?.ingestionServer.sinkKinesis?.kinesisShardCount ?? 3;
  })
    KinesisShardCount?: number;

  @JSONObject.optional(24)
  @JSONObject.gte(24)
  @JSONObject.lte(8760)
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, _value:string) => {
    if (stack._pipeline?.ingestionServer.sinkType !== PipelineSinkType.KINESIS) {
      return undefined;
    }
    return stack._pipeline?.ingestionServer.sinkKinesis?.kinesisDataRetentionHours ?? 24;
  })
    KinesisDataRetentionHours?: number;

  @JSONObject.optional(10000)
  @JSONObject.gte(1)
  @JSONObject.lte(10000)
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, _value:string) => {
    if (stack._pipeline?.ingestionServer.sinkType !== PipelineSinkType.KINESIS) {
      return undefined;
    }
    return stack._pipeline?.ingestionServer.sinkBatch?.size ?? 10000;
  })
    KinesisBatchSize?: number;

  @JSONObject.optional(300)
  @JSONObject.gte(0)
  @JSONObject.lte(300)
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, _value:string) => {
    if (stack._pipeline?.ingestionServer.sinkType !== PipelineSinkType.KINESIS) {
      return undefined;
    }
    return stack._pipeline?.ingestionServer.sinkBatch?.intervalSeconds ?? 300;
  })
    KinesisMaxBatchingWindowSeconds?: number;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, _value:string) => {
    if (stack._pipeline?.ingestionServer.sinkType !== PipelineSinkType.KINESIS) {
      return undefined;
    }
    return stack._pipeline?.ingestionServer.sinkKinesis?.sinkBucket.name ?? stack._pipeline?.bucket.name;
  })
    KinesisDataS3Bucket?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CIngestionServerStack, key:string, _value:string) => {
    if (stack._pipeline?.ingestionServer.sinkType !== PipelineSinkType.KINESIS) {
      return undefined;
    }
    const defaultValue = getBucketPrefix(
      stack._pipeline?.projectId ?? '',
      BucketPrefix.DATA_BUFFER,
      stack._pipeline?.ingestionServer.sinkKinesis?.sinkBucket.prefix,
    );
    validatePattern(key, S3_PREFIX_PATTERN, defaultValue);
    return defaultValue;
  })
    KinesisDataS3Prefix?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, _value:string) => {
    return getSinkType(stack._pipeline!);
  })
    SinkType?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, _value:string) => {
    return getAppRegistryApplicationArn(stack._pipeline);
  })
    AppRegistryApplicationArn?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (_stack:CIngestionServerStack, _key:string, _value:string) => {
    return getIamRoleBoundaryArn();
  })
    IamRoleBoundaryArn?: string;

  constructor(pipeline: IPipeline, resources: CPipelineResources) {
    if (pipeline.ingestionServer.sinkBatch) {
      validateSinkBatch(pipeline.ingestionServer.sinkType, pipeline.ingestionServer.sinkBatch);
    }
    if (pipeline.ingestionServer.sinkType == PipelineSinkType.KINESIS &&
      !pipeline.ingestionServer.sinkKinesis?.kinesisStreamMode
    ) {
      throw new ClickStreamBadRequestError('KinesisStreamMode required for ingestion server.');
    }

    super({
      _pipeline: pipeline,
      _resources: resources,
    });
  }
}

export class CKafkaConnectorStack extends JSONObject {

  public static editAllowedList(): string[] {
    const allowedList:string[] = [
      'DataS3Bucket',
      'DataS3Prefix',
      'LogS3Bucket',
      'LogS3Prefix',
      'PluginS3Bucket',
      'PluginS3Prefix',
      'SecurityGroupId',
      'MaxWorkerCount',
      'MinWorkerCount',
      'WorkerMcuCount',
      'RotateIntervalMS',
      'FlushSize',
    ];
    return allowedList;
  }

  @JSONObject.required
    _pipeline?: IPipeline;

  @JSONObject.required
    _resources?: CPipelineResources;


  @JSONObject.optional('')
  @JSONObject.custom( (stack :CKafkaConnectorStack, _key:string, _value:any) => {
    return stack._pipeline?.projectId;
  })
    ProjectId?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CKafkaConnectorStack, _key:string, _value:any) => {
    return stack._pipeline?.ingestionServer.sinkKafka?.kafkaConnector.sinkBucket?.name ?? stack._pipeline?.bucket.name;
  })
    DataS3Bucket?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CKafkaConnectorStack, key:string, _value:any) => {
    const defaultValue = getBucketPrefix(
      stack._pipeline?.projectId ?? '',
      BucketPrefix.DATA_BUFFER,
      stack._pipeline?.ingestionServer.sinkKafka?.kafkaConnector.sinkBucket?.prefix);
    validatePattern(key, S3_PREFIX_PATTERN, defaultValue);
    return defaultValue;
  })
    DataS3Prefix?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CKafkaConnectorStack, _key:string, _value:any) => {
    return stack._pipeline?.bucket.name;
  })
    LogS3Bucket?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CKafkaConnectorStack, key:string, _value:any) => {
    const defaultValue = getBucketPrefix(
      stack._pipeline?.projectId ?? '',
      BucketPrefix.LOGS_KAFKA_CONNECTOR,
      '');
    validatePattern(key, S3_PREFIX_PATTERN, defaultValue);
    return defaultValue;
  })
    LogS3Prefix?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CKafkaConnectorStack, _key:string, _value:any) => {
    return stack._pipeline?.bucket.name;
  })
    PluginS3Bucket?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CKafkaConnectorStack, key:string, _value:any) => {
    const defaultValue = getBucketPrefix(
      stack._pipeline?.projectId ?? '',
      BucketPrefix.KAFKA_CONNECTOR_PLUGIN,
      '');
    validatePattern(key, S3_PREFIX_PATTERN, defaultValue);
    return defaultValue;
  })
    PluginS3Prefix?: string;


  @JSONObject.optional('')
  @JSONObject.custom( (stack :CKafkaConnectorStack, key:string, _value:any) => {
    const defaultValue = stack._pipeline?.network.privateSubnetIds.join(',');
    validatePattern(key, SUBNETS_PATTERN, defaultValue);
    return defaultValue;
  })
    SubnetIds?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CKafkaConnectorStack, key:string, _value:any) => {
    const defaultValue = stack._pipeline?.ingestionServer.sinkKafka?.securityGroupId;
    validatePattern(key, SECURITY_GROUP_PATTERN, defaultValue);
    return defaultValue;
  })
    SecurityGroupId?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CKafkaConnectorStack, key:string, _value:string) => {
    if (stack._pipeline?.ingestionServer.sinkType !== PipelineSinkType.KAFKA) {
      return '';
    }
    let defaultValue = stack._pipeline?.ingestionServer.sinkKafka?.brokers.join(',');
    if (stack._pipeline.ingestionServer.sinkKafka?.mskCluster?.arn) {
      defaultValue = stack._resources?.mskBrokers?.join(',') ?? '';
    }
    validatePattern(key, KAFKA_BROKERS_PATTERN, defaultValue);
    return defaultValue;
  })
    KafkaBrokers?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CKafkaConnectorStack, key:string, _value:string) => {
    if (stack._pipeline?.ingestionServer.sinkType !== PipelineSinkType.KAFKA) {
      return '';
    }
    const defaultValue = getKafkaTopic(stack._pipeline);
    validatePattern(key, KAFKA_TOPIC_PATTERN, defaultValue);
    return defaultValue;
  })
    KafkaTopic?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CKafkaConnectorStack, _key:string, _value:any) => {
    return stack._pipeline?.ingestionServer.sinkKafka?.mskCluster?.name ?? '';
  })
    MskClusterName?: string;

  @JSONObject.optional(3)
  @JSONObject.gte(1)
  @JSONObject.custom( (stack :CKafkaConnectorStack, _key:string, _value:any) => {
    return stack._pipeline?.ingestionServer.sinkKafka?.kafkaConnector.maxWorkerCount ?? 3;
  })
    MaxWorkerCount?: number;

  @JSONObject.optional(1)
  @JSONObject.gte(1)
  @JSONObject.custom( (stack :CKafkaConnectorStack, _key:string, _value:any) => {
    const defaultValue = stack._pipeline?.ingestionServer.sinkKafka?.kafkaConnector.minWorkerCount ?? 1;
    if (stack.MaxWorkerCount && stack.MaxWorkerCount < defaultValue) {
      throw new ClickStreamBadRequestError('MaxWorkerCount must greater than or equal MinWorkerCount.');
    }
    return defaultValue;
  })
    MinWorkerCount?: number;

  @JSONObject.optional(1)
  @JSONObject.gte(1)
  @JSONObject.custom( (stack :CKafkaConnectorStack, _key:string, _value:any) => {
    return stack._pipeline?.ingestionServer.sinkKafka?.kafkaConnector.workerMcuCount ?? 1;
  })
    WorkerMcuCount?: number;

  @JSONObject.optional(3000000)
  @JSONObject.gte(0)
  @JSONObject.lte(3000000)
  @JSONObject.custom( (stack :CKafkaConnectorStack, _key:string, _value:any) => {
    return stack._pipeline?.ingestionServer.sinkBatch?.intervalSeconds ? stack._pipeline?.ingestionServer.sinkBatch?.intervalSeconds * 1000 : 3000000;
  })
    RotateIntervalMS?: number;

  @JSONObject.optional(50000)
  @JSONObject.gte(1)
  @JSONObject.lte(50000)
  @JSONObject.custom( (stack :CKafkaConnectorStack, _key:string, _value:any) => {
    return stack._pipeline?.ingestionServer.sinkBatch?.size ?? 50000;
  })
    FlushSize?: number;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, _value:string) => {
    return getAppRegistryApplicationArn(stack._pipeline);
  })
    AppRegistryApplicationArn?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (_stack:CIngestionServerStack, _key:string, _value:string) => {
    return getIamRoleBoundaryArn();
  })
    IamRoleBoundaryArn?: string;

  constructor(pipeline: IPipeline, resources: CPipelineResources) {
    if (pipeline.ingestionServer.sinkBatch) {
      validateSinkBatch(pipeline.ingestionServer.sinkType, pipeline.ingestionServer.sinkBatch);
    }

    super({
      _pipeline: pipeline,
      _resources: resources,
    });
  }
}

export class CDataProcessingStack extends JSONObject {

  public static editAllowedList(): string[] {
    const allowedList:string[] = [
      'AppIds',
      'SourceS3Bucket',
      'SourceS3Prefix',
      'SinkS3Bucket',
      'SinkS3Prefix',
      'PipelineS3Bucket',
      'PipelineS3Prefix',
      'DataFreshnessInHour',
      'ScheduleExpression',
      'TransformerAndEnrichClassNames',
      'S3PathPluginJars',
      'S3PathPluginFiles',
    ];
    return allowedList;
  }

  @JSONObject.required
    _pipeline?: IPipeline;

  @JSONObject.required
    _resources?: CPipelineResources;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataProcessingStack, key:string, _value:any) => {
    const defaultValue = stack._pipeline?.network.vpcId;
    validatePattern(key, VPC_ID_PATTERN, defaultValue);
    return defaultValue;
  })
    VpcId?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataProcessingStack, key:string, _value:any) => {
    const defaultValue = stack._pipeline?.network.privateSubnetIds.join(',');
    validatePattern(key, SUBNETS_PATTERN, defaultValue);
    return defaultValue;
  })
    PrivateSubnetIds?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataProcessingStack, _key:string, _value:any) => {
    return stack._pipeline?.projectId;
  })
    ProjectId?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataProcessingStack, _key:string, _value:any) => {
    return stack._resources?.appIds?.join(',');
  })
    AppIds?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CDataProcessingStack, _key:string, _value:string) => {
    let defaultValue = stack._pipeline?.dataProcessing?.sourceS3Bucket.name ?? stack._pipeline?.bucket.name;
    if (stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.S3) {
      defaultValue = stack._pipeline?.ingestionServer.sinkS3?.sinkBucket.name ?? stack._pipeline.bucket.name;
    } else if (stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.KAFKA) {
      defaultValue = stack._pipeline?.ingestionServer.sinkKafka?.kafkaConnector.sinkBucket?.name ?? stack._pipeline.bucket.name;
    } else if (stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.KINESIS) {
      defaultValue = stack._pipeline?.ingestionServer.sinkKinesis?.sinkBucket?.name ?? stack._pipeline.bucket.name;
    }
    return defaultValue;
  })
    SourceS3Bucket?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CDataProcessingStack, key:string, _value:string) => {
    let defaultValue = getBucketPrefix(
      stack._pipeline?.projectId ?? '',
      BucketPrefix.DATA_BUFFER,
      stack._pipeline?.dataProcessing?.sourceS3Bucket.prefix,
    );
    if (stack._pipeline?.dataProcessing?.sourceS3Bucket.prefix) {
      defaultValue = stack._pipeline?.dataProcessing?.sourceS3Bucket.prefix;
    }
    if (stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.S3) {
      defaultValue = getBucketPrefix(stack._pipeline.projectId, BucketPrefix.DATA_BUFFER,
        stack._pipeline?.ingestionServer.sinkS3?.sinkBucket.prefix);
    } else if (stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.KAFKA) {
      const kafkaPrefix = getBucketPrefix(stack._pipeline.projectId, BucketPrefix.DATA_BUFFER,
        stack._pipeline?.ingestionServer.sinkKafka?.kafkaConnector.sinkBucket?.prefix);
      defaultValue = `${kafkaPrefix}${getKafkaTopic(stack._pipeline)}/`;
    } else if (stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.KINESIS) {
      defaultValue = getBucketPrefix(stack._pipeline.projectId, BucketPrefix.DATA_BUFFER,
        stack._pipeline?.ingestionServer.sinkKinesis?.sinkBucket.prefix);
    }
    validatePattern(key, S3_PREFIX_PATTERN, defaultValue);
    return defaultValue;
  })
    SourceS3Prefix?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataProcessingStack, _key:string, _value:any) => {
    return stack._pipeline?.dataProcessing?.sinkS3Bucket.name ?? stack._pipeline?.bucket.name;
  })
    SinkS3Bucket?: string;

  @JSONObject.required
  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataProcessingStack, key:string, _value:string) => {
    const defaultValue = getBucketPrefix(
      stack._pipeline?.projectId ?? '',
      BucketPrefix.DATA_ODS,
      stack._pipeline?.dataProcessing?.sinkS3Bucket.prefix,
    );
    validatePattern(key, S3_PREFIX_PATTERN, defaultValue);
    return defaultValue;
  })
    SinkS3Prefix?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataProcessingStack, _key:string, _value:any) => {
    return stack._pipeline?.dataProcessing?.pipelineBucket.name ?? stack._pipeline?.bucket.name;
  })
    PipelineS3Bucket?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataProcessingStack, key:string, _value:string) => {
    const defaultValue = getBucketPrefix(
      stack._pipeline?.projectId ?? '',
      BucketPrefix.DATA_PIPELINE_TEMP,
      stack._pipeline?.dataProcessing?.pipelineBucket.prefix,
    );
    validatePattern(key, S3_PREFIX_PATTERN, defaultValue);
    return defaultValue;
  })
    PipelineS3Prefix?: string;

  @JSONObject.optional(72)
  @JSONObject.gt(0)
  @JSONObject.custom( (stack :CDataProcessingStack, _key:string, _value:any) => {
    return stack._pipeline?.dataProcessing?.dataFreshnessInHour ?? 72;
  })
    DataFreshnessInHour?: number;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataProcessingStack, _key:string, _value:any) => {
    const defaultValue = stack._pipeline?.dataProcessing?.scheduleExpression ?? '';
    validateDataProcessingInterval(defaultValue);
    return defaultValue;
  })
    ScheduleExpression?: string;

  @JSONObject.optional(TRANSFORMER_AND_ENRICH_CLASS_NAMES)
  @JSONObject.custom( (stack :CDataProcessingStack, _key:string, _value:string) => {
    const pluginInfo = getPluginInfo(stack._pipeline!, stack._resources!);
    return pluginInfo.transformerAndEnrichClassNames.join(',');
  })
    TransformerAndEnrichClassNames?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataProcessingStack, key:string, _value:string) => {
    const pluginInfo = getPluginInfo(stack._pipeline!, stack._resources!);
    const defaultValue = pluginInfo.s3PathPluginJars.join(',');
    if (defaultValue) {
      validatePattern(key, S3_PATH_PLUGIN_JARS_PATTERN, defaultValue);
    }
    return defaultValue;
  })
    S3PathPluginJars?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataProcessingStack, key:string, _value:string) => {
    const pluginInfo = getPluginInfo(stack._pipeline!, stack._resources!);
    const defaultValue = pluginInfo.s3PathPluginFiles.join(',');
    if (defaultValue) {
      validatePattern(key, S3_PATH_PLUGIN_FILES_PATTERN, defaultValue);
    }
    return defaultValue;
  })
    S3PathPluginFiles?: string;

  @JSONObject.optional('parquet')
  @JSONObject.custom( (stack :CDataProcessingStack, _key:string, _value:any) => {
    return stack._pipeline?.dataProcessing?.outputFormat ?? 'parquet';
  })
    OutputFormat?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CDataProcessingStack, _key:string, _value:string) => {
    return getAppRegistryApplicationArn(stack._pipeline);
  })
    AppRegistryApplicationArn?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (_stack:CDataProcessingStack, _key:string, _value:string) => {
    return getIamRoleBoundaryArn();
  })
    IamRoleBoundaryArn?: string;

  constructor(pipeline: IPipeline, resources: CPipelineResources) {

    super({
      _pipeline: pipeline,
      _resources: resources,
    });
  }
}
export class CDataModelingStack extends JSONObject {

  public static editAllowedList(): string[] {
    const allowedList:string[] = [
      'AppIds',
      'ODSEventBucket',
      'ODSEventPrefix',
      'ODSEventFileSuffix',
      'LoadWorkflowBucket',
      'LoadWorkflowBucketPrefix',
      'MaxFilesLimit',
      'DataProcessingCronOrRateExpression',
      'ClearExpiredEventsScheduleExpression',
      'ClearExpiredEventsRetentionRangeDays',
      'RedshiftServerlessRPU',
    ];
    return allowedList;
  }

  @JSONObject.required
    _pipeline?: IPipeline;

  @JSONObject.required
    _resources?: CPipelineResources;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataModelingStack, key:string, _value:any) => {
    const defaultValue = stack._pipeline?.network.vpcId;
    validatePattern(key, VPC_ID_PATTERN, defaultValue);
    return defaultValue;
  })
    VpcId?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataModelingStack, key:string, _value:any) => {
    const defaultValue = stack._pipeline?.network.privateSubnetIds.join(',');
    validatePattern(key, SUBNETS_PATTERN, defaultValue);
    return defaultValue;
  })
    PrivateSubnetIds?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataModelingStack, _key:string, _value:any) => {
    return stack._pipeline?.projectId;
  })
    ProjectId?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataModelingStack, _key:string, _value:any) => {
    return stack._resources?.appIds?.join(',');
  })
    AppIds?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataModelingStack, _key:string, _value:any) => {
    return stack._pipeline?.dataModeling?.ods?.bucket.name ?? stack._pipeline?.bucket.name;
  })
    ODSEventBucket?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataModelingStack, key:string, _value:any) => {
    const defaultValue = getBucketPrefix(
      stack._pipeline?.projectId ?? '',
      BucketPrefix.DATA_ODS,
      stack._pipeline?.dataModeling?.ods?.bucket.prefix,
    );
    validatePattern(key, S3_PREFIX_PATTERN, defaultValue);
    return defaultValue;
  })
    ODSEventPrefix?: string;

  @JSONObject.optional('.snappy.parquet')
  @JSONObject.custom( (stack :CDataModelingStack, _key:string, _value:any) => {
    return stack._pipeline?.dataModeling?.ods?.fileSuffix ?? '.snappy.parquet';
  })
    ODSEventFileSuffix?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataModelingStack, _key:string, _value:any) => {
    return stack._pipeline?.dataProcessing?.pipelineBucket.name ?? stack._pipeline?.bucket.name;
  })
    PipelineS3Bucket?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataModelingStack, key:string, _value:any) => {
    const defaultValue = getBucketPrefix(
      stack._pipeline?.projectId ?? '',
      BucketPrefix.DATA_PIPELINE_TEMP,
      stack._pipeline?.dataProcessing?.pipelineBucket.prefix,
    );
    validatePattern(key, S3_PREFIX_PATTERN, defaultValue);
    return defaultValue;
  })
    PipelineS3Prefix?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataModelingStack, key:string, _value:any) => {
    const defaultValue = getBucketPrefix(
      stack._pipeline?.projectId ?? '',
      BucketPrefix.SEGMENTS,
      stack._pipeline?.bucket.prefix,
    );
    validatePattern(key, S3_PREFIX_PATTERN, defaultValue);
    return defaultValue;
  })
    SegmentsS3Prefix?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataModelingStack, _key:string, _value:any) => {
    return stack._pipeline?.dataModeling?.loadWorkflow?.bucket?.name ?? stack._pipeline?.bucket.name;
  })
    LoadWorkflowBucket?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataModelingStack, key:string, _value:any) => {
    const defaultValue = getBucketPrefix(
      stack._pipeline?.projectId ?? '',
      BucketPrefix.LOAD_WORKFLOW,
      stack._pipeline?.dataModeling?.loadWorkflow?.bucket?.prefix,
    );
    validatePattern(key, S3_PREFIX_PATTERN, defaultValue);
    return defaultValue;
  })
    LoadWorkflowBucketPrefix?: string;

  @JSONObject.optional(50)
  @JSONObject.gte(1)
  @JSONObject.custom( (stack :CDataModelingStack, _key:string, _value:any) => {
    return stack._pipeline?.dataModeling?.loadWorkflow?.maxFilesLimit ?? 50;
  })
    MaxFilesLimit?: number;

  @JSONObject.optional('cron(0 1 * * ? *)')
  @JSONObject.custom( (stack :CDataModelingStack, key:string, _value:any) => {
    const defaultValue = stack._pipeline?.dataProcessing?.scheduleExpression ?? 'cron(0 1 * * ? *)';
    validatePattern(key, SCHEDULE_EXPRESSION_PATTERN, defaultValue);
    return defaultValue;
  })
    DataProcessingCronOrRateExpression?: string;

  @JSONObject.optional('cron(0 17 * * ? *)')
  @JSONObject.custom( (_:any, key:string, value:any) => {
    validatePattern(key, SCHEDULE_EXPRESSION_PATTERN, value);
    return value;
  })
    ClearExpiredEventsScheduleExpression?: string;

  @JSONObject.optional(365)
  @JSONObject.gte(1)
    ClearExpiredEventsRetentionRangeDays?: number;

  @JSONObject.optional(REDSHIFT_MODE.NEW_SERVERLESS)
  @JSONObject.custom( (stack :CDataModelingStack, _key:string, value:any) => {
    if (stack._pipeline?.dataModeling?.redshift?.provisioned) {
      return REDSHIFT_MODE.PROVISIONED;
    } else if (stack._pipeline?.dataModeling?.redshift?.existingServerless) {
      return REDSHIFT_MODE.SERVERLESS;
    }
    return value;
  })
    RedshiftMode?: REDSHIFT_MODE;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataModelingStack, key:string, value:any) => {
    if (stack._pipeline?.dataModeling?.redshift?.provisioned) {
      value = stack._pipeline?.dataModeling?.redshift?.provisioned.clusterIdentifier;
    }
    if (!isEmpty(value)) {
      validatePattern(key, REDSHIFT_CLUSTER_IDENTIFIER_PATTERN, value);
    }
    return value;
  })
    RedshiftClusterIdentifier?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataModelingStack, key:string, value:any) => {
    if (stack._pipeline?.dataModeling?.redshift?.provisioned) {
      value = stack._pipeline?.dataModeling?.redshift?.provisioned.dbUser;
    }
    if (!isEmpty(value)) {
      validatePattern(key, REDSHIFT_DB_USER_NAME_PATTERN, value);
    }
    return value;
  })
    RedshiftDbUser?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataModelingStack, _key:string, value:any) => {
    if (stack._pipeline?.dataModeling?.redshift?.newServerless) {
      let workgroupName = `clickstream-${stack._resources!.project?.id.replace(/_/g, '-')}`;
      if (workgroupName.length > 120) {
        workgroupName = workgroupName.substring(0, 120);
      }
      return workgroupName;
    }
    return value;
  })
    NewRedshiftServerlessWorkgroupName?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataModelingStack, _key:string, value:any) => {
    if (stack._pipeline?.dataModeling?.redshift?.newServerless) {
      validatePattern('NewServerlessVpcId', VPC_ID_PATTERN, stack._pipeline?.dataModeling?.redshift?.newServerless.network.vpcId);
      return stack._pipeline?.dataModeling?.redshift?.newServerless.network.vpcId;
    }
    return value;
  })
    RedshiftServerlessVPCId?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataModelingStack, _key:string, value:any) => {
    if (stack._pipeline?.dataModeling?.redshift?.newServerless) {
      validatePattern('RedshiftServerlessSubnets', SUBNETS_THREE_AZ_PATTERN,
        stack._pipeline?.dataModeling?.redshift?.newServerless.network.subnetIds.join(','));
      return stack._pipeline?.dataModeling?.redshift?.newServerless.network.subnetIds.join(',');
    }
    return value;
  })
    RedshiftServerlessSubnets?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataModelingStack, _key:string, value:any) => {
    if (stack._pipeline?.dataModeling?.redshift?.newServerless) {
      return stack._pipeline?.dataModeling?.redshift?.newServerless.network.securityGroups.join(',');
    }
    return value;
  })
    RedshiftServerlessSGs?: string;

  @JSONObject.optional(16)
  @JSONObject.gte(8)
  @JSONObject.lte(512)
  @JSONObject.custom( (stack :CDataModelingStack, _key:string, value:any) => {
    if (stack._pipeline?.dataModeling?.redshift?.newServerless) {
      const rpu = stack._pipeline?.dataModeling?.redshift?.newServerless.baseCapacity;
      validateServerlessRedshiftRPU(stack._pipeline?.region, rpu);
      return rpu;
    }
    return value;
  })
    RedshiftServerlessRPU?: number;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataModelingStack, _key:string, value:any) => {
    if (stack._pipeline?.dataModeling?.redshift?.existingServerless) {
      return stack._resources?.redshift?.serverless?.namespaceId;
    }
    return value;
  })
    RedshiftServerlessNamespaceId?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataModelingStack, _key:string, value:any) => {
    if (stack._pipeline?.dataModeling?.redshift?.existingServerless) {
      return stack._resources?.redshift?.serverless?.workgroupId;
    }
    return value;
  })
    RedshiftServerlessWorkgroupId?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataModelingStack, _key:string, value:any) => {
    if (stack._pipeline?.dataModeling?.redshift?.existingServerless) {
      return stack._resources?.redshift?.serverless?.workgroupName;
    }
    return value;
  })
    RedshiftServerlessWorkgroupName?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataModelingStack, _key:string, value:any) => {
    if (stack._pipeline?.dataModeling?.redshift?.existingServerless) {
      return stack._pipeline?.dataModeling?.redshift?.existingServerless.iamRoleArn;
    }
    return value;
  })
    RedshiftServerlessIAMRole?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataModelingStack, _key:string, _value:any) => {
    if (!stack._pipeline) {
      return '';
    }
    return getValueFromStackOutputSuffix(
      stack._pipeline,
      PipelineStackType.DATA_PROCESSING,
      OUTPUT_DATA_PROCESSING_EMR_SERVERLESS_APPLICATION_ID_SUFFIX,
    );
  })
    EMRServerlessApplicationId?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (_stack :CDataModelingStack, _key:string, _value:any) => {
    const partition = awsRegion?.startsWith('cn') ? 'aws-cn' : 'aws';
    return `arn:${partition}:dynamodb:${awsRegion}:${awsAccountId}:table/${analyticsMetadataTable}`;
  })
    ClickstreamAnalyticsMetadataDdbArn?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (_stack :CDataModelingStack, _key:string, _value:any) => {
    const partition = awsRegion?.startsWith('cn') ? 'aws-cn' : 'aws';
    return `arn:${partition}:dynamodb:${awsRegion}:${awsAccountId}:table/${clickStreamTableName}`;
  })
    ClickstreamMetadataDdbArn?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CDataModelingStack, _key:string, _value:string) => {
    return getAppRegistryApplicationArn(stack._pipeline);
  })
    AppRegistryApplicationArn?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (_stack:CDataModelingStack, _key:string, _value:string) => {
    return getIamRoleBoundaryArn();
  })
    IamRoleBoundaryArn?: string;

  constructor(pipeline: IPipeline, resources: CPipelineResources) {
    if (pipeline.dataModeling?.redshift?.provisioned) {
      if (isEmpty(pipeline.dataModeling?.redshift?.provisioned.clusterIdentifier) ||
        isEmpty(pipeline.dataModeling?.redshift?.provisioned.dbUser)) {
        throw new ClickStreamBadRequestError('Cluster Identifier and DbUser are required when using Redshift Provisioned cluster.');
      }
    }

    if (pipeline.dataModeling?.redshift?.newServerless) {
      if (isEmpty(pipeline.dataModeling?.redshift?.newServerless.network.vpcId) ||
        isEmpty(pipeline.dataModeling?.redshift?.newServerless.network.subnetIds) ||
        isEmpty(pipeline.dataModeling?.redshift?.newServerless.network.securityGroups)) {
        throw new ClickStreamBadRequestError('VpcId, SubnetIds, SecurityGroups required for provisioning new Redshift Serverless.');
      }
    }

    super({
      _pipeline: pipeline,
      _resources: resources,
    });
  }
}

export class CReportingStack extends JSONObject {

  public static editAllowedList(): string[] {
    const allowedList:string[] = [
      'QuickSightUserParam',
      'RedshiftDBParam',
      'RedShiftDBSchemaParam',
      'QuickSightVpcConnectionSubnetParam',
      'RedshiftParameterKeyParam',
      'QuickSightPrincipalParam',
      'QuickSightOwnerPrincipalParam',
    ];
    return allowedList;
  }

  @JSONObject.required
    _pipeline?: IPipeline;

  @JSONObject.required
    _resources?: CPipelineResources;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CReportingStack, key:string, _value:any) => {
    const defaultValue = stack._resources?.quickSightUser?.publishUserName ?? '';
    validatePattern(key, QUICKSIGHT_USER_NAME_PATTERN, defaultValue);
    return defaultValue;
  })
    QuickSightUserParam?: string;

  @JSONObject.optional('default')
  @JSONObject.custom( (stack:CReportingStack, key:string, _value:any) => {
    const defaultValue = stack._pipeline?.reporting?.quickSight?.namespace ?? 'default';
    validatePattern(key, QUICKSIGHT_NAMESPACE_PATTERN, defaultValue);
    return defaultValue;
  })
    QuickSightNamespaceParam?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CReportingStack, _key:string, _value:any) => {
    return stack._resources?.quickSightUser?.publishUserArn ?? '';
  })
    QuickSightPrincipalParam?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CReportingStack, _key:string, _value:any) => {
    return stack._resources?.quickSightUser?.publishUserArn ?? '';
  })
    QuickSightOwnerPrincipalParam?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CReportingStack, _key:string, _value:any) => {
    return stack._pipeline?.projectId ?? '';
  })
    RedshiftDBParam?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CReportingStack, _key:string, _value:any) => {
    return stack._resources?.appIds?.join(',');
  })
    RedShiftDBSchemaParam?: string;

  @JSONObject.optional('')
    QuickSightTemplateArnParam?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CReportingStack, _key:string, value:any) => {
    if (stack._pipeline?.dataModeling?.redshift?.provisioned || stack._pipeline?.dataModeling?.redshift?.existingServerless) {
      return stack._resources?.redshift?.endpoint.address;
    } else if (stack._pipeline?.dataModeling?.redshift?.newServerless) {
      return getValueFromStackOutputSuffix(
        stack._pipeline,
        PipelineStackType.DATA_MODELING_REDSHIFT,
        OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_ENDPOINT_ADDRESS,
      );
    }
    return value;
  })
    RedshiftEndpointParam?: string;

  @JSONObject.optional('5439')
  @JSONObject.custom( (stack :CReportingStack, _key:string, value:any) => {
    if (stack._pipeline?.dataModeling?.redshift?.provisioned || stack._pipeline?.dataModeling?.redshift?.existingServerless) {
      return stack._resources?.redshift?.endpoint.port.toString();
    } else if (stack._pipeline?.dataModeling?.redshift?.newServerless) {
      return getValueFromStackOutputSuffix(
        stack._pipeline,
        PipelineStackType.DATA_MODELING_REDSHIFT,
        OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_ENDPOINT_PORT,
      );
    }
    return value;
  })
    RedshiftPortParam?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CReportingStack, key:string, _value:any) => {
    const defaultValue = stack._resources?.quickSightSubnetIds?.join(',') ?? '';
    validatePattern(key, SUBNETS_PATTERN, defaultValue);
    return defaultValue;
  })
    QuickSightVpcConnectionSubnetParam?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CReportingStack, _key:string, value:any) => {
    if (stack._pipeline?.dataModeling?.redshift?.provisioned || stack._pipeline?.dataModeling?.redshift?.existingServerless) {
      return stack._resources?.redshift?.network.securityGroups?.join(',');
    } else if (stack._pipeline?.dataModeling?.redshift?.newServerless) {
      return stack._pipeline?.dataModeling?.redshift.newServerless.network.securityGroups.join(',');
    }
    return value;
  })
    QuickSightVpcConnectionSGParam?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CReportingStack, _key:string, _value:any) => {
    if (!stack._pipeline) {
      return '';
    }
    return getValueFromStackOutputSuffix(
      stack._pipeline,
      PipelineStackType.DATA_MODELING_REDSHIFT,
      OUTPUT_DATA_MODELING_REDSHIFT_BI_USER_CREDENTIAL_PARAMETER_SUFFIX,
    );;
  })
    RedshiftParameterKeyParam?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CDataModelingStack, _key:string, _value:string) => {
    return getAppRegistryApplicationArn(stack._pipeline);
  })
    AppRegistryApplicationArn?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (_stack:CDataModelingStack, _key:string, _value:string) => {
    return getIamRoleBoundaryArn();
  })
    IamRoleBoundaryArn?: string;

  constructor(pipeline: IPipeline, resources: CPipelineResources) {
    if (!pipeline.dataModeling) {
      throw new ClickStreamBadRequestError('To open a QuickSight report,it must enable the Data Analytics engine first.');
    }

    super({
      _pipeline: pipeline,
      _resources: resources,
    });
  }
}

export class CAthenaStack extends JSONObject {

  public static editAllowedList(): string[] {
    const allowedList:string[] = [];
    return allowedList;
  }

  @JSONObject.required
    AthenaDatabase?: string;

  @JSONObject.required
    AthenaEventTable?: string;

  @JSONObject.optional('')
    AppRegistryApplicationArn?: string;

  @JSONObject.optional(undefined)
    IamRoleBoundaryArn?: string;

  constructor(pipeline: IPipeline) {
    super({
      AthenaDatabase: getValueFromStackOutputSuffix(
        pipeline,
        PipelineStackType.DATA_PROCESSING,
        OUTPUT_DATA_PROCESSING_GLUE_DATABASE_SUFFIX,
      ),
      AthenaEventTable: getValueFromStackOutputSuffix(
        pipeline,
        PipelineStackType.DATA_PROCESSING,
        OUTPUT_DATA_PROCESSING_GLUE_EVENT_TABLE_SUFFIX,
      ),
      // Service Catalog AppRegistry
      AppRegistryApplicationArn: getAppRegistryApplicationArn(pipeline),
      IamRoleBoundaryArn: getIamRoleBoundaryArn(),
    });
  }
}

export class CMetricsStack extends JSONObject {

  public static editAllowedList(): string[] {
    const allowedList:string[] = [
      'Emails',
    ];
    return allowedList;
  }

  @JSONObject.required
    ProjectId?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (_:any, key:string, value:any) => {
    if (value) {
      validatePattern(key, MULTI_EMAIL_PATTERN, value);
    }
    return value;
  })
    Emails?: string;

  @JSONObject.optional(4)
  @JSONObject.gte(1)
    ColumnNumber?: number;

  @JSONObject.optional(MetricsLegendPosition.BOTTOM)
    LegendPosition?: MetricsLegendPosition;

  @JSONObject.optional('1')
    Version?: string;

  @JSONObject.optional('')
    AppRegistryApplicationArn?: string;

  @JSONObject.optional(undefined)
    IamRoleBoundaryArn?: string;

  constructor(pipeline: IPipeline, resources: CPipelineResources) {
    const projectEmails = resources.project?.emails?.split(',');
    const operators = pipeline.operator.split(',');
    const emailList = projectEmails?.concat(operators);
    const emails = emailList?.filter(op => isEmail(op));
    const uniqueEmails = [...new Set(emails)];

    super({
      ProjectId: pipeline.projectId,
      Emails: uniqueEmails?.join(','),
      AppRegistryApplicationArn: getAppRegistryApplicationArn(pipeline),
      IamRoleBoundaryArn: getIamRoleBoundaryArn(),
    });
  }
}

export class CAppRegistryStack extends JSONObject {
  @JSONObject.required
    ProjectId?: string;

  constructor(pipeline: IPipeline) {
    super({
      ProjectId: pipeline.projectId,
    });
  }
}
