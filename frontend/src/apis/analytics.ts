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

import { getLngFromLocalStorage } from 'pages/analytics/analytics-utils';
import { apiRequest } from 'ts/request';

export const getAnalyticsDashboardList = async (params: {
  projectId: string;
  appId: string;
  pageNumber: number;
  pageSize: number;
}) => {
  const result: any = await apiRequest(
    'get',
    `/project/${params.projectId}/${params.appId}/dashboard?pageNumber=${params.pageNumber}&pageSize=${params.pageSize}`
  );
  return result;
};

export const createAnalyticsDashboard = async (
  dashboard: IAnalyticsDashboard
) => {
  const result: any = await apiRequest(
    'post',
    `/project/${dashboard.projectId}/${dashboard.appId}/dashboard`,
    dashboard
  );
  return result;
};

export const deleteAnalyticsDashboard = async (
  projectId: string,
  appId: string,
  dashboardId: string
) => {
  const result: any = await apiRequest(
    'delete',
    `/project/${projectId}/${appId}/dashboard/${dashboardId}`
  );
  return result;
};

export const getAnalyticsDashboard = async (
  projectId: string,
  appId: string,
  dashboardId: string,
  allowedDomain: string
) => {
  const result: any = await apiRequest(
    'get',
    `/project/${projectId}/${appId}/dashboard/${dashboardId}?allowedDomain=${allowedDomain}`
  );
  return result;
};

export const getMetadataEventsList = async (params: {
  projectId: string;
  appId: string;
  attribute?: boolean;
}) => {
  if (!params.projectId || !params.appId) {
    return;
  }
  const searchParams = new URLSearchParams({
    projectId: params.projectId,
    appId: params.appId,
    attribute: params.attribute ? params.attribute.toString() : 'false',
  });

  const result: any = await apiRequest(
    'get',
    `/metadata/events?${searchParams.toString()}`
  );
  const localeLng = getLngFromLocalStorage();
  for (const event of result.data.items) {
    event.displayName = event.displayName[localeLng];
    event.description = event.description[localeLng];
    if (event.associatedParameters) {
      for (const parameter of event.associatedParameters) {
        parameter.displayName = parameter.displayName[localeLng];
        parameter.description = parameter.description[localeLng];
      }
    }
  }
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
  const localeLng = getLngFromLocalStorage();
  result.data.displayName = result.data.displayName[localeLng];
  result.data.description = result.data.description[localeLng];
  if (result.data.associatedParameters) {
    for (const parameter of result.data.associatedParameters) {
      parameter.displayName = parameter.displayName[localeLng];
      parameter.description = parameter.description[localeLng];
    }
  }
  return result;
};

export const updateMetadataDisplay = async (data: {
  id: string;
  projectId: string;
  appId: string;
  description: any;
  displayName: any;
}) => {
  data.displayName = {
    'en-US': data.displayName,
    'zh-CN': data.displayName,
  };
  data.description = {
    'en-US': data.description,
    'zh-CN': data.description,
  };
  const result: any = await apiRequest('put', '/metadata/display', data);
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
  const localeLng = getLngFromLocalStorage();
  for (const parameter of result.data.items) {
    parameter.displayName = parameter.displayName[localeLng];
    parameter.description = parameter.description[localeLng];
    if (parameter.associatedEvents) {
      for (const event of parameter.associatedEvents) {
        event.displayName = event.displayName[localeLng];
        event.description = event.description[localeLng];
      }
    }
  }
  return result;
};

export const getMetadataParametersDetails = async (params: {
  projectId: string;
  appId: string;
  parameterName: string;
  parameterCategory: string;
  parameterType: string;
}) => {
  const result: any = await apiRequest(
    'get',
    `/metadata/event_parameter?projectId=${params.projectId}&appId=${params.appId}&name=${params.parameterName}&category=${params.parameterCategory}&type=${params.parameterType}`
  );
  const localeLng = getLngFromLocalStorage();
  result.data.displayName = result.data.displayName[localeLng];
  result.data.description = result.data.description[localeLng];
  if (result.data.associatedEvents) {
    for (const event of result.data.associatedEvents) {
      event.displayName = event.displayName[localeLng];
      event.description = event.description[localeLng];
    }
  }
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
  const localeLng = getLngFromLocalStorage();
  for (const attribute of result.data.items) {
    attribute.displayName = attribute.displayName[localeLng];
    attribute.description = attribute.description[localeLng];
  }
  return result;
};

export const getBuiltInMetadata = async () => {
  const result: any = await apiRequest('get', '/metadata/built_in_metadata');
  return result;
};

export const previewFunnel = async (data: IExploreRequest) => {
  const result: any = await apiRequest('post', `/reporting/funnel`, data);
  return result;
};

export const previewEvent = async (data: IExploreRequest) => {
  const result: any = await apiRequest('post', `/reporting/event`, data);
  return result;
};

export const previewPath = async (data: IExploreRequest) => {
  const result: any = await apiRequest('post', `/reporting/path`, data);
  return result;
};

export const previewRetention = async (data: IExploreRequest) => {
  const result: any = await apiRequest('post', `/reporting/retention`, data);
  return result;
};

export const previewAttribution = async (data: IExploreAttributionRequest) => {
  const result: any = await apiRequest('post', `/reporting/attribution`, data);
  return result;
};

export const getPipelineDetailByProjectId = async (projectId: string) => {
  const result: any = await apiRequest(
    'get',
    `/pipeline/${projectId}?pid=${projectId}&cache=true`
  );
  return result;
};

export const getPathNodes = async (projectId: string, appId: string) => {
  const result: any = await apiRequest(
    'get',
    `/metadata/pathNodes?projectId=${projectId}&appId=${appId}`
  );
  return result;
};

export const warmup = async (data: {
  projectId: string;
  appId: string;
  region: string;
}) => {
  const result: any = await apiRequest('post', '/reporting/warmup', data);
  return result;
};

export const clean = async (region: string) => {
  const result: any = await apiRequest('post', '/reporting/clean', {
    region: region,
  });
  return result;
};

export const embedAnalyzesUrl = async (
  projectId: string,
  allowedDomain: string
) => {
  const result: any = await apiRequest(
    'get',
    `project/${projectId}/analyzes?allowedDomain=${allowedDomain}`
  );
  return result;
};
