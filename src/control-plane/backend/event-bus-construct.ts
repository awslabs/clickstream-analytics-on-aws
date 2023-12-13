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
import { Aws, Duration, Stack } from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { AccountPrincipal, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime, IFunction, Tracing, Architecture } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { LambdaFunctionNetworkProps } from './click-stream-api';
import { createLambdaRole } from '../../common/lambda';
import { POWERTOOLS_ENVS } from '../../common/powertools';
import { createDLQueue } from '../../common/sqs';
import { getShortIdOfStack } from '../../common/stack';
import { SolutionNodejsFunction } from '../../private/function';

export interface BackendEventBusProps {
  readonly clickStreamTable: Table;
  readonly lambdaFunctionNetwork: LambdaFunctionNetworkProps;
}

export class BackendEventBus extends Construct {

  readonly eventBus: EventBus;

  constructor(scope: Construct, id: string, props: BackendEventBusProps) {
    super(scope, id);
    this.eventBus = new EventBus(this, 'ClickstreamEventBus', {
      eventBusName: `ClickstreamEventBus-${getShortIdOfStack(Stack.of(this))}`,
    });
    this.eventBus.addToResourcePolicy(
      new PolicyStatement({
        sid: 'AllowAccountToPutEvents',
        actions: ['events:PutEvents'],
        resources: [this.eventBus.eventBusArn],
        principals: [new AccountPrincipal(Aws.ACCOUNT_ID)],
      }),
    );

    const fn = this.listenStackStatusFn(props);

    const rule = new Rule(this, 'CloudFormationStackStatusChange', {
      eventBus: this.eventBus,
      eventPattern: {
        source: ['aws.cloudformation'],
        detailType: ['CloudFormation Stack Status Change'],
      },
    });

    const queue = createDLQueue(this, 'listenStackStatusDLQ');

    rule.addTarget(new LambdaFunction(fn, {
      deadLetterQueue: queue,
      maxEventAge: Duration.hours(2),
      retryAttempts: 2,
    }));
  }

  private listenStackStatusFn(props: BackendEventBusProps): IFunction {
    const fn = new SolutionNodejsFunction(this, 'ListenStackStatusFunction', {
      description: 'Lambda function for listen stack status of solution Clickstream Analytics on AWS',
      entry: join(__dirname, './lambda/sfn-action/index.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_18_X,
      tracing: Tracing.ACTIVE,
      role: createLambdaRole(this, 'ListenStackStatusFuncRole', true, []),
      architecture: Architecture.X86_64,
      timeout: Duration.seconds(60),
      environment: {
        ...POWERTOOLS_ENVS,
      },
      ...props.lambdaFunctionNetwork,
    });
    return fn;
  }
}