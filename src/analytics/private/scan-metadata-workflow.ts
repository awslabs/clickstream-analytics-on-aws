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
import { IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { StateMachine, LogLevel, IStateMachine, TaskInput, Wait, WaitTime, Succeed, Fail, Choice, Map, Condition, Pass, DefinitionBody } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { ExistingRedshiftServerlessCustomProps, ProvisionedRedshiftProps, ScanMetadataWorkflowData } from './model';
import { createLambdaRole } from '../../common/lambda';
import { createLogGroup } from '../../common/logs';
import { REDSHIFT_MODE } from '../../common/model';
import { POWERTOOLS_ENVS } from '../../common/powertools';
import { SolutionNodejsFunction } from '../../private/function';
import { WorkflowStatus } from '../private/constant';

export interface ScanMetadataWorkflowProps {
  readonly appIds: string;
  readonly projectId: string;
  readonly networkConfig: {
    readonly vpc: IVpc;
    readonly vpcSubnets: SubnetSelection;
  };
  readonly securityGroupForLambda: ISecurityGroup;
  readonly serverlessRedshift?: ExistingRedshiftServerlessCustomProps;
  readonly provisionedRedshift?: ProvisionedRedshiftProps;
  readonly databaseName: string;
  readonly dataAPIRole: IRole;
  readonly scanMetadataWorkflowData: ScanMetadataWorkflowData;
}

export class ScanMetadataWorkflow extends Construct {
  private readonly lambdaRootPath = __dirname + '/../lambdas/scan-metadata-workflow';
  public readonly scanMetadataWorkflow: IStateMachine;

  constructor(scope: Construct, id: string, props: ScanMetadataWorkflowProps) {
    super(scope, id);
    const bucket = Bucket.fromBucketName(this, 'BucketImported', props.scanMetadataWorkflowData.pipelineS3Bucket);
    // create Step function workflow to orchestrate the workflow to scan metadata.
    this.scanMetadataWorkflow = this.createWorkflow(props, bucket);
  }

  private createWorkflow(props: ScanMetadataWorkflowProps, bucket: IBucket): IStateMachine {
    const checkScanMetadataStatusFn = this.checkScanMetadataStatusFn(props);
    const checkScanMetadataStatusJob = new LambdaInvoke(this, `${this.node.id} - Check scan metadata job status`, {
      lambdaFunction: checkScanMetadataStatusFn,
      payload: TaskInput.fromObject({
        'detail.$': '$.detail',
      }),
      outputPath: '$.Payload',
    });

    checkScanMetadataStatusJob.addRetry({
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
      time: WaitTime.duration(Duration.seconds(60)),
    });

    const scanMetadataJobFailed = new Fail(this, `${this.node.id} - scan metadata job fails`, {
      cause: 'ScanMetadata Job Failed',
      error: 'DescribeJob returned FAILED',
    });

    const scanMetadataCompleted = new Pass(this, `${this.node.id} - scan metadata job completes`);

    const checkWorkflowStartJobFailed = new Fail(this, `${this.node.id} - check whether should start scan metadata job fails`, {
      cause: 'CheckScanMetadataStatus Job Failed',
      error: 'CheckScanMetadataStatus Job returned FAILED',
    });

    const checkWorkflowStartJobSKIP = new Succeed(this, `${this.node.id} - check whether should start scan metadata job completes`);

    const storeMetadataIntoDDBFn = this.storeMetadataIntoDDBFn(props);
    const storeMetadataIntoDDBJob = new LambdaInvoke(this, `${this.node.id} - store scan metadata job status`, {
      lambdaFunction: storeMetadataIntoDDBFn,
      payload: TaskInput.fromObject({
        'detail.$': '$.detail',
      }),
      outputPath: '$.Payload',
    }).next(
      new Choice(this, 'Check if store metadata completed')
        .when(Condition.stringEquals('$.detail.status', WorkflowStatus.SUCCEED), scanMetadataCompleted)
        .otherwise(scanMetadataJobFailed),
    );

    const scanMetadataFn = this.scanMetadataFn(props);
    const scanMetadataJob = new LambdaInvoke(this, `${this.node.id} - Submit scan metadata job`, {
      lambdaFunction: scanMetadataFn,
      payload: TaskInput.fromObject({
        'appId.$': '$.appId',
        'scanStartDate.$': '$.scanStartDate',
        'scanEndDate.$': '$.scanEndDate',
      }),
      outputPath: '$.Payload',
    });

    const updateWorkflowInfoFn = this.updateWorkflowInfoFn(props, bucket);
    const updateWorkflowInfoJob = new LambdaInvoke(this, `${this.node.id} - Update workflow info job`, {
      lambdaFunction: updateWorkflowInfoFn,
      payload: TaskInput.fromObject({
        'lastJobStartTimestamp.$': '$.workflowInfo.Payload.jobStartTimestamp',
        'lastScanEndDate.$': '$.workflowInfo.Payload.scanEndDate',
        'eventSource.$': '$.workflowInfo.Payload.eventSource',
      }),
      outputPath: '$.Payload',
    });

    const scanMetaDataDefinition = scanMetadataJob
      .next(waitX)
      .next(checkScanMetadataStatusJob)
      .next(
        new Choice(this, `${this.node.id} - Check if scan metadata job completes`)
          .when(Condition.stringEquals('$.detail.status', WorkflowStatus.FAILED), scanMetadataJobFailed)
          .when(Condition.stringEquals('$.detail.status', WorkflowStatus.ABORTED), scanMetadataJobFailed)
          .when(Condition.stringEquals('$.detail.status', WorkflowStatus.FINISHED), storeMetadataIntoDDBJob)
          .when(Condition.stringEquals('$.detail.status', WorkflowStatus.NO_JOBS), scanMetadataCompleted)
          .otherwise(waitX));

    const doScanMetadataJob = new Map(
      this,
      `${this.node.id} - Do scanMetadata job`,
      {
        maxConcurrency: 1,
        itemsPath: '$.GetJobList.appIdList',
        inputPath: '$',
        parameters: {
          'appId.$': '$$.Map.Item.Value',
          'scanEndDate.$': '$.workflowInfo.Payload.scanEndDate',
          'scanStartDate.$': '$.workflowInfo.Payload.scanStartDate',
        },
        resultPath: '$.doScanMetadata',
      },
    );
    doScanMetadataJob.iterator(scanMetaDataDefinition);
    doScanMetadataJob.next(updateWorkflowInfoJob);

    const doNothing = new Succeed(this, `${this.node.id} - Do Nothing`);
    const checkJobExist = new Choice(this, `${this.node.id} - Check if job exists`)
      .when(Condition.isNotPresent('$.GetJobList.appIdList'), doNothing)
      .when(Condition.isPresent('$.GetJobList.appIdList'), doScanMetadataJob)
      .otherwise(doNothing);

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

    const checkWorkflowStartFn = this.checkWorkflowStartFn(props, bucket);
    const checkWorkflowStartJob = new LambdaInvoke(this, `${this.node.id} - Check whether scan metadata should start`, {
      lambdaFunction: checkWorkflowStartFn,
      payload: TaskInput.fromObject({
        'originalInput.$': '$',
        'executionId.$': '$$.Execution.Id',
      }),
      resultPath: '$.workflowInfo',
    });

    const checkWorkflowStartDefinition = checkWorkflowStartJob
      .next(
        new Choice(this, `${this.node.id} - Check if scan metadata workflow start`)
          .when(Condition.stringEquals('$.workflowInfo.Payload.status', WorkflowStatus.FAILED), checkWorkflowStartJobFailed)
          .when(Condition.stringEquals('$.workflowInfo.Payload.status', WorkflowStatus.ABORTED), checkWorkflowStartJobFailed)
          .when(Condition.stringEquals('$.workflowInfo.Payload.status', WorkflowStatus.SKIP), checkWorkflowStartJobSKIP)
          .when(Condition.stringEquals('$.workflowInfo.Payload.status', WorkflowStatus.CONTINUE), getAppIdList));

    // Create state machine
    const scanMetadataStateMachine = new StateMachine(this, 'ScanMetadataStateMachine', {
      definitionBody: DefinitionBody.fromChainable(checkWorkflowStartDefinition),
      logs: {
        destination: createLogGroup(this,
          {
            prefix: '/aws/vendedlogs/states/Clickstream/ScanMetadataStateMachine',
          },
        ),
        level: LogLevel.ALL,
      },
      tracingEnabled: true,
      comment: 'This state machine is responsible for aggregating events, parameters and user data and store the aggregated data in DynamoDB',
    });

    checkWorkflowStartFn.role?.attachInlinePolicy(new Policy(this, 'stateFlowListPolicy', {
      statements: [
        new PolicyStatement({
          actions: [
            'states:ListExecutions',
          ],
          resources: [
            scanMetadataStateMachine.stateMachineArn,
          ],
        }),
      ],
    }));

    return scanMetadataStateMachine;
  }

  private checkWorkflowStartFn(props: ScanMetadataWorkflowProps, bucket: IBucket): IFunction {
    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, 'CheckWorkflowStart', {
      runtime: Runtime.NODEJS_18_X,
      entry: join(
        this.lambdaRootPath,
        'check-metadata-workflow-start.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(3),
      logRetention: RetentionDays.ONE_WEEK,
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, 'CheckWorkflowStartRole', true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        PIPELINE_S3_BUCKET_NAME: props.scanMetadataWorkflowData.pipelineS3Bucket,
        PIPELINE_S3_PREFIX: props.scanMetadataWorkflowData.pipelineS3Prefix,
        WORKFLOW_MIN_INTERVAL: props.scanMetadataWorkflowData.scanWorkflowMinInterval,
        PROJECT_ID: props.projectId,
        ... POWERTOOLS_ENVS,
      },
    });
    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);
    bucket.grantRead(fn, `${props.scanMetadataWorkflowData.pipelineS3Prefix}*`);
    return fn;
  }

  private scanMetadataFn(props: ScanMetadataWorkflowProps): IFunction {
    const fnSG = props.securityGroupForLambda;
    const fn = new SolutionNodejsFunction(this, 'ScanMetadataFn', {
      runtime: Runtime.NODEJS_18_X,
      entry: join(
        this.lambdaRootPath,
        'scan-metadata.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(3),
      logRetention: RetentionDays.ONE_WEEK,
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, 'ScanMetadataRole', true, []),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        ... this.toRedshiftEnvVariables(props),
        REDSHIFT_DATA_API_ROLE: props.dataAPIRole.roleArn,
        TOP_FREQUENT_PROPERTIES_LIMIT: props.scanMetadataWorkflowData.topFrequentPropertiesLimit,
        ... POWERTOOLS_ENVS,
      },
    });
    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);
    return fn;
  }

  private updateWorkflowInfoFn(props: ScanMetadataWorkflowProps, bucket: IBucket): IFunction {
    const fnSG = props.securityGroupForLambda;

    const policyStatements = [
      new PolicyStatement({
        actions: [
          'dynamodb:PutItem',
        ],
        resources: [
          props.scanMetadataWorkflowData.clickstreamAnalyticsMetadataDdbArn,
        ],
      }),
    ];

    const fn = new SolutionNodejsFunction(this, 'UpdateWorkflowInfoFn', {
      runtime: Runtime.NODEJS_18_X,
      entry: join(
        this.lambdaRootPath,
        'update-workflow-info.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(3),
      logRetention: RetentionDays.ONE_WEEK,
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, 'UpdateWorkflowInfoRole', true, policyStatements),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        PIPELINE_S3_BUCKET_NAME: props.scanMetadataWorkflowData.pipelineS3Bucket,
        PIPELINE_S3_PREFIX: props.scanMetadataWorkflowData.pipelineS3Prefix,
        PROJECT_ID: props.projectId,
        METADATA_DDB_TABLE_ARN: props.scanMetadataWorkflowData.clickstreamAnalyticsMetadataDdbArn,
        ... POWERTOOLS_ENVS,
      },
    });
    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);
    bucket.grantPut(fn, `${props.scanMetadataWorkflowData.pipelineS3Prefix}*`);
    return fn;
  }

  private toRedshiftEnvVariables(props: ScanMetadataWorkflowProps) : {
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

  private checkScanMetadataStatusFn(props: ScanMetadataWorkflowProps): IFunction {
    const fnSG = props.securityGroupForLambda;

    const fn = new SolutionNodejsFunction(this, 'CheckScanMetadataStatusFn', {
      runtime: Runtime.NODEJS_18_X,
      entry: join(
        this.lambdaRootPath,
        'check-scan-metadata-status.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(2),
      logRetention: RetentionDays.ONE_WEEK,
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, 'CheckScanMetadataStatusRole', true, []),
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

  private storeMetadataIntoDDBFn(props: ScanMetadataWorkflowProps): IFunction {
    const fnSG = props.securityGroupForLambda;

    const policyStatements = [
      new PolicyStatement({
        actions: [
          'dynamodb:BatchWriteItem',
          'dynamodb:BatchGetItem',
          'dynamodb:GetItem',
          'dynamodb:Query',
          'dynamodb:PutItem',
        ],
        resources: [props.scanMetadataWorkflowData.clickstreamAnalyticsMetadataDdbArn],
      }),
    ];

    const fn = new SolutionNodejsFunction(this, 'StoreMetadataIntoDDBFn', {
      runtime: Runtime.NODEJS_18_X,
      entry: join(
        this.lambdaRootPath,
        'store-metadata-into-ddb.ts',
      ),
      handler: 'handler',
      memorySize: 1024,
      timeout: Duration.minutes(15),
      logRetention: RetentionDays.ONE_WEEK,
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, 'StoreMetadataIntoDDBRole', true, policyStatements),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        ... this.toRedshiftEnvVariables(props),
        REDSHIFT_DATA_API_ROLE: props.dataAPIRole.roleArn,
        METADATA_DDB_TABLE_ARN: props.scanMetadataWorkflowData.clickstreamAnalyticsMetadataDdbArn,
        ... POWERTOOLS_ENVS,
      },
    });
    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);
    return fn;
  }

}