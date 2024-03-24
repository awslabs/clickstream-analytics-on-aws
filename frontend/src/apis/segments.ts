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

import { Segment } from '@aws/clickstream-base-lib';
import { apiRequest } from 'ts/request';

export const getSegmentsList = async (params: {
  projectId: string;
  appId: string;
}) => {
  const result: any = await apiRequest('get', `/segments`, params);
  return result;
};

export const createSegment = async (segmentObj: Segment) => {
  const result: any = await apiRequest('post', `/segments`, segmentObj);
  return result;
};

export const deleteSegment = async (params: {
  segmentId: string;
  appId: string;
  projectId: string;
}) => {
  const result: any = await apiRequest(
    'delete',
    `/segments/${params.segmentId}?appId=${params.appId}&projectId=${params.projectId}`
  );
  return result;
};
