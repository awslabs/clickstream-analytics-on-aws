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

import { IAMClient, ListRolesCommand, Role } from '@aws-sdk/client-iam';
import { getPaginatedResults } from '../../common/paginator';
import { IamRole } from '../../common/types';

export const listRoles = async (service: string) => {
  const iamClient = new IAMClient({});

  const records = await getPaginatedResults(async (Marker: any) => {
    const params: ListRolesCommand = new ListRolesCommand({
      Marker,
    });
    const queryResponse = await iamClient.send(params);
    return {
      marker: queryResponse.Marker,
      results: queryResponse.Roles,
    };
  });
  const roles: IamRole[] = [];
  for (let record of records as Role[]) {
    if (record.AssumeRolePolicyDocument && record.AssumeRolePolicyDocument.includes(`${service}.amazonaws.com`)) {
      roles.push({
        name: record.RoleName ?? '',
        id: record.RoleId ?? '',
        arn: record.Arn ?? '',
      });
    }
  }
  return roles;
};