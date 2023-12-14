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

import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { POWERTOOLS_ENVS } from '../common/powertools';

export class SolutionNodejsFunction extends NodejsFunction {

  constructor(scope: Construct, id: string, props?: NodejsFunctionProps) {
    super(scope, id, {
      ...props,
      bundling: props?.bundling ? {
        ...props.bundling,
        externalModules: props.bundling.externalModules?.filter(p => p === '@aws-sdk/*') ?? [],
      } : {
        externalModules: [],
      },
      runtime: Runtime.NODEJS_18_X,
      architecture: Architecture.ARM_64,
      environment: {
        ...POWERTOOLS_ENVS,
        ...(props?.environment ?? {}),
      },
      logRetention: props?.logRetention ?? RetentionDays.ONE_MONTH,
      logFormat: 'JSON',
      applicationLogLevel: props?.applicationLogLevel ?? 'INFO',
    });
  }
}