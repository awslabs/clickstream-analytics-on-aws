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

import { AccountClient, ListRegionsCommand, Region, RegionOptStatus } from '@aws-sdk/client-account';
import { getPaginatedResults } from '../../common/paginator';

export interface ClickStreamRegion {
  readonly id: string;
}

export const listRegions = async () => {
  const accountClient = new AccountClient({});
  const records = await getPaginatedResults(async (NextToken: any) => {
    const params: ListRegionsCommand = new ListRegionsCommand({
      RegionOptStatusContains: [
        RegionOptStatus.ENABLED,
        RegionOptStatus.ENABLED_BY_DEFAULT,
        RegionOptStatus.ENABLING,
      ],
      NextToken,
    });
    const queryResponse = await accountClient.send(params);
    return {
      marker: queryResponse.NextToken,
      results: queryResponse.Regions,
    };
  });
  const regions: ClickStreamRegion[] = [];
  for (let region of records as Region[]) {
    if (region.RegionName) {
      regions.push({
        id: region.RegionName,
      });
    }
  }
  return regions;
};
