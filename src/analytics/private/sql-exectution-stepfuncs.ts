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
import { CfnResource, Duration } from 'aws-cdk-lib';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import {
  StateMachine, TaskInput, Wait, WaitTime, Succeed, Choice, Map,
  Condition, Fail, DefinitionBody, JsonPath, LogLevel, Pass,
} from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { ProvisionedRedshiftProps, RedshiftServerlessProps, WorkflowBucketInfo } from './model';
import { addCfnNagSuppressRules, rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions } from '../../common/cfn-nag';
import { createLambdaRole } from '../../common/lambda';
import { createLogGroup } from '../../common/logs';
import { SolutionNodejsFunction } from '../../private/function';


export interface SQLExecutionStepFunctionsProps {
  readonly dataAPIRole: IRole;
  readonly serverlessRedshift?: RedshiftServerlessProps;
  readonly provisionedRedshift?: ProvisionedRedshiftProps;
  readonly workflowBucketInfo: WorkflowBucketInfo;
  readonly databaseName: string;
}

export function createSQLExecutionStepFunctions(scope: Construct, props: SQLExecutionStepFunctionsProps) {

  const fn = createSQLExecutionStepFn(scope, props);

  const submitSQL = new LambdaInvoke(scope, 'Submit SQL', {
    lambdaFunction: fn,
    outputPath: '$.Payload',
  });

  submitSQL.addRetry({
    errors: ['Lambda.TooManyRequestsException'],
    interval: Duration.seconds(3),
    backoffRate: 2,
    maxAttempts: 10,
  });

  const wait1 = new Wait(scope, 'Wait #1', {
    time: WaitTime.secondsPath('$.waitTimeInfo.waitTime'),
  });

  const checkStatus = new LambdaInvoke(scope, 'Check Status', {
    lambdaFunction: fn,
    payload: TaskInput.fromObject({
      'queryId.$': '$.queryId',
      'waitTimeInfo.$': '$.waitTimeInfo',
    }),
    outputPath: '$.Payload',
  });

  checkStatus.addRetry({
    errors: ['Lambda.TooManyRequestsException'],
    interval: Duration.seconds(3),
    backoffRate: 2,
    maxAttempts: 10,
  });

  const isDoneChoice = new Choice(scope, 'Is Done?');

  const checkStatusAgain = new Wait(scope, 'Wait #2', {
    time: WaitTime.secondsPath('$.waitTimeInfo.waitTime'),
  }).next(checkStatus);

  const initWaitTimeInfo = new Pass(scope, 'Init wait time info', {
    parameters: {
      waitTime: 2,
      loopCount: 0,
    },
    resultPath: '$.waitTimeInfo',
  });

  const definition = initWaitTimeInfo
    .next(submitSQL)
    .next(wait1)
    .next(checkStatus)
    .next(isDoneChoice);

  isDoneChoice.when(Condition.stringEquals('$.status', 'FAILED'), new Fail(scope, 'Fail'));
  isDoneChoice.when(Condition.stringEquals('$.status', 'FINISHED'), new Succeed(scope, 'Succeed'));
  isDoneChoice.otherwise(checkStatusAgain);

  const map = new Map(scope, 'Execute SQL statements', {
    maxConcurrency: 1,
    itemsPath: '$.sqls',
    parameters: {
      sql: JsonPath.stringAt('$$.Map.Item.Value'),
    },
  });

  map.iterator(definition);

  return new StateMachine(scope, 'SQLExecutionStateMachine', {
    definitionBody: DefinitionBody.fromChainable(map),
    timeout: Duration.hours(2),
    comment: 'Execute SQL in Redshift using Redshift Data API',

    logs: {
      destination: createLogGroup(scope,
        {
          prefix: `/aws/vendedlogs/states/Clickstream/SQLExecutionStateMachine-${scope.node.id}`,
        },
      ),
      level: LogLevel.ALL,
    },
    tracingEnabled: true,
  });

}

function createSQLExecutionStepFn(scope: Construct, props: SQLExecutionStepFunctionsProps): Function {

  const role = createLambdaRole(scope, 'SQLExecutionStepFnRole', false, []);

  const fnId = 'SQLExecutionStepFn';
  const fn = new SolutionNodejsFunction(scope, fnId, {
    runtime: Runtime.NODEJS_18_X,
    entry: join(__dirname, '..', 'lambdas', 'sql-execution-sfn', 'sql-execution-step-fn.ts'),
    handler: 'handler',
    memorySize: 256,
    timeout: Duration.minutes(15),
    logRetention: RetentionDays.ONE_WEEK,
    environment: {
      REDSHIFT_DATA_API_ROLE: props.dataAPIRole.roleArn,
      REDSHIFT_DATABASE: props.databaseName,
      REDSHIFT_CLUSTER_IDENTIFIER: props.provisionedRedshift?.clusterIdentifier ?? '',
      REDSHIFT_DB_USER: props.provisionedRedshift?.dbUser ?? '',
      REDSHIFT_SERVERLESS_WORKGROUP_NAME: props.serverlessRedshift?.workgroupName ?? '',
    },
    role,
  });
  props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);
  props.workflowBucketInfo.s3Bucket.grantRead(fn, `${props.workflowBucketInfo.prefix}*`);

  addCfnNagSuppressRules(fn.node.defaultChild as CfnResource,
    rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions('CDK'));

  return fn;
}
