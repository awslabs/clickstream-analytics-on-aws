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

import { QuickSightClient, ListUsersCommand, User } from '@aws-sdk/client-quicksight';
import { awsAccountId } from '../../common/constants';
import { getPaginatedResults } from '../../common/paginator';

export interface ClickStreamQuickSightUser {
  readonly userName: string;
  readonly role: string;
  readonly arn: string;
  readonly active: string;
  readonly email: string;
}

export const listQuickSightUsers = async () => {
  const quickSightClient = new QuickSightClient({});

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
  const users: ClickStreamQuickSightUser[] = [];
  for (let index in records as User[]) {
    users.push({
      userName: records[index].UserName,
      arn: records[index].Arn,
      email: records[index].Email,
      role: records[index].Role,
      active: records[index].Active,
    });
  }
  return users;
};
