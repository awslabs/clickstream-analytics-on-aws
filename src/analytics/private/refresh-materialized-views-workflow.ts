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
import { IRole } from 'aws-cdk-lib/aws-iam';
import { IFunction, LayerVersion, Code } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { StateMachine, LogLevel, IStateMachine, DefinitionBody, Wait, WaitTime, Succeed, Condition, Choice, Fail, TaskInput, Pass, Map } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { ExistingRedshiftServerlessCustomProps, ProvisionedRedshiftProps } from './model';
import { createLambdaRole } from '../../common/lambda';
import { createLogGroup } from '../../common/logs';
import { REDSHIFT_MODE } from '../../common/model';
import { SolutionNodejsFunction } from '../../private/function';
import { WorkflowStatus } from '../private/constant';

export interface RefreshMaterializedViewsWorkflowProps {
  readonly appIds: string;
  readonly projectId: string;
  readonly securityGroupForLambda: ISecurityGroup;
  readonly networkConfig: {
    readonly vpc: IVpc;
    readonly vpcSubnets: SubnetSelection;
  };
  readonly serverlessRedshift?: ExistingRedshiftServerlessCustomProps;
  readonly provisionedRedshift?: ProvisionedRedshiftProps;
  readonly databaseName: string;
  readonly dataAPIRole: IRole;
}

export class RefreshMaterializedViewsWorkflow extends Construct {
  public readonly refreshMaterializedViewsMachine: IStateMachine;

  private readonly lambdaRootPath = __dirname + '/../lambdas/refresh-materialized-views-workflow';
  constructor(scope: Construct, id: string, props: RefreshMaterializedViewsWorkflowProps) {
    super(scope, id);
    this.refreshMaterializedViewsMachine = this.createWorkflow(props);
  }

  private createWorkflow(props: RefreshMaterializedViewsWorkflowProps): IStateMachine {

    const refreshSpFn = this.refreshSpFn(props);
    const refreshSpFnJob = new LambdaInvoke(this, `${this.node.id} - refresh SP`, {
      lambdaFunction: refreshSpFn,
      payload: TaskInput.fromObject({
        'detail.$': '$.detail',
        'originalInput.$': '$$.Execution.Input',
      }),
      outputPath: '$.Payload',
    });

    const checkRefreshStatusFn = this.checkRefreshStatusFn(props);
    const checkRefreshMVStatusJob = new LambdaInvoke(this, `${this.node.id} - Check refresh MV status`, {
      lambdaFunction: checkRefreshStatusFn,
      payload: TaskInput.fromObject({
        'detail.$': '$.detail',
        'originalInput.$': '$$.Execution.Input',
        'waitTimeInfo.$': '$.waitTimeInfo',
      }),
      outputPath: '$.Payload',
    });

    const checkRefreshSPStatusJob = new LambdaInvoke(this, `${this.node.id} - Check refresh SP status`, {
      lambdaFunction: checkRefreshStatusFn,
      payload: TaskInput.fromObject({
        'detail.$': '$.detail',
        'originalInput.$': '$$.Execution.Input',
        'waitTimeInfo.$': '$.waitTimeInfo',
      }),
      outputPath: '$.Payload',
    });

    const waitCheckMVStatus = new Wait(this, 'Wait check MV status seconds', {
      /**
         *  You can also implement with the path stored in the state like:
         *  sfn.WaitTime.secondsPath('$.waitSeconds')
         */
      time: WaitTime.secondsPath('$.waitTimeInfo.waitTime'),
    });

    const initCheckMVWaitTimeInfo = new Pass(this, 'Init Check MV wait time info', {
      parameters: {
        waitTime: 10,
        loopCount: 0,
      },
      resultPath: '$.waitTimeInfo',
    });

    const waitCheckSPStatus = new Wait(this, 'Wait check SP status seconds', {
      /**
         *  You can also implement with the path stored in the state like:
         *  sfn.WaitTime.secondsPath('$.waitSeconds')
         */
      time: WaitTime.secondsPath('$.waitTimeInfo.waitTime'),
    });

    const initCheckSPWaitTimeInfo = new Pass(this, 'Init Check SP wait time info', {
      parameters: {
        waitTime: 10,
        loopCount: 0,
      },
      resultPath: '$.waitTimeInfo',
    });

    const refreshBasicViewFn = this.refreshBasicViewFn(props);
    const refreshBasicViewFnJob = new LambdaInvoke(this, `${this.node.id} - refresh basic view`, {
      lambdaFunction: refreshBasicViewFn,
      payload: TaskInput.fromObject({
        'detail.$': '$.detail',
        'originalInput.$': '$$.Execution.Input',
      }),
      outputPath: '$.Payload',
    });

    const checkNextRefreshedViewFn = this.checkNextRefreshedViewFn(props);
    const checkNextRefreshedViewJob = new LambdaInvoke(this, `${this.node.id} - Check next view should be refreshed`, {
      lambdaFunction: checkNextRefreshedViewFn,
      payload: TaskInput.fromObject({
        'detail.$': '$.detail',
        'appId.$': '$.appId',
        'originalInput.$': '$$.Execution.Input',
      }),
      outputPath: '$.Payload',
    });

    const checkNextRefreshedViewJobFail = new Fail(this, `${this.node.id} - check next refresh view or sp fail`, {
      cause: 'checkNextRefreshedViewJob failed',
      error: 'Check next refresh view or sp FAILED',
    });

    const refreshViewJobFailed = new Fail(this, `${this.node.id} - Refresh view or sp job fails`, {
      cause: 'Refresh View or SP Job Failed',
      error: 'Refresh View or SP Job FAILED',
    });

    refreshBasicViewFnJob
      .next(initCheckMVWaitTimeInfo)
      .next(waitCheckMVStatus)
      .next(checkRefreshMVStatusJob)
      .next(
        new Choice(this, `${this.node.id} - Check if refresh view job completes`)
          .when(Condition.stringEquals('$.detail.status', WorkflowStatus.FAILED), refreshViewJobFailed)
          .when(Condition.stringEquals('$.detail.status', WorkflowStatus.ABORTED), refreshViewJobFailed)
          .when(Condition.stringEquals('$.detail.status', WorkflowStatus.FINISHED), checkNextRefreshedViewJob)
          .otherwise(waitCheckMVStatus),
      );

    refreshSpFnJob
      .next(initCheckSPWaitTimeInfo)
      .next(waitCheckSPStatus)
      .next(checkRefreshSPStatusJob)
      .next(
        new Choice(this, `${this.node.id} - Check if refresh SP job completes`)
          .when(Condition.stringEquals('$.detail.status', WorkflowStatus.FAILED), refreshViewJobFailed)
          .when(Condition.stringEquals('$.detail.status', WorkflowStatus.ABORTED), refreshViewJobFailed)
          .when(Condition.stringEquals('$.detail.status', WorkflowStatus.FINISHED), checkNextRefreshedViewJob)
          .otherwise(waitCheckSPStatus),
      );

    const doNothing = new Succeed(this, `${this.node.id} - Do Nothing`);

    const doRefreshJobSucceed = new Succeed(this, `${this.node.id} - Refresh job succeed`);

    checkNextRefreshedViewJob
      .next(
        new Choice(this, `${this.node.id} - Check next view or sp should be refreshed`)
          .when(Condition.stringEquals('$.detail.taskType', 'MV'), refreshBasicViewFnJob)
          .when(Condition.stringEquals('$.detail.taskType', 'SP'), refreshSpFnJob)
          .when(Condition.stringEquals('$.detail.taskType', 'END'), doNothing)
          .otherwise(checkNextRefreshedViewJobFail),
      );

    const doRefreshJob = new Map(
      this,
      `${this.node.id} - Do refresh job`,
      {
        maxConcurrency: 1,
        itemsPath: '$.GetJobList.appIdList',
        inputPath: '$',
        parameters: {
          'appId.$': '$$.Map.Item.Value',
          'detail.$': '$',
        },
        resultPath: '$.doRefreshJobResult',
      },
    );

    doRefreshJob.itemProcessor(checkNextRefreshedViewJob);
    doRefreshJob.next(doRefreshJobSucceed);

    const checkJobExist = new Choice(this, `${this.node.id} - Check if job exists`)
      .when(Condition.isPresent('$.GetJobList.appIdList'), doRefreshJob)
      .otherwise(doRefreshJobSucceed);

    const getAppListFromProps = new Pass(this, `${this.node.id} - Get app_id from props`, {
      parameters: {
        'appIdList.$': `States.StringSplit('${props.appIds}', ',')`,
      },
      resultPath: '$.GetJobList',
    }).next(checkJobExist);

    const getJobListFromInput = new Pass(this, `${this.node.id} - Get app_id from input`, {
      parameters: {
        'appIdList.$': 'States.StringSplit($.appIdList, \',\')',
      },
      resultPath: '$.GetJobList',
    }).next(checkJobExist);

    const getAppIdList = new Choice(this, `${this.node.id} - Check if app_id list exists`)
      .when(Condition.isPresent('$.appIdList'), getJobListFromInput)
      .otherwise(getAppListFromProps);

    // Create state machine
    const refreshMaterializedViewsMachine = new StateMachine(this, 'RefreshMaterializedViewsMachine', {
      definitionBody: DefinitionBody.fromChainable(getAppIdList),
      logs: {
        destination: createLogGroup(this,
          {
            prefix: '/aws/vendedlogs/states/Clickstream/RefreshMaterializedViewsMachine',
          },
        ),
        level: LogLevel.ALL,
      },
      tracingEnabled: true,
      comment: 'This state machine is responsible for refreshing materialized views',
    });

    return refreshMaterializedViewsMachine;
  }

  private checkNextRefreshedViewFn(props: RefreshMaterializedViewsWorkflowProps): IFunction {
    const fnSG = props.securityGroupForLambda;

    const viewAndSpListLayer = new LayerVersion(this, 'ViewAndSpListLayer', {
      code: Code.fromAsset(this.lambdaRootPath),
      description: 'View and SP list',
    });

    const fn = new SolutionNodejsFunction(this, 'CheckNextRefreshedView', {
      entry: join(
        this.lambdaRootPath,
        'check-next-refresh-view.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(3),
      logConf: {
        retention: RetentionDays.ONE_WEEK,
      },
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, 'CheckNextRefreshedViewRole', true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        ... this.toRedshiftEnvVariables(props),
        PROJECT_ID: props.projectId,
        REDSHIFT_DATA_API_ROLE: props.dataAPIRole.roleArn,
      },
      applicationLogLevel: 'WARN',
      layers: [viewAndSpListLayer],
    });
    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);
    return fn;
  }

  private refreshBasicViewFn(props: RefreshMaterializedViewsWorkflowProps): IFunction {
    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, 'RefreshBasicView', {
      entry: join(
        this.lambdaRootPath,
        'refresh-basic-view.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(3),
      logConf: {
        retention: RetentionDays.ONE_WEEK,
      },
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, 'RefreshBasicViewRole', true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        ... this.toRedshiftEnvVariables(props),
        PROJECT_ID: props.projectId,
        REDSHIFT_DATA_API_ROLE: props.dataAPIRole.roleArn,
      },
      applicationLogLevel: 'WARN',
    });
    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);
    return fn;
  }

  private checkRefreshStatusFn(props: RefreshMaterializedViewsWorkflowProps): IFunction {
    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, 'CheckRefreshStatus', {
      entry: join(
        this.lambdaRootPath,
        'check-refresh-status.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(3),
      logConf: {
        retention: RetentionDays.ONE_WEEK,
      },
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, 'CheckRefreshStatusRole', true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        ... this.toRedshiftEnvVariables(props),
        PROJECT_ID: props.projectId,
        REDSHIFT_DATA_API_ROLE: props.dataAPIRole.roleArn,
      },
      applicationLogLevel: 'WARN',
    });
    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);
    return fn;
  }

  private refreshSpFn(props: RefreshMaterializedViewsWorkflowProps): IFunction {
    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, 'RefreshSp', {
      entry: join(
        this.lambdaRootPath,
        'refresh-sp.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(3),
      logConf: {
        retention: RetentionDays.ONE_WEEK,
      },
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, 'RefreshSpRole', true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        ... this.toRedshiftEnvVariables(props),
        PROJECT_ID: props.projectId,
        REDSHIFT_DATA_API_ROLE: props.dataAPIRole.roleArn,
      },
      applicationLogLevel: 'WARN',
    });
    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);
    return fn;
  }

  private toRedshiftEnvVariables(props: RefreshMaterializedViewsWorkflowProps) : {
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
}