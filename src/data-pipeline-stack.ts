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

import { Fn, Stack, StackProps } from 'aws-cdk-lib';
import { SubnetSelection, Vpc } from 'aws-cdk-lib/aws-ec2';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { addCfnNagForLogRetention, addCfnNagToStack, commonCdkNagRules, ruleRolePolicyWithWildcardResources } from './common/cfn-nag';
import { SolutionInfo } from './common/solution-info';
import { DataPipelineConstruct } from './data-pipeline/data-pipeline';
import { createStackParameters } from './data-pipeline/parameter';

export interface ETLStackProps extends StackProps {
}

export class DataPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: ETLStackProps = {}) {
    super(scope, id, props);

    const featureName = 'DataPipeline ' + id;
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
      },
    } = createStackParameters(this);

    this.templateOptions.metadata = metadata;

    // Vpc
    const vpc = Vpc.fromVpcAttributes(this, 'from-vpc-for-data-pipeline', {
      vpcId: vpcIdParam.valueAsString,
      availabilityZones: Fn.getAzs(),
      privateSubnetIds: Fn.split(',', privateSubnetIdsParam.valueAsString),
    });

    const subnetSelection: SubnetSelection = {
      subnets: vpc.privateSubnets,
    };

    new DataPipelineConstruct(this, 'DataPipeline', {
      vpc: vpc,
      vpcSubnets: subnetSelection,
      projectId: projectIdParam.valueAsString,
      appIds: Fn.join(',', appIdsParam.valueAsList),
      sourceS3Bucket: sourceS3BucketParam.valueAsString,
      sourceS3Prefix: sourceS3PrefixParam.valueAsString,
      sinkS3Bucket: sinkS3BucketParam.valueAsString,
      sinkS3Prefix: sinkS3PrefixParam.valueAsString,
    });
    addCfnNag(this);
  }
}

function addCfnNag(stack: Stack) {
  addCfnNagForLogRetention(stack);
  addCfnNagToStack(stack, [ruleRolePolicyWithWildcardResources('partitionSyncerLambdaRole/DefaultPolicy/Resource', 'CDK', 'Lambda')]);
  NagSuppressions.addStackSuppressions(stack, commonCdkNagRules);
}

