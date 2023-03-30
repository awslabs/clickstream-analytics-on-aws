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

import { join } from 'path';
import { CfnResource, CustomResource, Duration, Resource, Stack } from 'aws-cdk-lib';
import { ISecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { createRoleForS3SinkConnectorCustomResourceLambda } from './iam';
import { addCfnNagSuppressRules } from '../../common/cfn-nag';
import { POWERTOOLS_ENVS } from '../../common/powertools';
import { getShortIdOfStack } from '../../common/stack';

export interface S3SinkConnectorCustomResourceProps {
  readonly subnetIds: String;
  readonly securityGroup: ISecurityGroup;
  readonly dataS3Bucket: IBucket;
  readonly dataS3Prefix: string;
  readonly pluginS3Bucket: IBucket;
  readonly pluginS3Prefix: string;
  readonly logS3Bucket: IBucket;
  readonly logS3Prefix: string;
  readonly kafkaTopics: string;
  readonly kafkaBrokers: string;
  readonly s3SinkConnectorRole: IRole;
  readonly maxWorkerCount: number;
  readonly minWorkerCount: number;
  readonly workerMcuCount: number;
  readonly pluginUrl: string;
  readonly kafkaConnectVersion: string;
  readonly rotateIntervalMS: number;
  readonly customConnectorConfiguration: string;
  readonly flushSize: number;
}

export function createS3SinkConnectorCustomResource(
  scope: Construct,
  props: S3SinkConnectorCustomResourceProps,
): Resource {
  const fn = createS3SinkConnectorLambda(scope, {
    logS3Bucket: props.logS3Bucket,
    pluginS3Bucket: props.pluginS3Bucket,
    connectorRole: props.s3SinkConnectorRole,
  });

  const provider = new Provider(
    scope,
    's3SinkConnectorCustomResourceProvider',
    {
      onEventHandler: fn,
      logRetention: RetentionDays.FIVE_DAYS,
    },
  );
  const stackShortId = getShortIdOfStack(Stack.of(scope));
  const cr = new CustomResource(scope, 's3SinkConnectorCustomResource', {
    serviceToken: provider.serviceToken,
    properties: {
      subnetIds: props.subnetIds,
      dataS3Bucket: props.dataS3Bucket.bucketName,
      dataS3Prefix: props.dataS3Prefix,
      pluginS3Bucket: props.pluginS3Bucket.bucketName,
      pluginS3Prefix: props.pluginS3Prefix,
      logS3Bucket: props.logS3Bucket.bucketName,
      logS3Prefix: props.logS3Prefix,
      kafkaTopics: props.kafkaTopics,
      kafkaBrokers: props.kafkaBrokers,
      securityGroupId: props.securityGroup.securityGroupId,
      s3SinkConnectorRole: props.s3SinkConnectorRole.roleArn,
      maxWorkerCount: props.maxWorkerCount,
      minWorkerCount: props.minWorkerCount,
      workerMcuCount: props.workerMcuCount,
      pluginUrl: props.pluginUrl,
      kafkaConnectVersion: props.kafkaConnectVersion,
      rotateIntervalMS: props.rotateIntervalMS,
      customConnectorConfiguration: props.customConnectorConfiguration,
      flushSize: props.flushSize,
      stackShortId: stackShortId,
    },
  });

  return cr;
}

function createS3SinkConnectorLambda(
  scope: Construct,
  props: {
    logS3Bucket: IBucket;
    pluginS3Bucket: IBucket;
    connectorRole: IRole;
  },
): NodejsFunction {
  const role = createRoleForS3SinkConnectorCustomResourceLambda(scope, {
    logS3BucketName: props.logS3Bucket.bucketName,
    pluginS3BucketName: props.pluginS3Bucket.bucketName,
    connectorRole: props.connectorRole,
  });

  const fn = new NodejsFunction(scope, 's3SinkConnectorCustomResourceLambda', {
    runtime: Runtime.NODEJS_16_X,
    entry: join(
      __dirname,
      'custom-resource',
      'kafka-s3-sink-connector',
      'index.ts',
    ),
    handler: 'handler',
    memorySize: 256,
    timeout: Duration.minutes(15),
    logRetention: RetentionDays.ONE_WEEK,
    role,
    environment: {
      ... POWERTOOLS_ENVS,
    },
  });
  fn.node.addDependency(role);
  addCfnNagSuppressRules(fn.node.defaultChild as CfnResource, [
    {
      id: 'W89',
      reason:
        'Lambda is used as custom resource, ignore VPC settings',
    },

    {
      id: 'W92',
      reason:
        'Lambda is used as custom resource, ignore setting ReservedConcurrentExecutions',
    },
  ]);

  return fn;
}
