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
import { Aws, aws_iam as iam, aws_lambda, Duration, Stack } from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { ISecurityGroup, IVpc, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Choice, Condition, LogLevel, Pass, StateMachine, TaskInput, Wait, WaitTime } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import {
  addCfnNagSuppressRules,
  addCfnNagToStack,
  ruleForLambdaVPCAndReservedConcurrentExecutions,
  ruleRolePolicyWithWildcardResources,
} from '../../common/cfn-nag';
import { cloudWatchSendLogs, createENI } from '../../common/lambda';
import { createLogGroup } from '../../common/logs';
import { POWERTOOLS_ENVS } from '../../common/powertools';


export interface StackActionStateMachineFuncProps {
  readonly vpc?: IVpc;
  readonly vpcSubnets?: SubnetSelection;
  readonly securityGroups?: ISecurityGroup[];
}

export interface StackActionStateMachineProps {
  readonly clickStreamTable: Table;
  readonly lambdaFuncProps: StackActionStateMachineFuncProps;
  readonly targetToCNRegions?: boolean;
  readonly workflowBucket: IBucket;
}

export class StackActionStateMachine extends Construct {

  readonly stateMachine: StateMachine;
  readonly actionFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: StackActionStateMachineProps) {
    super(scope, id);

    // Create a role for lambda
    const actionFunctionRole = new Role(this, 'ActionFunctionRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });

    this.actionFunction = new NodejsFunction(this, 'ActionFunction', {
      description: 'Lambda function for state machine action of solution Clickstream Analytics on AWS',
      entry: join(__dirname, './lambda/sfn-action/index.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_18_X,
      tracing: aws_lambda.Tracing.ACTIVE,
      role: actionFunctionRole,
      architecture: Architecture.X86_64,
      timeout: Duration.seconds(15),
      environment: {
        ...POWERTOOLS_ENVS,
      },
      ...props.lambdaFuncProps,
    });
    cloudWatchSendLogs('action-func-logs', this.actionFunction);
    createENI('action-func-eni', this.actionFunction);
    addCfnNagToStack(Stack.of(this), [
      ruleForLambdaVPCAndReservedConcurrentExecutions(
        'StackActionStateMachine/ActionFunction/Resource',
        'ActionFunction',
      ),
    ]);

    // TODO: Restrict permissions
    const actionFunctionRolePolicy = new iam.Policy(this, 'ActionFunctionRolePolicy', {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [`arn:${Aws.PARTITION}:cloudformation:*:${Aws.ACCOUNT_ID}:stack/Clickstream-*`],
          actions: [
            'cloudformation:CreateStack',
            'cloudformation:UpdateStack',
            'cloudformation:DeleteStack',
            'cloudformation:DescribeStacks',
            'cloudformation:UpdateTerminationProtection',
          ],
        }),
        new iam.PolicyStatement({
          actions: [
            'iam:GetRole',
            'iam:PassRole',
            'iam:DetachRolePolicy',
            'iam:GetPolicy',
            'iam:DeleteRolePolicy',
            'iam:CreateRole',
            'iam:DeleteRole',
            'iam:AttachRolePolicy',
            'iam:PutRolePolicy',
            'iam:ListRolePolicies',
            'iam:GetRolePolicy',
            'iam:CreateInstanceProfile',
            'iam:DeleteInstanceProfile',
            'iam:RemoveRoleFromInstanceProfile',
            'iam:AddRoleToInstanceProfile',
            'iam:ListPolicies',
            'iam:ListRoles',
          ],
          resources: [
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/Clickstream*`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:policy/Clickstream*`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:instance-profile/Clickstream*`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/aws-service-role/ecs.application-autoscaling.amazonaws.com/AWSServiceRoleForApplicationAutoScaling_ECSService`,
          ],
        }),
        // This list of actions is to ensure the call stack can be create/update/delete successfully.
        new iam.PolicyStatement({
          actions: [
            'sns:*',
            'sqs:*',
            'redshift-serverless:*',
            's3:*',
            'apigateway:*',
            'logs:*',
            'redshift:*',
            'dynamodb:*',
            'autoscaling:*',
            'application-autoscaling:*',
            'glue:*',
            'cloudwatch:*',
            'emr-serverless:*',
            'ssm:*',
            'ecs:*',
            'lambda:*',
            'quicksight:*',
            'ec2:*',
            'events:*',
            'elasticloadbalancing:*',
            'kinesis:*',
            'kafka:*',
            'states:*',
            'secretsmanager:*',
            'globalaccelerator:*',
            'kms:*',
            'athena:*',
          ],
          resources: ['*'],
        }),
      ],
    });
    actionFunctionRolePolicy.attachToRole(actionFunctionRole);
    addCfnNagSuppressRules(
      actionFunctionRolePolicy.node.defaultChild as iam.CfnPolicy,
      [
        {
          id: 'F4',
          reason:
            'This policy requires releted actions in order to start/delete/update cloudformation stacks with many other services',
        },
        {
          id: 'F39',
          reason:
            'When start/delete/update cloudformation stacks, we have to PassRole to existing undeterministical roles.',
        },
        {
          id: 'W76',
          reason:
            'This policy needs to be able to execute stacks, and call other AWS service',
        },
        {
          id: 'W12',
          reason:
            'This policy needs to be able to start/delete other cloudformation stacks of the plugin with unknown resources names',
        },
      ],
    );

    const executeTask = new LambdaInvoke(this, 'Execute Task', {
      lambdaFunction: this.actionFunction,
      payload: TaskInput.fromJsonPathAt('$'),
      outputPath: '$.Payload',
    });

    const describeStack = new LambdaInvoke(this, 'Describe Stack', {
      lambdaFunction: this.actionFunction,
      payload: TaskInput.fromJsonPathAt('$'),
      outputPath: '$.Payload',
    });

    const callbackTask = new LambdaInvoke(this, 'Callback Task', {
      lambdaFunction: this.actionFunction,
      payload: TaskInput.fromJsonPathAt('$'),
      outputPath: '$.Payload',
    });

    const endState = new Pass(this, 'EndState');

    const wait15 = new Wait(this, 'Wait 15 Seconds', {
      time: WaitTime.duration(Duration.seconds(15)),
    });

    const endChoice = new Choice(this, 'End?')
      .when(Condition.stringEquals('$.Action', 'End'), endState)
      .otherwise(wait15);

    executeTask.next(endChoice);
    wait15.next(describeStack);

    const progressChoice = new Choice(this, 'Stack in progress?')
      .when(Condition.stringMatches('$.Result.StackStatus', '*_IN_PROGRESS'), wait15)
      .otherwise(callbackTask);

    describeStack.next(progressChoice);

    callbackTask.next(endState);

    const stackActionLogGroup = createLogGroup(this, {
      prefix: '/aws/vendedlogs/states/Clickstream/StackActionLogGroup',
    });
    // Define a state machine
    this.stateMachine = new StateMachine(this, 'StackActionStateMachine', {
      definition: executeTask,
      logs: {
        destination: stackActionLogGroup,
        level: LogLevel.ALL,
      },
      tracingEnabled: true,
      timeout: Duration.minutes(30),
    });

    const wildcardResourcesStackActionStateMachine = ruleRolePolicyWithWildcardResources('ClickStreamApi/StackActionStateMachine/StackActionStateMachine/Role/DefaultPolicy/Resource', 'StackActionStateMachine', 'xray/logs');
    const wildcardResourcesActionFunctionRole = ruleRolePolicyWithWildcardResources('ClickStreamApi/StackActionStateMachine/ActionFunctionRole/DefaultPolicy/Resource', 'StackActionStateMachine', 'xray/logs');
    addCfnNagToStack(Stack.of(this), [
      {
        paths_endswith: wildcardResourcesStackActionStateMachine.paths_endswith,
        rules_to_suppress: [
          ...wildcardResourcesStackActionStateMachine.rules_to_suppress,
        ],
      },
    ]);
    addCfnNagToStack(Stack.of(this), [
      {
        paths_endswith: wildcardResourcesActionFunctionRole.paths_endswith,
        rules_to_suppress: [
          ...wildcardResourcesActionFunctionRole.rules_to_suppress,
        ],
      },
    ]);

  }
}