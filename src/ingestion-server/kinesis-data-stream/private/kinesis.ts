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

import { Duration, Stack, Fn, CfnResource } from 'aws-cdk-lib';
import { StreamMode, Stream, StreamEncryption } from 'aws-cdk-lib/aws-kinesis';
import { Construct } from 'constructs';
import { addCfnNagSuppressRules } from '../../../common/cfn-nag';
import { getShortIdOfStack } from '../../../common/stack';

export interface KinesisDataStreamProps {
  streamMode: StreamMode;
  dataRetentionHours: number;
  projectId: string;
  shardCount?: number;
}

export function createKinesisDataStream(scope: Construct, props: KinesisDataStreamProps) {
  let kinesisDataStream;
  const stackShortId = getShortIdOfStack(Stack.of(scope));
  const streamName = Fn.join('_', ['Clickstream', props.projectId, stackShortId]);
  if (props.streamMode == StreamMode.ON_DEMAND) {
    kinesisDataStream = new Stream(scope, 'kinesisStreamOnDemand', {
      streamName,
      streamMode: StreamMode.ON_DEMAND,
      retentionPeriod: Duration.hours(props.dataRetentionHours),
      encryption: StreamEncryption.MANAGED,
    });
  } else {
    kinesisDataStream = new Stream(scope, 'kinesisStreamProvisioned', {
      shardCount: props.shardCount,
      streamName,
      streamMode: StreamMode.PROVISIONED,
      retentionPeriod: Duration.hours(props.dataRetentionHours),
      encryption: StreamEncryption.MANAGED,
    });
  }
  addCfnNagSuppressRules(
    kinesisDataStream.node.defaultChild as CfnResource,
    [
      {
        id: 'W28',
        reason: 'Set the name of KDS with random suffix to restrict the length of name which has limited length support in Redshift streaming ingestion',
      },
    ],
  );
  return kinesisDataStream;
}
