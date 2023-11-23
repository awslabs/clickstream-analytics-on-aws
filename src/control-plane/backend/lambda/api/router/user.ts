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
import { isEmails, isRequestIdExisted, isUserValid, isValidEmpty, isXSSRequest, validate } from '../common/request-valid';
import { UserService } from '../service/user';

const router_user = express.Router();
const userServ: UserService = new UserService();

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
    body('id').custom(isEmails),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return userServ.add(req, res, next);
  });

router_user.get(
  '/details',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return userServ.details(req, res, next);
  });

router_user.put(
  '/:id',
  validate([
    body('id').custom(isUserValid),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return userServ.update(req, res, next);
  });

router_user.delete(
  '/:id',
  validate([
    param('id').custom(isUserValid),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return userServ.delete(req, res, next);
  });

router_user.get(
  '/settings',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return userServ.getSettings(req, res, next);
  });

router_user.post(
  '/settings',
  validate([
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return userServ.updateSettings(req, res, next);
  });

export {
  router_user,
};
