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

const getVPCList = async (region?: string) => {
  const result: any = await apiRequest('get', `/env/vpc?region=${region}`);
  return result;
};

interface SubnetsPrams {
  region: string;
  vpcId: string;
}
const getSubnetList = async (subnetParams: SubnetsPrams) => {
  const result: any = await apiRequest('get', `/env/vpc/subnet`, subnetParams);
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

const getMSKList = async (vpcId: string, region?: string) => {
  const result: any = await apiRequest('get', `/env/msk/clusters`, {
    vpcId: vpcId,
    region: region,
  });
  return result;
};

const getRedshiftCluster = async (vpcId: string, region?: string) => {
  const result: any = await apiRequest('get', `/env/redshift/clusters`, {
    vpcId: vpcId,
    region: region,
  });
  return result;
};

const getServiceRoles = async (service?: string) => {
  const result: any = await apiRequest('get', `/env/iam/roles`, {
    service: service,
  });
  return result;
};

export {
  getRegionList,
  getVPCList,
  getSubnetList,
  getHostedZoneList,
  getS3BucketList,
  getMSKList,
  getRedshiftCluster,
  getServiceRoles,
};
