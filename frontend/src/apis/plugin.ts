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

const getPluginList = async (params: {
  pageNumber: number;
  pageSize: number;
}) => {
  const result: any = await apiRequest('get', '/plugin', params);
  return result;
};

const createPlugin = async (data: IPlugin) => {
  const result: any = await apiRequest('post', `/plugin`, data);
  return result;
};

const deletePlugin = async (id: string) => {
  const result: any = await apiRequest('delete', `/plugin/${id}`);
  return result;
};

export { getPluginList, createPlugin, deletePlugin };
