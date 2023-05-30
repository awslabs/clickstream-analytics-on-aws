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

import { Cluster, ClusterType, KafkaClient, paginateListClustersV2, ListClustersV2Command, paginateListNodes, NodeInfo } from '@aws-sdk/client-kafka';
import { KafkaConnectClient, ListConnectorsCommand } from '@aws-sdk/client-kafkaconnect';
import { getSubnet } from './ec2';
import { aws_sdk_client_common_config } from '../../common/sdk-client-config-ln';
import { MSKCluster } from '../../common/types';

export const listMSKCluster = async (region: string, vpcId: string) => {
  const kafkaClient = new KafkaClient({
    ...aws_sdk_client_common_config,
    region,
  });
  const records: Cluster[] = [];
  for await (const page of paginateListClustersV2({ client: kafkaClient }, {})) {
    records.push(...page.ClusterInfoList as Cluster[]);
  }

  const clusters: MSKCluster[] = [];
  for (let cluster of records as Cluster[]) {
    if (cluster.ClusterType === ClusterType.PROVISIONED) {
      const securityGroups = cluster.Provisioned?.BrokerNodeGroupInfo?.SecurityGroups;
      const clientSubnets = cluster.Provisioned?.BrokerNodeGroupInfo?.ClientSubnets;
      if (clientSubnets && securityGroups) {
        const subnet = await getSubnet(region, clientSubnets[0]);
        const authentication: string[] = [];
        if (cluster.Provisioned?.ClientAuthentication?.Sasl?.Iam?.Enabled) {
          authentication.push('IAM');
        }
        if (cluster.Provisioned?.ClientAuthentication?.Sasl?.Scram?.Enabled) {
          authentication.push('SASL/SCRAM');
        }
        if (cluster.Provisioned?.ClientAuthentication?.Tls?.Enabled) {
          authentication.push('TLS');
        }
        if (cluster.Provisioned?.ClientAuthentication?.Unauthenticated?.Enabled) {
          authentication.push('Unauthenticated');
        }
        if (subnet.VpcId === vpcId) {
          clusters.push({
            name: cluster.ClusterName?? '',
            arn: cluster.ClusterArn ?? '',
            type: cluster.ClusterType ?? '',
            state: cluster.State ?? '',
            authentication: authentication,
            securityGroupId: securityGroups[0],
          });
        }
      }
    } else {
      if (cluster.Serverless?.VpcConfigs && cluster.Serverless?.VpcConfigs[0].SecurityGroupIds) {
        const securityGroupIds = cluster.Serverless?.VpcConfigs[0].SecurityGroupIds;
        const subnetIds = cluster.Serverless?.VpcConfigs[0].SubnetIds;
        if (subnetIds && securityGroupIds) {
          const subnet = await getSubnet(region, subnetIds[0]);
          if (subnet.VpcId === vpcId) {
            const authentication: string[] = [];
            if (cluster.Serverless?.ClientAuthentication?.Sasl?.Iam?.Enabled) {
              authentication.push('IAM');
            }
            clusters.push({
              name: cluster.ClusterName?? '',
              arn: cluster.ClusterArn ?? '',
              type: cluster.ClusterType ?? '',
              state: cluster.State ?? '',
              authentication: authentication,
              securityGroupId: securityGroupIds[0],
            });
          }
        }
      }
    }
  }
  return clusters;
};

export const listMSKClusterBrokers = async (region: string, clusterArn: string | undefined) => {
  const nodeEndpoints: string[] = [];
  if (!clusterArn) {
    return nodeEndpoints;
  }
  const kafkaClient = new KafkaClient({
    ...aws_sdk_client_common_config,
    region,
  });
  const records: NodeInfo[] = [];
  for await (const page of paginateListNodes({ client: kafkaClient }, { ClusterArn: clusterArn })) {
    records.push(...page.NodeInfoList as NodeInfo[]);
  }

  for (let nodeInfo of records as NodeInfo[]) {
    if (nodeInfo.BrokerNodeInfo !== undefined && nodeInfo.BrokerNodeInfo.Endpoints !== undefined) {
      const endpoints = nodeInfo.BrokerNodeInfo.Endpoints.map(e => `${e}:9092`);
      nodeEndpoints.push(endpoints.join(','));
    }
  }
  return nodeEndpoints;

};

export const mskPing = async (region: string): Promise<boolean> => {
  try {
    const kafkaClient = new KafkaClient({
      ...aws_sdk_client_common_config,
      maxAttempts: 1,
      region,
    });
    const params: ListClustersV2Command = new ListClustersV2Command({});
    await kafkaClient.send(params);
    const kafkaConnectClient = new KafkaConnectClient({
      ...aws_sdk_client_common_config,
      maxAttempts: 1,
      region,
    });
    const paramsConnect: ListConnectorsCommand = new ListConnectorsCommand({});
    await kafkaConnectClient.send(paramsConnect);
  } catch (err) {
    if ((err as Error).name === 'TimeoutError' ||
    (err as Error).message.includes('getaddrinfo ENOTFOUND')) {
      return false;
    }
  }
  return true;
};
