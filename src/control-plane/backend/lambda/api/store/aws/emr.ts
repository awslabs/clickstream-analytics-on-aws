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

import { EMRServerlessClient, ListApplicationsCommand } from '@aws-sdk/client-emr-serverless';
import { aws_sdk_client_common_config } from '../../common/sdk-client-config-ln';

export const emrServerlessPing = async (region: string): Promise<boolean> => {
  try {
    const emrServerlessClient = new EMRServerlessClient({
      ...aws_sdk_client_common_config,
      maxAttempts: 1,
      region,
    });
    const params: ListApplicationsCommand = new ListApplicationsCommand({});
    await emrServerlessClient.send(params);
  } catch (err) {
    if ((err as Error).name === 'TimeoutError' ||
    (err as Error).name === 'AccessDeniedException' ||
    (err as Error).message.includes('getaddrinfo ENOTFOUND')) {
      return false;
    }
  }
  return true;
};
