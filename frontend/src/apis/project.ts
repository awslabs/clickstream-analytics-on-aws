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

import { apiRequest } from 'ts/request';

const getProjectList = async (params: {
  pageNumber: number;
  pageSize: number;
}) => {
  const result: any = await apiRequest('get', '/project', params);
  return result;
};

const createProject = async (params: IProject) => {
  const result: any = await apiRequest('post', '/project', params);
  return result;
};

const updateProject = async (params: IProject) => {
  const result: any = await apiRequest('put', `/project/${params.id}`, params);
  return result;
};

const getProjectDetail = async (params: { id: string }) => {
  const result: any = await apiRequest('get', `/project/${params.id}`);
  return result;
};

const deleteProject = async (params: { id: string }) => {
  const result: any = await apiRequest('delete', `/project/${params.id}`);
  return result;
};

const verificationProjectId = async (params: { id: string }) => {
  const result: any = await apiRequest(
    'get',
    `/project/verification/${params.id}`
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
