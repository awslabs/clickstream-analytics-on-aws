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
  Arn,
  ArnFormat,
  NestedStack,
  NestedStackProps,
  Stack,
} from 'aws-cdk-lib';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { StreamMode } from 'aws-cdk-lib/aws-kinesis';
import { LogStream } from 'aws-cdk-lib/aws-logs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { uploadBuiltInFlinkJarsAndFiles } from './common/s3-asset';
import { OnDemandKinesisProps, ProvisionedKinesisProps } from './pipeline/model';
import { StreamingIngestionPipeline } from './pipeline/streaming-ingestion-pipeline';
import { StreamingIngestionRedshiftStack } from './streaming-ingestion-redshift-stack';
import {
  addCfnNagForCfnResource,
  addCfnNagForLogRetention,
  addCfnNagToStack,
  ruleRolePolicyWithWildcardResources,
} from '../common/cfn-nag';

import { createLogGroup } from '../common/logs';
import { REDSHIFT_MODE } from '../common/model';
import { SolutionInfo } from '../common/solution-info';
import { getShortIdOfStack } from '../common/stack';

export interface CreatePipelineNestStackProps {
  projectId: string;
  appIds: string;
  streamingIngestionConfiguration: {
    streamingIngestionRoleArn: string;
  };
  kinesis: {
    kinesisStreamMode: string;
    kinesisShardCount?: number;
    kinesisDataRetentionHours: number;
  };
  pipeline: {
    kinesisSourceStreamName: string;
    parallelism: number;
    parallelismPerKPU: number;
    applicationCodeBucketARN: string;
    applicationCodeBucketPrefix: string;
    securityGroupIds: string;
    subnetIds: string;
    bucket: {
      name: string;
      prefix: string;
    };
  };
  redshift: {
    mode: string;
    defaultDatabaseName: string;
    iamRole: string;
    existingServerless?: {
      workgroupName: string;
      workgroupId?: string;
      namespaceId?: string;
    };
    provisioned?: {
      clusterIdentifier: string;
      dbUser: string;
    };
    associateRoleTimeout: number;
  };
}

export function createPipelineKinesisOnDemandRedshiftServerlessNestStack(
  scope: Construct,
  props: CreatePipelineNestStackProps,
) {
  const p = {
    projectId: props.projectId,
    appIds: props.appIds,
    stackShortId: getShortIdOfStack(Stack.of(scope)),
    startingPosition: 'LATEST',
    dataRetentionHours: props.kinesis.kinesisDataRetentionHours,
    shardCount: props.kinesis.kinesisShardCount,
    kinesisSourceStreamName: props.pipeline.kinesisSourceStreamName,
    parallelism: props.pipeline.parallelism,
    parallelismPerKPU: props.pipeline.parallelismPerKPU,
    applicationCodeBucketARN: props.pipeline.applicationCodeBucketARN,
    applicationCodeBucketPrefix: props.pipeline.applicationCodeBucketPrefix,
    securityGroupIds: props.pipeline.securityGroupIds,
    subnetIds: props.pipeline.subnetIds,
  };
  // ON_DEMAND
  const kinesisOnDemandStack = new StreamingIngestionPipelineNestedStack(
    scope,
    'Kinesis-KinesisOnDemandRedshiftServerlessNestStack',
    {
      ...p,
      streamMode: StreamMode.ON_DEMAND,
    },
  );

  const nestStackProps = {
    projectId: props.projectId,
    appIds: props.appIds,
    streamingIngestionProps: {
      streamingIngestionRoleArn: kinesisOnDemandStack.streamingIngestionAssociateRedshiftRole.roleArn,
    },
    dataAPIRoleArn: props.redshift.iamRole,
    associateRoleTimeout: props.redshift.associateRoleTimeout,
    workflowBucketInfo: {
      s3Bucket: Bucket.fromBucketName(scope, 'PipelineBucket1', props.pipeline.bucket.name),
      prefix: props.pipeline.bucket.prefix,
    },
  };

  const redshiftExistingServerlessStack = new StreamingIngestionRedshiftStack(
    scope,
    REDSHIFT_MODE.SERVERLESS + '-KinesisOnDemandRedshiftServerlessNestStack',
    {
      ...nestStackProps,
      existingRedshiftServerlessProps: {
        databaseName: props.redshift.defaultDatabaseName,
        ...props.redshift.existingServerless!,
        dataAPIRoleArn: props.redshift.iamRole,
        createdInStack: false,
      },
    },
  );
  redshiftExistingServerlessStack.node.addDependency(kinesisOnDemandStack);

  return {
    kinesisOnDemandStack: kinesisOnDemandStack,
    redshiftServerlessStack: redshiftExistingServerlessStack,
  };
}

export function createPipelineKinesisOnDemandRedshiftProvisionedNestStack(
  scope: Construct,
  props: CreatePipelineNestStackProps,
) {
  const p = {
    projectId: props.projectId,
    appIds: props.appIds,
    stackShortId: getShortIdOfStack(Stack.of(scope)),
    startingPosition: 'LATEST',
    dataRetentionHours: props.kinesis.kinesisDataRetentionHours,
    shardCount: props.kinesis.kinesisShardCount,
    kinesisSourceStreamName: props.pipeline.kinesisSourceStreamName,
    parallelism: props.pipeline.parallelism,
    parallelismPerKPU: props.pipeline.parallelismPerKPU,
    applicationCodeBucketARN: props.pipeline.applicationCodeBucketARN,
    applicationCodeBucketPrefix: props.pipeline.applicationCodeBucketPrefix,
    securityGroupIds: props.pipeline.securityGroupIds,
    subnetIds: props.pipeline.subnetIds,
  };
  // ON_DEMAND
  const kinesisOnDemandStack = new StreamingIngestionPipelineNestedStack(
    scope,
    'Kinesis-KinesisOnDemandRedshiftProvisionedNestStack',
    {
      ...p,
      streamMode: StreamMode.ON_DEMAND,
    },
  );

  const nestStackProps = {
    projectId: props.projectId,
    appIds: props.appIds,
    stackShortId: getShortIdOfStack(Stack.of(scope)),
    streamingIngestionProps: {
      streamingIngestionRoleArn: kinesisOnDemandStack.streamingIngestionAssociateRedshiftRole.roleArn,
    },
    dataAPIRoleArn: props.redshift.iamRole,
    associateRoleTimeout: props.redshift.associateRoleTimeout,
    workflowBucketInfo: {
      s3Bucket: Bucket.fromBucketName(scope, 'PipelineBucket2', props.pipeline.bucket.name),
      prefix: props.pipeline.bucket.prefix,
    },
  };

  const redshiftProvisionedStack = new StreamingIngestionRedshiftStack(
    scope,
    REDSHIFT_MODE.PROVISIONED + '-KinesisOnDemandRedshiftProvisionedNestStack',
    {
      ...nestStackProps,
      existingProvisionedRedshiftProps: {
        databaseName: props.redshift.defaultDatabaseName,
        ...props.redshift.provisioned!,
      },
    },
  );
  redshiftProvisionedStack.node.addDependency(kinesisOnDemandStack);

  return {
    kinesisOnDemandStack: kinesisOnDemandStack,
    redshiftProvisionedStack: redshiftProvisionedStack,
  };
}

export function createPipelineKinesisProvisionedRedshiftServerlessNestStack(
  scope: Construct,
  props: CreatePipelineNestStackProps,
) {
  const p = {
    projectId: props.projectId,
    appIds: props.appIds,
    stackShortId: getShortIdOfStack(Stack.of(scope)),
    startingPosition: 'LATEST',
    dataRetentionHours: props.kinesis.kinesisDataRetentionHours,
    shardCount: props.kinesis.kinesisShardCount,
    kinesisSourceStreamName: props.pipeline.kinesisSourceStreamName,
    parallelism: props.pipeline.parallelism,
    parallelismPerKPU: props.pipeline.parallelismPerKPU,
    applicationCodeBucketARN: props.pipeline.applicationCodeBucketARN,
    applicationCodeBucketPrefix: props.pipeline.applicationCodeBucketPrefix,
    securityGroupIds: props.pipeline.securityGroupIds,
    subnetIds: props.pipeline.subnetIds,
  };
  // PROVISIONED
  const kinesisProvisionedStack = new StreamingIngestionPipelineNestedStack(
    scope,
    'Kinesis-KinesisProvisionedRedshiftServerlessNestStack',
    {
      ...p,
      streamMode: StreamMode.PROVISIONED,
      shardCount: props.kinesis.kinesisShardCount,
    },
  );

  const nestStackProps = {
    projectId: props.projectId,
    appIds: props.appIds,
    streamingIngestionProps: {
      streamingIngestionRoleArn: kinesisProvisionedStack.streamingIngestionAssociateRedshiftRole.roleArn,
    },
    dataAPIRoleArn: props.redshift.iamRole,
    associateRoleTimeout: props.redshift.associateRoleTimeout,
    workflowBucketInfo: {
      s3Bucket: Bucket.fromBucketName(scope, 'PipelineBucket3', props.pipeline.bucket.name),
      prefix: props.pipeline.bucket.prefix,
    },
  };

  const redshiftExistingServerlessStack = new StreamingIngestionRedshiftStack(
    scope,
    REDSHIFT_MODE.SERVERLESS + 'KinesisProvisionedRedshiftServerlessNestStack',
    {
      ...nestStackProps,
      existingRedshiftServerlessProps: {
        databaseName: props.redshift.defaultDatabaseName,
        ...props.redshift.existingServerless!,
        dataAPIRoleArn: props.redshift.iamRole,
        createdInStack: false,
      },
    },
  );
  redshiftExistingServerlessStack.node.addDependency(kinesisProvisionedStack);

  return {
    kinesisProvisionedStack: kinesisProvisionedStack,
    redshiftServerlessStack: redshiftExistingServerlessStack,
  };
}

export function createPipelineKinesisProvisionedRedshiftProvisionedNestStack(
  scope: Construct,
  props: CreatePipelineNestStackProps,
) {
  const p = {
    projectId: props.projectId,
    appIds: props.appIds,
    stackShortId: getShortIdOfStack(Stack.of(scope)),
    startingPosition: 'LATEST',
    dataRetentionHours: props.kinesis.kinesisDataRetentionHours,
    shardCount: props.kinesis.kinesisShardCount,
    kinesisSourceStreamName: props.pipeline.kinesisSourceStreamName,
    parallelism: props.pipeline.parallelism,
    parallelismPerKPU: props.pipeline.parallelismPerKPU,
    applicationCodeBucketARN: props.pipeline.applicationCodeBucketARN,
    applicationCodeBucketPrefix: props.pipeline.applicationCodeBucketPrefix,
    securityGroupIds: props.pipeline.securityGroupIds,
    subnetIds: props.pipeline.subnetIds,
  };
  // PROVISIONED
  const kinesisProvisionedStack = new StreamingIngestionPipelineNestedStack(
    scope,
    'Kinesis-KinesisProvisionedRedshiftProvisionedNestStack',
    {
      ...p,
      streamMode: StreamMode.PROVISIONED,
      shardCount: props.kinesis.kinesisShardCount,
    },
  );

  const nestStackProps = {
    projectId: props.projectId,
    appIds: props.appIds,
    streamingIngestionProps: {
      streamingIngestionRoleArn: kinesisProvisionedStack.streamingIngestionAssociateRedshiftRole.roleArn,
    },
    dataAPIRoleArn: props.redshift.iamRole,
    associateRoleTimeout: props.redshift.associateRoleTimeout,
    workflowBucketInfo: {
      s3Bucket: Bucket.fromBucketName(scope, 'PipelineBucket4', props.pipeline.bucket.name),
      prefix: props.pipeline.bucket.prefix,
    },
  };

  const redshiftProvisionedStack = new StreamingIngestionRedshiftStack(
    scope,
    REDSHIFT_MODE.PROVISIONED + 'KinesisProvisionedRedshiftProvisionedNestStack',
    {
      ...nestStackProps,
      existingProvisionedRedshiftProps: {
        databaseName: props.redshift.defaultDatabaseName,
        ...props.redshift.provisioned!,
      },
    },
  );
  redshiftProvisionedStack.node.addDependency(kinesisProvisionedStack);

  return {
    kinesisProvisionedStack: kinesisProvisionedStack,
    redshiftProvisionedStack: redshiftProvisionedStack,
  };
}

interface StreamingIngestionPipelineStackNestStackProps extends NestedStackProps {
  projectId: string;
  appIds: string;
  stackShortId: string;
  streamMode: StreamMode;
  startingPosition: string;
  dataRetentionHours: number;
  shardCount?: number;
  kinesisSourceStreamName: string;
  parallelism: number;
  parallelismPerKPU: number;
  applicationCodeBucketARN: string;
  applicationCodeBucketPrefix: string;
  securityGroupIds: string;
  subnetIds: string;
}

export class StreamingIngestionPipelineNestedStack extends NestedStack {
  readonly streamingIngestionAssociateRedshiftRole: IRole;
  constructor(
    scope: Construct,
    id: string,
    props: StreamingIngestionPipelineStackNestStackProps,
  ) {
    super(scope, id, props);

    const featureName = `Streaming-Ingestion-Pipeline-${id}`;

    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}-sik) ${SolutionInfo.SOLUTION_NAME} - ${featureName} ${SolutionInfo.SOLUTION_VERSION_DETAIL}`;

    const bucket = Bucket.fromBucketArn(this, 'applicationCodeBucketARN', props.applicationCodeBucketARN);
    const applicationCodeFile = uploadBuiltInFlinkJarsAndFiles(this, bucket, props.applicationCodeBucketPrefix);

    const streamingIngestionPipelineLogGroup = createLogGroup(this, {
      prefix: '/aws/vendedlogs/states/Clickstream/StreamingIngestionPipeline',
    });
    const streamingIngestionPipelineLogStream = new LogStream(this, 'streamingIngestionPipelineLogStream', {
      logGroup: streamingIngestionPipelineLogGroup,
      logStreamName: 'streaming-ingestion-pipeline-log-stream-'+props.stackShortId,
    });
    const streamingIngestionPipelineLogStreamArn = Arn.format({
      service: 'logs',
      resource: `log-group:${streamingIngestionPipelineLogGroup.logGroupName}:log-stream:${streamingIngestionPipelineLogStream.logStreamName}`,
      arnFormat: ArnFormat.COLON_RESOURCE_NAME,
    }, Stack.of(this));

    let pipeline;
    if (props.streamMode == StreamMode.ON_DEMAND) {
      const onDemandKinesisProps: OnDemandKinesisProps = {
        dataRetentionHours: props.dataRetentionHours,
      };
      pipeline = new StreamingIngestionPipeline(this, 'StreamingIngestionPipelineOnDemand', {
        projectId: props.projectId,
        appIds: props.appIds,
        stackShortId: props.stackShortId,
        streamMode: props.streamMode,
        startingPosition: props.startingPosition,
        onDemandKinesisProps: onDemandKinesisProps,
        kinesisSourceStreamName: props.kinesisSourceStreamName,
        parallelism: props.parallelism,
        parallelismPerKPU: props.parallelismPerKPU,
        applicationCodeBucketARN: props.applicationCodeBucketARN,
        applicationCodeFileKey: applicationCodeFile.s3KeyFile,
        securityGroupIds: props.securityGroupIds,
        subnetIds: props.subnetIds,
        logStreamArn: streamingIngestionPipelineLogStreamArn,
      });
    } else {
      const provisionedKinesisProps: ProvisionedKinesisProps = {
        dataRetentionHours: props.dataRetentionHours,
        shardCount: props.shardCount!,
      };
      pipeline = new StreamingIngestionPipeline(this, 'StreamingIngestionPipelineProvisioned', {
        projectId: props.projectId,
        appIds: props.appIds,
        stackShortId: props.stackShortId,
        streamMode: props.streamMode,
        startingPosition: props.startingPosition,
        provisionedKinesisProps: provisionedKinesisProps,
        kinesisSourceStreamName: props.kinesisSourceStreamName,
        parallelism: props.parallelism,
        parallelismPerKPU: props.parallelismPerKPU,
        applicationCodeBucketARN: props.applicationCodeBucketARN,
        applicationCodeFileKey: applicationCodeFile.s3KeyFile,
        securityGroupIds: props.securityGroupIds,
        subnetIds: props.subnetIds,
        logStreamArn: streamingIngestionPipelineLogStreamArn,
      });
    }
    this.streamingIngestionAssociateRedshiftRole = pipeline.streamingIngestionAssociateRedshiftRole;

    addCdkNagToStack(this);
    addCfnNag(this);
  }
}

export function addCdkNagToStack(stack: Stack) {
  NagSuppressions.addStackSuppressions(stack, [
    {
      id: 'AwsSolutions-IAM4',
      reason:
        'LogRetention lambda role which are created by CDK uses AWSLambdaBasicExecutionRole',
    },
    {
      id: 'AwsSolutions-IAM5',
      reason:
        'LogRetention lambda policy which are created by CDK contains wildcard permissions',
    },
    {
      id: 'AwsSolutions-L1',
      reason: 'The lambda is created by CDK, CustomResource framework-onEvent',
    },
  ]);
}

function addCfnNag(stack: Stack) {
  const cfnNagList = [
    ruleRolePolicyWithWildcardResources(
      'kinesisDataStreamToS3OnDemand/kinesisToS3LambdaRole/DefaultPolicy/Resource', 'KinesisToS3', 'vpc eni'),
    ruleRolePolicyWithWildcardResources(
      'kinesisDataStreamToS3Provisioned/kinesisToS3LambdaRole/DefaultPolicy/Resource', 'KinesisToS3', 'vpc eni'),
    {
      paths_endswith: ['StreamingIngestionPipelineRole/Resource'],
      rules_to_suppress: [
        {
          id: 'F38',
          reason:
            'When adding the IAM roles of streaming ingestion application, we have to PassRole to existing undeterministical roles associated.',
        },
        {
          id: 'W11',
          reason: 'When adding the IAM roles of streaming ingestion application, we have to PassRole to existing undeterministical roles associated.',
        },
      ],
    },
    // ruleForLambdaVPCAndReservedConcurrentExecutions(
    //   'CreateApplicationSchemas/CreateSchemaForApplicationsFn/Resource', 'CreateApplicationSchemas'),
  ];
  addCfnNagForLogRetention(stack);
  addCfnNagToStack(stack, cfnNagList);
  addCfnNagForCfnResource(stack, 'CDK built-in BucketDeployment', 'Custom::CDKBucketDeployment.*', 'streaming-ingestion', []);
  addCfnNagForCfnResource(stack, 'CreateStreamingIngestionPipelineFn', 'CreateStreamingIngestionPipelineFn', 'streaming-ingestion', []);
  addCfnNagForCfnResource(stack, 'StreamingIngestionPipelineOnDemandCreateStreamingIngestionKinesisCustomResourceProvider', 'CreateStreamingIngestionKinesisCustomResourceProvider/framework-onEvent', 'streaming-ingestion', []);
}