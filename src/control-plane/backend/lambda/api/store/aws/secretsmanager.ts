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

import { SecretsManagerClient, GetSecretValueCommand, SecretListEntry, paginateListSecrets } from '@aws-sdk/client-secrets-manager';
import { aws_sdk_client_common_config } from '../../common/sdk-client-config-ln';
import { SSMSecret } from '../../common/types';

export const listSecrets = async (region: string) => {
  const secretsManagerClient = new SecretsManagerClient({
    ...aws_sdk_client_common_config,
    region,
  });
  const results: SecretListEntry[] = [];
  for await (const page of paginateListSecrets({ client: secretsManagerClient }, {})) {
    // page contains a single paginated output.
    results.push(...page.SecretList as SecretListEntry[]);
  }
  const secrets: SSMSecret[] = [];
  for (let secret of results) {
    secrets.push({
      name: secret.Name ?? '',
      arn: secret.ARN ?? '',
    });
  }
  return secrets;
};

export const getSecretValue = async (region: string, name: string) => {
  try {
    const secretsManagerClient = new SecretsManagerClient({
      ...aws_sdk_client_common_config,
      region,
    });
    const response = await secretsManagerClient.send(
      new GetSecretValueCommand({
        SecretId: name,
      }),
    );
    return response.SecretString;
  } catch (e) {
    return undefined;
  }
};
