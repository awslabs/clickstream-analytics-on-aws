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
import { Database, Table } from '@aws-cdk/aws-glue-alpha';
import { Duration, Stack, CfnResource } from 'aws-cdk-lib';

import { ISecurityGroup, IVpc, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { Tracing, Function } from 'aws-cdk-lib/aws-lambda';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

import { RoleUtil } from './utils-role';

import { addCfnNagSuppressRules } from '../../common/cfn-nag';
import { attachListTagsPolicyForFunction } from '../../common/lambda/tags';
import { getShortIdOfStack } from '../../common/stack';
import { SolutionNodejsFunction } from '../../private/function';
import { ClickstreamSinkTables } from '../data-pipeline';

interface Props {
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
  readonly dataBufferedSeconds: string;
  readonly transformerAndEnrichClassNames: string;
  readonly s3PathPluginJars: string;
  readonly s3PathPluginFiles: string;
  readonly entryPointJar: string;
  readonly scheduleExpression: string;
  readonly outputFormat: 'json' | 'parquet';
  readonly userKeepDays: number;
  readonly itemKeepDays: number;
}

const functionSettings = {
  handler: 'handler',
  timeout: Duration.minutes(15),
  tracing: Tracing.ACTIVE,
};

export class LambdaUtil {
  public static newInstance(
    scope: Construct,
    props: Props,
    roleUtil: RoleUtil,
  ) {
    return new this(scope, props, roleUtil);
  }

  private readonly props: Props;
  private readonly scope: Construct;
  private readonly roleUtil: RoleUtil;

  private constructor(scope: Construct, props: Props, roleUtil: RoleUtil) {
    this.props = props;
    this.scope = scope;
    this.roleUtil = roleUtil;
  }
  public createPartitionSyncerLambda(
    databaseName: string,
    sourceTableName: string,
    sinkTables: ClickstreamSinkTables,
    securityGroupForLambda: ISecurityGroup,
  ): Function {
    const lambdaRole = this.roleUtil.createPartitionSyncerRole(
      'partitionSyncerLambdaRole',
      databaseName,
      sourceTableName,
      sinkTables,
    );
    this.props.sinkS3Bucket.grantReadWrite(lambdaRole, `${this.props.sinkS3Prefix}*`);
    this.props.sourceS3Bucket.grantReadWrite(lambdaRole, `${this.props.sourceS3Prefix}*`);

    const fn = new SolutionNodejsFunction(
      this.scope,
      'GlueTablePartitionSyncerFunction',
      {
        vpc: this.props.vpc,
        vpcSubnets: this.props.vpcSubnets,
        securityGroups: [securityGroupForLambda],
        role: lambdaRole,
        entry: join(__dirname, '..', 'lambda', 'partition-syncer', 'index.ts'),
        environment: {
          SOURCE_S3_BUCKET_NAME: this.props.sourceS3Bucket.bucketName,
          SOURCE_S3_PREFIX: this.props.sourceS3Prefix,
          SINK_S3_BUCKET_NAME: this.props.sinkS3Bucket.bucketName,
          SINK_S3_PREFIX: this.props.sinkS3Prefix,
          PIPELINE_S3_BUCKET_NAME: this.props.pipelineS3Bucket.bucketName,
          PIPELINE_S3_PREFIX: this.props.pipelineS3Prefix,
          DATABASE_NAME: databaseName,
          SOURCE_TABLE_NAME: sourceTableName,
          PROJECT_ID: this.props.projectId,
          APP_IDS: this.props.appIds,
        },
        ...functionSettings,
        memorySize: 256,
        applicationLogLevel: 'WARN',
      },
    );
    addCfnNagSuppressRules(fn.node.defaultChild as CfnResource, [
      {
        id: 'W92',
        reason: 'Lambda is used as custom resource, ignore setting ReservedConcurrentExecutions',
      },
    ]);
    return fn;
  }

  public createEmrJobSubmitterLambda(
    glueDB: Database,
    sourceTable: Table,
    sinkTables: ClickstreamSinkTables,
    emrApplicationId: string,
    securityGroupForLambda: ISecurityGroup): Function {
    const lambdaRole = this.roleUtil.createJobSubmitterLambdaRole(glueDB, sourceTable, sinkTables, emrApplicationId);

    this.props.sinkS3Bucket.grantReadWrite(lambdaRole, `${this.props.sinkS3Prefix}*`);
    this.props.sourceS3Bucket.grantRead(lambdaRole, `${this.props.sourceS3Prefix}*`);
    this.props.pipelineS3Bucket.grantReadWrite(lambdaRole, `${this.props.pipelineS3Prefix}*`);

    const fn = new SolutionNodejsFunction(this.scope, 'EmrSparkJobSubmitterFunction', {
      role: lambdaRole,
      securityGroups: [securityGroupForLambda],
      vpc: this.props.vpc,
      vpcSubnets: this.props.vpcSubnets,
      awsSdkConnectionReuse: true,
      entry: join(__dirname, '..', 'lambda', 'emr-job-submitter', 'index.ts'),
      reservedConcurrentExecutions: 1,
      environment: {
        EMR_SERVERLESS_APPLICATION_ID: emrApplicationId,
        STACK_ID: getShortIdOfStack(Stack.of(this.scope)),
        PROJECT_ID: this.props.projectId,
        APP_IDS: this.props.appIds,
        ROLE_ARN: lambdaRole.roleArn,
        GLUE_CATALOG_ID: glueDB.catalogId,
        GLUE_DB: glueDB.databaseName,
        SOURCE_TABLE_NAME: sourceTable.tableName,
        SOURCE_S3_BUCKET_NAME: this.props.sourceS3Bucket.bucketName,
        SOURCE_S3_PREFIX: this.props.sourceS3Prefix,
        SINK_S3_BUCKET_NAME: this.props.sinkS3Bucket.bucketName,
        SINK_S3_PREFIX: this.props.sinkS3Prefix,
        PIPELINE_S3_BUCKET_NAME: this.props.pipelineS3Bucket.bucketName,
        PIPELINE_S3_PREFIX: this.props.pipelineS3Prefix,
        DATA_FRESHNESS_IN_HOUR: this.props.dataFreshnessInHour,
        DATA_BUFFERED_SECONDS: this.props.dataBufferedSeconds,
        SCHEDULE_EXPRESSION: this.props.scheduleExpression,
        TRANSFORMER_AND_ENRICH_CLASS_NAMES: this.props.transformerAndEnrichClassNames,
        S3_PATH_PLUGIN_JARS: this.props.s3PathPluginJars,
        S3_PATH_PLUGIN_FILES: this.props.s3PathPluginFiles,
        S3_PATH_ENTRY_POINT_JAR: this.props.entryPointJar,
        OUTPUT_FORMAT: this.props.outputFormat,
        USER_KEEP_DAYS: this.props.userKeepDays + '',
        ITEM_KEEP_DAYS: this.props.itemKeepDays + '',
      },
      ...functionSettings,
      memorySize: 1024,
      applicationLogLevel: 'WARN',
    });
    attachListTagsPolicyForFunction(this.scope, 'EmrSparkJobSubmitterFunction', fn);
    return fn;
  }

  public createEmrJobStateListenerLambda(emrApplicationId: string, securityGroupForLambda: ISecurityGroup, dlSqs: Queue) {
    const lambdaRole = this.roleUtil.createEmrJobStateListenerLambdaRole(emrApplicationId);
    dlSqs.grantSendMessages(lambdaRole);
    this.props.pipelineS3Bucket.grantReadWrite(lambdaRole, `${this.props.pipelineS3Prefix}*`);

    const fn = new SolutionNodejsFunction(this.scope, 'EmrJobStateListenerFunction', {
      role: lambdaRole,
      securityGroups: [securityGroupForLambda],
      vpc: this.props.vpc,
      vpcSubnets: this.props.vpcSubnets,
      awsSdkConnectionReuse: true,
      entry: join(__dirname, '..', 'lambda', 'emr-job-state-listener', 'index.ts'),
      reservedConcurrentExecutions: 1,
      environment: {
        EMR_SERVERLESS_APPLICATION_ID: emrApplicationId,
        STACK_ID: getShortIdOfStack(Stack.of(this.scope)),
        PROJECT_ID: this.props.projectId,
        PIPELINE_S3_BUCKET_NAME: this.props.pipelineS3Bucket.bucketName,
        PIPELINE_S3_PREFIX: this.props.pipelineS3Prefix,
        DL_QUEUE_URL: dlSqs.queueUrl,
      },
      ...functionSettings,
      memorySize: 1024,
      applicationLogLevel: 'WARN',
    });
    return fn;
  }
}
