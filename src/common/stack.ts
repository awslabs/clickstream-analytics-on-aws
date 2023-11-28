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

import { Application } from '@aws-cdk/aws-servicecatalogappregistry-alpha';
import { Aws, CfnCondition, CfnResource, Fn, Stack } from 'aws-cdk-lib';
import { Parameters } from './parameters';

export function getShortIdOfStack(stack: Stack): string {
  return Fn.select(0, Fn.split('-', Fn.select(2, Fn.split('/', stack.stackId))));
}

export function getShortIdOfStackWithRegion(stack: Stack): string {
  return `${Aws.REGION}-${getShortIdOfStack(stack)}`;
}

export function associateApplicationWithStack(stack: Stack): void {
  const appRegistryApplicationArn = Parameters.createAppRegistryApplicationArnParameters(stack).valueAsString;
  const application = Application.fromApplicationArn(stack, 'ServiceCatalogApplication', appRegistryApplicationArn);
  application.associateApplicationWithStack(stack);
  (stack.node.findChild('AppRegistryAssociation') as CfnResource).cfnOptions.condition = new CfnCondition(stack, 'ApplicationArnCondition', {
    expression: Fn.conditionNot(Fn.conditionEquals(appRegistryApplicationArn, '')),
  });
}
