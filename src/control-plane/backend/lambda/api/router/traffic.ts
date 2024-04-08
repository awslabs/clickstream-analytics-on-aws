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
import { body, query } from 'express-validator';
import { validate } from '../common/request-valid';
import { TrafficSourceServ } from '../service/traffic';

const router_traffic: express.Router = express.Router();
const trafficSourceServ: TrafficSourceServ = new TrafficSourceServ();

router_traffic.get(
  '/detail',
  validate([
    query('projectId').isString().notEmpty(),
    query('appId').isString().notEmpty(),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return trafficSourceServ.detail(req, res, next);
  });

router_traffic.put(
  '/overwrite',
  validate([
    body('projectId').isString().notEmpty(),
    body('appId').isString().notEmpty(),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return trafficSourceServ.overwrite(req, res, next);
  });

export {
  router_traffic,
};
