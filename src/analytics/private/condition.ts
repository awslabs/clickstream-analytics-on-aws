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

import { CfnCondition, Stack, Fn } from 'aws-cdk-lib';
import { Construct } from 'constructs';

function getOrCreate(scope: Construct, uniqueid: string, parameterId: string, not: boolean = false): CfnCondition {
  const stack = Stack.of(scope);
  return stack.node.tryFindChild(uniqueid) as CfnCondition ??
    new CfnCondition(scope, uniqueid, {
      expression:
            not ? Fn.conditionNot(Fn.conditionEquals(parameterId, '')) : Fn.conditionEquals(parameterId, ''),
    });
}

export function getOrCreateNoWorkgroupIdCondition(scope: Construct, workgroupId: string): CfnCondition {
  return getOrCreate(scope, 'NoWorkgroupIdCondition', workgroupId);
}

export function getOrCreateWithWorkgroupIdCondition(scope: Construct, workgroupId: string): CfnCondition {
  return getOrCreate(scope, 'WithWorkgroupIdCondition', workgroupId, true);
}

export function getOrCreateNoNamespaceIdCondition(scope: Construct, namespaceId: string): CfnCondition {
  return getOrCreate(scope, 'NoNamespaceIdCondition', namespaceId);
}

export function getOrCreateWithNamespaceIdCondition(scope: Construct, namespaceId: string): CfnCondition {
  return getOrCreate(scope, 'WithNamespaceIdCondition', namespaceId, true);
}