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
  EC2Client,
  DescribeVpcsCommand,
  DescribeSubnetsCommand,
  DescribeRouteTablesCommand,
  Vpc,
  Filter,
  Subnet,
  Route,
  DescribeRouteTablesCommandOutput,
  RouteTable,
} from '@aws-sdk/client-ec2';
import { RouteTableAssociation } from '@aws-sdk/client-ec2/dist-types/models/models_2';
import { getPaginatedResults } from '../../common/paginator';
import { ClickStreamVpc, ClickStreamSubnet } from '../../common/types';
import { getValueFromTags, isEmpty } from '../../common/utils';

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
  const vpcs: ClickStreamVpc[] = [];
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
    let subnetType = 'isolated';
    const subnetId = records[index].SubnetId;
    const routeTable = await getSubnetRouteTable(region, vpcId, subnetId);
    const routes = routeTable.Routes;
    for (let route of routes as Route[]) {
      if (route.GatewayId?.startsWith('igw-')) {
        subnetType = 'public';
        break;
      }
      if (route.NatGatewayId) {
        subnetType = 'private';
        break;
      }
    }
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

export const getSubnetRouteTable = async (region: string, vpcId: string, subnetId: string) => {
  const ec2Client = new EC2Client({ region });
  // Each subnet in VPC must be associated with a route table.
  // If a subnet is not explicitly associated with any route table,
  // it is implicitly associated with the main route table.
  let mainRouteTable: RouteTable = {};
  let subnetRouteTable: RouteTable = {};
  const filters: Filter[] = [
    { Name: 'vpc-id', Values: [vpcId] },
  ];
  const params: DescribeRouteTablesCommand = new DescribeRouteTablesCommand({
    Filters: filters,
  });
  const res: DescribeRouteTablesCommandOutput = await ec2Client.send(params);
  for (let routeTable of res.RouteTables as RouteTable[]) {
    for (let association of routeTable.Associations as RouteTableAssociation[]) {
      if (association.Main) {
        mainRouteTable = routeTable;
      } else if (association.SubnetId === subnetId) {
        subnetRouteTable = routeTable;
      }
    }
  }
  return !isEmpty(subnetRouteTable)? subnetRouteTable: mainRouteTable;
};

export const getSubnet = async (region: string, subnetId: string) => {
  const ec2Client = new EC2Client({ region });
  const records = await getPaginatedResults(async (NextToken: any) => {
    const params: DescribeSubnetsCommand = new DescribeSubnetsCommand({
      SubnetIds: [subnetId],
      NextToken,
    });
    const queryResponse = await ec2Client.send(params);
    return {
      marker: queryResponse.NextToken,
      results: queryResponse.Subnets,
    };
  });
  if (records) {
    return records[0] as Subnet;
  }
  return {} as Subnet;
};