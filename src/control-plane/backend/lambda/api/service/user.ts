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

import { CreateUserRequest, CreateUserResponse, DeleteUserRequest, GetUserRequest, GetUserResponse, GetUserSettingsResponse, IUser, ListUsersRequest, ListUsersResponse, UpdateUserRequest, UpdateUserSettingsRequest } from '@aws/clickstream-base-lib';
import { DEFAULT_ADMIN_ROLE_NAMES, DEFAULT_ANALYST_READER_ROLE_NAMES, DEFAULT_ANALYST_ROLE_NAMES, DEFAULT_OPERATOR_ROLE_NAMES, DEFAULT_ROLE_JSON_PATH } from '../common/constants';
import { SolutionInfo } from '../common/solution-info-ln';
import { ApiFail, ApiSuccess } from '../common/types';
import { getRoleFromToken, getTokenFromRequest, paginateData } from '../common/utils';
import { CUser, getUserFromRaw } from '../model/user';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();
const cUser = new CUser();

export class UserService {
  public async list(req: any, res: any, next: any) {
    try {
      const request: ListUsersRequest = req.query;
      const raws = await cUser.list();
      const users = getUserFromRaw(raws);
      const response: ListUsersResponse = {
        totalCount: users.length,
        items: paginateData(users, true, request.pageSize ?? 10, request.pageNumber ?? 1),
      };
      return res.json(new ApiSuccess(response));
    } catch (error) {
      next(error);
    }
  };

  public async add(req: any, res: any, next: any) {
    try {
      const request: CreateUserRequest = req.body;
      const iUser: IUser = {
        ...request,
        createAt: Date.now(),
        operator: res.get('X-Click-Stream-Operator'),
      };
      const ddbUser = await cUser.get(iUser.id);
      if (ddbUser) {
        return res.status(400).json(new ApiFail('User already existed.'));
      }
      const id = await cUser.create(iUser);
      const response: CreateUserResponse = { id };
      return res.status(201).json(new ApiSuccess(response, 'User created.'));
    } catch (error) {
      next(error);
    }
  };

  public async details(req: any, res: any, next: any) {
    try {
      const request: GetUserRequest = req.query;
      let response: GetUserResponse = {
        id: '',
        name: '',
        roles: [],
        createAt: Date.now(),
        operator: 'FromToken',
      };
      if (!request.id || request.id.trim() === '') {
        return res.json(new ApiSuccess(response));
      }
      const ddbUser = await cUser.get(request.id);
      if (ddbUser) {
        response = getUserFromRaw([ddbUser])[0];
        return res.json(new ApiSuccess(response));
      } else {
        const decodedToken = getTokenFromRequest(req);
        const rolesInToken = await getRoleFromToken(decodedToken);
        response = {
          id: request.id,
          name: request.id,
          roles: rolesInToken,
          createAt: Date.now(),
          operator: 'FromToken',
        };
        return res.json(new ApiSuccess(response));
      }
    } catch (error) {
      next(error);
    }
  };

  public async update(req: any, res: any, next: any) {
    try {
      const request: UpdateUserRequest = req.body;
      if (request.operator === SolutionInfo.SOLUTION_SHORT_NAME) {
        return res.status(400).json(new ApiFail('This user was created by solution and not allowed to be modified.'));
      }
      const iUser: IUser = {
        ...request,
        createAt: Date.now(),
        operator: res.get('X-Click-Stream-Operator'),
      };
      await cUser.update(iUser);
      return res.status(201).json(new ApiSuccess(null, 'User updated.'));
    } catch (error) {
      next(error);
    }
  }

  public async delete(req: any, res: any, next: any) {
    try {
      const request: DeleteUserRequest = req.body;
      const user = await cUser.get(request.id);
      if (!user) {
        return res.status(404).json(new ApiFail('User does not exist.'));
      }
      if (user?.operator === SolutionInfo.SOLUTION_SHORT_NAME) {
        return res.status(400).json(new ApiFail('This user was created by solution and not allowed to be deleted.'));
      }
      await cUser.delete(request.id, res.get('X-Click-Stream-Operator'));
      return res.status(200).json(new ApiSuccess(null, 'User deleted.'));
    } catch (error) {
      next(error);
    }
  };

  public async getUserSettingsFromDDB() {
    const ddbData = await store.getUserSettings();
    const userSettings = {
      roleJsonPath: ddbData?.roleJsonPath || DEFAULT_ROLE_JSON_PATH,
      adminRoleNames: ddbData?.adminRoleNames || DEFAULT_ADMIN_ROLE_NAMES,
      operatorRoleNames: ddbData?.operatorRoleNames || DEFAULT_OPERATOR_ROLE_NAMES,
      analystRoleNames: ddbData?.analystRoleNames || DEFAULT_ANALYST_ROLE_NAMES,
      analystReaderRoleNames: ddbData?.analystReaderRoleNames || DEFAULT_ANALYST_READER_ROLE_NAMES,
    };
    return userSettings;
  }

  public async getSettings(_req: any, res: any, next: any) {
    try {
      const response: GetUserSettingsResponse = await this.getUserSettingsFromDDB();
      return res.status(200).json(new ApiSuccess(response));
    } catch (error) {
      next(error);
    }
  };

  public async updateSettings(req: any, res: any, next: any) {
    try {
      const request: UpdateUserSettingsRequest = req.body;
      await store.updateUserSettings(request);
      return res.status(200).json(new ApiSuccess(null, 'User settings updated.'));
    } catch (error) {
      next(error);
    }
  };

}
