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

import { CfnCondition, CfnStack, Fn, NestedStack, NestedStackProps, Stack, StackProps } from 'aws-cdk-lib';
import { SubnetSelection, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import {
  addCfnNagForBucketDeployment,
  addCfnNagForCustomResourceProvider, addCfnNagForLogRetention, addCfnNagToStack, commonCdkNagRules, ruleRolePolicyWithWildcardResources,
} from './common/cfn-nag';
import { SolutionInfo } from './common/solution-info';
import { DataPipelineConstruct, DataPipelineProps } from './data-pipeline/data-pipeline';
import { createStackParameters } from './data-pipeline/parameter';

export interface ETLStackProps extends StackProps {
}

export class DataPipelineStack extends Stack {
  public nestedStacks: NestedStack[] = [];

  constructor(scope: Construct, id: string, props: ETLStackProps = {}) {
    super(scope, id, props);

    const featureName = 'DataPipeline';
    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}) ${SolutionInfo.SOLUTION_NAME} - ${featureName} (Version ${SolutionInfo.SOLUTION_VERSION})`;

    const {
      metadata, params: {
        vpcIdParam,
        privateSubnetIdsParam,
        projectIdParam,
        appIdsParam,
        sourceS3BucketParam,
        sourceS3PrefixParam,
        sinkS3BucketParam,
        sinkS3PrefixParam,
        pipelineS3BucketParam,
        pipelineS3PrefixParam,
        dataFreshnessInHourParam,
        dataBufferedSecondsParam,
        scheduleExpressionParam,
        transformerAndEnrichClassNamesParam,
        s3PathPluginJarsParam,
        s3PathPluginFilesParam,
        outputFormatParam,
      },
    } = createStackParameters(this);

    this.templateOptions.metadata = metadata;

    // CfnCondition without custom plugins
    const withoutCustomPluginsCondition = new CfnCondition(
      this,
      'withoutCustomPluginsCondition',
      {
        expression:
          Fn.conditionEquals( s3PathPluginJarsParam.valueAsString, ''),

      },
    );

    // CfnCondition with custom plugins
    const withCustomPluginsCondition = new CfnCondition(
      this,
      'withCustomPluginsCondition',
      {
        expression:
        Fn.conditionNot(
          withoutCustomPluginsCondition,
        ),
      },
    );

    // Vpc
    const vpc = Vpc.fromVpcAttributes(this, 'from-vpc-for-data-pipeline', {
      vpcId: vpcIdParam.valueAsString,
      availabilityZones: Fn.getAzs(),
      privateSubnetIds: Fn.split(',', privateSubnetIdsParam.valueAsString),
    });

    const subnetSelection: SubnetSelection = {
      subnets: vpc.privateSubnets,
    };

    // Bucket
    const sourceS3Bucket = Bucket.fromBucketName(
      this,
      'from-sourceS3Bucket',
      sourceS3BucketParam.valueAsString,
    );

    const sinkS3Bucket = Bucket.fromBucketName(
      this,
      'from-sinkS3Bucket',
      sinkS3BucketParam.valueAsString,
    );

    const pipelineS3Bucket = Bucket.fromBucketName(
      this,
      'from-pipelineS3Bucket',
      pipelineS3BucketParam.valueAsString,
    );

    const dataPipelineStackWithCustomPlugins = new DataPipelineNestedStack(this, 'DataPipelineWithCustomPlugins', {
      vpc: vpc,
      vpcSubnets: subnetSelection,
      projectId: projectIdParam.valueAsString,
      appIds: appIdsParam.valueAsString,
      sourceS3Bucket,
      sourceS3Prefix: sourceS3PrefixParam.valueAsString,
      sinkS3Bucket,
      sinkS3Prefix: sinkS3PrefixParam.valueAsString,
      pipelineS3Bucket,
      pipelineS3Prefix: pipelineS3PrefixParam.valueAsString,
      dataFreshnessInHour: dataFreshnessInHourParam.valueAsString,
      dataBufferedSeconds: dataBufferedSecondsParam.valueAsString,
      scheduleExpression: scheduleExpressionParam.valueAsString,
      transformerAndEnrichClassNames: transformerAndEnrichClassNamesParam.valueAsString,
      s3PathPluginJars: s3PathPluginJarsParam.valueAsString,
      s3PathPluginFiles: s3PathPluginFilesParam.valueAsString,
      outputFormat: outputFormatParam.valueAsString as 'json'|'parquet',
    });

    (dataPipelineStackWithCustomPlugins.nestedStackResource as CfnStack).cfnOptions.condition = withCustomPluginsCondition;
    this.nestedStacks.push(dataPipelineStackWithCustomPlugins);

    const dataPipelineStackWithoutCustomPlugins = new DataPipelineNestedStack(this, 'DataPipelineWithoutCustomPlugins', {
      vpc: vpc,
      vpcSubnets: subnetSelection,
      projectId: projectIdParam.valueAsString,
      appIds: appIdsParam.valueAsString,
      sourceS3Bucket,
      sourceS3Prefix: sourceS3PrefixParam.valueAsString,
      sinkS3Bucket,
      sinkS3Prefix: sinkS3PrefixParam.valueAsString,
      pipelineS3Bucket,
      pipelineS3Prefix: pipelineS3PrefixParam.valueAsString,
      dataFreshnessInHour: dataFreshnessInHourParam.valueAsString,
      dataBufferedSeconds: dataBufferedSecondsParam.valueAsString,
      scheduleExpression: scheduleExpressionParam.valueAsString,
      transformerAndEnrichClassNames: transformerAndEnrichClassNamesParam.valueAsString,
      outputFormat: outputFormatParam.valueAsString as 'json'|'parquet',
    });

    (dataPipelineStackWithoutCustomPlugins.nestedStackResource as CfnStack).cfnOptions.condition = withoutCustomPluginsCondition;
    this.nestedStacks.push(dataPipelineStackWithoutCustomPlugins);
  }
}

interface DataPipelineNestedStackProps extends NestedStackProps, DataPipelineProps {
}

class DataPipelineNestedStack extends NestedStack {
  constructor(scope: Construct, id: string, props: DataPipelineNestedStackProps) {
    super(scope, id, props);
    const featureName = 'DataPipeline ' + id;
    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}) ${SolutionInfo.SOLUTION_NAME} - ${featureName} (Version ${SolutionInfo.SOLUTION_VERSION})`;

    new DataPipelineConstruct(this, 'NestedStack', {
      ... props,
    });
    addCfnNag(this);
  }
}

function addCfnNag(stack: Stack) {
  addCfnNagForLogRetention(stack);
  [
    'partitionSyncerLambdaRole/DefaultPolicy/Resource',
    'CopyAssetsCustomResourceLambdaRole/DefaultPolicy/Resource',
    'InitPartitionLambdaRole/DefaultPolicy/Resource',
    'EmrJobStateListenerLambdaRole/DefaultPolicy/Resource',
  ].forEach(
    p => addCfnNagToStack(stack, [ruleRolePolicyWithWildcardResources(p, 'CDK', 'Lambda')]),
  );

  addCfnNagToStack(stack, [
    {
      paths_endswith: ['EmrSparkJobSubmitterLambdaRole/DefaultPolicy/Resource'],
      rules_to_suppress: [
        {
          id: 'W12',
          reason: 'Some permissions are not resource based, need set * in resource',
        },
        {
          id: 'W76',
          reason: 'ACK: SPCM for IAM policy document is higher than 25',
        },
      ],
    },
  ]),
  NagSuppressions.addStackSuppressions(stack, [... commonCdkNagRules,
    {
      id: 'AwsSolutions-SQS3',
      reason: 'The SQS is a dead-letter queue (DLQ), and does not need a DLQ enabled',
    }]);

  addCfnNagForCustomResourceProvider(stack, 'CopyAssets', 'CopyAssetsCustomResourceProvider', '');
  addCfnNagForCustomResourceProvider(stack, 'InitPartition', 'InitPartitionCustomResourceProvider', '');
  addCfnNagForBucketDeployment(stack, 'data-pipeline');
}

