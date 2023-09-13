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

import { AttachRolePolicyCommand, CreatePolicyCommand, IAMClient } from '@aws-sdk/client-iam';
import { CreateStreamCommand, DeleteStreamCommand, DescribeStreamCommand, KinesisClient, StartStreamEncryptionCommand } from '@aws-sdk/client-kinesis';
import { ApplicationStatus, CreateApplicationCommand, DeleteApplicationCommand, DescribeApplicationCommand, KinesisAnalyticsV2Client, StartApplicationCommand, StopApplicationCommand } from '@aws-sdk/client-kinesis-analytics-v2';
import { LambdaClient, ListTagsCommand } from '@aws-sdk/client-lambda';
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { CdkCustomResourceCallback, CdkCustomResourceEvent, CdkCustomResourceResponse } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { logger } from '../../../../src/common/powertools';
import { ResourcePropertiesType, handler } from '../../../../src/streaming-ingestion/lambdas/custom-resource/create-streaming-ingestion-pipeline';
import 'aws-sdk-client-mock-jest';
import { getMockContext } from '../../../common/lambda-context';
import { basicCloudFormationEvent } from '../../../common/lambda-events';

describe('Custom resource - Create pipeline for flink applications', () => {

  const context = getMockContext();
  const callback: CdkCustomResourceCallback = async (_response) => {};

  const kinesisMock = mockClient(KinesisClient);
  const kinesisAnalyticsMock = mockClient(KinesisAnalyticsV2Client);
  const s3Mock = mockClient(S3Client);
  const lambdaMock = mockClient(LambdaClient);
  const iamMock = mockClient(IAMClient);

  const basicEvent = {
    ...basicCloudFormationEvent,
    ResourceProperties: {
      ...basicCloudFormationEvent.ResourceProperties,
      ServiceToken: 'token-1',
      projectId: 'project1',
      stackShortId: 'abcde',
    },
  };

  const createKdsOnDemandInPipeline: ResourcePropertiesType = {
    ...basicEvent.ResourceProperties,
    projectId: 'project1',
    appIds: 'app1,app2',
    stackShortId: 'stackShortId1',
    streamingIngestionPipelineRoleArn: 'arn:aws:iam::1234567890:role/StreamingIngestionPipelineRole',
    streamingIngestionAssociateRedshiftRoleArn: 'arn:aws:iam::1234567890:role/StreamingIngestionAssociateRedshiftRole',
    logStreamArn: '',
    streamMode: '',
    startingPosition: 'LATEST',
    onDemandKinesisProps: {
      dataRetentionHours: 24,
    },
    kinesisSourceStreamName: '',
    parallelism: 2,
    parallelismPerKPU: 2,
    applicationCodeBucketARN: '',
    applicationCodeFileKey: '',
    securityGroupIds: '',
    subnetIds: '',
  };

  const createKdsProvisionedInPipeline: ResourcePropertiesType = {
    ...basicEvent.ResourceProperties,
    projectId: 'project1',
    appIds: 'app1,app2',
    stackShortId: 'stackShortId1',
    streamingIngestionPipelineRoleArn: 'arn:aws:iam::1234567890:role/StreamingIngestionPipelineRole',
    streamingIngestionAssociateRedshiftRoleArn: 'arn:aws:iam::1234567890:role/StreamingIngestionAssociateRedshiftRole',
    logStreamArn: '',
    streamMode: '',
    startingPosition: 'LATEST',
    provisionedKinesisProps: {
      dataRetentionHours: 24,
      shardCount: 4,
    },
    kinesisSourceStreamName: '',
    parallelism: 2,
    parallelismPerKPU: 2,
    applicationCodeBucketARN: '',
    applicationCodeFileKey: '',
    securityGroupIds: '',
    subnetIds: '',
  };

  const createPipelineOnDemandEvent = {
    ...basicEvent,
    ResourceProperties: createKdsOnDemandInPipeline,
  };

  const createPipelineProvisionedEvent = {
    ...basicEvent,
    ResourceProperties: createKdsProvisionedInPipeline,
  };

  const updatePipelineOnDemandEvent: CdkCustomResourceEvent = {
    ...createPipelineOnDemandEvent,
    OldResourceProperties: {
      ...createPipelineOnDemandEvent.ResourceProperties,
      appIds: '',
    },
    ResourceProperties: {
      ...createPipelineOnDemandEvent.ResourceProperties,
      appIds: 'app1',
    },
    PhysicalResourceId: '',
    RequestType: 'Update',
  };

  const updatePipelineOnDemandEvent2: CdkCustomResourceEvent = {
    ...createPipelineOnDemandEvent,
    OldResourceProperties: {
      ...createPipelineOnDemandEvent.ResourceProperties,
      appIds: 'app1',
    },
    ResourceProperties: {
      ...createPipelineOnDemandEvent.ResourceProperties,
      appIds: 'app1,app2',
    },
    PhysicalResourceId: '',
    RequestType: 'Update',
  };

  const delPipelineOnDemandEvent: CdkCustomResourceEvent = {
    ...createPipelineOnDemandEvent,
    ResourceProperties: {
      ...createPipelineOnDemandEvent.ResourceProperties,
      appIds: 'app1',
    },
    PhysicalResourceId: '',
    RequestType: 'Delete',
  };

  beforeEach(async () => {
    kinesisMock.reset();
    kinesisAnalyticsMock.reset();
    s3Mock.reset();
  });

  test('Only invoked if no application is given', async () => {
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    const eventWithoutApp = {
      ...createPipelineOnDemandEvent,
      ResourceProperties: {
        ...createPipelineOnDemandEvent.ResourceProperties,
        appIds: '',
      },
    };
    logger.info(`basicEvent:${basicEvent}`);
    kinesisMock.on(CreateStreamCommand).resolves({});
    kinesisMock.on(DescribeStreamCommand).resolves({
      StreamDescription: {
        StreamName: 'STRING_VALUE', // required
        StreamARN: 'STRING_VALUE', // required
        StreamStatus: 'ACTIVE',
        StreamModeDetails: { // StreamModeDetails
          StreamMode: 'ON_DEMAND', // required
        },
        Shards: [
          {
            ShardId: 'STRING_VALUE',
            HashKeyRange: { // HashKeyRange
              StartingHashKey: 'STRING_VALUE', // required
              EndingHashKey: 'STRING_VALUE', // required
            },
            SequenceNumberRange: { // SequenceNumberRange
              StartingSequenceNumber: 'STRING_VALUE', // required
              EndingSequenceNumber: 'STRING_VALUE',
            },
          },
        ],
        HasMoreShards: false, // required
        RetentionPeriodHours: 24, // required
        StreamCreationTimestamp: new Date(), // required
        EnhancedMonitoring: [ // EnhancedMonitoringList // required
          { // EnhancedMetrics
            ShardLevelMetrics: [ // MetricsNameList
              'ALL',
            ],
          },
        ],
      },
    });
    kinesisMock.on(StartStreamEncryptionCommand as any).resolves({});
    iamMock.on(CreatePolicyCommand).resolves({
      Policy: {
        Arn: 'STRING_VALUE',
      },
    });
    iamMock.on(AttachRolePolicyCommand).resolves({});
    const resp = await handler(eventWithoutApp, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
  });

  test('Create pipeline with KDS onDemand when appId is given', async () => {
    const eventWithApp = {
      ...createPipelineOnDemandEvent,
      ResourceProperties: {
        ...createPipelineOnDemandEvent.ResourceProperties,
      },
    };
    logger.info(`basicEvent:${basicEvent}`);
    kinesisMock.on(CreateStreamCommand).resolves({});
    kinesisMock.on(DescribeStreamCommand).resolves({
      StreamDescription: {
        StreamName: 'STRING_VALUE', // required
        StreamARN: 'STRING_VALUE', // required
        StreamStatus: 'ACTIVE',
        StreamModeDetails: { // StreamModeDetails
          StreamMode: 'ON_DEMAND', // required
        },
        Shards: [
          {
            ShardId: 'STRING_VALUE',
            HashKeyRange: { // HashKeyRange
              StartingHashKey: 'STRING_VALUE', // required
              EndingHashKey: 'STRING_VALUE', // required
            },
            SequenceNumberRange: { // SequenceNumberRange
              StartingSequenceNumber: 'STRING_VALUE', // required
              EndingSequenceNumber: 'STRING_VALUE',
            },
          },
        ],
        HasMoreShards: false, // required
        RetentionPeriodHours: 24, // required
        StreamCreationTimestamp: new Date(), // required
        EnhancedMonitoring: [ // EnhancedMonitoringList // required
          { // EnhancedMetrics
            ShardLevelMetrics: [ // MetricsNameList
              'ALL',
            ],
          },
        ],
      },
    });
    kinesisMock.on(StartStreamEncryptionCommand as any).resolves({});
    s3Mock.on(HeadObjectCommand).resolves({});
    kinesisAnalyticsMock.on(CreateApplicationCommand).resolves({});
    kinesisAnalyticsMock.on(DescribeApplicationCommand).resolves({
      ApplicationDetail: {
        ApplicationARN: '',
        ApplicationStatus: ApplicationStatus.READY,
        ApplicationName: '',
        RuntimeEnvironment: 'FLINK-1_15',
        ApplicationVersionId: 1,
        ApplicationConfigurationDescription: {
          ApplicationCodeConfigurationDescription: { // ApplicationCodeConfigurationDescription
            CodeContentType: 'ZIPFILE', // required
            CodeContentDescription: { // CodeContentDescription
              S3ApplicationCodeLocationDescription: { // S3ApplicationCodeLocationDescription
                BucketARN: 'STRING_VALUE', // required
                FileKey: 'STRING_VALUE', // required
                ObjectVersion: 'STRING_VALUE',
              },
            },
          },
        },
      },
    });
    kinesisAnalyticsMock.on(StartApplicationCommand).resolves({});
    iamMock.on(CreatePolicyCommand).resolves({
      Policy: {
        Arn: 'STRING_VALUE',
      },
    });
    iamMock.on(AttachRolePolicyCommand).resolves({});
    const resp = await handler(eventWithApp, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
  });

  test('Create pipeline with KDS provisioned when appId is given', async () => {
    const eventWithApp = {
      ...createPipelineProvisionedEvent,
      ResourceProperties: {
        ...createPipelineProvisionedEvent.ResourceProperties,
      },
    };
    logger.info(`basicEvent:${basicEvent}`);
    kinesisMock.on(CreateStreamCommand).resolves({});
    kinesisMock.on(DescribeStreamCommand).resolves({
      StreamDescription: {
        StreamName: 'STRING_VALUE', // required
        StreamARN: 'STRING_VALUE', // required
        StreamStatus: 'ACTIVE',
        StreamModeDetails: { // StreamModeDetails
          StreamMode: 'PROVISIONED', // required
        },
        Shards: [
          {
            ShardId: 'STRING_VALUE',
            HashKeyRange: { // HashKeyRange
              StartingHashKey: 'STRING_VALUE', // required
              EndingHashKey: 'STRING_VALUE', // required
            },
            SequenceNumberRange: { // SequenceNumberRange
              StartingSequenceNumber: 'STRING_VALUE', // required
              EndingSequenceNumber: 'STRING_VALUE',
            },
          },
        ],
        HasMoreShards: false, // required
        RetentionPeriodHours: 24, // required
        StreamCreationTimestamp: new Date(), // required
        EnhancedMonitoring: [ // EnhancedMonitoringList // required
          { // EnhancedMetrics
            ShardLevelMetrics: [ // MetricsNameList
              'ALL',
            ],
          },
        ],
      },
    });
    kinesisMock.on(StartStreamEncryptionCommand as any).resolves({});
    s3Mock.on(HeadObjectCommand).resolves({});
    kinesisAnalyticsMock.on(CreateApplicationCommand).resolves({});
    kinesisAnalyticsMock.on(DescribeApplicationCommand).resolves({
      ApplicationDetail: {
        ApplicationARN: '',
        ApplicationStatus: 'READY',
        ApplicationName: '',
        RuntimeEnvironment: 'FLINK-1_15',
        ApplicationVersionId: 1,
        ApplicationConfigurationDescription: {
          ApplicationCodeConfigurationDescription: { // ApplicationCodeConfigurationDescription
            CodeContentType: 'ZIPFILE', // required
            CodeContentDescription: { // CodeContentDescription
              S3ApplicationCodeLocationDescription: { // S3ApplicationCodeLocationDescription
                BucketARN: 'STRING_VALUE', // required
                FileKey: 'STRING_VALUE', // required
                ObjectVersion: 'STRING_VALUE',
              },
            },
          },
        },
      },
    });
    kinesisAnalyticsMock.on(StartApplicationCommand).resolves({});
    iamMock.on(CreatePolicyCommand).resolves({
      Policy: {
        Arn: 'STRING_VALUE',
      },
    });
    iamMock.on(AttachRolePolicyCommand).resolves({});
    const resp = await handler(eventWithApp, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
  });

  test('Update pipeline with KDS onDemand when appId is given when update', async () => {
    kinesisMock.on(CreateStreamCommand).resolves({});
    kinesisMock.on(DescribeStreamCommand).resolves({
      StreamDescription: {
        StreamName: 'STRING_VALUE', // required
        StreamARN: 'STRING_VALUE', // required
        StreamStatus: 'ACTIVE',
        StreamModeDetails: { // StreamModeDetails
          StreamMode: 'ON_DEMAND', // required
        },
        Shards: [
          {
            ShardId: 'STRING_VALUE',
            HashKeyRange: { // HashKeyRange
              StartingHashKey: 'STRING_VALUE', // required
              EndingHashKey: 'STRING_VALUE', // required
            },
            SequenceNumberRange: { // SequenceNumberRange
              StartingSequenceNumber: 'STRING_VALUE', // required
              EndingSequenceNumber: 'STRING_VALUE',
            },
          },
        ],
        HasMoreShards: false, // required
        RetentionPeriodHours: 24, // required
        StreamCreationTimestamp: new Date(), // required
        EnhancedMonitoring: [ // EnhancedMonitoringList // required
          { // EnhancedMetrics
            ShardLevelMetrics: [ // MetricsNameList
              'ALL',
            ],
          },
        ],
      },
    });
    kinesisMock.on(StartStreamEncryptionCommand as any).resolves({});
    s3Mock.on(HeadObjectCommand).resolves({});
    kinesisAnalyticsMock.on(CreateApplicationCommand).resolves({});
    kinesisAnalyticsMock.on(DescribeApplicationCommand).resolves({
      ApplicationDetail: {
        ApplicationARN: '',
        ApplicationStatus: 'READY',
        ApplicationName: '',
        RuntimeEnvironment: 'FLINK-1_15',
        ApplicationVersionId: 1,
        ApplicationConfigurationDescription: {
          ApplicationCodeConfigurationDescription: { // ApplicationCodeConfigurationDescription
            CodeContentType: 'ZIPFILE', // required
            CodeContentDescription: { // CodeContentDescription
              S3ApplicationCodeLocationDescription: { // S3ApplicationCodeLocationDescription
                BucketARN: 'STRING_VALUE', // required
                FileKey: 'STRING_VALUE', // required
                ObjectVersion: 'STRING_VALUE',
              },
            },
          },
        },
      },
    });
    kinesisAnalyticsMock.on(StartApplicationCommand).resolves({});
    const resp = await handler(updatePipelineOnDemandEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
  });

  test('Update pipeline with KDS onDemand when appId is given when create and update', async () => {
    kinesisMock.on(CreateStreamCommand).resolves({});
    kinesisMock.on(DescribeStreamCommand).resolves({
      StreamDescription: {
        StreamName: 'STRING_VALUE', // required
        StreamARN: 'STRING_VALUE', // required
        StreamStatus: 'ACTIVE',
        StreamModeDetails: { // StreamModeDetails
          StreamMode: 'ON_DEMAND', // required
        },
        Shards: [
          {
            ShardId: 'STRING_VALUE',
            HashKeyRange: { // HashKeyRange
              StartingHashKey: 'STRING_VALUE', // required
              EndingHashKey: 'STRING_VALUE', // required
            },
            SequenceNumberRange: { // SequenceNumberRange
              StartingSequenceNumber: 'STRING_VALUE', // required
              EndingSequenceNumber: 'STRING_VALUE',
            },
          },
        ],
        HasMoreShards: false, // required
        RetentionPeriodHours: 24, // required
        StreamCreationTimestamp: new Date(), // required
        EnhancedMonitoring: [ // EnhancedMonitoringList // required
          { // EnhancedMetrics
            ShardLevelMetrics: [ // MetricsNameList
              'ALL',
            ],
          },
        ],
      },
    });
    kinesisMock.on(StartStreamEncryptionCommand as any).resolves({});
    s3Mock.on(HeadObjectCommand).resolves({});
    kinesisAnalyticsMock.on(CreateApplicationCommand).resolves({});
    kinesisAnalyticsMock.on(DescribeApplicationCommand).resolves({
      ApplicationDetail: {
        ApplicationARN: '',
        ApplicationStatus: 'READY',
        ApplicationName: '',
        RuntimeEnvironment: 'FLINK-1_15',
        ApplicationVersionId: 1,
        ApplicationConfigurationDescription: {
          ApplicationCodeConfigurationDescription: { // ApplicationCodeConfigurationDescription
            CodeContentType: 'ZIPFILE', // required
            CodeContentDescription: { // CodeContentDescription
              S3ApplicationCodeLocationDescription: { // S3ApplicationCodeLocationDescription
                BucketARN: 'STRING_VALUE', // required
                FileKey: 'STRING_VALUE', // required
                ObjectVersion: 'STRING_VALUE',
              },
            },
          },
        },
      },
    });
    kinesisAnalyticsMock.on(StartApplicationCommand).resolves({});
    const resp = await handler(updatePipelineOnDemandEvent2, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
  });

  test('Update pipeline with KDS provisioned when appId is given', async () => {
    kinesisMock.on(CreateStreamCommand).resolves({});
    kinesisMock.on(DescribeStreamCommand).resolves({
      StreamDescription: {
        StreamName: 'STRING_VALUE', // required
        StreamARN: 'STRING_VALUE', // required
        StreamStatus: 'ACTIVE',
        StreamModeDetails: { // StreamModeDetails
          StreamMode: 'PROVISIONED', // required
        },
        Shards: [
          {
            ShardId: 'STRING_VALUE',
            HashKeyRange: { // HashKeyRange
              StartingHashKey: 'STRING_VALUE', // required
              EndingHashKey: 'STRING_VALUE', // required
            },
            SequenceNumberRange: { // SequenceNumberRange
              StartingSequenceNumber: 'STRING_VALUE', // required
              EndingSequenceNumber: 'STRING_VALUE',
            },
          },
        ],
        HasMoreShards: false, // required
        RetentionPeriodHours: 24, // required
        StreamCreationTimestamp: new Date(), // required
        EnhancedMonitoring: [ // EnhancedMonitoringList // required
          { // EnhancedMetrics
            ShardLevelMetrics: [ // MetricsNameList
              'ALL',
            ],
          },
        ],
      },
    });
    kinesisMock.on(StartStreamEncryptionCommand as any).resolves({});
    s3Mock.on(HeadObjectCommand).resolves({});
    kinesisAnalyticsMock.on(CreateApplicationCommand).resolves({});
    kinesisAnalyticsMock.on(DescribeApplicationCommand).resolves({
      ApplicationDetail: {
        ApplicationARN: '',
        ApplicationStatus: 'READY',
        ApplicationName: '',
        RuntimeEnvironment: 'FLINK-1_15',
        ApplicationVersionId: 1,
        ApplicationConfigurationDescription: {
          ApplicationCodeConfigurationDescription: { // ApplicationCodeConfigurationDescription
            CodeContentType: 'ZIPFILE', // required
            CodeContentDescription: { // CodeContentDescription
              S3ApplicationCodeLocationDescription: { // S3ApplicationCodeLocationDescription
                BucketARN: 'STRING_VALUE', // required
                FileKey: 'STRING_VALUE', // required
                ObjectVersion: 'STRING_VALUE',
              },
            },
          },
        },
      },
    });
    kinesisAnalyticsMock.on(StartApplicationCommand).resolves({});
    const resp = await handler(updatePipelineOnDemandEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
  });

  test('Create pipeline with KDS onDemand when flink app status is fail', async () => {
    const eventWithApp = {
      ...createPipelineOnDemandEvent,
      ResourceProperties: {
        ...createPipelineOnDemandEvent.ResourceProperties,
      },
    };
    logger.info(`basicEvent:${basicEvent}`);
    kinesisMock.on(CreateStreamCommand).resolves({});
    kinesisMock.on(DescribeStreamCommand).resolves({
      StreamDescription: {
        StreamName: 'STRING_VALUE', // required
        StreamARN: 'STRING_VALUE', // required
        StreamStatus: 'ACTIVE',
        StreamModeDetails: { // StreamModeDetails
          StreamMode: 'ON_DEMAND', // required
        },
        Shards: [
          {
            ShardId: 'STRING_VALUE',
            HashKeyRange: { // HashKeyRange
              StartingHashKey: 'STRING_VALUE', // required
              EndingHashKey: 'STRING_VALUE', // required
            },
            SequenceNumberRange: { // SequenceNumberRange
              StartingSequenceNumber: 'STRING_VALUE', // required
              EndingSequenceNumber: 'STRING_VALUE',
            },
          },
        ],
        HasMoreShards: false, // required
        RetentionPeriodHours: 24, // required
        StreamCreationTimestamp: new Date(), // required
        EnhancedMonitoring: [ // EnhancedMonitoringList // required
          { // EnhancedMetrics
            ShardLevelMetrics: [ // MetricsNameList
              'ALL',
            ],
          },
        ],
      },
    });
    kinesisMock.on(StartStreamEncryptionCommand as any).resolves({});
    s3Mock.on(HeadObjectCommand).resolves({});
    kinesisAnalyticsMock.on(CreateApplicationCommand).resolves({});
    kinesisAnalyticsMock.on(DescribeApplicationCommand).resolves({
      ApplicationDetail: {
        ApplicationARN: '',
        ApplicationStatus: ApplicationStatus.DELETING,
        ApplicationName: '',
        RuntimeEnvironment: 'FLINK-1_15',
        ApplicationVersionId: 1,
        ApplicationConfigurationDescription: {
          ApplicationCodeConfigurationDescription: { // ApplicationCodeConfigurationDescription
            CodeContentType: 'ZIPFILE', // required
            CodeContentDescription: { // CodeContentDescription
              S3ApplicationCodeLocationDescription: { // S3ApplicationCodeLocationDescription
                BucketARN: 'STRING_VALUE', // required
                FileKey: 'STRING_VALUE', // required
                ObjectVersion: 'STRING_VALUE',
              },
            },
          },
        },
      },
    });
    kinesisAnalyticsMock.on(StartApplicationCommand).resolves({});
    try {
      await handler(eventWithApp, context, callback) as CdkCustomResourceResponse;
    } catch (e) {
      expect(kinesisAnalyticsMock).toHaveReceivedCommandTimes(CreateApplicationCommand, 1);
      return;
    }
    fail('No exception happened when Flink DescribeApplicationCommand failed');
  });

  test('Update pipeline with KDS onDemand when flink app status is fail', async () => {
    kinesisMock.on(CreateStreamCommand).resolves({});
    kinesisMock.on(DescribeStreamCommand).resolves({
      StreamDescription: {
        StreamName: 'STRING_VALUE', // required
        StreamARN: 'STRING_VALUE', // required
        StreamStatus: 'ACTIVE',
        StreamModeDetails: { // StreamModeDetails
          StreamMode: 'ON_DEMAND', // required
        },
        Shards: [
          {
            ShardId: 'STRING_VALUE',
            HashKeyRange: { // HashKeyRange
              StartingHashKey: 'STRING_VALUE', // required
              EndingHashKey: 'STRING_VALUE', // required
            },
            SequenceNumberRange: { // SequenceNumberRange
              StartingSequenceNumber: 'STRING_VALUE', // required
              EndingSequenceNumber: 'STRING_VALUE',
            },
          },
        ],
        HasMoreShards: false, // required
        RetentionPeriodHours: 24, // required
        StreamCreationTimestamp: new Date(), // required
        EnhancedMonitoring: [ // EnhancedMonitoringList // required
          { // EnhancedMetrics
            ShardLevelMetrics: [ // MetricsNameList
              'ALL',
            ],
          },
        ],
      },
    });
    kinesisMock.on(StartStreamEncryptionCommand as any).resolves({});
    s3Mock.on(HeadObjectCommand).resolves({});
    kinesisAnalyticsMock.on(CreateApplicationCommand).resolves({});
    kinesisAnalyticsMock.on(DescribeApplicationCommand).resolves({
      ApplicationDetail: {
        ApplicationARN: '',
        ApplicationStatus: ApplicationStatus.DELETING,
        ApplicationName: '',
        RuntimeEnvironment: 'FLINK-1_15',
        ApplicationVersionId: 1,
        ApplicationConfigurationDescription: {
          ApplicationCodeConfigurationDescription: { // ApplicationCodeConfigurationDescription
            CodeContentType: 'ZIPFILE', // required
            CodeContentDescription: { // CodeContentDescription
              S3ApplicationCodeLocationDescription: { // S3ApplicationCodeLocationDescription
                BucketARN: 'STRING_VALUE', // required
                FileKey: 'STRING_VALUE', // required
                ObjectVersion: 'STRING_VALUE',
              },
            },
          },
        },
      },
    });
    kinesisAnalyticsMock.on(StartApplicationCommand).resolves({});
    try {
      await handler(updatePipelineOnDemandEvent, context, callback) as CdkCustomResourceResponse;
    } catch (e) {
      expect(kinesisAnalyticsMock).toHaveReceivedCommandTimes(CreateApplicationCommand, 1);
      return;
    }
    fail('No exception happened when Flink DescribeApplicationCommand failed');
  });

  test('Delete pipeline with KDS onDemand', async () => {
    const eventWithApp = {
      ...delPipelineOnDemandEvent,
      ResourceProperties: {
        ...delPipelineOnDemandEvent.ResourceProperties,
      },
    };
    kinesisMock.on(DeleteStreamCommand).resolves({});
    kinesisAnalyticsMock.on(StopApplicationCommand).resolves({});
    kinesisAnalyticsMock.on(DescribeApplicationCommand).resolves({
      ApplicationDetail: {
        ApplicationARN: '',
        ApplicationStatus: ApplicationStatus.READY,
        ApplicationName: '',
        RuntimeEnvironment: 'FLINK-1_15',
        ApplicationVersionId: 1,
        ApplicationConfigurationDescription: {
          ApplicationCodeConfigurationDescription: { // ApplicationCodeConfigurationDescription
            CodeContentType: 'ZIPFILE', // required
            CodeContentDescription: { // CodeContentDescription
              S3ApplicationCodeLocationDescription: { // S3ApplicationCodeLocationDescription
                BucketARN: 'STRING_VALUE', // required
                FileKey: 'STRING_VALUE', // required
                ObjectVersion: 'STRING_VALUE',
              },
            },
          },
        },
      },
    });
    kinesisAnalyticsMock.on(DeleteApplicationCommand).resolves({});
    const resp = await handler(eventWithApp, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
  });

  test('Delete pipeline with KDS onDemand when flink application status is fail', async () => {
    const eventWithApp = {
      ...delPipelineOnDemandEvent,
      ResourceProperties: {
        ...delPipelineOnDemandEvent.ResourceProperties,
      },
    };
    kinesisMock.on(DeleteStreamCommand).resolves({});
    kinesisAnalyticsMock.on(StopApplicationCommand).resolves({});
    kinesisAnalyticsMock.on(DescribeApplicationCommand).resolves({
      ApplicationDetail: {
        ApplicationARN: '',
        ApplicationStatus: ApplicationStatus.DELETING,
        ApplicationName: '',
        RuntimeEnvironment: 'FLINK-1_15',
        ApplicationVersionId: 1,
        ApplicationConfigurationDescription: {
          ApplicationCodeConfigurationDescription: { // ApplicationCodeConfigurationDescription
            CodeContentType: 'ZIPFILE', // required
            CodeContentDescription: { // CodeContentDescription
              S3ApplicationCodeLocationDescription: { // S3ApplicationCodeLocationDescription
                BucketARN: 'STRING_VALUE', // required
                FileKey: 'STRING_VALUE', // required
                ObjectVersion: 'STRING_VALUE',
              },
            },
          },
        },
      },
    });
    kinesisAnalyticsMock.on(DeleteApplicationCommand).resolves({});
    await handler(eventWithApp, context, callback) as CdkCustomResourceResponse;
    expect(kinesisAnalyticsMock).toHaveReceivedCommandTimes(DeleteApplicationCommand, 0);
  });

  test('Delete pipeline with KDS onDemand when KDS remove status is fail', async () => {
    const eventWithApp = {
      ...delPipelineOnDemandEvent,
      ResourceProperties: {
        ...delPipelineOnDemandEvent.ResourceProperties,
      },
    };
    kinesisMock.on(DeleteStreamCommand).callsFakeOnce(input => {
      throw new Error('Try to delete stream fail: '+ input);
    });
    kinesisAnalyticsMock.on(StopApplicationCommand).resolves({});
    kinesisAnalyticsMock.on(DescribeApplicationCommand).resolves({
      ApplicationDetail: {
        ApplicationARN: '',
        ApplicationStatus: ApplicationStatus.READY,
        ApplicationName: '',
        RuntimeEnvironment: 'FLINK-1_15',
        ApplicationVersionId: 1,
        ApplicationConfigurationDescription: {
          ApplicationCodeConfigurationDescription: { // ApplicationCodeConfigurationDescription
            CodeContentType: 'ZIPFILE', // required
            CodeContentDescription: { // CodeContentDescription
              S3ApplicationCodeLocationDescription: { // S3ApplicationCodeLocationDescription
                BucketARN: 'STRING_VALUE', // required
                FileKey: 'STRING_VALUE', // required
                ObjectVersion: 'STRING_VALUE',
              },
            },
          },
        },
      },
    });
    kinesisAnalyticsMock.on(DeleteApplicationCommand).resolves({});
    await handler(eventWithApp, context, callback) as CdkCustomResourceResponse;
    expect(kinesisAnalyticsMock).toHaveReceivedCommandTimes(DeleteStreamCommand, 0);
  });


});

