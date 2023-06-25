
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
import { CfnResource, CustomResource, Duration } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { addCfnNagSuppressRules, rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions } from '../common/cfn-nag';
import { createLambdaRole } from '../common/lambda';
import { POWERTOOLS_ENVS } from '../common/powertools';

export interface GetIntervalProps {
  readonly expression: string;
  readonly evaluationPeriods?: number;
}

export class GetInterval extends Construct {
  public readonly intervalCustomResource: CustomResource;
  constructor(scope: Construct, id: string, props: GetIntervalProps) {
    super(scope, id);
    this.intervalCustomResource = createGetIntervalCustomResource(scope, id + 'GetInterval', props);
  }

  public getIntervalSeconds(): string {
    return this.intervalCustomResource.getAttString('intervalSeconds');
  }
}

function createGetIntervalCustomResource(
  scope: Construct,
  id: string,
  props: GetIntervalProps,
): CustomResource {
  const fn = createGetIntervalResourceLambda(scope, id);
  const provider = new Provider(
    scope,
    id + 'CustomResourceProvider',
    {
      onEventHandler: fn,
      logRetention: RetentionDays.FIVE_DAYS,
    },
  );
  const cr = new CustomResource(scope, id + 'CustomResource', {
    serviceToken: provider.serviceToken,
    properties: {
      expression: props.expression,
      evaluationPeriods: props.evaluationPeriods || '1',
      version: new Date().getTime(),
    },
  });
  return cr;
}


function createGetIntervalResourceLambda(scope: Construct, id: string): NodejsFunction {
  const role = createLambdaRole(scope, id + 'LambdaRole', false, []);
  const fn = new NodejsFunction(scope, id + 'Lambda', {
    runtime: Runtime.NODEJS_18_X,
    entry: join(
      __dirname,
      'custom-resource',
      'get-interval',
      'index.ts',
    ),
    handler: 'handler',
    memorySize: 256,
    timeout: Duration.seconds(10),
    logRetention: RetentionDays.ONE_WEEK,
    role,
    environment: {
      ...POWERTOOLS_ENVS,

    },
  });

  fn.node.addDependency(role);
  addCfnNagSuppressRules(fn.node.defaultChild as CfnResource, [
    ...rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions('get-interval-custom-resource'),
  ]);
  return fn;
}

