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

import { fetchRemoteUrl } from '../common/fetch';
import { logger } from '../common/powertools';
import { SolutionInfo, SolutionVersion } from '../common/solution-info-ln';
import { ApiSuccess } from '../common/types';
import { getTemplateUrl } from '../common/utils';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();
const consoleTemplateName = process.env.TEMPLATE_FILE!;

export class SystemService {

  public async version(_req: any, res: any, next: any) {
    try {
      const solution = await store.getDictionary('Solution');
      const templateUrl = getTemplateUrl(consoleTemplateName, solution);

      let newVersion = '';
      try {
        const response = await fetchRemoteUrl(templateUrl);
        const jsonData = await response.json();
        const { version, buildString } = this._parseVersionString( jsonData.description);
        logger.debug(`fetched the template ${templateUrl}.`, { version, buildString });
        newVersion = `${version}-${buildString}`;
      } catch (error) {
        logger.warn(`failed to fetch the template from ${templateUrl}`, { error });
      }

      return res.json(new ApiSuccess({
        version: SolutionInfo.SOLUTION_VERSION,
        templateUrl,
        newVersion,
        hasUpdate: SolutionVersion.Of(newVersion).greaterThan(SolutionVersion.Of(SolutionInfo.SOLUTION_VERSION)),
      }));
    } catch (error) {
      next(error);
    }
  };

  _parseVersionString(descriptionStr: string): { version: string | null; buildString: string | null } {
    const versionPattern = /Version\s*v(\d+\.\d+\.\d+)/;
    const buildPattern = /Build\s*([\w-]+)/;

    const versionMatch = descriptionStr.match(versionPattern);
    const buildMatch = descriptionStr.match(buildPattern);

    const version = versionMatch ? versionMatch[1] : null;
    const buildString = buildMatch ? buildMatch[1] : null;

    return { version, buildString };
  }
}
