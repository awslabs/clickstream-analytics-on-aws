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

import { join } from 'path';
import { CfnResource, CustomResource, Duration } from 'aws-cdk-lib';
import { Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { addCfnNagSuppressRules } from '../../common/cfn-nag';
import { createRoleForDeleteECSClusterCustomResourceEventHandler } from './iam';

export interface DeleteECSClusterCustomResourceProps {
  custerName: string;
  serviceName: string;
  asgName: string;
}
export function createDeleteECSClusterCustomResource(
  scope: Construct,
  props: DeleteECSClusterCustomResourceProps,
) {
  const fn = createDeleteECSClusterCustomResourceEventHandler(scope, props);
  const provider = new Provider(
    scope,
    'DeleteECSClusterCustomResourceProvider',
    {
      onEventHandler: fn,
      logRetention: RetentionDays.FIVE_DAYS,
    },
  );
  const cr = new CustomResource(scope, 'DeleteECSClusterCustomResource', {
    serviceToken: provider.serviceToken,
  });
  cr.node.addDependency(fn);
  cr.node.addDependency(provider);
  return cr;
}

function createDeleteECSClusterCustomResourceEventHandler(
  scope: Construct,
  props: DeleteECSClusterCustomResourceProps,
): Function {
  const role = createRoleForDeleteECSClusterCustomResourceEventHandler(
    scope,
    props,
  );
  const fn = new NodejsFunction(
    scope,
    'DeleteECSClusterCustomResourceEventHandler',
    {
      runtime: Runtime.NODEJS_18_X,
      entry: join(
        __dirname,
        'custom-resource',
        'delete-ecs-cluster',
        'index.ts',
      ),
      handler: 'handler',
      memorySize: 256,
      timeout: Duration.minutes(10),
      logRetention: RetentionDays.ONE_WEEK,
      environment: {
        ECS_CLUSTER_NAME: props.custerName,
        ECS_SERVICE: props.serviceName,
        ASG_NAME: props.asgName,
      },
      role,
    },
  );
  fn.node.addDependency(role);

  addCfnNagSuppressRules(fn.node.defaultChild as CfnResource, [
    {
      id: 'W89',
      reason:
        'The custom resource lambda only does house-keeping to destroy the solution ECS cluster, ignore setting a VPC for the lambda',
    },

    {
      id: 'W92',
      reason:
        'The custom resource lambda only does house-keeping to destroy the solution ECS cluster, ignore setting ReservedConcurrentExecutions',
    },
  ]);

  return fn;
}
