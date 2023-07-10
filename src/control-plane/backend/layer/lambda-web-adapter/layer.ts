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
import { LayerVersion, Runtime, Code, Architecture } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface LambdaAdapterLayerProps {
  readonly platform?: 'linux/arm64' | 'linux/amd64';
  readonly arch?: 'aarch64' | 'x86_64';
}

export class LambdaAdapterLayer extends LayerVersion {
  constructor(scope: Construct, id: string, props?: LambdaAdapterLayerProps) {
    const platform = props?.platform ?? 'linux/amd64';
    const defaultArch = props?.arch ?? 'x86_64';
    const architecture = props?.arch === 'aarch64' ? Architecture.ARM_64 : Architecture.X86_64;

    super(scope, id, {
      code: Code.fromDockerBuild(path.join(__dirname, '.'), {
        file: 'Dockerfile',
        buildArgs: {
          TARGET_PLATFORM: platform,
          ARCH: defaultArch,
        },
      }),
      compatibleRuntimes: [Runtime.NODEJS_16_X, Runtime.NODEJS_18_X],
      compatibleArchitectures: [architecture],
    });
  }
}