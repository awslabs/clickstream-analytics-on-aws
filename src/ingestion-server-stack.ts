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
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { SolutionInfo } from './common/solution-info';
import { createKinesisNestStack } from './ingestion-server/kinesis-data-stream/kinesis-data-stream-nested-stack';
import { createStackConditions, getServerPropsByCondition } from './ingestion-server/server/condition';
import {
  FleetProps,
  IngestionServer,
  IngestionServerProps,
  KinesisSinkConfig,
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
      reason:
        'The SNS Topic is set by cfnParameter, not created in this stack',
    },
    {
      id: 'AwsSolutions-SNS3',
      reason:
        'The SNS Topic is set by cfnParameter, not created in this stack',
    },
    {
      id: 'AwsSolutions-L1',
      // The non-container Lambda function is not configured to use the latest runtime version
      reason:
        'The lambda is created by CDK, CustomResource framework-onEvent, the runtime version will be upgraded by CDK',
    },
  ]);
}

interface KafkaSinkConfigPlainText {
  readonly kafkaBrokers: string;
  readonly kafkaTopic: string;
  readonly mskSecurityGroupId?: string;
  readonly mskClusterName?: string;
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
  readonly kafkaSinkConfig?: KafkaSinkConfigPlainText;
  readonly hostedZoneId?: string;
  readonly hostedZoneName?: string;
  readonly protocol?: string;
  readonly domainPrefix?: string;
  readonly notificationsTopicArn?: string;
  readonly enableApplicationLoadBalancerAccessLog?: string;
  readonly logBucketName?: string;
  readonly logPrefix?: string;
  readonly kinesisDataStreamArn?: string;
}

export class IngestionServerNestedStack extends NestedStack {
  public serverUrl: string;
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

    let domainZone;
    if (props.hostedZoneId && props.hostedZoneName) {
      domainZone = HostedZone.fromHostedZoneAttributes(
        this,
        'from-hostedZone',
        {
          hostedZoneId: props.hostedZoneId,
          zoneName: props.hostedZoneName,
        },
      );
    }
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

    let mskSecurityGroup;
    if (props.kafkaSinkConfig?.mskSecurityGroupId) {
      mskSecurityGroup = SecurityGroup.fromSecurityGroupId(
        this,
        'from-mskSecurityGroupId',
        props.kafkaSinkConfig?.mskSecurityGroupId,
      );
    }

    let kafkaSinkConfig;
    if (props.kafkaSinkConfig) {
      kafkaSinkConfig = {
        kafkaBrokers: props.kafkaSinkConfig?.kafkaBrokers,
        kafkaTopic: props.kafkaSinkConfig?.kafkaTopic,
        mskClusterName: props.kafkaSinkConfig?.mskClusterName,
        mskSecurityGroup,
      };
    }

    let kinesisSinkConfig: KinesisSinkConfig | undefined;
    if (props.kinesisDataStreamArn) {
      kinesisSinkConfig = {
        kinesisDataStream: Stream.fromStreamArn(this, 'from-kinesis-arn', props.kinesisDataStreamArn),
      };
    }

    let protocol = ApplicationProtocol.HTTP;
    if (props.protocol == 'HTTPS') {
      protocol = ApplicationProtocol.HTTPS;
    }

    let enableApplicationLoadBalancerAccessLog = false;
    if (props.enableApplicationLoadBalancerAccessLog == 'Yes') {
      enableApplicationLoadBalancerAccessLog = true;
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
      loadBalancerLogProps: {
        enableAccessLog: enableApplicationLoadBalancerAccessLog,
        bucket: logBucket,
        prefix: props.logPrefix,
      },
      domainPrefix: props.domainPrefix,
      protocol,
      domainZone,
      notificationsTopic,
      kafkaSinkConfig,
      kinesisSinkConfig,
    };

    const ingestionServer = new IngestionServer(
      this,
      'IngestionServer',
      serverProps,
    );
    new CfnOutput(this, 'ingestionServerUrl', {
      value: ingestionServer.serverUrl,
      description: 'Server Url',
    });
    this.serverUrl = ingestionServer.serverUrl;
    addCdkNagToStack(this);
  }
}

export interface IngestionServerStackProps extends StackProps {}

export class IngestionServerStack extends Stack {
  public kinesisNestedStacks: {
    provisionedStack: NestedStack;
    onDemandStack: NestedStack;
  };

  constructor(
    scope: Construct,
    id: string,
    props: IngestionServerStackProps = {},
  ) {
    super(scope, id, props);

    const featureName = 'IngestionServer';

    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}) ${SolutionInfo.SOLUTION_NAME} - ${featureName} (Version ${SolutionInfo.SOLUTION_VERSION})`;

    const {
      metadata, params: {
        vpcIdParam,
        publicSubnetIdsParam,
        privateSubnetIdsParam,
        hostedZoneIdParam,
        zoneNameParam,
        serverEndpointPathParam,
        serverCorsOriginParam,
        protocolParam,
        enableApplicationLoadBalancerAccessLogParam,
        logS3BucketParam,
        logS3PrefixParam,
        notificationsTopicArnParam,
        sinkToKafkaParam,
        kafkaBrokersParam,
        kafkaTopicParam,
        mskSecurityGroupIdParam,
        mskClusterNameParam,
        domainPrefixParam,
        serverMinParam,
        serverMaxParam,
        warmPoolSizeParam,
        scaleOnCpuUtilizationPercentParam,
        sinkToKinesisParam,
        kinesisDataS3BucketParam,
        kinesisDataS3PrefixParam,
        kinesisStreamModeParam,
        kinesisShardCountParam,
        kinesisDataRetentionHoursParam,
        kinesisBatchSizeParam,
        kinesisMaxBatchingWindowSecondsParam,

      },
    } = createStackParameters(this);

    this.templateOptions.metadata = metadata;

    const kinesisStackInfo = createKinesisNestStack( this,
      {
        vpcIdParam,
        privateSubnetIdsParam,
        sinkToKinesisParam,
        kinesisDataS3BucketParam,
        kinesisDataS3PrefixParam,
        kinesisStreamModeParam,
        kinesisShardCountParam,
        kinesisDataRetentionHoursParam,
        kinesisBatchSizeParam,
        kinesisMaxBatchingWindowSecondsParam,
      },
    );

    this.kinesisNestedStacks = kinesisStackInfo;

    const nestStackFullProps: IngestionServerNestStackProps = {
      vpcId: vpcIdParam.valueAsString,
      privateSubnetIds: privateSubnetIdsParam.valueAsString,
      publicSubnetIds: publicSubnetIdsParam!.valueAsString,
      serverMin: serverMinParam.valueAsNumber,
      serverMax: serverMaxParam.valueAsNumber,
      warmPoolSize: warmPoolSizeParam.valueAsNumber,
      scaleOnCpuUtilizationPercent: scaleOnCpuUtilizationPercentParam.valueAsNumber,

      serverEndpointPath: serverEndpointPathParam.valueAsString,
      serverCorsOrigin: serverCorsOriginParam.valueAsString,

      protocol: 'HTTPS',
      enableApplicationLoadBalancerAccessLog: 'Yes',

      domainPrefix: domainPrefixParam.valueAsString,
      notificationsTopicArn: notificationsTopicArnParam.valueAsString,
      logBucketName: logS3BucketParam.valueAsString,
      logPrefix: logS3PrefixParam.valueAsString,
      hostedZoneId: hostedZoneIdParam.valueAsString,
      hostedZoneName: zoneNameParam.valueAsString,
      kafkaSinkConfig: {
        kafkaBrokers: kafkaBrokersParam.valueAsString,
        kafkaTopic: kafkaTopicParam.valueAsString,
        mskClusterName: mskClusterNameParam.valueAsString,
        mskSecurityGroupId: mskSecurityGroupIdParam.valueAsString,
      },
    };

    const { allConditions, conditionServerPopsConfig } = createStackConditions(
      this,
      kinesisStackInfo,
      {
        enableApplicationLoadBalancerAccessLogParam,
        logS3BucketParam,
        notificationsTopicArnParam,
        mskSecurityGroupIdParam,
        protocolParam,
        sinkToKafkaParam,
        kafkaBrokersParam,
        kafkaTopicParam,
        mskClusterNameParam,
        sinkToKinesisParam,
      });

    let count = 0;
    for (let c of allConditions) {
      count++;
      const serverPropsCondition = getServerPropsByCondition(
        c.conditions,
        conditionServerPopsConfig,
      );

      const conditionExpression = Fn.conditionAnd(...c.conditions);
      const serverNestStackProps = {
        ...nestStackFullProps,
        ...serverPropsCondition,
      };

      createNestedStackWithCondition(
        this,
        `IngestionServer${c.name}`,
        serverNestStackProps,
        conditionExpression,
      );
    }
    console.log('IngestionServer Nested Stack count:' + count);
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

  const outputUrl = new CfnOutput(scope, id + 'ingestionServerUrl', {
    value: ingestionServer.serverUrl,
    description: 'Server Url',
  });
  outputUrl.condition = condition;
}
