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

import { aws_lambda as lambda, Fn, Stack } from 'aws-cdk-lib';
import { IVpc, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';
import { GlueUtil } from './utils/utils-glue';
import { LambdaUtil } from './utils/utils-lambda';
import { RoleUtil } from './utils/utils-role';
import { getShortIdOfStack } from '../common/stack';

export interface DataPipelineProps {
  readonly vpc: IVpc;
  readonly vpcSubnets: SubnetSelection;
  readonly projectId: string;
  readonly appIds: string;
  readonly sourceS3Bucket: string;
  readonly sourceS3Prefix: string;
  readonly sinkS3Bucket: string;
  readonly sinkS3Prefix: string;
}

export class DataPipelineConstruct extends Construct {
  private readonly props: DataPipelineProps;
  private readonly roleUtil: RoleUtil;
  private readonly lambdaUtil: LambdaUtil;
  private readonly glueUtil: GlueUtil;

  constructor(scope: Construct, id: string, props: DataPipelineProps) {
    super(scope, id);

    this.props = props;
    this.roleUtil = RoleUtil.newInstance(scope);
    this.glueUtil = GlueUtil.newInstance(scope, {
      sourceS3Bucket: this.props.sourceS3Bucket,
      sourceS3Prefix: this.props.sourceS3Prefix,
      sinkS3Bucket: this.props.sinkS3Bucket,
      sinkS3Prefix: this.props.sinkS3Prefix,
    });
    this.lambdaUtil = LambdaUtil.newInstance(scope, {
      vpc: this.props.vpc,
      vpcSubnets: this.props.vpcSubnets,
      projectId: this.props.projectId,
      sourceS3Bucket: this.props.sourceS3Bucket,
      sourceS3Prefix: this.props.sourceS3Prefix,
      sinkS3Bucket: this.props.sinkS3Bucket,
      sinkS3Prefix: this.props.sinkS3Prefix,
      appIds: this.props.appIds,
    }, this.roleUtil);

    this.createGlueResources(this.props.projectId);
  }

  private createGlueResources(projectId: string) {
    const stackShortId = getShortIdOfStack(Stack.of(this));
    //If you plan to access the table from Amazon Athena,
    // then the name should be under 256 characters and contain only lowercase letters (a-z), numbers (0-9), and underscore (_).
    const glueDatabase = this.glueUtil.createDatabase(Fn.join('_', ['clickstream', projectId, stackShortId]));
    const sourceTable = this.glueUtil.createSourceTable(glueDatabase, Fn.join('_', [projectId, 'source']));
    const sinkTable = this.glueUtil.createSinkTable(glueDatabase, Fn.join('_', [projectId, 'sink']));

    const partitionSyncerLambda = this.lambdaUtil.createPartitionSyncerLambda(glueDatabase.databaseName, sourceTable.tableName, sinkTable.tableName);
    this.scheduleLambda('partitionSyncerScheduler', partitionSyncerLambda, 'cron(0 0 * * ? *)');
  }

  private scheduleLambda(id: string, lambdaFunction: lambda.Function, scheduleExpression: string) {
    new Rule(this, id, {
      schedule: Schedule.expression(scheduleExpression),
      targets: [new LambdaFunction(lambdaFunction)],
    });
  }
}


