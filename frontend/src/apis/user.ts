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
  CreateUserRequest,
  DeleteUserRequest,
  GetUserRequest,
  UpdateUserRequest,
  UpdateUserSettingsRequest,
} from '@aws/clickstream-base-lib';
import { apiRequest } from 'ts/request';

export const getAllUsers = async () => {
  const result: any = await apiRequest('get', '/users');
  return result;
};

export const addUser = async (data: CreateUserRequest) => {
  const result: any = await apiRequest('post', '/user', data);
  return result;
};

export const updateUser = async (data: UpdateUserRequest) => {
  const result: any = await apiRequest('put', '/user', data);
  return result;
};

export const deleteUser = async (data: DeleteUserRequest) => {
  const result: any = await apiRequest('delete', '/user', { data });
  return result;
};

export const getUserDetails = async (param: GetUserRequest) => {
  const result: any = await apiRequest('get', '/user/details', param);
  return result;
};

export const getUserSettings = async () => {
  const result: any = await apiRequest('get', '/user/settings');
  return result;
};

export const updateUserSettings = async (data: UpdateUserSettingsRequest) => {
  const result: any = await apiRequest('post', '/user/settings', data);
  return result;
};
