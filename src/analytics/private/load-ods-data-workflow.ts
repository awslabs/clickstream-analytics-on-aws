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
import { Duration, CfnCondition, CfnResource, RemovalPolicy, Fn } from 'aws-cdk-lib';
import { ITable, Table, AttributeType, BillingMode, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { IVpc, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { Rule, Match, Schedule } from 'aws-cdk-lib/aws-events';
import { SfnStateMachine, LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { IRole, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { StateMachine, LogLevel, IStateMachine, TaskInput, Wait, WaitTime, Succeed, Choice, Map, Condition, Pass, Fail, DefinitionBody } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { DYNAMODB_TABLE_INDEX_NAME } from './constant';
import { ODSSource, ExistingRedshiftServerlessProps, ProvisionedRedshiftProps, LoadDataProps, LoadWorkflowData } from './model';
import { createLambdaRole } from '../../common/lambda';
import { createLogGroup } from '../../common/logs';
import { getPutMetricsPolicyStatements } from '../../common/metrics';
import { MetricsNamespace, REDSHIFT_MODE } from '../../common/model';
import { POWERTOOLS_ENVS } from '../../common/powertools';
import { createSGForEgressToAwsService } from '../../common/sg';
import { SolutionNodejsFunction } from '../../private/function';

export interface LoadOdsDataToRedshiftWorkflowProps {
  readonly projectId: string;
  readonly networkConfig: {
    readonly vpc: IVpc;
    readonly vpcSubnets: SubnetSelection;
  };
  readonly odsSource: ODSSource;
  readonly loadWorkflowData: LoadWorkflowData;
  readonly loadDataProps: LoadDataProps;
  readonly serverlessRedshift?: ExistingRedshiftServerlessProps;
  readonly provisionedRedshift?: ProvisionedRedshiftProps;
  readonly odsTableName: string;
  readonly databaseName: string;
  readonly dataAPIRole: IRole;
  readonly emrServerlessApplicationId: string;
  readonly redshiftRoleForCopyFromS3: IRole;
}

export class LoadOdsDataToRedshiftWorkflow extends Construct {
  private readonly lambdaRootPath = __dirname + '/../lambdas/load-data-workflow';

  public readonly loadDataWorkflow: IStateMachine;

  constructor(scope: Construct, id: string, props: LoadOdsDataToRedshiftWorkflowProps) {
    super(scope, id);

    const ddbStatusTable = this.createDDBStatusTable(props.odsTableName);

    const processorLambda = this.createODSEventProcessorLambda(ddbStatusTable, props);

    ddbStatusTable.grantWriteData(processorLambda);
    // create a rule to store the ods source files
    const sourceTriggerRule = new Rule(this, 'odsS3DataHandler', {
      eventPattern: {
        detailType: Match.equalsIgnoreCase('object created'),
        detail: {
          bucket: {
            name: Match.exactString(props.odsSource.s3Bucket.bucketName),
          },
          object: {
            key: Match.prefix(props.odsSource.prefix),
          },
        },
        source: ['aws.s3'],
      },
    });
    sourceTriggerRule.addTarget(new LambdaFunction(processorLambda));


    props.odsSource.s3Bucket.grantRead(props.redshiftRoleForCopyFromS3, `${props.odsSource.prefix}*`);
    props.loadWorkflowData.s3Bucket.grantRead(props.redshiftRoleForCopyFromS3, `${props.loadWorkflowData.prefix}*`);

  
    // create Step function workflow to orchestrate the workflow to load data from s3 to redshift
    this.loadDataWorkflow = this.createWorkflow(ddbStatusTable, props, props.redshiftRoleForCopyFromS3);


    const emrApplicationId = props.emrServerlessApplicationId;


    const noEmrApplicationIdCondition = new CfnCondition(this, 'NoEmrApplicationIdCondition', {
      expression: Fn.conditionEquals(emrApplicationId, ''),
    });

    const hasEmrApplicationIdCondition = new CfnCondition(this, 'HasEmrApplicationIdCondition', {
      expression: Fn.conditionNot(noEmrApplicationIdCondition),
    });

    const emrServerlessJobSuccessRule = new Rule(this, 'EmrServerlessJobSuccessRule', {
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
    (emrServerlessJobSuccessRule.node.defaultChild as CfnResource).cfnOptions.condition = hasEmrApplicationIdCondition;

    const timeBasedScheduleRule = new Rule(this, 'LoadScheduleRule', {
      schedule: Schedule.expression(props.loadDataProps.scheduleInterval),
      targets: [
        new SfnStateMachine(this.loadDataWorkflow),
      ],
    });
    (timeBasedScheduleRule.node.defaultChild as CfnResource).cfnOptions.condition = noEmrApplicationIdCondition;

  }

  private createDDBStatusTable(tableId: string): ITable {
    const itemsTable = new Table(this, tableId, {
      partitionKey: {
        name: 's3_uri', //s3://s3Bucket/s3Object
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: TableEncryption.AWS_MANAGED,
      // The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
      // the new table, and it will remain in your account until manually deleted. By setting the policy to
      // DESTROY, cdk destroy will delete the table (even if it has data in it)
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Add a global secondary index with a different partition key and sort key
    //GSI_PK=status, GSI_SK=timestamp
    itemsTable.addGlobalSecondaryIndex({
      indexName: DYNAMODB_TABLE_INDEX_NAME,
      partitionKey: { name: 'job_status', type: AttributeType.STRING },
      sortKey: { name: 'timestamp', type: AttributeType.NUMBER },
    });

    return itemsTable;
  };

  /**
   * Create a lambda function to put ODS event source to dynamodb.
   * @param taskTable The table for recording tasks
   * @param props The property for input parameters.
   * @returns A lambda function.
   */
  private createODSEventProcessorLambda(taskTable: ITable, props: LoadOdsDataToRedshiftWorkflowProps): IFunction {
    const fnSG = createSGForEgressToAwsService(this, 'ODSEventProcessorLambdaSg', props.networkConfig.vpc);

    const fn = new SolutionNodejsFunction(this, 'ODSEventProcessorFn', {
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
      role: createLambdaRole(this, 'ODSEventProcessorRole', true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        PROJECT_ID: props.projectId,
        S3_FILE_SUFFIX: props.odsSource.fileSuffix,
        DYNAMODB_TABLE_NAME: taskTable.tableName,
        ...POWERTOOLS_ENVS,
      },
    });

    return fn;
  }

  // private createCustomResourceAssociateIAMRole(props: LoadOdsDataToRedshiftWorkflowProps, copyRole: IRole): CustomResource {
  //   const fn = new SolutionNodejsFunction(this, 'AssociateIAMRoleToRedshiftFn', {
  //     runtime: Runtime.NODEJS_18_X,
  //     entry: join(
  //       __dirname + '/../lambdas/custom-resource',
  //       'redshift-associate-iam-role.ts',
  //     ),
  //     handler: 'handler',
  //     memorySize: 256,
  //     reservedConcurrentExecutions: 1,
  //     timeout: Duration.minutes(5),
  //     logRetention: RetentionDays.ONE_WEEK,
  //     role: createLambdaRole(this, 'AssociateIAMRoleFnRole', false, [
  //       new PolicyStatement({
  //         actions: [
  //           'iam:PassRole',
  //         ],
  //         resources: ['*'], // have to use wildcard for keeping existing associated roles
  //       }),
  //     ]),
  //     environment: {
  //       ...POWERTOOLS_ENVS,
  //     },
  //   });

  //   const provider = new Provider(
  //     this,
  //     'RedshiftAssociateIAMRoleCustomResourceProvider',
  //     {
  //       onEventHandler: fn,
  //       logRetention: RetentionDays.FIVE_DAYS,
  //     },
  //   );

  //   const customProps: AssociateIAMRoleToRedshift = {
  //     roleArn: copyRole.roleArn,
  //     serverlessRedshiftProps: props.serverlessRedshift,
  //     provisionedRedshiftProps: props.provisionedRedshift,
  //   };

  //   const cr = new CustomResource(this, 'RedshiftAssociateIAMRoleCustomResource', {
  //     serviceToken: provider.serviceToken,
  //     properties: customProps,
  //   });

  //   if (props.serverlessRedshift) {
  //     if (props.serverlessRedshift.workgroupId && Token.isUnresolved(props.serverlessRedshift.workgroupId) &&
  //       !props.serverlessRedshift.createdInStack) {
  //       const noWorkgroupIdCondition = getOrCreateNoWorkgroupIdCondition(this, props.serverlessRedshift.workgroupId);
  //       this.createRedshiftServerlessWorkgroupPolicy('RedshiftServerlessAllWorkgroupPolicy', '*',
  //         fn.role!, noWorkgroupIdCondition);

  //       const withWorkgroupIdCondition = getOrCreateWithWorkgroupIdCondition(this, props.serverlessRedshift.workgroupId);
  //       this.createRedshiftServerlessWorkgroupPolicy('RedshiftServerlessSingleWorkgroupPolicy', props.serverlessRedshift.workgroupId,
  //         fn.role!, withWorkgroupIdCondition);
  //     } else {
  //       cr.node.addDependency(this.createRedshiftServerlessWorkgroupPolicy('RedshiftServerlessWorkgroupPolicy',
  //         props.serverlessRedshift.workgroupId ?? '*', fn.role!));
  //     }
  //     if (props.serverlessRedshift.namespaceId && Token.isUnresolved(props.serverlessRedshift.namespaceId) &&
  //       !props.serverlessRedshift.createdInStack) {
  //       const noNamespaceIdCondition = getOrCreateNoNamespaceIdCondition(this, props.serverlessRedshift.namespaceId);
  //       this.createRedshiftServerlessNamespacePolicy('RedshiftServerlessAllNamespacePolicy', '*',
  //         fn.role!, noNamespaceIdCondition);

  //       const withNamespaceIdCondition = getOrCreateWithNamespaceIdCondition(this, props.serverlessRedshift.namespaceId);
  //       this.createRedshiftServerlessNamespacePolicy('RedshiftServerlessSingleNamespacePolicy', props.serverlessRedshift.namespaceId,
  //         fn.role!, withNamespaceIdCondition);
  //     } else {
  //       cr.node.addDependency(this.createRedshiftServerlessNamespacePolicy('RedshiftServerlessNamespacePolicy',
  //         props.serverlessRedshift.namespaceId ?? '*', fn.role!));
  //     }
  //   } else {
  //     cr.node.addDependency(new Policy(this, 'ProvisionedRedshiftIAMPolicy', {
  //       roles: [fn.role!],
  //       statements: [
  //         new PolicyStatement({
  //           actions: [
  //             'redshift:DescribeClusters',
  //           ],
  //           resources: [
  //             Arn.format({
  //               service: 'redshift',
  //               resource: '*',
  //             }, Stack.of(this)),
  //           ],
  //         }),
  //         new PolicyStatement({
  //           actions: [
  //             'redshift:ModifyClusterIamRoles',
  //           ],
  //           resources: [
  //             Arn.format({
  //               service: 'redshift',
  //               resource: 'cluster',
  //               resourceName: props.provisionedRedshift!.clusterIdentifier,
  //               arnFormat: ArnFormat.COLON_RESOURCE_NAME,
  //             }, Stack.of(this)),
  //           ],
  //         }),
  //       ],
  //     }));
  //   }
  //   return cr;
  // }

  // private createRedshiftServerlessWorkgroupPolicy(id: string, workgroupId: string, role: IRole, condition?: CfnCondition): Policy {
  //   const policy = new Policy(this, id, {
  //     roles: [role],
  //     statements: [
  //       new PolicyStatement({
  //         actions: [
  //           'redshift-serverless:GetWorkgroup',
  //         ],
  //         resources: [
  //           Arn.format({
  //             service: 'redshift-serverless',
  //             resource: 'workgroup',
  //             resourceName: workgroupId,
  //             arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
  //           }, Stack.of(this)),
  //         ],
  //       }),
  //     ],
  //   });
  //   if (condition) { (policy.node.findChild('Resource') as CfnResource).cfnOptions.condition = condition; }
  //   return policy;
  // }

  // private createRedshiftServerlessNamespacePolicy(id: string, namespaceId: string, role: IRole, condition?: CfnCondition): Policy {
  //   const policy = new Policy(this, id, {
  //     roles: [role],
  //     statements: [
  //       new PolicyStatement({
  //         actions: [
  //           'redshift-serverless:GetNamespace',
  //           'redshift-serverless:UpdateNamespace',
  //         ],
  //         resources: [
  //           Arn.format({
  //             service: 'redshift-serverless',
  //             resource: 'namespace',
  //             resourceName: namespaceId,
  //             arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
  //           }, Stack.of(this)),
  //         ],
  //       }),
  //     ],
  //   });
  //   if (condition) { (policy.node.findChild('Resource') as CfnResource).cfnOptions.condition = condition; }
  //   return policy;
  // }

  private createWorkflow(dataTable: ITable, props: LoadOdsDataToRedshiftWorkflowProps, copyRole: IRole): IStateMachine {

    const hasRunningWorkflowFn = this.createCheckHasRunningWorkflowFn(dataTable, props);
    const checkHasRunningWorkflow = new LambdaInvoke(this, `${this.node.id} - Check Other Running Workflow`, {
      lambdaFunction: hasRunningWorkflowFn,
      payload: TaskInput.fromObject({
        'execution_id.$': '$$.Execution.Id',
      }),
      outputPath: '$.Payload',
    });

    checkHasRunningWorkflow.addRetry({
      errors: ['Lambda.TooManyRequestsException'],
      interval: Duration.seconds(3),
      backoffRate: 2,
      maxAttempts: 6,
    });


    const createLoadManifestFn = this.createLoadManifestFn(dataTable, props);
    const getJobList = new LambdaInvoke(this, `${this.node.id} - Create job manifest`, {
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


    const loadManifestToRedshiftFn = this.loadManifestToRedshiftFn(dataTable, props, copyRole);
    const submitJob = new LambdaInvoke(this, `${this.node.id} - Submit job`, {
      lambdaFunction: loadManifestToRedshiftFn,
      payload: TaskInput.fromObject({
        detail: {
          'execution_id.$': '$$.Execution.Id',
          'appId.$': '$.appId',
          'manifestFileName.$': '$.manifestFileName',
          'jobList.$': '$.jobList',
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

    const createCheckLoadJobStatusFn = this.createCheckLoadJobStatusFn(dataTable, props);

    const checkJobStatus = new LambdaInvoke(this, `${this.node.id} - Check job status`, {
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

    const waitX = new Wait(this, `${this.node.id} - Wait seconds`, {
      /**
         *  You can also implement with the path stored in the state like:
         *  sfn.WaitTime.secondsPath('$.waitSeconds')
         */
      time: WaitTime.duration(Duration.seconds(30)),
    });

    const jobFailed = new Fail(this, `${this.node.id} - Job fails`, {
      cause: 'LoadManifest Job Failed',
      error: 'DescribeJob returned FAILED',
    });

    const finalStatus = new Pass(this, `${this.node.id} - Job completes`);

    // Create sub chain
    const subDefinition = submitJob
      .next(waitX)
      .next(checkJobStatus)
      .next(new Choice(this, `${this.node.id} - Check if job completes`)
        // Look at the "status" field
        .when(Condition.stringEquals('$.detail.status', 'FAILED'), jobFailed)
        .when(Condition.stringEquals('$.detail.status', 'ABORTED'), jobFailed)
        .when(Condition.stringEquals('$.detail.status', 'FINISHED'), finalStatus)
        .when(Condition.stringEquals('$.detail.status', 'NO_JOBS'), finalStatus)
        .otherwise(waitX));

    const doLoadJob = new Map(
      this,
      `${this.node.id} - Do load job`,
      {
        maxConcurrency: 2,
        itemsPath: '$.manifestList',
      },
    );
    doLoadJob.iterator(subDefinition);


    const hasMoreWorkFn = this.createHasMoreWorkFn(dataTable, props);
    const checkMoreWork = new LambdaInvoke(this, `${this.node.id} - Check more work`, {
      lambdaFunction: hasMoreWorkFn,
      outputPath: '$.Payload',
    });

    checkMoreWork.addRetry({
      errors: ['Lambda.TooManyRequestsException'],
      interval: Duration.seconds(3),
      backoffRate: 2,
      maxAttempts: 6,
    });

    const allCompleted = new Succeed(this, `${this.node.id} - Completed`);

    const hasMoreChoice = new Choice(this, `${this.node.id} - Has more work`)
      .when(Condition.numberGreaterThan('$.jobNewCount', 0), getJobList)
      .otherwise(allCompleted);

    const checkMoreWorkTodo = checkMoreWork.next(hasMoreChoice);

    const waitX2 = new Wait(this, `${this.node.id} - Wait and check again`, {
      time: WaitTime.duration(Duration.seconds(30)),
    });

    const waitAndCheckMoreWork = waitX2.next(checkMoreWorkTodo);
    const checkJobExist = new Choice(this, `${this.node.id} - Check if job exists`)
      .when(Condition.isNotPresent('$.manifestList'), waitAndCheckMoreWork)
      .when(Condition.numberGreaterThan('$.count', 0), doLoadJob.next(checkMoreWorkTodo))
      .otherwise(waitAndCheckMoreWork);

    const doWorkflow = getJobList.next(checkJobExist);
    const ignoreRunflow = new Pass(this, `${this.node.id} - Ignore Running`).next(allCompleted);

    const hasRunningWorkflowChoice = new Choice(this, `${this.node.id} - Has Other Running Workflow`)
      .when(Condition.booleanEquals('$.HasRunningWorkflow', false), doWorkflow)
      .otherwise(ignoreRunflow);

    const definition = checkHasRunningWorkflow.next(hasRunningWorkflowChoice);

    // Create state machine
    const loadDataStateMachine = new StateMachine(this, 'LoadDataStateMachine', {
      definitionBody: DefinitionBody.fromChainable(definition),
      logs: {
        destination: createLogGroup(this,
          {
            prefix: `/aws/vendedlogs/states/Clickstream/LoadData-${this.node.id}` ,
          },
        ),
        level: LogLevel.ALL,
      },
      tracingEnabled: true,
    });

    hasRunningWorkflowFn.role?.attachInlinePolicy(new Policy(this, 'stateFlowListPolicy', {
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

  private createLoadManifestFn(dataTable: ITable, props: LoadOdsDataToRedshiftWorkflowProps): IFunction {
    const fnSG = createSGForEgressToAwsService(this, 'CreateLoadManifestFnSG', props.networkConfig.vpc);
    const cloudwatchPolicyStatements = getPutMetricsPolicyStatements(MetricsNamespace.REDSHIFT_ANALYTICS);
    const fn = new SolutionNodejsFunction(this, 'CreateLoadManifestFn', {
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
      role: createLambdaRole(this, 'CreateLoadManifestFnRole', true, [...cloudwatchPolicyStatements]),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        PROJECT_ID: props.projectId,
        MANIFEST_BUCKET: props.loadWorkflowData.s3Bucket.bucketName,
        MANIFEST_BUCKET_PREFIX: props.loadWorkflowData.prefix,
        ODS_EVENT_BUCKET: props.odsSource.s3Bucket.bucketName,
        ODS_EVENT_BUCKET_PREFIX: props.odsSource.prefix,
        QUERY_RESULT_LIMIT: props.loadDataProps.maxFilesLimit.toString(),
        DYNAMODB_TABLE_NAME: dataTable.tableName,
        DYNAMODB_TABLE_INDEX_NAME: DYNAMODB_TABLE_INDEX_NAME,
        ...POWERTOOLS_ENVS,
      },
    });

    // Update the job_status from NEW to ENQUEUE.
    dataTable.grantReadWriteData(fn);
    props.loadWorkflowData.s3Bucket.grantWrite(fn, `${props.loadWorkflowData.prefix}*`);

    return fn;
  }

  private loadManifestToRedshiftFn(dataTable: ITable, props: LoadOdsDataToRedshiftWorkflowProps, copyRole: IRole): IFunction {
    const fnSG = createSGForEgressToAwsService(this, 'LoadManifestToRedshiftFnSG', props.networkConfig.vpc);
    const cloudwatchPolicyStatements = getPutMetricsPolicyStatements(MetricsNamespace.REDSHIFT_ANALYTICS);
    const fn = new SolutionNodejsFunction(this, 'LoadManifestToRedshiftFn', {
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
      role: createLambdaRole(this, 'LoadManifestToRedshiftRole', true, [...cloudwatchPolicyStatements]),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        PROJECT_ID: props.projectId,
        QUERY_RESULT_LIMIT: props.loadDataProps.maxFilesLimit.toString(),
        DYNAMODB_TABLE_NAME: dataTable.tableName,
        ... this.toRedshiftEnvVariables(props),
        REDSHIFT_ROLE: copyRole.roleArn,
        REDSHIFT_DATA_API_ROLE: props.dataAPIRole.roleArn,
        ...POWERTOOLS_ENVS,
      },
    });
    // Update the job_status from ENQUEUE to PROCESSING.
    dataTable.grantReadWriteData(fn);
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
      REDSHIFT_ODS_TABLE_NAME: props.odsTableName,
      REDSHIFT_DB_USER: props.provisionedRedshift?.dbUser ?? '',
    };
  }

  private createCheckLoadJobStatusFn(dataTable: ITable, props: LoadOdsDataToRedshiftWorkflowProps): IFunction {
    const fnSG = createSGForEgressToAwsService(this, 'CheckLoadJobStatusFnSG', props.networkConfig.vpc);

    const fn = new SolutionNodejsFunction(this, 'CheckLoadJobStatusFn', {
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
      role: createLambdaRole(this, 'CheckLoadJobStatusRole', true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        PROJECT_ID: props.projectId,
        DYNAMODB_TABLE_NAME: dataTable.tableName,
        ... this.toRedshiftEnvVariables(props),
        REDSHIFT_DATA_API_ROLE: props.dataAPIRole.roleArn,
        ...POWERTOOLS_ENVS,
      },
    });

    dataTable.grantWriteData(fn);
    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);
    props.loadWorkflowData.s3Bucket.grantDelete(fn, `${props.loadWorkflowData.prefix}*`);

    return fn;
  }


  private createHasMoreWorkFn(dataTable: ITable, props: LoadOdsDataToRedshiftWorkflowProps): IFunction {
    const fnSG = createSGForEgressToAwsService(this, 'HasMoreWorkFnSG', props.networkConfig.vpc);

    const fn = new SolutionNodejsFunction(this, 'HasMoreWorkFn', {
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
      role: createLambdaRole(this, 'HasMoreWorkFnRole', true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        PROJECT_ID: props.projectId,
        ODS_EVENT_BUCKET: props.odsSource.s3Bucket.bucketName,
        ODS_EVENT_BUCKET_PREFIX: props.odsSource.prefix,
        DYNAMODB_TABLE_NAME: dataTable.tableName,
        DYNAMODB_TABLE_INDEX_NAME: DYNAMODB_TABLE_INDEX_NAME,
        ...POWERTOOLS_ENVS,
      },

    });
    dataTable.grantReadData(fn);
    return fn;
  }


  private createCheckHasRunningWorkflowFn(dataTable: ITable, props: LoadOdsDataToRedshiftWorkflowProps): IFunction {
    const fnSG = createSGForEgressToAwsService(this, 'HasRunningWorkflowFnSG', props.networkConfig.vpc);

    const fn = new SolutionNodejsFunction(this, 'HasRunningWorkflowFn', {
      runtime: Runtime.NODEJS_18_X,
      entry: join(
        this.lambdaRootPath,
        'has-running-workflow.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(2),
      logRetention: RetentionDays.ONE_WEEK,
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, 'HasRunningWorkflowFnRole', true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        PROJECT_ID: props.projectId,
        ODS_EVENT_BUCKET: props.odsSource.s3Bucket.bucketName,
        ODS_EVENT_BUCKET_PREFIX: props.odsSource.prefix,
        DYNAMODB_TABLE_NAME: dataTable.tableName,
        DYNAMODB_TABLE_INDEX_NAME: DYNAMODB_TABLE_INDEX_NAME,
        ...POWERTOOLS_ENVS,
      },

    });
    dataTable.grantReadData(fn);
    return fn;
  }
}