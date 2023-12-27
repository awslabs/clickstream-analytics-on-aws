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
import { Aws, CfnResource, Duration, Stack } from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { CfnRule, Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Effect, Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IFunction, Tracing } from 'aws-cdk-lib/aws-lambda';
import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { LambdaFunctionNetworkProps } from './click-stream-api';
import { CFN_RULE_PREFIX } from './lambda/api/common/constants';
import { addCfnNagSuppressRules } from '../../common/cfn-nag';
import { createLambdaRole } from '../../common/lambda';
import { createDLQueue } from '../../common/sqs';
import { getShortIdOfStack } from '../../common/stack';
import { SolutionNodejsFunction } from '../../private/function';

export interface BackendEventBusProps {
  readonly clickStreamTable: Table;
  readonly prefixTimeGSIName: string;
  readonly lambdaFunctionNetwork: LambdaFunctionNetworkProps;
  readonly listenStateMachine: StateMachine;
}

export class BackendEventBus extends Construct {

  readonly defaultEventBusArn: string;
  readonly invokeEventBusRole: Role;

  constructor(scope: Construct, id: string, props: BackendEventBusProps) {
    super(scope, id);

    this.defaultEventBusArn = `arn:${Aws.PARTITION}:events:${Aws.REGION}:${Aws.ACCOUNT_ID}:event-bus/default`;

    this.invokeEventBusRole = this.createInvokeEventBusRole(this.defaultEventBusArn);
    this.createRuleForListenStackStatusChange(props);
    this.createRuleForListenStateStatusChange(props);
  }

  private createInvokeEventBusRole(busArn: string): Role {
    const role = new Role(this, 'InvokeEventBusRole', {
      assumedBy: new ServicePrincipal('events.amazonaws.com'),
    });
    const invokeEventBusRolePolicy = new Policy(this, 'InvokeEventBusRolePolicy', {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          resources: [busArn],
          actions: [
            'events:PutEvents',
          ],
        }),
      ],
    });
    invokeEventBusRolePolicy.attachToRole(role);
    return role;
  };

  private createRuleForListenStackStatusChange = (props: BackendEventBusProps) => {
    const listenStackStatusFn = this.listenStackFn(props);

    const ruleStack = new Rule(this, 'ListenStackStatusChange', {
      ruleName: `ClickstreamListenStackStatusChange-${getShortIdOfStack(Stack.of(this))}`,
      description: 'Rule for listen CFN stack status change',
      eventPattern: {
        source: ['aws.cloudformation'],
        detailType: ['CloudFormation Stack Status Change'],
      },
    });
    ruleStack.addTarget(
      new LambdaFunction(listenStackStatusFn, {
        deadLetterQueue: createDLQueue(this, 'listenStackStatusDLQ'),
        maxEventAge: Duration.hours(2),
        retryAttempts: 2,
      }),
    );
    const cfnRule = ruleStack.node.defaultChild as CfnRule;
    cfnRule.addOverride('Properties.EventPattern.resources', [
      { wildcard: `arn:${Aws.PARTITION}:states:*:${Aws.ACCOUNT_ID}:stack/Clickstream*/*` },
    ]);
  };

  private createRuleForListenStateStatusChange = (props: BackendEventBusProps) => {
    const listenStateStatusFn = this.listenStateFn(props);

    const ruleState = new Rule(this, 'ListenStateStatusChange', {
      ruleName: `ClickstreamListenStateStatusChange-${getShortIdOfStack(Stack.of(this))}`,
      description: 'Rule for listen SFN state machine status change',
      eventPattern: {
        source: ['aws.states'],
        detailType: ['Step Functions Execution Status Change'],
        detail: {
          stateMachineArn: [props.listenStateMachine.stateMachineArn],
        },
      },
    });
    ruleState.addTarget(
      new LambdaFunction(listenStateStatusFn, {
        deadLetterQueue: createDLQueue(this, 'listenStateStatusDLQ'),
        maxEventAge: Duration.hours(2),
        retryAttempts: 2,
      }),
    );
    const cfnRule = ruleState.node.defaultChild as CfnRule;
    cfnRule.addOverride('Properties.EventPattern.resources', [
      { wildcard: `arn:${Aws.PARTITION}:states:${Aws.REGION}:${Aws.ACCOUNT_ID}:execution:${props.listenStateMachine.stateMachineName}:main*` },
    ]);
  };

  private listenStackFn(props: BackendEventBusProps): IFunction {
    const fn = new SolutionNodejsFunction(this, 'ListenStackFunction', {
      description: 'Lambda function for listen CFN stack status of solution Clickstream Analytics on AWS',
      entry: join(__dirname, './lambda/listen-stack-status/index.ts'),
      handler: 'handler',
      tracing: Tracing.ACTIVE,
      role: createLambdaRole(this, 'ListenStackFuncRole', true, [...this.getDescribeStackPolicyStatements()]),
      timeout: Duration.seconds(60),
      environment: {
        CLICKSTREAM_TABLE_NAME: props.clickStreamTable.tableName,
        PREFIX_TIME_GSI_NAME: props.prefixTimeGSIName,
      },
      ...props.lambdaFunctionNetwork,
    });
    props.clickStreamTable.grantReadWriteData(fn);
    addCfnNagSuppressRules(fn.node.defaultChild as CfnResource, [
      {
        id: 'W89', //Lambda functions should be deployed inside a VPC
        reason: 'Lambda functions deployed outside VPC when cloudfront fronting backend api.',
      },
      {
        id: 'W92',
        reason: 'Lambda is used as custom resource, ignore setting ReservedConcurrentExecutions',
      },
    ]);
    return fn;
  }

  private listenStateFn(props: BackendEventBusProps): IFunction {
    const fn = new SolutionNodejsFunction(this, 'ListenStateFunction', {
      description: 'Lambda function for listen SFN state machine status of solution Clickstream Analytics on AWS',
      entry: join(__dirname, './lambda/listen-state-status/index.ts'),
      handler: 'handler',
      tracing: Tracing.ACTIVE,
      role: createLambdaRole(this, 'ListenStateFuncRole', true, [...this.getDeleteRulePolicyStatements()]),
      timeout: Duration.seconds(60),
      environment: {
        CLICKSTREAM_TABLE_NAME: props.clickStreamTable.tableName,
        PREFIX_TIME_GSI_NAME: props.prefixTimeGSIName,
      },
      ...props.lambdaFunctionNetwork,
    });
    props.clickStreamTable.grantReadWriteData(fn);
    addCfnNagSuppressRules(fn.node.defaultChild as CfnResource, [
      {
        id: 'W89', //Lambda functions should be deployed inside a VPC
        reason: 'Lambda functions deployed outside VPC when cloudfront fronting backend api.',
      },
      {
        id: 'W92',
        reason: 'Lambda is used as custom resource, ignore setting ReservedConcurrentExecutions',
      },
    ]);
    return fn;
  }

  private getDescribeStackPolicyStatements(): PolicyStatement[] {
    const cloudformationPolicyStatements: PolicyStatement[] = [
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [`arn:${Aws.PARTITION}:cloudformation:*:${Aws.ACCOUNT_ID}:stack/Clickstream*`],
        actions: [
          'cloudformation:DescribeStacks',
        ],
      }),
    ];
    return cloudformationPolicyStatements;
  };

  private getDeleteRulePolicyStatements(): PolicyStatement[] {
    const cloudformationPolicyStatements: PolicyStatement[] = [
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:events:*:${Aws.ACCOUNT_ID}:rule/${CFN_RULE_PREFIX}*`,
        ],
        actions: [
          'events:DeleteRule',
          'events:ListTargetsByRule',
          'events:RemoveTargets',
        ],
      }),
    ];
    return cloudformationPolicyStatements;
  };
}