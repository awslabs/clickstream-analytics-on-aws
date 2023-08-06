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
  pageNumber: number;
  pageSize: number;
}) => {
  await new Promise((r) => setTimeout(r, 3000));
  const result: any = await new Promise((resolve, reject) => {
    resolve({
      success: true,
      message: 'OK',
      data: {
        totalCount: 2,
        items: [
          {
            id: 'asdsdsadsad',
            name: 'Dashboard Name 1',
            description: 'Dashboard description 1',
            createAt: 1690251290,
          },
          {
            id: 'asdsdsadsadasd',
            name: 'Dashboard Name 2',
            description: 'Dashboard description 2',
            createAt: 1690251290,
          },
        ],
      },
      error: '',
    });
  });
  return result;
};

export const getMetadataEventsList = async (params: {
  pid: string;
  appId: string;
}) => {
  await new Promise((r) => setTimeout(r, 3000));
  const result: any = await new Promise((resolve, reject) => {
    const data = [];
    for (let index = 0; index <= 20; index++) {
      data.push({
        id: `${index}`,
        name: `Event Name ${index}`,
        displayName: `事件${index}`,
        type: index % 2 === 0 ? 'Preset' : 'Custom',
        description: `Event description ${index}`,
        hasData: index % 2 === 0,
        platform: index % 2 === 0 ? 'Android' : 'iOS',
        dataVolumeLastDay: index * 100,
      });
    }
    resolve({
      success: true,
      message: 'OK',
      data: {
        totalCount: 2,
        items: data,
      },
      error: '',
    });
  });
  return result;
};

export const getMetadataEventDetails = async (params: {
  pid: string;
  appId: string;
  eventName: string;
}) => {
  await new Promise((r) => setTimeout(r, 3000));
  const result: any = await new Promise((resolve, reject) => {
    const parameters = [];
    for (let index = 0; index <= 20; index++) {
      parameters.push({
        id: `${index}`,
        name: `Parameter Name ${index}`,
        displayName: `属性${index}`,
        type: index % 2 === 0 ? 'Preset' : 'Custom',
        description: `Parameter description ${index}`,
        platform: index % 2 === 0 ? 'Android' : 'iOS',
        dataType: index % 2 === 0 ? 'String' : 'Number',
      });
    }
    const index = Math.floor(Math.random() * 100);
    resolve({
      success: true,
      message: 'OK',
      data: {
        id: index,
        name: `Event Name ${index}`,
        displayName: `事件${index}`,
        type: index % 2 === 0 ? 'Preset' : 'Custom',
        description: `Event description ${index}`,
        hasData: index % 2 === 0,
        platform: index % 2 === 0 ? 'Android' : 'iOS',
        dataVolumeLastDay: index * 100,
        parameters: parameters,
      },
      error: '',
    });
  });
  return result;
};

export const updateMetadataEvent = async (event: IMetadataEvent) => {
  console.log(event);
  await new Promise((r) => setTimeout(r, 3000));
  const result: any = await new Promise((resolve, reject) => {
    resolve({
      success: true,
      message: 'OK',
      data: {},
      error: '',
    });
  });
  return result;
};

export const getMetadataParametersList = async (params: {
  pid: string;
  appId: string;
}) => {
  await new Promise((r) => setTimeout(r, 3000));
  const result: any = await new Promise((resolve, reject) => {
    const data = [];
    for (let index = 0; index <= 67; index++) {
      data.push({
        id: `${index}`,
        name: `Event Attribute Name ${index}`,
        displayName: `事件属性${index}`,
        type: index % 2 === 0 ? 'Preset' : 'Custom',
        description: `Description ${index}`,
        hasData: index % 2 === 0,
        platform: index % 2 === 0 ? 'Android' : 'iOS',
        dataType: index % 2 === 0 ? 'String' : 'Number',
        source: index % 2 === 1 ? 'Template' : 'Custom',
      });
    }
    resolve({
      success: true,
      message: 'OK',
      data: {
        totalCount: 2,
        items: data,
      },
      error: '',
    });
  });
  return result;
};

export const getMetadataParametersDetails = async (params: {
  parameterId: string;
}) => {
  await new Promise((r) => setTimeout(r, 3000));
  const result: any = await new Promise((resolve, reject) => {
    const events = [];
    for (let index = 0; index <= 3; index++) {
      events.push({
        name: `Event Name ${index}`,
        displayName: `事件${index}`,
        description: `Parameter description ${index}`,
      });
    }
    const index = Math.floor(Math.random() * 100);
    resolve({
      success: true,
      message: 'OK',
      data: {
        id: `${index}`,
        name: `Event Attribute Name ${index}`,
        displayName: `事件属性${index}`,
        type: index % 2 === 0 ? 'Preset' : 'Custom',
        description: `Description ${index}`,
        hasData: index % 2 === 0,
        platform: index % 2 === 0 ? 'Android' : 'iOS',
        dataType: index % 2 === 0 ? 'String' : 'Number',
        source: index % 2 === 1 ? 'Template' : 'Custom',
        events: events,
      },
      error: '',
    });
  });
  return result;
};

export const updateMetadataParameter = async (
  event: IMetadataEventParameter
) => {
  console.log(event);
  await new Promise((r) => setTimeout(r, 3000));
  const result: any = await new Promise((resolve, reject) => {
    resolve({
      success: true,
      message: 'OK',
      data: {},
      error: '',
    });
  });
  return result;
};

export const getMetadataUserAttributesList = async (params: {
  pid: string;
  appId: string;
}) => {
  await new Promise((r) => setTimeout(r, 3000));
  const result: any = await new Promise((resolve, reject) => {
    const data = [];
    for (let index = 0; index <= 38; index++) {
      data.push({
        id: `${index}`,
        name: `User Attribute Name ${index}`,
        displayName: `用户属性${index}`,
        type: index > 10 ? 'built-in' : 'customer',
        description: `User Attribute description ${index}`,
      });
    }
    resolve({
      success: true,
      message: 'OK',
      data: {
        totalCount: 2,
        items: data,
      },
      error: '',
    });
  });
  return result;
};

export const updateMetadataUserAttribute = async (
  event: IMetadataUserAttribute
) => {
  await new Promise((r) => setTimeout(r, 3000));
  const result: any = await new Promise((resolve, reject) => {
    resolve({
      success: true,
      message: 'OK',
      data: {},
      error: '',
    });
  });
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
