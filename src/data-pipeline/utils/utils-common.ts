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

export function getSinkTableLocationPrefix(s3Prefix: string, projectId: string, tableName: string): string {
  return `${s3Prefix}${projectId}/${tableName}/`;
}

export function getPluginS3Prefix(pipelineS3Prefix:string, stackId: string, projectId: string, type: string = 'custom-plugins') {
  return `${pipelineS3Prefix}${stackId}/${projectId}/${type}/`;
}