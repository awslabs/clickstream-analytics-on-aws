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
import { AssetHashType, BundlingOptions, DockerImage, Fn } from 'aws-cdk-lib';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export function uploadBuiltInSparkJarsAndFiles(
  scope: Construct,
  bucket: IBucket,
  prefix: string,
) {
  const jarFile = 'spark-etl-1.0.0.jar';
  let shellCommands = [
    'cd /asset-input/',
    'cp -r ./* /tmp/',
    'cd /tmp/',
    'gradle clean build -x test -x coverageCheck',
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

  new BucketDeployment(scope, 'SparkJarsAndFiles', {
    sources: [
      Source.asset(path.join(__dirname, '..', 'spark-etl'), {
        assetHashType: AssetHashType.SOURCE,
        bundling,
      }),
    ],
    destinationBucket: bucket,
    destinationKeyPrefix: prefix,

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
  };
}
