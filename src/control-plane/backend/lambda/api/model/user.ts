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

import { IUser, UserRole } from '@aws/clickstream-base-lib';
import { logger } from '../common/powertools';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();

export interface RawUser {
  readonly id: string;
  readonly type: string;
  readonly prefix: string;

  readonly name?: string;
  readonly roles: UserRole[];

  readonly createAt: number;
  readonly updateAt: number;
  readonly operator: string;
  readonly deleted: boolean;
}

export interface RawUserSettings {
  readonly roleJsonPath: string;
  readonly adminRoleNames: string;
  readonly operatorRoleNames: string;
  readonly analystRoleNames: string;
  readonly analystReaderRoleNames: string;
}

export function getUserFromRaw(raw: RawUser[]): IUser[] {
  return raw.map((item: RawUser) => {
    return {
      id: item.id,
      name: item.name,
      roles: item.roles,
      createAt: item.createAt,
      operator: item.operator,
    } as IUser;
  });
}

export function getRawUser(user: IUser): RawUser {
  return {
    id: user.id,
    type: 'USER',
    prefix: 'USER',
    name: user.name ?? '',
    roles: user.roles ?? [],
    createAt: Date.now(),
    updateAt: Date.now(),
    operator: user.operator ?? '',
    deleted: false,
  };
}

export class CUser {

  public async list(): Promise<RawUser[]> {
    try {
      return await store.listUser();
    } catch (error) {
      logger.error('Failed to list user.', { error });
      throw error;
    }
  }

  public async get(id: string): Promise<RawUser | undefined> {
    try {
      return await store.getUser(id);
    } catch (error) {
      logger.error('Failed to get user.', { error });
      throw error;
    }
  }

  public async create(user: IUser): Promise<string> {
    try {
      await store.addUser(getRawUser(user));
      return user.id;
    } catch (error) {
      logger.error('Failed to create user.', { error });
      throw error;
    }
  }

  public async update(user: IUser): Promise<string> {
    try {
      await store.updateUser(getRawUser(user));
      return user.id;
    } catch (error) {
      logger.error('Failed to update user.', { error });
      throw error;
    }
  }

  public async delete(userId: string, operator: string): Promise<boolean> {
    try {
      await store.deleteUser(userId, operator);
      return true;
    } catch (error) {
      logger.error('Failed to delete user.', { error });
      throw error;
    }
  };
}
