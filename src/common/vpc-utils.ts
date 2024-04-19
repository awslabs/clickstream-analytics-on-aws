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

import { CfnCondition, Fn } from 'aws-cdk-lib';
import { IVpc, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface VpcProps {
  readonly vpcId: string;
  readonly availabilityZones: string[];
  readonly publicSubnetIds?: string[];
  readonly privateSubnetIds: string[];
  readonly publicSubnetRouteTableIds?: string[];
  readonly privateSubnetRouteTableIds?: string[];
}

export function getExistVpc(scope: Construct, id: string, props: VpcProps): IVpc {

  const vpc = Vpc.fromVpcAttributes(scope, id, {
    vpcId: props.vpcId,
    availabilityZones: props.availabilityZones,
    publicSubnetIds: props.publicSubnetIds,
    privateSubnetIds: props.privateSubnetIds,
    publicSubnetRouteTableIds: props.publicSubnetRouteTableIds ?? props.publicSubnetIds,
    privateSubnetRouteTableIds: props.privateSubnetRouteTableIds ?? props.privateSubnetIds,
  });

  (vpc as any).node._metadata = vpc.node.metadata.filter((item) =>
    item.type !== 'aws:cdk:warning' || !/the imported VPC will not work with constructs that require a list of subnets at synthesis time/.test(item.data),
  );

  return vpc;
}

export function getALBSubnetsCondtion(scope: Construct, publicSubnetIds: string, privateSubnetIds: string) {
  const isPrivateSubnetsCondition = new CfnCondition(
    scope,
    'IsPrivateSubnets',
    {
      expression:
        Fn.conditionEquals(publicSubnetIds, privateSubnetIds),
    },
  );
  return isPrivateSubnetsCondition;
}