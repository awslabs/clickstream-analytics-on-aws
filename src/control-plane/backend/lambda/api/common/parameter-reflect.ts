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

import { JSONObject } from 'ts-json-object';
import { SolutionVersion } from './solution-info-ln';

export const __supportVersionsKey: Symbol = Symbol('supportVersions');

export type ValueWithVersionFn = (stack: JSONObject) => any;

export function supportVersions(versions: SolutionVersion[]) {
  return function(target:any, key:string) : void | any {
    Reflect.defineMetadata(__supportVersionsKey, versions, target, key);
  };
}

export function isSupportVersion(stack: JSONObject, key: string, version: SolutionVersion) : boolean {
  const versions = Reflect.getMetadata(__supportVersionsKey, Object.getPrototypeOf(stack), key) as SolutionVersion[];
  let startVersion = SolutionVersion.ANY;
  let endVersion = SolutionVersion.ANY;
  if (!versions || versions.length == 0) {
    return true;
  } else if (versions.length == 1) {
    startVersion = versions[0];
    endVersion = versions[0];
  } else if (versions.length > 1) {
    startVersion = versions[0];
    endVersion = versions[1];
  }
  const startCheck = startVersion.equalTo(SolutionVersion.ANY) || version.greaterThanOrEqualTo(startVersion);
  const endCheck = endVersion.equalTo(SolutionVersion.ANY) || version.lessThanOrEqualTo(endVersion);
  return startCheck && endCheck;
}
