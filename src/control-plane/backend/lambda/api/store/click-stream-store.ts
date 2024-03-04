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

import { RawApplication } from '../model/application';
import { IDictionary } from '../model/dictionary';
import { RawPipeline } from '../model/pipeline';
import { RawPlugin } from '../model/plugin';
import { RawProject } from '../model/project';
import { RawUser, RawUserSettings } from '../model/user';

export interface ClickStreamStore {
  createProject: (project: RawProject) => Promise<string>;
  getProject: (id: string) => Promise<RawProject | undefined>;
  updateProject: (project: RawProject) => Promise<void>;
  listProjects: (order: string) => Promise<RawProject[]>;
  deleteProject: (id: string, operator: string) => Promise<void>;
  isProjectExisted: (projectId: string) => Promise<boolean>;

  addApplication: (app: RawApplication) => Promise<string>;
  getApplication: (projectId: string, appId: string) => Promise<RawApplication | undefined>;
  updateApplication: (app: RawApplication) => Promise<void>;
  listApplication: (projectId: string, order: string) => Promise<RawApplication[]>;
  listAllApplication: () => Promise<RawApplication[]>;
  deleteApplication: (projectId: string, appId: string, operator: string) => Promise<void>;
  isApplicationExisted: (projectId: string, appId: string) => Promise<boolean>;

  addPipeline: (pipeline: RawPipeline) => Promise<string>;
  getPipeline: (projectId: string, pipelineId: string, version?: string | undefined) => Promise<RawPipeline | undefined>;
  updatePipeline: (pipeline: RawPipeline, curPipeline: RawPipeline) => Promise<void>;
  updatePipelineAtCurrentVersion: (pipeline: RawPipeline) => Promise<void>;
  listPipeline: (projectId: string, version: string, order: string) => Promise<RawPipeline[]>;
  deletePipeline: (projectId: string, pipelineId: string, operator: string) => Promise<void>;
  isPipelineExisted: (projectId: string, pipelineId: string) => Promise<boolean>;

  addPlugin: (plugin: RawPlugin) => Promise<string>;
  getPlugin: (pluginId: string) => Promise<RawPlugin | undefined>;
  updatePlugin: (plugin: RawPlugin) => Promise<void>;
  listPlugin: (pluginType?: string, order?: string) => Promise<RawPlugin[]>;
  deletePlugin: (pluginId: string, operator: string) => Promise<void>;
  isPluginExisted: (pluginId: string) => Promise<boolean>;
  bindPlugins: (pluginIds: string[], count: number) => Promise<void>;

  addUser: (user: RawUser) => Promise<string>;
  getUser: (uid: string) => Promise<RawUser | undefined>;
  updateUser: (user: RawUser) => Promise<void>;
  listUser: () => Promise<RawUser[]>;
  deleteUser: (uid: string, operator: string) => Promise<void>;
  getUserSettings: () => Promise<RawUserSettings | undefined>;
  updateUserSettings: (settings: RawUserSettings) => Promise<void>;

  getDictionary: (name: string) => Promise<IDictionary | undefined>;
  updateDictionary: (dictionary: IDictionary) => Promise<void>;
  listDictionary: () => Promise<IDictionary[]>;

  isRequestIdExisted: (id: string) => Promise<boolean>;
  saveRequestId: (id: string) => Promise<void>;
  deleteRequestId: (id: string) => Promise<void>;

  isManualTrigger: (projectId: string, appId: string) => Promise<boolean>;
  saveManualTrigger: (projectId: string, appId: string) => Promise<void>;
}
