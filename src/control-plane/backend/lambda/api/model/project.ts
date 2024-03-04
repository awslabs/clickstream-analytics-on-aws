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
import { IProject, ProjectEnvironment } from '@aws/clickstream-base-lib';
import { logger } from '../common/powertools';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();

export interface RawProject {
  readonly id: string;
  readonly type: string;
  readonly prefix: string;

  readonly name: string;
  readonly description: string;
  readonly emails: string;
  readonly region: string;
  readonly environment: ProjectEnvironment;
  readonly createAt: number;
  readonly updateAt: number;
  readonly operator: string;
  readonly deleted: boolean;
}

export function getProjectFromRaw(raw: RawProject[]): IProject[] {
  return raw.map((item: RawProject) => {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      emails: item.emails,
      region: item.region,
      environment: item.environment,
      createAt: item.createAt,
      updateAt: item.updateAt,
    } as IProject;
  });
}

export function getRawProject(project: IProject, operator?: string): RawProject {
  return {
    id: project.id,
    type: `PROJECT#${project.id}`,
    prefix: 'PROJECT',
    name: project.name,
    description: project.description,
    emails: project.emails,
    region: project.region,
    environment: project.environment,
    createAt: Date.now(),
    updateAt: Date.now(),
    operator: operator ?? '',
    deleted: false,
  };
}

export class CProject {

  public async list(order: string = 'desc'): Promise<RawProject[]> {
    try {
      return await store.listProjects(order);
    } catch (error) {
      logger.error('Failed to list plugin.', { error });
      throw error;
    }
  }

  public async create(project: IProject, operator: string): Promise<string> {
    try {
      await store.createProject(getRawProject(project, operator));
      return project.id;
    } catch (error) {
      logger.error('Failed to create project.', { error });
      throw error;
    }
  }

  public async update(project: IProject, operator: string): Promise<void> {
    try {
      await store.updateProject(getRawProject(project, operator));
    } catch (error) {
      logger.error('Failed to update project.', { error });
      throw error;
    }
  }

  public async delete(id: string, operator: string): Promise<void> {
    try {
      await store.deleteProject(id, operator);
    } catch (error) {
      logger.error('Failed to delete project.', { error });
      throw error;
    }
  }

  public async retrieve(id: string): Promise<RawProject | undefined> {
    try {
      return await store.getProject(id);
    } catch (error) {
      logger.error('Failed to retrieve project.', { error });
      throw error;
    }
  }

  public async isExisted(id: string): Promise<boolean> {
    try {
      return await store.isProjectExisted(id);
    } catch (error) {
      logger.error('Failed to check project existed.', { error });
      throw error;
    }
  }

  public async saveRequestId(id: string) {
    try {
      await store.saveRequestId(id);
    } catch (error) {
      logger.error('Failed to save request id.', { error });
      throw error;
    }
  };

  public async deleteRequestId(id: string) {
    try {
      await store.deleteRequestId(id);
    } catch (error) {
      logger.error('Failed to delete request id.', { error });
      throw error;
    }
  };
}
