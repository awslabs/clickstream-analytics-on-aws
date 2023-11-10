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
import { PluginType } from '../common/types';

export interface IPlugin {
  readonly id: string;
  readonly type: string;
  readonly prefix: string;

  readonly name: string;
  readonly description: { [key: string]: string };
  readonly jarFile: string;
  readonly dependencyFiles: string[];
  readonly mainFunction: string;
  readonly pluginType: PluginType;
  readonly builtIn: boolean;
  /**
   * Record the binding count of plugin.
   * bind by pipeline: +1
   * unbind by pipeline: -1
   */
  bindCount: number;

  readonly createAt: number;
  readonly updateAt: number;
  readonly operator: string;
  readonly deleted: boolean;
}

export interface IPluginList {
  totalCount: number;
  items: IPlugin[];
}