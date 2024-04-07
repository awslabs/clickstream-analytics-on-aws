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

import path from 'path';
import { OUTPUT_STREAMING_INGESTION_FLINK_APP_ARN, OUTPUT_STREAMING_INGESTION_FLINK_APP_ID_STREAM_CONFIG_S3_PATH, OUTPUT_STREAMING_INGESTION_SINK_KINESIS_JSON } from '@aws/clickstream-base-lib';
import { Application, ApplicationCode, LogLevel, MetricsLevel, Runtime } from '@aws-cdk/aws-kinesisanalytics-flink-alpha';
import {
  Arn,
  Aspects,
  CfnCondition,
  CfnOutput,
  CfnStack,
  Fn,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import { PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { Stream } from 'aws-cdk-lib/aws-kinesis';
import { CfnApplication } from 'aws-cdk-lib/aws-kinesisanalyticsv2';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { RolePermissionBoundaryAspect } from './common/aspects';
import { addCfnNagForBucketDeployment, addCfnNagForCustomResourceProvider, addCfnNagForLogRetention, addCfnNagToSecurityGroup, addCfnNagToStack, ruleForLambdaVPCAndReservedConcurrentExecutions, ruleRolePolicyWithWildcardResourcesAndHighSPCM, ruleToSuppressCloudWatchLogEncryption } from './common/cfn-nag';
import { REDSHIFT_MODE } from './common/model';
import { Parameters } from './common/parameters';
import { uploadBuiltInJarsAndRemoteFiles } from './common/s3-asset';
import { SolutionInfo } from './common/solution-info';
import { associateApplicationWithStack, getShortIdOfStack } from './common/stack';
import { getExistVpc } from './common/vpc-utils';
import {
  createStackParameters,
} from './streaming-ingestion/parameter';
import { SINK_STREAM_NAME_PREFIX } from './streaming-ingestion/private/constant';
import { KinesisSink } from './streaming-ingestion/private/kinesis-sink';
import { StreamingIngestionRedshiftStack } from './streaming-ingestion/private/redshift-stack';

export class StreamingIngestionStack extends Stack {

  readonly flinkApp: Application;
  readonly toRedshiftServerlessStack: StreamingIngestionRedshiftStack;
  readonly toProvisionedRedshiftStack: StreamingIngestionRedshiftStack;

  constructor(
    scope: Construct,
    id: string,
    props?: StackProps,
  ) {
    super(scope, id, props);

    const featureName = 'Streaming Ingestion';
    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}-si) ${SolutionInfo.SOLUTION_NAME} - ${featureName} ${SolutionInfo.SOLUTION_VERSION_DETAIL}`;

    const p = createStackParameters(this);
    this.templateOptions.metadata = p.metadata;

    const projectId = p.params.projectId;
    const appIds = p.params.appIds;
    const pipeline = p.params.pipeline;
    const sourceStream = Stream.fromStreamArn(this, 'SourceStream', pipeline.source.kinesisArn!);
    const dataBucket = Bucket.fromBucketArn(this, 'DataBucket', pipeline.dataBucket.arn);


    const vpc = getExistVpc(this, 'from-vpc-for-streaming-ingestion', {
      vpcId: pipeline.network.vpcId,
      availabilityZones: Fn.getAzs(),
      privateSubnetIds: Fn.split(',', pipeline.network.subnetIds),
    });

    // create sink Kinesis data streams per application
    const sinkStream = new KinesisSink(this, 'StreamingIngestionSink', {
      projectId,
      appIds,
      ...pipeline.buffer.kinesis,
      streamMode: pipeline.buffer.kinesis.mode,
      encryptionKeyArn: pipeline.buffer.kinesis.encryptionKeyArn,
    });

    // copy the application jar and files to streaming ingestion data bucket for creating flink application
    const appPrefix = Fn.join('', [pipeline.dataBucket.prefix, Fn.join('/', [
      projectId,
      'streaming-ingestion',
      `built-in-${getShortIdOfStack(Stack.of(this))}`,
    ])]);
    const {
      entryPointJar: applicationJar,
      files: builtInFiles,
      deployment,
    } = uploadBuiltInJarsAndRemoteFiles(
      this,
      {
        sourcePath: __dirname, // src/ directory
        buildDirectory: path.join( 'streaming-ingestion', 'flink-etl'),
        jarName: 'flink-etl',
        shadowJar: true,
        destinationBucket: dataBucket,
        destinationKeyPrefix: appPrefix,
        buildImage: 'public.ecr.aws/docker/library/gradle:7.6-jdk11',
      },
    );

    // create managed flink application
    const applicationJarKey = applicationJar.substring(`s3://${dataBucket.bucketName}/`.length);
    const geoDBKey = builtInFiles[0].substring(`s3://${dataBucket.bucketName}/`.length);
    const mappingConfgKey = `${pipeline.dataBucket.prefix}${projectId}/flink-config/app-id-stream-config.json`;
    const appIdStreamConfigS3Path = `s3://${dataBucket.bucketName}/${mappingConfgKey}`;
    this.flinkApp = new Application(this, 'ClickstreamStreamingIngestion', {
      code: ApplicationCode.fromBucket(dataBucket, applicationJarKey),
      propertyGroups: {
        EnvironmentProperties: {
          projectId: projectId,
          stackShortId: getShortIdOfStack(Stack.of(this)),
          inputStreamArn: sourceStream.streamArn,
          dataBucketName: dataBucket.bucketName,
          geoFileKey: geoDBKey,
          appIdStreamConfig: appIdStreamConfigS3Path,
        },
      },
      runtime: Runtime.FLINK_1_15,
      checkpointingEnabled: true, // default is true
      logLevel: LogLevel.ERROR, // default is INFO
      metricsLevel: MetricsLevel.TASK, // default is APPLICATION
      autoScalingEnabled: true, // default is true
      parallelism: pipeline.worker.configuration.parallelism, // default is 1
      parallelismPerKpu: pipeline.worker.configuration.parallelismPerKPU, // default is 1
      snapshotsEnabled: false, // default is true
      vpc,
    });
    (this.flinkApp.node.defaultChild! as CfnApplication).applicationDescription = `Streaming ingestion for Clickstream project ${p.params.projectId}`;
    sourceStream.grantRead(this.flinkApp);
    dataBucket.grantRead(this.flinkApp, applicationJarKey);
    dataBucket.grantRead(this.flinkApp, geoDBKey);
    dataBucket.grantRead(this.flinkApp, mappingConfgKey);
    this.flinkApp.addToRolePolicy(new PolicyStatement({
      actions: [
        'kinesis:PutRecord',
        'kinesis:PutRecords',
        'kinesis:ListShards',
      ],
      resources: [Arn.format({
        service: 'kinesis',
        resource: 'stream',
        resourceName: `${SINK_STREAM_NAME_PREFIX}${projectId}_*`,
      }, Stack.of(this))],
    }));
    this.flinkApp.node.addDependency(deployment);

    // update Redshift IAM role association and schema and table per application
    const isExistingRedshiftServerless = new CfnCondition(
      this,
      'existingRedshiftServerless',
      {
        expression:
          Fn.conditionEquals(pipeline.destination.redshift.mode, REDSHIFT_MODE.SERVERLESS),
      },
    );
    const isRedshiftProvisioned = new CfnCondition(
      this,
      'redshiftProvisioned',
      {
        expression:
          Fn.conditionEquals(pipeline.destination.redshift.mode, REDSHIFT_MODE.PROVISIONED),
      },
    );
    const ingestionParams = {
      projectId,
      appIds,
      dataAPIRole: Role.fromRoleArn(this, 'ExistingRedshiftDataAPIRole', pipeline.destination.redshift.dataAPIRoleArn),
      workflowBucketInfo: {
        s3Bucket: dataBucket,
        prefix: `clickstream/${projectId}/tmp/`,
      },
      streamArnPattern: sinkStream.streamArnPattern,
      streamEncryptionKeyArn: pipeline.buffer.kinesis.encryptionKeyArn,
      biUser: pipeline.destination.redshift.userName,
      identifier: getShortIdOfStack(Stack.of(this)),
    };
    this.toRedshiftServerlessStack = new StreamingIngestionRedshiftStack(this, 'StreamingToServerlessRedshift', {
      ...ingestionParams,
      existingRedshiftServerlessProps: {
        createdInStack: false,
        workgroupId: pipeline.destination.redshift.existingServerless!.workgroupId,
        namespaceId: pipeline.destination.redshift.existingServerless!.namespaceId,
        workgroupName: pipeline.destination.redshift.existingServerless!.workgroupName,
        databaseName: pipeline.destination.redshift.defaultDatabaseName,
      },
    });
    (this.toRedshiftServerlessStack.nestedStackResource as CfnStack).cfnOptions.condition = isExistingRedshiftServerless;
    this.toProvisionedRedshiftStack = new StreamingIngestionRedshiftStack(this, 'StreamingToProvisionedRedshift', {
      ...ingestionParams,
      existingProvisionedRedshiftProps: {
        clusterIdentifier: pipeline.destination.redshift.provisioned!.clusterIdentifier,
        dbUser: pipeline.destination.redshift.provisioned!.dbUser,
        databaseName: pipeline.destination.redshift.defaultDatabaseName,
      },
    });
    (this.toProvisionedRedshiftStack.nestedStackResource as CfnStack).cfnOptions.condition = isRedshiftProvisioned;

    this.addCfnNag();

    new CfnOutput(this, OUTPUT_STREAMING_INGESTION_FLINK_APP_ID_STREAM_CONFIG_S3_PATH, {
      description: 'S3 path of app IDs and kineisis data stream sinks config mapping',
      value: appIdStreamConfigS3Path,
    });

    new CfnOutput(this, OUTPUT_STREAMING_INGESTION_FLINK_APP_ARN, {
      description: 'Flink application ARN',
      value: this.flinkApp.applicationArn,
    });

    new CfnOutput(this, OUTPUT_STREAMING_INGESTION_SINK_KINESIS_JSON, {
      description: 'Sink Kinesis info json',
      value: sinkStream.kinesisInfoJson,
    });

    // Associate Service Catalog AppRegistry application with stack
    associateApplicationWithStack(this);

    // Add IAM role permission boundary aspect
    const {
      iamRoleBoundaryArnParam,
    } = Parameters.createIAMRolePrefixAndBoundaryParameters(this);
    Aspects.of(this).add(new RolePermissionBoundaryAspect(iamRoleBoundaryArnParam.valueAsString));
  }

  private addCfnNag() {
    const stack = Stack.of(this);
    // suppress Flink application
    const cfnNagListForFlinkConstruct = [
      ruleRolePolicyWithWildcardResourcesAndHighSPCM('ClickstreamStreamingIngestion/Role/DefaultPolicy/Resource', 'Flink policy', 'eni'),
      {
        paths_endswith: ['ClickstreamStreamingIngestion/LogGroup/Resource'],
        rules_to_suppress: [
          ruleToSuppressCloudWatchLogEncryption(),
        ],
      },
    ];
    addCfnNagToStack(stack, cfnNagListForFlinkConstruct);
    this.flinkApp.connections.securityGroups.forEach(sg => {
      addCfnNagToSecurityGroup(sg);
    });
    addCfnNagForBucketDeployment(stack, 'streaming-ingestion');

    // suppress Kinesis sink
    addCfnNagForLogRetention(stack);
    addCfnNagForCustomResourceProvider(stack, 'CDK built-in provider for KinesisSinkCustomResource', 'StreamingIngestionSink/KinesisSinkCustomResourceProvider');
    addCfnNagToStack(stack, [
      ruleForLambdaVPCAndReservedConcurrentExecutions(
        'StreamingIngestionSink/KinesisManagementFn/Resource', 'KinesisManagementFn'),
    ]);
  }
}

