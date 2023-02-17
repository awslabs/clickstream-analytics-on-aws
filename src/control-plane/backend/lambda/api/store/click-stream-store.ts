/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { Application, ApplicationList } from '../model/application';
import { Dictionary } from '../model/dictionary';
import { Pipeline, PipelineList } from '../model/pipeline';
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
  listPipeline: (projectId: string, pagination: boolean, pageSize: number, pageNumber: number) => Promise<PipelineList>;
  deletePipeline: (projectId: string, pipelineId: string) => Promise<void>;
  isPipelineExisted: (projectId: string, pipelineId: string) => Promise<boolean>;

  getDictionary: (name: string) => Promise<Dictionary | undefined>;
  listDictionary: () => Promise<Dictionary[]>;

  isRequestIdExisted: (id: string) => Promise<boolean>;

}
