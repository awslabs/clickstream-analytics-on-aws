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
import { Duration, Arn, Stack, ArnFormat, Token, CfnCondition, CfnResource, CustomResource, RemovalPolicy } from 'aws-cdk-lib';
import { ITable, Table, AttributeType, BillingMode, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { IVpc, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { Rule, Schedule, Match } from 'aws-cdk-lib/aws-events';
import { SfnStateMachine, LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { IRole, Role, ServicePrincipal, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { StateMachine, LogLevel, IStateMachine, TaskInput, Wait, WaitTime, Succeed, Fail, Choice, Map, Condition } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { getOrCreateNoWorkgroupIdCondition, getOrCreateWithWorkgroupIdCondition, getOrCreateNoNamespaceIdCondition, getOrCreateWithNamespaceIdCondition } from './condition';
import { DYNAMODB_TABLE_INDEX_NAME } from './constant';
import { ODSSource, ExistingRedshiftServerlessProps, ProvisionedRedshiftProps, LoadDataProps, LoadWorkflowData, AssociateIAMRoleToRedshift } from './model';
import { MetricsNamespace, REDSHIFT_MODE } from '../../common/constant';
import { createLambdaRole } from '../../common/lambda';
import { createLogGroup } from '../../common/logs';
import { getPutMericsPolicyStatements } from '../../common/metrics';
import { POWERTOOLS_ENVS } from '../../common/powertools';
import { createSGForEgressToAwsService } from '../../common/sg';

export interface LoadODSEventToRedshiftWorkflowProps {
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
}

export class LoadODSEventToRedshiftWorkflow extends Construct {
  private readonly lambdaRootPath = __dirname + '/../lambdas/load-data-workflow';

  public readonly crForModifyClusterIAMRoles: CustomResource;

  public readonly loadEventWorkflow: IStateMachine;

  constructor(scope: Construct, id: string, props: LoadODSEventToRedshiftWorkflowProps) {
    super(scope, id);

    const odsEventTable = this.odsEventTable();

    const processorLambda = this.createODSEventProcessorLambda(odsEventTable, props);

    odsEventTable.grantWriteData(processorLambda);
    // create a rule to store the ods source files
    const sourceTriggerRule = new Rule(this, 'ODSEventHandler', {
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

    // create IAM role for redshift to load data from S3
    const redshiftRoleForCopyFromS3 = new Role(this, 'CopyDataFromS3Role', {
      assumedBy: new ServicePrincipal('redshift.amazonaws.com'),
    });
    props.odsSource.s3Bucket.grantRead(redshiftRoleForCopyFromS3, `${props.odsSource.prefix}*`);
    props.loadWorkflowData.s3Bucket.grantRead(redshiftRoleForCopyFromS3, `${props.loadWorkflowData.prefix}*`);

    // custom resource to associate the IAM role to redshift cluster
    this.crForModifyClusterIAMRoles = this.createCustomResourceAssociateIAMRole(props, redshiftRoleForCopyFromS3);

    // create Step function workflow to orchestrate the workflow to load data from s3 to redshift
    this.loadEventWorkflow = this.createWorkflow(odsEventTable, props, redshiftRoleForCopyFromS3);

    // Create an EventBridge Rule to trigger the workflow periodically
    const rule = new Rule(scope, 'LoadScheduleRule', {
      schedule: Schedule.expression(props.loadDataProps.scheduleInterval),
    });
    rule.addTarget(new SfnStateMachine(this.loadEventWorkflow ));
  }

  private odsEventTable() : ITable {
    const itemsTable = new Table(this, 'ClickstreamODSEventSource', {
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
  private createODSEventProcessorLambda(taskTable: ITable, props: LoadODSEventToRedshiftWorkflowProps): IFunction {
    const fnSG = createSGForEgressToAwsService(this, 'ODSEventProcessorLambdaSg', props.networkConfig.vpc);

    const fn = new NodejsFunction(this, 'ODSEventProcessorFn', {
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
        ... POWERTOOLS_ENVS,
      },
    });

    return fn;
  }

  private createCustomResourceAssociateIAMRole(props: LoadODSEventToRedshiftWorkflowProps, copyRole: IRole): CustomResource {
    const fn = new NodejsFunction(this, 'AssociateIAMRoleToRedshiftFn', {
      runtime: Runtime.NODEJS_18_X,
      entry: join(
        __dirname + '/../lambdas/custom-resource',
        'redshift-associate-iam-role.ts',
      ),
      handler: 'handler',
      memorySize: 256,
      reservedConcurrentExecutions: 1,
      timeout: Duration.minutes(5),
      logRetention: RetentionDays.ONE_WEEK,
      role: createLambdaRole(this, 'AssociateIAMRoleFnRole', false, [
        new PolicyStatement({
          actions: [
            'iam:PassRole',
          ],
          resources: ['*'], // have to use wildcard for keeping existing associated roles
        }),
      ]),
      environment: {
        ... POWERTOOLS_ENVS,
      },
    });

    const provider = new Provider(
      this,
      'RedshiftAssociateIAMRoleCustomResourceProvider',
      {
        onEventHandler: fn,
        logRetention: RetentionDays.FIVE_DAYS,
      },
    );

    const customProps: AssociateIAMRoleToRedshift = {
      roleArn: copyRole.roleArn,
      serverlessRedshiftProps: props.serverlessRedshift,
      provisionedRedshiftProps: props.provisionedRedshift,
    };

    const cr = new CustomResource(this, 'RedshiftAssociateIAMRoleCustomResource', {
      serviceToken: provider.serviceToken,
      properties: customProps,
    });

    if (props.serverlessRedshift) {
      if (props.serverlessRedshift.workgroupId && Token.isUnresolved(props.serverlessRedshift.workgroupId) &&
        !props.serverlessRedshift.createdInStack) {
        const noWorkgroupIdCondition = getOrCreateNoWorkgroupIdCondition(this, props.serverlessRedshift.workgroupId);
        this.createRedshiftServerlessWorkgroupPolicy('RedshiftServerlessAllWorkgroupPolicy', '*',
          fn.role!, noWorkgroupIdCondition);

        const withWorkgroupIdCondition = getOrCreateWithWorkgroupIdCondition(this, props.serverlessRedshift.workgroupId);
        this.createRedshiftServerlessWorkgroupPolicy('RedshiftServerlessSingleWorkgroupPolicy', props.serverlessRedshift.workgroupId,
          fn.role!, withWorkgroupIdCondition);
      } else {
        cr.node.addDependency(this.createRedshiftServerlessWorkgroupPolicy('RedshiftServerlessWorkgroupPolicy',
          props.serverlessRedshift.workgroupId ?? '*', fn.role!));
      }
      if (props.serverlessRedshift.namespaceId && Token.isUnresolved(props.serverlessRedshift.namespaceId) &&
        !props.serverlessRedshift.createdInStack) {
        const noNamespaceIdCondition = getOrCreateNoNamespaceIdCondition(this, props.serverlessRedshift.namespaceId);
        this.createRedshiftServerlessNamespacePolicy('RedshiftServerlessAllNamespacePolicy', '*',
          fn.role!, noNamespaceIdCondition);

        const withNamespaceIdCondition = getOrCreateWithNamespaceIdCondition(this, props.serverlessRedshift.namespaceId);
        this.createRedshiftServerlessNamespacePolicy('RedshiftServerlessSingleNamespacePolicy', props.serverlessRedshift.namespaceId,
          fn.role!, withNamespaceIdCondition);
      } else {
        cr.node.addDependency(this.createRedshiftServerlessNamespacePolicy('RedshiftServerlessNamespacePolicy',
          props.serverlessRedshift.namespaceId ?? '*', fn.role!));
      }
    } else {
      cr.node.addDependency(new Policy(this, 'ProvisionedRedshiftIAMPolicy', {
        roles: [fn.role!],
        statements: [
          new PolicyStatement({
            actions: [
              'redshift:DescribeClusters',
            ],
            resources: [
              Arn.format({
                service: 'redshift',
                resource: '*',
              }, Stack.of(this)),
            ],
          }),
          new PolicyStatement({
            actions: [
              'redshift:ModifyClusterIamRoles',
            ],
            resources: [
              Arn.format({
                service: 'redshift',
                resource: 'cluster',
                resourceName: props.provisionedRedshift!.clusterIdentifier,
                arnFormat: ArnFormat.COLON_RESOURCE_NAME,
              }, Stack.of(this)),
            ],
          }),
        ],
      }));
    }
    return cr;
  }

  private createRedshiftServerlessWorkgroupPolicy(id: string, workgroupId: string, role: IRole, condition?: CfnCondition): Policy {
    const policy = new Policy(this, id, {
      roles: [role],
      statements: [
        new PolicyStatement({
          actions: [
            'redshift-serverless:GetWorkgroup',
          ],
          resources: [
            Arn.format({
              service: 'redshift-serverless',
              resource: 'workgroup',
              resourceName: workgroupId,
              arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
            }, Stack.of(this)),
          ],
        }),
      ],
    });
    if (condition) {(policy.node.findChild('Resource') as CfnResource).cfnOptions.condition = condition;}
    return policy;
  }

  private createRedshiftServerlessNamespacePolicy(id: string, namespaceId: string, role: IRole, condition?: CfnCondition): Policy {
    const policy = new Policy(this, id, {
      roles: [role],
      statements: [
        new PolicyStatement({
          actions: [
            'redshift-serverless:GetNamespace',
            'redshift-serverless:UpdateNamespace',
          ],
          resources: [
            Arn.format({
              service: 'redshift-serverless',
              resource: 'namespace',
              resourceName: namespaceId,
              arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
            }, Stack.of(this)),
          ],
        }),
      ],
    });
    if (condition) {(policy.node.findChild('Resource') as CfnResource).cfnOptions.condition = condition;}
    return policy;
  }

  private createWorkflow(odsEventTable: ITable, props: LoadODSEventToRedshiftWorkflowProps, copyRole: IRole): IStateMachine {
    const createLoadManifestFn = this.createLoadManifestFn(odsEventTable, props);
    const getJobList = new LambdaInvoke(this, `${this.node.id} - Create job manifest`, {
      lambdaFunction: createLoadManifestFn,
      payload: TaskInput.fromObject({
        'execution_id.$': '$$.Execution.Id',
      }),
      outputPath: '$.Payload',
    });

    const loadManifestToRedshiftFn = this.loadManifestToRedshiftFn(odsEventTable, props, copyRole);
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

    const createCheckLoadJobStatusFn = this.createCheckLoadJobStatusFn(odsEventTable, props);

    const checkJobStatus = new LambdaInvoke(this, `${this.node.id} - Check job status`, {
      lambdaFunction: createCheckLoadJobStatusFn,
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

    const jobFailed = new Fail(this, `${this.node.id} - Job fails`, {
      cause: 'LoadManifest Job Failed',
      error: 'DescribeJob returned FAILED',
    });

    const finalStatus = new Succeed(this, `${this.node.id} - Job completes`);

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

    const doNothing = new Succeed(this, `${this.node.id} - Do Nothing`);
    const checkJobExist = new Choice(this, `${this.node.id} - Check if job exists`)
      .when(Condition.isNotPresent('$.manifestList'), doNothing)
      .when(Condition.numberGreaterThan('$.count', 0), doLoadJob)
      .otherwise(doNothing);

    const definition = getJobList.next(checkJobExist);

    // Create state machine
    const loadDataStateMachine = new StateMachine(this, 'LoadManifestStateMachine', {
      definition,
      logs: {
        destination: createLogGroup(this,
          {
            prefix: '/aws/vendedlogs/states/Clickstream/LoadManifestStateMachine',
          },
        ),
        level: LogLevel.ALL,
      },
      tracingEnabled: true,
    });

    return loadDataStateMachine;
  }

  private createLoadManifestFn(odsEventTable: ITable, props: LoadODSEventToRedshiftWorkflowProps): IFunction {
    const fnSG = createSGForEgressToAwsService(this, 'CreateLoadManifestFnSG', props.networkConfig.vpc);
    const cloudwatchPolicyStatements = getPutMericsPolicyStatements(MetricsNamespace.REDSHIFT_ANALYTICS);
    const fn = new NodejsFunction(this, 'CreateLoadManifestFn', {
      runtime: Runtime.NODEJS_18_X,
      entry: join(
        this.lambdaRootPath,
        'create-load-manifest.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.minutes(3),
      logRetention: RetentionDays.ONE_WEEK,
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, 'CreateLoadManifestFnRole', true, [... cloudwatchPolicyStatements]),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        PROJECT_ID: props.projectId,
        MANIFEST_BUCKET: props.loadWorkflowData.s3Bucket.bucketName,
        MANIFEST_BUCKET_PREFIX: props.loadWorkflowData.prefix,
        ODS_EVENT_BUCKET: props.odsSource.s3Bucket.bucketName,
        ODS_EVENT_BUCKET_PREFIX: props.odsSource.prefix,
        QUERY_RESULT_LIMIT: props.loadDataProps.maxFilesLimit.toString(),
        PROCESSING_LIMIT: props.loadDataProps.processingFilesLimit.toString(),
        DYNAMODB_TABLE_NAME: odsEventTable.tableName,
        DYNAMODB_TABLE_INDEX_NAME: DYNAMODB_TABLE_INDEX_NAME,
        ... POWERTOOLS_ENVS,
      },
    });

    // Update the job_status from NEW to ENQUEUE.
    odsEventTable.grantReadWriteData(fn);
    props.loadWorkflowData.s3Bucket.grantWrite(fn, `${props.loadWorkflowData.prefix}*`);

    return fn;
  }

  private loadManifestToRedshiftFn(odsEventTable: ITable, props: LoadODSEventToRedshiftWorkflowProps, copyRole: IRole): IFunction {
    const fnSG = createSGForEgressToAwsService(this, 'LoadManifestToRedshiftFnSG', props.networkConfig.vpc);
    const cloudwatchPolicyStatements = getPutMericsPolicyStatements(MetricsNamespace.REDSHIFT_ANALYTICS);
    const fn = new NodejsFunction(this, 'LoadManifestToRedshiftFn', {
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
      role: createLambdaRole(this, 'LoadManifestToRedshiftRole', true, [... cloudwatchPolicyStatements]),
      ...props.networkConfig,
      securityGroups: [fnSG],
      environment: {
        PROJECT_ID: props.projectId,
        QUERY_RESULT_LIMIT: props.loadDataProps.maxFilesLimit.toString(),
        PROCESSING_LIMIT: props.loadDataProps.processingFilesLimit.toString(),
        DYNAMODB_TABLE_NAME: odsEventTable.tableName,
        ... this.toRedshiftEnvVariables(props),
        REDSHIFT_ROLE: copyRole.roleArn,
        REDSHIFT_DATA_API_ROLE: props.dataAPIRole.roleArn,
        ... POWERTOOLS_ENVS,
      },
    });
    // Update the job_status from ENQUEUE to PROCESSING.
    odsEventTable.grantReadWriteData(fn);
    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);
    return fn;
  }

  private toRedshiftEnvVariables(props: LoadODSEventToRedshiftWorkflowProps) : {
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

  private createCheckLoadJobStatusFn(odsEventTable: ITable, props: LoadODSEventToRedshiftWorkflowProps): IFunction {
    const fnSG = createSGForEgressToAwsService(this, 'CheckLoadJobStatusFnSG', props.networkConfig.vpc);

    const fn = new NodejsFunction(this, 'CheckLoadJobStatusFn', {
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
        DYNAMODB_TABLE_NAME: odsEventTable.tableName,
        ... this.toRedshiftEnvVariables(props),
        REDSHIFT_DATA_API_ROLE: props.dataAPIRole.roleArn,
        ... POWERTOOLS_ENVS,
      },
    });

    odsEventTable.grantWriteData(fn);
    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);
    props.loadWorkflowData.s3Bucket.grantDelete(fn, `${props.loadWorkflowData.prefix}*`);

    return fn;
  }
}