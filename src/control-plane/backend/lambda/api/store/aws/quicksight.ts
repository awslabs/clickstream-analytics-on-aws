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

import { QuickSightClient, ListUsersCommand, User } from '@aws-sdk/client-quicksight';
import { awsAccountId } from '../../common/constants';
import { getPaginatedResults } from '../../common/paginator';
import { QuickSightUser } from '../../common/types';

export const listQuickSightUsers = async (region: string) => {
  const quickSightClient = new QuickSightClient({ region });

  const records = await getPaginatedResults(async (NextToken: any) => {
    const params: ListUsersCommand = new ListUsersCommand({
      AwsAccountId: awsAccountId,
      Namespace: 'default',
      NextToken,
    });
    const queryResponse = await quickSightClient.send(params);
    return {
      marker: queryResponse.NextToken,
      results: queryResponse.UserList,
    };
  });
  const users: QuickSightUser[] = [];
  for (let user of records as User[]) {
    users.push({
      userName: user.UserName ?? '',
      arn: user.Arn ?? '',
      email: user.Email ?? '',
      role: user.Role ?? '',
      active: user.Active ?? false,
    });
  }
  return users;
};

export const quickSightPing = async (region: string): Promise<boolean> => {
  try {
    const quickSightClient = new QuickSightClient({ region });
    const params: ListUsersCommand = new ListUsersCommand({
      AwsAccountId: awsAccountId,
      Namespace: 'default',
    });
    await quickSightClient.send(params);
  } catch (err) {
    if ((err as Error).name === 'UnrecognizedClientException') {
      return false;
    }
  }
  return true;
};
