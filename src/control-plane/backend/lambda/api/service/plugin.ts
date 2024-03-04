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

import { CreatePluginRequest, CreatePluginResponse, DeletePluginRequest, IPlugin, ListPluginsRequest, ListPluginsResponse } from '@aws/clickstream-base-lib';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { ApiFail, ApiSuccess } from '../common/types';
import { paginateData } from '../common/utils';
import { CPlugin, getPluginFromRaw } from '../model/plugin';

const cPlugin = new CPlugin();

export class PluginServ {
  public async list(req: any, res: any, next: any) {
    try {
      const request: ListPluginsRequest = req.query;
      const raws = await cPlugin.list(request.type, request.order);
      const result = getPluginFromRaw(raws);
      const response: ListPluginsResponse = {
        totalCount: result.length,
        items: paginateData(result, true, request.pageSize ?? 10, request.pageNumber ?? 1),
      };
      return res.json(new ApiSuccess(response));
    } catch (error) {
      next(error);
    }
  };

  public async add(req: any, res: any, next: any) {
    try {
      const request: CreatePluginRequest = req.body;
      const iPlugin: IPlugin = {
        ...request,
        id: uuidv4().replace(/-/g, ''),
        builtIn: false,
        createAt: Date.now(),
      };
      const id = await cPlugin.create(iPlugin, res.get('X-Click-Stream-Operator'));
      const response: CreatePluginResponse = { id };
      return res.status(201).json(new ApiSuccess(response, 'Plugin created.'));
    } catch (error) {
      next(error);
    }
  };

  public async delete(req: any, res: any, next: any) {
    try {
      const request: DeletePluginRequest = req.params;
      await cPlugin.delete(request.pluginId, res.get('X-Click-Stream-Operator'));
      return res.status(200).json(new ApiSuccess(null, 'Plugin deleted.'));
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        return res.status(400).json(new ApiFail('The bounded plugin does not support deleted.'));
      }
      next(error);
    }
  };
}