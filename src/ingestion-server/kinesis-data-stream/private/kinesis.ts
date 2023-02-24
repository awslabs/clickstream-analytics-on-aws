/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { Duration } from 'aws-cdk-lib';
import { StreamMode, Stream, StreamEncryption } from 'aws-cdk-lib/aws-kinesis';
import { Construct } from 'constructs';

export interface KinesisDataStreamProps {
  streamMode: StreamMode;
  dataRetentionHours: number;
  shardCount?: number;
}

export function createKinesisDataStream(scope: Construct, props: KinesisDataStreamProps) {
  let kinesisDataStream;
  if (props.streamMode == StreamMode.ON_DEMAND) {
    kinesisDataStream = new Stream(scope, 'kinesisStreamOnDemand', {
      streamMode: StreamMode.ON_DEMAND,
      retentionPeriod: Duration.hours(props.dataRetentionHours),
      encryption: StreamEncryption.MANAGED,
    });
  } else {
    kinesisDataStream = new Stream(scope, 'kinesisStreamProvisioned', {
      shardCount: props.shardCount,
      streamMode: StreamMode.PROVISIONED,
      retentionPeriod: Duration.hours(props.dataRetentionHours),
      encryption: StreamEncryption.MANAGED,
    });
  }
  return kinesisDataStream;
}
