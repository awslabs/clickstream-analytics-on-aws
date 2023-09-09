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
import { body, header, param } from 'express-validator';
import { isRequestIdExisted, isUserValid, isValidEmpty, isXSSRequest, validate } from '../common/request-valid';
import { UserServ } from '../service/user';

const router_user = express.Router();
const userServ: UserServ = new UserServ();

router_user.get(
  '',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return userServ.list(req, res, next);
  });

router_user.post(
  '',
  validate([
    body().custom(isValidEmpty).custom(isXSSRequest),
    body('role').custom(isValidEmpty),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return userServ.add(req, res, next);
  });

router_user.get(
  '/:uid',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return userServ.details(req, res, next);
  });

router_user.put(
  '/:uid',
  validate([
    body('uid').custom(isUserValid),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return userServ.update(req, res, next);
  });

router_user.delete(
  '/:uid',
  validate([
    param('uid').custom(isUserValid),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return userServ.delete(req, res, next);
  });

export {
  router_user,
};
