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

import { sleep } from '../../common/utils';

export function getSinkStreamName(projectId: string, appId: string, suffix: string): string {
  return `clickstream_${projectId}_${appId}_sink_${suffix}`.toLowerCase();
}

export function getFlinkApplicationName(projectId: string, appId: string, suffix: string): string {
  return `clickstream_${projectId}_${appId}_flink_${suffix}`.toLowerCase();
}

export function splitString(str: string): string[] {
  if (!str.trim()) { // checks if string is blank or only whitespace characters
    return []; // return an empty array
  } else {
    return str.split(','); // split the string by comma
  }
}

export function removeTrailingSlash(str: string): string {
  if (str.endsWith('/')) {
    return str.slice(0, -1);
  }
  return str;
}

export function getPrefix(source: string): string {
  let parts = source.split('/');
  parts.pop(); // remove the last item
  return parts.join('/');
}

export async function waitForRedshiftIAMRolesUpdating(intervalSec: number) {
  for (const _i of Array(intervalSec).keys()) {
    await sleep(1000);
  }
}

export function getMVName(sql: string): string {
  return sql.split('AUTO REFRESH')[0].split(' ')[3];
}