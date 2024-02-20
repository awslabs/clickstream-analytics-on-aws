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
import { sayHello } from '@clickstream/base-lib';
import { DEFAULT_ADMIN_ROLE_NAMES, DEFAULT_ANALYST_READER_ROLE_NAMES, DEFAULT_ANALYST_ROLE_NAMES, DEFAULT_OPERATOR_ROLE_NAMES, DEFAULT_ROLE_JSON_PATH } from '../common/constants';
import { SolutionInfo } from '../common/solution-info-ln';
import { ApiFail, ApiSuccess } from '../common/types';
import { getRoleFromToken, getTokenFromRequest } from '../common/utils';
import { IUser, IUserSettings } from '../model/user';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();

export class UserService {
  public async list(_req: any, res: any, next: any) {
    try {
      const result = await store.listUser();
      return res.json(new ApiSuccess({
        totalCount: result.length,
        items: result,
      }));
    } catch (error) {
      next(error);
    }
  };

  public async add(req: any, res: any, next: any) {
    try {
      req.body.operator = res.get('X-Click-Stream-Operator');
      const user: IUser = req.body;
      const ddbUser = await store.getUser(user.id);
      if (ddbUser) {
        return res.status(400).json(new ApiFail('User already existed.'));
      }
      const id = await store.addUser(user);
      return res.status(201).json(new ApiSuccess({ id }, 'User created.'));
    } catch (error) {
      next(error);
    }
  };

  public async details(req: any, res: any, next: any) {
    sayHello();
    try {
      const { id } = req.query;
      if (!id) {
        const noIdentityUser: IUser = {
          id: id,
          type: 'USER',
          prefix: 'USER',
          name: id,
          roles: [],
          createAt: Date.now(),
          updateAt: Date.now(),
          operator: 'FromToken',
          deleted: false,
        };
        return res.json(new ApiSuccess(noIdentityUser));
      }
      const ddbUser = await store.getUser(id);
      if (ddbUser) {
        return res.json(new ApiSuccess(ddbUser));
      } else {
        const decodedToken = getTokenFromRequest(req);
        const rolesInToken = await getRoleFromToken(decodedToken);
        const tokenUser: IUser = {
          id: id,
          type: 'USER',
          prefix: 'USER',
          name: id,
          roles: rolesInToken,
          createAt: Date.now(),
          updateAt: Date.now(),
          operator: 'FromToken',
          deleted: false,
        };
        return res.json(new ApiSuccess(tokenUser));
      }
    } catch (error) {
      next(error);
    }
  };

  public async update(req: any, res: any, next: any) {
    try {
      if (req.body.operator === SolutionInfo.SOLUTION_SHORT_NAME) {
        return res.status(400).json(new ApiFail('This user was created by solution and not allowed to be modified.'));
      }
      req.body.operator = res.get('X-Click-Stream-Operator');
      const user: IUser = req.body as IUser;
      await store.updateUser(user);
      return res.status(201).json(new ApiSuccess(null, 'User updated.'));
    } catch (error) {
      next(error);
    }
  }

  public async delete(req: any, res: any, next: any) {
    try {
      const { id } = req.params;
      const operator = res.get('X-Click-Stream-Operator');
      const user = await store.getUser(id);
      if (user?.operator === SolutionInfo.SOLUTION_SHORT_NAME) {
        return res.status(400).json(new ApiFail('This user was created by solution and not allowed to be deleted.'));
      }
      await store.deleteUser(id, operator);
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
      const userSettings = await this.getUserSettingsFromDDB();
      return res.status(200).json(new ApiSuccess(userSettings));
    } catch (error) {
      next(error);
    }
  };

  public async updateSettings(req: any, res: any, next: any) {
    try {
      const userSettings: IUserSettings = req.body as IUserSettings;
      await store.updateUserSettings(userSettings);
      return res.status(200).json(new ApiSuccess(null, 'User settings updated.'));
    } catch (error) {
      next(error);
    }
  };

}
