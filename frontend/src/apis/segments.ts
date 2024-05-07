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
  Segment,
  SegmentDdbItem,
  SegmentJobStatusItem,
} from '@aws/clickstream-base-lib';
import { apiRequest } from 'ts/request';

export const getSegmentsList = async (params: {
  projectId: string;
  appId: string;
}) => {
  return (await apiRequest('get', `/segments`, params)) as ApiResponse<
    Segment[]
  >;
};

export const getSegmentById = async (params: {
  appId: string;
  segmentId: string;
}) => {
  return (await apiRequest(
    'get',
    `/segments/${params.segmentId}?appId=${params.appId}`
  )) as ApiResponse<SegmentDdbItem>;
};

export const createSegment = async (segmentObj: Segment) => {
  return await apiRequest('post', `/segments`, segmentObj);
};

export const updateSegment = async (segmentObj: Segment) => {
  return await apiRequest(
    'patch',
    `/segments/${segmentObj.segmentId}`,
    segmentObj
  );
};

export const deleteSegment = async (params: {
  segmentId: string;
  appId: string;
}) => {
  return (await apiRequest(
    'delete',
    `/segments/${params.segmentId}?appId=${params.appId}`
  )) as ApiResponse<{ segmentId: string }>;
};

export const getSegmentJobs = async (params: { segmentId: string }) => {
  return (await apiRequest(
    'get',
    `/segments/${params.segmentId}/jobs`
  )) as ApiResponse<SegmentJobStatusItem[]>;
};

export const getExportFileS3Url = async (params: {
  projectId: string;
  appId: string;
  segmentId: string;
  jobRunId: string;
}) => {
  return (await apiRequest(
    'get',
    `/segments/${params.segmentId}/jobs/${params.jobRunId}/exportS3Url?projectId=${params.projectId}&appId=${params.appId}`
  )) as ApiResponse<{ presignedUrl: string }>;
};

export const refreshSegment = async (params: {
  segmentId: string;
  appId: string;
}) => {
  return (await apiRequest(
    'get',
    `/segments/${params.segmentId}/refresh?appId=${params.appId}`
  )) as ApiResponse<{ segmentId: string }>;
};

export const getSampleData = async (params: { segmentId: string }) => {
  return (await apiRequest(
    'get',
    `/segments/${params.segmentId}/sampleData`
  )) as ApiResponse<SegmentJobStatusItem>;
};
