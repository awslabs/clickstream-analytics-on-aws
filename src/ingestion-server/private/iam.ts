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

import { Arn, Stack, ArnFormat } from 'aws-cdk-lib';
import {
  IRole,
  ManagedPolicy,
  Policy,
  PolicyStatement,
} from 'aws-cdk-lib/aws-iam';
import { Construct, IConstruct } from 'constructs';
import { createLambdaRole } from '../../common/lambda';
import { DeleteECSClusterCustomResourceProps } from './custom-resource';

export function addPoliciesToAsgRole(role: IRole): IRole {
  role.addManagedPolicy(
    ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
  );
  return role;
}

export function grantMskReadWrite(
  scope: Construct,
  role: IRole,
  mskClusterName: string,
  policyId: string,
) {
  const policy = new Policy(scope, policyId);
  addAccessMskPolicies(scope, mskClusterName, policy);
  role.attachInlinePolicy(policy);
}

export function addAccessMskPolicies(
  scope: Construct,
  mskClusterName: string,
  policy: Policy,
) {
  policy.addStatements(
    new PolicyStatement({
      resources: [
        //  `arn:aws:kafka:*:*:cluster/${mskClusterName}/*`

        Arn.format(
          {
            resource: `cluster/${mskClusterName}/*`,
            service: 'kafka',
            arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          },
          Stack.of(scope),
        ),
      ],
      actions: ['kafka-cluster:Connect', 'kafka-cluster:DescribeCluster'],
    }),

    new PolicyStatement({
      resources: [
        //`arn:aws:kafka:*:*:topic/${mskClusterName}/*/*`
        Arn.format(
          {
            resource: `topic/${mskClusterName}/*/*`,
            service: 'kafka',
            arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          },
          Stack.of(scope),
        ),
      ],
      actions: [
        'kafka-cluster:ReadData',
        'kafka-cluster:DescribeTopic',
        'kafka-cluster:CreateTopic',
        'kafka-cluster:WriteData',
      ],
    }),

    new PolicyStatement({
      resources: [
        //  `arn:aws:kafka:*:*:group/${mskClusterName}/*/*`

        Arn.format(
          {
            resource: `group/${mskClusterName}/*/*`,
            service: 'kafka',
            arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          },
          Stack.of(scope),
        ),
      ],
      actions: ['kafka-cluster:AlterGroup', 'kafka-cluster:DescribeGroup'],
    }),
  );
}


export function createRoleForDeleteECSClusterCustomResourceEventHandler(
  scope: IConstruct,
  props: DeleteECSClusterCustomResourceProps,
) {
  const policyStatements = [
    new PolicyStatement({ actions: ['ecs:List*'], resources: ['*'] }),
    new PolicyStatement({
      actions: [
        'ecs:UpdateService',
        'ecs:DeleteService',
        'ecs:DeleteCluster',
        'ecs:StopTask',
        'ecs:DescribeServices',
        'ecs:ListContainerInstances',
        'ecs:DeregisterContainerInstance',
      ],
      resources: [
        //`arn:aws:ecs:*:*:container-instance/${props.custerName}/*`,
        Arn.format(
          {
            resource: `container-instance/${props.custerName}/*`,
            service: 'ecs',
            arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          },
          Stack.of(scope),
        ),

        // `arn:aws:ecs:*:*:task/${props.custerName}/*`,
        Arn.format(
          {
            resource: `task/${props.custerName}/*`,
            service: 'ecs',
            arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          },
          Stack.of(scope),
        ),

        // `arn:aws:ecs:*:*:cluster/${props.custerName}`,
        Arn.format(
          {
            resource: `cluster/${props.custerName}`,
            service: 'ecs',
            arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          },
          Stack.of(scope),
        ),

        // `arn:aws:ecs:*:*:service/${props.custerName}/${props.serviceName}`,
        Arn.format(
          {
            resource: `service/${props.custerName}/${props.serviceName}`,
            service: 'ecs',
            arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          },
          Stack.of(scope),
        ),
      ],
    }),
    new PolicyStatement({
      resources: [
        //`arn:aws:autoscaling:*:*:autoScalingGroup:*:autoScalingGroupName/${props.asgName}`,
        Arn.format(
          {
            resource: `autoScalingGroup:*:autoScalingGroupName/${props.asgName}`,
            service: 'autoscaling',
            arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          },
          Stack.of(scope),
        ),
      ],
      actions: ['autoscaling:DeleteAutoScalingGroup'],
    }),
    new PolicyStatement({
      resources: ['*'],
      actions: ['autoscaling:DescribeAutoScalingGroups'],
    }),
  ];
  return createLambdaRole(scope, 'DeleteECSClusterCustomResourceEventHandlerRole', policyStatements);
}
