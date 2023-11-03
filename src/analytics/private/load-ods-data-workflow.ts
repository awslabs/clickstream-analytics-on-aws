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
import { IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import {
  StateMachine, LogLevel, IStateMachine, TaskInput, Wait, WaitTime, Succeed, Choice, Map,
  Condition, Pass, Fail, DefinitionBody, Parallel, IntegrationPattern,
} from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke, StepFunctionsStartExecution } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { DYNAMODB_TABLE_INDEX_NAME } from './constant';
import { ODSSource, ExistingRedshiftServerlessProps, ProvisionedRedshiftProps, TablesODSSource, LoadDataConfig, WorkflowBucketInfo } from './model';
import { createLambdaRole } from '../../common/lambda';
import { createLogGroup } from '../../common/logs';
import { getPutMetricsPolicyStatements } from '../../common/metrics';
import { MetricsNamespace, REDSHIFT_MODE } from '../../common/model';
import { POWERTOOLS_ENVS } from '../../common/powertools';
import { SolutionNodejsFunction } from '../../private/function';

export interface LoadOdsDataToRedshiftWorkflowProps {
  readonly projectId: string;
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
      runtime: Runtime.NODEJS_18_X,
      entry: join(
        this.lambdaRootPath,
        'put-ods-source-to-store.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(1),
      logRetention: RetentionDays.ONE_WEEK,
      reservedConcurrentExecutions: 2,
      role: createLambdaRole(this, `s3EventFnRole-${redshiftTable}`, true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        PROJECT_ID: props.projectId,
        S3_FILE_SUFFIX: odsSource.fileSuffix,
        DYNAMODB_TABLE_NAME: taskTable.tableName,
        REDSHIFT_ODS_TABLE_NAME: redshiftTable,
        ...POWERTOOLS_ENVS,
      },
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
    // function:  createLoadRedshiftTableWorkflow
    //
    const createLoadRedshiftTableWorkflow = (odsTableName: string) => {

      const createLoadManifestFn = this.createLoadManifestFn(ddbTable, odsTableName, props);
      const getJobList = new LambdaInvoke(this, `${odsTableName} - Create job manifest`, {
        lambdaFunction: createLoadManifestFn,
        payload: TaskInput.fromObject({
          'execution_id.$': '$$.Execution.Id',
        }),
        outputPath: '$.Payload',
      });

      getJobList.addRetry({
        errors: ['Lambda.TooManyRequestsException'],
        interval: Duration.seconds(3),
        backoffRate: 2,
        maxAttempts: 6,
      });


      const loadManifestToRedshiftFn = this.loadManifestToRedshiftFn(ddbTable, odsTableName, props, copyRole);
      const submitJob = new LambdaInvoke(this, `${odsTableName} - Submit job`, {
        lambdaFunction: loadManifestToRedshiftFn,
        payload: TaskInput.fromObject({
          detail: {
            'execution_id.$': '$$.Execution.Id',
            'appId.$': '$.appId',
            'manifestFileName.$': '$.manifestFileName',
            'jobList.$': '$.jobList',
            'retryCount.$': '$.retryCount',
          },
        }),
        outputPath: '$.Payload',
      });

      submitJob.addRetry({
        errors: ['Lambda.TooManyRequestsException'],
        interval: Duration.seconds(3),
        backoffRate: 2,
        maxAttempts: 6,
      });

      const createCheckLoadJobStatusFn = this.createCheckLoadJobStatusFn(ddbTable, odsTableName, props);

      const checkJobStatus = new LambdaInvoke(this, `${odsTableName} - Check job status`, {
        lambdaFunction: createCheckLoadJobStatusFn,
        payload: TaskInput.fromObject({
          'detail.$': '$.detail',
        }),
        outputPath: '$.Payload',
      });

      checkJobStatus.addRetry({
        errors: ['Lambda.TooManyRequestsException'],
        interval: Duration.seconds(3),
        backoffRate: 2,
        maxAttempts: 6,
      });

      const waitX = new Wait(this, `${odsTableName} - Wait seconds`, {
        /**
           *  You can also implement with the path stored in the state like:
           *  sfn.WaitTime.secondsPath('$.waitSeconds')
           */
        time: WaitTime.duration(Duration.seconds(30)),
      });

      const jobFailed = new Fail(this, `${odsTableName} - Job fails`, {
        cause: 'LoadManifest Job Failed',
        error: 'DescribeJob returned FAILED',
      });

      const finalStatus = new Pass(this, `${odsTableName} - Job completes`);

      const waitAndRetry = new Wait(this, `${odsTableName} - Wait and Retry`, {
        time: WaitTime.duration(Duration.seconds(120)),
      }).next(submitJob);

      // Create sub chain
      const subDefinition = submitJob
        .next(waitX)
        .next(checkJobStatus)
        .next(new Choice(this, `${odsTableName} - Check if job completes`)
          // Look at the "status" field
          .when(Condition.and(Condition.stringEquals('$.detail.status', 'FAILED'), Condition.booleanEquals('$.detail.retry', false)), jobFailed)
          .when(Condition.and(Condition.stringEquals('$.detail.status', 'FAILED'), Condition.booleanEquals('$.detail.retry', true)), waitAndRetry)
          .when(Condition.stringEquals('$.detail.status', 'ABORTED'), jobFailed)
          .when(Condition.stringEquals('$.detail.status', 'FINISHED'), finalStatus)
          .when(Condition.stringEquals('$.detail.status', 'NO_JOBS'), finalStatus)
          .otherwise(waitX));

      const doLoadJob = new Map(
        this,
        `${odsTableName} - Do load job`,
        {
          maxConcurrency: 1,
          itemsPath: '$.manifestList',
        },
      );
      doLoadJob.iterator(subDefinition);


      const hasMoreWorkFn = this.createHasMoreWorkFn(ddbTable, odsTableName, props);
      const checkMoreWork = new LambdaInvoke(this, `${odsTableName} - Check more work`, {
        lambdaFunction: hasMoreWorkFn,
        outputPath: '$.Payload',
      });

      checkMoreWork.addRetry({
        errors: ['Lambda.TooManyRequestsException'],
        interval: Duration.seconds(3),
        backoffRate: 2,
        maxAttempts: 6,
      });

      const jobCompleted = new Succeed(this, `${odsTableName} - Job Completed`);

      const hasMoreChoice = new Choice(this, `${odsTableName} - Has more work`)
        .when(Condition.booleanEquals('$.hasMoreWork', true), getJobList)
        .otherwise(jobCompleted);

      const checkMoreWorkTodo = checkMoreWork.next(hasMoreChoice);

      const waitX2 = new Wait(this, `${odsTableName} - Wait and check again`, {
        time: WaitTime.duration(Duration.seconds(30)),
      });

      const waitAndCheckMoreWork = waitX2.next(checkMoreWorkTodo);
      const checkJobExist = new Choice(this, `${odsTableName} - Check if job exists`)
        .when(Condition.isNotPresent('$.manifestList'), waitAndCheckMoreWork)
        .when(Condition.numberGreaterThan('$.count', 0), doLoadJob.next(checkMoreWorkTodo))
        .otherwise(waitAndCheckMoreWork);

      const doWorkflow = getJobList.next(checkJobExist);
      return doWorkflow;
    };

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

    let parallelLoadDataToTables = new Parallel(this, `${this.node.id} - Load data to tables`);
    for (const odsTable of Object.keys(props.tablesOdsSource)) {
      const loadOneTableWorkflow = createLoadRedshiftTableWorkflow(odsTable);
      parallelLoadDataToTables = parallelLoadDataToTables.branch(loadOneTableWorkflow);
    }

    const loadCompleted = new Pass(this, `${this.node.id} - Load Data To Redshift Completed`, {
      // change the input from array to object
      parameters: { 'parallelLoadData.$': '$$' },
    });

    const parallelLoadBranch = parallelLoadDataToTables.next(loadCompleted);

    const ignoreRunFlow = new Pass(this, `${this.node.id} - Ignore Running`).next(allCompleted);

    const skipRunningWorkflowChoice = new Choice(this, `${this.node.id} - Skip Running Workflow`)
      .when(Condition.booleanEquals('$.SkipRunningWorkflow', true), ignoreRunFlow)
      .otherwise(parallelLoadBranch.next(nexTaskExecChain));

    const definition = checkSkippingRunningWorkflow.next(skipRunningWorkflowChoice);

    // Create state machine
    const loadDataStateMachine = new StateMachine(this, 'LoadDataStateMachine', {
      definitionBody: DefinitionBody.fromChainable(definition),
      logs: {
        destination: createLogGroup(this,
          {
            prefix: `/aws/vendedlogs/states/Clickstream/LoadData-${this.node.id}`,
          },
        ),
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

  private createLoadManifestFn(ddbTable: ITable, odsTableName: string, props: LoadOdsDataToRedshiftWorkflowProps): IFunction {
    const odsSource = (props.tablesOdsSource as any)[odsTableName];
    const loadDataConfig = props.loadDataConfig;
    const resourceId = `CreateLoadManifest-${odsTableName}`;

    const fnSG = props.securityGroupForLambda;
    const cloudwatchPolicyStatements = getPutMetricsPolicyStatements(MetricsNamespace.REDSHIFT_ANALYTICS);
    const fn = new SolutionNodejsFunction(this, `${resourceId}Fn`, {
      runtime: Runtime.NODEJS_18_X,
      entry: join(
        this.lambdaRootPath,
        'create-load-manifest.ts',
      ),
      handler: 'handler',
      memorySize: 1024,
      timeout: Duration.minutes(5),
      logRetention: RetentionDays.ONE_WEEK,
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, `${resourceId}Role`, true, [...cloudwatchPolicyStatements]),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        PROJECT_ID: props.projectId,
        MANIFEST_BUCKET: props.workflowBucketInfo.s3Bucket.bucketName,
        MANIFEST_BUCKET_PREFIX: props.workflowBucketInfo.prefix + odsTableName + '/',
        ODS_EVENT_BUCKET: odsSource.s3Bucket.bucketName,
        ODS_EVENT_BUCKET_PREFIX: odsSource.prefix,
        QUERY_RESULT_LIMIT: loadDataConfig.maxFilesLimit.toString(),
        DYNAMODB_TABLE_NAME: ddbTable.tableName,
        DYNAMODB_TABLE_INDEX_NAME: DYNAMODB_TABLE_INDEX_NAME,
        REDSHIFT_ODS_TABLE_NAME: odsTableName,
        ...POWERTOOLS_ENVS,
      },
    });

    // Update the job_status from NEW to ENQUEUE.
    ddbTable.grantReadWriteData(fn);
    props.workflowBucketInfo.s3Bucket.grantWrite(fn, `${props.workflowBucketInfo.prefix}*`);

    return fn;
  }

  private loadManifestToRedshiftFn(ddbTable: ITable, odsTableName: string, props: LoadOdsDataToRedshiftWorkflowProps, copyRole: IRole): IFunction {

    const loadDataConfig = props.loadDataConfig;
    const resourceId = `LoadManifest-${odsTableName}`;

    const fnSG = props.securityGroupForLambda;
    const cloudwatchPolicyStatements = getPutMetricsPolicyStatements(MetricsNamespace.REDSHIFT_ANALYTICS);
    const fn = new SolutionNodejsFunction(this, `${resourceId}Fn`, {
      runtime: Runtime.NODEJS_18_X,
      entry: join(
        this.lambdaRootPath,
        'load-manifest-to-redshift.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(3),
      logRetention: RetentionDays.ONE_WEEK,
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, `${resourceId}Role`, true, [...cloudwatchPolicyStatements]),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        PROJECT_ID: props.projectId,
        QUERY_RESULT_LIMIT: loadDataConfig.maxFilesLimit.toString(),
        DYNAMODB_TABLE_NAME: ddbTable.tableName,
        ... this.toRedshiftEnvVariables(odsTableName, props),
        REDSHIFT_ROLE: copyRole.roleArn,
        REDSHIFT_DATA_API_ROLE: props.dataAPIRole.roleArn,
        ...POWERTOOLS_ENVS,
      },
    });
    // Update the job_status from ENQUEUE to PROCESSING.
    ddbTable.grantReadWriteData(fn);
    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);
    return fn;
  }

  private toRedshiftEnvVariables(odsTableName: string, props: LoadOdsDataToRedshiftWorkflowProps): {
    [key: string]: string;
  } {
    return {
      REDSHIFT_MODE: props.serverlessRedshift ? REDSHIFT_MODE.SERVERLESS : REDSHIFT_MODE.PROVISIONED,
      REDSHIFT_SERVERLESS_WORKGROUP_NAME: props.serverlessRedshift?.workgroupName ?? '',
      REDSHIFT_CLUSTER_IDENTIFIER: props.provisionedRedshift?.clusterIdentifier ?? '',
      REDSHIFT_DATABASE: props.databaseName,
      REDSHIFT_ODS_TABLE_NAME: odsTableName,
      REDSHIFT_DB_USER: props.provisionedRedshift?.dbUser ?? '',
    };
  }

  private createCheckLoadJobStatusFn(ddbTable: ITable, odsTableName: string, props: LoadOdsDataToRedshiftWorkflowProps): IFunction {

    const resourceId = `CheckLoadJobStatus-${odsTableName}`;

    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, `${resourceId}Fn`, {
      runtime: Runtime.NODEJS_18_X,
      entry: join(
        this.lambdaRootPath,
        'check-load-status.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(2),
      logRetention: RetentionDays.ONE_WEEK,
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, `${resourceId}Role`, true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        PROJECT_ID: props.projectId,
        DYNAMODB_TABLE_NAME: ddbTable.tableName,
        ... this.toRedshiftEnvVariables(odsTableName, props),
        REDSHIFT_DATA_API_ROLE: props.dataAPIRole.roleArn,
        ...POWERTOOLS_ENVS,
      },
    });

    ddbTable.grantWriteData(fn);
    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);
    props.workflowBucketInfo.s3Bucket.grantDelete(fn, `${props.workflowBucketInfo.prefix}*`);

    return fn;
  }


  private createHasMoreWorkFn(ddbTable: ITable, odsTableName: string, props: LoadOdsDataToRedshiftWorkflowProps): IFunction {

    const odsSource = (props.tablesOdsSource as any)[odsTableName];
    const resourceId = `HasMoreWork-${odsTableName}`;

    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, `${resourceId}Fn`, {
      runtime: Runtime.NODEJS_18_X,
      entry: join(
        this.lambdaRootPath,
        'has-more-job-new.ts',
      ),
      handler: 'handler',
      memorySize: 1024,
      timeout: Duration.minutes(2),
      logRetention: RetentionDays.ONE_WEEK,
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, `${resourceId}Role`, true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        PROJECT_ID: props.projectId,
        ODS_EVENT_BUCKET: odsSource.s3Bucket.bucketName,
        ODS_EVENT_BUCKET_PREFIX: odsSource.prefix,
        DYNAMODB_TABLE_NAME: ddbTable.tableName,
        DYNAMODB_TABLE_INDEX_NAME: DYNAMODB_TABLE_INDEX_NAME,
        REDSHIFT_ODS_TABLE_NAME: odsTableName,
        ...POWERTOOLS_ENVS,
      },

    });
    ddbTable.grantReadData(fn);
    return fn;
  }


  private createCheckSkippingRunningWorkflowFn(ddbTable: ITable, props: LoadOdsDataToRedshiftWorkflowProps): IFunction {

    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, 'CheckSkippingRunningWorkflowFn', {
      runtime: Runtime.NODEJS_18_X,
      entry: join(
        this.lambdaRootPath,
        'skip-running-workflow.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(2),
      logRetention: RetentionDays.ONE_WEEK,
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, 'CheckSkippingRunningWorkflowFnRole', true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        PROJECT_ID: props.projectId,
        DYNAMODB_TABLE_NAME: ddbTable.tableName,
        DYNAMODB_TABLE_INDEX_NAME: DYNAMODB_TABLE_INDEX_NAME,
        ...POWERTOOLS_ENVS,
      },

    });
    ddbTable.grantReadData(fn);
    return fn;
  }
}
