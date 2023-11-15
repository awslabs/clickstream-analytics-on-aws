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

export const getAllUsers = async () => {
  const result: any = await apiRequest('get', '/user');
  return result;
};

export const addUser = async (user: IUser) => {
  const result: any = await apiRequest('post', `/user`, user);
  return result;
};

export const updateUser = async (user: IUser) => {
  const result: any = await apiRequest(
    'put',
    `/user/${encodeURIComponent(user.id)}`,
    user
  );
  return result;
};

export const deleteUser = async (uid: string) => {
  const result: any = await apiRequest(
    'delete',
    `/user/${encodeURIComponent(uid)}`
  );
  return result;
};

export const getUserDetails = async (uid: string) => {
  const result: any = await apiRequest(
    'get',
    `/user/details?id=${encodeURIComponent(uid)}`
  );
  return result;
};

export const getUserSettings = async () => {
  const result: any = await apiRequest('get', `/user/settings`);
  return result;
};

export const updateUserSettings = async (userSettings: IUserSettings) => {
  const result: any = await apiRequest('post', `/user/settings`, userSettings);
  return result;
};
