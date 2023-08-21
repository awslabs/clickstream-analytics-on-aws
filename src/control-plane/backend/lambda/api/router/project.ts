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
import { defaultOrderValueValid, defaultPageValueValid, isEmails, isProjectExisted, isProjectNotExisted, isRequestIdExisted, isValidEmpty, isXSSRequest, validMatchParamId, validate } from '../common/request-valid';
import { ProjectServ } from '../service/project';

const router_project = express.Router();
const projectServ: ProjectServ = new ProjectServ();

router_project.get(
  '/:id/dashboards',
  validate([
    query().custom((value: any, { req }: any) => defaultPageValueValid(value, {
      req,
      location: 'body',
      path: '',
    }))
      .custom((value: any, { req }: any) => defaultOrderValueValid(value, {
        req,
        location: 'body',
        path: '',
      })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return projectServ.listDashboards(req, res, next);
  });

router_project.get(
  '/dashboard/:dashboardId',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return projectServ.getDashboard(req, res, next);
  });

router_project.post(
  '/:id/dashboard',
  validate([
    body().custom(isValidEmpty).custom(isXSSRequest),
    body('ownerPrincipal').custom(isValidEmpty),
    body('defaultDataSourceArn').custom(isValidEmpty),
    param('id').custom(isProjectExisted),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return projectServ.createDashboard(req, res, next);
  });

router_project.delete(
  '/dashboard/:dashboardId',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return projectServ.deleteDashboard(req, res, next);
  });

router_project.get(
  '',
  validate([
    query().custom((value: any, { req }: any) => defaultPageValueValid(value, {
      req,
      location: 'body',
      path: '',
    }))
      .custom((value: any, { req }: any) => defaultOrderValueValid(value, {
        req,
        location: 'body',
        path: '',
      })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return projectServ.list(req, res, next);
  });

router_project.post(
  '',
  validate([
    body().custom(isValidEmpty).custom(isXSSRequest),
    body('emails').custom(isEmails),
    body('id').custom(isProjectNotExisted),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return projectServ.create(req, res, next);
  });

router_project.get('/:id', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  return projectServ.details(req, res, next);
});

router_project.put(
  '/:id',
  validate([
    body().custom(isValidEmpty),
    body('id')
      .custom(isProjectExisted)
      .custom((value, { req }) => validMatchParamId(value, {
        req,
        location: 'body',
        path: '',
      })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return projectServ.update(req, res, next);
  });

router_project.delete(
  '/:id',
  validate([
    param('id').custom(isProjectExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return projectServ.delete(req, res, next);
  });


router_project.get('/verification/:id', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  return projectServ.verification(req, res, next);
});

export {
  router_project,
};
