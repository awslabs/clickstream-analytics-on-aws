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

import { IVpc, SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { addCfnNagToSecurityGroup } from '../../../common/cfn-nag';

export function createKinesisToS3LambdaSecurityGroup(
  scope: Construct,
  vpc: IVpc,
): SecurityGroup {
  const sg = new SecurityGroup(scope, 'lambdaKinesisToS3Sg', {
    description: 'Security group for kinesis to s3 lambda',
    vpc,
    allowAllOutbound: true,
  });
  addCfnNagToSecurityGroup(sg, ['W40', 'W5']);
  return sg;
}
