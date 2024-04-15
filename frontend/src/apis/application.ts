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

const getApplicationListByPipeline = async (params: {
  pid: string;
  pageNumber: number;
  pageSize: number;
}) => {
  const result: any = await apiRequest('get', '/app', params);
  return result;
};

const createApplication = async (params: IApplication) => {
  const result: any = await apiRequest('post', '/app', params);
  return result;
};

const getApplicationDetail = async (params: { id: string; pid: string }) => {
  const result: any = await apiRequest(
    'get',
    `/app/${params.id}?pid=${params.pid}`
  );
  return result;
};

const deleteApplication = async (params: { id: string; pid: string }) => {
  const result: any = await apiRequest(
    'delete',
    `/app/${params.id}?pid=${params.pid}`
  );
  return result;
};

const updateApplicationTimezone = async (params: {
  id: string;
  pid: string;
  timezone: string;
}) => {
  const result: any = await apiRequest('put', `/app/${params.id}/timezone`, {
    projectId: params.pid,
    timezone: params.timezone,
  });
  return result;
};

export {
  getApplicationListByPipeline,
  createApplication,
  getApplicationDetail,
  deleteApplication,
  updateApplicationTimezone,
};
