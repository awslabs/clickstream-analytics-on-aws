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

import { CfnResource, CfnCondition, Fn } from 'aws-cdk-lib';
import {
  ISecurityGroup,
  IVpc,
  Peer,
  Port,
  SecurityGroup,
  CfnSecurityGroup,
} from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { addCfnNagSuppressRules } from '../../../common/cfn-nag';
import { createSGForEgressToAwsService } from '../../../common/sg';
import { RESOURCE_ID_PREFIX } from '../ingestion-server';

export function createALBSecurityGroup(
  scope: Construct,
  vpc: IVpc,
  port: {
    http: number;
    https: number;
  },
  authenticationSecretArn?: string,
): SecurityGroup {
  const albSg = createALBSecurityGroupCommon(scope, vpc, port);

  if (authenticationSecretArn) {
    albSg.addEgressRule(Peer.anyIpv4(), Port.allTcp());
  }

  addSGCfnNagSuppressRules(albSg);

  return albSg;
}

function createALBSecurityGroupCommon(
  scope: Construct,
  vpc: IVpc,
  port: {
    http: number;
    https: number;
  },
) {
  const albSg = new SecurityGroup(scope, `${RESOURCE_ID_PREFIX}alb-sg`, {
    description: 'ALB security group',
    vpc,
    allowAllOutbound: false,
  });
  albSg.addIngressRule(Peer.anyIpv4(), Port.tcp(port.https));
  albSg.addIngressRule(Peer.anyIpv4(), Port.tcp(port.http));
  albSg.addIngressRule(Peer.anyIpv6(), Port.tcp(port.https));
  albSg.addIngressRule(Peer.anyIpv6(), Port.tcp(port.http));
  return albSg;
}

function addSGCfnNagSuppressRules(
  albSg: SecurityGroup,
) {
  addCfnNagSuppressRules(albSg.node.defaultChild as CfnResource, [
    {
      id: 'W9',
      reason: 'Design intent: Security Groups found with ingress cidr that is not /32',
    },
    {
      id: 'W2',
      reason: 'Design intent: Security Groups found with cidr open to world on ingress',
    },
    {
      id: 'W29',
      reason: 'Design intent: allow all egress traffic, alb need to access OIDC endpoint',
    },
    {
      id: 'W5',
      reason: 'Design intent: Security Groups found with cidr open to world on egress',
    },
  ]);
}

export function createALBSecurityGroupV2(
  scope: Construct,
  vpc: IVpc,
  port: {
    http: number;
    https: number;
  },
  enableAuthentication: string,
): SecurityGroup {
  const albSg = createALBSecurityGroupCommon(scope, vpc, port);

  const enableAuthenticationCondition = new CfnCondition(scope, 'EnableAuthentication', {
    expression: Fn.conditionEquals(enableAuthentication, 'Yes'),
  });

  const securityGroupEgress = [
    {
      CidrIp: '0.0.0.0/0',
      Description: 'from 0.0.0.0/0:ALL PORTS',
      FromPort: 0,
      IpProtocol: 'tcp',
      ToPort: 65535,
    },
  ];

  const cfnAlbSg = albSg.node.defaultChild as CfnSecurityGroup;
  cfnAlbSg.addPropertyOverride('SecurityGroupEgress',
    Fn.conditionIf(enableAuthenticationCondition.logicalId, securityGroupEgress, Fn.ref('AWS::NoValue')));

  addSGCfnNagSuppressRules(albSg);
  return albSg;
}

export function createECSSecurityGroup(
  scope: Construct,
  vpc: IVpc,
): ISecurityGroup {

  return createSGForEgressToAwsService(scope, 'ECSEgressToAWSServiceSG', vpc);
}

