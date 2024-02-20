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

import { Cluster, ClusterType, KafkaClient, paginateListClustersV2, paginateListNodes, NodeInfo, ClientAuthentication } from '@aws-sdk/client-kafka';
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
  for (let cluster of records) {
    let mskCluster: MSKCluster | undefined;
    if (cluster.ClusterType === ClusterType.PROVISIONED) {
      mskCluster = await _provisionedMSKCluster(cluster, region, vpcId);
    } else {
      mskCluster = await _serverlessMSKCluster(cluster, region, vpcId);
    }
    if (mskCluster) {clusters.push(mskCluster);}
  }
  return clusters;
};

async function _serverlessMSKCluster(cluster: Cluster, region: string, vpcId: string) {
  if (cluster.Serverless?.VpcConfigs && cluster.Serverless?.VpcConfigs[0].SecurityGroupIds) {
    const securityGroupIds = cluster.Serverless.VpcConfigs[0].SecurityGroupIds;
    const subnetIds = cluster.Serverless.VpcConfigs[0].SubnetIds;
    if (subnetIds && securityGroupIds) {
      const subnet = await getSubnet(region, subnetIds[0]);
      if (subnet.VpcId === vpcId) {
        const authentication: string[] = _getAuthenticationMethods(cluster.Serverless.ClientAuthentication);
        return {
          name: cluster.ClusterName?? '',
          arn: cluster.ClusterArn ?? '',
          type: cluster.ClusterType ?? '',
          state: cluster.State ?? '',
          authentication: authentication,
          securityGroupId: securityGroupIds[0],
          clientBroker: '',
        };
      }
    }
  }
  return undefined;
}

async function _provisionedMSKCluster(cluster: Cluster, region: string, vpcId: string) {
  const securityGroups = cluster.Provisioned?.BrokerNodeGroupInfo?.SecurityGroups;
  const clientSubnets = cluster.Provisioned?.BrokerNodeGroupInfo?.ClientSubnets;
  if (clientSubnets && securityGroups) {
    const subnet = await getSubnet(region, clientSubnets[0]);
    const authentication: string[] = _getAuthenticationMethods(cluster.Provisioned?.ClientAuthentication);
    if (subnet.VpcId === vpcId) {
      return {
        name: cluster.ClusterName?? '',
        arn: cluster.ClusterArn ?? '',
        type: cluster.ClusterType ?? '',
        state: cluster.State ?? '',
        authentication: authentication,
        securityGroupId: securityGroups[0],
        clientBroker: cluster.Provisioned?.EncryptionInfo?.EncryptionInTransit?.ClientBroker ?? '',
      };
    }
  }
  return undefined;
}

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

  for (let nodeInfo of records) {
    if (nodeInfo.BrokerNodeInfo !== undefined && nodeInfo.BrokerNodeInfo.Endpoints !== undefined) {
      const endpoints = nodeInfo.BrokerNodeInfo.Endpoints.map(e => `${e}:9092`);
      nodeEndpoints.push(endpoints.join(','));
    }
  }
  return nodeEndpoints;

};

function _getAuthenticationMethods(clientAuth?: ClientAuthentication) {
  const authentication: string[] = [];
  if (clientAuth?.Sasl?.Iam?.Enabled) {
    authentication.push('IAM');
  }
  if (clientAuth?.Sasl?.Scram?.Enabled) {
    authentication.push('SASL/SCRAM');
  }
  if (clientAuth?.Tls?.Enabled) {
    authentication.push('TLS');
  }
  if (clientAuth?.Unauthenticated?.Enabled) {
    authentication.push('Unauthenticated');
  }
  return authentication;
}