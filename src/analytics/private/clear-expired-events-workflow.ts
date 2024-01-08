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
import { Duration } from 'aws-cdk-lib';
import { ISecurityGroup, IVpc, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { SfnStateMachine } from 'aws-cdk-lib/aws-events-targets';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { StateMachine, LogLevel, IStateMachine, TaskInput, Wait, WaitTime, Succeed, Fail, Choice, Map, Condition, Pass, DefinitionBody } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { ClearExpiredEventsWorkflowData, ExistingRedshiftServerlessCustomProps, ProvisionedRedshiftProps } from './model';
import { createLambdaRole } from '../../common/lambda';
import { createLogGroup } from '../../common/logs';
import { REDSHIFT_MODE } from '../../common/model';
import { POWERTOOLS_ENVS } from '../../common/powertools';
import { SolutionNodejsFunction } from '../../private/function';

export interface ClearExpiredEventsWorkflowProps {
  readonly appId: string;
  readonly networkConfig: {
    readonly vpc: IVpc;
    readonly vpcSubnets: SubnetSelection;
  };
  readonly securityGroupForLambda: ISecurityGroup;
  readonly serverlessRedshift?: ExistingRedshiftServerlessCustomProps;
  readonly provisionedRedshift?: ProvisionedRedshiftProps;
  readonly databaseName: string;
  readonly dataAPIRole: IRole;
  readonly clearExpiredEventsWorkflowData: ClearExpiredEventsWorkflowData;
}

export class ClearExpiredEventsWorkflow extends Construct {
  private readonly lambdaRootPath = __dirname + '/../lambdas/clear-expired-events-workflow';
  public readonly clearExpiredEventsWorkflow: IStateMachine;

  constructor(scope: Construct, id: string, props: ClearExpiredEventsWorkflowProps) {
    super(scope, id);

    // create Step function workflow to orchestrate the workflow to clear expired events.
    this.clearExpiredEventsWorkflow = this.createWorkflow(props);

    // Create an EventBridge Rule to trigger the workflow periodically
    const rule = new Rule(scope, 'ClearExpiredEventsScheduleRule', {
      schedule: Schedule.expression(props.clearExpiredEventsWorkflowData.scheduleExpression),
    });
    rule.addTarget(new SfnStateMachine(this.clearExpiredEventsWorkflow));
  }

  private createWorkflow(props: ClearExpiredEventsWorkflowProps): IStateMachine {
    const getJobList = new Pass(this, `${this.node.id} - Get app_id`, {
      parameters: {
        Payload: {
          'appIdList.$': `States.StringSplit('${props.appId}', ',')`,
        },
      },
      outputPath: '$.Payload',
    });

    const clearExpiredEventsFn = this.clearExpiredEventsFn(props);
    const submitJob = new LambdaInvoke(this, `${this.node.id} - Submit clear job`, {
      lambdaFunction: clearExpiredEventsFn,
      payload: TaskInput.fromObject({
        detail: {
          'appId.$': '$',
          'retentionRangeDays': props.clearExpiredEventsWorkflowData.retentionRangeDays,
        },
      }),
      outputPath: '$.Payload',
    });

    const createCheckClearJobStatusFn = this.createCheckClearJobStatusFn(props);

    const checkJobStatus = new LambdaInvoke(this, `${this.node.id} - Check clear job status`, {
      lambdaFunction: createCheckClearJobStatusFn,
      payload: TaskInput.fromObject({
        'detail.$': '$.detail',
      }),
      outputPath: '$.Payload',
    });

    const waitX = new Wait(this, `${this.node.id} - Wait seconds`, {
      /**
         *  You can also implement with the path stored in the state like:
         *  sfn.WaitTime.secondsPath('$.waitSeconds')
         */
      time: WaitTime.duration(Duration.seconds(30)),
    });

    const jobFailed = new Fail(this, `${this.node.id} - clear job fails`, {
      cause: 'ClearExpiredEvents Job Failed',
      error: 'DescribeJob returned FAILED',
    });

    const finalStatus = new Succeed(this, `${this.node.id} - clear job completes`);

    // Create sub chain
    const subDefinition = submitJob
      .next(waitX)
      .next(checkJobStatus)
      .next(new Choice(this, `${this.node.id} - Check if clear job completes`)
      // Look at the "status" field
        .when(Condition.stringEquals('$.detail.status', 'FAILED'), jobFailed)
        .when(Condition.stringEquals('$.detail.status', 'ABORTED'), jobFailed)
        .when(Condition.stringEquals('$.detail.status', 'FINISHED'), finalStatus)
        .when(Condition.stringEquals('$.detail.status', 'NO_JOBS'), finalStatus)
        .otherwise(waitX));

    const doClearJob = new Map(
      this,
      `${this.node.id} - Do clear job`,
      {
        maxConcurrency: 1,
        itemsPath: '$.appIdList',
      },
    );
    doClearJob.iterator(subDefinition);

    const doNothing = new Succeed(this, `${this.node.id} - Do Nothing`);
    const checkJobExist = new Choice(this, `${this.node.id} - Check if job exists`)
      .when(Condition.isNotPresent('$.appIdList'), doNothing)
      .when(Condition.isPresent('$.appIdList'), doClearJob)
      .otherwise(doNothing);

    const definition = getJobList.next(checkJobExist);

    // Create state machine
    const clearExpiredEventsStateMachine = new StateMachine(this, 'ClearExpiredEventsStateMachine', {
      definitionBody: DefinitionBody.fromChainable(definition),
      logs: {
        destination: createLogGroup(this,
          {
            prefix: '/aws/vendedlogs/states/Clickstream/ClearExpiredEventsStateMachine',
          },
        ),
        level: LogLevel.ALL,
      },
      tracingEnabled: true,
    });

    return clearExpiredEventsStateMachine;
  }

  private clearExpiredEventsFn(props: ClearExpiredEventsWorkflowProps): IFunction {
    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, 'ClearExpiredEventsFn', {
      runtime: Runtime.NODEJS_18_X,
      entry: join(
        this.lambdaRootPath,
        'clear-expired-events.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(3),
      logRetention: RetentionDays.ONE_WEEK,
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, 'ClearExpiredEventsRole', true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        ... this.toRedshiftEnvVariables(props),
        REDSHIFT_DATA_API_ROLE: props.dataAPIRole.roleArn,
        ... POWERTOOLS_ENVS,
      },
    });
    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);
    return fn;
  }

  private toRedshiftEnvVariables(props: ClearExpiredEventsWorkflowProps) : {
    [key: string]: string;
  } {
    return {
      REDSHIFT_MODE: props.serverlessRedshift ? REDSHIFT_MODE.SERVERLESS : REDSHIFT_MODE.PROVISIONED,
      REDSHIFT_SERVERLESS_WORKGROUP_NAME: props.serverlessRedshift?.workgroupName ?? '',
      REDSHIFT_CLUSTER_IDENTIFIER: props.provisionedRedshift?.clusterIdentifier ?? '',
      REDSHIFT_DATABASE: props.databaseName,
      REDSHIFT_DB_USER: props.provisionedRedshift?.dbUser ?? '',
    };
  }

  private createCheckClearJobStatusFn(props: ClearExpiredEventsWorkflowProps): IFunction {
    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, 'CheckClearJobStatusFn', {
      runtime: Runtime.NODEJS_18_X,
      entry: join(
        this.lambdaRootPath,
        'check-clear-status.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(2),
      logRetention: RetentionDays.ONE_WEEK,
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, 'CheckClearJobStatusRole', true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        ... this.toRedshiftEnvVariables(props),
        REDSHIFT_DATA_API_ROLE: props.dataAPIRole.roleArn,
        ... POWERTOOLS_ENVS,
      },
    });

    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);

    return fn;
  }
}
