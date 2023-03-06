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
import {
  DockerImageAsset,
  NetworkMode,
  Platform,
} from 'aws-cdk-lib/aws-ecr-assets';
import { ContainerImage } from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';

export const createProxyAndWorkerECRImages = (
  scope: Construct,
  platform: Platform,
) => {
  const proxyImage = new DockerImageAsset(scope, `proxy-${platform}`, {
    directory: join(__dirname, '../images/nginx'),
    file: 'Dockerfile',
    networkMode: NetworkMode.HOST,
    buildArgs: {
      PLATFORM_ARG: platform.platform,
    },
    platform,
  });

  const workImage = new DockerImageAsset(scope, `work-${platform}`, {
    directory: join(__dirname, '../images/vector'),
    file: 'Dockerfile',
    networkMode: NetworkMode.HOST,
    buildArgs: {
      PLATFORM_ARG: platform.platform,
    },
    platform,
  });

  return {
    proxyImage: ContainerImage.fromDockerImageAsset(proxyImage),
    workerImage: ContainerImage.fromDockerImageAsset(workImage),
  };
};
