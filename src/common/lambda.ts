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

import { Arn, ArnFormat } from 'aws-cdk-lib';
import {
  Policy,
  PolicyStatement,
  CfnPolicy,
  Role,
  ServicePrincipal,
  PrincipalBase,
} from 'aws-cdk-lib/aws-iam';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { IConstruct } from 'constructs';
import { addCfnNagSuppressRules } from './cfn-nag';

export function cloudWatchSendLogs(id: string, func: IFunction): IFunction {
  if (func.role !== undefined) {
    const logGroupArn = getLambdaLogGroupArn(func);
    const lambdaPolicy = new Policy(func.stack, id, {
      statements: getLambdaBasicPolicyStatements(false, logGroupArn),
    });
    lambdaPolicy.attachToRole(func.role);

    suppressLogsWildcardResources(lambdaPolicy);
  }
  return func;
}

export function createENI(id: string, func: IFunction): IFunction {
  if (func.role !== undefined) {
    const lambdaPolicy = new Policy(func.stack, id, {
      statements: [
        getLambdaInVpcRolePolicyStatement(),
      ],
    });
    lambdaPolicy.attachToRole(func.role);
    func.node.addDependency(lambdaPolicy);

    suppressENIWildcardResources(lambdaPolicy);
  }
  return func;
}

export function listTags(id: string, func: IFunction): IFunction {
  if (func.role !== undefined) {
    new Policy(func.stack, id, {
      roles: [func.role],
      statements: [
        new PolicyStatement({
          actions: [
            'lambda:ListTags',
          ],
          resources: [func.functionArn],
        }),
      ],
    });
  }
  return func;
}

function suppressLogsWildcardResources(policy: Policy) {
  suppressWildcardResources(policy, 'The lambda service writes to undetermined logs stream by design');
}

function suppressENIWildcardResources(policy: Policy) {
  suppressWildcardResources(policy, 'The lambda service creates undetermined eni by design');
}

function suppressWildcardResources(policy: Policy, reason: string) {
  addCfnNagSuppressRules(policy.node.defaultChild as CfnPolicy, [
    {
      id: 'W12',
      reason: reason,
    },
  ]);
}

function getLambdaBasicPolicyStatements(inVpc: boolean, logGroupArn: string = '*') {
  const statements = [
    new PolicyStatement({
      actions: [
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:CreateLogGroup',
      ],
      resources: [logGroupArn],
    }),
  ];

  if (inVpc) {
    statements.push(getLambdaInVpcRolePolicyStatement());
  }
  return statements;
}

function getLambdaInVpcRolePolicyStatement(): PolicyStatement {
  return new PolicyStatement({
    actions: [
      'ec2:CreateNetworkInterface',
      'ec2:DescribeNetworkInterfaces',
      'ec2:DeleteNetworkInterface',
      'ec2:AssignPrivateIpAddresses',
      'ec2:UnassignPrivateIpAddresses',
    ],
    resources: ['*'],
  });
}

function getLambdaLogGroupArn(func: IFunction) {
  return Arn.format(
    {
      resource: 'log-group',
      service: 'logs',
      resourceName: `/aws/lambda/${func.functionName}:*`,
      arnFormat: ArnFormat.COLON_RESOURCE_NAME,
    },
    func.stack,
  );
}

export function createLambdaRole(
  scope: IConstruct,
  id: string,
  inVpc: boolean,
  extraPolicyStatements: PolicyStatement[],
  assumedBy: PrincipalBase = new ServicePrincipal('lambda.amazonaws.com'),
  logGroupArn: string = '*',
): Role {
  const role = new Role(scope, id, {
    assumedBy,
  });
  getLambdaBasicPolicyStatements(inVpc, logGroupArn).forEach((ps) => role.addToPolicy(ps));
  extraPolicyStatements.forEach((ps) => role.addToPolicy(ps));
  if (inVpc) {suppressENIWildcardResources(role.node.findChild('DefaultPolicy') as Policy);} else {suppressLogsWildcardResources(role.node.findChild('DefaultPolicy') as Policy);}
  return role;
}
