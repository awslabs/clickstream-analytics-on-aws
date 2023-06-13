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

import { Duration } from 'aws-cdk-lib';
import { IVpc, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { Stream, StreamMode } from 'aws-cdk-lib/aws-kinesis';
import { StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { KinesisEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { createKinesisDataStream } from './private/kinesis';
import { createKinesisToS3Lambda } from './private/lambda';
import { createMetricsWidgetForKinesis } from './private/metrics-kinesis';

export interface KinesisDataStreamToS3Props {
  projectId: string;
  vpc: IVpc;
  subnetSelection: SubnetSelection;
  streamMode: StreamMode;
  dataRetentionHours: number;
  shardCount?: number;
  s3DataBucket: IBucket;
  s3DataPrefix: string;
  batchSize: number;
  maxBatchingWindowSeconds: number;
  startingPosition: StartingPosition;
}

export class KinesisDataStreamToS3 extends Construct {
  public kinesisDataSteam: Stream;

  constructor(scope: Construct, id: string, props: KinesisDataStreamToS3Props) {
    super(scope, id);
    this.kinesisDataSteam = createKinesisDataStream(scope, {
      streamMode: props.streamMode,
      dataRetentionHours: props.dataRetentionHours,
      projectId: props.projectId,
      shardCount: props.shardCount,
    });

    const fn = createKinesisToS3Lambda(scope, {
      vpc: props.vpc,
      subnetSelection: props.subnetSelection,
      s3DataBucket: props.s3DataBucket,
      s3DataPrefix: props.s3DataPrefix,
    });

    fn.addEventSource(
      new KinesisEventSource(this.kinesisDataSteam, {
        enabled: true,
        maxBatchingWindow: Duration.seconds(props.maxBatchingWindowSeconds),
        batchSize: props.batchSize,
        startingPosition: props.startingPosition,
      }),
    );

    if (fn.role) {
      props.s3DataBucket.grantPut(fn.role);
    }

    createMetricsWidgetForKinesis(scope, {
      projectId: props.projectId,
      streamName: this.kinesisDataSteam.streamName,
      kinesisToS3FunctionName: fn.functionName,
    });
  }
}
