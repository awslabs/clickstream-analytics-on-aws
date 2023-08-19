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

export const getAnalyticsDashboardList = async (params: {
  projectId: string;
  pageNumber: number;
  pageSize: number;
}) => {
  await new Promise((r) => setTimeout(r, 3000));
  const result: any = await apiRequest(
    'get',
    `/project/${params.projectId}/dashboards?pageNumber=${params.pageNumber}&pageSize=${params.pageSize}`
  );
  return result;
};

export const createAnalyticsDashboard = async (
  dashboard: IAnalyticsDashboard
) => {
  const result: any = await apiRequest(
    'post',
    `/project/${dashboard.projectId}/dashboard`,
    dashboard
  );
  return result;
};

export const deleteAnalyticsDashboard = async (dashboardId: string) => {
  const result: any = await apiRequest(
    'delete',
    `/project/dashboard/${dashboardId}`
  );
  return result;
};

export const getAnalyticsDashboard = async (dashboardId: string) => {
  const result: any = await apiRequest(
    'get',
    `/project/dashboard/${dashboardId}`
  );
  return result;
};

export const getMetadataEventsList = async (params: {
  projectId: string;
  appId: string;
}) => {
  const result: any = await apiRequest(
    'get',
    `/metadata/events?projectId=${params.projectId}&appId=${params.appId}`
  );
  return result;
};

export const getMetadataEventDetails = async (params: {
  projectId: string;
  appId: string;
  eventName: string;
}) => {
  const result: any = await apiRequest(
    'get',
    `/metadata/event/${params.eventName}?projectId=${params.projectId}&appId=${params.appId}`
  );
  return result;
};

export const updateMetadataEvent = async (event: IMetadataEvent) => {
  const result: any = await apiRequest('put', '/metadata/event', event);
  return result;
};

export const getMetadataParametersList = async (params: {
  projectId: string;
  appId: string;
}) => {
  const result: any = await apiRequest(
    'get',
    `/metadata/event_parameters?projectId=${params.projectId}&appId=${params.appId}`
  );
  return result;
};

export const getMetadataParametersDetails = async (params: {
  projectId: string;
  appId: string;
  parameterId: string;
}) => {
  const result: any = await apiRequest(
    'get',
    `/metadata/event_parameter/${params.parameterId}?projectId=${params.projectId}&appId=${params.appId}`
  );
  return result;
};

export const updateMetadataParameter = async (
  parameter: IMetadataEventParameter
) => {
  const result: any = await apiRequest(
    'put',
    '/metadata/event_parameter',
    parameter
  );
  return result;
};

export const getMetadataUserAttributesList = async (params: {
  projectId: string;
  appId: string;
}) => {
  const result: any = await apiRequest(
    'get',
    `/metadata/user_attributes?projectId=${params.projectId}&appId=${params.appId}`
  );
  return result;
};

export const updateMetadataUserAttribute = async (
  attribute: IMetadataUserAttribute
) => {
  const result: any = await apiRequest(
    'put',
    '/metadata/user_attribute',
    attribute
  );
  return result;
};

export const fetchEmbeddingUrl = async (
  region: string,
  allowedDomain: string,
  dashboardId: string,
  sheetId?: string,
  visualId?: string
) => {
  let reqParams = `region=${region}&allowedDomain=${allowedDomain}&dashboardId=${dashboardId}`;
  if (sheetId) {
    reqParams = reqParams.concat(`&sheetId=${sheetId}`);
  }
  if (visualId) {
    reqParams = reqParams.concat(`&visualId=${visualId}`);
  }
  const result: any = await apiRequest(
    'get',
    `/env/quicksight/embedUrl?${reqParams}`
  );
  return result;
};

export const previewFunnel = async (data: IFunnelRequest) => {
  const result: any = await apiRequest('post', `/reporting`, data);
  return result;
};

export const getPipelineDetailByProjectId = async (projectId: string) => {
  const result: any = await apiRequest(
    'get',
    `/pipeline/${projectId}?pid=${projectId}`
  );
  return result;
};
