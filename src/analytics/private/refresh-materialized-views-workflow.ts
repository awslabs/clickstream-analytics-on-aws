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
import { IRole, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays, LogGroup } from 'aws-cdk-lib/aws-logs';
import { StateMachine, LogLevel, IStateMachine, DefinitionBody, Wait, WaitTime, Succeed, Condition, Choice, Fail, TaskInput, Pass, Map, IntegrationPattern } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke, StepFunctionsStartExecution } from 'aws-cdk-lib/aws-stepfunctions-tasks';
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
  readonly dataFreshnessInHour: number;
  readonly refreshReportDays: number;
  readonly refreshMode: string;
  readonly timezoneWithAppId: string;
}

export class RefreshMaterializedViewsWorkflow extends Construct {
  public readonly refreshMaterializedViewsMachine: IStateMachine;

  private readonly lambdaRootPath = __dirname + '/../lambdas/refresh-materialized-views-workflow';
  constructor(scope: Construct, id: string, props: RefreshMaterializedViewsWorkflowProps) {
    super(scope, id);
    this.refreshMaterializedViewsMachine = this.createWorkflow(props);
  }

  private createWorkflow(props: RefreshMaterializedViewsWorkflowProps): IStateMachine {
    const stepFunctionLogGroup = createLogGroup(this, { prefix: '/aws/vendedlogs/states/Clickstream/RefreshMaterializedViews' });

    const lambdaLogGroup = createLogGroup(this, {
      prefix: '/aws/lambda/Clickstream/RefreshMaterializedViews',
      retention: RetentionDays.ONE_WEEK,
    }, 'LambdaLogGroup');

    const checkRefreshMvStatusFn = this.checkRefreshMvStatusFn(props, lambdaLogGroup);
    const checkRefreshMvStatusJob = new LambdaInvoke(this, `${this.node.id} - Check refresh MV status`, {
      lambdaFunction: checkRefreshMvStatusFn,
      payload: TaskInput.fromObject({
        'detail.$': '$.detail',
        'timezoneWithAppId.$': '$.timezoneWithAppId',
        'waitTimeInfo.$': '$.waitTimeInfo',
      }),
      outputPath: '$.Payload',
    });

    checkRefreshMvStatusJob.addRetry({
      errors: ['Lambda.TooManyRequestsException'],
      interval: Duration.seconds(3),
      backoffRate: 2,
      maxAttempts: 6,
    });

    const waitCheckMVStatus = new Wait(this, 'Wait check MV status seconds', {
      time: WaitTime.secondsPath('$.waitTimeInfo.waitTime'),
    });

    const initCheckMVWaitTimeInfo = new Pass(this, 'Init Check MV wait time info', {
      parameters: {
        waitTime: 5,
        loopCount: 0,
      },
      resultPath: '$.waitTimeInfo',
    });

    const refreshBasicViewFn = this.refreshBasicViewFn(props, lambdaLogGroup);
    const refreshBasicViewFnJob = new LambdaInvoke(this, `${this.node.id} - refresh basic view`, {
      lambdaFunction: refreshBasicViewFn,
      payload: TaskInput.fromObject({
        'view.$': '$.view',
        'timezoneWithAppId.$': '$.timezoneWithAppId',
        'originalInput.$': '$$.Execution.Input',
      }),
      outputPath: '$.Payload',
    });

    refreshBasicViewFnJob.addRetry({
      errors: ['Lambda.TooManyRequestsException'],
      interval: Duration.seconds(3),
      backoffRate: 2,
      maxAttempts: 6,
    });

    const getRefreshViewListFn = this.getRefreshViewListFn(props, lambdaLogGroup);
    const getRefreshViewListJob = new LambdaInvoke(this, `${this.node.id} - Get view list which should be refreshed`, {
      lambdaFunction: getRefreshViewListFn,
      payload: TaskInput.fromObject({
        'timezoneWithAppId.$': '$.timezoneWithAppId',
        'originalInput.$': '$$.Execution.Input',
      }),
      outputPath: '$.Payload',
    });

    getRefreshViewListJob.addRetry({
      errors: ['Lambda.TooManyRequestsException'],
      interval: Duration.seconds(3),
      backoffRate: 2,
      maxAttempts: 6,
    });

    const checkNextRefreshViewJobFail = new Fail(this, `${this.node.id} - check next refresh view fail`, {
      cause: 'checkNextRefreshViewJob failed',
      error: 'Check next refresh view FAILED',
    });

    const refreshViewJobFailed = new Fail(this, `${this.node.id} - Refresh view job fails`, {
      cause: 'Refresh View Job Failed',
      error: 'Refresh View Job FAILED',
    });

    const refreshBasicViewComplete = new Pass(this, `${this.node.id} - refresh basic view completes`);

    refreshBasicViewFnJob
      .next(initCheckMVWaitTimeInfo)
      .next(waitCheckMVStatus)
      .next(checkRefreshMvStatusJob)
      .next(
        new Choice(this, `${this.node.id} - Check if refresh view job completes`)
          .when(Condition.stringEquals('$.detail.status', WorkflowStatus.FAILED), refreshViewJobFailed)
          .when(Condition.stringEquals('$.detail.status', WorkflowStatus.ABORTED), refreshViewJobFailed)
          .when(Condition.stringEquals('$.detail.status', WorkflowStatus.FINISHED), refreshBasicViewComplete)
          .otherwise(waitCheckMVStatus),
      );

    const refreshJobSucceed = new Succeed(this, `${this.node.id} - Refresh job succeed`);

    const refreshJobSucceedForAnAppId = new Pass(this, `${this.node.id} - Refresh job succeed for an app_id`);

    const doRefreshSpWorkflowSuccess = new Pass(this, `${this.node.id} - Refresh sp workflow succeed`);

    const refreshSpSubWorkflow = this.createSubWorkflow(props, lambdaLogGroup, stepFunctionLogGroup);

    const subExecution = new StepFunctionsStartExecution(this, `${this.node.id} - refresh sp workflow`, {
      stateMachine: refreshSpSubWorkflow,
      associateWithParent: true,
      integrationPattern: IntegrationPattern.RUN_JOB,
      input: TaskInput.fromObject({
        'timezoneWithAppId.$': '$.timezoneWithAppId',
        'originalInput.$': '$$.Execution.Input',
      }),
      outputPath: '$.Output',
    });

    subExecution.next(doRefreshSpWorkflowSuccess);

    const doRefreshBasicViewJob = new Map(
      this,
      `${this.node.id} - Do refresh basic view job`,
      {
        maxConcurrency: 1,
        itemsPath: '$.viewList',
        inputPath: '$',
        itemSelector: {
          'view.$': '$$.Map.Item.Value',
          'timezoneWithAppId.$': '$.timezoneWithAppId',
        },
        resultPath: '$.doRefreshBasicViewJobResult',
      },
    );
    doRefreshBasicViewJob.itemProcessor(refreshBasicViewFnJob);
    doRefreshBasicViewJob.next(subExecution);

    getRefreshViewListJob
      .next(
        new Choice(this, `${this.node.id} - Choice for next view should be refreshed`)
          .when(Condition.stringEquals('$.nextStep', 'REFRESH_MV'), doRefreshBasicViewJob)
          .when(Condition.stringEquals('$.nextStep', 'END'), refreshJobSucceedForAnAppId)
          .otherwise(checkNextRefreshViewJobFail),
      );

    const doRefreshJob = new Map(
      this,
      `${this.node.id} - Do refresh job`,
      {
        maxConcurrency: 1,
        itemsPath: '$.timezoneWithAppIdList',
        inputPath: '$',
        itemSelector: {
          'timezoneWithAppId.$': '$$.Map.Item.Value',
        },
        resultPath: '$.timezoneWithAppId',
      },
    );

    doRefreshJob.itemProcessor(getRefreshViewListJob);
    doRefreshJob.next(refreshJobSucceed);

    const checkJobExist = new Choice(this, `${this.node.id} - Check if job exists`)
      .when(Condition.isPresent('$.timezoneWithAppIdList'), doRefreshJob)
      .otherwise(refreshJobSucceed);

    const parseTimeZoneWithAppIdListFn = this.parseTimeZoneWithAppIdList(props, lambdaLogGroup);
    const parseTimeZoneWithAppIdListJob = new LambdaInvoke(this, `${this.node.id} - Parse timezone with appId list from props`, {
      lambdaFunction: parseTimeZoneWithAppIdListFn,
      outputPath: '$.Payload',
    });

    parseTimeZoneWithAppIdListJob.addRetry({
      errors: ['Lambda.TooManyRequestsException'],
      interval: Duration.seconds(3),
      backoffRate: 2,
      maxAttempts: 6,
    });

    parseTimeZoneWithAppIdListJob.next(checkJobExist);

    const getJobListFromInput = new Pass(this, `${this.node.id} - Get app_id from input`, {
      parameters: {
        'timezoneWithAppIdList.$': '$$.Execution.Input.timezoneWithAppIdList',
      },
    }).next(checkJobExist);

    const getAppIdList = new Choice(this, `${this.node.id} - Check if app_id list exists`)
      .when(Condition.isPresent('$$.Execution.Input.timezoneWithAppIdList'), getJobListFromInput)
      .otherwise(parseTimeZoneWithAppIdListJob);

    // add lambda job to check exist execution
    const checkWorkflowStartFn = this.checkWorkflowStartFn(props, lambdaLogGroup);
    const checkWorkflowStartJob = new LambdaInvoke(this, `${this.node.id} - Check whether refresh workflow should start`, {
      lambdaFunction: checkWorkflowStartFn,
      payload: TaskInput.fromObject({
        'executionId.$': '$$.Execution.Id',
      }),
      outputPath: '$.Payload',
    });

    const refreshWorkflowDefinition = checkWorkflowStartJob
      .next(
        new Choice(this, `${this.node.id} - Check if refresh workflow start`)
          .when(Condition.stringEquals('$.status', WorkflowStatus.SKIP), refreshJobSucceed)
          .when(Condition.stringEquals('$.status', WorkflowStatus.CONTINUE), getAppIdList));

    // Create state machine
    const refreshMaterializedViewsMachine = new StateMachine(this, 'RefreshMVStateMachine', {
      definitionBody: DefinitionBody.fromChainable(refreshWorkflowDefinition),
      logs: {
        destination: stepFunctionLogGroup,
        level: LogLevel.ALL,
      },
      tracingEnabled: true,
      comment: 'This state machine is responsible for refreshing materialized views',
    });

    checkWorkflowStartFn.role?.attachInlinePolicy(new Policy(this, 'stateFlowListPolicy', {
      statements: [
        new PolicyStatement({
          actions: [
            'states:ListExecutions',
          ],
          resources: [
            refreshMaterializedViewsMachine.stateMachineArn,
          ],
        }),
      ],
    }));

    return refreshMaterializedViewsMachine;
  }

  private parseTimeZoneWithAppIdList(props: RefreshMaterializedViewsWorkflowProps, logGroup: LogGroup): IFunction {
    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, 'ParseTimeZoneWithAppIdList', {
      entry: join(
        this.lambdaRootPath,
        'parse-timezone-with-appId-list.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(3),
      logGroup,
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, 'ParseTimeZoneWithAppIdListRule', true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        TIMEZONE_WITH_APPID_LIST: props.timezoneWithAppId,
      },
      applicationLogLevel: 'WARN',
    });
    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);
    return fn;
  }

  private checkWorkflowStartFn(props: RefreshMaterializedViewsWorkflowProps, logGroup: LogGroup): IFunction {
    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, 'CheckRefreshWorkflowStart', {
      entry: join(
        this.lambdaRootPath,
        'check-refresh-workflow-start.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.seconds(30),
      logGroup,
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, 'CheckRefreshWorkflowStartRule', true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        TIMEZONE_WITH_APPID_LIST: props.timezoneWithAppId,
      },
      applicationLogLevel: 'WARN',
    });
    return fn;
  }

  private getRefreshViewListFn(props: RefreshMaterializedViewsWorkflowProps, logGroup: LogGroup): IFunction {
    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, 'GetRefreshViewList', {
      entry: join(
        this.lambdaRootPath,
        'get-refresh-viewlist.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(3),
      logGroup,
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, 'GetRefreshViewListRole', true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        PROJECT_ID: props.projectId,
        REFRESH_MODE: props.refreshMode,
      },
      applicationLogLevel: 'WARN',
    });
    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);
    return fn;
  }

  private refreshBasicViewFn(props: RefreshMaterializedViewsWorkflowProps, logGroup: LogGroup): IFunction {
    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, 'RefreshBasicView', {
      entry: join(
        this.lambdaRootPath,
        'refresh-basic-view.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(3),
      logGroup,
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, 'RefreshBasicViewRole', true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        ... this.toRedshiftEnvVariables(props),
        PROJECT_ID: props.projectId,
        REDSHIFT_DATA_API_ROLE: props.dataAPIRole.roleArn,
        DATA_REFRESHNESS_IN_HOUR: props.dataFreshnessInHour.toString(),
      },
      applicationLogLevel: 'WARN',
    });
    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);
    return fn;
  }

  private checkStartSpRefreshFn(props: RefreshMaterializedViewsWorkflowProps, logGroup: LogGroup): IFunction {
    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, 'CheckStartSpRefresh', {
      entry: join(
        this.lambdaRootPath,
        'check-start-sp-refresh.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(3),
      logGroup,
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, 'CheckStartSpRefreshRole', true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        ... this.toRedshiftEnvVariables(props),
        PROJECT_ID: props.projectId,
        REDSHIFT_DATA_API_ROLE: props.dataAPIRole.roleArn,
        REFRESH_MODE: props.refreshMode,
        REFRESH_SP_DAYS: props.refreshReportDays.toString(),
      },
      applicationLogLevel: 'WARN',
    });
    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);
    return fn;
  }

  private checkRefreshMvStatusFn(props: RefreshMaterializedViewsWorkflowProps, logGroup: LogGroup): IFunction {
    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, 'CheckRefreshMvStatus', {
      entry: join(
        this.lambdaRootPath,
        'check-refresh-mv-status.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(3),
      logGroup,
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, 'CheckRefreshMvStatusRole', true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        PROJECT_ID: props.projectId,
        REDSHIFT_DATA_API_ROLE: props.dataAPIRole.roleArn,
      },
      applicationLogLevel: 'WARN',
    });
    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);
    return fn;
  }

  private checkRefreshSpStatusFn(props: RefreshMaterializedViewsWorkflowProps, logGroup: LogGroup): IFunction {
    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, 'CheckRefreshSpStatus', {
      entry: join(
        this.lambdaRootPath,
        'check-refresh-sp-status.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(3),
      logGroup,
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, 'CheckRefreshSpStatusRole', true, []),
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

  private refreshSpFn(props: RefreshMaterializedViewsWorkflowProps, logGroup: LogGroup): IFunction {
    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, 'RefreshSp', {
      entry: join(
        this.lambdaRootPath,
        'refresh-sp.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(3),
      logGroup,
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

  private createSubWorkflow(props: RefreshMaterializedViewsWorkflowProps, lambdaLogGroup: LogGroup, stepFunctionLogGroup: LogGroup): IStateMachine {
    const doRefreshSpJobSucceed = new Succeed(this, `${this.node.id} - Refresh sp job succeed`);

    const refreshSpFn = this.refreshSpFn(props, lambdaLogGroup);
    const refreshSpFnJob = new LambdaInvoke(this, `${this.node.id} - refresh SP`, {
      lambdaFunction: refreshSpFn,
      payload: TaskInput.fromObject({
        'sp.$': '$.sp',
        'timezoneWithAppId.$': '$$.Execution.Input.timezoneWithAppId',
        'refreshDate.$': '$.refreshDate',
        'refreshSpDays.$': '$.refreshSpDays',
      }),
      outputPath: '$.Payload',
    });

    refreshSpFnJob.addRetry({
      errors: ['Lambda.TooManyRequestsException'],
      interval: Duration.seconds(3),
      backoffRate: 2,
      maxAttempts: 6,
    });

    const checkRefreshSpStatusFn = this.checkRefreshSpStatusFn(props, lambdaLogGroup);
    const checkRefreshSpStatusJob = new LambdaInvoke(this, `${this.node.id} - Check refresh SP status`, {
      lambdaFunction: checkRefreshSpStatusFn,
      payload: TaskInput.fromObject({
        'detail.$': '$.detail',
        'timezoneWithAppId.$': '$$.Execution.Input.timezoneWithAppId',
        'waitTimeInfo.$': '$.waitTimeInfo',
        'originalInput.$': '$$.Execution.Input.originalInput',
      }),
      outputPath: '$.Payload',
    });

    checkRefreshSpStatusJob.addRetry({
      errors: ['Lambda.TooManyRequestsException'],
      interval: Duration.seconds(3),
      backoffRate: 2,
      maxAttempts: 6,
    });

    const waitCheckSPStatus = new Wait(this, 'Wait check SP status seconds', {
      time: WaitTime.secondsPath('$.waitTimeInfo.waitTime'),
    });

    const initCheckSPWaitTimeInfo = new Pass(this, 'Init Check SP wait time info', {
      parameters: {
        waitTime: 5,
        loopCount: 0,
      },
      resultPath: '$.waitTimeInfo',
    });

    const refreshSpJobFailed = new Fail(this, `${this.node.id} - Refresh sp job fails`, {
      cause: 'Refresh SP Job Failed',
      error: 'Refresh SP Job FAILED',
    });

    const refreshSpComplete = new Pass(this, `${this.node.id} - refresh sp completes`);

    refreshSpFnJob
      .next(initCheckSPWaitTimeInfo)
      .next(waitCheckSPStatus)
      .next(checkRefreshSpStatusJob)
      .next(
        new Choice(this, `${this.node.id} - Check if refresh SP job completes`)
          .when(Condition.stringEquals('$.detail.status', WorkflowStatus.FAILED), refreshSpJobFailed)
          .when(Condition.stringEquals('$.detail.status', WorkflowStatus.ABORTED), refreshSpJobFailed)
          .when(Condition.stringEquals('$.detail.status', WorkflowStatus.FINISHED), refreshSpComplete)
          .otherwise(waitCheckSPStatus),
      );

    const checkStartSpRefreshFn = this.checkStartSpRefreshFn(props, lambdaLogGroup);
    const checkStartSpRefreshJob = new LambdaInvoke(this, `${this.node.id} - Check whether start SP refresh`, {
      lambdaFunction: checkStartSpRefreshFn,
      payload: TaskInput.fromObject({
        'timezoneWithAppId.$': '$$.Execution.Input.timezoneWithAppId',
        'originalInput.$': '$$.Execution.Input.originalInput',
      }),
      outputPath: '$.Payload',
    });

    checkStartSpRefreshJob.addRetry({
      errors: ['Lambda.TooManyRequestsException'],
      interval: Duration.seconds(3),
      backoffRate: 2,
      maxAttempts: 6,
    });

    const doRefreshSpJob = new Map(
      this,
      `${this.node.id} - Do refresh sp job`,
      {
        maxConcurrency: 1,
        itemsPath: '$.spList',
        inputPath: '$',
        itemSelector: {
          'sp.$': '$$.Map.Item.Value',
          'refreshDate.$': '$.refreshDate',
          'refreshSpDays.$': '$.refreshSpDays',
        },
        resultPath: '$.doRefreshSpJobResult',
      },
    );
    doRefreshSpJob.itemProcessor(refreshSpFnJob);
    doRefreshSpJob.next(doRefreshSpJobSucceed);

    checkStartSpRefreshJob
      .next(
        new Choice(this, `${this.node.id} - Choice refresh SP start`)
          .when(Condition.stringEquals('$.nextStep', 'REFRESH_SP'), doRefreshSpJob)
          .otherwise(doRefreshSpJobSucceed),
      );

    const subRefreshSpStateMachine = new StateMachine(this, 'RefreshSPStateMachine', {
      definitionBody: DefinitionBody.fromChainable(checkStartSpRefreshJob),
      logs: {
        destination: stepFunctionLogGroup,
        level: LogLevel.ALL,
      },
      tracingEnabled: true,
    });

    return subRefreshSpStateMachine;

  }
}