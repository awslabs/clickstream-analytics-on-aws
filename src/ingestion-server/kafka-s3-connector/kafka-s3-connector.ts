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

import { ISecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { createS3SinkConnectorCustomResource } from './custom-resource';
import { createS3SinkConnectorRole } from './iam';
import { createMetricsWidgetForS3Connector } from './metrics-connector';

export interface KafkaS3SinkConnectorProps {
  readonly projectId: string;
  readonly kafkaBrokers: string;
  readonly kafkaTopics: string;
  readonly dataS3Bucket: IBucket;
  readonly dataS3Prefix: string;
  readonly pluginS3Bucket: IBucket;
  readonly pluginS3Prefix: string;
  readonly logS3Bucket: IBucket;
  readonly logS3Prefix: string;
  readonly subnetIds: string;
  readonly securityGroup: ISecurityGroup;
  readonly maxWorkerCount: number;
  readonly minWorkerCount: number;
  readonly workerMcuCount: number;
  readonly pluginUrl: string;
  readonly kafkaConnectVersion: string;
  readonly rotateIntervalMS: number;
  readonly customConnectorConfiguration: string;
  readonly flushSize: number;
  readonly mskClusterName: string;
}

export class KafkaS3SinkConnector extends Construct {
  constructor(scope: Construct, id: string, props: KafkaS3SinkConnectorProps) {
    super(scope, id);

    const securityGroup = props.securityGroup;
    const s3SinkConnectorRole = createS3SinkConnectorRole(scope, {
      mskClusterName: props.mskClusterName,
      s3BucketName: props.dataS3Bucket.bucketName,
    });

    const pluginS3Bucket = props.pluginS3Bucket;
    const dataS3Bucket = props.dataS3Bucket;
    const logS3Bucket = props.logS3Bucket;

    const cr = createS3SinkConnectorCustomResource(scope, {
      projectId: props.projectId,
      subnetIds: props.subnetIds,
      securityGroup,
      dataS3Bucket,
      dataS3Prefix: props.dataS3Prefix,
      pluginS3Bucket,
      pluginS3Prefix: props.pluginS3Prefix,
      logS3Bucket,
      logS3Prefix: props.logS3Prefix,
      kafkaTopics: props.kafkaTopics,
      kafkaBrokers: props.kafkaBrokers,
      s3SinkConnectorRole,
      maxWorkerCount: props.maxWorkerCount,
      minWorkerCount: props.minWorkerCount,
      workerMcuCount: props.workerMcuCount,
      pluginUrl: props.pluginUrl,
      kafkaConnectVersion: props.kafkaConnectVersion,
      rotateIntervalMS: props.rotateIntervalMS,
      customConnectorConfiguration: props.customConnectorConfiguration,
      flushSize: props.flushSize,
    });

    const connectorName = cr.getAttString('connectorName');

    createMetricsWidgetForS3Connector(scope, {
      projectId: props.projectId,
      mskClusterName: props.mskClusterName,
      connectorName,
      kafkaTopic: props.kafkaTopics,
    });
  }
}
