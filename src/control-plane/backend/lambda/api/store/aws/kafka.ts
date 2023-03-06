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

import { Cluster, ClusterType, KafkaClient, ListClustersV2Command } from '@aws-sdk/client-kafka';
import { getSubnet } from './ec2';
import { getPaginatedResults } from '../../common/paginator';

export interface ClickStreamMSKCluster {
  readonly name: string;
  readonly arn: string;
  readonly type: string;
  readonly state: string;
  readonly securityGroupId: string;
}

export const listMSKCluster = async (region: string, vpcId: string) => {
  const kafkaClient = new KafkaClient({ region });
  const records = await getPaginatedResults(async (NextToken: any) => {
    const params: ListClustersV2Command = new ListClustersV2Command({
      NextToken,
    });
    const queryResponse = await kafkaClient.send(params);
    return {
      marker: queryResponse.NextToken,
      results: queryResponse.ClusterInfoList,
    };
  });
  const clusters: ClickStreamMSKCluster[] = [];
  for (let cluster of records as Cluster[]) {
    if (cluster.ClusterType === ClusterType.PROVISIONED) {
      const securityGroups = cluster.Provisioned?.BrokerNodeGroupInfo?.SecurityGroups;
      const clientSubnets = cluster.Provisioned?.BrokerNodeGroupInfo?.ClientSubnets;
      if (clientSubnets && securityGroups) {
        const subnet = await getSubnet(region, clientSubnets[0]);
        if (subnet.VpcId === vpcId) {
          clusters.push({
            name: cluster.ClusterName?? '',
            arn: cluster.ClusterArn ?? '',
            type: cluster.ClusterType ?? '',
            state: cluster.State ?? '',
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
            clusters.push({
              name: cluster.ClusterName?? '',
              arn: cluster.ClusterArn ?? '',
              type: cluster.ClusterType ?? '',
              state: cluster.State ?? '',
              securityGroupId: securityGroupIds[0],
            });
          }
        }
      }
    }
  }
  return clusters;
};

export const mskPing = async (region: string): Promise<boolean> => {
  try {
    const kafkaClient = new KafkaClient({ region });
    const params: ListClustersV2Command = new ListClustersV2Command({});
    await kafkaClient.send(params);
  } catch (err) {
    if ((err as Error).name === 'UnrecognizedClientException') {
      return false;
    }
  }
  return true;
};
