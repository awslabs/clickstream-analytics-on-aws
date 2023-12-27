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

import { checkAttributionAnalysisParameter } from './quicksight/reporting-utils';
import { AttributionSQLParameters } from './quicksight/sql-builder';
import { buildSQLForSinglePointModel } from './quicksight/sql-builder-attribution';
import { AttributionModelType } from '../common/explore-types';
import { logger } from '../common/powertools';
import { ApiFail, ApiSuccess } from '../common/types';

export class AttributionAnalysisService {

  async createAttributionAnalysisVisual(req: any, res: any, next: any) {

    try {
      logger.info('start to create last touch model visuals', { request: req.body });

      const query = req.body;

      const checkResult = checkAttributionAnalysisParameter(query);
      if (!checkResult.success) {
        logger.debug(checkResult.message);
        return res.status(400).json(new ApiFail(checkResult.message));
      }

      if (query.modelType == AttributionModelType.LAST_TOUCH || query.modelType == AttributionModelType.FIRST_TOUCH) {
        await this.createSinglePointModelVisual(query as AttributionSQLParameters);
      }

      return res.status(201).json(new ApiSuccess(''));

    } catch (error) {
      next(error);
    }
  };

  async createSinglePointModelVisual(params: AttributionSQLParameters) {

    //construct parameters to build sql
    // const viewName = getTempResourceName(query.viewName, query.action);
    const sql = buildSQLForSinglePointModel(params);

    logger.debug(`sql of single point model: ${sql}`);

    return sql;

  };

}
