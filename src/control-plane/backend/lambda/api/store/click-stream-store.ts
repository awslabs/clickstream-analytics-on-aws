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

import { ExecutionStatus } from '@aws-sdk/client-sfn';
import { Application, ApplicationList } from '../model/application';
import { Dictionary } from '../model/dictionary';
import { Pipeline, PipelineList } from '../model/pipeline';
import { Plugin, PluginList } from '../model/plugin';
import { Project, ProjectList } from '../model/project';

export interface ClickStreamStore {
  createProject: (project: Project) => Promise<string>;
  getProject: (id: string) => Promise<Project | undefined>;
  updateProject: (project: Project) => Promise<void>;
  listProjects: (pagination: boolean, pageSize: number, pageNumber: number) => Promise<ProjectList>;
  deleteProject: (id: string) => Promise<void>;
  isProjectExisted: (projectId: string) => Promise<boolean>;

  addApplication: (app: Application) => Promise<string>;
  getApplication: (projectId: string, appId: string) => Promise<Application | undefined>;
  updateApplication: (app: Application) => Promise<void>;
  listApplication: (projectId: string, pagination: boolean, pageSize: number, pageNumber: number) => Promise<ApplicationList>;
  deleteApplication: (projectId: string, appId: string) => Promise<void>;
  isApplicationExisted: (projectId: string, appId: string) => Promise<boolean>;

  addPipeline: (pipeline: Pipeline) => Promise<string>;
  getPipeline: (projectId: string, pipelineId: string, version?: string | undefined) => Promise<Pipeline | undefined>;
  updatePipeline: (pipeline: Pipeline, curPipeline: Pipeline) => Promise<void>;
  updatePipelineStatus: (pipeline: Pipeline, status: ExecutionStatus | string) => Promise<void>;
  listPipeline: (projectId: string, version: string, pagination: boolean, pageSize: number, pageNumber: number) => Promise<PipelineList>;
  deletePipeline: (projectId: string, pipelineId: string) => Promise<void>;
  isPipelineExisted: (projectId: string, pipelineId: string) => Promise<boolean>;

  addPlugin: (plugin: Plugin) => Promise<string>;
  getPlugin: (pluginId: string) => Promise<Plugin | undefined>;
  updatePlugin: (plugin: Plugin) => Promise<void>;
  listPlugin: (pluginType: string, order: string, pagination: boolean, pageSize: number, pageNumber: number) => Promise<PluginList>;
  deletePlugin: (pluginId: string) => Promise<void>;
  isPluginExisted: (pluginId: string) => Promise<boolean>;

  getDictionary: (name: string) => Promise<Dictionary | undefined>;
  listDictionary: () => Promise<Dictionary[]>;

  isRequestIdExisted: (id: string) => Promise<boolean>;

}
