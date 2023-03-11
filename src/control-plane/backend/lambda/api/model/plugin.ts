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

export interface Plugin {
  id: string;
  type: string;
  prefix: string;

  name: string;
  description: string;
  status: 'Enabled' | 'Disabled';
  jarFile: string;
  dependencyFiles: string[];
  mainFunction: string;
  pluginType: 'Transform' | 'Enrich';
  builtIn: boolean;
  /**
   * Record the binding count of plugin.
   * bind by pipeline: +1
   * unbind by pipeline: -1
   */
  bindCount: number;

  createAt: number;
  updateAt: number;
  operator: string;
  deleted: boolean;
}

export interface PluginList {
  totalCount: number | undefined;
  items: Plugin[];
}