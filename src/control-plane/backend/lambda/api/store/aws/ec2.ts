/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import {
  EC2Client,
  DescribeVpcsCommand,
  DescribeSubnetsCommand,
  DescribeRouteTablesCommand,
  Vpc,
  Filter,
  Subnet,
  Route, DescribeRouteTablesCommandOutput,
} from '@aws-sdk/client-ec2';
import { getPaginatedResults } from '../../common/paginator';
import { getValueFromTags } from '../../common/utils';

export interface ClickStreamVpc {
  readonly id: string;
  readonly name: string;
  readonly cidr: string;
  readonly isDefault: boolean;
}
export interface ClickStreamSubnet {
  readonly id: string;
  readonly name: string;
  readonly cidr: string;
  readonly availabilityZone: string;
  readonly type: string;
}

export const describeVpcs = async (region: string) => {
  const ec2Client = new EC2Client({ region });
  const records = await getPaginatedResults(async (NextToken: any) => {
    const params: DescribeVpcsCommand = new DescribeVpcsCommand({
      NextToken,
    });
    const queryResponse = await ec2Client.send(params);
    return {
      marker: queryResponse.NextToken,
      results: queryResponse.Vpcs,
    };
  });
  let vpcs: ClickStreamVpc[] = [];
  for (let index in records as Vpc[]) {
    vpcs.push({
      id: records[index].VpcId,
      name: getValueFromTags('Name', records[index].Tags),
      cidr: records[index].CidrBlock,
      isDefault: records[index].IsDefault,
    });
  }
  return vpcs;
};

export const describeSubnets = async (region: string, vpcId: string, type: string) => {
  const ec2Client = new EC2Client({ region });
  const records = await getPaginatedResults(async (NextToken: any) => {
    let filters: Filter[] = [{ Name: 'vpc-id', Values: [vpcId] }];
    if (type === 'public') {
      filters.push({ Name: 'map-public-ip-on-launch', Values: ['true'] });
    } else if (type === 'private' || type === 'isolated') {
      filters.push({ Name: 'map-public-ip-on-launch', Values: ['false'] });
    }
    const params: DescribeSubnetsCommand = new DescribeSubnetsCommand({
      Filters: filters,
      NextToken,
    });
    const queryResponse = await ec2Client.send(params);
    return {
      marker: queryResponse.NextToken,
      results: queryResponse.Subnets,
    };
  });
  let subnets: ClickStreamSubnet[] = [];
  for (let index in records as Subnet[]) {
    const subnetId = records[index].SubnetId;
    const routeTable = await getSubnetRouteTable(region, subnetId);
    let isolated = true;
    const routes = routeTable.Routes;
    for (let route of routes as Route[]) {
      if (route.NatGatewayId) {
        isolated = false;
        break;
      }
    }
    const subnetType = records[index].MapPublicIpOnLaunch? 'public' : isolated? 'isolated' : 'private';
    const clickStreamSubnet = {
      id: subnetId,
      name: getValueFromTags('Name', records[index].Tags),
      cidr: records[index].CidrBlock,
      availabilityZone: records[index].AvailabilityZone,
      type: subnetType,
    };
    if (type === 'all' || type === subnetType) {
      subnets.push(clickStreamSubnet);
    }
  }
  return subnets;
};

export const getSubnetRouteTable = async (region: string, subnetId: string) => {
  const ec2Client = new EC2Client({ region });
  // Each subnet in VPC must be associated with a route table.
  let filters: Filter[] = [{ Name: 'association.subnet-id', Values: [subnetId] }];
  const params: DescribeRouteTablesCommand = new DescribeRouteTablesCommand({
    Filters: filters,
  });
  const res: DescribeRouteTablesCommandOutput = await ec2Client.send(params);
  if (!res.RouteTables || res.RouteTables.length !== 1) {
    throw new Error('subnet route table error.');
  }
  return res.RouteTables[0];
};