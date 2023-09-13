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

import { KinesisClient, CreateStreamCommand, StreamMode, EncryptionType, StartStreamEncryptionCommand, DescribeStreamCommand, StreamStatus, DeleteStreamCommand } from '@aws-sdk/client-kinesis';
import { fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import { logger } from '../../common/powertools';
import { aws_sdk_client_common_config } from '../../common/sdk-client-config';
import { OnDemandKinesisProps, ProvisionedKinesisProps } from '../pipeline/model';

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(() => resolve(), ms));
};

export function getKinesisClient(roleArn: string) {
  return new KinesisClient({
    ...aws_sdk_client_common_config,
    credentials: fromTemporaryCredentials({
      // Required. Options passed to STS AssumeRole operation.
      params: {
        // Required. ARN of role to assume.
        RoleArn: roleArn,
        // Optional. An identifier for the assumed role session. If skipped, it generates a random
        // session name with prefix of 'aws-sdk-js-'.
        RoleSessionName: 'streaming-ingestion-kinesis',
        // Optional. The duration, in seconds, of the role session.
        DurationSeconds: 900,
      },
    }),
  });
}

export const createKinesisDataStream = async (kinesisClient: KinesisClient, streamName: string,
  keyId: string, onDemandKinesisProps?: OnDemandKinesisProps, provisionedKinesisProps?: ProvisionedKinesisProps) => {
  let createParams;
  if (onDemandKinesisProps) {
    createParams = {
      StreamName: streamName,
      StreamModeDetails: {
        StreamMode: StreamMode.ON_DEMAND,
      },
    };
    logger.info(`create kinesis data stream ${streamName} OnDemand`, { createParams });
  } else if (provisionedKinesisProps) {
    createParams = {
      StreamName: streamName,
      ShardCount: Number(provisionedKinesisProps.shardCount),
      StreamModeDetails: {
        StreamMode: StreamMode.PROVISIONED,
      },
    };
    logger.info(`create kinesis data stream ${streamName} Provisioned`, { createParams });
  } else {
    logger.error('onDemandKinesisProps and provisionedKinesisProps both null');
    throw new Error('onDemandKinesisProps and provisionedKinesisProps both null');
  }
  await kinesisClient.send(new CreateStreamCommand(createParams));
  const descParams = { // DescribeStreamInput
    StreamName: streamName,
    Limit: 2,
  };
  const descCommand = new DescribeStreamCommand(descParams);
  let descResponse = await kinesisClient.send(descCommand);
  let status = descResponse.StreamDescription!.StreamStatus;
  while (status != StreamStatus.ACTIVE && status != StreamStatus.DELETING) {
    await sleep(1000);
    logger.info('kinesis data stream response status:'+status);
    descResponse = await kinesisClient.send(descCommand);
    status = descResponse.StreamDescription!.StreamStatus;
  }
  if (status != StreamStatus.ACTIVE) {
    logger.error('create kinesis data stream response fail status:' + status);
    throw new Error('create kinesis data stream response status:' + status);
  }
  logger.info('create kinesis data stream response status:' + status);

  // Enable server-side encryption on the stream
  const encryptionParams = {
    StreamName: streamName,
    EncryptionType: EncryptionType.KMS,
    KeyId: keyId,
  };

  await kinesisClient.send(new StartStreamEncryptionCommand(encryptionParams));

  return descResponse.StreamDescription!.StreamARN!;
};

export const descKinesisDataStream = async (kinesisClient: KinesisClient, streamName: string) => {
  const descParams = {
    StreamName: streamName,
    Limit: 2,
  };
  const descCommand = new DescribeStreamCommand(descParams);
  let descResponse = await kinesisClient.send(descCommand);
  return descResponse.StreamDescription!.StreamARN!;
};

export const delKinesisDataStream = async (kinesisClient: KinesisClient, streamName: string) => {
  const delParams = {
    StreamName: streamName,
  };
  const response = await kinesisClient.send(new DeleteStreamCommand(delParams));
  logger.info(`delKinesisDataStream response: ${response}`);
};