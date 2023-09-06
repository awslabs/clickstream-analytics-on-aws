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
import { body, header, query } from 'express-validator';
import { defaultOrderValueValid, isRequestIdExisted, isValidEmpty, isXSSRequest, validate, validateRole } from '../common/request-valid';
import { IUserRole } from '../common/types';
import { MetadataEventParameterServ, MetadataEventServ, MetadataUserAttributeServ } from '../service/metadata';

const router_metadata = express.Router();
const metadataEventServ: MetadataEventServ = new MetadataEventServ();
const metadataEventParameterServ: MetadataEventParameterServ = new MetadataEventParameterServ();
const metadataUserAttributeServ: MetadataUserAttributeServ = new MetadataUserAttributeServ();

router_metadata.get(
  '/events',
  validateRole([IUserRole.ADMIN, IUserRole.ANALYST]),
  validate([
    query('projectId').custom(isValidEmpty),
    query('appId').custom(isValidEmpty),
    query()
      .custom((value: any, { req }: any) => defaultOrderValueValid(value, {
        req,
        location: 'body',
        path: '',
      })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return metadataEventServ.list(req, res, next);
  });

router_metadata.post(
  '/event',
  validateRole([IUserRole.ADMIN, IUserRole.ANALYST]),
  validate([
    body().custom(isValidEmpty).custom(isXSSRequest),
    body('projectId').custom(isValidEmpty),
    body('appId').custom(isValidEmpty),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return metadataEventServ.add(req, res, next);
  });

router_metadata.get('/event/:name',
  validateRole([IUserRole.ADMIN, IUserRole.ANALYST]),
  validate([
    query('projectId').custom(isValidEmpty),
    query('appId').custom(isValidEmpty),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return metadataEventServ.details(req, res, next);
  });

router_metadata.put(
  '/event',
  validateRole([IUserRole.ADMIN, IUserRole.ANALYST]),
  validate([
    body().custom(isValidEmpty),
    body('projectId').custom(isValidEmpty),
    body('appId').custom(isValidEmpty),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return metadataEventServ.update(req, res, next);
  });

router_metadata.get(
  '/event_parameters',
  validateRole([IUserRole.ADMIN, IUserRole.ANALYST]),
  validate([
    query()
      .custom((value: any, { req }: any) => defaultOrderValueValid(value, {
        req,
        location: 'body',
        path: '',
      })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return metadataEventParameterServ.list(req, res, next);
  });

router_metadata.post(
  '/event_parameter',
  validateRole([IUserRole.ADMIN, IUserRole.ANALYST]),
  validate([
    body().custom(isValidEmpty).custom(isXSSRequest),
    body('projectId').custom(isValidEmpty),
    body('appId').custom(isValidEmpty),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return metadataEventParameterServ.add(req, res, next);
  });

router_metadata.get('/event_parameter/:id', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  return metadataEventParameterServ.details(req, res, next);
});

router_metadata.put(
  '/event_parameter',
  validateRole([IUserRole.ADMIN, IUserRole.ANALYST]),
  validate([
    body().custom(isValidEmpty),
    body('projectId').custom(isValidEmpty),
    body('appId').custom(isValidEmpty),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return metadataEventParameterServ.update(req, res, next);
  });

router_metadata.get(
  '/user_attributes',
  validateRole([IUserRole.ADMIN, IUserRole.ANALYST]),
  validate([
    query('projectId').custom(isValidEmpty),
    query('appId').custom(isValidEmpty),
    query()
      .custom((value: any, { req }: any) => defaultOrderValueValid(value, {
        req,
        location: 'body',
        path: '',
      })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return metadataUserAttributeServ.list(req, res, next);
  });

router_metadata.post(
  '/user_attribute',
  validateRole([IUserRole.ADMIN, IUserRole.ANALYST]),
  validate([
    body().custom(isValidEmpty).custom(isXSSRequest),
    body('projectId').custom(isValidEmpty),
    body('appId').custom(isValidEmpty),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return metadataUserAttributeServ.add(req, res, next);
  });

router_metadata.get('/user_attribute/:id', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  return metadataUserAttributeServ.details(req, res, next);
});

router_metadata.put(
  '/user_attribute',
  validateRole([IUserRole.ADMIN, IUserRole.ANALYST]),
  validate([
    body().custom(isValidEmpty),
    body('projectId').custom(isValidEmpty),
    body('appId').custom(isValidEmpty),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return metadataUserAttributeServ.update(req, res, next);
  });

export {
  router_metadata,
};
