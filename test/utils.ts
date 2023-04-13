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

import { Match, Template } from 'aws-cdk-lib/assertions';

export function genString(length: number): string {
  let c: string[] = [];
  for (let i =0; i<length; i++) {
    c.push('a');
  }
  return c.join('');
}

export const RefAnyValue = {
  Ref: Match.anyValue(),
};

export function findResourceByCondition(template: Template, condition: string) {
  const allResources = template.toJSON().Resources;
  for (const key of Object.keys(allResources)) {
    const resource = allResources[key];
    if (resource.Condition == condition) {
      return resource;
    }
  }
  return;
}

export function findFirstResourceByKeyPrefix(
  template: Template,
  type: string,
  keyPrefix: string,
) {
  const allResources = template.toJSON().Resources;
  for (const key of Object.keys(allResources)) {
    const resource = allResources[key];
    if (resource.Type == type && key.startsWith(keyPrefix)) {
      return {
        resource,
        key,
      };
    }
  }
  return {
    resource: undefined,
    key: undefined,
  };
}

export function getParameter(template: Template, param: string) {
  return template.toJSON().Parameters[param];
}

export function getParameterNamesFromParameterObject(paramObj: any): string[] {
  const allParams: string[] = [];
  for (const k of Object.keys(paramObj)) {
    allParams.push(paramObj[k].Ref);
  }
  return allParams;
}

export function findFirstResource(template: Template, type: string) {
  const allResources = template.toJSON().Resources;
  for (const key of Object.keys(allResources)) {
    const resource = allResources[key];
    if (resource.Type == type) {
      return { resource, key };
    }
  }
  return { resource: undefined, key: undefined };
}

export function findResources(template: Template, type: string) {
  const resources: any[] = [];
  const allResources = template.toJSON().Resources;
  for (const key of Object.keys(allResources)) {
    const r = allResources[key];
    if (r.Type == type) {
      resources.push(r);
    }
  }
  return resources;
}

export function findConditionByName(template: Template, conditionName: string) {
  const allConditions = template.toJSON().Conditions;
  return allConditions[conditionName];
}