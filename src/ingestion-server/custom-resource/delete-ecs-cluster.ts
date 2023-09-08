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
import { CustomResource, Duration, CfnResource } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { addCfnNagSuppressRules, rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions } from '../../common/cfn-nag';
import { createLambdaRole } from '../../common/lambda';
import { POWERTOOLS_ENVS } from '../../common/powertools';
import { SolutionNodejsFunction } from '../../private/function';

export interface DeleteECSClusterCustomResourceProps {
  ecsClusterArn: string;
  ecsClusterName: string;
  ecsServiceName: string;
}

export function deleteECSClusterCustomResource(
  scope: Construct,
  props: DeleteECSClusterCustomResourceProps,
) {
  const fn = createDeleteECSClusterLambda(scope, props.ecsClusterArn);
  const provider = new Provider(
    scope,
    'deleteECSClusterCustomResourceProvider',
    {
      onEventHandler: fn,
      logRetention: RetentionDays.FIVE_DAYS,
    },
  );
  const cr = new CustomResource(scope, 'deleteECSClusterCustomResource', {
    serviceToken: provider.serviceToken,
    properties: {
      ecsClusterName: props.ecsClusterName,
      ecsServiceName: props.ecsServiceName,
    },
  });
  return { customResource: cr, fn };
}

function createDeleteECSClusterLambda(scope: Construct, ecsClusterArn: string): SolutionNodejsFunction {
  const policyStatements = [
    new PolicyStatement({
      actions: [
        'ecs:DeleteCluster',
      ],
      resources: [ecsClusterArn],
    }),
    new PolicyStatement({
      actions: [
        'ecs:ListServices',
        'ecs:UpdateService',
        'ecs:DeleteService',
        'ecs:ListTasks',
        'ecs:StopTask',
        'ecs:DescribeServices',
      ],
      resources: ['*'],
      conditions: {
        ArnEquals: {
          'ecs:cluster': ecsClusterArn,
        },
      },
    }),
    new PolicyStatement({
      actions: [
        'ecs:ListContainerInstances',
        'ecs:DeregisterContainerInstance',
      ],
      resources: ['*'],
    }),
  ];
  const role = createLambdaRole(scope, 'deleteECSClusterLambdaRole', false, policyStatements);

  const fn = new SolutionNodejsFunction(scope, 'deleteECSClusterLambda', {
    runtime: Runtime.NODEJS_18_X,
    entry: join(
      __dirname,
      'delete-ecs-cluster',
      'index.ts',
    ),
    handler: 'handler',
    memorySize: 256,
    timeout: Duration.minutes(10),
    logRetention: RetentionDays.ONE_WEEK,
    role,
    environment: {
      ...POWERTOOLS_ENVS,
    },
  });
  fn.node.addDependency(role);
  addCfnNagSuppressRules(fn.node.defaultChild as CfnResource, [
    ... rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions('delete-ecs-cluster-custom-resource'),
  ]);

  return fn;
}
