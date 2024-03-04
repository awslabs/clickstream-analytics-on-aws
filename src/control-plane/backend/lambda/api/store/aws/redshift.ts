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

import { IRedshiftCluster, IRedshiftServerlessWorkGroup } from '@aws/clickstream-base-lib';
import {
  RedshiftClient,
  paginateDescribeClusters,
  paginateDescribeClusterSubnetGroups,
  ClusterSubnetGroup,
  Cluster,
  VpcSecurityGroupMembership,
} from '@aws-sdk/client-redshift';
import {
  RedshiftServerlessClient,
  GetWorkgroupCommand,
  Workgroup,
  GetNamespaceCommand,
  paginateListWorkgroups,
} from '@aws-sdk/client-redshift-serverless';
import { aws_sdk_client_common_config } from '../../common/sdk-client-config-ln';
import { RedshiftInfo } from '../../common/types';

export const describeRedshiftClusters = async (region: string, vpcId?: string, clusterIdentifier?: string) => {
  const redshiftClient = new RedshiftClient({
    ...aws_sdk_client_common_config,
    region,
  });
  const records: Cluster[] = [];
  for await (const page of paginateDescribeClusters({ client: redshiftClient }, {
    ClusterIdentifier: clusterIdentifier,
  })) {
    records.push(...page.Clusters as Cluster[]);
  }

  const clusters: IRedshiftCluster[] = [];
  for (let cluster of records) {
    if (!vpcId || cluster.VpcId === vpcId) {
      const vpcSecurityGroupIds: string[] = [];
      cluster.VpcSecurityGroups?.forEach((sg: VpcSecurityGroupMembership) => {
        vpcSecurityGroupIds.push(sg.VpcSecurityGroupId!);
      });
      clusters.push({
        Name: cluster.ClusterIdentifier ?? '',
        NodeType: cluster.NodeType ?? '',
        Endpoint: {
          Address: cluster.Endpoint?.Address ?? '',
          Port: cluster.Endpoint?.Port ?? 5439,
        },
        Status: cluster.ClusterStatus ?? '',
        MasterUsername: cluster.MasterUsername ?? '',
        PubliclyAccessible: cluster.PubliclyAccessible ?? false,
        VpcSecurityGroupIds: vpcSecurityGroupIds,
        ClusterSubnetGroupName: cluster.ClusterSubnetGroupName ?? '',
        VpcId: cluster.VpcId ?? '',
      });
    }
  }
  return clusters;
};

export const getRedshiftServerlessInfo = async (region: string, workgroupName: string) => {
  const redshiftServerlessClient = new RedshiftServerlessClient({
    ...aws_sdk_client_common_config,
    region,
  });
  const getWorkgroupCommand: GetWorkgroupCommand = new GetWorkgroupCommand({
    workgroupName: workgroupName,
  });
  const getWorkgroupCommandOutput = await redshiftServerlessClient.send(getWorkgroupCommand);
  if (getWorkgroupCommandOutput.workgroup) {
    const workgroup: Workgroup = getWorkgroupCommandOutput.workgroup;
    const getNamespaceCommand: GetNamespaceCommand = new GetNamespaceCommand({
      namespaceName: workgroup.namespaceName,
    });
    const getNamespaceCommandOutput = await redshiftServerlessClient.send(getNamespaceCommand);
    if (getNamespaceCommandOutput.namespace) {
      return {
        endpoint: getWorkgroupCommandOutput.workgroup.endpoint,
        network: {
          subnetIds: getWorkgroupCommandOutput.workgroup.subnetIds,
          securityGroups: getWorkgroupCommandOutput.workgroup.securityGroupIds,
        },
        publiclyAccessible: getWorkgroupCommandOutput.workgroup.publiclyAccessible,
        serverless: {
          workgroupId: getWorkgroupCommandOutput.workgroup.workgroupId ?? '',
          workgroupArn: getWorkgroupCommandOutput.workgroup.workgroupArn ?? '',
          workgroupName: getWorkgroupCommandOutput.workgroup.workgroupName ?? '',
          namespaceId: getNamespaceCommandOutput.namespace.namespaceId ?? '',
          namespaceArn: getNamespaceCommandOutput.namespace.namespaceArn ?? '',
          namespaceName: getNamespaceCommandOutput.namespace.namespaceName ?? '',
        },
      } as RedshiftInfo;
    }
  }

  return undefined;
};

export const getRedshiftInfo = async (region: string, workgroupName?: string, clusterIdentifier?: string) => {

  if (workgroupName) {
    return getRedshiftServerlessInfo(region, workgroupName);
  } else if (clusterIdentifier) {
    const clusters = await describeRedshiftClusters(region, undefined, clusterIdentifier);
    if (clusters && clusters.length === 1) {
      const cluster = clusters[0];
      const subnetIds = await getSubnetsByClusterSubnetGroup(region, cluster.ClusterSubnetGroupName);
      const redshiftInfo: RedshiftInfo = {
        endpoint: {
          address: cluster.Endpoint?.Address ?? '',
          port: cluster.Endpoint?.Port ?? 5439,
        },
        network: {
          vpcId: cluster.VpcId,
          securityGroups: cluster.VpcSecurityGroupIds,
          subnetIds: subnetIds,
        },
        publiclyAccessible: cluster.PubliclyAccessible,
      };
      return redshiftInfo;
    }

  }

  return undefined;
};

export const listRedshiftServerlessWorkgroups = async (region: string) => {
  const redshiftServerlessClient = new RedshiftServerlessClient({
    ...aws_sdk_client_common_config,
    region,
  });
  const records: Workgroup[] = [];
  for await (const page of paginateListWorkgroups({ client: redshiftServerlessClient }, {})) {
    records.push(...page.workgroups as Workgroup[]);
  }
  const workGroups: IRedshiftServerlessWorkGroup[] = [];
  for (let workgroup of records) {
    workGroups.push({
      Id: workgroup.workgroupId ?? '',
      Arn: workgroup.workgroupArn ?? '',
      Name: workgroup.workgroupName ?? '',
      Namespace: workgroup.namespaceName ?? '',
      Status: workgroup.status ?? '',
    });
  }
  return workGroups;
};

export const describeClusterSubnetGroups = async (region: string, clusterSubnetGroupName: string) => {
  const redshiftClient = new RedshiftClient({
    ...aws_sdk_client_common_config,
    region,
  });
  const records: ClusterSubnetGroup[] = [];
  for await (const page of paginateDescribeClusterSubnetGroups({ client: redshiftClient }, {
    ClusterSubnetGroupName: clusterSubnetGroupName,
  })) {
    records.push(...page.ClusterSubnetGroups as ClusterSubnetGroup[]);
  }
  return records;
};

export const getSubnetsByClusterSubnetGroup = async (region: string, clusterSubnetGroupName: string) => {
  let subnetIds: string[] = [];
  const subnetGroups = await describeClusterSubnetGroups(region, clusterSubnetGroupName);
  if (subnetGroups && subnetGroups.length === 1) {
    const group = subnetGroups[0];
    if (group.Subnets) {
      for (let subnet of group.Subnets) {
        subnetIds.push(subnet.SubnetIdentifier!);
      }
    }
  }
  return subnetIds;
};
