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

import { RedshiftClient, Cluster, paginateDescribeClusters } from '@aws-sdk/client-redshift';
import {
  RedshiftServerlessClient,
  GetWorkgroupCommand,
  Workgroup,
  GetNamespaceCommand,
  paginateListWorkgroups,
} from '@aws-sdk/client-redshift-serverless';
import { aws_sdk_client_common_config } from '../../common/sdk-client-config-ln';
import { RedshiftCluster, RedshiftServerlessWorkgroup, RedshiftWorkgroup } from '../../common/types';

export const describeRedshiftClusters = async (region: string, vpcId: string) => {
  const redshiftClient = new RedshiftClient({
    ...aws_sdk_client_common_config,
    region,
  });
  const records: Cluster[] = [];
  for await (const page of paginateDescribeClusters({ client: redshiftClient }, {})) {
    records.push(...page.Clusters as Cluster[]);
  }

  const clusters: RedshiftCluster[] = [];
  for (let cluster of records as Cluster[]) {
    if (cluster.VpcId === vpcId) {
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

export const getRedshiftWorkgroupAndNamespace = async (region: string, name: string) => {
  const redshiftServerlessClient = new RedshiftServerlessClient({
    ...aws_sdk_client_common_config,
    region,
  });
  const getWorkgroupCommand: GetWorkgroupCommand = new GetWorkgroupCommand({
    workgroupName: name,
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
        workgroupId: getWorkgroupCommandOutput.workgroup.workgroupId ?? '',
        workgroupArn: getWorkgroupCommandOutput.workgroup.workgroupArn ?? '',
        workgroupName: getWorkgroupCommandOutput.workgroup.workgroupName ?? '',
        namespaceId: getNamespaceCommandOutput.namespace.namespaceId ?? '',
        namespaceArn: getNamespaceCommandOutput.namespace.namespaceArn ?? '',
        namespaceName: getNamespaceCommandOutput.namespace.namespaceName ?? '',
      } as RedshiftServerlessWorkgroup;
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

