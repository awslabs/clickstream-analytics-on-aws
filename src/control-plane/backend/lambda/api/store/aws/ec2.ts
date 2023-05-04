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
  paginateDescribeVpcs,
  paginateDescribeSubnets,
  paginateDescribeSecurityGroups,
  DescribeRouteTablesCommand,
  Vpc,
  Filter,
  Subnet,
  Route,
  DescribeRouteTablesCommandOutput,
  RouteTable, DescribeRegionsCommand,
  RouteTableAssociation,
  Region,
} from '@aws-sdk/client-ec2';

import { SecurityGroup } from '@aws-sdk/client-ec2/dist-types/models/models_4';
import { aws_sdk_client_common_config } from '../../common/sdk-client-config-ln';
import { ClickStreamVpc, ClickStreamSubnet, ClickStreamRegion, ClickStreamSecurityGroup } from '../../common/types';
import { getValueFromTags, isEmpty } from '../../common/utils';

export const describeVpcs = async (region: string) => {
  const ec2Client = new EC2Client({
    ...aws_sdk_client_common_config,
    region,
  });
  const records: Vpc[] = [];
  for await (const page of paginateDescribeVpcs({ client: ec2Client }, {})) {
    records.push(...page.Vpcs as Vpc[]);
  }
  const vpcs: ClickStreamVpc[] = [];
  for (let vpc of records as Vpc[]) {
    vpcs.push({
      id: vpc.VpcId ?? '',
      name: getValueFromTags('Name', vpc.Tags!),
      cidr: vpc.CidrBlock ?? '',
      isDefault: vpc.IsDefault ?? false,
    });
  }
  return vpcs;
};

export const describeVpcs3AZ = async (region: string) => {
  const ec2Client = new EC2Client({
    ...aws_sdk_client_common_config,
    region,
  });
  const records: Vpc[] = [];
  for await (const page of paginateDescribeVpcs({ client: ec2Client }, {})) {
    records.push(...page.Vpcs as Vpc[]);
  }
  const vpcs: ClickStreamVpc[] = [];
  for (let vpc of records as Vpc[]) {
    const subnets = await describeSubnets(region, vpc.VpcId!);
    const azSet = new Set();
    for (let subnet of subnets) {
      if (subnet.AvailabilityZone) {
        azSet.add(subnet.AvailabilityZone);
      }
    }
    if (azSet.size >= 3) {
      vpcs.push({
        id: vpc.VpcId ?? '',
        name: getValueFromTags('Name', vpc.Tags!),
        cidr: vpc.CidrBlock ?? '',
        isDefault: vpc.IsDefault ?? false,
      });
    }
  }
  return vpcs;
};

export const describeSubnets = async (region: string, vpcId: string) => {
  const ec2Client = new EC2Client({
    ...aws_sdk_client_common_config,
    region,
  });
  const records: Subnet[] = [];
  const filters: Filter[] = [{ Name: 'vpc-id', Values: [vpcId] }];
  for await (const page of paginateDescribeSubnets({ client: ec2Client }, { Filters: filters })) {
    records.push(...page.Subnets as Subnet[]);
  }
  return records;
};

export const describeSubnetsWithType = async (region: string, vpcId: string, type: string) => {
  const records = await describeSubnets(region, vpcId);
  let subnets: ClickStreamSubnet[] = [];
  for (let subnet of records as Subnet[]) {
    let subnetType = 'isolated';
    const subnetId = subnet.SubnetId;
    if (subnetId) {
      const routeTable = await getSubnetRouteTable(region, vpcId, subnetId);
      const routes = routeTable.Routes;
      for (let route of routes as Route[]) {
        if (route.GatewayId?.startsWith('igw-')) {
          subnetType = 'public';
          break;
        }
        if (route.DestinationCidrBlock === '0.0.0.0/0') {
          subnetType = 'private';
          break;
        }
      }
      const clickStreamSubnet = {
        id: subnetId,
        name: getValueFromTags('Name', subnet.Tags!),
        cidr: subnet.CidrBlock ?? '',
        availabilityZone: subnet.AvailabilityZone ?? '',
        type: subnetType,
      };
      if (type === 'all' || type === subnetType || (type === 'private' && subnetType === 'isolated')) {
        subnets.push(clickStreamSubnet);
      }
    }
  }
  return subnets;
};

export const getSubnetRouteTable = async (region: string, vpcId: string, subnetId: string) => {
  const ec2Client = new EC2Client({
    ...aws_sdk_client_common_config,
    region,
  });
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
  const ec2Client = new EC2Client({
    ...aws_sdk_client_common_config,
    region,
  });
  const records: Subnet[] = [];
  for await (const page of paginateDescribeSubnets({ client: ec2Client }, { SubnetIds: [subnetId] })) {
    records.push(...page.Subnets as Subnet[]);
  }
  if (records) {
    return records[0] as Subnet;
  }
  return {} as Subnet;
};

export const listRegions = async () => {
  const ec2Client = new EC2Client({
    ...aws_sdk_client_common_config,
  });

  const params: DescribeRegionsCommand = new DescribeRegionsCommand({});
  const queryResponse = await ec2Client.send(params);
  const regions: ClickStreamRegion[] = [];
  for (let region of queryResponse.Regions as Region[]) {
    regions.push({
      id: region.RegionName ?? '',
    });
  }
  return regions;
};

export const describeSecurityGroups = async (region: string, vpcId: string) => {
  const ec2Client = new EC2Client({
    ...aws_sdk_client_common_config,
    region,
  });
  const records: SecurityGroup[] = [];
  const filters: Filter[] = [{ Name: 'vpc-id', Values: [vpcId] }];
  for await (const page of paginateDescribeSecurityGroups({ client: ec2Client }, {
    Filters: filters,
  })) {
    records.push(...page.SecurityGroups as SecurityGroup[]);
  }
  const securityGroups: ClickStreamSecurityGroup[] = [];
  for (let sg of records as SecurityGroup[]) {
    securityGroups.push({
      id: sg.GroupId ?? '',
      name: sg.GroupName ?? '',
      description: sg.Description ?? '',
    });
  }
  return securityGroups;
};