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

import { Database, Table } from '@aws-cdk/aws-glue-alpha';
import { aws_lambda as lambda, Fn, Stack } from 'aws-cdk-lib';
import { IVpc, SecurityGroup, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { CfnApplication } from 'aws-cdk-lib/aws-emrserverless';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { createCopyAssetsCustomResource, createInitPartitionCustomResource } from './utils/custom-resource';
import { GlueUtil } from './utils/utils-glue';
import { LambdaUtil } from './utils/utils-lambda';
import { RoleUtil } from './utils/utils-role';
import { addCfnNagToSecurityGroup } from '../common/cfn-nag';
import { getShortIdOfStack } from '../common/stack';

const EMR_VERSION = 'emr-6.9.0';

export interface DataPipelineProps {
  readonly vpc: IVpc;
  readonly vpcSubnets: SubnetSelection;
  readonly projectId: string;
  readonly appIds: string;
  readonly sourceS3Bucket: IBucket;
  readonly sourceS3Prefix: string;
  readonly sinkS3Bucket: IBucket;
  readonly sinkS3Prefix: string;
  readonly pipelineS3Bucket: IBucket;
  readonly pipelineS3Prefix: string;
  readonly dataFreshnessInHour: string;
  readonly transformerAndEnrichClassNames: string;
  readonly s3PathPluginJars: string;
  readonly s3PathPluginFiles: string;
  readonly entryPointJar: string;
  readonly scheduleExpression: string;
}

export class DataPipelineConstruct extends Construct {
  private readonly props: DataPipelineProps;
  private readonly roleUtil: RoleUtil;
  private readonly lambdaUtil: LambdaUtil;
  private readonly glueUtil: GlueUtil;

  constructor(scope: Construct, id: string, props: DataPipelineProps) {
    super(scope, id);
    this.props = props;

    // Custom resource - copies ETL jars and files to pipelineS3Bucket
    const copiedAsset = createCopyAssetsCustomResource(scope, {
      pipelineS3Bucket: props.pipelineS3Bucket,
      pipelineS3Prefix: props.pipelineS3Prefix,
      projectId: props.projectId,
      s3PathPluginJars: props.s3PathPluginJars,
      s3PathPluginFiles: props.s3PathPluginFiles,
      entryPointJar: props.entryPointJar,
    });

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
      pipelineS3Bucket: this.props.pipelineS3Bucket,
      pipelineS3Prefix: this.props.pipelineS3Prefix,
      sourceS3Bucket: this.props.sourceS3Bucket,
      sourceS3Prefix: this.props.sourceS3Prefix,
      sinkS3Bucket: this.props.sinkS3Bucket,
      sinkS3Prefix: this.props.sinkS3Prefix,
      appIds: this.props.appIds,
      dataFreshnessInHour: this.props.dataFreshnessInHour,
      transformerAndEnrichClassNames: this.props.transformerAndEnrichClassNames,
      scheduleExpression: this.props.scheduleExpression,

      entryPointJar: copiedAsset.getAttString('entryPointJar'),
      s3PathPluginJars: copiedAsset.getAttString('s3PathPluginJars'),
      s3PathPluginFiles: copiedAsset.getAttString('s3PathPluginFiles'),

    }, this.roleUtil);

    const emrServerlessApp = this.createEmrServerlessApplication();
    const { glueDatabase, sourceTable, sinkTable } = this.createGlueResources(this.props.projectId);
    this.createSparkJobSubmitter(glueDatabase, sourceTable, sinkTable, emrServerlessApp.attrApplicationId);
  }

  private createGlueResources(projectId: string) {
    const stackShortId = getShortIdOfStack(Stack.of(this));
    //If you plan to access the table from Amazon Athena,
    //then the name should be under 256 characters and contain only lowercase letters (a-z), numbers (0-9), and underscore (_).
    const glueDatabase = this.glueUtil.createDatabase(Fn.join('_', ['clickstream', projectId, stackShortId]));
    const sourceTable = this.glueUtil.createSourceTable(glueDatabase, Fn.join('_', [projectId, 'source']));
    const sinkTable = this.glueUtil.createSinkTable(glueDatabase, projectId, Fn.join('_', [projectId, 'sink']));

    const partitionSyncerLambda = this.lambdaUtil.createPartitionSyncerLambda(glueDatabase.databaseName,
      sourceTable.tableName, sinkTable.tableName);
    this.scheduleLambda('partitionSyncerScheduler', partitionSyncerLambda, 'cron(0 0 * * ? *)');

    createInitPartitionCustomResource(this, partitionSyncerLambda);
    return { glueDatabase, sourceTable, sinkTable };
  }

  private scheduleLambda(id: string, lambdaFunction: lambda.Function, scheduleExpression: string) {
    new Rule(this, id, {
      schedule: Schedule.expression(scheduleExpression),
      targets: [new LambdaFunction(lambdaFunction)],
    });
  }

  private createSparkJobSubmitter(glueDatabase: Database, sourceTable: Table, sinkTable: Table, emrApplicationId: string) {
    const jobSubmitterLambda = this.lambdaUtil.createEmrJobSubmitterLambda(glueDatabase, sourceTable, sinkTable, emrApplicationId);
    new Rule(this, 'jobSubmitterScheduler', {
      schedule: Schedule.expression(this.props.scheduleExpression),
      targets: [new LambdaFunction(jobSubmitterLambda)],
    });
  }

  private createEmrServerlessApplication() {
    const emrSg = new SecurityGroup(this, 'emrAppSecurityGroup', {
      description: 'Security group for EMR application',
      vpc: this.props.vpc,
      allowAllOutbound: true,
    });
    addCfnNagToSecurityGroup(emrSg, ['W40', 'W5']);

    const serverlessApp = new CfnApplication(this, 'ClickStream-ETL-APP', {
      name: `ClickStream-Spark-ETL-APP-${this.props.projectId}`,
      releaseLabel: EMR_VERSION,
      type: 'SPARK',
      networkConfiguration: {
        subnetIds: this.props.vpcSubnets.subnets?.map(s => s.subnetId),
        securityGroupIds: [emrSg.securityGroupId],
      },
      autoStartConfiguration: {
        enabled: true,
      },
      autoStopConfiguration: {
        enabled: true,
        idleTimeoutMinutes: 5,
      },
    });

    return serverlessApp;
  }
}


