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
} from 'aws-cdk-lib/aws-ec2';
import { Stream } from 'aws-cdk-lib/aws-kinesis';
import { Construct } from 'constructs';
import { OUTPUT_INGESTION_SERVER_DNS_SUFFIX, OUTPUT_INGESTION_SERVER_URL_SUFFIX } from './common/constant';
import { SolutionInfo } from './common/solution-info';
import { associateApplicationWithStack } from './common/stack';
import { createKinesisNestStack } from './ingestion-server/kinesis-data-stream/kinesis-data-stream-nested-stack';
import { createV2StackParameters } from './ingestion-server/server/parameter';
import { addCfnNagToIngestionServer } from './ingestion-server/server/private/cfn-nag';
import {
  createKinesisConditionsV2,
  createS3ConditionsV2,
  createMskConditionsV2,
} from './ingestion-server/server-v2/condition-v2';
import {
  FleetV2Props,
  IngestionServerV2,
  IngestionServerV2Props,
} from './ingestion-server/server-v2/ingestion-server-v2';
import {
  IngestionServerNestStackProps,
  createCommonResources,
} from './ingestion-server-stack';

export class IngestionServerV2NestedStack extends NestedStack {
  constructor(
    scope: Construct,
    id: string,
    props: IngestionServerNestStackProps,
  ) {
    super(scope, id, props);
    const featureName = 'IngestionServerV2 ' + id;

    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}-ing) ${SolutionInfo.SOLUTION_NAME} - ${featureName} ${SolutionInfo.SOLUTION_VERSION_DETAIL}`;

    const { vpc, kafkaSinkConfig, kinesisSinkConfig, s3SinkConfig, debugViewS3SinkConfig } = createCommonResources(this, props);

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
      debugViewS3SinkConfig,
      protocol: props.protocol,
      enableApplicationLoadBalancerAccessLog: props.enableApplicationLoadBalancerAccessLog || 'No',
      logBucketName: props.logBucketName || '',
      logPrefix: props.logPrefix || '',

      notificationsTopicArn: props.notificationsTopicArn || '',

      enableAuthentication: props.enableAuthentication || 'No',
      authenticationSecretArn: props.authenticationSecretArn || '',
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
        notificationsTopicArnParam,
        serverMinParam,
        serverMaxParam,
        scaleOnCpuUtilizationPercentParam,
        kafkaParams,
        s3Params,
        kinesisParams,
        debugViewS3Params,
        sinkTypeParam,
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

    if (kinesisParams) {
      this.kinesisNestedStacks = createKinesisNestStack(this, {
        projectIdParam,
        vpcIdParam,
        privateSubnetIdsParam,
        kinesisParams,
        sinkType,
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
      notificationsTopicArn: notificationsTopicArnParam.valueAsString,
      enableApplicationLoadBalancerAccessLog: enableApplicationLoadBalancerAccessLogParam.valueAsString,
      projectId: projectIdParam.valueAsString,
      clickStreamSDK: clickStreamSDKParam.valueAsString,
      appIds: appIdsParam.valueAsString,
      workerStopTimeout: workerStopTimeoutParam.valueAsNumber,
      debugViewS3BucketName: debugViewS3Params.debugViewS3BucketParam.valueAsString,
      debugViewS3Prefix: debugViewS3Params.debugViewS3PrefixParam.valueAsString,
      debugViewS3BatchTimeout: debugViewS3Params.debugViewS3BatchTimeoutParam.valueAsNumber,
      debugViewS3BatchMaxBytes: debugViewS3Params.debugViewS3BatchMaxBytesParam.valueAsNumber,
      logBucketName: logS3BucketParam.valueAsString,
      logPrefix: logS3PrefixParam.valueAsString,
      enableAuthentication: enableAuthenticationParam.valueAsString,
      authenticationSecretArn: authenticationSecretArnParam.valueAsString,
    };

    const dataBufferPropsAndConditions: any[] = [];

    // S3
    const s3Condition = createS3ConditionsV2(this, {
      sinkType,
    });
    const s3NestStackProps = {
      ...nestStackCommonProps,
      s3BucketName: s3Params.s3DataBucketParam.valueAsString,
      s3Prefix: s3Params.s3DataPrefixParam.valueAsString,
      batchMaxBytes: s3Params.s3BatchMaxBytesParam.valueAsNumber,
      batchTimeout: s3Params.s3BatchTimeoutParam.valueAsNumber,
    };

    dataBufferPropsAndConditions.push({
      nestStackProps: s3NestStackProps,
      conditions: [s3Condition],
      conditionName: 'C',
    });

    // Kafka
    let mskNestStackProps = {
      ...nestStackCommonProps,
      kafkaBrokers: kafkaParams.kafkaBrokersParam.valueAsString,
      kafkaTopic: kafkaParams.kafkaTopicParam.valueAsString,
    };
    const mskConditionsAndProps = createMskConditionsV2(this, { ...kafkaParams, sinkType });
    mskConditionsAndProps.forEach((mskConditionAndProps) => {
      mskNestStackProps = {
        ...mskNestStackProps,
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
      const kinesisConditionsAndProps = createKinesisConditionsV2(this.kinesisNestedStacks);
      kinesisConditionsAndProps.forEach((kinesisConditionAndProps) => {
        kinesisNestStackProps = {
          ...kinesisNestStackProps,
          kinesisDataStreamArn: kinesisConditionAndProps.serverProps.kinesisDataStreamArn,
        };
        dataBufferPropsAndConditions.push({
          nestStackProps: kinesisNestStackProps,
          conditions: [kinesisConditionAndProps.condition],
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

    // Associate Service Catalog AppRegistry application with stack
    associateApplicationWithStack(this);
  }
}

function createNestedStackWithCondition(
  scope: Construct,
  id: string,
  conditionName: string,
  props: IngestionServerNestStackProps,
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
