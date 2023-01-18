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

import { Arn, ArnFormat } from 'aws-cdk-lib';
import { Policy, PolicyStatement, Effect, CfnPolicy } from 'aws-cdk-lib/aws-iam';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { addCfnNagSuppressRules } from './cfn-nag';

export function cloudWatchSendLogs(
  id: string,
  func: IFunction,
) : IFunction {
  if (func.role !== undefined) {
    const logGroupArn = Arn.format({
      resource: 'log-group',
      service: 'logs',
      resourceName: `aws/lambda/${func.functionName}:*`,
      arnFormat: ArnFormat.COLON_RESOURCE_NAME,
    }, func.stack);
    const lambdaPolicy = new Policy(func.stack, id, {
      statements: [
        new PolicyStatement({
          actions: [
            'logs:CreateLogStream',
            'logs:PutLogEvents',
            'logs:CreateLogGroup',
          ],
          resources: [logGroupArn],
          effect: Effect.ALLOW,
        }),
      ],
    });
    lambdaPolicy.attachToRole(func.role);

    addCfnNagSuppressRules(
      lambdaPolicy.node.defaultChild as CfnPolicy,
      [
        {
          id: 'W12',
          reason:
              'The lambda service writes to undetermined logs stream by design',
        },
      ],
    );
  }
  return func;
}

export function createENI(
  id: string,
  func: IFunction,
) : IFunction {
  if (func.role !== undefined) {
    const lambdaPolicy = new Policy(func.stack, id, {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          resources: ['*'],
          actions: [
            'ec2:CreateNetworkInterface',
            'ec2:DescribeNetworkInterfaces',
            'ec2:DeleteNetworkInterface',
            'ec2:AssignPrivateIpAddresses',
            'ec2:UnassignPrivateIpAddresses',
          ],
        }),
      ],
    });
    lambdaPolicy.attachToRole(func.role);
    func.node.addDependency(lambdaPolicy);

    addCfnNagSuppressRules(
      lambdaPolicy.node.defaultChild as CfnPolicy,
      [
        {
          id: 'W12',
          reason:
              'The lambda service creates undetermined eni by design',
        },
      ],
    );
  }
  return func;
}