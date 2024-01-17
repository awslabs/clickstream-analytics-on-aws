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

import { AccessDeniedException, ListUsersCommand, QuickSight, QuickSightClient, QuickSightClientConfig } from '@aws-sdk/client-quicksight';
import { RedshiftDataClient, RedshiftDataClientConfig } from '@aws-sdk/client-redshift-data';
import { STSClient, STSClientConfig } from '@aws-sdk/client-sts';
import { fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import { awsAccountId, awsRegion } from './constants';
import { REGION_PATTERN } from './constants-ln';
import { aws_sdk_client_common_config } from './sdk-client-config-ln';


type CacheValue = string | STSClient | RedshiftDataClient | QuickSight | QuickSightClient;

export class SDKClient {
  private cache: {[key: string]: CacheValue};

  constructor() {
    this.cache = {};
  }

  public STSClient(config: STSClientConfig): STSClient {
    const key = `STSClient-${config.region}`;
    if (this.cache[key]) {
      return this.cache[key] as STSClient;
    }
    const client = new STSClient({
      ...aws_sdk_client_common_config,
      ...config,
    });
    this.cache[key] = client;
    return client;
  };

  public RedshiftDataClient(config: RedshiftDataClientConfig, assumeRole: string): RedshiftDataClient {
    const key = `RedshiftDataClient-${assumeRole}`;
    if (this.cache[key]) {
      return this.cache[key] as RedshiftDataClient;
    }
    const client = new RedshiftDataClient({
      ...aws_sdk_client_common_config,
      ...config,
      credentials: fromTemporaryCredentials({
        params: {
          RoleArn: assumeRole,
        },
      }),
    });
    this.cache[key] = client;
    return client;
  };

  public QuickSight(config: QuickSightClientConfig): QuickSight {
    const key = `QuickSight-${config.region}`;
    if (this.cache[key]) {
      return this.cache[key] as QuickSight;
    }
    const quickSight = new QuickSight({
      ...aws_sdk_client_common_config,
      ...config,
    });
    this.cache[key] = quickSight;
    return quickSight;
  };

  public QuickSightClient(config: QuickSightClientConfig): QuickSightClient {
    const key = `QuickSightClient-${config.region}`;
    if (this.cache[key]) {
      return this.cache[key] as QuickSightClient;
    }
    const client = new QuickSightClient({
      ...aws_sdk_client_common_config,
      ...config,
    });
    this.cache[key] = client;
    return client;
  };

  public async QuickSightIdentityClient(): Promise<QuickSightClient> {
    const key = 'QuickSightIdentityClient';
    if (this.cache[key]) {
      return this.cache[key] as QuickSightClient;
    }
    const region = await this.QuickSightIdentityRegion();
    const client = new QuickSightClient({
      ...aws_sdk_client_common_config,
      region,
    });
    this.cache[key] = client;
    return client;
  };

  public async QuickSightIdentityRegion(): Promise<string> {
    const key = 'QuickSightIdentityRegion';
    if (this.cache[key]) {
      return this.cache[key] as string;
    }
    const region = await this.getIdentityRegion();
    this.cache[key] = region;
    return region;
  };

  private getIdentityRegionFromMessage(message: string): string {
    const regexp = new RegExp(REGION_PATTERN, 'g');
    const matchValues = [...message.matchAll(regexp)];
    let identityRegion = '';
    for (let v of matchValues) {
      if (v[0] !== awsRegion) {
        identityRegion = v[0];
        break;
      }
    }
    return identityRegion;
  };

  private async getIdentityRegion(): Promise<string> {
    try {
      const defaultQuickSightClient = new QuickSightClient({
        ...aws_sdk_client_common_config,
        region: awsRegion,
      });
      const params: ListUsersCommand = new ListUsersCommand({
        AwsAccountId: awsAccountId,
        Namespace: 'default',
      });
      await defaultQuickSightClient.send(params);
    } catch (err) {
      if (err instanceof AccessDeniedException) {
        return this.getIdentityRegionFromMessage(err.message);
      }
    }
    return awsRegion;
  };
}
