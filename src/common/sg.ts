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

import { SecurityGroup, IVpc, ISecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { addCfnNagToSecurityGroup } from './cfn-nag';

export function createSGForEgressToAwsService(scope: Construct, id: string, vpc: IVpc)
  : ISecurityGroup {
  const sg = new SecurityGroup(scope, id, {
    vpc,
    allowAllOutbound: true,
  });
  addCfnNagToSecurityGroup(sg, ['W40', 'W5']);

  return sg;
}