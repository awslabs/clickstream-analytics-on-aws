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

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../common/powertools';
import { ApiFail, ApiSuccess } from '../common/types';
import { paginateData } from '../common/utils';
import { IPlugin } from '../model/plugin';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();

export class MetadataServ {
  public async list(req: any, res: any, next: any) {
    try {
      const { type, order, pageNumber, pageSize } = req.query;
      const result = await store.listPlugin(type, order);
      return res.json(new ApiSuccess({
        totalCount: result.length,
        items: paginateData(result, true, pageSize, pageNumber),
      }));
    } catch (error) {
      next(error);
    }
  };

  public async add(req: any, res: any, next: any) {
    try {
      req.body.operator = res.get('X-Click-Stream-Operator');
      req.body.id = uuidv4().replace(/-/g, '');
      const plugin: IPlugin = req.body;
      const id = await store.addPlugin(plugin);
      return res.status(201).json(new ApiSuccess({ id }, 'Plugin created.'));
    } catch (error) {
      next(error);
    }
  };

  public async details(req: any, res: any, next: any) {
    try {
      const { id } = req.params;
      const result = await store.getPlugin(id);
      if (!result) {
        logger.warn(`No Plugin with ID ${id} found in the databases while trying to retrieve a Plugin`);
        return res.status(404).json(new ApiFail('Plugin not found'));
      }
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  };

  public async update(req: any, res: any, next: any) {
    try {
      req.body.operator = res.get('X-Click-Stream-Operator');
      let plugin: IPlugin = req.body as IPlugin;
      await store.updatePlugin(plugin);
      return res.status(201).json(new ApiSuccess(null, 'Plugin updated.'));
    } catch (error) {
      if ((error as Error).name === 'ConditionalCheckFailedException') {
        return res.status(400).json(new ApiFail('The bounded plugin does not support modification.'));
      }
      next(error);
    }
  }

  public async delete(req: any, res: any, next: any) {
    try {
      const { id } = req.params;
      const operator = res.get('X-Click-Stream-Operator');
      await store.deletePlugin(id, operator);
      return res.status(200).json(new ApiSuccess(null, 'Plugin deleted.'));
    } catch (error) {
      if ((error as Error).name === 'ConditionalCheckFailedException') {
        return res.status(400).json(new ApiFail('The bounded plugin does not support deleted.'));
      }
      next(error);
    }
  };
}