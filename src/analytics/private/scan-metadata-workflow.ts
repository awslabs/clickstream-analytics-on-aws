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
import { IVpc, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { SfnStateMachine } from 'aws-cdk-lib/aws-events-targets';
import { IRole, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { StateMachine, LogLevel, IStateMachine, TaskInput, Wait, WaitTime, Succeed, Fail, Choice, Map, Condition, Pass, DefinitionBody } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { ExistingRedshiftServerlessCustomProps, ProvisionedRedshiftProps, ScanMetadataWorkflowData } from './model';
import { createLambdaRole } from '../../common/lambda';
import { createLogGroup } from '../../common/logs';
import { REDSHIFT_MODE } from '../../common/model';
import { POWERTOOLS_ENVS } from '../../common/powertools';
import { createSGForEgressToAwsService } from '../../common/sg';
import { SolutionNodejsFunction } from '../../private/function';

export interface ScanMetadataWorkflowProps {
  readonly appIds: string;
  readonly networkConfig: {
    readonly vpc: IVpc;
    readonly vpcSubnets: SubnetSelection;
  };
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

    // create Step function workflow to orchestrate the workflow to scan metadata.
    this.scanMetadataWorkflow = this.createWorkflow(props);

    // Create an EventBridge Rule to trigger the workflow periodically
    const rule = new Rule(scope, 'ScanMetadataScheduleRule', {
      // schedule: Schedule.expression('cron(0 1 * * ? *)'),
      schedule: Schedule.expression(props.scanMetadataWorkflowData.scheduleExpression),
    });
    rule.addTarget(new SfnStateMachine(this.scanMetadataWorkflow));
  }

  private createWorkflow(props: ScanMetadataWorkflowProps): IStateMachine {
    const getJobList = new Pass(this, `${this.node.id} - Get app_id`, {
      parameters: {
        Payload: {
          'appIdList.$': `States.StringSplit('${props.appIds}', ',')`,
        },
      },
      outputPath: '$.Payload',
    });

    const scanMetadataFn = this.scanMetadataFn(props);
    const scanMetadataJob = new LambdaInvoke(this, `${this.node.id} - Submit scan metadata job`, {
      lambdaFunction: scanMetadataFn,
      payload: TaskInput.fromObject({
        detail: {
          'appId.$': '$',
        },
      }),
      outputPath: '$.Payload',
    });

    const checkScanMetadataStatusFn = this.checkScanMetadataStatusFn(props);
    const checkScanMetadataStatusJob = new LambdaInvoke(this, `${this.node.id} - Check scan metadata job status`, {
      lambdaFunction: checkScanMetadataStatusFn,
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

    const scanMetadataJobFailed = new Fail(this, `${this.node.id} - scan metadata job fails`, {
      cause: 'ScanMetadata Job Failed',
      error: 'DescribeJob returned FAILED',
    });

    const scanMetadataCompleted = new Succeed(this, `${this.node.id} - scan metadata job completes`);

    const storeMetadataIntoDDBFn = this.storeMetadataIntoDDBFn(props);
    const storeMetadataIntoDDBJob = new LambdaInvoke(this, `${this.node.id} - store scan metadata job status`, {
      lambdaFunction: storeMetadataIntoDDBFn,
      payload: TaskInput.fromObject({
        'detail.$': '$.detail',
      }),
      outputPath: '$.Payload',
    }).next(
      new Choice(this, 'Check if store metadata completed')
        .when(Condition.stringEquals('$.detail.status', 'SUCCEED'), scanMetadataCompleted)
        .otherwise(scanMetadataJobFailed),
    );

    // Create sub chain
    const subDefinition = scanMetadataJob
      .next(waitX)
      .next(checkScanMetadataStatusJob)
      .next(
        new Choice(this, `${this.node.id} - Check if scan metadata job completes`)
          .when(Condition.stringEquals('$.detail.status', 'FAILED'), scanMetadataJobFailed)
          .when(Condition.stringEquals('$.detail.status', 'ABORTED'), scanMetadataJobFailed)
          .when(Condition.stringEquals('$.detail.status', 'FINISHED'), storeMetadataIntoDDBJob)
          .when(Condition.stringEquals('$.detail.status', 'NO_JOBS'), scanMetadataCompleted)
          .otherwise(waitX));

    const doScanMetadataJob = new Map(
      this,
      `${this.node.id} - Do scanMetadata job`,
      {
        maxConcurrency: 1,
        itemsPath: '$.appIdList',
      },
    );
    doScanMetadataJob.iterator(subDefinition);

    const doNothing = new Succeed(this, `${this.node.id} - Do Nothing`);
    const checkJobExist = new Choice(this, `${this.node.id} - Check if job exists`)
      .when(Condition.isNotPresent('$.appIdList'), doNothing)
      .when(Condition.isPresent('$.appIdList'), doScanMetadataJob)
      .otherwise(doNothing);

    const definition = getJobList.next(checkJobExist);

    // Create state machine
    const scanMetadataStateMachine = new StateMachine(this, 'ScanMetadataStateMachine', {
      definitionBody: DefinitionBody.fromChainable(definition),
      logs: {
        destination: createLogGroup(this,
          {
            prefix: '/aws/vendedlogs/states/Clickstream/ScanMetadataStateMachine',
          },
        ),
        level: LogLevel.ALL,
      },
      tracingEnabled: true,
    });

    return scanMetadataStateMachine;
  }

  private scanMetadataFn(props: ScanMetadataWorkflowProps): IFunction {
    const fnSG = createSGForEgressToAwsService(this, 'ScanMetadataFnSG', props.networkConfig.vpc);

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
        DAY_RANGE: '1',
        ... POWERTOOLS_ENVS,
      },
    });
    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);
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
    const fnSG = createSGForEgressToAwsService(this, 'CheckScanMetadataStatusFnSG', props.networkConfig.vpc);

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
    const fnSG = createSGForEgressToAwsService(this, 'StoreMetadataIntoDDBFnSG', props.networkConfig.vpc);

    const policyStatements = [
      new PolicyStatement({
        actions: [
          'dynamodb:BatchWriteItem',
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
      timeout: Duration.minutes(13),
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