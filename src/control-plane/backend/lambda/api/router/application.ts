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
import { body, header, query, param } from 'express-validator';
import { defaultOrderValueValid, defaultPageValueValid, isApplicationExisted, isProjectExisted, isRequestIdExisted, isValidAppId, isValidEmpty, isXSSRequest, validate, validateRole } from '../common/request-valid';
import { IUserRole } from '../common/types';
import { ApplicationServ } from '../service/application';

const router_app = express.Router();
const appServ: ApplicationServ = new ApplicationServ();

router_app.get(
  '',
  validateRole([IUserRole.ADMIN, IUserRole.OPERATOR]),
  validate([
    query('pid').custom(isProjectExisted),
    query().custom((value, { req }) => defaultPageValueValid(value, {
      req,
      location: 'body',
      path: '',
    }))
      .custom((value, { req }) => defaultOrderValueValid(value, {
        req,
        location: 'body',
        path: '',
      })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return appServ.list(req, res, next);
  });

router_app.post(
  '',
  validateRole([IUserRole.ADMIN, IUserRole.OPERATOR]),
  validate([
    body().custom(isValidEmpty).custom(isXSSRequest),
    body('projectId')
      .custom(isProjectExisted),
    body('appId')
      .custom(isValidAppId),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return appServ.add(req, res, next);
  });

router_app.get(
  '/:id',
  validateRole([IUserRole.ADMIN, IUserRole.OPERATOR]),
  validate([
    query('pid').custom(isProjectExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return appServ.details(req, res, next);
  });

router_app.delete(
  '/:id',
  validateRole([IUserRole.ADMIN, IUserRole.OPERATOR]),
  validate([
    param('id').custom((value, { req }) => isApplicationExisted(value, {
      req,
      location: 'query',
      path: 'pid',
    })),
    query('pid')
      .custom(isProjectExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return appServ.delete(req, res, next);
  });


export {
  router_app,
};
