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

import { AssetHashType, BundlingOptions, DockerImage, Size } from 'aws-cdk-lib';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { SolutionInfo } from './solution-info';

export interface BuildJarProps {
  readonly sourcePath: string;
  readonly jarName: string;
  readonly shadowJar: boolean;
  readonly buildDirectory: string; // base on src/
  readonly destinationBucket: IBucket;
  readonly destinationKeyPrefix: string;
  readonly buildImage?: string;
  readonly additionalBuildArgument?: string;
  readonly remoteFiles?: string[];
  readonly useCommonLib: boolean;
}

export function uploadBuiltInJarsAndRemoteFiles(
  scope: Construct,
  props: BuildJarProps,
) {
  const version = SolutionInfo.SOLUTION_VERSION_SHORT;
  let jarFile = `${props.jarName}-${version}.jar`;
  if (props.shadowJar) {
    jarFile = `${props.jarName}-${version}-all.jar`;
  }

  let commonLibCommands = [
    'cd /tmp/data-pipeline/etl-common/',
    `gradle clean build install -PprojectVersion=${version} -x test -x coverageCheck ${props.additionalBuildArgument ?? ''}`,
  ];

  if (!props.useCommonLib) {
    commonLibCommands = [];
  }

  const shellCommands = [
    'cd /asset-input/',
    'cp -r ./* /tmp/',
    ...commonLibCommands,
    `cd /tmp/${props.buildDirectory}`,
    `gradle clean build -PprojectVersion=${version} -x test -x coverageCheck ${props.additionalBuildArgument ?? ''}`,
    `cp ./build/libs/${jarFile} /asset-output/`,
    'cd /asset-output/',
  ];
  const remoteFiles = props.remoteFiles ?? ['https://cdn.jsdelivr.net/npm/geolite2-city@1.0.0/GeoLite2-City.mmdb.gz'];
  remoteFiles.forEach((url) => {
    const filename = extractFilenameFromUrl(url);
    if (filename.endsWith('.gz')) {shellCommands.push(`wget -O - ${url} | gunzip -c > ${filename.replace(/\.gz$/, '')}`);} else {shellCommands.push(`wget ${url}`);}
  });

  let bundling: BundlingOptions = {
    user: 'gradle',
    image: DockerImage.fromRegistry(props.buildImage ?? 'public.ecr.aws/docker/library/gradle:7.6-jdk17'),
    command: ['sh', '-c', shellCommands.join(' && ')],
  };

  const deployment = new BucketDeployment(scope, 'JarsAndFiles', {
    sources: [
      Source.asset(props.sourcePath, {
        assetHashType: AssetHashType.SOURCE,
        bundling,
      }),
    ],
    destinationBucket: props.destinationBucket,
    destinationKeyPrefix: props.destinationKeyPrefix,
    memoryLimit: 1024, // Increase the memory limit to 1 gigabytes
    ephemeralStorageSize: Size.gibibytes(1), // Increase the ephemeral storage size to 1 gigabytes
  });

  const entryPointJar = `s3://${props.destinationBucket.bucketName}/${props.destinationKeyPrefix}/${jarFile}`;
  const remoteFileKeys = remoteFiles.map((url) => {
    let filename = extractFilenameFromUrl(url);
    if (filename.endsWith('.gz')) {filename = filename.replace(/\.gz$/, '');}
    return `s3://${props.destinationBucket.bucketName}/${props.destinationKeyPrefix}/${filename}`;
  });

  return {
    entryPointJar: entryPointJar,
    files: remoteFileKeys,
    jars: entryPointJar,
    deployment,
  };
}

function extractFilenameFromUrl(url: string): string {
  const pathArray = url.split('/');
  const filename = pathArray[pathArray.length - 1];
  return filename;
}