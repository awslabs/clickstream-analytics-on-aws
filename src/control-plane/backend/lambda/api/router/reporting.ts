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
import { body, header } from 'express-validator';
import { logger } from '../common/powertools';
import { isProjectId, isRequestIdExisted, isXSSRequest, validate } from '../common/request-valid';
import { ReportingService } from '../service/reporting';

const reporting_project = express.Router();
const reportingServ: ReportingService = new ReportingService();

reporting_project.post(
  '/funnel',
  validate([
    body().custom(isXSSRequest),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {

    logger.info('start to create quicksight funnel report');
    return reportingServ.createFunnelVisual(req, res, next);
  });

reporting_project.post(
  '/event',
  validate([
    body().custom(isXSSRequest),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {

    logger.info('start to create quicksight event report');
    return reportingServ.createEventVisual(req, res, next);
  });

reporting_project.post(
  '/path',
  validate([
    body().custom(isXSSRequest),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {

    logger.info('start to create quicksight path analysis report');
    return reportingServ.createPathAnalysisVisual(req, res, next);
  });

reporting_project.post(
  '/retention',
  validate([
    body().custom(isXSSRequest),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {

    logger.info('start to create quicksight path analysis report');
    return reportingServ.createRetentionVisual(req, res, next);
  });

reporting_project.post(
  '/warmup',
  validate([
    body().custom(isXSSRequest),
    body('projectId').custom(isProjectId),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return reportingServ.warmup(req, res, next);
  });

reporting_project.post(
  '/clean',
  validate([
    body().custom(isXSSRequest),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return reportingServ.cleanQuickSightResources(req, res, next);
  });

export {
  reporting_project,
};
