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

import { aws_sdk_client_common_config } from '@aws/clickstream-base-lib';
import {
  RedshiftClient,
  paginateDescribeClusters,
  paginateDescribeClusterSubnetGroups,
  ClusterSubnetGroup,
  Cluster,
} from '@aws-sdk/client-redshift';
import {
  RedshiftServerlessClient,
  GetWorkgroupCommand,
  Workgroup,
  GetNamespaceCommand,
  paginateListWorkgroups,
} from '@aws-sdk/client-redshift-serverless';
import { RedshiftCluster, RedshiftInfo, RedshiftWorkgroup } from '../../common/types';

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

  const clusters: RedshiftCluster[] = [];
  for (let cluster of records) {
    if (!vpcId || cluster.VpcId === vpcId) {
      clusters.push({
        name: cluster.ClusterIdentifier ?? '',
        nodeType: cluster.NodeType ?? '',
        endpoint: cluster.Endpoint,
        status: cluster.ClusterStatus ?? '',
        masterUsername: cluster.MasterUsername ?? '',
        publiclyAccessible: cluster.PubliclyAccessible ?? false,
        vpcSecurityGroups: cluster.VpcSecurityGroups ?? [],
        clusterSubnetGroupName: cluster.ClusterSubnetGroupName ?? '',
        vpcId: cluster.VpcId ?? '',
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
      let vpcSecurityGroups: string[] = [];
      if (cluster && cluster.vpcSecurityGroups) {
        for (let sg of cluster.vpcSecurityGroups) {
          vpcSecurityGroups.push(sg.VpcSecurityGroupId!);
        }
      }
      const subnetIds = await getSubnetsByClusterSubnetGroup(region, cluster.clusterSubnetGroupName);
      const redshiftInfo: RedshiftInfo = {
        endpoint: {
          address: cluster.endpoint?.Address ?? '',
          port: cluster.endpoint?.Port ?? 5439,
        },
        network: {
          vpcId: cluster.vpcId,
          securityGroups: vpcSecurityGroups,
          subnetIds: subnetIds,
        },
        publiclyAccessible: cluster.publiclyAccessible,
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
  const workgroups: RedshiftWorkgroup[] = [];
  for (let workgroup of records) {
    workgroups.push({
      id: workgroup.workgroupId ?? '',
      arn: workgroup.workgroupArn ?? '',
      name: workgroup.workgroupName ?? '',
      namespace: workgroup.namespaceName ?? '',
      status: workgroup.status ?? '',
    });
  }
  return workgroups;
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
