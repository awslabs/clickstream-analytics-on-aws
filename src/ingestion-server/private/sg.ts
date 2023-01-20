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
  IVpc,
  Peer,
  Port,
  SecurityGroup,
} from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { RESOURCE_ID_PREFIX } from '../ingestion-server';

export function createALBSecurityGroup(
  scope: Construct,
  vpc: IVpc,
  port: {
    http: number;
    https: number;
  },
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
  ec2Sg.addIngressRule(ec2Sg, Port.allTcp());
  return ec2Sg;
}

