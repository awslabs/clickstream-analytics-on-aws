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
import { body, header, param, query } from 'express-validator';
import { defaultOrderValueValid, isMetadataEventExisted, isMetadataEventNotExisted, isRequestIdExisted, isValidEmpty, isXSSRequest, validate } from '../common/request-valid';
import { MetadataEventAttributeServ, MetadataEventServ } from '../service/metadata';

const router_metadata = express.Router();
const metadataEventServ: MetadataEventServ = new MetadataEventServ();
const metadataEventAttributeServ: MetadataEventAttributeServ = new MetadataEventAttributeServ();
// const metadataUserAttributeServ: MetadataUserAttributeServ = new MetadataUserAttributeServ();

router_metadata.get(
  '/events',
  validate([
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
  validate([
    body().custom(isValidEmpty).custom(isXSSRequest),
    body('name').custom(isMetadataEventNotExisted),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return metadataEventServ.add(req, res, next);
  });

router_metadata.get('/event/:name', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  return metadataEventServ.details(req, res, next);
});

router_metadata.put(
  '/event',
  validate([
    body().custom(isValidEmpty),
    body('name')
      .custom(isMetadataEventExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return metadataEventServ.update(req, res, next);
  });

router_metadata.delete(
  '/event/:name',
  validate([
    param('name').custom(isMetadataEventExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return metadataEventServ.delete(req, res, next);
  });

router_metadata.get(
  '/event_attributes',
  validate([
    query()
      .custom((value: any, { req }: any) => defaultOrderValueValid(value, {
        req,
        location: 'body',
        path: '',
      })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return metadataEventAttributeServ.list(req, res, next);
  });

router_metadata.post(
  '/event_attribute',
  validate([
    body().custom(isValidEmpty).custom(isXSSRequest),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return metadataEventAttributeServ.add(req, res, next);
  });

router_metadata.get('/event/:name', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  return metadataEventAttributeServ.details(req, res, next);
});

router_metadata.put(
  '/event',
  validate([
    body().custom(isValidEmpty),
    body('name')
      .custom(isMetadataEventExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return metadataEventAttributeServ.update(req, res, next);
  });

router_metadata.delete(
  '/event/:name',
  validate([
    param('name').custom(isMetadataEventExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return metadataEventAttributeServ.delete(req, res, next);
  });

export {
  router_metadata,
};
