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
import { Arn, CustomResource, Duration, Stack } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { KinesisProperties } from './model';
import { createLambdaRole } from '../../common/lambda';
import { attachListTagsPolicyForFunction } from '../../common/lambda/tags';
import { getShortIdOfStack } from '../../common/stack';
import { SolutionNodejsFunction } from '../../private/function';
import { SINK_STREAM_NAME_PREFIX } from '../common/constant';

export type KinesisSinkProps = Omit<KinesisProperties, 'streamMode'> & {
  readonly projectId: string;
  readonly appIds: string;
  readonly streamMode: string;
}

export class KinesisSink extends Construct {

  public readonly cr: CustomResource;

  constructor(scope: Construct, id: string, props: KinesisSinkProps) {
    super(scope, id);

    const fn = this.createKinesisManagementFunction(props.projectId);
    const policy = attachListTagsPolicyForFunction(this, 'KinesisManagementFn', fn);

    const provider = new Provider(
      this,
      'KinesisSinkCustomResourceProvider',
      {
        onEventHandler: fn,
        logRetention: RetentionDays.FIVE_DAYS,
      },
    );

    this.cr = new CustomResource(this, 'KinesisSinkCustomResource', {
      serviceToken: provider.serviceToken,
      properties: {
        ...props,
        identifier: getShortIdOfStack(Stack.of(this)),
      },
    });
    this.cr.node.addDependency(policy);
  }

  private createKinesisManagementFunction(projectId: string): IFunction {
    const lambdaRootPath = __dirname + '/../lambdas/custom-resource';
    const streamArnPattern = Arn.format({
      service: 'kinesis',
      resource: 'stream',
      resourceName: `${SINK_STREAM_NAME_PREFIX}${projectId}_*`,
    }, Stack.of(this));
    const fn = new SolutionNodejsFunction(this, 'KinesisManagementFn', {
      entry: join(
        lambdaRootPath,
        'sink-kinesis-data-stream.ts',
      ),
      handler: 'handler',
      memorySize: 256,
      timeout: Duration.minutes(10),
      logRetention: RetentionDays.ONE_WEEK,
      role: createLambdaRole(this, 'KinesisManagementRole', false, [
        new PolicyStatement({
          actions: [
            'kinesis:AddTagsToStream',
            'kinesis:CreateStream',
            'kinesis:DecreaseStreamRetentionPeriod',
            'kinesis:DeleteStream',
            'kinesis:DescribeStream',
            'kinesis:DescribeStreamSummary',
            'kinesis:IncreaseStreamRetentionPeriod',
            'kinesis:ListTagsForStream',
            'kinesis:RemoveTagsFromStream',
            'kinesis:UpdateShardCount',
            'kinesis:UpdateStreamMode',
          ],
          resources: [streamArnPattern],
        }),
        new PolicyStatement({
          actions: ['kinesis:StartStreamEncryption'],
          resources: [
            streamArnPattern,
            Arn.format({
              service: 'kms',
              resource: 'key',
              resourceName: '*',
            }, Stack.of(this)),
          ],
        }),
      ]),
    });
    return fn;
  }
}