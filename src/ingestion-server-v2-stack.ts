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
import { Stream } from 'aws-cdk-lib/aws-kinesis';
import { Construct } from 'constructs';
import { RolePermissionBoundaryAspect } from './common/aspects';
import { OUTPUT_INGESTION_SERVER_URL_SUFFIX, OUTPUT_INGESTION_SERVER_DNS_SUFFIX } from './common/constant';
import { Parameters } from './common/parameters';
import { SolutionInfo } from './common/solution-info';
import { associateApplicationWithStack } from './common/stack';
import { getALBSubnetsCondtion } from './common/vpc-utils';
import { createKinesisNestStack } from './ingestion-server/kinesis-data-stream/kinesis-data-stream-nested-stack';
import { createV2StackParameters } from './ingestion-server/server/parameter';
import { addCfnNagToIngestionServer } from './ingestion-server/server/private/cfn-nag';
import {
  createKinesisConditionsV2,
  createS3ConditionsV2,
  createMskConditionsV2,
  createECSTypeCondition,
} from './ingestion-server/server-v2/condition-v2';
import {
  IngestionServerV2,
  IngestionServerV2Props,
  Ec2FleetProps,
  FargateFleetProps,
} from './ingestion-server/server-v2/ingestion-server-v2';
import {
  createCommonResources,
} from './ingestion-server-stack';
import {
  IngestionCommonResourcesNestedStack,
} from './ingestion-server/common-resources/ingestion-common-resources-nested-stack';

export interface IngestionServerV2NestStackProps extends StackProps {
  readonly vpcId: string;
  readonly publicSubnetIds: string;
  readonly privateSubnetIds: string;

  readonly serverMin: number;
  readonly serverMax: number;
  readonly warmPoolSize: number;
  readonly scaleOnCpuUtilizationPercent: number;
  readonly workerStopTimeout: number;

  readonly serverEndpointPath: string;
  readonly serverCorsOrigin: string;
  readonly protocol: string;
  readonly domainName: string;
  readonly certificateArn: string;
  readonly notificationsTopicArn?: string;
  readonly enableApplicationLoadBalancerAccessLog?: string;
  readonly logBucketName?: string;
  readonly logPrefix?: string;
  readonly enableGlobalAccelerator: string;
  readonly devMode: string;
  readonly projectId: string;
  readonly appIds: string;
  readonly clickStreamSDK: string;

  readonly ecsInfraType: string;
  readonly ecsSecurityGroupArn: string;
  readonly albTargetGroupArn: string;
  readonly loadBalancerFullName: string;


  // authentication parameters
  readonly enableAuthentication?: string;
  readonly authenticationSecretArn?: string;

  // Kafka parameters
  readonly kafkaBrokers?: string;
  readonly kafkaTopic?: string;
  readonly mskSecurityGroupId?: string;
  readonly mskClusterName?: string;

  // Kinesis parameters
  readonly kinesisDataStreamArn?: string;

  // S3 parameters
  readonly s3BucketName?: string;
  readonly s3Prefix?: string;
  readonly batchTimeout?: number;
  readonly batchMaxBytes?: number;

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

    const { vpc, kafkaSinkConfig, kinesisSinkConfig, s3SinkConfig } = createCommonResources(this, props);

    const isPrivateSubnetsCondition = getALBSubnetsCondtion(this, props.publicSubnetIds, props.privateSubnetIds);

    const ec2FleetCommonProps = {
      workerCpu: 1792,
      proxyCpu: 256,
      instanceType: new InstanceType('c6i.large'),
      isArm: false,
      warmPoolSize: 0,
      proxyReservedMemory: 900,
      workerReservedMemory: 900,
      proxyMaxConnections: 1024,
      workerThreads: 6,
      workerStreamAckEnable: true,
    };

    const ec2FleetProps: Ec2FleetProps = {
      ...ec2FleetCommonProps,
      serverMin: props.serverMin,
      serverMax: props.serverMax,
      warmPoolSize: props.warmPoolSize,
      taskMin: props.serverMin,
      taskMax: props.serverMax,
      scaleOnCpuUtilizationPercent: props.scaleOnCpuUtilizationPercent,
    }; 
    
    const fargateFleetCommonProps = {
      taskCpu: 256,
      taskMemory: 512,
      workerCpu: 128,
      workerMemory: 256,
      proxyCpu: 128,
      proxyMemory: 256,
      isArm: false,
      proxyMaxConnections: 1024,
      workerThreads: 6,
      workerStreamAckEnable: true,
    };

    const fargateFleetProps: FargateFleetProps = {
      ...fargateFleetCommonProps,
      taskMin: props.serverMin,
      taskMax: props.serverMax,
      scaleOnCpuUtilizationPercent: props.scaleOnCpuUtilizationPercent,
    };

    const serverProps: IngestionServerV2Props = {
      vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
      privateSubnets: props.privateSubnetIds,
      publicSubnets: props.publicSubnetIds,
      isPrivateSubnetsCondition,
      ec2FleetProps,
      fargateFleetProps,
      serverEndpointPath: props.serverEndpointPath,
      serverCorsOrigin: props.serverCorsOrigin,
      domainName: props.domainName,
      certificateArn: props.certificateArn,
      s3SinkConfig,
      kinesisSinkConfig,
      kafkaSinkConfig,
      enableGlobalAccelerator: props.enableGlobalAccelerator,
      devMode: props.devMode,
      projectId: props.projectId,
      appIds: props.appIds,
      clickStreamSDK: props.clickStreamSDK,
      workerStopTimeout: props.workerStopTimeout,
      protocol: props.protocol,
      enableApplicationLoadBalancerAccessLog: props.enableApplicationLoadBalancerAccessLog || 'No',
      logBucketName: props.logBucketName || '',
      logPrefix: props.logPrefix || '',

      notificationsTopicArn: props.notificationsTopicArn || '',

      enableAuthentication: props.enableAuthentication || 'No',
      authenticationSecretArn: props.authenticationSecretArn || '',
      ecsInfraType: props.ecsInfraType,
      albTargetGroupArn: props.albTargetGroupArn,
      loadBalancerFullName: props.loadBalancerFullName,
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

    if (kinesisParams) {
      this.kinesisNestedStacks = createKinesisNestStack(this, {
        projectIdParam,
        vpcIdParam,
        privateSubnetIdsParam,
        kinesisParams,
        sinkType,
      });
    }

    const ingestionCommonResourcesNestStack = new IngestionCommonResourcesNestedStack(this, 'IngestionCommonResources', {
      vpcId: vpcIdParam.valueAsString,
      privateSubnetIds: privateSubnetIdsParam.valueAsString,
      publicSubnetIds: publicSubnetIdsParam!.valueAsString,
      serverEndpointPath: serverEndpointPathParam.valueAsString,
      protocol: protocolParam.valueAsString,
      enableAuthentication: enableAuthenticationParam.valueAsString,
      certificateArn: certificateArnParam.valueAsString,
      domainName: domainNameParam.valueAsString,
      enableApplicationLoadBalancerAccessLog: enableApplicationLoadBalancerAccessLogParam.valueAsString,
      logBucketName: logS3BucketParam.valueAsString,
      logPrefix: logS3PrefixParam.valueAsString,
      appIds: appIdsParam.valueAsString,
      clickStreamSDK: clickStreamSDKParam.valueAsString,
      authenticationSecretArn: authenticationSecretArnParam.valueAsString,
      enableGlobalAccelerator: enableGlobalAcceleratorParam.valueAsString,
    });

    const nestStackCommonProps: IngestionServerV2NestStackProps = {
      vpcId: vpcIdParam.valueAsString,
      privateSubnetIds: privateSubnetIdsParam.valueAsString,
      publicSubnetIds: publicSubnetIdsParam!.valueAsString,
      serverMin: serverMinParam.valueAsNumber,
      serverMax: serverMaxParam.valueAsNumber,
      warmPoolSize: warmPoolSizeParam.valueAsNumber,
      scaleOnCpuUtilizationPercent:
      scaleOnCpuUtilizationPercentParam.valueAsNumber,
      serverEndpointPath: serverEndpointPathParam.valueAsString,
      serverCorsOrigin: serverCorsOriginParam.valueAsString,
      domainName: domainNameParam.valueAsString,
      certificateArn: certificateArnParam.valueAsString,
      protocol: protocolParam.valueAsString,
      enableGlobalAccelerator: enableGlobalAcceleratorParam.valueAsString,
      devMode: devModeParam.valueAsString,
      enableApplicationLoadBalancerAccessLog: enableApplicationLoadBalancerAccessLogParam.valueAsString,
      projectId: projectIdParam.valueAsString,
      clickStreamSDK: clickStreamSDKParam.valueAsString,
      appIds: appIdsParam.valueAsString,
      workerStopTimeout: workerStopTimeoutParam.valueAsNumber,
      logBucketName: logS3BucketParam.valueAsString,
      logPrefix: logS3PrefixParam.valueAsString,
      enableAuthentication: enableAuthenticationParam.valueAsString,
      authenticationSecretArn: authenticationSecretArnParam.valueAsString,
      ecsInfraType: ecsInfraType,
      ecsSecurityGroupArn: ingestionCommonResourcesNestStack.ecsSecurityGroupArn,
      albTargetGroupArn: ingestionCommonResourcesNestStack.albTargetArn,
      loadBalancerFullName: ingestionCommonResourcesNestStack.loadBalancerFullName,
    };

    const dataBufferPropsAndConditions: any[] = [];

    const ecsInfraConditions = createECSTypeCondition(this, ecsInfraType);

    // S3
    const s3ConditionsAndProps = createS3ConditionsV2(this, {
      sinkType,
      ecsInfraConditions,
    });
    const s3NestStackProps = {
      ...nestStackCommonProps,
      s3BucketName: s3Params.s3DataBucketParam.valueAsString,
      s3Prefix: s3Params.s3DataPrefixParam.valueAsString,
      batchMaxBytes: s3Params.s3BatchMaxBytesParam.valueAsNumber,
      batchTimeout: s3Params.s3BatchTimeoutParam.valueAsNumber,
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
    let mskNestStackProps = {
      ...nestStackCommonProps,
      kafkaBrokers: kafkaParams.kafkaBrokersParam.valueAsString,
      kafkaTopic: kafkaParams.kafkaTopicParam.valueAsString,
    };
    const mskConditionsAndProps = createMskConditionsV2(this, { ...kafkaParams, sinkType, ecsInfraConditions });
    mskConditionsAndProps.forEach((mskConditionAndProps) => {
      mskNestStackProps = {
        ...mskNestStackProps,
        ecsInfraType: mskConditionAndProps.ecsInfraType,
        mskClusterName: mskConditionAndProps.serverProps.mskClusterName,
        mskSecurityGroupId: mskConditionAndProps.serverProps.mskSecurityGroupId,
      };
      dataBufferPropsAndConditions.push({
        nestStackProps: mskNestStackProps,
        conditions: mskConditionAndProps.conditions,
        conditionName: mskConditionAndProps.name,
      });
    });

    // Kinesis
    if (this.kinesisNestedStacks) {
      let kinesisNestStackProps = {
        ...nestStackCommonProps,
      };
      const kinesisConditionsAndProps = createKinesisConditionsV2(this.kinesisNestedStacks, ecsInfraConditions);
      kinesisConditionsAndProps.forEach((kinesisConditionAndProps) => {
        kinesisNestStackProps = {
          ...kinesisNestStackProps,
          ecsInfraType: kinesisConditionAndProps.ecsInfraType,
          kinesisDataStreamArn: kinesisConditionAndProps.serverProps.kinesisDataStreamArn,
        };
        dataBufferPropsAndConditions.push({
          nestStackProps: kinesisNestStackProps,
          conditions: kinesisConditionAndProps.conditions,
          conditionName: kinesisConditionAndProps.name,
        });
      });
    }

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

    const ingestionServerDNS = (ingestionCommonResourcesNestStack.nestedStackResource as CfnStack).getAtt('Outputs.ingestionServerDNS').toString();
    const ingestionServerUrl = (ingestionCommonResourcesNestStack.nestedStackResource as CfnStack).getAtt('Outputs.ingestionServerUrl').toString();
  
    new CfnOutput(this, id + OUTPUT_INGESTION_SERVER_DNS_SUFFIX, {
      value: ingestionServerDNS,
      description: 'Server DNS',
    });
  
    new CfnOutput(this, id + OUTPUT_INGESTION_SERVER_URL_SUFFIX, {
      value: ingestionServerUrl,
      description: 'Server URL',
    });

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
      value: props.kinesisDataStreamArn || '',
      description: 'Kinesis Arn',
    });
    kdsOutput.condition = condition;
  }

  return ingestionServer;
}
