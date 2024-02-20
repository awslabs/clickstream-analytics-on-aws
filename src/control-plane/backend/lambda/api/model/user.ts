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

import { IUser, IUserRole } from '../common/clickstream-types';
import { logger } from '../common/powertools';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();

export interface RawUser {
  readonly id: string;
  readonly type: string;
  readonly prefix: string;

  readonly name?: string;
  readonly roles: IUserRole[];

  readonly createAt: number;
  readonly updateAt: number;
  readonly operator: string;
  readonly deleted: boolean;
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

export interface RawUserSettings {
  readonly roleJsonPath: string;
  readonly adminRoleNames: string;
  readonly operatorRoleNames: string;
  readonly analystRoleNames: string;
  readonly analystReaderRoleNames: string;
}

export class CUser {

  public static async list(): Promise<RawUser[]> {
    try {
      return await store.listUser();
    } catch (error) {
      logger.error('Failed to list user.', { error });
      throw error;
    }
  }

  public static async get(id: string): Promise<RawUser | undefined> {
    try {
      return await store.getUser(id);
    } catch (error) {
      logger.error('Failed to get user.', { error });
      throw error;
    }
  }

  readonly user: RawUser;

  constructor(user: IUser, operator?: string) {
    this.user = {
      id: user.id,
      type: 'USER',
      prefix: 'USER',
      name: user.name,
      roles: user.roles,
      createAt: user.createAt ?? Date.now(),
      updateAt: Date.now(),
      operator: operator ?? '',
      deleted: false,
    };
  }

  public async create(): Promise<string> {
    try {
      await store.addUser(this.user);
      return this.user.id;
    } catch (error) {
      logger.error('Failed to create user.', { error });
      throw error;
    }
  }

  public async update(): Promise<string> {
    try {
      await store.updateUser(this.user);
      return this.user.id;
    } catch (error) {
      logger.error('Failed to create user.', { error });
      throw error;
    }
  }

  public async delete(): Promise<boolean> {
    try {
      await store.deleteUser(this.user.id, this.user.operator);
      return true;
    } catch (error) {
      logger.error('Failed to delete user.', { error });
      throw error;
    }
  };
}
