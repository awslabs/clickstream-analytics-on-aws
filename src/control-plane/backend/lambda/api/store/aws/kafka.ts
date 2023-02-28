/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { Cluster, KafkaClient, ListClustersV2Command } from '@aws-sdk/client-kafka';
import { getPaginatedResults } from '../../common/paginator';

export interface ClickStreamMSKCluster {
  readonly name: string;
  readonly arn: string;
  readonly type: string;
  readonly state: string;
}

export const listMSKCluster = async (region: string) => {
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
  let clusters: ClickStreamMSKCluster[] = [];
  for (let index in records as Cluster[]) {
    clusters.push({
      name: records[index].ClusterName,
      arn: records[index].ClusterArn,
      type: records[index].ClusterType,
      state: records[index].State,
    });
  }
  return clusters;
};
