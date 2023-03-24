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

import { logger } from '../common/powertools';
import { ApiFail, ApiSuccess } from '../common/request-valid';
import { tryToJson } from '../common/utils';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();

export class DictionaryServ {

  public async details(req: any, res: any, next: any) {
    try {
      const { name } = req.params;
      const result = await store.getDictionary(name);
      if (!result) {
        logger.warn(`No Dictionary with Name ${name} found in the databases while trying to retrieve a Dictionary`);
        return res.status(404).send(new ApiFail('Dictionary not found'));
      }
      result.data = tryToJson(result.data);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }

  public async list(_req: any, res: any, next: any) {
    try {
      const result = await store.listDictionary();
      for (var i = 0; i < result?.length; i++) {
        result[i].data = tryToJson(result[i].data);
      }
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  };
}