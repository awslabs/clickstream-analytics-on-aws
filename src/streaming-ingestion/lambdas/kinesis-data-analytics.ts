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

import { KinesisAnalyticsV2Client, CreateApplicationCommand, RuntimeEnvironment, MetricsLevel, LogLevel, ConfigurationType, CodeContentType, ApplicationMode, DescribeApplicationCommand, ApplicationStatus, StopApplicationCommand, StartApplicationCommand, ApplicationRestoreType, DeleteApplicationCommand } from '@aws-sdk/client-kinesis-analytics-v2';
import { fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { logger } from '../../common/powertools';
import { aws_sdk_client_common_config } from '../../common/sdk-client-config';
import { GEO_FILE_NAME, PROPERTY_GROUP_ID } from '../common/constant';
import { getPrefix } from '../common/utils';
import { StreamingIngestionKinesisDataAnalyticsProps } from '../pipeline/model';

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(() => resolve(), ms));
};

export function getKinesisAnalyticsClient(roleArn: string) {
  return new KinesisAnalyticsV2Client({
    ...aws_sdk_client_common_config,
    credentials: fromTemporaryCredentials({
      // Required. Options passed to STS AssumeRole operation.
      params: {
        // Required. ARN of role to assume.
        RoleArn: roleArn,
        // Optional. An identifier for the assumed role session. If skipped, it generates a random
        // session name with prefix of 'aws-sdk-js-'.
        RoleSessionName: 'streaming-ingestion-kinesis-analytics',
        // Optional. The duration, in seconds, of the role session.
        DurationSeconds: 900,
      },
    }),
  });
}

export const createKinesisAnalyticsApplication = async (kinesisAnalyticsClient: KinesisAnalyticsV2Client,
  props: StreamingIngestionKinesisDataAnalyticsProps) => {
  logger.info('createKinesisAnalyticsApplication applicationName:', props.applicationName);
  const REGION = process.env.AWS_REGION!;
  let bucketName = props.applicationCodeBucketARN.split(':::')[1];
  let fileKey = getPrefix(props.applicationCodeFileKey) + '/' + GEO_FILE_NAME;
  const input = { // CreateApplicationRequest
    ApplicationName: props.applicationName, // required
    ApplicationDescription: 'Clickstream streaming ingestion flink application',
    RuntimeEnvironment: RuntimeEnvironment.FLINK_1_15, // required
    ServiceExecutionRole: props.roleArn, // required
    ApplicationConfiguration: { // ApplicationConfiguration
      FlinkApplicationConfiguration: { // FlinkApplicationConfiguration
        CheckpointConfiguration: { // CheckpointConfiguration
          ConfigurationType: ConfigurationType.CUSTOM, // required
          CheckpointingEnabled: false,
        },
        MonitoringConfiguration: { // MonitoringConfiguration
          ConfigurationType: ConfigurationType.CUSTOM, // required
          MetricsLevel: MetricsLevel.APPLICATION,
          LogLevel: LogLevel.WARN,
        },
        ParallelismConfiguration: { // ParallelismConfiguration
          ConfigurationType: ConfigurationType.CUSTOM, // required
          ParallelismPerKPU: Number(props.parallelismPerKPU),
          AutoScalingEnabled: true,
        },
      },
      EnvironmentProperties: { // EnvironmentProperties
        PropertyGroups: [ // PropertyGroups // required
          { // PropertyGroup
            PropertyGroupId: PROPERTY_GROUP_ID, // required
            PropertyMap: { // PropertyMap // required
              'projectId': props.projectId,
              'appId': props.appId,
              'kinesis.source.stream': props.kinesisSourceStreamName,
              'kinesis.sink.stream': props.kinesisSinkStreamName,
              'kinesis.region': REGION,
              'parallelism': String(props.parallelism),
              'geoBucketName': bucketName,
              'geoFileKey': fileKey,
            },
          },
        ],
      },
      ApplicationCodeConfiguration: { // ApplicationCodeConfiguration
        CodeContent: { // CodeContent
          S3ContentLocation: { // S3ContentLocation
            BucketARN: props.applicationCodeBucketARN, // required
            FileKey: props.applicationCodeFileKey, // required
          },
        },
        CodeContentType: CodeContentType.ZIPFILE, // required
      },
      ApplicationSnapshotConfiguration: { // ApplicationSnapshotConfiguration
        SnapshotsEnabled: false, // required
      },
      VpcConfigurations: [ // VpcConfigurations
        { // VpcConfiguration
          SubnetIds: props.subnetIds.split(','),
          SecurityGroupIds: props.securityGroupIds.split(','),
        },
      ],
    },
    CloudWatchLoggingOptions: [{
      LogStreamARN: props.logStreamArn,
    }],
    ApplicationMode: ApplicationMode.STREAMING,
  };
  logger.info('createKinesisAnalyticsApplication input:', { input });
  const command = new CreateApplicationCommand(input);
  try {
    const response = await kinesisAnalyticsClient.send(command);
    logger.info('createKinesisAnalyticsApplication response:', { response });
  } catch (err) {
    if (err instanceof Error) {
      logger.error('Error when createKinesisAnalyticsApplication', err);
    }
  }
};

export const describeKinesisAnalyticsApplication = async(kinesisAnalyticsClient: KinesisAnalyticsV2Client,
  applicationName: string) => {
  const input = { // DescribeApplicationRequest
    ApplicationName: applicationName, // required
    IncludeAdditionalDetails: false,
  };
  const command = new DescribeApplicationCommand(input);
  let response = await kinesisAnalyticsClient.send(command);
  let status = response.ApplicationDetail!.ApplicationStatus;
  let createTimestamp;
  while (status != ApplicationStatus.READY && status != ApplicationStatus.ROLLED_BACK && status != ApplicationStatus.DELETING) {
    await sleep(1000);
    logger.info('kinesis analytics response status:'+status);
    response = await kinesisAnalyticsClient.send(command);
    status = response.ApplicationDetail!.ApplicationStatus;
    createTimestamp = response.ApplicationDetail!.CreateTimestamp;
  }
  logger.info('kinesis analytics response status:'+status);
  return {
    status: status,
    createTimestamp: createTimestamp,
  };
};

export const delKinesisAnalyticsApplication = async(kinesisAnalyticsClient: KinesisAnalyticsV2Client,
  applicationName: string, createTimestamp: Date) => {
  const input = { // DescribeApplicationRequest
    ApplicationName: applicationName, // required
    CreateTimestamp: createTimestamp,
  };
  const command = new DeleteApplicationCommand(input);
  await kinesisAnalyticsClient.send(command);
};

export const startKinesisAnalyticsApplication = async(kinesisAnalyticsClient: KinesisAnalyticsV2Client,
  props: StreamingIngestionKinesisDataAnalyticsProps) => {
  const input = { // StartApplicationRequest
    ApplicationName: props.applicationName, // required
    RunConfiguration: { // RunConfiguration
      ApplicationRestoreConfiguration: { // ApplicationRestoreConfiguration
        ApplicationRestoreType: ApplicationRestoreType.SKIP_RESTORE_FROM_SNAPSHOT, // required
      },
    },
  };
  const command = new StartApplicationCommand(input);
  await kinesisAnalyticsClient.send(command);
};

export const stopKinesisAnalyticsApplication = async(kinesisAnalyticsClient: KinesisAnalyticsV2Client,
  applicationName: string) => {
  const input = { // StopApplicationRequest
    ApplicationName: applicationName, // required
    Force: true,
  };
  const command = new StopApplicationCommand(input);
  await kinesisAnalyticsClient.send(command);
};