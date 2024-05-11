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
import { AliasListEntry, KMSClient, paginateListAliases } from '@aws-sdk/client-kms';
import { awsAccountId, awsPartition } from '../../common/constants';

export const listAliases = async (region: string) => {
  const client = new KMSClient({
    ...aws_sdk_client_common_config,
    region,
  });

  const records: AliasListEntry[] = [];
  for await (const page of paginateListAliases({ client: client }, {})) {
    records.push(...page.Aliases as AliasListEntry[]);
  }
  return records;
};

export const getKeyArnByAlias = async (region: string, alias: string) => {
  const aliases = await listAliases(region);
  const key = aliases.find((a) => a.AliasName === alias);
  return `arn:${awsPartition}:kms:${region}:${awsAccountId}:key/${key?.TargetKeyId}`;
};
