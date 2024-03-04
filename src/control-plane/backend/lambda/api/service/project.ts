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

import { CreateProjectRequest, CreateProjectResponse, DeleteProjectRequest, GetProjectRequest, GetProjectResponse, IApplication, IProject, ListProjectsRequest, ListProjectsResponse, UpdateProjectRequest, VerificationProjectRequest, VerificationProjectResponse } from '@aws/clickstream-base-lib';
import { v4 as uuidv4 } from 'uuid';
import { ApiFail, ApiSuccess } from '../common/types';
import { getPipelineStatusType, isFinallyPipelineStatus, paginateData, pipelineAnalysisStudioEnabled } from '../common/utils';
import { CPipeline, IPipeline } from '../model/pipeline';
import { CProject, getProjectFromRaw } from '../model/project';
import { deleteClickstreamUser } from '../store/aws/quicksight';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();
const cProject = new CProject();

export class ProjectServ {
  private async getPipelineByProjectId(projectId: string) {
    const pipelines = await store.listPipeline(projectId, 'latest', 'asc');
    if (pipelines.length === 0) {
      return undefined;
    }
    return pipelines[0];
  }

  public async list(req: any, res: any, next: any) {
    try {
      const request: ListProjectsRequest = req.query;
      const raws = await cProject.list(request.order);
      const projects = getProjectFromRaw(raws);
      const result: IProject[] = [];
      if (request.details === 'true') {
        const pipelines = await store.listPipeline('', 'latest', 'asc');
        const apps = await store.listAllApplication();
        for (let project of projects) {
          const pipeline = pipelines.find((item: IPipeline) => item.projectId === project.id);
          const projectApps = apps.filter((item: IApplication) => item.projectId === project.id);
          result.push({
            ...project,
            pipelineId: pipeline ? pipeline.pipelineId : '',
            pipelineVersion: pipeline ? pipeline.templateVersion ?? '' : '',
            analysisStudioEnabled: pipeline ? pipelineAnalysisStudioEnabled(pipeline) : false,
            applications: projectApps,
          } as IProject);
        }
      } else {
        result.push(...projects);
      }
      const response: ListProjectsResponse = {
        totalCount: result.length,
        items: paginateData(result, true, request.pageSize, request.pageNumber),
      };
      return res.json(new ApiSuccess(response));
    } catch (error) {
      next(error);
    }
  };

  public async create(req: any, res: any, next: any) {
    try {
      const request: CreateProjectRequest = req.body;
      const iProject: IProject = {
        ...request,
        id: uuidv4().replace(/-/g, ''),
        pipelineId: '',
        pipelineVersion: '',
        analysisStudioEnabled: false,
        applications: [],
        createAt: Date.now(),
        updateAt: Date.now(),
      };
      const id = await cProject.create(iProject, res.get('X-Click-Stream-Operator'));
      const response: CreateProjectResponse = { id };
      return res.status(201).json(new ApiSuccess(response, 'Project created.'));
    } catch (error) {
      next(error);
    }
  };

  public async details(req: any, res: any, next: any) {
    try {
      const request: GetProjectRequest = req.params;
      const raw = await cProject.retrieve(request.projectId);
      if (!raw) {
        return res.status(404).json(new ApiFail('Project not found'));
      }
      const response: GetProjectResponse = getProjectFromRaw([raw])[0];
      return res.json(new ApiSuccess(response));
    } catch (error) {
      next(error);
    }
  };

  public async update(req: any, res: any, next: any) {
    try {
      const request: UpdateProjectRequest = req.body;
      await cProject.update(request, res.get('X-Click-Stream-Operator'));
      return res.status(201).json(new ApiSuccess(null, 'Project updated.'));
    } catch (error) {
      next(error);
    }
  };

  public async delete(req: any, res: any, next: any) {
    try {
      const request: DeleteProjectRequest = req.params;
      const pipeline = await this.getPipelineByProjectId(request.projectId);
      if (pipeline) {
        const statusType = getPipelineStatusType(pipeline);
        if (!isFinallyPipelineStatus(statusType)) {
          return res.status(400).json(new ApiFail('The pipeline current status does not allow delete.'));
        }
        const cPipeline = new CPipeline(pipeline);
        await cPipeline.delete();
      }
      const existProjects = await cProject.list();
      if (existProjects.length === 1) {
        await deleteClickstreamUser();
      }
      await cProject.delete(request.projectId, res.get('X-Click-Stream-Operator'));
      return res.json(new ApiSuccess(null, 'Project deleted.'));
    } catch (error) {
      next(error);
    }
  };

  public async verification(req: any, res: any, next: any) {
    try {
      const request: VerificationProjectRequest = req.params;
      const exist = await cProject.isExisted(request.projectId);
      const response: VerificationProjectResponse = { exist };
      return res.json(new ApiSuccess(response));
    } catch (error) {
      next(error);
    }
  };

}