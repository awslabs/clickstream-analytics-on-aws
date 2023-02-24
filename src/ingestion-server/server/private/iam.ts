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
import { Construct } from 'constructs';

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
