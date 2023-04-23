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

import { CfnResource } from 'aws-cdk-lib';
import {
  IVpc,
  Peer,
  Port,
  SecurityGroup,
} from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { addCfnNagSuppressRules } from '../../../common/cfn-nag';
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
  const albSg = new SecurityGroup(scope, `${RESOURCE_ID_PREFIX}alb-sg`, {
    description: 'ALB security group',
    vpc,
    allowAllOutbound: false,
  });
  albSg.addIngressRule(Peer.anyIpv4(), Port.tcp(port.https));
  albSg.addIngressRule(Peer.anyIpv4(), Port.tcp(port.http));
  albSg.addIngressRule(Peer.anyIpv6(), Port.tcp(port.https));
  albSg.addIngressRule(Peer.anyIpv6(), Port.tcp(port.http));
  if (authenticationSecretArn) {
    albSg.addEgressRule(Peer.anyIpv4(), Port.allTcp());
  }

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

  return albSg;
}

export function createECSSecurityGroup(
  scope: Construct,
  vpc: IVpc,
): SecurityGroup {
  const ec2Sg = new SecurityGroup(scope, `${RESOURCE_ID_PREFIX}ecs-sg`, {
    description: 'ECS security group',
    vpc,
    allowAllOutbound: true,
  });

  addCfnNagSuppressRules(ec2Sg.node.defaultChild as CfnResource, [
    {
      id: 'W40',
      reason: 'Design intent: Security Groups egress with an IpProtocol of -1',
    },
    {
      id: 'W5',
      reason: 'Design intent: Security Groups found with cidr open to world on egress',
    },
  ]);

  return ec2Sg;
}

