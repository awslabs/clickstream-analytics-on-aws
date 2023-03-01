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

const getS3BucketList = async () => {
  const result: any = await apiRequest('get', `/env/s3/buckets`);
  return result;
};

export {
  getRegionList,
  getVPCList,
  getSubnetList,
  getHostedZoneList,
  getS3BucketList,
};
