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
// import { validate } from '../common/request-valid';
import { ReportingServ } from '../service/reporting';
import { logger } from '../common/powertools';

const reporting_project = express.Router();
const reportingServ: ReportingServ = new ReportingServ();

reporting_project.post(
  '',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {

    logger.info('start to create quicksight report')
    return reportingServ.createFunnelVisual(req, res, next);
  });

export {
  reporting_project,
};
