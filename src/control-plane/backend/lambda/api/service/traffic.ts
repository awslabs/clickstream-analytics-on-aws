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

import { ApiSuccess } from '../common/types';
import { ESourceCategory, ITrafficSource } from '../model/traffic';


export class TrafficSourceServ {
  public async detail(req: any, res: any, next: any) {
    try {
      const { projectId, appId } = req.query;
      const sourceCategories = [];
      const category = [
        ESourceCategory.SEARCH,
        ESourceCategory.SOCIAL,
        ESourceCategory.SHOPPING,
        ESourceCategory.VIDEO,
      ];
      for (let i = 0; i < 40; i++) {
        sourceCategories.push({
          url: `domain${i + 1}`,
          source: `name${i + 1}`,
          category: category[i % 4],
          params: [`keywordPattern${i + 1}`],
        });
      }
      const channelGroups = [];
      for (let i = 0; i < 30; i++) {
        channelGroups.push({
          id: `id${i + 1}`,
          channel: `channelGroup${i + 1}`,
          displayName: {
            'en-US': `displayName${i + 1}`,
            'zh-CN': `displayName${i + 1}`,
          },
          description: {
            'en-US': `description${i + 1}`,
            'zh-CN': `description${i + 1}`,
          },
          condition: {
            op: `condition${i + 1}`,
          },
        });
      }
      const trafficSource: ITrafficSource = {
        projectId: projectId,
        appId: appId,
        channelGroups: channelGroups,
        sourceCategories: sourceCategories,
      };
      return res.json(new ApiSuccess(trafficSource));
    } catch (error) {
      next(error);
    }
  };

  public async overwrite(req: any, res: any, next: any) {
    try {
      const trafficSource = req.body;
      console.log('trafficSource', trafficSource);
      return res.json(new ApiSuccess('OK'));
    } catch (error) {
      next(error);
    }
  };

}