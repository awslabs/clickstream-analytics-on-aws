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
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { ISecurityGroup, IVpc, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { Rule, Match } from 'aws-cdk-lib/aws-events';
import { SfnStateMachine, LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { IRole, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays, LogGroup } from 'aws-cdk-lib/aws-logs';
import {
  StateMachine, LogLevel, IStateMachine, TaskInput, Wait, WaitTime, Succeed, Choice, Map,
  Condition, Pass, Fail, DefinitionBody, Parallel, IntegrationPattern, JsonPath,
} from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke, StepFunctionsStartExecution } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { DYNAMODB_TABLE_INDEX_NAME } from './constant';
import { ODSSource, ExistingRedshiftServerlessProps, ProvisionedRedshiftProps, TablesODSSource, LoadDataConfig, WorkflowBucketInfo } from './model';
import { createLambdaRole } from '../../common/lambda';
import { createLogGroup } from '../../common/logs';
import { getPutMetricsPolicyStatements } from '../../common/metrics';
import { MetricsNamespace, REDSHIFT_MODE } from '../../common/model';
import { SolutionNodejsFunction } from '../../private/function';

export interface LoadOdsDataToRedshiftWorkflowProps {
  readonly projectId: string;
  readonly appIds: string;
  readonly networkConfig: {
    readonly vpc: IVpc;
    readonly vpcSubnets: SubnetSelection;
  };

  readonly securityGroupForLambda: ISecurityGroup;
  readonly serverlessRedshift?: ExistingRedshiftServerlessProps;
  readonly provisionedRedshift?: ProvisionedRedshiftProps;
  readonly databaseName: string;
  readonly dataAPIRole: IRole;
  readonly emrServerlessApplicationId: string;
  readonly redshiftRoleForCopyFromS3: IRole;
  readonly ddbStatusTable: ITable;
  readonly mvRefreshInterval: number;

  readonly tablesOdsSource: TablesODSSource; // data S3 bucket
  readonly loadDataConfig: LoadDataConfig; // workflow config info, e.g. maxFilesLimit, etc..
  readonly workflowBucketInfo: WorkflowBucketInfo; // bucket to store workflow logs, temp files

  readonly nextStateStateMachines: { name: string; stateMachine: IStateMachine;
    input?: TaskInput; integrationPattern?: IntegrationPattern; resultPath?: string; }[];
}

export class LoadOdsDataToRedshiftWorkflow extends Construct {
  private readonly lambdaRootPath = __dirname + '/../lambdas/load-data-workflow';

  public readonly loadDataWorkflow: IStateMachine;

  constructor(scope: Construct, id: string, props: LoadOdsDataToRedshiftWorkflowProps) {
    super(scope, id);

    const ddbStatusTable = props.ddbStatusTable;

    for (const [tableName, odsSource] of Object.entries(props.tablesOdsSource)) {

      const processorLambda = this.createS3EventProcessorLambda(ddbStatusTable, tableName, odsSource, props);

      ddbStatusTable.grantWriteData(processorLambda);
      // create a rule to store the ods source files
      const sourceTriggerRule = new Rule(this, `S3Event-${tableName}`, {
        eventPattern: {
          detailType: Match.equalsIgnoreCase('object created'),
          detail: {
            bucket: {
              name: Match.exactString(odsSource.s3Bucket.bucketName),
            },
            object: {
              key: Match.prefix(odsSource.prefix),
            },
          },
          source: ['aws.s3'],
        },
      });
      sourceTriggerRule.addTarget(new LambdaFunction(processorLambda));

      odsSource.s3Bucket.grantRead(props.redshiftRoleForCopyFromS3, `${odsSource.prefix}*`);
      props.workflowBucketInfo.s3Bucket.grantRead(props.redshiftRoleForCopyFromS3, `${props.workflowBucketInfo.prefix}*`);
    }

    // create Step function workflow to orchestrate the workflow to load data from s3 to redshift
    this.loadDataWorkflow = this.createWorkflow(ddbStatusTable, props, props.redshiftRoleForCopyFromS3);

    const emrApplicationId = props.emrServerlessApplicationId;

    new Rule(this, 'EmrServerlessJobSuccessRule', { //NOSONAR
      eventPattern: {
        source: ['aws.emr-serverless'],
        detailType: ['EMR Serverless Job Run State Change'],
        detail: {
          state: ['SUCCESS'],
          applicationId: [emrApplicationId],
        },
      },
      targets: [
        new SfnStateMachine(this.loadDataWorkflow),
      ],
    });

  }

  /**
   * Create a lambda function to put ODS event source to dynamodb.
   * @param taskTable The table for recording tasks
   * @param props The property for input parameters.
   * @returns A lambda function.
   */
  private createS3EventProcessorLambda(taskTable: ITable, redshiftTable: string,
    odsSource: ODSSource, props: LoadOdsDataToRedshiftWorkflowProps): IFunction {
    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, `s3EventFn-${redshiftTable}`, {
      entry: join(
        this.lambdaRootPath,
        'put-ods-source-to-store.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(1),
      logConf: {
        retention: RetentionDays.ONE_WEEK,
      },
      reservedConcurrentExecutions: 2,
      role: createLambdaRole(this, `s3EventFnRole-${redshiftTable}`, true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        PROJECT_ID: props.projectId,
        S3_FILE_SUFFIX: odsSource.fileSuffix,
        DYNAMODB_TABLE_NAME: taskTable.tableName,
        REDSHIFT_ODS_TABLE_NAME: redshiftTable,
      },
      applicationLogLevel: 'WARN',
    });

    return fn;
  }


  private createWorkflow(ddbTable: ITable, props: LoadOdsDataToRedshiftWorkflowProps, copyRole: IRole): IStateMachine {

    const skipRunningWorkflowFn = this.createCheckSkippingRunningWorkflowFn(ddbTable, props);
    const checkSkippingRunningWorkflow = new LambdaInvoke(this, `${this.node.id} - Check Skipping Running Workflow`, {
      lambdaFunction: skipRunningWorkflowFn,
      payload: TaskInput.fromObject({
        'execution_id.$': '$$.Execution.Id',
        'eventBucketName': props.tablesOdsSource.event.s3Bucket.bucketName,
        'eventPrefix': props.tablesOdsSource.event.prefix,
      }),
      outputPath: '$.Payload',
    });

    checkSkippingRunningWorkflow.addRetry({
      errors: ['Lambda.TooManyRequestsException'],
      interval: Duration.seconds(3),
      backoffRate: 2,
      maxAttempts: 6,
    });

    //
    // Refresh materialized views
    //
    const refreshViewsFn = this.refreshViewsFn(props, copyRole);
    const refreshViewsStep = new LambdaInvoke(this, `${this.node.id} - Refresh materialized views`, {
      lambdaFunction: refreshViewsFn,
      resultSelector: {
        'Payload.$': '$.Payload',
      },
      resultPath: '$.refreshViewsOut',
    });
    refreshViewsStep.addRetry({
      errors: ['Lambda.TooManyRequestsException'],
      interval: Duration.seconds(3),
      backoffRate: 2,
      maxAttempts: 6,
    });

    //
    // Next state machines
    //
    let nexTaskExecChain;
    for (const nexTask of props.nextStateStateMachines) {
      const taskName = nexTask.name;
      const stateMachine = nexTask.stateMachine;
      const input = nexTask.input;
      const integrationPattern = nexTask.integrationPattern?? IntegrationPattern.REQUEST_RESPONSE;
      const resultPath = `$.${nexTask.resultPath ?? taskName.replace(/ /g, '')}`;
      const nexTaskExec = new StepFunctionsStartExecution(this, `${this.node.id} - ${taskName}`, {
        stateMachine,
        integrationPattern,
        input,
        resultSelector: {
          'ExecutionArn.$': '$.ExecutionArn',
        },
        resultPath,
      });
      if (!nexTaskExecChain) {
        nexTaskExecChain = nexTaskExec;
      } else {
        nexTaskExecChain = nexTaskExecChain.next(nexTaskExec);
      }
    }

    const allCompleted = new Succeed(this, `${this.node.id} - All Completed`);
    if (nexTaskExecChain) {
      nexTaskExecChain.next(allCompleted);
    } else {
      nexTaskExecChain = allCompleted;
    }

    //
    // Main workflow
    //
    const logGroup = createLogGroup(this,
      {
        prefix: `/aws/vendedlogs/states/Clickstream/LoadData-${this.node.id}`,
      },
    );

    let parallelLoadDataToTables = new Parallel(this, `${this.node.id} - Load data to tables`);
    const subLoadDataWorkflow = this.createSubWorkflow(ddbTable, props, copyRole, logGroup);
    for (const [odsTableName, odsSource] of Object.entries(props.tablesOdsSource)) {
      const subExecution = new StepFunctionsStartExecution(this, `${this.node.id} - ${odsTableName}`, {
        stateMachine: subLoadDataWorkflow,
        integrationPattern: IntegrationPattern.RUN_JOB,
        input: TaskInput.fromObject({
          odsTableName: odsTableName,
          odsSourceBucket: odsSource.s3Bucket.bucketName,
          odsSourcePrefix: odsSource.prefix,
        }),
        name: JsonPath.format('{}-{}', JsonPath.stringAt('$$.Execution.Name'), odsTableName),
        resultSelector: {
          'ExecutionArn.$': '$.ExecutionArn',
        },
      });
      parallelLoadDataToTables = parallelLoadDataToTables.branch(subExecution);
    }

    const loadCompleted = new Pass(this, `${this.node.id} - Load Data To Redshift Completed`, {
      // change the input from array to object
      parameters: { 'parallelLoadData.$': '$$' },
    });

    const parallelLoadBranch = parallelLoadDataToTables.next(loadCompleted);

    const ignoreRunFlow = new Pass(this, `${this.node.id} - Ignore Running`).next(allCompleted);

    const skipRunningWorkflowChoice = new Choice(this, `${this.node.id} - Skip Running Workflow`)
      .when(Condition.booleanEquals('$.SkipRunningWorkflow', true), ignoreRunFlow)
      .otherwise(parallelLoadBranch.next(refreshViewsStep).next(nexTaskExecChain));

    const definition = checkSkippingRunningWorkflow.next(skipRunningWorkflowChoice);

    // Create state machine
    const loadDataStateMachine = new StateMachine(this, 'LoadDataStateMachine', {
      definitionBody: DefinitionBody.fromChainable(definition),
      logs: {
        destination: logGroup,
        level: LogLevel.ALL,
      },
      tracingEnabled: true,
    });

    skipRunningWorkflowFn.role?.attachInlinePolicy(new Policy(this, 'stateFlowListPolicy', {
      statements: [
        new PolicyStatement({
          actions: [
            'states:ListExecutions',
          ],
          resources: [
            loadDataStateMachine.stateMachineArn,
          ],
        }),
      ],
    }));

    return loadDataStateMachine;
  }

  private createSubWorkflow(
    ddbTable: ITable,
    props: LoadOdsDataToRedshiftWorkflowProps,
    copyRole: IRole,
    logGroup: LogGroup,
  ): IStateMachine {

    const createLoadRedshiftTableSubWorkflow = () => {

      const createLoadManifestFn = this.createLoadManifestFn(ddbTable, props);
      const getJobList = new LambdaInvoke(this, 'Create job manifest', {
        lambdaFunction: createLoadManifestFn,
        payload: TaskInput.fromObject({
          'execution_id.$': '$$.Execution.Id',
          'odsTableName.$': '$.odsTableName',
          'odsSourceBucket.$': '$.odsSourceBucket',
          'odsSourcePrefix.$': '$.odsSourcePrefix',
        }),
        outputPath: '$.Payload',
      });

      getJobList.addRetry({
        errors: ['Lambda.TooManyRequestsException'],
        interval: Duration.seconds(3),
        backoffRate: 2,
        maxAttempts: 6,
      });


      const loadManifestToRedshiftFn = this.loadManifestToRedshiftFn(ddbTable, props, copyRole);
      const submitJob = new LambdaInvoke(this, 'Submit job', {
        lambdaFunction: loadManifestToRedshiftFn,
        payload: TaskInput.fromObject({
          'detail': {
            'execution_id.$': '$$.Execution.Id',
            'appId.$': '$.appId',
            'manifestFileName.$': '$.manifestFileName',
            'jobList.$': '$.jobList',
            'retryCount.$': '$.retryCount',
          },
          'odsTableName.$': '$.odsTableName',
          'odsSourceBucket.$': '$.odsSourceBucket',
          'odsSourcePrefix.$': '$.odsSourcePrefix',
        }),
        outputPath: '$.Payload',
      });

      submitJob.addRetry({
        errors: ['Lambda.TooManyRequestsException'],
        interval: Duration.seconds(3),
        backoffRate: 2,
        maxAttempts: 6,
      });

      const createCheckLoadJobStatusFn = this.createCheckLoadJobStatusFn(ddbTable, props);

      const checkJobStatus = new LambdaInvoke(this, 'Check job status', {
        lambdaFunction: createCheckLoadJobStatusFn,
        payload: TaskInput.fromObject({
          'detail.$': '$.detail',
          'waitTimeInfo.$': '$.waitTimeInfo',
          'odsTableName.$': '$.odsTableName',
          'odsSourceBucket.$': '$.odsSourceBucket',
          'odsSourcePrefix.$': '$.odsSourcePrefix',
        }),
        outputPath: '$.Payload',
      });

      checkJobStatus.addRetry({
        errors: ['Lambda.TooManyRequestsException'],
        interval: Duration.seconds(3),
        backoffRate: 2,
        maxAttempts: 6,
      });

      const waitX = new Wait(this, 'Wait seconds', {
        /**
           *  You can also implement with the path stored in the state like:
           *  sfn.WaitTime.secondsPath('$.waitSeconds')
           */
        time: WaitTime.secondsPath('$.waitTimeInfo.waitTime'),
      });

      const initWaitTimeInfo = new Pass(this, 'Init wait time info', {
        parameters: {
          waitTime: 10,
          loopCount: 0,
        },
        resultPath: '$.waitTimeInfo',
      });

      const jobFailed = new Fail(this, 'Job fails', {
        cause: 'LoadManifest Job Failed',
        error: 'DescribeJob returned FAILED',
      });

      const finalStatus = new Pass(this, 'Job completes');

      const waitAndRetry = new Wait(this, 'Wait and Retry', {
        time: WaitTime.duration(Duration.seconds(120)),
      }).next(
        new Pass(this, 'Set parameters', {
          parameters: {
            'appId.$': '$.detail.appId',
            'manifestFileName.$': '$.detail.manifestFileName',
            'jobList.$': '$.detail.jobList',
            'retryCount.$': '$.detail.retryCount',
            'odsTableName.$': '$.odsTableName',
            'odsSourceBucket.$': '$.odsSourceBucket',
            'odsSourcePrefix.$': '$.odsSourcePrefix',
          },
        }),
      ).next(submitJob);

      // Create sub chain
      const subDefinition = submitJob
        .next(initWaitTimeInfo)
        .next(waitX)
        .next(checkJobStatus)
        .next(new Choice(this, 'Check if job completes')
          // Look at the "status" field
          .when(Condition.and(Condition.stringEquals('$.detail.status', 'FAILED'), Condition.booleanEquals('$.detail.retry', false)), jobFailed)
          .when(Condition.and(Condition.stringEquals('$.detail.status', 'FAILED'), Condition.booleanEquals('$.detail.retry', true)), waitAndRetry)
          .when(Condition.stringEquals('$.detail.status', 'ABORTED'), jobFailed)
          .when(Condition.stringEquals('$.detail.status', 'FINISHED'), finalStatus)
          .when(Condition.stringEquals('$.detail.status', 'NO_JOBS'), finalStatus)
          .otherwise(waitX));

      const doLoadJob = new Map(
        this,
        'Do load job',
        {
          maxConcurrency: 1,
          itemsPath: '$.manifestList',
          parameters: {
            'odsTableName.$': '$.odsTableName',
            'odsSourceBucket.$': '$.odsSourceBucket',
            'odsSourcePrefix.$': '$.odsSourcePrefix',
            'execution_id.$': '$$.Execution.Id',
            'appId.$': '$$.Map.Item.Value.appId',
            'manifestFileName.$': '$$.Map.Item.Value.manifestFileName',
            'jobList.$': '$$.Map.Item.Value.jobList',
            'retryCount.$': '$$.Map.Item.Value.retryCount',
          },
        },
      );
      doLoadJob.itemProcessor(subDefinition);


      const hasMoreWorkFn = this.createHasMoreWorkFn(ddbTable, props);
      const checkMoreWork = new LambdaInvoke(this, ' Check more work', {
        payload: TaskInput.fromObject({
          'odsTableName.$': '$.odsTableName',
          'odsSourceBucket.$': '$.odsSourceBucket',
          'odsSourcePrefix.$': '$.odsSourcePrefix',
        }),
        lambdaFunction: hasMoreWorkFn,
        outputPath: '$.Payload',
      });

      checkMoreWork.addRetry({
        errors: ['Lambda.TooManyRequestsException'],
        interval: Duration.seconds(3),
        backoffRate: 2,
        maxAttempts: 6,
      });

      const jobCompleted = new Succeed(this, 'Job Completed');

      const hasMoreChoice = new Choice(this, 'Has more work')
        .when(Condition.booleanEquals('$.hasMoreWork', true), getJobList)
        .otherwise(jobCompleted);

      const checkMoreWorkTodo = checkMoreWork.next(hasMoreChoice);

      const waitX2 = new Wait(this, 'Wait and check again', {
        time: WaitTime.duration(Duration.seconds(120)),
      });

      const mapResultPass = new Pass(this, 'process map result', {
        inputPath: '$',
        parameters: {
          'odsTableName.$': '$[0].odsTableName',
          'odsSourceBucket.$': '$[0].odsSourceBucket',
          'odsSourcePrefix.$': '$[0].odsSourcePrefix',
        },
      });

      mapResultPass.next(checkMoreWorkTodo);

      const waitAndCheckMoreWork = waitX2.next(checkMoreWorkTodo);
      const checkJobExist = new Choice(this, 'Check if job exists')
        .when(Condition.isNotPresent('$.manifestList'), waitAndCheckMoreWork)
        .when(Condition.numberGreaterThan('$.count', 0), doLoadJob.next(mapResultPass))
        .otherwise(waitAndCheckMoreWork);

      const doWorkflow = getJobList.next(checkJobExist);
      return doWorkflow;
    };

    const subWorkflowDefinition = createLoadRedshiftTableSubWorkflow();

    // Create sub state machine
    const subLoadDataStateMachine = new StateMachine(this, 'SubLoadDataStateMachine', {
      definitionBody: DefinitionBody.fromChainable(subWorkflowDefinition),
      logs: {
        destination: logGroup,
        level: LogLevel.ALL,
      },
      tracingEnabled: true,
    });

    return subLoadDataStateMachine;
  }

  private createLoadManifestFn(ddbTable: ITable, props: LoadOdsDataToRedshiftWorkflowProps): IFunction {
    const loadDataConfig = props.loadDataConfig;
    const resourceId = 'CreateLoadManifest';

    const fnSG = props.securityGroupForLambda;
    const cloudwatchPolicyStatements = getPutMetricsPolicyStatements(MetricsNamespace.REDSHIFT_ANALYTICS);
    const fn = new SolutionNodejsFunction(this, `${resourceId}Fn`, {
      entry: join(
        this.lambdaRootPath,
        'create-load-manifest.ts',
      ),
      handler: 'handler',
      memorySize: 1024,
      timeout: Duration.minutes(5),
      logConf: {
        retention: RetentionDays.ONE_WEEK,
      },
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, `${resourceId}Role`, true, [...cloudwatchPolicyStatements]),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        PROJECT_ID: props.projectId,
        MANIFEST_BUCKET: props.workflowBucketInfo.s3Bucket.bucketName,
        MANIFEST_BUCKET_PREFIX: props.workflowBucketInfo.prefix,
        QUERY_RESULT_LIMIT: loadDataConfig.maxFilesLimit.toString(),
        DYNAMODB_TABLE_NAME: ddbTable.tableName,
        DYNAMODB_TABLE_INDEX_NAME: DYNAMODB_TABLE_INDEX_NAME,
      },
      applicationLogLevel: 'WARN',
    });

    // Update the job_status from NEW to ENQUEUE.
    ddbTable.grantReadWriteData(fn);
    props.workflowBucketInfo.s3Bucket.grantWrite(fn, `${props.workflowBucketInfo.prefix}*`);

    return fn;
  }

  private loadManifestToRedshiftFn(ddbTable: ITable, props: LoadOdsDataToRedshiftWorkflowProps, copyRole: IRole): IFunction {

    const loadDataConfig = props.loadDataConfig;
    const resourceId = 'LoadManifest';

    const fnSG = props.securityGroupForLambda;
    const cloudwatchPolicyStatements = getPutMetricsPolicyStatements(MetricsNamespace.REDSHIFT_ANALYTICS);
    const fn = new SolutionNodejsFunction(this, `${resourceId}Fn`, {
      entry: join(
        this.lambdaRootPath,
        'load-manifest-to-redshift.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(3),
      logConf: {
        retention: RetentionDays.ONE_WEEK,
      },
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, `${resourceId}Role`, true, [...cloudwatchPolicyStatements]),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        PROJECT_ID: props.projectId,
        QUERY_RESULT_LIMIT: loadDataConfig.maxFilesLimit.toString(),
        DYNAMODB_TABLE_NAME: ddbTable.tableName,
        ... this.toRedshiftEnvVariables(props),
        REDSHIFT_ROLE: copyRole.roleArn,
        REDSHIFT_DATA_API_ROLE: props.dataAPIRole.roleArn,
      },
      applicationLogLevel: 'WARN',
    });
    // Update the job_status from ENQUEUE to PROCESSING.
    ddbTable.grantReadWriteData(fn);
    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);
    return fn;
  }

  private toRedshiftEnvVariables(props: LoadOdsDataToRedshiftWorkflowProps): {
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

  private createCheckLoadJobStatusFn(ddbTable: ITable, props: LoadOdsDataToRedshiftWorkflowProps): IFunction {

    const resourceId = 'CheckLoadJobStatus';

    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, `${resourceId}Fn`, {
      entry: join(
        this.lambdaRootPath,
        'check-load-status.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(2),
      logConf: {
        retention: RetentionDays.ONE_WEEK,
      },
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, `${resourceId}Role`, true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        PROJECT_ID: props.projectId,
        DYNAMODB_TABLE_NAME: ddbTable.tableName,
        ... this.toRedshiftEnvVariables(props),
        REDSHIFT_DATA_API_ROLE: props.dataAPIRole.roleArn,
      },
      applicationLogLevel: 'WARN',
    });

    ddbTable.grantWriteData(fn);
    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);
    props.workflowBucketInfo.s3Bucket.grantDelete(fn, `${props.workflowBucketInfo.prefix}*`);

    return fn;
  }


  private createHasMoreWorkFn(ddbTable: ITable, props: LoadOdsDataToRedshiftWorkflowProps): IFunction {

    const resourceId = 'HasMoreWork';

    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, `${resourceId}Fn`, {
      entry: join(
        this.lambdaRootPath,
        'has-more-job-new.ts',
      ),
      handler: 'handler',
      memorySize: 1024,
      timeout: Duration.minutes(2),
      logConf: {
        retention: RetentionDays.ONE_WEEK,
      },
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, `${resourceId}Role`, true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        PROJECT_ID: props.projectId,
        DYNAMODB_TABLE_NAME: ddbTable.tableName,
        DYNAMODB_TABLE_INDEX_NAME: DYNAMODB_TABLE_INDEX_NAME,
      },
      applicationLogLevel: 'WARN',
    });
    ddbTable.grantReadData(fn);
    return fn;
  }


  private createCheckSkippingRunningWorkflowFn(ddbTable: ITable, props: LoadOdsDataToRedshiftWorkflowProps): IFunction {

    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, 'CheckSkippingRunningWorkflowFn', {
      entry: join(
        this.lambdaRootPath,
        'skip-running-workflow.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(2),
      logConf: {
        retention: RetentionDays.ONE_WEEK,
      },
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, 'CheckSkippingRunningWorkflowFnRole', true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        PROJECT_ID: props.projectId,
        DYNAMODB_TABLE_NAME: ddbTable.tableName,
        DYNAMODB_TABLE_INDEX_NAME: DYNAMODB_TABLE_INDEX_NAME,
      },
      applicationLogLevel: 'WARN',
    });
    ddbTable.grantReadData(fn);
    return fn;
  }


  private refreshViewsFn(props: LoadOdsDataToRedshiftWorkflowProps, copyRole: IRole): IFunction {
    const resourceId = 'RefreshViews';

    const fnSG = props.securityGroupForLambda;
    const fn = new SolutionNodejsFunction(this, `${resourceId}Fn`, {
      entry: join(
        this.lambdaRootPath,
        'refresh-views.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(3),
      logConf: {
        retention: RetentionDays.ONE_WEEK,
      },
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, `${resourceId}Role`, true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        PROJECT_ID: props.projectId,
        APP_IDS: props.appIds,

        REDSHIFT_MODE: props.serverlessRedshift ? REDSHIFT_MODE.SERVERLESS : REDSHIFT_MODE.PROVISIONED,
        REDSHIFT_SERVERLESS_WORKGROUP_NAME: props.serverlessRedshift?.workgroupName ?? '',
        REDSHIFT_CLUSTER_IDENTIFIER: props.provisionedRedshift?.clusterIdentifier ?? '',
        REDSHIFT_DATABASE: props.databaseName,
        REDSHIFT_DB_USER: props.provisionedRedshift?.dbUser ?? '',
        ENABLE_REFRESH: 'true',
        REFRESH_INTERVAL_MINUTES: props.mvRefreshInterval.toString(),
        PIPELINE_S3_BUCKET_NAME: props.workflowBucketInfo.s3Bucket.bucketName,
        PIPELINE_S3_BUCKET_PREFIX: props.workflowBucketInfo.prefix,
        REDSHIFT_ROLE: copyRole.roleArn,
        REDSHIFT_DATA_API_ROLE: props.dataAPIRole.roleArn,
      },
      applicationLogLevel: 'WARN',
    });
    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);
    props.workflowBucketInfo.s3Bucket.grantPut(fn, `${props.workflowBucketInfo.prefix}*`);
    props.workflowBucketInfo.s3Bucket.grantRead(fn, `${props.workflowBucketInfo.prefix}*`);
    return fn;
  }
}
