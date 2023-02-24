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
  CfnParameter,
  CfnStack,
  Fn,
  NestedStack,
  NestedStackProps,
  Stack,
} from 'aws-cdk-lib';
import { IVpc, Subnet, SubnetSelection, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Stream, StreamMode } from 'aws-cdk-lib/aws-kinesis';
import { StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { addCfnNagFoLogRetention, addCfnNagForCustomResource, addCfnNagToStack, lambdaInVpcRolePolicyRulesToSuppress } from '../../common/cfn-nag';
import { SolutionInfo } from '../../common/solution-info';
import { KinesisDataStreamToS3 } from './kinesis-to-s3';

export interface CreateKinesisNestStackProps {
  vpcIdParam: CfnParameter;
  privateSubnetIdsParam: CfnParameter;
  sinkToKinesisParam: CfnParameter;
  kinesisDataS3BucketParam: CfnParameter;
  kinesisDataS3PrefixParam: CfnParameter;
  kinesisStreamModeParam: CfnParameter;
  kinesisShardCountParam: CfnParameter;
  kinesisDataRetentionHoursParam: CfnParameter;
  kinesisBatchSizeParam: CfnParameter;
  kinesisMaxBatchingWindowSecondsParam: CfnParameter;
}

export function createKinesisNestStack(
  scope: Construct,
  props: CreateKinesisNestStackProps,
) {
  // Vpc
  const vpc = Vpc.fromVpcAttributes(scope, 'from-vpc-for-kinesis', {
    vpcId: props.vpcIdParam.valueAsString,
    availabilityZones: Fn.getAzs(),
    privateSubnetIds: Fn.split(',', props.privateSubnetIdsParam.valueAsString),
  });

  const dataS3Bucket = Bucket.fromBucketName(
    scope,
    'from-kinesis-dataS3Bucket',
    props.kinesisDataS3BucketParam.valueAsString,
  );

  const streamModeStr = props.kinesisStreamModeParam.valueAsString;

  const onDemandStackCondition = new CfnCondition(
    scope,
    'onDemandStackCondition',
    {
      expression: Fn.conditionAnd(
        Fn.conditionEquals(props.sinkToKinesisParam.valueAsString, 'Yes'),
        Fn.conditionEquals(streamModeStr, 'ON_DEMAND'),
      ),
    },
  );

  const provisionedStackCondition = new CfnCondition(
    scope,
    'provisionedStackCondition',
    {
      expression: Fn.conditionAnd(
        Fn.conditionEquals(props.sinkToKinesisParam.valueAsString, 'Yes'),
        Fn.conditionEquals(streamModeStr, 'PROVISIONED'),
      ),
    },
  );

  const batchSize = props.kinesisBatchSizeParam.valueAsNumber;
  const maxBatchingWindowSeconds =
    props.kinesisMaxBatchingWindowSecondsParam.valueAsNumber;
  const shardCount = props.kinesisShardCountParam.valueAsNumber;

  const subnetSelection: SubnetSelection = {
    subnets: [
      Subnet.fromSubnetId(scope, 'from-kinesis-subnet-id-1', Fn.select(0, Fn.split(',', props.privateSubnetIdsParam.valueAsString))),
      Subnet.fromSubnetId(scope, 'from-kinesis-subnet-id-2', Fn.select(1, Fn.split(',', props.privateSubnetIdsParam.valueAsString))),
    ],
  };

  const p = {
    vpc,
    subnetSelection,
    dataRetentionHours: props.kinesisDataRetentionHoursParam.valueAsNumber,
    s3DataBucket: dataS3Bucket,
    s3DataPrefix: props.kinesisDataS3PrefixParam.valueAsString,
    batchSize,
    maxBatchingWindowSeconds,
    startingPosition: StartingPosition.LATEST,
  };


  // ON_DEMAND
  const onDemandStack = new KinesisDataStreamToS3NestedStack(
    scope,
    'kinesisDataStreamToS3OnDemand',
    {
      ...p,
      streamMode: StreamMode.ON_DEMAND,
    },
  );

  (onDemandStack.nestedStackResource as CfnStack).cfnOptions.condition =
    onDemandStackCondition;

  // PROVISIONED
  const provisionedStack = new KinesisDataStreamToS3NestedStack(
    scope,
    'kinesisDataStreamToS3Provisioned',
    {
      ...p,
      streamMode: StreamMode.PROVISIONED,
      shardCount,
    },
  );
  (provisionedStack.nestedStackResource as CfnStack).cfnOptions.condition =
    provisionedStackCondition;

  return {
    provisionedStack,
    onDemandStack,
    provisionedStackStream: provisionedStack.kinesisDataSteam,
    onDemandStackStream: onDemandStack.kinesisDataSteam,
    provisionedStackCondition,
    onDemandStackCondition,
  };
}

interface KinesisDataStreamToS3StackNestStackProps extends NestedStackProps {
  vpc: IVpc;
  subnetSelection: SubnetSelection;
  streamMode: StreamMode;
  dataRetentionHours: number;
  shardCount?: number;
  s3DataBucket: IBucket;
  s3DataPrefix: string;
  batchSize: number;
  maxBatchingWindowSeconds: number;
  startingPosition: StartingPosition;
}

export class KinesisDataStreamToS3NestedStack extends NestedStack {
  public kinesisDataSteam: Stream;
  constructor(
    scope: Construct,
    id: string,
    props: KinesisDataStreamToS3StackNestStackProps,
  ) {
    super(scope, id, props);

    const featureName = 'KinesisDataStreamToS3-' + props.streamMode;

    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}) ${SolutionInfo.SOLUTION_NAME} - ${featureName} (Version ${SolutionInfo.SOLUTION_VERSION})`;

    const kdsToS3 = new KinesisDataStreamToS3(this, 'KinesisDataStreamToS3', {
      ...props,
    });
    this.kinesisDataSteam = kdsToS3.kinesisDataSteam;
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
    {
      paths_endswith: [
        'kinesisDataStreamToS3OnDemand/kinesisToS3LambdaRole/DefaultPolicy/Resource',
        'kinesisDataStreamToS3Provisioned/kinesisToS3LambdaRole/DefaultPolicy/Resource',
      ],
      rules_to_suppress: lambdaInVpcRolePolicyRulesToSuppress(),
    },
  ];
  addCfnNagFoLogRetention(stack);
  addCfnNagForCustomResource(stack);
  addCfnNagToStack(stack, cfnNagList);
}
