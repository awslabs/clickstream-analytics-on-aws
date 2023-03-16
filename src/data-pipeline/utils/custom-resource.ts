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
import { Arn, ArnFormat, CfnResource, CustomResource, Duration, Stack, Fn } from 'aws-cdk-lib';

import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { addCfnNagSuppressRules, rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions } from '../../common/cfn-nag';
import { createLambdaRole } from '../../common/lambda';
import { POWERTOOLS_ENVS } from '../../common/powertools';
import { getShortIdOfStack } from '../../common/stack';


export interface CopyAssetsCustomResourceProps {
  readonly pipelineS3Bucket: IBucket;
  readonly pipelineS3Prefix: string;
  readonly projectId: string;

  readonly s3PathPluginJars: string;
  readonly s3PathPluginFiles: string;
  readonly entryPointJar: string;
}

export function createCopyAssetsCustomResource(
  scope: Construct,
  props: CopyAssetsCustomResourceProps,
): CustomResource {
  const fn = createCopyAssetsLambda(scope, props);

  const provider = new Provider(
    scope,
    'CopyAssetsCustomResourceProvider',
    {
      onEventHandler: fn,
      logRetention: RetentionDays.FIVE_DAYS,
    },
  );
  const cr = new CustomResource(scope, 'CopyAssetsCustomResource', {
    serviceToken: provider.serviceToken,
    properties: {
      s3PathPluginJars: props.s3PathPluginJars,
      s3PathPluginFiles: props.s3PathPluginFiles,
      entryPointJar: props.entryPointJar,
    },
  });

  return cr;
}

function createCopyAssetsLambda(
  scope: Construct,
  props: {
    projectId: string;
    pipelineS3Bucket: IBucket;
    pipelineS3Prefix: string;
    entryPointJar: string;
  },
): NodejsFunction {

  const copySourceS3Arn = Arn.format(
    {
      resource: Fn.select(2, Fn.split('/', props.entryPointJar)),
      region: '',
      account: '',
      service: 's3',
      arnFormat: ArnFormat.COLON_RESOURCE_NAME,
    },
    Stack.of(scope),
  );

  const role = createLambdaRole(scope, 'CopyAssetsCustomResourceLambdaRole', false, [
    new PolicyStatement({
      actions: [
        's3:GetObject',
      ],
      resources: [`${copySourceS3Arn}/*`],
    }),
  ]);

  props.pipelineS3Bucket.grantReadWrite(role);

  const fn = new NodejsFunction(scope, 'CopyAssetsCustomResourceLambda', {
    runtime: Runtime.NODEJS_16_X,
    entry: join(
      __dirname,
      '..',
      'lambda',
      'copy-assets',
      'index.ts',
    ),
    handler: 'handler',
    memorySize: 256,
    role,
    timeout: Duration.minutes(15),
    logRetention: RetentionDays.ONE_WEEK,
    environment: {
      STACK_ID: getShortIdOfStack(Stack.of(scope)),
      PROJECT_ID: props.projectId,
      PIPELINE_S3_BUCKET_NAME: props.pipelineS3Bucket.bucketName,
      PIPELINE_S3_PREFIX: props.pipelineS3Prefix,
      ... POWERTOOLS_ENVS,
    },
  });

  addCfnNagSuppressRules(fn.node.defaultChild as CfnResource,
    rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions('CDK'));

  return fn;
}

// Custom resource to create partitions during cloudformation deployment,
// so we do not wait the scheduled event to trigger create partitions once a day.
export function createInitPartitionCustomResource(
  scope: Construct,
  partitionSyncerLambda: Function,
): CustomResource {
  const provider = new Provider(
    scope,
    'InitPartitionCustomResourceProvider',
    {
      onEventHandler: partitionSyncerLambda,
      logRetention: RetentionDays.FIVE_DAYS,
    },
  );
  const cr = new CustomResource(scope, 'InitPartitionCustomResource', {
    serviceToken: provider.serviceToken,
  });

  return cr;
}

