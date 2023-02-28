/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { AccountClient, ListRegionsCommand, Region, RegionOptStatus } from '@aws-sdk/client-account';
import { regionMap } from '../../common/constants';
import { getPaginatedResults } from '../../common/paginator';

export interface ClickStreamRegion {
  readonly name: string;
  readonly cn_name: string;
  readonly value: string;
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
  let regions: ClickStreamRegion[] = [];
  for (let index in records as Region[]) {
    const value = regionMap.get(records[index].RegionName);

    regions.push({
      name: value? value.name: records[index].RegionName,
      cn_name: value? value.cn_name: records[index].RegionName,
      value: records[index].RegionName,
    });
  }
  return regions;
};
