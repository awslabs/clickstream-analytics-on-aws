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
import { defaultOrderValueValid, defaultPageValueValid, isPipelineExisted, isProjectExisted, isRequestIdExisted, isValidEmpty, isXSSRequest, validMatchParamId, validate } from '../common/request-valid';
import { PipelineServ } from '../service/pipeline';

const router_pipeline: express.Router = express.Router();
const pipelineServ: PipelineServ = new PipelineServ();


router_pipeline.post(
  '',
  validate([
    body().custom(isValidEmpty).custom(isXSSRequest),
    body('projectId').custom(isProjectExisted),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return pipelineServ.add(req, res, next);
  });

router_pipeline.post(
  '/:id/retry',
  validate([
    query('pid').custom(isProjectExisted),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return pipelineServ.retry(req, res, next);
  });

router_pipeline.post(
  '/:id/upgrade',
  validate([
    query('pid').custom(isProjectExisted),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return pipelineServ.upgrade(req, res, next);
  });

router_pipeline.get(
  '',
  validate([
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
    return pipelineServ.list(req, res, next);
  });

router_pipeline.get(
  '/:id',
  validate([
    query('pid').custom(isProjectExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return pipelineServ.details(req, res, next);
  });

router_pipeline.get(
  '/:id/extend',
  validate([
    query('pid').custom(isProjectExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return pipelineServ.extend(req, res, next);
  });


router_pipeline.put(
  '/:id',
  validate([
    body('pipelineId').custom(isValidEmpty)
      .custom((value, { req }) => validMatchParamId(value, {
        req,
        location: 'body',
        path: '',
      })),
    body('projectId')
      .custom(isProjectExisted),
    body('version').custom(isValidEmpty),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return pipelineServ.update(req, res, next);
  });

router_pipeline.delete(
  '/:id',
  validate([
    param('id').custom((value, { req }) => isPipelineExisted(value, {
      req,
      location: 'query',
      path: 'pid',
    })),
    query('pid')
      .custom(isProjectExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return pipelineServ.delete(req, res, next);
  });


export {
  router_pipeline,
};
