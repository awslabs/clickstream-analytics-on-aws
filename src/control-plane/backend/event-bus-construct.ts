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
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IFunction, Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Queue, QueueEncryption } from 'aws-cdk-lib/aws-sqs';
import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { LambdaFunctionNetworkProps } from './click-stream-api';
import { CFN_RULE_PREFIX, CFN_TOPIC_PREFIX } from './lambda/api/common/constants';
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

  readonly listenStackQueue: Queue;

  constructor(scope: Construct, id: string, props: BackendEventBusProps) {
    super(scope, id);

    this.createRuleForListenStateStatusChange(props);

    this.listenStackQueue = this.createSQSForListenStackStatusChange();
    this.triggerListenStackStatusFunc(props);
  }

  private createSQSForListenStackStatusChange = () => {
    const queue = new Queue(this, 'ListenStackStatusQueue', {
      queueName: `ClickstreamListenStackStatusChange-${getShortIdOfStack(Stack.of(this))}`,
      visibilityTimeout: Duration.seconds(60),
      encryption: QueueEncryption.SQS_MANAGED,
      enforceSSL: true,
      deadLetterQueue: {
        queue: createDLQueue(this, 'listenStackStatusDLQ'),
        maxReceiveCount: 3,
      },
    });

    // Allow all region SNS topic send messages to the queue
    queue.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal('sns.amazonaws.com')],
        resources: [queue.queueArn],
        actions: [
          'sqs:SendMessage',
        ],
        conditions: {
          ArnEquals: {
            'aws:SourceArn': `arn:${Aws.PARTITION}:sns:*:${Aws.ACCOUNT_ID}:Clickstream*`,
          },
        },
      }),
    );

    addCfnNagSuppressRules((queue.node.defaultChild as CfnResource), [{
      id: 'W48',
      reason: 'SQS already set SQS_MANAGED encryption',
    }]);

    return queue;
  };

  private triggerListenStackStatusFunc = (props: BackendEventBusProps) => {
    const listenStackStatusFn = this.listenStackFn(props);

    listenStackStatusFn.addEventSource(
      new SqsEventSource(this.listenStackQueue, {
        batchSize: 1,
      }),
    );
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
      runtime: Runtime.NODEJS_18_X,
      tracing: Tracing.ACTIVE,
      role: createLambdaRole(this, 'ListenStackFuncRole', true, [
        ...this.getDescribeStackPolicyStatements(),
        ...this.getSQSPolicyStatements(),
      ]),
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
      runtime: Runtime.NODEJS_18_X,
      tracing: Tracing.ACTIVE,
      role: createLambdaRole(this, 'ListenStateFuncRole', true, [
        ...this.getDeleteRulePolicyStatements(),
        ...this.getDeleteTopicPolicyStatements(),
      ]),
      timeout: Duration.seconds(60),
      environment: {
        CLICKSTREAM_TABLE_NAME: props.clickStreamTable.tableName,
        PREFIX_TIME_GSI_NAME: props.prefixTimeGSIName,
        AWS_ACCOUNT_ID: Stack.of(this).account,
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
    const policyStatements: PolicyStatement[] = [
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [`arn:${Aws.PARTITION}:cloudformation:*:${Aws.ACCOUNT_ID}:stack/Clickstream*`],
        actions: [
          'cloudformation:DescribeStacks',
        ],
      }),
    ];
    return policyStatements;
  };

  private getSQSPolicyStatements(): PolicyStatement[] {
    const policyStatements: PolicyStatement[] = [
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [this.listenStackQueue.queueArn],
        actions: [
          'sqs:DeleteMessage',
          'sqs:ReceiveMessage',
          'sqs:GetQueueAttributes',
        ],
      }),
    ];
    return policyStatements;
  };

  private getDeleteRulePolicyStatements(): PolicyStatement[] {
    const policyStatements: PolicyStatement[] = [
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
    return policyStatements;
  };

  private getDeleteTopicPolicyStatements(): PolicyStatement[] {
    const policyStatements: PolicyStatement[] = [
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:sns:*:${Aws.ACCOUNT_ID}:${CFN_TOPIC_PREFIX}*`,
        ],
        actions: [
          'sns:ListSubscriptionsByTopic',
          'sns:DeleteTopic',
          'sns:Unsubscribe',
        ],
      }),
    ];
    return policyStatements;
  };
}