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

import { join } from 'path';
import { CfnResource, Duration } from 'aws-cdk-lib';
import { IVpc, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { createKinesisToS3LambdaRole } from './iam';
import { createKinesisToS3LambdaSecurityGroup } from './sg';
import { addCfnNagSuppressRules } from '../../../common/cfn-nag';
import { SolutionNodejsFunction } from '../../../private/function';

export interface KinesisToS3Lambda {
  vpc: IVpc;
  subnetSelection: SubnetSelection;
  s3DataBucket: IBucket;
  s3DataPrefix: string;
}

export function createKinesisToS3Lambda(
  scope: Construct,
  props: KinesisToS3Lambda,
): Function {
  const vpc = props.vpc;
  const lambdaSecurityGroup = createKinesisToS3LambdaSecurityGroup(scope, vpc);
  const role = createKinesisToS3LambdaRole(scope);

  const fn = new SolutionNodejsFunction(scope, 'kinesisToS3Lambda', {
    entry: join(__dirname, '..', 'kinesis-to-s3-lambda', 'index.ts'),
    handler: 'handler',
    memorySize: 2048,
    timeout: Duration.minutes(15),
    logConf: {
      retention: RetentionDays.ONE_WEEK,
    },
    role,
    vpc,
    vpcSubnets: props.subnetSelection,
    securityGroups: [lambdaSecurityGroup],
    allowPublicSubnet: true,
    environment: {
      S3_BUCKET: props.s3DataBucket.bucketName,
      S3_PREFIX: props.s3DataPrefix,
    },
    applicationLogLevel: 'WARN',
  });

  addCfnNagSuppressRules(fn.node.defaultChild as CfnResource, [
    {
      id: 'W92',
      reason: 'Lambda is used as custom resource, ignore setting ReservedConcurrentExecutions',
    },
  ]);
  return fn;
}