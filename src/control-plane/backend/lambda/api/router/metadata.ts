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
import { defaultOrderValueValid, isAppId, isProjectId, isRequestIdExisted, isValidEmpty, isXSSRequest, metadataDisplayLength, validate } from '../common/request-valid';
import { MetadataEventParameterServ, MetadataEventServ, MetadataUserAttributeServ } from '../service/metadata';

const router_metadata = express.Router();
const metadataEventServ: MetadataEventServ = new MetadataEventServ();
const metadataEventParameterServ: MetadataEventParameterServ = new MetadataEventParameterServ();
const metadataUserAttributeServ: MetadataUserAttributeServ = new MetadataUserAttributeServ();

router_metadata.put(
  '/display',
  validate([
    body().custom(isValidEmpty).custom(metadataDisplayLength).custom(isXSSRequest),
    body('projectId').custom(isProjectId),
    body('appId').custom(isAppId),
    body('id').custom(isValidEmpty),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return metadataEventServ.updateDisplay(req, res, next);
  });

router_metadata.get(
  '/pathNodes',
  validate([
    query('projectId').custom(isValidEmpty),
    query('appId').custom(isValidEmpty),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return metadataEventServ.listPathNodes(req, res, next);
  });

router_metadata.get(
  '/events',
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

router_metadata.get('/event/:name',
  validate([
    query('projectId').custom(isValidEmpty),
    query('appId').custom(isValidEmpty),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return metadataEventServ.details(req, res, next);
  });

router_metadata.get(
  '/event_parameters',
  validate([
    query('projectId').custom(isValidEmpty),
    query('appId').custom(isValidEmpty),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return metadataEventParameterServ.list(req, res, next);
  });

router_metadata.get('/event_parameter', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  return metadataEventParameterServ.details(req, res, next);
});

router_metadata.get(
  '/user_attributes',
  validate([
    query('projectId').custom(isValidEmpty),
    query('appId').custom(isValidEmpty),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return metadataUserAttributeServ.list(req, res, next);
  });

router_metadata.get('/user_attribute', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  return metadataUserAttributeServ.details(req, res, next);
});

export {
  router_metadata,
};
