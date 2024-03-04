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
import { IPlugin, PluginType } from '@aws/clickstream-base-lib';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { logger } from '../common/powertools';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();

export interface RawPlugin {
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
  readonly bindCount: number;

  readonly createAt: number;
  readonly updateAt: number;
  readonly operator: string;
  readonly deleted: boolean;
}

export function getPluginFromRaw(raw: RawPlugin[]): IPlugin[] {
  return raw.map((item: RawPlugin) => {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      jarFile: item.jarFile,
      dependencyFiles: item.dependencyFiles,
      mainFunction: item.mainFunction,
      pluginType: item.pluginType,
      builtIn: item.builtIn,
      createAt: item.createAt,
    } as IPlugin;
  });
}

export function getRawPlugin(plugin: IPlugin, operator?: string): RawPlugin {
  return {
    id: plugin.id,
    type: `PLUGIN#${plugin.id}`,
    prefix: 'PLUGIN',
    name: plugin.name,
    description: plugin.description,
    jarFile: plugin.jarFile,
    dependencyFiles: plugin.dependencyFiles,
    mainFunction: plugin.mainFunction,
    pluginType: plugin.pluginType,
    builtIn: plugin.builtIn,
    bindCount: 0,
    createAt: Date.now(),
    updateAt: Date.now(),
    operator: operator ?? '',
    deleted: false,
  };
}

export class CPlugin {

  public async list(type?: string, order?: string): Promise<RawPlugin[]> {
    try {
      return await store.listPlugin(type, order);
    } catch (error) {
      logger.error('Failed to list plugin.', { error });
      throw error;
    }
  }

  public async create(plugin: IPlugin, operator: string): Promise<string> {
    try {
      await store.addPlugin(getRawPlugin(plugin, operator));
      return plugin.id;
    } catch (error) {
      logger.error('Failed to create plugin.', { error });
      throw error;
    }
  }

  public async delete(pluginId: string, operator: string): Promise<boolean> {
    try {
      await store.deletePlugin(pluginId, operator);
      return true;
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        logger.warn('Conditional check failed when delete plugin.', { error });
        return false;
      }
      logger.error('Failed to delete plugin.', { error });
      throw error;
    }
  };
}