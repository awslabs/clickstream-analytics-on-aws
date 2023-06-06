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
import { Construct } from 'constructs';
import { OUTPUT_INGESTION_SERVER_DNS_SUFFIX, OUTPUT_INGESTION_SERVER_URL_SUFFIX } from './common/constant';
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
  readonly devMode: string;
  readonly projectId: string;
  readonly appIds: string;
  readonly clickStreamSDK: string;

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

    let authenticationSecretArn;
    if (props.enableAuthentication == 'Yes') {
      authenticationSecretArn = props.authenticationSecretArn;
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
      devMode: props.devMode,
      authenticationSecretArn,
      projectId: props.projectId,
      appIds: props.appIds,
      clickStreamSDK: props.clickStreamSDK,
    };

    const ingestionServer = new IngestionServer(
      this,
      'IngestionServer',
      serverProps,
    );

    const ingestionServerDNS = Fn.conditionIf(
      ingestionServer.acceleratorEnableCondition.logicalId,
      ingestionServer.acceleratorDNS,
      ingestionServer.albDNS).toString();

    new CfnOutput(this, 'ingestionServerDNS', {
      value: ingestionServerDNS,
      description: 'Server DNS',
    });

    let ingestionServerUrl;
    if (props.protocol === ApplicationProtocol.HTTPS) {
      ingestionServerUrl = `https://${props.domainName}${props.serverEndpointPath}`;
    } else {
      ingestionServerUrl = `http://${ingestionServerDNS}${props.serverEndpointPath}`;
    }

    new CfnOutput(this, 'ingestionServerUrl', {
      value: ingestionServerUrl,
      description: 'Server Url',
    });
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
        devModeParam,
        projectIdParam,
        appIdsParam,
        clickStreamSDKParam,
        enableAuthenticationParam,
        authenticationSecretArnParam,
      },
    } = createStackParameters(this, props);

    this.templateOptions.metadata = metadata;

    if (kinesisParams) {
      this.kinesisNestedStacks = createKinesisNestStack(this, {
        projectIdParam,
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
      devMode: devModeParam.valueAsString,
      projectId: projectIdParam.valueAsString,
      clickStreamSDK: clickStreamSDKParam.valueAsString,
      appIds: appIdsParam.valueAsString,
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
      enableAuthenticationParam,
      authenticationSecretArnParam,
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

  const ingestionServerDNS = (ingestionServer.nestedStackResource as CfnStack).getAtt('Outputs.ingestionServerDNS').toString();
  const ingestionServerUrl = (ingestionServer.nestedStackResource as CfnStack).getAtt('Outputs.ingestionServerUrl').toString();

  const serverDNSOutput = new CfnOutput(scope, id + OUTPUT_INGESTION_SERVER_DNS_SUFFIX, {
    value: ingestionServerDNS,
    description: 'Server DNS',
  });
  serverDNSOutput.condition = condition;

  const serverURLOutput = new CfnOutput(scope, id + OUTPUT_INGESTION_SERVER_URL_SUFFIX, {
    value: ingestionServerUrl,
    description: 'Server URL',
  });
  serverURLOutput.condition = condition;
  return ingestionServer;
}
