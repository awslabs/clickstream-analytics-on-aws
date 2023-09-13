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
import { OUTPUT_STREAMING_INGESTION_FLINK_APP_ARN } from '@aws/clickstream-base-lib';
import { Application, ApplicationCode, LogLevel, MetricsLevel, Runtime } from '@aws-cdk/aws-kinesisanalytics-flink-alpha';
import {
  CfnOutput,
  Fn,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import { Stream } from 'aws-cdk-lib/aws-kinesis';
import { CfnApplication } from 'aws-cdk-lib/aws-kinesisanalyticsv2';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { addCfnNagForCfnResource, addCfnNagToSecurityGroup, addCfnNagToStack, ruleRolePolicyWithWildcardResourcesAndHighSPCM, ruleToSuppressCloudWatchLogEncryption } from './common/cfn-nag';
import { uploadBuiltInJarsAndRemoteFiles } from './common/s3-asset';
import { SolutionInfo } from './common/solution-info';
import { getShortIdOfStack } from './common/stack';
import { getExistVpc } from './common/vpc-utils';
import {
  createStackParameters,
} from './streaming-ingestion/parameter';

export class StreamingIngestionMainStack extends Stack {

  readonly flinkApp: Application;

  constructor(
    scope: Construct,
    id: string,
    props?: StackProps,
  ) {
    super(scope, id, props);

    const featureName = 'StreamingIngestion';
    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}-si) ${SolutionInfo.SOLUTION_NAME} - ${featureName} ${SolutionInfo.SOLUTION_VERSION_DETAIL}`;

    const p = createStackParameters(this);
    this.templateOptions.metadata = p.metadata;

    const projectId = p.params.projectId;
    const pipeline = p.params.pipeline;
    const sourceStream = Stream.fromStreamArn(this, 'SourceStream', pipeline.source.kinesisArn!);
    const dataBucket = Bucket.fromBucketArn(this, 'DataBucket', pipeline.dataBucket.arn);

    const vpc = getExistVpc(this, 'from-vpc-for-streaming-ingestion', {
      vpcId: pipeline.network.vpcId,
      availabilityZones: Fn.getAzs(),
      privateSubnetIds: Fn.split(',', pipeline.network.subnetIds),
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
      path.resolve(__dirname, 'streaming-ingestion', 'flink-etl'),
      'flink-etl',
      dataBucket,
      appPrefix,
      '-x checkstyleMain',
    );

    // create managed flink application
    const applicationJarKey = applicationJar.substring(`s3://${dataBucket.bucketName}/`.length);
    const geoDBKey = builtInFiles[0].substring(`s3://${dataBucket.bucketName}/`.length);
    this.flinkApp = new Application(this, 'ClickstreamStreamingIngestion', {
      code: ApplicationCode.fromBucket(dataBucket, applicationJarKey),
      propertyGroups: {
        FlinkApplicationProperties: {
          inputStreamArn: sourceStream.streamArn,
        },
        EnvironmentProperties: {
          'projectId': projectId,
          'stackShortId': getShortIdOfStack(Stack.of(this)),
          'kinesis.source.stream': sourceStream.streamName,
          'dataBucketName': dataBucket.bucketName,
          'geoFileKey': geoDBKey,
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
    this.flinkApp.node.addDependency(deployment);

    this.addCfnNag();

    new CfnOutput(this, OUTPUT_STREAMING_INGESTION_FLINK_APP_ARN, {
      description: 'Flink application ARN',
      value: this.flinkApp.applicationArn,
    });
  }

  private addCfnNag() {
    const cfnNagListForFlinkConstruct = [
      ruleRolePolicyWithWildcardResourcesAndHighSPCM('ClickstreamStreamingIngestion/Role/DefaultPolicy/Resource', 'Flink policy', 'eni'),
      {
        paths_endswith: ['ClickstreamStreamingIngestion/LogGroup/Resource'],
        rules_to_suppress: [
          ruleToSuppressCloudWatchLogEncryption(),
        ],
      },
    ];
    addCfnNagToStack(Stack.of(this), cfnNagListForFlinkConstruct);
    this.flinkApp.connections.securityGroups.forEach(sg => {
      addCfnNagToSecurityGroup(sg);
    });
    addCfnNagForCfnResource(Stack.of(this), 'CDK built-in BucketDeployment', 'Custom::CDKBucketDeployment.*', 'streaming-ingestion', []);
  }
}

