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

import { CfnResource } from 'aws-cdk-lib';
import { Queue, QueueEncryption } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { addCfnNagSuppressRules } from './cfn-nag';

export function createDLQueue(scope: Construct, id: string): Queue {
  const queue = new Queue(scope, id, {
    encryption: QueueEncryption.SQS_MANAGED,
    enforceSSL: true,
  });

  addCfnNagSuppressRules((queue.node.defaultChild as CfnResource), [{
    id: 'W48',
    reason: 'SQS already set SQS_MANAGED encryption',
  }]);

  return queue;
}