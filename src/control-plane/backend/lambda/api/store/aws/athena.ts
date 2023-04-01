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

import { AthenaClient, ListWorkGroupsCommand, WorkGroupSummary } from '@aws-sdk/client-athena';
import { getPaginatedResults } from '../../common/paginator';
import { WorkGroup } from '../../common/types';

export const listWorkGroups = async (region: string) => {
  const athenaClient = new AthenaClient({ region });

  const records = await getPaginatedResults(async (NextToken: any) => {
    const params: ListWorkGroupsCommand = new ListWorkGroupsCommand({
      NextToken,
    });
    const queryResponse = await athenaClient.send(params);
    return {
      marker: queryResponse.NextToken,
      results: queryResponse.WorkGroups,
    };
  });
  const workGroups: WorkGroup[] = [];
  for (let record of records as WorkGroupSummary[]) {
    workGroups.push({
      name: record.Name ?? '',
      description: record.Description ?? '',
      state: record.State ?? '',
      engineVersion: record.EngineVersion?.EffectiveEngineVersion ?? '',
    });
  }
  return workGroups;
};

export const athenaPing = async (region: string): Promise<boolean> => {
  try {
    const athenaClient = new AthenaClient({ region });
    const params: ListWorkGroupsCommand = new ListWorkGroupsCommand({});
    await athenaClient.send(params);
  } catch (err) {
    if ((err as Error).name === 'UnrecognizedClientException') {
      return false;
    }
  }
  return true;
};