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
  readonly timeZoneWithAppId: string;
}

export class RefreshMaterializedViewsWorkflow extends Construct {
  public readonly refreshMaterializedViewsMachine: IStateMachine;

  private readonly lambdaRootPath = __dirname + '/../lambdas/refresh-materialized-views-workflow';
  constructor(scope: Construct, id: string, props: RefreshMaterializedViewsWorkflowProps) {
    super(scope, id);
    this.refreshMaterializedViewsMachine = this.createWorkflow(props);
  }

  private createWorkflow(props: RefreshMaterializedViewsWorkflowProps): IStateMachine {
    const checkRefreshMvStatusFn = this.checkRefreshMvStatusFn(props);
    const checkRefreshMvStatusJob = new LambdaInvoke(this, `${this.node.id} - Check refresh MV status`, {
      lambdaFunction: checkRefreshMvStatusFn,
      payload: TaskInput.fromObject({
        'detail.$': '$.detail',
        'timeZoneWithAppId.$': '$.timeZoneWithAppId',
        'waitTimeInfo.$': '$.waitTimeInfo',
      }),
      outputPath: '$.Payload',
    });

    const waitCheckMVStatus = new Wait(this, 'Wait check MV status seconds', {
      time: WaitTime.secondsPath('$.waitTimeInfo.waitTime'),
    });

    const initCheckMVWaitTimeInfo = new Pass(this, 'Init Check MV wait time info', {
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
        'timeZoneWithAppId.$': '$.timeZoneWithAppId',
      }),
      outputPath: '$.Payload',
    });

    const checkNextRefreshViewFn = this.checkNextRefreshViewFn(props);
    const checkNextRefreshViewJob = new LambdaInvoke(this, `${this.node.id} - Check next view should be refreshed`, {
      lambdaFunction: checkNextRefreshViewFn,
      payload: TaskInput.fromObject({
        'detail.$': '$.detail',
        'timeZoneWithAppId.$': '$.timeZoneWithAppId',
        'originalInput.$': '$$.Execution.Input',
      }),
      outputPath: '$.Payload',
    });

    const checkNextRefreshViewJobFail = new Fail(this, `${this.node.id} - check next refresh view fail`, {
      cause: 'checkNextRefreshViewJob failed',
      error: 'Check next refresh view FAILED',
    });

    const checkStartSpRefreshFn = this.checkStartSpRefreshFn(props);
    const checkStartSpRefreshJob = new LambdaInvoke(this, `${this.node.id} - Check whether start SP refresh`, {
      lambdaFunction: checkStartSpRefreshFn,
      payload: TaskInput.fromObject({
        'detail.$': '$.detail',
        'timeZoneWithAppId.$': '$.timeZoneWithAppId',
        'originalInput.$': '$$.Execution.Input',
      }),
      outputPath: '$.Payload',
    });

    const refreshViewJobFailed = new Fail(this, `${this.node.id} - Refresh view job fails`, {
      cause: 'Refresh View Job Failed',
      error: 'Refresh View Job FAILED',
    });

    refreshBasicViewFnJob
      .next(initCheckMVWaitTimeInfo)
      .next(waitCheckMVStatus)
      .next(checkRefreshMvStatusJob)
      .next(
        new Choice(this, `${this.node.id} - Check if refresh view job completes`)
          .when(Condition.stringEquals('$.detail.status', WorkflowStatus.FAILED), refreshViewJobFailed)
          .when(Condition.stringEquals('$.detail.status', WorkflowStatus.ABORTED), refreshViewJobFailed)
          .when(Condition.stringEquals('$.detail.status', WorkflowStatus.FINISHED), checkNextRefreshViewJob)
          .otherwise(waitCheckMVStatus),
      );

    const doRefreshJobSucceed = new Succeed(this, `${this.node.id} - Refresh job succeed`);
    const logGroup = createLogGroup(this, { prefix: '/aws/vendedlogs/states/Clickstream/RefreshMaterializedViewsMachine' });

    const refreshSpSubWorkflow = this.createSubWorkflow(props, logGroup);

    const subExecution = new StepFunctionsStartExecution(this, `${this.node.id} - refresh sp workflow`, {
      stateMachine: refreshSpSubWorkflow,
      associateWithParent: true,
      integrationPattern: IntegrationPattern.RUN_JOB,
      input: TaskInput.fromObject({
        'originalInput.$': '$.detail',
        'detail': {},
      }),
      outputPath: '$.Output',
    });

    const doNothing = new Succeed(this, `${this.node.id} - Do Nothing`);
    checkStartSpRefreshJob
      .next(
        new Choice(this, `${this.node.id} - Choice whether refresh SP should be start or not`)
          .when(Condition.stringEquals('$.detail.nextStep', 'REFRESH_SP'), subExecution)
          .otherwise(doNothing),
      );

    subExecution.next(checkStartSpRefreshJob);

    checkNextRefreshViewJob
      .next(
        new Choice(this, `${this.node.id} - Choice for next view should be refreshed`)
          .when(Condition.stringEquals('$.detail.nextStep', 'REFRESH_MV'), refreshBasicViewFnJob)
          .when(Condition.stringEquals('$.detail.nextStep', 'END'), checkStartSpRefreshJob)
          .otherwise(checkNextRefreshViewJobFail),
      );

    const doRefreshJob = new Map(
      this,
      `${this.node.id} - Do refresh job`,
      {
        maxConcurrency: 1,
        itemsPath: '$.timeZoneWithAppIdList',
        inputPath: '$',
        parameters: {
          'timeZoneWithAppId.$': '$$.Map.Item.Value',
          'detail.$': '$',
        },
        resultPath: '$.doRefreshJobResult',
      },
    );

    doRefreshJob.itemProcessor(checkNextRefreshViewJob);
    doRefreshJob.next(doRefreshJobSucceed);

    const checkJobExist = new Choice(this, `${this.node.id} - Check if job exists`)
      .when(Condition.isPresent('$.timeZoneWithAppIdList'), doRefreshJob)
      .otherwise(doRefreshJobSucceed);

    const parseTimeZoneWithAppIdListFn = this.parseTimeZoneWithAppIdList(props);
    const parseTimeZoneWithAppIdListJob = new LambdaInvoke(this, `${this.node.id} - Parse timeZone with appId list from props`, {
      lambdaFunction: parseTimeZoneWithAppIdListFn,
      outputPath: '$.Payload',
    }).next(checkJobExist);

    const getJobListFromInput = new Pass(this, `${this.node.id} - Get app_id from input`, {
      parameters: {
        'timeZoneWithAppIdList.$': '$.timeZoneWithAppIdList',
      },
    }).next(checkJobExist);

    const getAppIdList = new Choice(this, `${this.node.id} - Check if app_id list exists`)
      .when(Condition.isPresent('$.timeZoneWithAppIdList'), getJobListFromInput)
      .otherwise(parseTimeZoneWithAppIdListJob);

    // Create state machine
    const refreshMaterializedViewsMachine = new StateMachine(this, 'RefreshMaterializedViewsMachine', {
      definitionBody: DefinitionBody.fromChainable(getAppIdList),
      logs: {
        destination: logGroup,
        level: LogLevel.ALL,
      },
      tracingEnabled: true,
      comment: 'This state machine is responsible for refreshing materialized views',
    });

    return refreshMaterializedViewsMachine;
  }

  private parseTimeZoneWithAppIdList(props: RefreshMaterializedViewsWorkflowProps): IFunction {
    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, 'ParseTimeZoneWithAppIdList', {
      entry: join(
        this.lambdaRootPath,
        'parse-timezone-with-appId-list.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(3),
      logConf: {
        retention: RetentionDays.ONE_WEEK,
      },
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, 'ParseTimeZoneWithAppIdListRule', true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        TIMEZONE_WITH_APPID_LIST: props.timeZoneWithAppId,
      },
      applicationLogLevel: 'WARN',
    });
    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);
    return fn;
  }

  private checkNextRefreshSpFn(props: RefreshMaterializedViewsWorkflowProps): IFunction {
    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, 'CheckNextRefreshSp', {
      entry: join(
        this.lambdaRootPath,
        'check-next-refresh-sp.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(3),
      logConf: {
        retention: RetentionDays.ONE_WEEK,
      },
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, 'CheckNextRefreshSpRole', true, []),
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

  private checkNextRefreshViewFn(props: RefreshMaterializedViewsWorkflowProps): IFunction {
    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, 'CheckNextRefreshView', {
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
      role: createLambdaRole(this, 'CheckNextRefreshViewRole', true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        PROJECT_ID: props.projectId,
      },
      applicationLogLevel: 'WARN',
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

  private checkStartSpRefreshFn(props: RefreshMaterializedViewsWorkflowProps): IFunction {
    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, 'CheckStartSpRefresh', {
      entry: join(
        this.lambdaRootPath,
        'check-start-sp-refresh.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(3),
      logConf: {
        retention: RetentionDays.ONE_WEEK,
      },
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, 'CheckStartSpRefreshRole', true, []),
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

  private checkRefreshMvStatusFn(props: RefreshMaterializedViewsWorkflowProps): IFunction {
    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, 'CheckRefreshMvStatus', {
      entry: join(
        this.lambdaRootPath,
        'check-refresh-mv-status.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(3),
      logConf: {
        retention: RetentionDays.ONE_WEEK,
      },
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

  private checkRefreshSpStatusFn(props: RefreshMaterializedViewsWorkflowProps): IFunction {
    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, 'CheckRefreshSpStatus', {
      entry: join(
        this.lambdaRootPath,
        'check-refresh-sp-status.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(3),
      logConf: {
        retention: RetentionDays.ONE_WEEK,
      },
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

  private createSubWorkflow(props: RefreshMaterializedViewsWorkflowProps, logGroup: LogGroup): IStateMachine {

    const refreshSpFn = this.refreshSpFn(props);
    const refreshSpFnJob = new LambdaInvoke(this, `${this.node.id} - refresh SP`, {
      lambdaFunction: refreshSpFn,
      payload: TaskInput.fromObject({
        'detail.$': '$.detail',
        'originalInput.$': '$$.Execution.Input.originalInput',
      }),
      outputPath: '$.Payload',
    });

    const checkRefreshSpStatusFn = this.checkRefreshSpStatusFn(props);
    const checkRefreshSpStatusJob = new LambdaInvoke(this, `${this.node.id} - Check refresh SP status`, {
      lambdaFunction: checkRefreshSpStatusFn,
      payload: TaskInput.fromObject({
        'detail.$': '$.detail',
        'originalInput.$': '$$.Execution.Input.originalInput',
        'waitTimeInfo.$': '$.waitTimeInfo',
      }),
      outputPath: '$.Payload',
    });

    const waitCheckSPStatus = new Wait(this, 'Wait check SP status seconds', {
      time: WaitTime.secondsPath('$.waitTimeInfo.waitTime'),
    });

    const initCheckSPWaitTimeInfo = new Pass(this, 'Init Check SP wait time info', {
      parameters: {
        waitTime: 10,
        loopCount: 0,
      },
      resultPath: '$.waitTimeInfo',
    });

    const refreshSpJobFailed = new Fail(this, `${this.node.id} - Refresh sp job fails`, {
      cause: 'Refresh SP Job Failed',
      error: 'Refresh SP Job FAILED',
    });

    const checkNextRefreshSpFn = this.checkNextRefreshSpFn(props);
    const checkNextRefreshSpJob = new LambdaInvoke(this, `${this.node.id} - Check next sp should be refreshed`, {
      lambdaFunction: checkNextRefreshSpFn,
      payload: TaskInput.fromObject({
        'detail.$': '$.detail',
        'originalInput.$': '$$.Execution.Input.originalInput',
      }),
      outputPath: '$.Payload',
    });

    refreshSpFnJob
      .next(initCheckSPWaitTimeInfo)
      .next(waitCheckSPStatus)
      .next(checkRefreshSpStatusJob)
      .next(
        new Choice(this, `${this.node.id} - Check if refresh SP job completes`)
          .when(Condition.stringEquals('$.detail.status', WorkflowStatus.FAILED), refreshSpJobFailed)
          .when(Condition.stringEquals('$.detail.status', WorkflowStatus.ABORTED), refreshSpJobFailed)
          .when(Condition.stringEquals('$.detail.status', WorkflowStatus.FINISHED), checkNextRefreshSpJob)
          .otherwise(waitCheckSPStatus),
      );

    const refreshSpWorkflowEnd = new Pass(this, `${this.node.id} - Refresh SP workflow End`, {
      parameters: {
        'detail.$': '$.detail',
        'timeZoneWithAppId.$': '$.timeZoneWithAppId',
      },
    });

    checkNextRefreshSpJob
      .next(
        new Choice(this, `${this.node.id} - Choice for next sp should be refreshed`)
          .when(Condition.stringEquals('$.detail.nextStep', 'REFRESH_SP'), refreshSpFnJob)
          .otherwise(refreshSpWorkflowEnd),
      );

    const subRefreshSpStateMachine = new StateMachine(this, 'RefreshSpStateMachine', {
      definitionBody: DefinitionBody.fromChainable(checkNextRefreshSpJob),
      logs: {
        destination: logGroup,
        level: LogLevel.ALL,
      },
      tracingEnabled: true,
    });

    return subRefreshSpStateMachine;

  }
}