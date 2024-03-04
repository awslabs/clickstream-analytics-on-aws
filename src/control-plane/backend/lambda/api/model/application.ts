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

import { IApplication } from '@aws/clickstream-base-lib';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { logger } from '../common/powertools';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();

export interface RawApplication {
  readonly id: string;
  readonly type: string;
  readonly prefix: string;

  readonly projectId: string;
  readonly appId: string;
  readonly name: string;
  readonly description: string;
  readonly androidPackage?: string;
  readonly iosBundleId?: string;
  readonly iosAppStoreId?: string;

  readonly createAt: number;
  readonly updateAt: number;
  readonly operator: string;
  readonly deleted: boolean;
}

export function getApplicationFromRaw(raw: RawApplication[]): IApplication[] {
  return raw.map((item: RawApplication) => {
    return {
      id: item.id,
      projectId: item.projectId,
      appId: item.appId,
      name: item.name,
      description: item.description,
      androidPackage: item.androidPackage,
      iosBundleId: item.iosBundleId,
      iosAppStoreId: item.iosAppStoreId,
      createAt: item.createAt,
      updateAt: item.updateAt,
    } as IApplication;
  });
}

export function getRawApplication(app: IApplication, operator?: string): RawApplication {
  return {
    id: app.id,
    type: `APP#${app.id}`,
    prefix: 'APP',
    projectId: app.projectId,
    appId: app.appId,
    name: app.name,
    description: app.description,
    androidPackage: app.androidPackage,
    iosBundleId: app.iosBundleId,
    iosAppStoreId: app.iosAppStoreId,
    createAt: Date.now(),
    updateAt: Date.now(),
    operator: operator ?? '',
    deleted: false,
  };
}

export class CApplication {

  public async list(projectId: string, order: string): Promise<RawApplication[]> {
    try {
      return await store.listApplication(projectId, order);
    } catch (error) {
      logger.error('Failed to list application.', { error });
      throw error;
    }
  }

  public async retrieve(projectId: string, appId: string): Promise<RawApplication | undefined> {
    try {
      return await store.getApplication(projectId, appId);
    } catch (error) {
      logger.error('Failed to retrieve application.', { error });
      throw error;
    }
  }

  public async create(app: IApplication, operator: string): Promise<string> {
    try {
      await store.addApplication(getRawApplication(app, operator));
      return app.id;
    } catch (error) {
      logger.error('Failed to create application.', { error });
      throw error;
    }
  }

  public async delete(projectId: string, appId: string, operator: string): Promise<boolean> {
    try {
      await store.deleteApplication(projectId, appId, operator);
      return true;
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        logger.warn('Conditional check failed when delete application.', { error });
        return false;
      }
      logger.error('Failed to delete application.', { error });
      throw error;
    }
  };
}

