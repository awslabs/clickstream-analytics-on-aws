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
import {
  InitPartitionCustomResourceProps,
  createCopyAssetsCustomResource,
  createInitPartitionCustomResource,
} from './utils/custom-resource';
import { uploadBuiltInSparkJarsAndFiles } from './utils/s3-asset';
import { GlueUtil } from './utils/utils-glue';
import { LambdaUtil } from './utils/utils-lambda';
import { RoleUtil } from './utils/utils-role';
import { addCfnNagToSecurityGroup } from '../common/cfn-nag';
import { TABLE_NAME_INGESTION, TABLE_NAME_ODS_EVENT } from '../common/constant';
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
  readonly s3PathPluginJars?: string;
  readonly s3PathPluginFiles?: string;
  readonly scheduleExpression: string;
  readonly outputFormat: 'json'|'parquet';
}

export class DataPipelineConstruct extends Construct {
  private readonly props: DataPipelineProps;
  private readonly roleUtil: RoleUtil;
  private readonly lambdaUtil: LambdaUtil;
  private readonly glueUtil: GlueUtil;

  constructor(scope: Construct, id: string, props: DataPipelineProps) {
    super(scope, id);
    this.props = props;

    const pluginPrefix = Fn.join('', [this.props.pipelineS3Prefix, Fn.join('/', [
      'plugins',
      getShortIdOfStack(Stack.of(scope)),
      this.props.projectId,
      'built-in',
    ])]);

    const {
      entryPointJar,
      jars: builtInJars,
      files: builtInFiles,
    } = uploadBuiltInSparkJarsAndFiles(
      scope,
      this.props.pipelineS3Bucket,
      pluginPrefix,
    );

    const s3PathPluginJars = [builtInJars];
    const s3PathPluginFiles = [builtInFiles];

    if (props.s3PathPluginJars) {
      // Custom resource - copies ETL jars and files to pipelineS3Bucket
      const copiedAsset = createCopyAssetsCustomResource(scope, {
        pipelineS3Bucket: props.pipelineS3Bucket,
        pipelineS3Prefix: props.pipelineS3Prefix,
        projectId: props.projectId,
        s3PathPluginJars: props.s3PathPluginJars,
        s3PathPluginFiles: props.s3PathPluginFiles,
      });
      s3PathPluginJars.push(copiedAsset.getAttString('s3PathPluginJars'));
      s3PathPluginFiles.push(copiedAsset.getAttString('s3PathPluginFiles'));
    }

    this.roleUtil = RoleUtil.newInstance(scope);
    this.glueUtil = GlueUtil.newInstance(scope, {
      sourceS3Bucket: this.props.sourceS3Bucket,
      sourceS3Prefix: this.props.sourceS3Prefix,
      sinkS3Bucket: this.props.sinkS3Bucket,
      sinkS3Prefix: this.props.sinkS3Prefix,
    });

    this.lambdaUtil = LambdaUtil.newInstance(
      scope,
      {
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
        transformerAndEnrichClassNames:
          this.props.transformerAndEnrichClassNames,
        scheduleExpression: this.props.scheduleExpression,
        entryPointJar: entryPointJar,
        s3PathPluginJars: Fn.join(',', s3PathPluginJars),
        s3PathPluginFiles: Fn.join(',', s3PathPluginFiles),
        outputFormat: this.props.outputFormat,
      },
      this.roleUtil,
    );

    const emrServerlessApp = this.createEmrServerlessApplication();
    const { glueDatabase, sourceTable, sinkTable } = this.createGlueResources(
      this.props,
    );
    this.createSparkJobSubmitter(
      glueDatabase,
      sourceTable,
      sinkTable,
      emrServerlessApp.attrApplicationId,
    );

    this.createEmrServerlessJobStateEventListener(emrServerlessApp.attrApplicationId);
  }

  private createGlueResources(props: DataPipelineProps) {
    const databaseName = props.projectId;
    const glueDatabase = this.glueUtil.createDatabase(databaseName);
    const sourceTable = this.glueUtil.createSourceTable(
      glueDatabase,
      TABLE_NAME_INGESTION,
    );
    const sinkTable = this.glueUtil.createSinkTable(
      glueDatabase,
      props.projectId,
      TABLE_NAME_ODS_EVENT,
    );

    const partitionSyncerLambda = this.lambdaUtil.createPartitionSyncerLambda(
      glueDatabase.databaseName,
      sourceTable.tableName,
      sinkTable.tableName,
    );
    this.scheduleLambda(
      'partitionSyncerScheduler',
      partitionSyncerLambda,
      'cron(0 0 * * ? *)',
    );

    const initPartitionCustomResourceProps: InitPartitionCustomResourceProps = {
      sourceS3BucketName: props.sourceS3Bucket.bucketName,
      sourceS3Prefix: props.sourceS3Prefix,
      sinkS3BucketName: props.sinkS3Bucket.bucketName,
      sinkS3Prefix: props.sinkS3Prefix,
      pipelineS3BucketName: props.pipelineS3Bucket.bucketName,
      pipelineS3Prefix: props.pipelineS3Prefix,
      projectId: props.projectId,
      appIds: props.appIds,
      databaseName: glueDatabase.databaseName,
      sourceTableName: sourceTable.tableName,
      sinkTableName: sinkTable.tableName,
    };

    createInitPartitionCustomResource(this, partitionSyncerLambda, initPartitionCustomResourceProps);
    return { glueDatabase, sourceTable, sinkTable };
  }

  private scheduleLambda(
    id: string,
    lambdaFunction: lambda.Function,
    scheduleExpression: string,
  ) {
    new Rule(this, id, {
      schedule: Schedule.expression(scheduleExpression),
      targets: [new LambdaFunction(lambdaFunction)],
    });
  }

  private createSparkJobSubmitter(
    glueDatabase: Database,
    sourceTable: Table,
    sinkTable: Table,
    emrApplicationId: string,
  ) {
    const jobSubmitterLambda = this.lambdaUtil.createEmrJobSubmitterLambda(
      glueDatabase,
      sourceTable,
      sinkTable,
      emrApplicationId,
    );
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
        subnetIds: this.props.vpcSubnets.subnets?.map((s) => s.subnetId),
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

  private createEmrServerlessJobStateEventListener(applicationId: string) {
    const emrJobStateListenerLambda = this.lambdaUtil.createEmrJobStateListenerLambda(
      applicationId,
    );
    new Rule(this, 'EmrServerlessJobStateEventRule', {
      eventPattern: {
        source: ['aws.emr-serverless'],
        detailType: ['EMR Serverless Job Run State Change'],
      },
      targets: [new LambdaFunction(emrJobStateListenerLambda)],
    });
  }
}
