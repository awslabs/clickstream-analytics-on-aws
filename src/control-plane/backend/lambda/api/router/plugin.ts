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
import { defaultOrderValueValid, defaultPageValueValid, isPluginIdValid, isRequestIdExisted, isValidEmpty, isXSSRequest, validMatchParamId, validate } from '../common/request-valid';
import { PluginServ } from '../service/plugin';

const router_plugin = express.Router();
const pluginServ: PluginServ = new PluginServ();

router_plugin.get(
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
    return pluginServ.list(req, res, next);
  });

router_plugin.post(
  '',
  validate([
    body().custom(isValidEmpty).custom(isXSSRequest),
    body('jarFile').custom(isValidEmpty),
    body('mainFunction').custom(isValidEmpty),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return pluginServ.add(req, res, next);
  });

router_plugin.get(
  '/:id',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return pluginServ.details(req, res, next);
  });

router_plugin.put(
  '/:id',
  validate([
    body('id')
      .custom(isPluginIdValid)
      .custom((value, { req }) => validMatchParamId(value, {
        req,
        location: 'body',
        path: '',
      })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return pluginServ.update(req, res, next);
  });

router_plugin.delete(
  '/:id',
  validate([
    param('id').custom(isPluginIdValid),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return pluginServ.delete(req, res, next);
  });

export {
  router_plugin,
};
