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

import { AddTagsToStreamCommand, CreateStreamCommand, DecreaseStreamRetentionPeriodCommand, DeleteStreamCommand, DescribeStreamCommand, DescribeStreamSummaryCommand, EncryptionType, IncreaseStreamRetentionPeriodCommand, KinesisClient, ListTagsForStreamCommand, RemoveTagsFromStreamCommand, StartStreamEncryptionCommand, StreamStatus, UpdateStreamModeCommand } from '@aws-sdk/client-kinesis';
import { LambdaClient, ListTagsCommand } from '@aws-sdk/client-lambda';
import { CdkCustomResourceCallback, CdkCustomResourceResponse, CloudFormationCustomResourceDeleteEvent, CloudFormationCustomResourceUpdateEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { KINESIS_MODE } from '../../../../src/common/model';
import { handler } from '../../../../src/streaming-ingestion/lambdas/custom-resource/sink-kinesis-data-stream';
import 'aws-sdk-client-mock-jest';
import { getSinkStreamName } from '../../../../src/streaming-ingestion/private/utils';
import { getMockContext } from '../../../common/lambda-context';
import { basicCloudFormationEvent } from '../../../common/lambda-events';

describe('Custom resource - manage the lifecycle of sink kinesis data stream', () => {

  const context = getMockContext();
  const callback: CdkCustomResourceCallback = async (_response) => {//
  };

  const kinesisMock = mockClient(KinesisClient);
  const lambdaMock = mockClient(LambdaClient);

  const basicEvent = {
    ...basicCloudFormationEvent,
    ResourceProperties: {
      ...basicCloudFormationEvent.ResourceProperties,
      ServiceToken: 'token-1',
      projectId: 'project1',
      appIds: '',
      identifier: 'identifier1',
      dataRetentionHours: 24,
      streamMode: KINESIS_MODE.ON_DEMAND,
      encryptionKeyArn: 'arn:aws:kms:us-west-2:012345678912:key/0001-0002-0003',
    },
  };

  beforeEach(async () => {
    kinesisMock.reset();
    lambdaMock.reset();
  });

  test('no appIds are given', async () => {
    const emptyAppIds = basicEvent;

    const resp = await handler(emptyAppIds, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');

    expect(lambdaMock).toHaveReceivedCommandTimes(ListTagsCommand, 0);
    expect(kinesisMock).toHaveReceivedCommandTimes(CreateStreamCommand, 0);
    expect(kinesisMock).toHaveReceivedCommandTimes(DescribeStreamCommand, 0);
    expect(kinesisMock).toHaveReceivedCommandTimes(StartStreamEncryptionCommand, 0);
    expect(kinesisMock).toHaveReceivedCommandTimes(DeleteStreamCommand, 0);
  });

  test('one app is registered', async () => {
    const oneAppId = {
      ...basicEvent,
      ResourceProperties: {
        ...basicEvent.ResourceProperties,
        appIds: 'app1',
        dataRetentionHours: 36,
      },
    };

    const streamName = getSinkStreamName('project1', 'app1', 'identifier1');

    const basicStreamDetails = {
      StreamName: streamName,
      StreamARN: '',
      Shards: [],
      HasMoreShards: false,
      RetentionPeriodHours: 24,
      StreamCreationTimestamp: new Date(),
      EnhancedMonitoring: [],
      StreamStatus: StreamStatus.ACTIVE,
    };
    kinesisMock.on(DescribeStreamCommand).resolvesOnce({
      StreamDescription: basicStreamDetails,
    }).resolves({
      StreamDescription: {
        ...basicStreamDetails,
        RetentionPeriodHours: oneAppId.ResourceProperties.dataRetentionHours,
      },
    });

    lambdaMock.on(ListTagsCommand).resolves({
      Tags: {
        name: 'project1',
        version: 'v1.2.0',
      },
    });

    const resp = await handler(oneAppId, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');

    expect(lambdaMock).toHaveReceivedCommandTimes(ListTagsCommand, 1);
    expect(kinesisMock).toHaveReceivedNthSpecificCommandWith(1, CreateStreamCommand, {
      StreamName: streamName,
      StreamModeDetails: { StreamMode: 'ON_DEMAND' },
      ShardCount: undefined,
    });
    expect(kinesisMock).toHaveReceivedNthSpecificCommandWith(1, IncreaseStreamRetentionPeriodCommand, {
      StreamName: streamName,
      RetentionPeriodHours: oneAppId.ResourceProperties.dataRetentionHours,
    });
    expect(kinesisMock).toHaveReceivedNthSpecificCommandWith(1, StartStreamEncryptionCommand, {
      StreamName: streamName,
      EncryptionType: EncryptionType.KMS,
      KeyId: oneAppId.ResourceProperties.encryptionKeyArn,
    });
    expect(kinesisMock).toHaveReceivedNthSpecificCommandWith(1, AddTagsToStreamCommand, {
      StreamName: streamName,
      Tags: {
        name: 'project1',
        version: 'v1.2.0',
      },
    });
    expect(kinesisMock).toHaveReceivedCommandTimes(DescribeStreamCommand, 3);
    expect(kinesisMock).toHaveReceivedCommandTimes(DeleteStreamCommand, 0);
  });

  test('one app is updated', async () => {
    const oneAppId = {
      ...basicEvent,
      ResourceProperties: {
        ...basicEvent.ResourceProperties,
        appIds: 'app1',
        dataRetentionHours: 24,
      },
      RequestType: 'Update',
      OldResourceProperties: {
        ...basicEvent.ResourceProperties,
        appIds: 'app1',
        dataRetentionHours: 36,
      },
      PhysicalResourceId: 'resource-id-1',
    } as CloudFormationCustomResourceUpdateEvent;

    const newTags = {
      name: 'project1',
      version: 'v1.2.1',
    };
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: newTags,
    });
    kinesisMock.on(ListTagsForStreamCommand).resolves({
      HasMoreTags: false,
      Tags: [{
        Key: 'name',
        Value: 'project1',
      }, {
        Key: 'version',
        Value: 'v1.2.0',
      }],
    });

    const streamName = getSinkStreamName('project1', 'app1', 'identifier1');
    const streamArn = `arn:aws:kinesis:us-west-2:012345678910:stream/${streamName}`;

    const basicStreamDetails = {
      StreamName: streamName,
      StreamARN: streamArn,
      Shards: [],
      HasMoreShards: false,
      RetentionPeriodHours: 24,
      StreamCreationTimestamp: new Date(),
      EnhancedMonitoring: [],
      StreamStatus: StreamStatus.ACTIVE,
      StreamModeDetails: {
        StreamMode: basicEvent.ResourceProperties.streamMode,
      },
      KeyId: basicEvent.ResourceProperties.encryptionKeyArn,
    };
    kinesisMock.on(DescribeStreamCommand).resolves({
      StreamDescription: {
        ...basicStreamDetails,
        RetentionPeriodHours: oneAppId.ResourceProperties.dataRetentionHours,
      },
    });
    kinesisMock.on(DescribeStreamSummaryCommand).resolvesOnce({
      StreamDescriptionSummary: {
        ...basicStreamDetails,
        OpenShardCount: 0,
        RetentionPeriodHours: 36,
      },
    });

    const resp = await handler(oneAppId, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');

    expect(lambdaMock).toHaveReceivedCommandTimes(ListTagsCommand, 1);
    expect(kinesisMock).toHaveReceivedCommandTimes(DescribeStreamSummaryCommand, 1);
    expect(kinesisMock).toHaveReceivedNthSpecificCommandWith(1, DecreaseStreamRetentionPeriodCommand, {
      StreamName: streamName,
      RetentionPeriodHours: oneAppId.ResourceProperties.dataRetentionHours,
    });
    expect(kinesisMock).toHaveReceivedCommandTimes(DescribeStreamCommand, 1);
    expect(kinesisMock).toHaveReceivedNthSpecificCommandWith(1, AddTagsToStreamCommand, {
      StreamName: streamName,
      Tags: newTags,
    });
    expect(kinesisMock).toHaveReceivedCommandTimes(RemoveTagsFromStreamCommand, 0);
    expect(kinesisMock).toHaveReceivedCommandTimes(DeleteStreamCommand, 0);
  });

  test('the project with two apps is deleted', async () => {
    const twoAppsId = {
      ...basicEvent,
      ResourceProperties: {
        ...basicEvent.ResourceProperties,
        appIds: 'app1,app2',
        dataRetentionHours: 24,
      },
      RequestType: 'Delete',
      PhysicalResourceId: 'resource-id-1',
    } as CloudFormationCustomResourceDeleteEvent;

    const resp = await handler(twoAppsId, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');

    expect(lambdaMock).toHaveReceivedCommandTimes(ListTagsCommand, 0);
    expect(kinesisMock).toHaveReceivedCommandTimes(CreateStreamCommand, 0);
    expect(kinesisMock).toHaveReceivedCommandTimes(DescribeStreamCommand, 0);
    expect(kinesisMock).toHaveReceivedCommandTimes(StartStreamEncryptionCommand, 0);
    expect(kinesisMock).toHaveReceivedCommandTimes(DeleteStreamCommand, 2);
  });

  test('another app is registered', async ()=>{
    const anotherApp = {
      ...basicEvent,
      ResourceProperties: {
        ...basicEvent.ResourceProperties,
        appIds: 'app1,app2',
      },
      RequestType: 'Update',
      OldResourceProperties: {
        ...basicEvent.ResourceProperties,
        appIds: 'app1',
      },
      PhysicalResourceId: 'resource-id-1',
    } as CloudFormationCustomResourceUpdateEvent;

    const tags = {
      name: 'project1',
      version: 'v1.2.1',
    };
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: tags,
    });
    kinesisMock.on(ListTagsForStreamCommand).resolves({
      HasMoreTags: false,
      Tags: [{
        Key: 'name',
        Value: 'project1',
      }, {
        Key: 'version',
        Value: 'v1.2.1',
      }],
    });

    const basicStreamDetails = {
      Shards: [],
      HasMoreShards: false,
      RetentionPeriodHours: 24,
      StreamCreationTimestamp: new Date(),
      EnhancedMonitoring: [],
      StreamStatus: StreamStatus.ACTIVE,
      StreamModeDetails: {
        StreamMode: basicEvent.ResourceProperties.streamMode,
      },
      KeyId: basicEvent.ResourceProperties.encryptionKeyArn,
    };
    kinesisMock.on(DescribeStreamCommand).callsFake(input => {
      const streamName = input.StreamName!;
      const streamArn = `arn:aws:kinesis:us-west-2:012345678910:stream/${streamName}`;
      return {
        StreamDescription: {
          ...basicStreamDetails,
          StreamName: streamName,
          StreamARN: streamArn,
        },
      };
    });
    kinesisMock.on(DescribeStreamSummaryCommand).callsFake(input => {
      if (input.StreamName?.includes('app1')) {
        return {
          StreamDescriptionSummary: {
            ...basicStreamDetails,
            StreamName: input.StreamName,
            StreamARN: `arn:aws:kinesis:us-west-2:012345678910:stream/${input.StreamName}`,
          },
        };
      };
      throw new Error('Should not describe summary not for app1');
    });

    const resp = await handler(anotherApp, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');

    // verify the creation of app2
    const streamNameForApp2 = getSinkStreamName('project1', 'app2', 'identifier1');
    expect(kinesisMock).toHaveReceivedNthSpecificCommandWith(1, CreateStreamCommand, {
      StreamName: streamNameForApp2,
      StreamModeDetails: { StreamMode: 'ON_DEMAND' },
      ShardCount: undefined,
    });
    expect(kinesisMock).toHaveReceivedNthSpecificCommandWith(1, StartStreamEncryptionCommand, {
      StreamName: streamNameForApp2,
      EncryptionType: EncryptionType.KMS,
      KeyId: anotherApp.ResourceProperties.encryptionKeyArn,
    });
    expect(kinesisMock).toHaveReceivedNthSpecificCommandWith(1, AddTagsToStreamCommand, {
      StreamName: streamNameForApp2,
      Tags: tags,
    });

    // verify the updating of app1
    const streamNameForApp1 = getSinkStreamName('project1', 'app1', 'identifier1');
    expect(kinesisMock).toHaveReceivedNthSpecificCommandWith(1, DescribeStreamSummaryCommand, {
      StreamName: streamNameForApp1,
    });
    expect(kinesisMock).toHaveReceivedCommandTimes(UpdateStreamModeCommand, 0);
    expect(kinesisMock).toHaveReceivedCommandTimes(IncreaseStreamRetentionPeriodCommand, 0);
    expect(kinesisMock).toHaveReceivedCommandTimes(DecreaseStreamRetentionPeriodCommand, 0);
    expect(kinesisMock).toHaveReceivedCommandTimes(AddTagsToStreamCommand, 2);
    expect(kinesisMock).toHaveReceivedNthSpecificCommandWith(2, AddTagsToStreamCommand, {
      StreamName: streamNameForApp1,
      Tags: tags,
    });
    expect(kinesisMock).toHaveReceivedCommandTimes(RemoveTagsFromStreamCommand, 0);

    expect(kinesisMock).toHaveReceivedCommandTimes(DeleteStreamCommand, 0);
  });
});

