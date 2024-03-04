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

import { IRegion, ISecurityGroup, IVpc, SubnetType } from '@aws/clickstream-base-lib';
import {
  EC2Client,
  paginateDescribeVpcs,
  paginateDescribeSubnets,
  paginateDescribeSecurityGroups,
  paginateDescribeVpcEndpoints,
  paginateDescribeRouteTables,
  paginateDescribeSecurityGroupRules,
  Vpc,
  VpcEndpoint,
  Filter,
  Subnet,
  RouteTable, DescribeRegionsCommand,
  DescribeAvailabilityZonesCommand,
  paginateDescribeNatGateways,
  NatGateway,
} from '@aws-sdk/client-ec2';

import { SecurityGroupRule } from '@aws-sdk/client-ec2/dist-types/models/models_0';
import { SecurityGroup } from '@aws-sdk/client-ec2/dist-types/models/models_4';
import { PIPELINE_SUPPORTED_REGIONS } from '../../common/constants';
import { aws_sdk_client_common_config } from '../../common/sdk-client-config-ln';
import { ClickStreamSubnet } from '../../common/types';
import { getSubnetRouteTable, getSubnetType, getValueFromTags, isEmpty } from '../../common/utils';

export const describeVpcs = async (region: string, vpcId?: string) => {
  const ec2Client = new EC2Client({
    ...aws_sdk_client_common_config,
    region,
  });
  const records: Vpc[] = [];
  const filters: Filter[] = [{
    Name: 'vpc-id',
    Values: [vpcId!],
  }];
  for await (const page of paginateDescribeVpcs({ client: ec2Client }, {
    Filters: vpcId ? filters : undefined,
  })) {
    records.push(...page.Vpcs as Vpc[]);
  }
  const vpcs: IVpc[] = [];
  for (let vpc of records) {
    if (vpc.VpcId) {
      vpcs.push({
        VpcId: vpc.VpcId,
        Name: getValueFromTags('Name', vpc.Tags!),
        CidrBlock: vpc.CidrBlock ?? '',
        IsDefault: vpc.IsDefault ?? false,
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
  const filters: Filter[] = [{
    Name: 'vpc-id',
    Values: [vpcId],
  }];
  for await (const page of paginateDescribeSubnets({ client: ec2Client }, { Filters: filters })) {
    records.push(...page.Subnets as Subnet[]);
  }
  return records;
};

export const describeNatGateways = async (region: string, vpcId: string) => {
  const ec2Client = new EC2Client({
    ...aws_sdk_client_common_config,
    region,
  });
  const records: NatGateway[] = [];
  const filters: Filter[] = [{
    Name: 'vpc-id',
    Values: [vpcId],
  }];
  for await (const page of paginateDescribeNatGateways({ client: ec2Client }, { Filter: filters })) {
    records.push(...page.NatGateways as NatGateway[]);
  }
  return records;
};

export const describeRouteTables = async (region: string, vpcId: string) => {
  const ec2Client = new EC2Client({
    ...aws_sdk_client_common_config,
    region,
  });
  const records: RouteTable[] = [];
  const filters: Filter[] = [{
    Name: 'vpc-id',
    Values: [vpcId],
  }];
  for await (const page of paginateDescribeRouteTables({ client: ec2Client }, { Filters: filters })) {
    records.push(...page.RouteTables as RouteTable[]);
  }
  return records;
};

export const describeSubnetsWithType = async (region: string, vpcId: string, type: SubnetType) => {
  const subnets = await describeSubnets(region, vpcId);
  const routeTables = await describeRouteTables(region, vpcId);
  const result: ClickStreamSubnet[] = [];
  for (let subnet of subnets) {
    const subnetId = subnet.SubnetId!;
    // Find the routeTable of subnet
    const routeTable = getSubnetRouteTable(routeTables, subnetId);
    const subnetType = getSubnetType(routeTable);
    const clickStreamSubnet: ClickStreamSubnet = {
      id: subnetId,
      name: getValueFromTags('Name', subnet.Tags!),
      cidr: subnet.CidrBlock ?? '',
      availabilityZone: subnet.AvailabilityZone ?? '',
      type: subnetType,
      routeTable: routeTable,
    };
    if (type === SubnetType.ALL || type === subnetType) {
      result.push(clickStreamSubnet);
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
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
    return records[0];
  }
  return {} as Subnet;
};

export const listRegions = async () => {
  const ec2Client = new EC2Client({
    ...aws_sdk_client_common_config,
  });
  const regions: IRegion[] = [];
  const params: DescribeRegionsCommand = new DescribeRegionsCommand({});
  const records = (await ec2Client.send(params)).Regions ?? [];
  records.forEach(
    region => {
      if (region.RegionName && PIPELINE_SUPPORTED_REGIONS.includes(region.RegionName)) {
        regions.push({
          Endpoint: region.Endpoint,
          RegionName: region.RegionName,
          OptInStatus: region.OptInStatus,
        });
      }
    },
  );
  return regions.sort((a, b) => a.RegionName.localeCompare(b.RegionName));
};

export const listAvailabilityZones = async (region: string) => {
  const ec2Client = new EC2Client({
    ...aws_sdk_client_common_config,
    region,
  });
  const params: DescribeAvailabilityZonesCommand = new DescribeAvailabilityZonesCommand({});
  const queryResponse = await ec2Client.send(params);
  return queryResponse.AvailabilityZones ?? [];
};

export const describeVpcSecurityGroups = async (region: string, vpcId: string) => {
  const records = await describeSecurityGroups(region, vpcId);
  const securityGroups: ISecurityGroup[] = [];
  for (let sg of records) {
    securityGroups.push({
      GroupId: sg.GroupId ?? '',
      GroupName: sg.GroupName ?? '',
      Description: sg.Description ?? '',
    });
  }
  return securityGroups.sort((a, b) => a.GroupName.localeCompare(b.GroupName));
};

export const describeSecurityGroups = async (region: string, vpcId: string) => {
  const ec2Client = new EC2Client({
    ...aws_sdk_client_common_config,
    region,
  });
  const records: SecurityGroup[] = [];
  const filters: Filter[] = [{
    Name: 'vpc-id',
    Values: [vpcId],
  }];
  for await (const page of paginateDescribeSecurityGroups({ client: ec2Client }, {
    Filters: filters,
  })) {
    records.push(...page.SecurityGroups as SecurityGroup[]);
  }
  return records;
};

export const describeVpcEndpoints = async (region: string, vpcId: string) => {
  const ec2Client = new EC2Client({
    ...aws_sdk_client_common_config,
    region,
  });
  const records: VpcEndpoint[] = [];
  const filters: Filter[] = [{
    Name: 'vpc-id',
    Values: [vpcId],
  }];
  for await (const page of paginateDescribeVpcEndpoints(
    { client: ec2Client },
    { Filters: filters })) {
    records.push(...page.VpcEndpoints as VpcEndpoint[]);
  }
  return records;
};

export const describeSecurityGroupsWithRules = async (region: string, groupIds: string[]) => {
  const filterGroupIds = groupIds.filter(id => id !== '');
  if (isEmpty(filterGroupIds)) {
    return [];
  }
  const ec2Client = new EC2Client({
    ...aws_sdk_client_common_config,
    region,
  });
  const records: SecurityGroupRule[] = [];
  const filters: Filter[] = [{
    Name: 'group-id',
    Values: filterGroupIds,
  }];
  for await (const page of paginateDescribeSecurityGroupRules(
    { client: ec2Client },
    { Filters: filters })) {
    records.push(...page.SecurityGroupRules as SecurityGroupRule[]);
  }
  return records;
};


