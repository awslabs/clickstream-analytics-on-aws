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

const getRedshiftCluster = async (params: {
  vpcId: string;
  region?: string;
}) => {
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

const getQuickSightUsers = async () => {
  const result: any = await apiRequest('get', `/env/quicksight/users`);
  return result;
};

const unsubscribQuickSight = async () => {
  const result: any = await apiRequest(
    'post',
    `/env/quicksight/unsubscription`
  );
  return result;
};

const subscribQuickSight = async (params: {
  email: string;
  accountName: string;
}) => {
  const result: any = await apiRequest(
    'post',
    `/env/quicksight/subscription`,
    params
  );
  return result;
};

const createQuickSightUser = async (params: {
  email: string;
  accountName: string;
}) => {
  const result: any = await apiRequest('post', `/env/quicksight/user`, params);
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

export {
  createQuickSightUser,
  get3AZVPCList,
  getCertificates,
  getHostedZoneList,
  getMSKList,
  getQuickSightDetail,
  getQuickSightStatus,
  getQuickSightUsers,
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
  subscribQuickSight,
  unsubscribQuickSight,
};
