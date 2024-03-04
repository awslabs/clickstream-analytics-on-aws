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
  DomainAvailableRequest,
  ListACMCertificatesRequest,
  ListAlarmsRequest,
  ListBucketsRequest,
  ListMSKClustersRequest,
  ListRedshiftClustersRequest,
  ListRedshiftServerlessWorkGroupsRequest,
  ListRolesRequest,
  ListSSMSecretsRequest,
  ListSecurityGroupsRequest,
  ListSubnetsRequest,
  ListVpcRequest,
  ServicesAvailableRequest,
  UpdateAlarmsRequest,
} from '@aws/clickstream-base-lib';
import { apiRequest } from 'ts/request';

export const getRegionList = async () => {
  const result: any = apiRequest('get', '/env/regions');
  return result;
};

export const getVPCList = async (params: ListVpcRequest) => {
  const result: any = await apiRequest('get', '/env/vpcs', params);
  return result;
};

export const getSubnetList = async (params: ListSubnetsRequest) => {
  const result: any = await apiRequest(
    'get',
    `/env/vpc/${params.vpcId}/subnets`,
    { region: params.region, subnetType: params.subnetType }
  );
  return result;
};

export const getSecurityGroups = async (params: ListSecurityGroupsRequest) => {
  const result: any = await apiRequest(
    'get',
    `/env/vpc/${params.vpcId}/securityGroups`,
    { region: params.region }
  );
  return result;
};

export const getS3BucketList = async (params: ListBucketsRequest) => {
  const result: any = await apiRequest('get', '/env/buckets', params);
  return result;
};

export const getMSKList = async (params: ListMSKClustersRequest) => {
  const result: any = await apiRequest('get', '/env/MSKClusters', params);
  return result;
};

export const getRedshiftCluster = async (
  params: ListRedshiftClustersRequest
) => {
  const result: any = await apiRequest('get', '/env/redshiftClusters', params);
  return result;
};

export const getRedshiftServerlessWorkgroup = async (
  params: ListRedshiftServerlessWorkGroupsRequest
) => {
  const result: any = await apiRequest(
    'get',
    '/env/redshiftServerlessWorkGroups',
    params
  );
  return result;
};

export const getServiceRoles = async (params: ListRolesRequest) => {
  const result: any = await apiRequest('get', '/env/IAMRoles', params);
  return result;
};

export const getCertificates = async (params: ListACMCertificatesRequest) => {
  const result: any = await apiRequest('get', '/env/ACMCertificates', params);
  return result;
};

export const describeQuickSightSubscription = async () => {
  const result: any = await apiRequest('get', '/env/quickSightSubscription');
  return result;
};

export const getSSMSecrets = async (params: ListSSMSecretsRequest) => {
  const result: any = await apiRequest('get', '/env/SSMSecrets', params);
  return result;
};

export const getSTSUploadRole = async () => {
  const result: any = await apiRequest('get', '/env/uploadRole');
  return result;
};

export const getAlarmList = async (params: ListAlarmsRequest) => {
  const result: any = await apiRequest('get', '/env/alarms', params);
  return result;
};

export const updateAlarms = async (data: UpdateAlarmsRequest) => {
  const result: any = await apiRequest('put', '/env/alarm', data);
  return result;
};

export const checkServicesAvailable = async (
  params: ServicesAvailableRequest
) => {
  const result: any = await apiRequest('get', '/env/servicesAvailable', params);
  return result;
};

export const fetchStatusWithType = async (params: DomainAvailableRequest) => {
  const result: any = await apiRequest('get', '/env/domainAvailable', params);
  return result;
};
