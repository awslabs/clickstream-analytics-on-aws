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
import { JSONObject } from 'ts-json-object';
import { CPipelineResources, IPipeline } from './pipeline';
import {
  CORS_PATTERN,
  DOMAIN_NAME_PATTERN, MUTIL_EMAIL_PATTERN,
  KAFKA_BROKERS_PATTERN,
  KAFKA_TOPIC_PATTERN, MUTIL_SECURITY_GROUP_PATTERN,
  OUTPUT_DATA_MODELING_REDSHIFT_BI_USER_CREDENTIAL_PARAMETER_SUFFIX,
  OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_ENDPOINT_ADDRESS,
  OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_ENDPOINT_PORT,
  QUICKSIGHT_NAMESPACE_PATTERN,
  QUICKSIGHT_USER_NAME_PATTERN,
  S3_PATH_PLUGIN_FILES_PATTERN,
  S3_PATH_PLUGIN_JARS_PATTERN,
  SCHEDULE_EXPRESSION_PATTERN, SECURITY_GROUP_PATTERN,
  SUBNETS_PATTERN,
  SUBNETS_THREE_AZ_PATTERN,
  VPC_ID_PATTERN,
  OUTPUT_DATA_PROCESSING_EMR_SERVERLESS_APPLICATION_ID_SUFFIX,
  OUTPUT_DATA_PROCESSING_GLUE_DATABASE_SUFFIX,
  OUTPUT_DATA_PROCESSING_GLUE_EVENT_TABLE_SUFFIX,
  S3_PREFIX_PATTERN,
} from '../common/constants-ln';
import { REDSHIFT_MODE } from '../common/model-ln';
import { validateDataProcessingInterval, validatePattern, validateServerlessRedshiftRPU, validateSinkBatch } from '../common/stack-params-valid';
import {
  BucketPrefix,
  ClickStreamBadRequestError,
  DataCollectionSDK,
  KinesisStreamMode, MetricsLegendPosition,
  PipelineServerProtocol,
  PipelineSinkType,
  PipelineStackType,
  ProjectEnvironment,
} from '../common/types';
import { getBucketPrefix, getKafkaTopic, getPluginInfo, isEmpty, getValueFromStackOutputSuffix, isEmail } from '../common/utils';

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
    ];
    return allowedList;
  }

  @JSONObject.required
    _pipeline?: IPipeline;

  @JSONObject.optional
    _resources?: CPipelineResources;

  @JSONObject.required
    DevMode?: string;

  @JSONObject.required
    ClickStreamSDK?: string;

  @JSONObject.required
    ProjectId?: string;

  @JSONObject.required
    AppIds?: string;

  @JSONObject.required
  @JSONObject.custom( (_:any, key:string, value:any) => {
    validatePattern(key, VPC_ID_PATTERN, value);
    return value;
  })
    VpcId?: string;

  @JSONObject.required
  @JSONObject.custom( (_:any, key:string, value:any) => {
    validatePattern(key, SUBNETS_PATTERN, value);
    return value;
  })
    PublicSubnetIds?: string;

  @JSONObject.optional
  @JSONObject.custom( (stack :CIngestionServerStack, key:string, value:any) => {
    if (isEmpty(value)) {
      value = stack.PublicSubnetIds;
    }
    validatePattern(key, SUBNETS_PATTERN, value);
    return value;
  })
    PrivateSubnetIds?: string;

  @JSONObject.required
    Protocol?: PipelineServerProtocol;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CIngestionServerStack, key:string, value:string) => {
    if (stack.Protocol == PipelineServerProtocol.HTTPS) {
      validatePattern(key, DOMAIN_NAME_PATTERN, value);
    }
    return stack.Protocol == PipelineServerProtocol.HTTPS ? value : '';
  })
    DomainName?: string;

  @JSONObject.optional('')
    ACMCertificateArn?: string;

  @JSONObject.required
    ServerEndpointPath?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (_stack :CIngestionServerStack, key:string, value:any) => {
    if (!isEmpty(value)) {
      validatePattern(key, CORS_PATTERN, value);
    }
    return value;
  })
    ServerCorsOrigin?: string;

  @JSONObject.required
  @JSONObject.gt(0)
    ServerMax?: number;

  @JSONObject.required
  @JSONObject.gt(0)
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, value:number) => {
    if (stack.ServerMax && stack.ServerMax < value) {
      throw new ClickStreamBadRequestError('ServerMax must greater than or equal ServerMin.');
    }
    return value;
  })
    ServerMin?: number;

  @JSONObject.optional(0)
  @JSONObject.gte(0)
    WarmPoolSize?: number;

  @JSONObject.optional(50)
  @JSONObject.gte(0)
  @JSONObject.lte(100)
    ScaleOnCpuUtilizationPercent?: number;

  @JSONObject.optional('')
    NotificationsTopicArn?: string;

  @JSONObject.optional('No')
    EnableGlobalAccelerator?: string;

  @JSONObject.optional('')
    AuthenticationSecretArn?: string;

  @JSONObject.optional('No')
    EnableAuthentication?: string;

  @JSONObject.optional('No')
    EnableApplicationLoadBalancerAccessLog?: string;

  @JSONObject.required
    LogS3Bucket?: string;

  @JSONObject.required
  @JSONObject.custom( (_stack: any, key:string, value:string) => {
    validatePattern(key, S3_PREFIX_PATTERN, value);
    return value;
  })
    LogS3Prefix?: string;

  @JSONObject.required
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, value:string) => {
    return stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.S3 ? value : undefined;
  })
    S3DataBucket?: string;

  @JSONObject.required
  @JSONObject.custom( (stack:CIngestionServerStack, key:string, value:string) => {
    if (stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.S3) {
      validatePattern(key, S3_PREFIX_PATTERN, value);
      return value;
    }
    return undefined;
  })
    S3DataPrefix?: string;

  @JSONObject.optional(30000000)
  @JSONObject.gte(1000000)
  @JSONObject.lte(50000000)
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, value:string) => {
    return stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.S3 ? value : undefined;
  })
    S3BatchMaxBytes?: number;

  @JSONObject.optional(300)
  @JSONObject.gte(30)
  @JSONObject.lte(1800)
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, value:string) => {
    return stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.S3 ? value : undefined;
  })
    S3BatchTimeout?: number;

  @JSONObject.optional(330)
  @JSONObject.gte(60)
  @JSONObject.lte(1830)
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, _value:string) => {
    if (stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.S3) {
      return stack.S3BatchTimeout ? stack.S3BatchTimeout + 30 : 330;
    }
    return undefined;
  })
    WorkerStopTimeout?: number;

  @JSONObject.optional('')
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, value:string) => {
    return stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.KAFKA ? value : undefined;
  })
    MskClusterName?: string;

  @JSONObject.optional
  @JSONObject.custom( (stack:CIngestionServerStack, key:string, value:string) => {
    if (stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.KAFKA) {
      validatePattern(key, MUTIL_SECURITY_GROUP_PATTERN, value);
    }
    return stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.KAFKA ? value : undefined;
  })
    MskSecurityGroupId?: string;

  @JSONObject.optional
  @JSONObject.custom( (stack:CIngestionServerStack, key:string, value:string) => {
    if (stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.KAFKA) {
      validatePattern(key, KAFKA_TOPIC_PATTERN, value);
    }
    return stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.KAFKA ? value : undefined;
  })
    KafkaTopic?: string;

  @JSONObject.optional
  @JSONObject.custom( (stack:CIngestionServerStack, key:string, value:string) => {
    if (stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.KAFKA) {
      if (stack._pipeline.ingestionServer.sinkKafka?.mskCluster?.arn) {
        value = stack._resources?.mskBrokers?.join(',') ?? '';
      }
      validatePattern(key, KAFKA_BROKERS_PATTERN, value);
    }
    return stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.KAFKA ? value : undefined;
  })
    KafkaBrokers?: string;

  @JSONObject.optional(KinesisStreamMode.ON_DEMAND)
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, value:string) => {
    return stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.KINESIS ? value : undefined;
  })
    KinesisStreamMode?: KinesisStreamMode;

  @JSONObject.optional(3)
  @JSONObject.gte(1)
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, value:string) => {
    return stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.KINESIS ? value : undefined;
  })
    KinesisShardCount?: number;

  @JSONObject.optional(24)
  @JSONObject.gte(24)
  @JSONObject.lte(8760)
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, value:string) => {
    return stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.KINESIS ? value : undefined;
  })
    KinesisDataRetentionHours?: number;

  @JSONObject.optional(10000)
  @JSONObject.gte(1)
  @JSONObject.lte(10000)
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, value:string) => {
    return stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.KINESIS ? value : undefined;
  })
    KinesisBatchSize?: number;

  @JSONObject.optional(300)
  @JSONObject.gte(0)
  @JSONObject.lte(300)
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, value:string) => {
    return stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.KINESIS ? value : undefined;
  })
    KinesisMaxBatchingWindowSeconds?: number;

  @JSONObject.required
  @JSONObject.custom( (stack:CIngestionServerStack, _key:string, value:string) => {
    return stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.KINESIS ? value : undefined;
  })
    KinesisDataS3Bucket?: string;

  @JSONObject.required
  @JSONObject.custom( (stack:CIngestionServerStack, key:string, value:string) => {
    if (stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.KINESIS) {
      validatePattern(key, S3_PREFIX_PATTERN, value);
      return value;
    }
    return undefined;
  })
    KinesisDataS3Prefix?: string;

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

      DevMode: resources.project?.environment == ProjectEnvironment.DEV ? 'Yes' : 'No',
      ProjectId: pipeline.projectId,
      AppIds: resources.appIds?.join(','),
      ClickStreamSDK: pipeline.dataCollectionSDK == DataCollectionSDK.CLICKSTREAM ? 'Yes' : 'No',
      // VPC Information
      VpcId: pipeline.network.vpcId,
      PublicSubnetIds: pipeline.network.publicSubnetIds.join(','),
      PrivateSubnetIds: pipeline.network.privateSubnetIds.join(','),
      // Domain Information
      DomainName: pipeline.ingestionServer.domain?.domainName,
      ACMCertificateArn: pipeline.ingestionServer.domain?.certificateArn,
      // Ingestion Server
      Protocol: pipeline.ingestionServer.loadBalancer.protocol,
      ServerEndpointPath: pipeline.ingestionServer.loadBalancer.serverEndpointPath,
      ServerCorsOrigin: pipeline.ingestionServer.loadBalancer.serverCorsOrigin,
      ServerMax: pipeline.ingestionServer.size.serverMax,
      ServerMin: pipeline.ingestionServer.size.serverMin,
      WarmPoolSize: pipeline.ingestionServer.size.warmPoolSize,
      ScaleOnCpuUtilizationPercent: pipeline.ingestionServer.size.scaleOnCpuUtilizationPercent,
      NotificationsTopicArn: pipeline.ingestionServer.loadBalancer.notificationsTopicArn,
      EnableGlobalAccelerator: pipeline.ingestionServer.loadBalancer.enableGlobalAccelerator ? 'Yes' : 'No',
      AuthenticationSecretArn: pipeline.ingestionServer.loadBalancer.authenticationSecretArn,
      EnableAuthentication: pipeline.ingestionServer.loadBalancer.authenticationSecretArn ? 'Yes' : 'No',
      EnableApplicationLoadBalancerAccessLog: pipeline.ingestionServer.loadBalancer.enableApplicationLoadBalancerAccessLog ? 'Yes' : 'No',
      // Log
      LogS3Bucket: pipeline.ingestionServer.loadBalancer.logS3Bucket?.name ?? pipeline.bucket.name,
      LogS3Prefix: getBucketPrefix(pipeline.projectId, BucketPrefix.LOGS_ALB, pipeline.ingestionServer.loadBalancer.logS3Bucket?.prefix),
      // S3 sink
      S3DataBucket: pipeline.ingestionServer.sinkS3?.sinkBucket.name ?? pipeline.bucket.name,
      S3DataPrefix: getBucketPrefix(pipeline.projectId, BucketPrefix.DATA_BUFFER, pipeline.ingestionServer.sinkS3?.sinkBucket.prefix),
      S3BatchMaxBytes: pipeline.ingestionServer.sinkS3?.s3BatchMaxBytes,
      S3BatchTimeout: pipeline.ingestionServer.sinkS3?.s3BatchTimeout,
      // Kafka sink
      MskClusterName: pipeline.ingestionServer.sinkKafka?.mskCluster?.name,
      MskSecurityGroupId: pipeline.ingestionServer.sinkKafka?.securityGroupId,
      KafkaTopic: getKafkaTopic(pipeline),
      KafkaBrokers: pipeline.ingestionServer.sinkKafka?.brokers.join(','),
      // Kinesis sink
      KinesisStreamMode: pipeline.ingestionServer.sinkKinesis?.kinesisStreamMode,
      KinesisShardCount: pipeline.ingestionServer.sinkKinesis?.kinesisShardCount,
      KinesisDataRetentionHours: pipeline.ingestionServer.sinkKinesis?.kinesisDataRetentionHours,
      KinesisBatchSize: pipeline.ingestionServer.sinkBatch?.size,
      KinesisMaxBatchingWindowSeconds: pipeline.ingestionServer.sinkBatch?.intervalSeconds,
      KinesisDataS3Bucket: pipeline.ingestionServer.sinkKinesis?.sinkBucket.name ?? pipeline.bucket.name,
      KinesisDataS3Prefix: getBucketPrefix(pipeline.projectId, BucketPrefix.DATA_BUFFER, pipeline.ingestionServer.sinkKinesis?.sinkBucket.prefix),
    });
  }

  public parameters() {
    const parameters: Parameter[] = [];
    Object.entries(this).forEach(([k, v]) => {
      if (!k.startsWith('_') && v !== undefined) {
        parameters.push({
          ParameterKey: k,
          ParameterValue: v || v===0 ? v.toString() : '',
        });
      }
    });
    return parameters;
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

  @JSONObject.optional
    _resources?: CPipelineResources;

  @JSONObject.required
    ProjectId?: string;

  @JSONObject.required
    DataS3Bucket?: string;

  @JSONObject.required
  @JSONObject.custom( (_stack:any, key:string, value:string) => {
    validatePattern(key, S3_PREFIX_PATTERN, value);
    return value;
  })
    DataS3Prefix?: string;

  @JSONObject.required
    LogS3Bucket?: string;

  @JSONObject.required
  @JSONObject.custom( (_stack:any, key:string, value:string) => {
    validatePattern(key, S3_PREFIX_PATTERN, value);
    return value;
  })
    LogS3Prefix?: string;

  @JSONObject.required
    PluginS3Bucket?: string;

  @JSONObject.required
  @JSONObject.custom( (_stack:any, key:string, value:string) => {
    validatePattern(key, S3_PREFIX_PATTERN, value);
    return value;
  })
    PluginS3Prefix?: string;

  @JSONObject.required
  @JSONObject.custom( (_:any, key:string, value:any) => {
    validatePattern(key, SUBNETS_PATTERN, value);
    return value;
  })
    SubnetIds?: string;

  @JSONObject.required
  @JSONObject.custom( (_:any, key:string, value:any) => {
    validatePattern(key, SECURITY_GROUP_PATTERN, value);
    return value;
  })
    SecurityGroupId?: string;

  @JSONObject.optional
  @JSONObject.custom( (stack:CKafkaConnectorStack, key:string, value:string) => {
    if (stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.KAFKA) {
      if (stack._pipeline.ingestionServer.sinkKafka?.mskCluster?.arn) {
        value = stack._resources?.mskBrokers?.join(',') ?? '';
      }
      validatePattern(key, KAFKA_BROKERS_PATTERN, value);
    }
    return stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.KAFKA ? value : '';
  })
    KafkaBrokers?: string;

  @JSONObject.optional
  @JSONObject.custom( (stack:CKafkaConnectorStack, key:string, value:string) => {
    if (stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.KAFKA) {
      validatePattern(key, KAFKA_TOPIC_PATTERN, value);
    }
    return stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.KAFKA ? value : '';
  })
    KafkaTopic?: string;

  @JSONObject.optional('')
    MskClusterName?: string;

  @JSONObject.optional(3)
  @JSONObject.gte(1)
    MaxWorkerCount?: number;

  @JSONObject.optional(1)
  @JSONObject.gte(1)
  @JSONObject.custom( (stack:CKafkaConnectorStack, _key:string, value:number) => {
    if (stack.MaxWorkerCount && stack.MaxWorkerCount < value) {
      throw new ClickStreamBadRequestError('MaxWorkerCount must greater than or equal MinWorkerCount.');
    }
    return value;
  })
    MinWorkerCount?: number;

  @JSONObject.optional(1)
  @JSONObject.gte(1)
    WorkerMcuCount?: number;

  @JSONObject.optional(3000000)
  @JSONObject.gte(0)
  @JSONObject.lte(3000000)
    RotateIntervalMS?: number;

  @JSONObject.optional(50000)
  @JSONObject.gte(1)
  @JSONObject.lte(50000)
    FlushSize?: number;

  constructor(pipeline: IPipeline, resources: CPipelineResources) {
    if (pipeline.ingestionServer.sinkBatch) {
      validateSinkBatch(pipeline.ingestionServer.sinkType, pipeline.ingestionServer.sinkBatch);
    }

    super({
      _pipeline: pipeline,
      _resources: resources,

      ProjectId: pipeline.projectId,
      DataS3Bucket: pipeline.ingestionServer.sinkKafka?.kafkaConnector.sinkBucket?.name ?? pipeline.bucket.name,
      DataS3Prefix: getBucketPrefix(pipeline.projectId, BucketPrefix.DATA_BUFFER,
        pipeline.ingestionServer.sinkKafka?.kafkaConnector.sinkBucket?.prefix),
      LogS3Bucket: pipeline.bucket.name,
      LogS3Prefix: getBucketPrefix(pipeline.projectId, BucketPrefix.LOGS_KAFKA_CONNECTOR, ''),
      PluginS3Bucket: pipeline.bucket.name,
      PluginS3Prefix: getBucketPrefix(pipeline.projectId, BucketPrefix.KAFKA_CONNECTOR_PLUGIN, ''),
      SubnetIds: pipeline.network.privateSubnetIds.join(','),
      SecurityGroupId: pipeline.ingestionServer.sinkKafka?.securityGroupId,

      KafkaBrokers: pipeline.ingestionServer.sinkKafka?.brokers.join(','),
      KafkaTopic: getKafkaTopic(pipeline),
      MskClusterName: pipeline.ingestionServer.sinkKafka?.mskCluster?.name,
      MaxWorkerCount: pipeline.ingestionServer.sinkKafka?.kafkaConnector.maxWorkerCount,
      MinWorkerCount: pipeline.ingestionServer.sinkKafka?.kafkaConnector.minWorkerCount,
      WorkerMcuCount: pipeline.ingestionServer.sinkKafka?.kafkaConnector.workerMcuCount,

      RotateIntervalMS: pipeline.ingestionServer.sinkBatch?.intervalSeconds ? pipeline.ingestionServer.sinkBatch?.intervalSeconds * 1000 : 3000000,
      FlushSize: pipeline.ingestionServer.sinkBatch?.size ?? 50000,
    });
  }

  public parameters() {
    const parameters: Parameter[] = [];
    Object.entries(this).forEach(([k, v]) => {
      if (!k.startsWith('_')) {
        parameters.push({
          ParameterKey: k,
          ParameterValue: v || v===0 ? v.toString() : '',
        });
      }
    });
    return parameters;
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
    _kafkaTopic?: string;

  @JSONObject.required
  @JSONObject.custom( (_:any, key:string, value:any) => {
    validatePattern(key, VPC_ID_PATTERN, value);
    return value;
  })
    VpcId?: string;

  @JSONObject.required
  @JSONObject.custom( (_:any, key:string, value:any) => {
    validatePattern(key, SUBNETS_PATTERN, value);
    return value;
  })
    PrivateSubnetIds?: string;

  @JSONObject.required
    ProjectId?: string;

  @JSONObject.required
    AppIds?: string;

  @JSONObject.required
    SourceS3Bucket?: string;

  @JSONObject.required
  @JSONObject.custom( (stack:CDataProcessingStack, key:string, value:string) => {
    if (stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.S3
      && !isEmpty(stack._pipeline?.ingestionServer.sinkS3?.sinkBucket.prefix)) {
      value = stack._pipeline?.ingestionServer.sinkS3?.sinkBucket.prefix ?? '';
    } else if (stack._pipeline?.ingestionServer.sinkType == PipelineSinkType.KAFKA) {
      value = `${value}${stack._kafkaTopic}/`;
    }
    validatePattern(key, S3_PREFIX_PATTERN, value);
    return value;
  })
    SourceS3Prefix?: string;

  @JSONObject.required
    SinkS3Bucket?: string;

  @JSONObject.required
  @JSONObject.custom( (_stack:any, key:string, value:string) => {
    validatePattern(key, S3_PREFIX_PATTERN, value);
    return value;
  })
    SinkS3Prefix?: string;

  @JSONObject.required
    PipelineS3Bucket?: string;

  @JSONObject.required
  @JSONObject.custom( (_stack:any, key:string, value:string) => {
    validatePattern(key, S3_PREFIX_PATTERN, value);
    return value;
  })
    PipelineS3Prefix?: string;

  @JSONObject.required
  @JSONObject.optional(72)
  @JSONObject.gt(0)
    DataFreshnessInHour?: number;

  @JSONObject.required
  @JSONObject.custom( (_:any, _key:string, value:string) => {
    validateDataProcessingInterval(value);
    return value;
  })
    ScheduleExpression?: string;

  @JSONObject.optional('')
    TransformerAndEnrichClassNames?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (_:any, _key:string, value:string) => {
    if (value) {
      validatePattern('S3PathPluginJars', S3_PATH_PLUGIN_JARS_PATTERN, value);
    }
    return value;
  })
    S3PathPluginJars?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (_:any, _key:string, value:string) => {
    if (value) {
      validatePattern('S3PathPluginFiles', S3_PATH_PLUGIN_FILES_PATTERN, value);
    }
    return value;
  })
    S3PathPluginFiles?: string;

  @JSONObject.optional('parquet')
    OutputFormat?: string;


  constructor(pipeline: IPipeline, resources: CPipelineResources) {
    const pluginInfo = getPluginInfo(pipeline, resources);

    super({
      _pipeline: pipeline,
      _kafkaTopic: getKafkaTopic(pipeline),

      VpcId: pipeline.network.vpcId,
      PrivateSubnetIds: pipeline.network.privateSubnetIds.join(','),
      ProjectId: pipeline.projectId,
      AppIds: resources.appIds?.join(','),

      SourceS3Bucket: pipeline.dataProcessing?.sourceS3Bucket.name ?? pipeline.bucket.name,
      SourceS3Prefix: getBucketPrefix(pipeline.projectId, BucketPrefix.DATA_BUFFER, pipeline.dataProcessing?.sourceS3Bucket.prefix),
      SinkS3Bucket: pipeline.dataProcessing?.sinkS3Bucket.name ?? pipeline.bucket.name,
      SinkS3Prefix: getBucketPrefix(pipeline.projectId, BucketPrefix.DATA_ODS, pipeline.dataProcessing?.sinkS3Bucket.prefix),

      PipelineS3Bucket: pipeline.dataProcessing?.pipelineBucket.name ?? pipeline.bucket.name,
      PipelineS3Prefix: getBucketPrefix(pipeline.projectId, BucketPrefix.DATA_PIPELINE_TEMP, pipeline.dataProcessing?.pipelineBucket.prefix),
      DataFreshnessInHour: pipeline.dataProcessing?.dataFreshnessInHour,
      ScheduleExpression: pipeline.dataProcessing?.scheduleExpression,

      TransformerAndEnrichClassNames: pluginInfo.transformerAndEnrichClassNames.join(','),
      S3PathPluginJars: pluginInfo.s3PathPluginJars.join(','),
      S3PathPluginFiles: pluginInfo.s3PathPluginFiles.join(','),
      OutputFormat: pipeline.dataProcessing?.outputFormat,
    });
  }

  public parameters() {
    const parameters: Parameter[] = [];
    Object.entries(this).forEach(([k, v]) => {
      if (!k.startsWith('_')) {
        parameters.push({
          ParameterKey: k,
          ParameterValue: v || v===0 ? v.toString() : '',
        });
      }
    });
    return parameters;
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
      'UpsertUsersScheduleExpression',
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

  @JSONObject.required
  @JSONObject.custom( (_:any, key:string, value:any) => {
    validatePattern(key, VPC_ID_PATTERN, value);
    return value;
  })
    VpcId?: string;

  @JSONObject.required
  @JSONObject.custom( (_:any, key:string, value:any) => {
    validatePattern(key, SUBNETS_PATTERN, value);
    return value;
  })
    PrivateSubnetIds?: string;

  @JSONObject.required
    ProjectId?: string;

  @JSONObject.required
    AppIds?: string;

  @JSONObject.required
    ODSEventBucket?: string;

  @JSONObject.required
  @JSONObject.custom( (_stack:any, key:string, value:string) => {
    validatePattern(key, S3_PREFIX_PATTERN, value);
    return value;
  })
    ODSEventPrefix?: string;

  @JSONObject.optional('.snappy.parquet')
    ODSEventFileSuffix?: string;

  @JSONObject.required
    LoadWorkflowBucket?: string;

  @JSONObject.required
  @JSONObject.custom( (_stack:any, key:string, value:string) => {
    validatePattern(key, S3_PREFIX_PATTERN, value);
    return value;
  })
    LoadWorkflowBucketPrefix?: string;

  @JSONObject.optional(50)
  @JSONObject.gte(1)
    MaxFilesLimit?: number;

  @JSONObject.optional('cron(0 1 * * ? *)')
  @JSONObject.custom( (_:any, key:string, value:any) => {
    validatePattern(key, SCHEDULE_EXPRESSION_PATTERN, value);
    return value;
  })
    UpsertUsersScheduleExpression?: string;

  @JSONObject.optional('cron(0 1 * * ? *)')
  @JSONObject.custom( (stack :CDataModelingStack, key:string, value:any) => {
    value = stack._pipeline?.dataProcessing?.scheduleExpression;
    validatePattern(key, SCHEDULE_EXPRESSION_PATTERN, value);
    return value;
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
  @JSONObject.custom( (stack :CDataModelingStack, _key:string, value:any) => {
    if (stack._pipeline?.dataModeling?.redshift?.provisioned) {
      return stack._pipeline?.dataModeling?.redshift?.provisioned.clusterIdentifier;
    }
    return value;
  })
    RedshiftClusterIdentifier?: string;

  @JSONObject.optional('')
  @JSONObject.custom( (stack :CDataModelingStack, _key:string, value:any) => {
    if (stack._pipeline?.dataModeling?.redshift?.provisioned) {
      return stack._pipeline?.dataModeling?.redshift?.provisioned.dbUser;
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
    EMRServerlessApplicationId?: string;

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

      VpcId: pipeline.network.vpcId,
      PrivateSubnetIds: pipeline.network.privateSubnetIds.join(','),
      ProjectId: pipeline.projectId,
      AppIds: resources.appIds?.join(','),

      ODSEventBucket: pipeline.dataModeling?.ods?.bucket.name ?? pipeline.bucket.name,
      ODSEventPrefix: getBucketPrefix(pipeline.projectId, BucketPrefix.DATA_ODS, pipeline.dataModeling?.ods?.bucket.prefix),
      ODSEventFileSuffix: pipeline.dataModeling?.ods?.fileSuffix,

      LoadWorkflowBucket: pipeline.dataModeling?.loadWorkflow?.bucket?.name ?? pipeline.bucket.name,
      LoadWorkflowBucketPrefix: getBucketPrefix(pipeline.projectId, BucketPrefix.DATA_ODS, pipeline.dataModeling?.loadWorkflow?.bucket?.prefix),
      MaxFilesLimit: pipeline.dataModeling?.loadWorkflow?.maxFilesLimit,
      UpsertUsersScheduleExpression: pipeline.dataModeling?.upsertUsers.scheduleExpression,

      EMRServerlessApplicationId: getValueFromStackOutputSuffix(
        pipeline,
        PipelineStackType.DATA_PROCESSING,
        OUTPUT_DATA_PROCESSING_EMR_SERVERLESS_APPLICATION_ID_SUFFIX,
      ),

    });
  }

  public parameters() {
    const parameters: Parameter[] = [];
    Object.entries(this).forEach(([k, v]) => {
      if (!k.startsWith('_')) {
        let key = k;
        let value = v.toString();
        if (value.startsWith('#.')) {
          key = `${k}.#`;
        }
        if (value.startsWith('$.')) {
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
}

export class CReportingStack extends JSONObject {

  public static editAllowedList(): string[] {
    const allowedList:string[] = [
      'QuickSightUserParam',
      'RedshiftDBParam',
      'RedShiftDBSchemaParam',
      'QuickSightVpcConnectionSubnetParam',
      'RedshiftParameterKeyParam',
    ];
    return allowedList;
  }

  @JSONObject.required
    _pipeline?: IPipeline;

  @JSONObject.required
    _resources?: CPipelineResources;

  @JSONObject.required
  @JSONObject.custom( (_:any, key:string, value:any) => {
    validatePattern(key, QUICKSIGHT_USER_NAME_PATTERN, value);
    return value;
  })
    QuickSightUserParam?: string;

  @JSONObject.optional('default')
  @JSONObject.custom( (_:any, key:string, value:any) => {
    validatePattern(key, QUICKSIGHT_NAMESPACE_PATTERN, value);
    return value;
  })
    QuickSightNamespaceParam?: string;

  @JSONObject.required
    QuickSightPrincipalParam?: string;

  @JSONObject.required
    RedshiftDBParam?: string;

  @JSONObject.required
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

  @JSONObject.required
  @JSONObject.custom( (_:any, key:string, value:any) => {
    validatePattern(key, SUBNETS_PATTERN, value);
    return value;
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
    RedshiftParameterKeyParam?: string;

  constructor(pipeline: IPipeline, resources: CPipelineResources) {
    if (!pipeline.dataModeling) {
      throw new ClickStreamBadRequestError('To open a QuickSight report,it must enable the Data Analytics engine first.');
    }

    super({
      _pipeline: pipeline,
      _resources: resources,

      QuickSightUserParam: pipeline.reporting?.quickSight?.user,
      QuickSightNamespaceParam: pipeline.reporting?.quickSight?.namespace,
      QuickSightPrincipalParam: pipeline.reporting?.quickSight?.arn,
      RedshiftDBParam: pipeline.projectId,
      RedShiftDBSchemaParam: resources.appIds?.join(','),
      QuickSightVpcConnectionSubnetParam: resources.quickSightSubnetIds?.join(','),
      RedshiftParameterKeyParam: getValueFromStackOutputSuffix(
        pipeline,
        PipelineStackType.DATA_MODELING_REDSHIFT,
        OUTPUT_DATA_MODELING_REDSHIFT_BI_USER_CREDENTIAL_PARAMETER_SUFFIX,
      ),

    });
  }

  public parameters() {
    const parameters: Parameter[] = [];
    Object.entries(this).forEach(([k, v]) => {
      if (!k.startsWith('_')) {
        let key = k;
        if (v && v.startsWith('#.')) {
          key = `${k}.#`;
        }
        if (v && v.startsWith('$.')) {
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
    });
  }

  public parameters() {
    const parameters: Parameter[] = [];
    Object.entries(this).forEach(([k, v]) => {
      if (!k.startsWith('_')) {
        let key = k;
        if (v && v.startsWith('#.')) {
          key = `${k}.#`;
        }
        if (v && v.startsWith('$.')) {
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
      validatePattern(key, MUTIL_EMAIL_PATTERN, value);
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

  constructor(pipeline: IPipeline, resources: CPipelineResources) {
    const projectEmails = resources.project?.emails?.split(',');
    const operators = pipeline.operator.split(',');
    const emailList = projectEmails?.concat(operators);
    const emails = emailList?.filter(op => isEmail(op));
    const uniqueEmails = [...new Set(emails)];

    super({
      ProjectId: pipeline.projectId,
      Emails: uniqueEmails?.join(','),
    });
  }

  public parameters() {
    const parameters: Parameter[] = [];
    Object.entries(this).forEach(([k, v]) => {
      if (!k.startsWith('_')) {
        parameters.push({
          ParameterKey: k,
          ParameterValue: v || v===0 ? v.toString() : '',
        });
      }
    });
    return parameters;
  }
}

