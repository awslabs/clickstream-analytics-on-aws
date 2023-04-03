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
} from 'aws-cdk-lib';
import {
  InstanceType,
  SecurityGroup,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { ApplicationProtocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Stream } from 'aws-cdk-lib/aws-kinesis';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { SolutionInfo } from './common/solution-info';
import { createKinesisNestStack } from './ingestion-server/kinesis-data-stream/kinesis-data-stream-nested-stack';
import {
  createCommonConditions,
  createKinesisConditions,
  createMskConditions,
  getServerPropsByCondition,
  mergeConditionsAndServerPropsConfig,
} from './ingestion-server/server/condition';
import {
  FleetProps,
  IngestionServer,
  IngestionServerProps,
  KafkaSinkConfig,
  KinesisSinkConfig,
  S3SinkConfig,
} from './ingestion-server/server/ingestion-server';
import { createStackParameters } from './ingestion-server/server/parameter';
import { addCfnNagToIngestionServer } from './ingestion-server/server/private/cfn-nag';

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
      id: 'AwsSolutions-AS3',
      reason: 'notifications configuration for autoscaling group is optional',
    },

    {
      id: 'AwsSolutions-ECS2',
      reason: 'No secret data in environment variables',
    },

    {
      id: 'AwsSolutions-EC23',
      reason: 'The ALB should be public',
    },

    {
      id: 'AwsSolutions-ELB2',
      reason: 'The ALB log is optional',
    },

    {
      id: 'AwsSolutions-S10',
      reason:
        'aws:SecureTransport condition on Amazon S3 bucket policies is already set',
    },

    {
      id: 'AwsSolutions-SNS2',
      reason: 'The SNS Topic is set by cfnParameter, not created in this stack',
    },
    {
      id: 'AwsSolutions-SNS3',
      reason: 'The SNS Topic is set by cfnParameter, not created in this stack',
    },
    {
      id: 'AwsSolutions-L1',
      // The non-container Lambda function is not configured to use the latest runtime version
      reason:
        'The lambda is created by CDK, CustomResource framework-onEvent, the runtime version will be upgraded by CDK',
    },
  ]);
}


interface IngestionServerNestStackProps extends StackProps {
  readonly vpcId: string;
  readonly publicSubnetIds: string;
  readonly privateSubnetIds: string;

  readonly serverMin: number;
  readonly serverMax: number;
  readonly warmPoolSize: number;
  readonly scaleOnCpuUtilizationPercent: number;

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

export class IngestionServerNestedStack extends NestedStack {
  constructor(
    scope: Construct,
    id: string,
    props: IngestionServerNestStackProps,
  ) {
    super(scope, id, props);
    const featureName = 'IngestionServer ' + id;

    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}) ${SolutionInfo.SOLUTION_NAME} - ${featureName} (Version ${SolutionInfo.SOLUTION_VERSION})`;

    // Vpc
    const vpc = Vpc.fromVpcAttributes(this, 'from-vpc', {
      vpcId: props.vpcId,
      availabilityZones: Fn.getAzs(),
      publicSubnetIds: Fn.split(',', props.publicSubnetIds),
      privateSubnetIds: Fn.split(',', props.privateSubnetIds),
    });

    let notificationsTopic;

    if (props.notificationsTopicArn) {
      notificationsTopic = Topic.fromTopicArn(
        this,
        'from-notificationsTopic',
        props.notificationsTopicArn,
      );
    }
    let logBucket;
    if (props.logBucketName) {
      logBucket = Bucket.fromBucketName(
        this,
        'from-logS3Bucket',
        props.logBucketName,
      );
    }


    let kafkaSinkConfig: KafkaSinkConfig | undefined;
    if (props.kafkaBrokers && props.kafkaTopic) {
      let mskSecurityGroup;
      if (props.mskSecurityGroupId) {
        mskSecurityGroup = SecurityGroup.fromSecurityGroupId(
          this,
          'from-mskSecurityGroupId',
          props.mskSecurityGroupId,
        );
      }

      kafkaSinkConfig = {
        kafkaBrokers: props.kafkaBrokers,
        kafkaTopic: props.kafkaTopic,
        mskClusterName: props.mskClusterName,
        mskSecurityGroup,
      };
    }

    let kinesisSinkConfig: KinesisSinkConfig | undefined = undefined;
    if (props.kinesisDataStreamArn) {
      kinesisSinkConfig = {
        kinesisDataStream: Stream.fromStreamArn(
          this,
          'from-kinesis-arn',
          props.kinesisDataStreamArn,
        ),
      };
    }

    let protocol = ApplicationProtocol.HTTP;
    if (props.protocol == 'HTTPS') {
      protocol = ApplicationProtocol.HTTPS;
    }

    let loadBalancerLogProps;
    if (props.enableApplicationLoadBalancerAccessLog == 'Yes') {
      loadBalancerLogProps = {
        enableAccessLog: true,
        bucket: logBucket,
        prefix: props.logPrefix,
      };
    }

    let s3SinkConfig: S3SinkConfig | undefined = undefined;
    if (props.s3BucketName && props.s3Prefix && props.batchMaxBytes && props.batchTimeout) {
      const s3Bucket = Bucket.fromBucketName(
        this,
        'from-s3Bucket',
        props.s3BucketName,
      );
      s3SinkConfig = {
        s3Bucket,
        s3Prefix: props.s3Prefix,
        batchMaxBytes: props.batchMaxBytes,
        batchTimeoutSecs: props.batchTimeout,
      };
    }

    const fleetCommonProps = {
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

    const fleetProps: FleetProps = {
      ...fleetCommonProps,
      serverMin: props.serverMin,
      serverMax: props.serverMax,
      warmPoolSize: props.warmPoolSize,
      taskMin: props.serverMin,
      taskMax: props.serverMax,
      scaleOnCpuUtilizationPercent: props.scaleOnCpuUtilizationPercent,
    };

    const serverProps: IngestionServerProps = {
      vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
      fleetProps,
      serverEndpointPath: props.serverEndpointPath,
      serverCorsOrigin: props.serverCorsOrigin,
      loadBalancerLogProps,
      protocol,
      domainName: props.domainName,
      certificateArn: props.certificateArn,
      notificationsTopic,
      kafkaSinkConfig,
      s3SinkConfig,
      kinesisSinkConfig,
      enableGlobalAccelerator: props.enableGlobalAccelerator,
    };

    const ingestionServer = new IngestionServer(
      this,
      'IngestionServer',
      serverProps,
    );

    const ingestionServerUrl = Fn.conditionIf(
      ingestionServer.acceleratorEnableCondition.logicalId,
      ingestionServer.acceleratorUrl,
      ingestionServer.albUrl).toString();

    new CfnOutput(this, 'ingestionServerUrl', {
      value: ingestionServerUrl,
      description: 'Server Url',
    });

    addCdkNagToStack(this);
  }
}

export interface IngestionServerStackProps extends StackProps {
  deliverToS3: boolean;
  deliverToKinesis: boolean;
  deliverToKafka: boolean;
}

export class IngestionServerStack extends Stack {
  public kinesisNestedStacks:{
    provisionedStack: NestedStack;
    onDemandStack: NestedStack;
    provisionedStackStream: Stream;
    onDemandStackStream: Stream;
    provisionedStackCondition: CfnCondition;
    onDemandStackCondition: CfnCondition;
  } | undefined;

  public nestedStacks: NestedStack[] = [];

  constructor(scope: Construct, id: string, props: IngestionServerStackProps) {
    super(scope, id, props);

    const featureName = 'IngestionServer';

    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}) ${SolutionInfo.SOLUTION_NAME} - ${featureName} (Version ${SolutionInfo.SOLUTION_VERSION})`;

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
        logS3BucketParam,
        logS3PrefixParam,
        notificationsTopicArnParam,
        serverMinParam,
        serverMaxParam,
        warmPoolSizeParam,
        scaleOnCpuUtilizationPercentParam,
        kafkaParams,
        s3Params,
        kinesisParams,
        enableGlobalAcceleratorParam,
      },
    } = createStackParameters(this, props);

    this.templateOptions.metadata = metadata;

    if (kinesisParams) {
      this.kinesisNestedStacks = createKinesisNestStack(this, {
        vpcIdParam,
        privateSubnetIdsParam,
        kinesisParams,
      });
    }

    const nestStackCommonProps: IngestionServerNestStackProps = {
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
    };

    let nestStackProps = { ... nestStackCommonProps };

    if (props.deliverToS3 && s3Params) {
      nestStackProps = {
        ...nestStackProps,
        s3BucketName: s3Params.s3DataBucketParam.valueAsString,
        s3Prefix: s3Params.s3DataPrefixParam.valueAsString,
        batchMaxBytes: s3Params.s3BatchMaxBytesParam.valueAsNumber,
        batchTimeout: s3Params.s3BatchTimeoutParam.valueAsNumber,
      };
    }

    const commonConditionsAndProps = createCommonConditions(this, {
      enableApplicationLoadBalancerAccessLogParam,
      logS3BucketParam,
      logS3PrefixParam,
      notificationsTopicArnParam,
      protocolParam,
      domainNameParam,
      certificateArnParam,
    });
    let stackConditionsAndProps = commonConditionsAndProps;

    if (props.deliverToKinesis && this.kinesisNestedStacks) {
      const kinesisConditionsAndProps = createKinesisConditions(this.kinesisNestedStacks);
      stackConditionsAndProps = mergeConditionsAndServerPropsConfig(kinesisConditionsAndProps, commonConditionsAndProps);
    }

    if (props.deliverToKafka && kafkaParams) {
      nestStackProps = {
        ...nestStackProps,
        kafkaBrokers: kafkaParams.kafkaBrokersParam.valueAsString,
        kafkaTopic: kafkaParams.kafkaTopicParam.valueAsString,

      };

      const mskConditionsAndProps = createMskConditions(this, kafkaParams);
      stackConditionsAndProps = mergeConditionsAndServerPropsConfig(mskConditionsAndProps, commonConditionsAndProps);
    }

    const allConditions = stackConditionsAndProps.conditions;
    const conditionServerPopsConfig = stackConditionsAndProps.serverPropsConfig;

    for (let c of allConditions) {
      const serverPropsCondition = getServerPropsByCondition(
        c.conditions,
        conditionServerPopsConfig,
      );

      const conditionExpression = Fn.conditionAnd(...c.conditions);
      const serverNestStackProps = {
        ...nestStackProps,
        ...serverPropsCondition,
      };

      const nestedId = `IngestionServer${c.name}`;
      const nestedStack = createNestedStackWithCondition(
        this,
        nestedId,
        serverNestStackProps,
        conditionExpression,
      );
      this.nestedStacks.push(nestedStack);
    }

    addCdkNagToStack(this);
  }
}

function createNestedStackWithCondition(
  scope: Construct,
  id: string,
  props: IngestionServerNestStackProps,
  conditionExpression: ICfnConditionExpression,
) {
  const condition = new CfnCondition(scope, id + 'Condition', {
    expression: conditionExpression,
  });

  const ingestionServer = new IngestionServerNestedStack(scope, id, props);
  (ingestionServer.nestedStackResource as CfnStack).cfnOptions.condition =
    condition;

  addCfnNagToIngestionServer(ingestionServer);

  const ingestionServerUrl = (ingestionServer.nestedStackResource as CfnStack).getAtt('Outputs.ingestionServerUrl').toString();

  const output = new CfnOutput(scope, id + 'ingestionServerUrl', {
    value: ingestionServerUrl,
    description: 'Server Url',
  });
  output.condition = condition;
  return ingestionServer;
}
