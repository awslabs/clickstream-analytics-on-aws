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

import path from 'path';
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import { AssetHashType, BundlingOptions, DockerImage, Fn, Size } from 'aws-cdk-lib';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { logger } from '../../common/powertools';
import { aws_sdk_client_common_config } from '../../common/sdk-client-config';

export function uploadBuiltInFlinkJarsAndFiles(
  scope: Construct,
  bucket: IBucket,
  prefix: string,
) {
  const jarFile = 'flink-etl-1.0.0-all.jar';
  let shellCommands = [
    'cd /asset-input/',
    'cp -r ./* /tmp/',
    'cd /tmp/',
    'gradle clean shadowJar',
    `cp ./build/libs/${jarFile} /asset-output/`,
    'cd /asset-output/',
    'wget https://cdn.jsdelivr.net/npm/geolite2-city@1.0.0/GeoLite2-City.mmdb.gz',
    'gunzip GeoLite2-City.mmdb.gz',
  ];

  let bundling: BundlingOptions = {
    user: 'gradle',
    image: DockerImage.fromRegistry('public.ecr.aws/docker/library/gradle:7.6-jdk11'),
    command: ['sh', '-c', shellCommands.join(' && ')],
  };

  const bucketDeploy = new BucketDeployment(scope, 'FlinkJarsAndFiles', {
    sources: [
      Source.asset(path.join(__dirname, '..', 'flink-etl'), {
        assetHashType: AssetHashType.SOURCE,
        bundling,
      }),
    ],
    destinationBucket: bucket,
    destinationKeyPrefix: prefix,
    memoryLimit: 512,
    ephemeralStorageSize: Size.mebibytes(1024),
  });

  const entryPointJar = Fn.join('/', [
    's3:/',
    bucket.bucketName,
    prefix,
    jarFile,
  ]);
  const geoFile = Fn.join('/', [
    's3:/',
    bucket.bucketName,
    prefix,
    'GeoLite2-City.mmdb',
  ]);

  return {
    entryPointJar: entryPointJar,
    files: geoFile,
    jars: entryPointJar,
    bucketDeploy: bucketDeploy,
    s3KeyFile: prefix+jarFile,
  };
}

export function getS3Client(roleArn: string) {
  return new S3Client({
    ...aws_sdk_client_common_config,
    credentials: fromTemporaryCredentials({
      // Required. Options passed to STS AssumeRole operation.
      params: {
        // Required. ARN of role to assume.
        RoleArn: roleArn,
        // Optional. An identifier for the assumed role session. If skipped, it generates a random
        // session name with prefix of 'aws-sdk-js-'.
        RoleSessionName: 'streaming-ingestion-s3',
        // Optional. The duration, in seconds, of the role session.
        DurationSeconds: 900,
      },
    }),
  });
}

export async function getS3ObjectStatusWithWait(s3Client: S3Client, bucketArn: string, key: string) {
  const items = bucketArn.split(':');
  const bucketName = items[items.length - 1];
  logger.info('getS3ObjectStatusWithWait bucketName:'+bucketName);
  let limit = 30;
  while (limit > 0) {
    limit = limit - 1;
    try {
      const input = { // HeadObjectRequest
        Bucket: bucketName, // required
        Key: key, // required
      };
      const command = new HeadObjectCommand(input);
      await s3Client.send(command);
      return;
    } catch (err) {
      // Wait for 10 seconds
      await new Promise(resolve => setTimeout(resolve, 10000));
      logger.error(JSON.stringify(err));
    }
  }
  if (limit <= 0) {
    throw new Error(`getS3ObjectStatus not found in ${bucketName} for ${key}`);
  }
}
