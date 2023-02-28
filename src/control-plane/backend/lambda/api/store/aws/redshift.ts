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

import { RedshiftClient, DescribeClustersCommand, Cluster, Endpoint } from '@aws-sdk/client-redshift';
import { getPaginatedResults } from '../../common/paginator';

export interface ClickStreamRedshiftCluster {
  readonly name: string;
  readonly nodeType: string;
  readonly endpoint: Endpoint;
  readonly status: string;
}

export const describeRedshiftClusters = async (region: string) => {
  const redshiftClient = new RedshiftClient({ region });

  const records = await getPaginatedResults(async (Marker: any) => {
    const params: DescribeClustersCommand = new DescribeClustersCommand({
      Marker,
    });
    const queryResponse = await redshiftClient.send(params);
    return {
      marker: queryResponse.Marker,
      results: queryResponse.Clusters,
    };
  });
  let clusters: ClickStreamRedshiftCluster[] = [];
  for (let index in records as Cluster[]) {
    clusters.push({
      name: records[index].ClusterIdentifier,
      nodeType: records[index].NodeType,
      endpoint: records[index].Endpoint,
      status: records[index].ClusterStatus,
    });
  }
  return clusters;
};
