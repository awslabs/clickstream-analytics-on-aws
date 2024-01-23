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
import { CustomResource, Duration, CfnResource, CfnCondition, Fn } from 'aws-cdk-lib';
import { PolicyStatement, Policy, CfnPolicy } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { addCfnNagSuppressRules } from '../../common/cfn-nag';
import { createLambdaRole } from '../../common/lambda';
import { POWERTOOLS_ENVS } from '../../common/powertools';
import { SolutionNodejsFunction } from '../../private/function';

export interface UpdateAlbRulesCustomResourceProps {
  appIds: string;
  clickStreamSDK: string;
  targetGroupArn: string;
  listenerArn: string;
  authenticationSecretArn?: string;
  endpointPath: string;
  domainName?: string;
  protocol: string;
}

export function updateAlbRulesCustomResource(
  scope: Construct,
  props: UpdateAlbRulesCustomResourceProps,
) {
  const fn = createUpdateAlbRulesLambda(scope, props.listenerArn, props.authenticationSecretArn);
  const provider = new Provider(
    scope,
    'updateAlbRulesCustomResourceProvider',
    {
      onEventHandler: fn,
      logRetention: RetentionDays.FIVE_DAYS,
    },
  );
  const cr = new CustomResource(scope, 'updateAlbRulesCustomResource', {
    serviceToken: provider.serviceToken,
    properties: {
      appIds: props.appIds,
      clickStreamSDK: props.clickStreamSDK,
      targetGroupArn: props.targetGroupArn,
      listenerArn: props.listenerArn,
      authenticationSecretArn: props.authenticationSecretArn,
      endpointPath: props.endpointPath,
      domainName: props.domainName,
      protocol: props.protocol,
    },
  });
  return { customResource: cr, fn };
}

function createUpdateAlbRulesLambda(scope: Construct, listenerArn: string, inputAuthenticationSecretArn?: string): SolutionNodejsFunction {
  const policyStatements = [
    new PolicyStatement({
      actions: [
        'elasticloadbalancing:DescribeListeners',
        'elasticloadbalancing:ModifyListener',
      ],
      resources: [listenerArn],
    }),
    new PolicyStatement({
      actions: [
        'elasticloadbalancing:DescribeRules',
        'elasticloadbalancing:CreateRule',
        'elasticloadbalancing:DeleteRule',
        'elasticloadbalancing:ModifyRule',
      ],
      resources: ['*'],
    }),
  ];

  const role = createLambdaRole(scope, 'updateAlbRulesLambdaRole', false, policyStatements);
  const authenticationSecretArn = inputAuthenticationSecretArn || '';

  const authPolicy = new Policy(scope, 'updateAlbRulesLambdaAuthPolicy', {
    statements: [
      new PolicyStatement({
        actions: [
          'secretsmanager:GetSecretValue',
        ],
        resources: [authenticationSecretArn],
      }),
    ],
  });
  authPolicy.attachToRole(role);

  const authEnableCondition = new CfnCondition(
    scope,
    'authEnableCondition',
    {
      expression: Fn.conditionNot(Fn.conditionEquals(authenticationSecretArn, '')),
    },
  );
  (authPolicy.node.defaultChild as CfnPolicy).cfnOptions.condition = authEnableCondition;

  const fn = new SolutionNodejsFunction(scope, 'updateAlbRulesLambda', {
    runtime: Runtime.NODEJS_18_X,
    entry: join(
      __dirname,
      'update-alb-rules',
      'index.ts',
    ),
    handler: 'handler',
    memorySize: 256,
    timeout: Duration.minutes(5),
    logRetention: RetentionDays.ONE_WEEK,
    role,
    environment: {
      ...POWERTOOLS_ENVS,
    },
  });
  fn.node.addDependency(role);
  addCfnNagSuppressRules(fn.node.defaultChild as CfnResource, [
    {
      id: 'W89',
      reason:
        'Lambda is used as custom resource, ignore VPC settings',
    },

    {
      id: 'W92',
      reason:
        'Lambda is used as custom resource, ignore setting ReservedConcurrentExecutions',
    },
  ]);

  return fn;
}
