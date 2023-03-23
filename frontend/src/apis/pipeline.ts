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

const getPipelineList = async (params: {
  pageNumber: number;
  pageSize: number;
}) => {
  const result: any = await apiRequest('get', '/pipeline', params);
  return result;
};

const getPipelineByProject = async (params: { pid: string }) => {
  const result: any = await apiRequest('get', `/pipeline`, params);
  return result;
};

const getPipelineDetail = async (params: { id: string; pid: string }) => {
  const result: any = await apiRequest(
    'get',
    `/pipeline/${params.id}?pid=${params.pid}`
  );
  return result;
};

const createProjectPipeline = async (data: IPipeline) => {
  const result: any = await apiRequest('post', `/pipeline`, data);
  return result;
};

const deletePipeline = async (params: { id: string; pid: string }) => {
  const result: any = await apiRequest(
    'delete',
    `/pipeline/${params.id}?pid=${params.pid}`
  );
  return result;
};

export {
  getPipelineList,
  getPipelineByProject,
  getPipelineDetail,
  createProjectPipeline,
  deletePipeline,
};
