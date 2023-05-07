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
  RedshiftClient,
  paginateDescribeClusters,
  Cluster,
} from '@aws-sdk/client-redshift';
import {
  RedshiftServerlessClient,
  GetWorkgroupCommand,
  Workgroup,
  GetNamespaceCommand,
  paginateListWorkgroups,
} from '@aws-sdk/client-redshift-serverless';
import { aws_sdk_client_common_config } from '../../common/sdk-client-config-ln';
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
  for (let cluster of records as Cluster[]) {
    if (!vpcId) {
      clusters.push({
        name: cluster.ClusterIdentifier ?? '',
        nodeType: cluster.NodeType ?? '',
        endpoint: cluster.Endpoint,
        status: cluster.ClusterStatus ?? '',
        masterUsername: cluster.MasterUsername ?? '',
        publiclyAccessible: cluster.PubliclyAccessible ?? false,
      });
    } else if (cluster.VpcId === vpcId) {
      clusters.push({
        name: cluster.ClusterIdentifier ?? '',
        nodeType: cluster.NodeType ?? '',
        endpoint: cluster.Endpoint,
        status: cluster.ClusterStatus ?? '',
        masterUsername: cluster.MasterUsername ?? '',
        publiclyAccessible: cluster.PubliclyAccessible ?? false,
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
        publiclyAccessible: getWorkgroupCommandOutput.workgroup.publiclyAccessible,
        workgroupId: getWorkgroupCommandOutput.workgroup.workgroupId ?? '',
        workgroupArn: getWorkgroupCommandOutput.workgroup.workgroupArn ?? '',
        workgroupName: getWorkgroupCommandOutput.workgroup.workgroupName ?? '',
        namespaceId: getNamespaceCommandOutput.namespace.namespaceId ?? '',
        namespaceArn: getNamespaceCommandOutput.namespace.namespaceArn ?? '',
        namespaceName: getNamespaceCommandOutput.namespace.namespaceName ?? '',
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
    return {
      endpoint: {
        address: clusters[0].endpoint?.Address ?? '',
        port: clusters[0].endpoint?.Port ?? 5439,
      },
      publiclyAccessible: clusters[0].publiclyAccessible,
    } as RedshiftInfo;
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
  for (let workgroup of records as Workgroup[]) {
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

