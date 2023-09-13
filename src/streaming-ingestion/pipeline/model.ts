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

import { StreamMode } from 'aws-cdk-lib/aws-kinesis';

interface KinesisDataStreamProps {
  readonly kinesisDataStreamNames?: string; //split the string by comma
}

export type StreamingIngestionKinesisProps = {
  readonly streamingIngestionFlinkRoleArn: string;
  readonly kinesisDataStreamProps?: KinesisDataStreamProps;
}

export interface OnDemandKinesisProps {
  dataRetentionHours: number;
}

export interface ProvisionedKinesisProps {
  dataRetentionHours: number;
  shardCount: number;
}

interface CustomKinesisProperties {
  readonly streamMode: string;
  readonly startingPosition: string;
  readonly onDemandKinesisProps?: OnDemandKinesisProps;
  readonly provisionedKinesisProps?: ProvisionedKinesisProps;
}

interface CustomKinesisAnalyticsProperties {
  readonly kinesisSourceStreamName: string;
  readonly parallelism: number;
  readonly parallelismPerKPU: number;
  readonly applicationCodeBucketARN: string;
  readonly applicationCodeFileKey: string;
  readonly securityGroupIds: string;
  readonly subnetIds: string;
  readonly logStreamArn: string;
}

export type StreamingIngestionPipelineCustomResourceProps = CustomKinesisProperties & CustomKinesisAnalyticsProperties & {
  readonly projectId: string;
  readonly appIds: string;
  readonly stackShortId: string;
  readonly streamingIngestionPipelineRoleArn: string;
  readonly streamingIngestionAssociateRedshiftRoleArn: string;
  readonly logStreamArn: string;
}

export type StreamingIngestionPipelineCfnProps = CustomKinesisProperties & CustomKinesisAnalyticsProperties & {
  readonly projectId: string;
  readonly appIds: string;
  readonly stackShortId: string;
}

export interface StreamingIngestionKinesisDataStreamProps {
  projectId: string;
  appIds: string;
  stackShortId: string;
  streamMode: StreamMode;
  startingPosition: string;
  onDemandKinesisProps?: OnDemandKinesisProps;
  provisionedKinesisProps?: ProvisionedKinesisProps;
}

export type StreamingIngestionKinesisDataAnalyticsProps = {
  projectId: string;
  appId: string;
  applicationName: string;
  parallelism: number;
  parallelismPerKPU: number;
  kinesisSourceStreamName: string;
  kinesisSinkStreamName: string;
  applicationCodeBucketARN: string;
  applicationCodeFileKey: string;
  roleArn: string;
  securityGroupIds: string;
  subnetIds: string;
  logStreamArn: string;
}