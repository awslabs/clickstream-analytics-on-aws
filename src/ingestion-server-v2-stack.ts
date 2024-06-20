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
  SolutionInfo,
} from '@aws/clickstream-base-lib';
import {
  CfnCondition,
  CfnOutput,
  CfnStack,
  Fn,
  NestedStack,
  Stack,
  StackProps,
  ICfnConditionExpression,
  Aspects,
} from 'aws-cdk-lib';
import {
  SubnetType,
  InstanceType,
} from 'aws-cdk-lib/aws-ec2';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { Stream } from 'aws-cdk-lib/aws-kinesis';
import { Construct } from 'constructs';
import { RolePermissionBoundaryAspect } from './common/aspects';
import { Parameters } from './common/parameters';
import { associateApplicationWithStack } from './common/stack';
import {
  IngestionCommonResources,
} from './ingestion-server/common-resources/ingestion-common-resources';
import { createKinesisNestStack } from './ingestion-server/kinesis-data-stream/kinesis-data-stream-nested-stack';
import { createV2StackParameters } from './ingestion-server/server/parameter';
import { addCfnNagToIngestionServer, addCfnNagToIngestionCommonResourcesStack } from './ingestion-server/server/private/cfn-nag';
import {
  createKinesisConditions,
  createS3Conditions,
  createMskConditions,
  createECSTypeCondition,
} from './ingestion-server/server-v2/condition';
import {
  IngestionServerV2,
  IngestionServerV2Props,
  FleetProps,
} from './ingestion-server/server-v2/ingestion-server-v2';
import {
  createCommonResources,
} from './ingestion-server-stack';

export interface NetworkProps {
  readonly vpcId: string;
  readonly publicSubnetIds: string;
  readonly privateSubnetIds: string;
};

export interface S3BucketProps {
  readonly bucketName: string;
  readonly prefix: string;
}

export interface KafkaBufferProps {
  readonly kafkaBrokers: string;
  readonly kafkaTopic: string;
  readonly mskSecurityGroupId: string;
  readonly mskClusterName: string;
}

export interface KinesisBufferProps {
  readonly kinesisDataStreamArn: string;
}

export interface S3BufferProps {
  readonly s3Bucket: S3BucketProps;
  readonly batchTimeout: number;
  readonly batchMaxBytes: number;
}

export interface IngestionServerCapability {
  readonly serverMin: number;
  readonly serverMax: number;
  readonly warmPoolSize: number;
  readonly scaleOnCpuUtilizationPercent: number;
  readonly workerStopTimeout: number;
}

export interface LoadBalancerProps {
  readonly albTargetGroupArn: string;
  readonly loadBalancerFullName: string;
}

export interface IngestionAuthenticationProps {
  readonly enableAuthentication: string;
  readonly authenticationSecretArn: string;
}

export interface IngestionServerV2NestStackProps extends StackProps {
  readonly networkProps: NetworkProps;
  readonly serverCapability: IngestionServerCapability;

  readonly serverEndpointPath: string;
  readonly serverCorsOrigin: string;
  readonly protocol: string;
  readonly devMode: string;
  readonly projectId: string;
  readonly appIds: string;

  readonly ecsInfraType: string;
  readonly ecsSecurityGroupArn: string;

  readonly loadBalancerProps: LoadBalancerProps;

  // Kafka parameters
  readonly kafkaBufferProps?: KafkaBufferProps;

  // Kinesis parameters
  readonly kinesisBufferProps?: KinesisBufferProps;

  // S3 parameters
  readonly s3BufferProps?: S3BufferProps;
}

export class IngestionServerV2NestedStack extends NestedStack {
  constructor(
    scope: Construct,
    id: string,
    props: IngestionServerV2NestStackProps,
  ) {
    super(scope, id, props);
    const featureName = 'IngestionServerV2 ' + id;

    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}-ing) ${SolutionInfo.SOLUTION_NAME} - ${featureName} ${SolutionInfo.SOLUTION_VERSION_DETAIL}`;

    const { vpc, kafkaSinkConfig, kinesisSinkConfig, s3SinkConfig } = createCommonResources(this, {
      vpcId: props.networkProps.vpcId,
      publicSubnetIds: props.networkProps.publicSubnetIds,
      privateSubnetIds: props.networkProps.privateSubnetIds,
      kafkaBrokers: props.kafkaBufferProps?.kafkaBrokers,
      kafkaTopic: props.kafkaBufferProps?.kafkaTopic,
      mskSecurityGroupId: props.kafkaBufferProps?.mskSecurityGroupId,
      mskClusterName: props.kafkaBufferProps?.mskClusterName,
      kinesisDataStreamArn: props.kinesisBufferProps?.kinesisDataStreamArn,
      s3BucketName: props.s3BufferProps?.s3Bucket.bucketName,
      s3Prefix: props.s3BufferProps?.s3Bucket.prefix,
      batchMaxBytes: props.s3BufferProps?.batchMaxBytes,
      batchTimeout: props.s3BufferProps?.batchTimeout,
    });

    let fleetProps: FleetProps;
    const commonFleetProps = {
      arch: Platform.LINUX_AMD64,
      proxyMaxConnections: 1024,
      workerThreads: 6,
      workerStreamAckEnable: true,
      taskMin: props.serverCapability.serverMin,
      taskMax: props.serverCapability.serverMax,
      scaleOnCpuUtilizationPercent: props.serverCapability.scaleOnCpuUtilizationPercent,
    };
    if (props.ecsInfraType === 'FARGATE') {
      fleetProps = {
        ...commonFleetProps,
        workerCpu: 128,
        workerMemory: 256,
        proxyCpu: 128,
        proxyMemory: 256,
      };
    } else {
      fleetProps = {
        ...commonFleetProps,
        workerCpu: 1792,
        proxyCpu: 256,
        instanceType: new InstanceType('c6i.large'),
        proxyMemory: 900,
        workerMemory: 900,
        warmPoolSize: props.serverCapability.warmPoolSize,
      };
    }

    const serverProps: IngestionServerV2Props = {
      vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
      fleetProps,
      serverEndpointPath: props.serverEndpointPath,
      serverCorsOrigin: props.serverCorsOrigin,
      s3SinkConfig,
      kinesisSinkConfig,
      kafkaSinkConfig,
      devMode: props.devMode,
      projectId: props.projectId,
      workerStopTimeout: props.serverCapability.workerStopTimeout,

      ecsInfraType: props.ecsInfraType,
      albTargetGroupArn: props.loadBalancerProps.albTargetGroupArn,
      loadBalancerFullName: props.loadBalancerProps.loadBalancerFullName,
      ecsSecurityGroupArn: props.ecsSecurityGroupArn,
    };

    new IngestionServerV2(
      this,
      'IngestionServer',
      serverProps,
    );
  }
}

export class IngestionServerStackV2 extends Stack {
  public kinesisNestedStacks:{
    provisionedStack: NestedStack;
    onDemandStack: NestedStack;
    provisionedStackStream: Stream;
    onDemandStackStream: Stream;
    provisionedStackCondition: CfnCondition;
    onDemandStackCondition: CfnCondition;
  } | undefined;

  public nestedStacks: NestedStack[] = [];

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const featureName = 'IngestionServerV2';

    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}-ing) ${SolutionInfo.SOLUTION_NAME} - ${featureName} ${SolutionInfo.SOLUTION_VERSION_DETAIL}`;

    const {
      metadata,
      params: {
        vpcIdParam,
        publicSubnetIdsParam,
        privateSubnetIdsParam,
        domainNameParam,
        certificateArnParam,
        serverEndpointPathParam,
        serverCorsOriginParam,
        protocolParam,
        enableApplicationLoadBalancerAccessLogParam,
        warmPoolSizeParam,
        logS3BucketParam,
        logS3PrefixParam,
        serverMinParam,
        serverMaxParam,
        scaleOnCpuUtilizationPercentParam,
        kafkaParams,
        s3Params,
        kinesisParams,
        sinkTypeParam,
        ecsInfraTypeParam,
        enableGlobalAcceleratorParam,
        devModeParam,
        projectIdParam,
        appIdsParam,
        clickStreamSDKParam,
        workerStopTimeoutParam,
        enableAuthenticationParam,
        authenticationSecretArnParam,
      },
    } = createV2StackParameters(this);

    this.templateOptions.metadata = metadata;

    const sinkType = sinkTypeParam.valueAsString;

    const ecsInfraType = ecsInfraTypeParam.valueAsString;
    const vpcId = vpcIdParam.valueAsString;
    const publicSubnetIds = publicSubnetIdsParam!.valueAsString;
    const privateSubnetIds = privateSubnetIdsParam.valueAsString;
    const serverEndpointPath = serverEndpointPathParam.valueAsString;
    const serverCorsOrigin = serverCorsOriginParam.valueAsString;
    const protocol = protocolParam.valueAsString;
    const enableGlobalAccelerator = enableGlobalAcceleratorParam.valueAsString;
    const devMode = devModeParam.valueAsString;
    const projectId = projectIdParam.valueAsString;
    const appIds = appIdsParam.valueAsString;
    const clickStreamSDK = clickStreamSDKParam.valueAsString;
    const authenticationProps = {
      enableAuthentication: enableAuthenticationParam.valueAsString,
      authenticationSecretArn: authenticationSecretArnParam.valueAsString,
    };
    const certificateArn = certificateArnParam.valueAsString;
    const domainName = domainNameParam.valueAsString;
    const enableApplicationLoadBalancerAccessLog = enableApplicationLoadBalancerAccessLogParam.valueAsString;
    const logBucket = {
      bucketName: logS3BucketParam.valueAsString,
      prefix: logS3PrefixParam.valueAsString,
    };
    const serverCapability = {
      serverMin: serverMinParam.valueAsNumber,
      serverMax: serverMaxParam.valueAsNumber,
      warmPoolSize: warmPoolSizeParam.valueAsNumber,
      scaleOnCpuUtilizationPercent: scaleOnCpuUtilizationPercentParam.valueAsNumber,
      workerStopTimeout: workerStopTimeoutParam.valueAsNumber,
    };
    const networkProps: NetworkProps ={
      vpcId,
      publicSubnetIds,
      privateSubnetIds,
    };

    this.kinesisNestedStacks = createKinesisNestStack(this, {
      projectIdParam,
      vpcIdParam,
      privateSubnetIdsParam,
      sinkType,
      kinesisParams,
    });

    const ingestionCommonResources = new IngestionCommonResources(this, 'IngestionCommonResources', {
      networkProps,
      serverEndpointPath,
      protocol,
      authenticationProps,
      certificateArn,
      domainName,
      enableApplicationLoadBalancerAccessLog,
      logBucket,
      appIds,
      clickStreamSDK,
      enableGlobalAccelerator,
    });

    addCfnNagToIngestionCommonResourcesStack(this);

    const loadBalancerProps: LoadBalancerProps = {
      albTargetGroupArn: ingestionCommonResources.albTargetArn,
      loadBalancerFullName: ingestionCommonResources.loadBalancerFullName,
    };
    const nestStackCommonProps: IngestionServerV2NestStackProps = {
      networkProps,
      serverCapability,
      serverEndpointPath,
      serverCorsOrigin,
      protocol,
      devMode,
      loadBalancerProps,
      projectId,
      appIds,
      ecsInfraType,
      ecsSecurityGroupArn: ingestionCommonResources.ecsSecurityGroupArn,
    };

    const dataBufferPropsAndConditions: any[] = [];

    const ecsInfraConditions = createECSTypeCondition(this, ecsInfraType);

    // S3
    const s3ConditionsAndProps = createS3Conditions(this, {
      sinkType,
      ecsInfraConditions,
    });
    const s3NestStackProps = {
      ...nestStackCommonProps,
      s3BufferProps: {
        s3Bucket: {
          bucketName: s3Params.s3DataBucketParam.valueAsString,
          prefix: s3Params.s3DataPrefixParam.valueAsString,
        },
        batchMaxBytes: s3Params.s3BatchMaxBytesParam.valueAsNumber,
        batchTimeout: s3Params.s3BatchTimeoutParam.valueAsNumber,
      },
    };

    s3ConditionsAndProps.forEach((s3ConditionAndProps) => {
      dataBufferPropsAndConditions.push({
        nestStackProps: {
          ...s3NestStackProps,
          ecsInfraType: s3ConditionAndProps.ecsInfraType,
        },
        conditions: s3ConditionAndProps.conditions,
        conditionName: s3ConditionAndProps.name,
      });
    });

    // Kafka
    const mskConditionsAndProps = createMskConditions(this, { ...kafkaParams, sinkType, ecsInfraConditions });
    mskConditionsAndProps.forEach((mskConditionAndProps) => {
      const mskNestStackProps = {
        ...nestStackCommonProps,
        ecsInfraType: mskConditionAndProps.ecsInfraType,
        kafkaBufferProps: {
          mskClusterName: mskConditionAndProps.serverProps.mskClusterName,
          mskSecurityGroupId: mskConditionAndProps.serverProps.mskSecurityGroupId,
          kafkaBrokers: kafkaParams.kafkaBrokersParam.valueAsString,
          kafkaTopic: kafkaParams.kafkaTopicParam.valueAsString,
        },
      };
      dataBufferPropsAndConditions.push({
        nestStackProps: mskNestStackProps,
        conditions: mskConditionAndProps.conditions,
        conditionName: mskConditionAndProps.name,
      });
    });

    // Kinesis
    const kinesisConditionsAndProps = createKinesisConditions(this.kinesisNestedStacks, ecsInfraConditions);
    kinesisConditionsAndProps.forEach((kinesisConditionAndProps) => {
      const kinesisNestStackProps = {
        ...nestStackCommonProps,
        ecsInfraType: kinesisConditionAndProps.ecsInfraType,
        kinesisBufferProps: {
          kinesisDataStreamArn: kinesisConditionAndProps.serverProps.kinesisDataStreamArn,
        },
      };
      dataBufferPropsAndConditions.push({
        nestStackProps: kinesisNestStackProps,
        conditions: kinesisConditionAndProps.conditions,
        conditionName: kinesisConditionAndProps.name,
      });
    });

    for (const conditionsAndProps of dataBufferPropsAndConditions) {
      const nestedId = `IngestionServer${conditionsAndProps.conditionName}`;
      const conditionExpression = Fn.conditionAnd(...conditionsAndProps.conditions);
      const nestedStack = createNestedStackWithCondition(
        this,
        nestedId,
        conditionsAndProps.conditionName,
        conditionsAndProps.nestStackProps,
        conditionExpression,
      );
      this.nestedStacks.push(nestedStack);
    }

    // Associate Service Catalog AppRegistry application with stack
    associateApplicationWithStack(this);

    // Add IAM role permission boundary aspect
    const {
      iamRoleBoundaryArnParam,
    } = Parameters.createIAMRolePrefixAndBoundaryParameters(this);
    Aspects.of(this).add(new RolePermissionBoundaryAspect(iamRoleBoundaryArnParam.valueAsString));
  }
}

function createNestedStackWithCondition(
  scope: Construct,
  id: string,
  conditionName: string,
  props: IngestionServerV2NestStackProps,
  conditionExpression: ICfnConditionExpression,
) {
  const condition = new CfnCondition(scope, id + 'Condition', {
    expression: conditionExpression,
  });

  const ingestionServer = new IngestionServerV2NestedStack(scope, id, props);
  (ingestionServer.nestedStackResource as CfnStack).cfnOptions.condition =
  condition;

  addCfnNagToIngestionServer(ingestionServer);

  if (conditionName.endsWith('K1') || conditionName.endsWith('K2')) {
    const kdsOutput = new CfnOutput(scope, id + 'KinesisArn', {
      value: props.kinesisBufferProps?.kinesisDataStreamArn || '',
      description: 'Kinesis Arn',
    });
    kdsOutput.condition = condition;
  }

  return ingestionServer;
}
