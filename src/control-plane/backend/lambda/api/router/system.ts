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

import express from 'express';
import { SystemService } from '../service/system';

const router_system: express.Router = express.Router();
const systemService: SystemService = new SystemService();

router_system.get(
  '/version',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return systemService.version(req, res, next);
  });

export {
  router_system,
};
