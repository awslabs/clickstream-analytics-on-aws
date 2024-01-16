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
  SubnetType,
  SecurityGroup,
} from 'aws-cdk-lib/aws-ec2';
import { Stream } from 'aws-cdk-lib/aws-kinesis';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { OUTPUT_INGESTION_SERVER_DNS_SUFFIX, OUTPUT_INGESTION_SERVER_URL_SUFFIX } from './common/constant';
import { SolutionInfo } from './common/solution-info';
import { associateApplicationWithStack } from './common/stack';
import { getExistVpc } from './common/vpc-utils';
import { createKinesisNestStack } from './ingestion-server/kinesis-data-stream/kinesis-data-stream-nested-stack';
import { createStackParameters } from './ingestion-server/server/parameter';
import { addCfnNagToIngestionServer } from './ingestion-server/server/private/cfn-nag';
import {
  createKinesisConditionsV2,
  createAlwaysTrueConditionsV2,
  createMskConditionsV2,
} from './ingestion-server/server-v2/condition-v2';
import {
  FleetV2Props,
  IngestionServerV2,
  IngestionServerV2Props,
  S3SinkConfig,
  KinesisSinkConfig,
  KafkaSinkConfig,
} from './ingestion-server/server-v2/ingestion-server-v2';

interface IngestionServerV2NestStackProps extends StackProps {
  readonly vpcId: string;
  readonly publicSubnetIds: string;
  readonly privateSubnetIds: string;

  readonly serverMin: number;
  readonly serverMax: number;
  readonly scaleOnCpuUtilizationPercent: number;
  readonly workerStopTimeout: number;

  readonly serverEndpointPath: string;
  readonly serverCorsOrigin: string;
  readonly protocol: string;
  readonly domainName: string;
  readonly certificateArn: string;
  readonly notificationsTopicArn: string;
  readonly enableApplicationLoadBalancerAccessLog: string;
  readonly logBucketName: string;
  readonly logPrefix: string;
  readonly enableGlobalAccelerator: string;
  readonly devMode: string;
  readonly projectId: string;
  readonly appIds: string;
  readonly clickStreamSDK: string;

  // authentication parameters
  readonly enableAuthentication: string;
  readonly authenticationSecretArn: string;

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
    const featureName = 'IngestionServer ' + id;

    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}-ing) ${SolutionInfo.SOLUTION_NAME} - ${featureName} ${SolutionInfo.SOLUTION_VERSION_DETAIL}`;

    // Vpc
    const vpc = getExistVpc(this, 'from-vpc', {
      vpcId: props.vpcId,
      availabilityZones: Fn.getAzs(),
      publicSubnetIds: Fn.split(',', props.publicSubnetIds),
      privateSubnetIds: Fn.split(',', props.privateSubnetIds),
    });

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

    const fleetProps: FleetV2Props = {
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
      taskMin: props.serverMin,
      taskMax: props.serverMax,
      scaleOnCpuUtilizationPercent: props.scaleOnCpuUtilizationPercent,
    };

    const serverProps: IngestionServerV2Props = {
      vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
      fleetProps,
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
      enableApplicationLoadBalancerAccessLog: props.enableApplicationLoadBalancerAccessLog,
      logBucketName: props.logBucketName,
      logPrefix: props.logPrefix,

      notificationsTopicArn: props.notificationsTopicArn,

      enableAuthentication: props.enableAuthentication,
      authenticationSecretArn: props.authenticationSecretArn,
    };

    const ingestionServer = new IngestionServerV2(
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

    const isHttps = ingestionServer.isHttps;

    new CfnOutput(this, 'ingestionServerUrl', {
      value: Fn.conditionIf(isHttps.logicalId,
        `https://${props.domainName}${props.serverEndpointPath}`,
        `http://${ingestionServerDNS}${props.serverEndpointPath}`).toString(),
      description: 'Server Url',
    });
  }
}

export interface IngestionServerV2StackProps extends StackProps {
  deliverToS3: boolean;
  deliverToKinesis: boolean;
  deliverToKafka: boolean;
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

  constructor(scope: Construct, id: string, props: IngestionServerV2StackProps) {
    super(scope, id, props);

    const featureName = 'IngestionServer';

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
        logS3BucketParam,
        logS3PrefixParam,
        notificationsTopicArnParam,
        serverMinParam,
        serverMaxParam,
        scaleOnCpuUtilizationPercentParam,
        kafkaParams,
        s3Params,
        kinesisParams,
        enableGlobalAcceleratorParam,
        devModeParam,
        projectIdParam,
        appIdsParam,
        clickStreamSDKParam,
        fargateWorkerStopTimeoutParam,
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

    const nestStackCommonProps: IngestionServerV2NestStackProps = {
      vpcId: vpcIdParam.valueAsString,
      privateSubnetIds: privateSubnetIdsParam.valueAsString,
      publicSubnetIds: publicSubnetIdsParam!.valueAsString,
      serverMin: serverMinParam.valueAsNumber,
      serverMax: serverMaxParam.valueAsNumber,
      scaleOnCpuUtilizationPercent:
      scaleOnCpuUtilizationPercentParam.valueAsNumber,
      serverEndpointPath: serverEndpointPathParam.valueAsString,
      serverCorsOrigin: serverCorsOriginParam.valueAsString,
      domainName: domainNameParam.valueAsString,
      certificateArn: certificateArnParam.valueAsString,
      protocol: protocolParam.valueAsString,
      enableGlobalAccelerator: enableGlobalAcceleratorParam.valueAsString,
      devMode: devModeParam.valueAsString,
      notificationsTopicArn: notificationsTopicArnParam.valueAsString,
      enableApplicationLoadBalancerAccessLog: enableApplicationLoadBalancerAccessLogParam.valueAsString,
      projectId: projectIdParam.valueAsString,
      clickStreamSDK: clickStreamSDKParam.valueAsString,
      appIds: appIdsParam.valueAsString,
      workerStopTimeout: fargateWorkerStopTimeoutParam.valueAsNumber,
      logBucketName: logS3BucketParam.valueAsString,
      logPrefix: logS3PrefixParam.valueAsString,
      enableAuthentication: enableAuthenticationParam.valueAsString,
      authenticationSecretArn: authenticationSecretArnParam.valueAsString,
    };

    const dataBufferPropsAndConditions: any[] = [];

    let nestStackProps = { ... nestStackCommonProps };

    if (props.deliverToS3 && s3Params) {
      const s3Condition = createAlwaysTrueConditionsV2(this);
      nestStackProps = {
        ...nestStackProps,
        s3BucketName: s3Params.s3DataBucketParam.valueAsString,
        s3Prefix: s3Params.s3DataPrefixParam.valueAsString,
        batchMaxBytes: s3Params.s3BatchMaxBytesParam.valueAsNumber,
        batchTimeout: s3Params.s3BatchTimeoutParam.valueAsNumber,
      };

      dataBufferPropsAndConditions.push({
        nestStackProps,
        conditions: [s3Condition],
        conditionName: 'C',
      });
    }

    if (props.deliverToKinesis && this.kinesisNestedStacks) {
      const kinesisConditionsAndProps = createKinesisConditionsV2(this.kinesisNestedStacks);
      kinesisConditionsAndProps.forEach((kinesisConditionAndProps) => {
        nestStackProps = {
          ...nestStackProps,
          kinesisDataStreamArn: kinesisConditionAndProps.serverProps.kinesisDataStreamArn,
        };
        dataBufferPropsAndConditions.push({
          nestStackProps,
          conditions: [kinesisConditionAndProps.condition],
          conditionName: kinesisConditionAndProps.name,
        });
      });
    }

    if (props.deliverToKafka && kafkaParams) {
      nestStackProps = {
        ...nestStackProps,
        kafkaBrokers: kafkaParams.kafkaBrokersParam.valueAsString,
        kafkaTopic: kafkaParams.kafkaTopicParam.valueAsString,
      };

      const mskConditionsAndProps = createMskConditionsV2(this, kafkaParams);
      mskConditionsAndProps.forEach((mskConditionAndProps) => {
        nestStackProps = {
          ...nestStackProps,
          mskClusterName: mskConditionAndProps.serverProps.mskClusterName,
          mskSecurityGroupId: mskConditionAndProps.serverProps.mskSecurityGroupId,
        };
        dataBufferPropsAndConditions.push({
          nestStackProps,
          conditions: mskConditionAndProps.conditions,
          conditionName: mskConditionAndProps.name,
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

    // Associate Service Catalog AppRegistry application with stack
    associateApplicationWithStack(this);
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

  if (conditionName == 'K1' || conditionName == 'K2') {
    const kdsOutput = new CfnOutput(scope, id + 'KinesisArn', {
      value: props.kinesisDataStreamArn || '',
      description: 'Kinesis Arn',
    });
    kdsOutput.condition = condition;
  }

  return ingestionServer;
}
