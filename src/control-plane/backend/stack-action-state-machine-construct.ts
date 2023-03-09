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
import { LogLevel } from '@aws-sdk/client-sfn';
import { Aws, aws_lambda, CfnResource, Duration, Stack } from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { ISecurityGroup, IVpc, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { Effect, Policy, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { StateMachine, JsonPath, Condition, Choice, WaitTime, Wait, TaskInput } from 'aws-cdk-lib/aws-stepfunctions';
import { CallAwsService, LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { addCfnNagToStack, ruleForLambdaVPCAndReservedConcurrentExecutions, ruleRolePolicyWithWildcardResources } from '../../common/cfn-nag';
import { cloudWatchSendLogs, createENI } from '../../common/lambda';
import { createLogGroupWithKmsKey } from '../../common/logs';
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
}

export class StackActionStateMachine extends Construct {

  readonly stateMachine: StateMachine;
  readonly callbackFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: StackActionStateMachineProps) {
    super(scope, id);

    // Create a role for create stack
    // TODO: this role grants least privilege.
    const sfnCreateStackRole = new Role(this, 'SFNCreateStackRole', {
      assumedBy: new ServicePrincipal('cloudformation.amazonaws.com'),
      inlinePolicies: {
        logs: new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: ['*'],
              resources: ['*'],
            }),
          ],
        }),
      },
    });
    (sfnCreateStackRole.node.defaultChild as CfnResource).addMetadata('cfn_nag', {
      rules_to_suppress: [
        {
          id: 'W11',
          reason: 'TODO: Wait for permission confirmation this role grants least privilege.',
        },
        {
          id: 'F3',
          reason: 'TODO: Wait for permission confirmation this role grants least privilege.',
        },
        {
          id: 'F38',
          reason: 'TODO: Wait for permission confirmation this role grants least privilege.',
        },
      ],
    });

    const createStack = new CallAwsService(this, 'CreateStack', {
      service: 'cloudformation',
      action: 'createStack',
      parameters: {
        StackName: JsonPath.stringAt('$.Input.StackName'),
        TemplateURL: JsonPath.stringAt('$.Input.TemplateURL'),
        Parameters: JsonPath.stringAt('$.Input.Parameters'),
        RoleARN: sfnCreateStackRole.roleArn,
      },
      resultPath: '$.Result.Stacks[0]',
      iamResources: [`arn:${Aws.PARTITION}:cloudformation:${Aws.REGION}:${Aws.ACCOUNT_ID}:stack/clickstream-*`],
    });

    const deleteStack = new CallAwsService(this, 'DeleteStack', {
      service: 'cloudformation',
      action: 'deleteStack',
      parameters: {
        StackName: JsonPath.stringAt('$.Input.StackName'),
      },
      resultPath: JsonPath.DISCARD,
      iamResources: [`arn:${Aws.PARTITION}:cloudformation:${Aws.REGION}:${Aws.ACCOUNT_ID}:stack/clickstream-*`],
    });

    const updateStack = new CallAwsService(this, 'UpdateStack', {
      service: 'cloudformation',
      action: 'updateStack',
      parameters: {
        StackName: JsonPath.stringAt('$.Input.StackName'),
        TemplateURL: JsonPath.stringAt('$.Input.TemplateURL'),
        Parameters: JsonPath.stringAt('$.Input.Parameters'),
      },
      resultPath: JsonPath.DISCARD,
      iamResources: [`arn:${Aws.PARTITION}:cloudformation:${Aws.REGION}:${Aws.ACCOUNT_ID}:stack/clickstream-*`],
    });

    const actionChoice = new Choice(this, 'Action')
      .when(Condition.stringEquals('$.Input.Action', 'Create'), createStack)
      .when(Condition.stringEquals('$.Input.Action', 'Delete'), deleteStack)
      .when(Condition.stringEquals('$.Input.Action', 'Update'), updateStack);

    const wait15 = new Wait(this, 'Wait 15 Seconds', {
      time: WaitTime.duration(Duration.seconds(15)),
    });
    const wait15Too = new Wait(this, 'Wait 15 Seconds Too', {
      time: WaitTime.duration(Duration.seconds(15)),
    });

    createStack.next(wait15);
    deleteStack.next(wait15Too);
    updateStack.next(wait15Too);

    const describeStacksByResult = new CallAwsService(this, 'DescribeStacksByResult', {
      service: 'cloudformation',
      action: 'describeStacks',
      parameters: {
        StackName: JsonPath.stringAt('$.Result.Stacks[0].StackId'),
      },
      resultPath: '$.Result',
      iamResources: [`arn:${Aws.PARTITION}:cloudformation:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`],
    });

    const describeStacksByName = new CallAwsService(this, 'DescribeStacksByName', {
      service: 'cloudformation',
      action: 'describeStacks',
      parameters: {
        StackName: JsonPath.stringAt('$.Input.StackName'),
      },
      resultPath: '$.Result',
      iamResources: [`arn:${Aws.PARTITION}:cloudformation:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`],
    });

    wait15.next(describeStacksByResult);
    wait15Too.next(describeStacksByName);

    // Create a role for lambda
    const callbackFunctionRole = new Role(this, 'CallbackFunctionRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });

    this.callbackFunction = new NodejsFunction(this, 'CallbackFunction', {
      description: 'Lambda function for state machine callback of solution Clickstream Analytics on AWS',
      entry: join(__dirname, './lambda/sfn-callback/index.ts'),
      handler: 'handler',
      runtime: props.targetToCNRegions ? Runtime.NODEJS_16_X : Runtime.NODEJS_18_X,
      tracing: aws_lambda.Tracing.ACTIVE,
      role: callbackFunctionRole,
      architecture: Architecture.ARM_64,
      environment: {
        ... POWERTOOLS_ENVS,
      },
      ...props.lambdaFuncProps,
    });
    props.clickStreamTable.grantReadWriteData(this.callbackFunction);
    cloudWatchSendLogs('callback-func-logs', this.callbackFunction);
    createENI('callback-func-eni', this.callbackFunction);
    addCfnNagToStack(Stack.of(this), [
      ruleForLambdaVPCAndReservedConcurrentExecutions(
        'StackActionStateMachine/CallbackFunction/Resource',
        'CallbackFunction',
      ),
    ]);

    const saveStackRuntimeTask = new LambdaInvoke(this, 'Save Stack Runtime', {
      lambdaFunction: this.callbackFunction,
      payload: TaskInput.fromJsonPathAt('$'),
      outputPath: '$.Payload',
    });

    const progressChoiceCreate = new Choice(this, 'Create in progress?')
      .when(Condition.stringMatches('$.Result.Stacks[0].StackStatus', '*_IN_PROGRESS'), wait15)
      .otherwise(saveStackRuntimeTask);

    const progressChoiceUpdate = new Choice(this, 'Update in progress?')
      .when(Condition.stringMatches('$.Result.Stacks[0].StackStatus', '*_IN_PROGRESS'), wait15Too)
      .otherwise(saveStackRuntimeTask);

    describeStacksByResult.next(progressChoiceCreate);
    describeStacksByName.next(progressChoiceUpdate);

    const stackActionLogGroup = createLogGroupWithKmsKey(this, {
      prefix: '/aws/vendedlogs/states/Clickstream/StackActionLogGroup',
    });
    // Define a state machine
    this.stateMachine = new StateMachine(this, 'StackActionStateMachine', {
      definition: actionChoice,
      logs: {
        destination: stackActionLogGroup,
        level: LogLevel.ALL,
      },
      tracingEnabled: true,
      timeout: Duration.minutes(30),
    });

    const wildcardResources = ruleRolePolicyWithWildcardResources('StackActionStateMachine/Role/DefaultPolicy/Resource', 'StackActionStateMachine', 'xray/logs');
    addCfnNagToStack(Stack.of(this), [
      {
        paths_endswith: wildcardResources.paths_endswith,
        rules_to_suppress: [
          ...wildcardResources.rules_to_suppress,
          {
            id: 'W76',
            reason: 'The state machine default policy document create by many CallAwsService.',
          },
        ],
      },
    ]);
    addCfnNagToStack(Stack.of(this), [
      ruleRolePolicyWithWildcardResources('CallbackFunctionRole/DefaultPolicy/Resource', 'CallbackFunInStateAction', 'xray'),
    ]);


    // Add pass role policy to sm role
    const cloudformationPolicy = new Policy(this, 'SMCloudformationPolicy', {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          resources: [sfnCreateStackRole.roleArn],
          actions: [
            'iam:PassRole',
          ],
        }),
      ],
    });
    cloudformationPolicy.attachToRole(this.stateMachine.role);

  }
}