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

import { ApiFail, ApiSuccess, IUserRole } from '../common/types';
import { getRoleFromToken, getTokenFromRequest } from '../common/utils';
import { IUser } from '../model/user';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();

export class UserServ {
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
    try {
      const { id } = req.query;
      const decodedToken = getTokenFromRequest(req);
      const roleInToken = getRoleFromToken(decodedToken);
      const ddbUser = await store.getUser(id);
      if (!ddbUser) {
        const user: IUser = {
          id: id,
          type: 'USER',
          prefix: 'USER',
          role: roleInToken,
          createAt: Date.now(),
          updateAt: Date.now(),
          operator: res.get('X-Click-Stream-Operator'),
          deleted: false,
        };
        await store.addUser(user);
        return res.json(new ApiSuccess(user));
      }
      if (roleInToken === IUserRole.NO_IDENTITY) {
        return res.json(new ApiSuccess(ddbUser));
      } else if (ddbUser.role !== roleInToken) {
        const newUser = {
          ...ddbUser,
          role: roleInToken,
        };
        await store.updateUser(newUser);
        return res.json(new ApiSuccess(newUser));
      }
      return res.json(new ApiSuccess(ddbUser));
    } catch (error) {
      next(error);
    }
  };

  public async update(req: any, res: any, next: any) {
    try {
      if (req.body.operator === 'Clickstream') {
        return res.status(400).json(new ApiFail('This user not allow to be modified.'));
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
      await store.deleteUser(id, operator);
      return res.status(200).json(new ApiSuccess(null, 'User deleted.'));
    } catch (error) {
      next(error);
    }
  };
}