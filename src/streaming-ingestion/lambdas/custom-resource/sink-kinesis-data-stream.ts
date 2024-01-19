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

import {
  KinesisClient, AddTagsToStreamCommand, CreateStreamCommand, DescribeStreamSummaryCommand,
  UpdateStreamModeCommand, UpdateShardCountCommand, ScalingType,
  ListTagsForStreamCommand, ListTagsForStreamCommandOutput,
  RemoveTagsFromStreamCommand, ResourceNotFoundException, StreamMode, waitUntilStreamExists, Tag,
  IncreaseStreamRetentionPeriodCommand, DecreaseStreamRetentionPeriodCommand, DeleteStreamCommand,
  StartStreamEncryptionCommand,
  EncryptionType,
} from '@aws-sdk/client-kinesis';
import { CdkCustomResourceHandler, CdkCustomResourceResponse, CloudFormationCustomResourceEvent, Context } from 'aws-lambda';
import { planAppChanges } from '../../../common/custom-resources';
import { getFunctionTags } from '../../../common/lambda/tags';
import { logger } from '../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';
import { KinesisCustomResourceProps, KinesisProperties } from '../../private/model';
import { getSinkStreamName } from '../../private/utils';

export type ResourcePropertiesType = KinesisCustomResourceProps & {
  readonly ServiceToken: string;
}

const kinesisClient = new KinesisClient({
  ...aws_sdk_client_common_config,
});

export const handler: CdkCustomResourceHandler = async (event: CloudFormationCustomResourceEvent, context: Context) => {
  logger.addContext(context);

  const response: CdkCustomResourceResponse = {
    PhysicalResourceId: 'manage-sink-kinesis-streams-for-streaming-ingestion',
    Data: {
    },
    Status: 'SUCCESS',
  };

  try {
    const props = event.ResourceProperties as ResourcePropertiesType;

    const { toBeAdded, toBeUpdated, toBeDeleted } = planAppChanges(event);

    logger.info('App changing info: ', {
      toBeAdded,
      toBeUpdated,
      toBeDeleted,
    });

    if (toBeAdded.length > 0 || toBeUpdated.length > 0) {
      const funcTags = await getFunctionTags(context);
      const tags: Tag[] = funcTags ? Object.entries(funcTags).map(([key, value]) => ({ Key: key, Value: value })) : [];

      const newStreams = await createKinesisStreams(props.projectId, toBeAdded, props.identifier, props, tags);

      const streams = await updateKinesisStreams(props.projectId, toBeUpdated, props.identifier, props, tags);

      response.Data = {
        ...response.Data,
        ...newStreams,
        ...streams,
      };
    }
    await deleteKinesisStreams(props.projectId, toBeDeleted, props.identifier);
  } catch (e) {
    logger.error('Error when managing sink kinesis streams for streaming ingestion', { e });
    throw e;
  }
  return response;
};

async function createKinesisStreams(projectId: string, appIds: string[], identifier: string,
  kinesisProps: KinesisProperties, tags: Tag[]) {
  logger.info('create new KinesisStreams', {
    projectId,
    appIds,
    identifier,
    tags,
  });

  const appStreamMapping: { [key:string]: string } = {};

  for (const appId of appIds) {
    const streamName = getSinkStreamName(projectId, appId, identifier);
    const createParams = {
      StreamName: streamName,
      ShardCount: kinesisProps.streamMode == StreamMode.PROVISIONED ? Number(kinesisProps.shardCount) : undefined,
      StreamModeDetails: {
        StreamMode: kinesisProps.streamMode,
      },
    };
    logger.info('create stream with params', {
      createParams,
    });
    await kinesisClient.send(new CreateStreamCommand(createParams));
    await waitUntilStreamExists({
      client: kinesisClient,
      maxWaitTime: 120,
      minDelay: 10,
    }, {
      StreamName: streamName,
      Limit: 2,
    });

    await setStreamDataRetentionPeriod(streamName, 24, Number(kinesisProps.dataRetentionHours));

    if (kinesisProps.encryptionKeyArn) {
      await setEncryptionKey(streamName, kinesisProps.encryptionKeyArn);
    }

    await tagStream(streamName, tags);
    appStreamMapping[appId] = streamName;
  }
  return appStreamMapping;
}

async function setEncryptionKey(streamName: string, kmsKeyArn: string) {
  logger.info(`Setting stream ${streamName} encryption key to ${kmsKeyArn}`);
  await kinesisClient.send(new StartStreamEncryptionCommand({
    StreamName: streamName,
    EncryptionType: EncryptionType.KMS,
    KeyId: kmsKeyArn,
  }));
  await waitUntilStreamExists({
    client: kinesisClient,
    maxWaitTime: 120,
    minDelay: 10,
  }, {
    StreamName: streamName,
    Limit: 2,
  });
}

async function setStreamDataRetentionPeriod(streamName: string, retentionPeriodHours: number,
  newRetentionPeriodHours: number) {
  logger.info(`Setting stream ${streamName} data retention period from ${retentionPeriodHours} hours to ${newRetentionPeriodHours} hours.`);
  if (newRetentionPeriodHours < 24 || newRetentionPeriodHours > 8760) {
    logger.warn(`New retention hours ${newRetentionPeriodHours} is illegal, ignore this change.`);
    return;
  }

  const updateParams = {
    StreamName: streamName,
    RetentionPeriodHours: newRetentionPeriodHours,
  };
  if (newRetentionPeriodHours > retentionPeriodHours) {
    await kinesisClient.send(new IncreaseStreamRetentionPeriodCommand(updateParams));
  } else if (newRetentionPeriodHours < retentionPeriodHours) {
    await kinesisClient.send(new DecreaseStreamRetentionPeriodCommand(updateParams));
  } else {
    logger.info(`New retention hours ${newRetentionPeriodHours} is same as current, ignore this change.`);
  }

  await waitUntilStreamExists({
    client: kinesisClient,
    maxWaitTime: 120,
    minDelay: 10,
  }, {
    StreamName: streamName,
    Limit: 2,
  });
}

async function tagStream(streamName: string, newTags: Tag[], oldTags?: Tag[]) {
  logger.info(`Tagging stream ${streamName} with tags`, {
    tags: newTags,
    oldTags,
  });

  // iterate tags by most 10 records
  for (let i = 0; i < newTags.length; i += 10) {
    const tagBatch = newTags.slice(i, i + 10);
    const record: Record<string, string> = {};
    tagBatch.forEach(tag => {
      record[tag.Key as string] = tag.Value!;
    });
    await kinesisClient.send(new AddTagsToStreamCommand({
      StreamName: streamName,
      Tags: record,
    }));
  }

  const newTagNames = newTags.map(tag => tag.Key!);
  const removedTags = oldTags?.filter((oldTag) => !newTagNames.includes(oldTag.Key!));
  if (removedTags && removedTags.length > 0) {
    logger.info(`Removing tags from stream ${streamName}`, { removedTags });
    await kinesisClient.send(new RemoveTagsFromStreamCommand({
      StreamName: streamName,
      TagKeys: removedTags.map(tag => tag.Key!),
    }));
  }
}

async function updateKinesisStreams(projectId: string, appIds: string[], identifier: string,
  kinesisProps: KinesisProperties, tags: Tag[]) {
  logger.info('update existing KinesisStreams', {
    projectId,
    appIds,
    identifier,
    tags,
  });

  const appStreamMapping: { [key:string]: string } = {};
  for (const appId of appIds) {
    const streamName = getSinkStreamName(projectId, appId, identifier);
    const describeParams = {
      StreamName: streamName,
    };
    logger.info('describe stream with params', {
      describeParams,
    });

    try {
      const stream = await kinesisClient.send(new DescribeStreamSummaryCommand(describeParams));

      logger.info(`Got stream ${streamName} with summary`, {
        stream: stream.StreamDescriptionSummary,
      });

      if (stream.StreamDescriptionSummary?.StreamModeDetails?.StreamMode != kinesisProps.streamMode) {
        logger.info(`Update stream ${stream.StreamDescriptionSummary?.StreamARN} to new mode`, {
          mode: kinesisProps.streamMode,
        });
        await kinesisClient.send(new UpdateStreamModeCommand({
          StreamARN: stream.StreamDescriptionSummary!.StreamARN!,
          StreamModeDetails: {
            StreamMode: kinesisProps.streamMode,
          },
        }));
        await waitUntilStreamExists({
          client: kinesisClient,
          maxWaitTime: 120,
          minDelay: 10,
        }, {
          StreamARN: stream.StreamDescriptionSummary?.StreamARN,
          Limit: 2,
        });
      }

      if (stream.StreamDescriptionSummary?.OpenShardCount != Number(kinesisProps.shardCount) &&
          kinesisProps.streamMode == StreamMode.PROVISIONED) {
        logger.info(`Update the shard of stream ${stream.StreamDescriptionSummary?.StreamARN} to new shard count ${kinesisProps.shardCount}.`, {
          shardCount: kinesisProps.shardCount,
        });
        await kinesisClient.send(new UpdateShardCountCommand({
          StreamARN: stream.StreamDescriptionSummary!.StreamARN!,
          TargetShardCount: Number(kinesisProps.shardCount),
          ScalingType: ScalingType.UNIFORM_SCALING,
        }));
        await waitUntilStreamExists({
          client: kinesisClient,
          maxWaitTime: 120,
          minDelay: 10,
        }, {
          StreamARN: stream.StreamDescriptionSummary?.StreamARN,
          Limit: 2,
        });
      }

      await setStreamDataRetentionPeriod(streamName, stream.StreamDescriptionSummary?.RetentionPeriodHours ?? 24,
        Number(kinesisProps.dataRetentionHours));

      if (stream.StreamDescriptionSummary?.KeyId != kinesisProps.encryptionKeyArn) {
        await setEncryptionKey(streamName, kinesisProps.encryptionKeyArn);
      }

      await tagStream(streamName, tags, await getTags(stream.StreamDescriptionSummary!.StreamARN!));
      appStreamMapping[appId] = streamName;
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        logger.error(`Can not find the kinesis stream ${streamName}`);
        continue;
      }
      throw error;
    }
  }
  return appStreamMapping;
}

async function getTags(streamArn: string): Promise<Tag[]> {
  logger.info(`Get tags for stream ${streamArn}`);

  let startTagKey = undefined;
  const tags = [];
  do {
    const batchTags: ListTagsForStreamCommandOutput = await kinesisClient.send(new ListTagsForStreamCommand({
      StreamARN: streamArn,
      ExclusiveStartTagKey: startTagKey,
    }));
    if (batchTags.HasMoreTags) {
      startTagKey = batchTags.Tags![batchTags.Tags!.length - 1].Key;
    }
    if (batchTags.Tags) {
      tags.push(...batchTags.Tags);
    }
  } while (startTagKey);

  logger.info(`Got tags for stream ${streamArn}`, { tags });
  return tags;
}

async function deleteKinesisStreams(projectId: string, appIds: string[], identifier: string) {
  logger.info('deleting existing KinesisStreams', {
    projectId,
    appIds,
    identifier,
  });

  for (const appId of appIds) {
    const streamName = getSinkStreamName(projectId, appId, identifier);

    const deleteParams = {
      StreamName: streamName,
      EnforceConsumerDeletion: true,
    };
    logger.info('delete stream with params', { params: deleteParams });
    await kinesisClient.send(new DeleteStreamCommand(deleteParams));
  }
}