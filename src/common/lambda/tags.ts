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
import { aws_sdk_client_common_config } from '@aws/clickstream-base-lib';
import { LambdaClient, ListTagsCommand } from '@aws-sdk/client-lambda';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { Context } from 'aws-lambda';
import { Construct } from 'constructs';

const client = new LambdaClient({
  ...aws_sdk_client_common_config,
});

export async function getFunctionTags(context: Context): Promise<Record<string, string> | undefined> {
  const functionArn = context.invokedFunctionArn;

  const input = { // ListTagsRequest
    Resource: functionArn, // required
  };
  const command = new ListTagsCommand(input);
  const response = await client.send(command);

  const tags: Record<string, string> | undefined = response.Tags;
  if (tags) {
    for (const k of Object.keys(tags)) {
      if (k.startsWith('aws:')) {
        delete tags[k];
      }
    }
  }
  return tags;
}

export function attachListTagsPolicyForFunction(scope: Construct, id: string, fn: IFunction): Policy {
  const listTagsPolicy = new Policy(scope, id + 'listTagsPolicy');
  listTagsPolicy.addStatements(new PolicyStatement({
    actions: [
      'lambda:ListTags',
    ],
    resources: [
      fn.functionArn,
    ],
  }));
  if (fn.role) {
    listTagsPolicy.attachToRole(fn.role);
  }
  return listTagsPolicy;
}