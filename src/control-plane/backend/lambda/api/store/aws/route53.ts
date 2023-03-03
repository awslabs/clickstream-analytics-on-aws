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

import { Route53Client, ListHostedZonesCommand, HostedZone } from '@aws-sdk/client-route-53';
import { getPaginatedResults } from '../../common/paginator';

export interface Route53HostedZone {
  readonly id: string;
  readonly name: string;
}

export const listHostedZones = async () => {
  const route53Client = new Route53Client({});
  const records = await getPaginatedResults(async (Marker: any) => {
    const params: ListHostedZonesCommand = new ListHostedZonesCommand({
      Marker,
    });
    const queryResponse = await route53Client.send(params);
    return {
      marker: queryResponse.Marker,
      results: queryResponse.HostedZones,
    };
  });
  const hostedZones: Route53HostedZone[] = [];
  if (records) {
    for (let index in records as HostedZone[]) {
      hostedZones.push({
        id: records[index].Id.split('/')[2],
        name: records[index].Name,
      });
    }
  }
  return hostedZones;
};
