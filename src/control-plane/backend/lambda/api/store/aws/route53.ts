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

import { Route53Client, paginateListHostedZones, HostedZone } from '@aws-sdk/client-route-53';
import { Route53HostedZone } from '../../common/types';

export const listHostedZones = async () => {
  const route53Client = new Route53Client({});
  const records: HostedZone[] = [];
  for await (const page of paginateListHostedZones({ client: route53Client }, {})) {
    records.push(...page.HostedZones as HostedZone[]);
  }
  const hostedZones: Route53HostedZone[] = [];
  if (records) {
    for (let hostedZone of records as HostedZone[]) {
      if (hostedZone.Id) {
        hostedZones.push({
          id: hostedZone.Id?.split('/')[2],
          name: hostedZone.Name ?? '',
        });
      }
    }
  }
  return hostedZones;
};
