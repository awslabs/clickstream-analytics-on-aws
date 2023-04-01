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

import { Tag } from '@aws-sdk/client-ec2';
import { ALBRegionMappingObject } from './types';

function isEmpty(a: any): boolean {
  if (a === '') return true; //Verify empty string
  if (a === 'null') return true; //Verify null string
  if (a === 'undefined') return true; //Verify undefined string
  if (!a && a !== 0 && a !== '') return true; //Verify undefined and null
  if (Array.prototype.isPrototypeOf(a) && a.length === 0) return true; //Verify empty array
  if (Object.prototype.isPrototypeOf(a) && Object.keys(a).length === 0) return true; //Verify empty objects
  return false;
}

function tryToJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch (error) {
    return s;
  }
}

function getValueFromTags(tag: string, tags: Tag[]): string {
  if (!isEmpty(tags)) {
    for (let index in tags as Tag[]) {
      if (tags[index].Key === tag) {
        return tags[index].Value ?? '';
      }
    }
  }
  return '';
}

function getRegionAccount(map: ALBRegionMappingObject, region: string) {
  for (let key in map) {
    if (key === region) {
      return map[key].account;
    }
  }
  return undefined;
}

export {
  isEmpty,
  tryToJson,
  getValueFromTags,
  getRegionAccount,
};