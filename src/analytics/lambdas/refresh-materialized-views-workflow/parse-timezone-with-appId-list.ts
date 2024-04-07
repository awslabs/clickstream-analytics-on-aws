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

import { logger } from '../../../common/powertools';

/**
 * The lambda function to parse timezone with appId list.
  @returns as below:
  {
  timeZoneWithAppIdList:
    [
        {
          "appId": app1,
          "timezone": "America/Noronha"
        },
        {
          "appId": app2,
          "timezone": "Asia/Shanghai"
        }
    ]
  }
 */
export const handler = async () => {
  try {
    const timeZoneWithAppIdList = process.env.TIMEZONE_WITH_APPID_LIST!;
    const parsedArray = JSON.parse(timeZoneWithAppIdList);
    return {
      timeZoneWithAppIdList: parsedArray,
    };
  } catch (err) {
    logger.error('Error when refresh mv:', { err });
    throw err;
  }
};