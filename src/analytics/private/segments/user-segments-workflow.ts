/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the 'License'). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

import { join } from 'path';
import { Aws, Duration } from 'aws-cdk-lib';
import { ISecurityGroup, IVpc, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { IRole, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import {
  Choice,
  Condition,
  Fail,
  IStateMachine,
  LogLevel,
  StateMachine,
  Succeed,
  TaskInput,
  Wait,
  WaitTime,
} from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { SegmentJobStatus } from './segments-model';
import { createLambdaRole } from '../../../common/lambda';
import { createLogGroup } from '../../../common/logs';
import { REDSHIFT_MODE } from '../../../common/model';
import { SolutionNodejsFunction } from '../../../private/function';
import { ExistingRedshiftServerlessProps, ProvisionedRedshiftProps } from '../model';

export interface UserSegmentsWorkflowProps {
  readonly projectId: string;
  readonly networkConfig: {
    readonly vpc: IVpc;
    readonly vpcSubnets: SubnetSelection;
  };
  readonly securityGroupForLambda: ISecurityGroup;
  readonly clickstreamMetadataDdbArn: string;
  readonly dataAPIRole: IRole;
  readonly serverlessRedshift?: ExistingRedshiftServerlessProps;
  readonly provisionedRedshift?: ProvisionedRedshiftProps;
  readonly databaseName: string;
  readonly pipelineS3Bucket: string;
  readonly segmentsS3Prefix: string;
}

const lambdaRootPath = __dirname + '/../../lambdas/user-segments-workflow';

export class UserSegmentsWorkflow extends Construct {
  private readonly props: UserSegmentsWorkflowProps;
  public readonly userSegmentsWorkflow: IStateMachine;

  constructor(scope: Construct, id: string, props: UserSegmentsWorkflowProps) {
    super(scope, id);

    this.props = props;
    this.userSegmentsWorkflow = this.createWorkflow(props);
  }

  private createWorkflow(props: UserSegmentsWorkflowProps): IStateMachine {
    // Define task for segment job initialization
    const segmentJobInitTask = new LambdaInvoke(this, 'WorkflowTask-SegmentJobInit', {
      lambdaFunction: this.constructNodejsFunction('segment-job-init', [
        new PolicyStatement({
          actions: [
            'dynamodb:GetItem',
            'dynamodb:PutItem',
          ],
          resources: [props.clickstreamMetadataDdbArn],
        }),
        new PolicyStatement({
          actions: ['events:DisableRule'],
          resources: [`arn:${Aws.PARTITION}:events:*:${Aws.ACCOUNT_ID}:rule/*`],
        }),
      ], {
        CLICKSTREAM_METADATA_DDB_ARN: props.clickstreamMetadataDdbArn,
      }),
      outputPath: '$.Payload',
    });

    // Define task for checking state machine status
    const stateMachineStatusTask = new LambdaInvoke(this, 'WorkflowTask-StateMachineStatus', {
      lambdaFunction: this.constructNodejsFunction('state-machine-status', [
        new PolicyStatement({
          actions: ['states:ListExecutions'],
          resources: [`arn:${Aws.PARTITION}:states:*:${Aws.ACCOUNT_ID}:stateMachine:*`],
        }),
      ]),
      payload: TaskInput.fromObject({
        'stateMachineArn.$': '$$.StateMachine.Id',
        'input.$': '$',
      }),
      outputPath: '$.Payload',
    });

    // Define task for segment query execution
    const executeSegmentQueryFunc = this.constructNodejsFunction('execute-segment-query', [
      new PolicyStatement({
        actions: [
          'dynamodb:GetItem',
          'dynamodb:UpdateItem',
        ],
        resources: [props.clickstreamMetadataDdbArn],
      }),
    ], {
      REDSHIFT_MODE: props.serverlessRedshift ? REDSHIFT_MODE.SERVERLESS : REDSHIFT_MODE.PROVISIONED,
      REDSHIFT_SERVERLESS_WORKGROUP_NAME: props.serverlessRedshift?.workgroupName ?? '',
      REDSHIFT_CLUSTER_IDENTIFIER: props.provisionedRedshift?.clusterIdentifier ?? '',
      REDSHIFT_DATABASE: props.databaseName,
      REDSHIFT_DB_USER: props.provisionedRedshift?.dbUser ?? '',
      REDSHIFT_DATA_API_ROLE: props.dataAPIRole.roleArn,
      CLICKSTREAM_METADATA_DDB_ARN: props.clickstreamMetadataDdbArn,
    });
    const executeSegmentQueryTask = new LambdaInvoke(this, 'WorkflowTask-ExecuteSegmentQuery', {
      lambdaFunction: executeSegmentQueryFunc,
      outputPath: '$.Payload',
    });
    props.dataAPIRole.grantAssumeRole(executeSegmentQueryFunc.grantPrincipal);

    // Define task for checking segment job status
    const segmentJobStatusFunc = this.constructNodejsFunction('segment-job-status', [
      new PolicyStatement({
        actions: ['dynamodb:UpdateItem'],
        resources: [props.clickstreamMetadataDdbArn],
      }),
    ], {
      REDSHIFT_DATA_API_ROLE: props.dataAPIRole.roleArn,
      CLICKSTREAM_METADATA_DDB_ARN: props.clickstreamMetadataDdbArn,
      SEGMENTS_S3_PREFIX: props.segmentsS3Prefix,
    });
    const segmentJobStatusTask = new LambdaInvoke(this, 'WorkflowTask-SegmentJobStatus', {
      lambdaFunction: segmentJobStatusFunc,
      outputPath: '$.Payload',
    });
    props.dataAPIRole.grantAssumeRole(segmentJobStatusFunc.grantPrincipal);
    Bucket.fromBucketName(this, 'PipelineS3Bucket', props.pipelineS3Bucket).grantRead(segmentJobStatusFunc, `${props.segmentsS3Prefix}*`);

    // Define Succeed and Fail end state
    const succeedState = new Succeed(this, 'WorkflowEndState-Succeed');
    const failState = new Fail(this, 'WorkflowEndState-Fail');

    // Define choice state for workflow initialization
    // If refresh schedule has expired, go to end state
    const segmentJobInitChoice = new Choice(this, 'WorkflowChoice-SegmentJobInit')
      .when(Condition.booleanEquals('$.scheduleIsExpired', true), succeedState)
      .otherwise(stateMachineStatusTask);

    // Connect segment job init task to the choice
    segmentJobInitTask.next(segmentJobInitChoice);

    // Define choice state for checking state machine status
    // If state machine is idle, execute segment query. Otherwise, wait for 1 min and check again
    const stateMachineStatusChoice = new Choice(this, 'WorkflowChoice-StateMachineStatus')
      .when(Condition.stringEquals('$.stateMachineStatus', 'IDLE'), executeSegmentQueryTask)
      .otherwise(new Wait(this, 'WorkflowWait-StateMachineStatus', {
        time: WaitTime.duration(Duration.minutes(1)),
      }).next(stateMachineStatusTask));

    // Connect checking state machine status task to the choice
    stateMachineStatusTask.next(stateMachineStatusChoice);

    // Connect segment query execution task to checking job status task
    executeSegmentQueryTask.next(segmentJobStatusTask);

    // Define choice state for checking job status
    const jobStatusChoice = new Choice(this, 'WorkflowChoice-SegmentJobStatus')
      .when(Condition.stringEquals('$.jobStatus', SegmentJobStatus.COMPLETED), succeedState)
      .when(Condition.stringEquals('$.jobStatus', SegmentJobStatus.FAILED), failState)
      .otherwise(new Wait(this, 'WorkflowWait-CheckJobStatus', {
        time: WaitTime.duration(Duration.seconds(15)),
      }).next(segmentJobStatusTask));

    // Connect checking job status task to the choice
    segmentJobStatusTask.next(jobStatusChoice);

    return new StateMachine(this, 'UserSegmentsStateMachine', {
      definition: segmentJobInitTask,
      logs: {
        destination: createLogGroup(this, {
          prefix: '/aws/vendedlogs/states/Clickstream/UserSegmentsStateMachine',
        }),
        level: LogLevel.ALL,
      },
      tracingEnabled: true,
      comment: 'This state machine is responsible for creating and refreshing user segments.',
    });
  }

  private constructNodejsFunction(name: string, policyStatements: PolicyStatement[], env: any = {}): IFunction {
    return new SolutionNodejsFunction(this, `WorkflowLambda-${name}`, {
      entry: join(lambdaRootPath, `${name}.ts`),
      handler: 'handler',
      memorySize: 1024,
      timeout: Duration.minutes(15),
      logConf: {
        retention: RetentionDays.ONE_WEEK,
      },
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, `WorkflowLambdaRole-${name}`, true, policyStatements),
      ...this.props.networkConfig,
      securityGroups: [this.props.securityGroupForLambda],
      environment: env,
      applicationLogLevel: 'WARN',
    });
  }
}
