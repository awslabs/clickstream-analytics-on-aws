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

import {
  CreateProjectRequest,
  DeleteProjectRequest,
  GetProjectRequest,
  ListProjectsRequest,
  UpdateProjectRequest,
  VerificationProjectRequest,
} from '@aws/clickstream-base-lib';
import { apiRequest } from 'ts/request';

const getProjectList = async (params: ListProjectsRequest) => {
  const result: any = await apiRequest('get', '/projects', params);
  return result;
};

const createProject = async (params: CreateProjectRequest) => {
  const result: any = await apiRequest('post', '/project', params);
  return result;
};

const updateProject = async (params: UpdateProjectRequest) => {
  const result: any = await apiRequest('put', `/project/${params.id}`, params);
  return result;
};

const getProjectDetail = async (params: GetProjectRequest) => {
  const result: any = await apiRequest('get', `/project/${params.projectId}`);
  return result;
};

const deleteProject = async (params: DeleteProjectRequest) => {
  const result: any = await apiRequest(
    'delete',
    `/project/${params.projectId}`
  );
  return result;
};

const verificationProjectId = async (params: VerificationProjectRequest) => {
  const result: any = await apiRequest(
    'get',
    `/project/${params.projectId}/verification`
  );
  return result;
};

export {
  getProjectList,
  createProject,
  updateProject,
  getProjectDetail,
  deleteProject,
  verificationProjectId,
};
