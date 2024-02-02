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
import { Aws, aws_iam as iam, aws_lambda, Duration, CfnResource } from 'aws-cdk-lib';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Choice, Condition, DefinitionBody, LogLevel, Pass, StateMachine, TaskInput, Wait, WaitTime } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { LambdaFunctionNetworkProps } from './click-stream-api';
import { getStackPrefix } from './lambda/api/common/utils';
import {
  addCfnNagSuppressRules,
  rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions,
} from '../../common/cfn-nag';
import { createLambdaRole } from '../../common/lambda';
import { createLogGroup } from '../../common/logs';
import { SolutionNodejsFunction } from '../../private/function';

export interface StackActionStateMachineProps {
  readonly lambdaFunctionNetwork: LambdaFunctionNetworkProps;
  readonly targetToCNRegions?: boolean;
  readonly workflowBucket: IBucket;
  readonly iamRolePrefix?: string;
}

export class StackActionStateMachine extends Construct {

  readonly stateMachine: StateMachine;
  readonly actionFunction: SolutionNodejsFunction;

  constructor(scope: Construct, id: string, props: StackActionStateMachineProps) {
    super(scope, id);

    const actionFunctionRolePolicyStatements = [
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [`arn:${Aws.PARTITION}:cloudformation:*:${Aws.ACCOUNT_ID}:stack/${getStackPrefix(props.iamRolePrefix)}*`],
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
          'iam:UpdateRoleDescription',
          'iam:TagRole',
          'iam:UntagRole',
          'iam:ListRoleTags',
        ],
        resources: [
          `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/${props.iamRolePrefix}*`,
          `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:policy/${props.iamRolePrefix}*`,
          `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:instance-profile/${props.iamRolePrefix}*`,
        ],
      }),
      new iam.PolicyStatement({
        actions: [
          'iam:PassRole',
          'iam:CreateServiceLinkedRole',
        ],
        resources: [
          `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/aws-service-role/ecs.application-autoscaling.amazonaws.com/AWSServiceRoleForApplicationAutoScaling_ECSService`,
          `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/aws-service-role/autoscaling.amazonaws.com/AWSServiceRoleForAutoScaling`,
          `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS`,
          `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/aws-service-role/elasticloadbalancing.amazonaws.com/AWSServiceRoleForElasticLoadBalancing`,
          `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/aws-service-role/globalaccelerator.amazonaws.com/AWSServiceRoleForGlobalAccelerator`,
          `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/aws-service-role/servicecatalog-appregistry.amazonaws.com/AWSServiceRoleForAWSServiceCatalogAppRegistry`,
        ],
      }),
      // This list of actions is to ensure the call stack can be created/updated/deleted successfully.
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
          'servicecatalog:CreateApplication',
          'servicecatalog:UpdateApplication',
          'servicecatalog:DeleteApplication',
          'servicecatalog:GetApplication',
          'servicecatalog:GetAssociatedResource',
          'servicecatalog:AssociateResource',
          'servicecatalog:DisassociateResource',
          'servicecatalog:TagResource',
          'servicecatalog:UntagResource',
        ],
        resources: ['*'],
      }),
    ];
    const deployInVpc = props.lambdaFunctionNetwork.vpc !== undefined;
    this.actionFunction = new SolutionNodejsFunction(this, 'ActionFunction', {
      description: 'Lambda function for state machine action of solution Clickstream Analytics on AWS',
      entry: join(__dirname, './lambda/sfn-action/index.ts'),
      handler: 'handler',
      tracing: aws_lambda.Tracing.ACTIVE,
      role: createLambdaRole(this, 'ActionFunctionRole', deployInVpc, actionFunctionRolePolicyStatements),
      timeout: Duration.seconds(15),
      ...props.lambdaFunctionNetwork,
    });
    addCfnNagSuppressRules(this.actionFunction.node.defaultChild as CfnResource, [
      ...rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions('ActionFunction'),
    ]);

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
      definitionBody: DefinitionBody.fromChainable(executeTask),
      logs: {
        destination: stackActionLogGroup,
        level: LogLevel.ALL,
      },
      tracingEnabled: true,
      timeout: Duration.minutes(120),
    });
  }
}