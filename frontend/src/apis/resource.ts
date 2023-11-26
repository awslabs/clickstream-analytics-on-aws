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

const fetchStatusWithType = async (params: {
  type: StatusWithType;
  projectId?: string;
  pipelineId?: string;
}) => {
  const result: any = await apiRequest('post', `/env/fetch`, params);
  return result;
};

const getRegionList = async () => {
  const result: any = await apiRequest('get', `/env/regions`);
  return result;
};

const getVPCList = async (params: { region?: string }) => {
  const result: any = await apiRequest('get', `/env/vpc`, params);
  return result;
};

const get3AZVPCList = async (params: { region?: string }) => {
  const result: any = await apiRequest('get', `/env/vpc3az`, params);
  return result;
};

const getSubnetList = async (params: { region: string; vpcId: string }) => {
  const result: any = await apiRequest('get', `/env/vpc/subnet`, params);
  return result;
};

const getHostedZoneList = async () => {
  const result: any = await apiRequest('get', `/env/route53/hostedzones`);
  return result;
};

const getS3BucketList = async (region?: string) => {
  const result: any = await apiRequest('get', `/env/s3/buckets`, {
    region: region,
  });
  return result;
};

const getMSKList = async (params: { vpcId: string; region?: string }) => {
  const result: any = await apiRequest('get', `/env/msk/clusters`, params);
  return result;
};

const getRedshiftCluster = async (params: { region?: string }) => {
  const result: any = await apiRequest('get', `/env/redshift/clusters`, params);
  return result;
};

const getRedshiftServerlessWorkgroup = async (params: { region?: string }) => {
  const result: any = await apiRequest(
    'get',
    `/env/redshift-serverless/workgroups`,
    params
  );
  return result;
};

const getServiceRoles = async (params: { service?: string }) => {
  const result: any = await apiRequest('get', `/env/iam/roles`, params);
  return result;
};

const getServiceRolesByAccount = async (params: { account?: string }) => {
  const result: any = await apiRequest('get', `/env/iam/roles`, params);
  return result;
};

const getCertificates = async (params: { region: string }) => {
  const result: any = await apiRequest('get', `/env/acm/certificates`, params);
  return result;
};

const getQuickSightDetail = async () => {
  const result: any = await apiRequest('get', `/env/quicksight/describe`);
  return result;
};

const getQuickSightStatus = async () => {
  const result: any = await apiRequest('get', `/env/quicksight/ping`);
  return result;
};

const getSSMSecrets = async (params: { region: string }) => {
  const result: any = await apiRequest('get', '/env/ssm/secrets', params);
  return result;
};

const getSecurityGroups = async (params: { region: string; vpcId: string }) => {
  const result: any = await apiRequest(
    'get',
    '/env/vpc/securitygroups',
    params
  );
  return result;
};

const getSTSUploadRole = async () => {
  const result: any = await apiRequest('get', '/env/sts/assume_upload_role');
  return result;
};

const getAlarmList = async (params: {
  pid: string;
  pageNumber: number;
  pageSize: number;
}) => {
  const result: any = await apiRequest('get', '/env/cloudwatch/alarms', params);
  return result;
};

const disableAlarms = async (data: {
  region: string;
  alarmNames: string[];
}) => {
  const result: any = await apiRequest(
    'post',
    `/env/cloudwatch/alarms/disable`,
    data
  );
  return result;
};

const enableAlarms = async (data: { region: string; alarmNames: string[] }) => {
  const result: any = await apiRequest(
    'post',
    `/env/cloudwatch/alarms/enable`,
    data
  );
  return result;
};

const checkServicesAvailable = async (params: { region: string }) => {
  const result: any = await apiRequest(
    'get',
    `/env/ping?region=${params.region}&services=emr-serverless,msk,quicksight,redshift-serverless,global-accelerator`,
    ``
  );
  return result;
};

export {
  fetchStatusWithType,
  get3AZVPCList,
  getCertificates,
  getHostedZoneList,
  getMSKList,
  getQuickSightDetail,
  getQuickSightStatus,
  getRedshiftCluster,
  getRedshiftServerlessWorkgroup,
  getRegionList,
  getS3BucketList,
  getSSMSecrets,
  getSecurityGroups,
  getServiceRoles,
  getServiceRolesByAccount,
  getSubnetList,
  getVPCList,
  getSTSUploadRole,
  getAlarmList,
  disableAlarms,
  enableAlarms,
  checkServicesAvailable,
};
