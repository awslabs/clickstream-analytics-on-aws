/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { Aws, Fn, Stack } from 'aws-cdk-lib';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export function createLogGroupWithKmsKey(
  scope: Construct,
  props: {
    prefix?: string;
    retention?: RetentionDays;
  },
) {
  const shortId = Fn.select(0, Fn.split('-', Fn.select(2, Fn.split('/', Stack.of(scope).stackId))));
  const logGroupName = `${props.prefix ?? 'clickstream-loggroup'}-${shortId}`;
  const logGroupKmsKey = new Key(scope, 'LogGroupKmsKey', {
    description: 'KMS key for log group encryption',
    enableKeyRotation: true,
  });
  const logGroup = new LogGroup(scope, 'LogGroup', {
    logGroupName,
    encryptionKey: logGroupKmsKey,
    retention: props.retention ?? RetentionDays.SIX_MONTHS,
  });
  const policyStatement = new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['kms:Encrypt*', 'kms:Decrypt*', 'kms:ReEncrypt*', 'kms:GenerateDataKey*', 'kms:DescribeKey'],
    principals: [new ServicePrincipal('logs.amazonaws.com')],
    resources: ['*'],
    conditions: {
      ArnLike: {
        'kms:EncryptionContext:aws:logs:arn': `arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:log-group:${logGroupName}`,
      },
    },
  });
  logGroupKmsKey.addToResourcePolicy(policyStatement);
  return logGroup;
}
