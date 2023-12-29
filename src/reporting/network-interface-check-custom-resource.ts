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
import { Aws, CfnResource, CustomResource, Duration } from 'aws-cdk-lib';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { NetworkInterfaceCheckCustomResourceProps } from './private/dashboard';
import { createNetworkInterfaceCheckCustomResourceLambda } from './private/iam';

import { addCfnNagSuppressRules, rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions } from '../common/cfn-nag';
import { SolutionNodejsFunction } from '../private/function';

export function createNetworkInterfaceCheckCustomResource(
  scope: Construct,
  props: NetworkInterfaceCheckCustomResourceProps,
): CustomResource {

  const fn = createNetworkInterfaceCheckLambda(scope);
  const provider = new Provider(
    scope,
    'NetworkInterfaceCheckCustomResourceProvider',
    {
      onEventHandler: fn,
      logRetention: RetentionDays.ONE_WEEK,
    },
  );

  const cr = new CustomResource(scope, 'NetworkInterfaceCheckCustomResource', {
    serviceToken: provider.serviceToken,
    properties: {
      awsRegion: Aws.REGION,
      awsAccountId: Aws.ACCOUNT_ID,
      networkInterfaces: props.networkInterfaces,
      vpcConnectionId: props.vpcConnectionId,
    },
  });
  return cr;
}

function createNetworkInterfaceCheckLambda(
  scope: Construct,
): SolutionNodejsFunction {
  const role = createNetworkInterfaceCheckCustomResourceLambda(scope);
  const fn = new SolutionNodejsFunction(scope, 'NetworkInterfaceCheckCustomResourceLambda', {
    entry: join(
      __dirname,
      'lambda',
      'custom-resource/quicksight',
      'network-interface-check.ts',
    ),
    handler: 'handler',
    memorySize: 256,
    timeout: Duration.minutes(15),
    logRetention: RetentionDays.ONE_WEEK,
    role,
  });

  addCfnNagSuppressRules(fn.node.defaultChild as CfnResource, [
    ...rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions('network-interface-check-custom-resource'),
  ]);

  return fn;
}
