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


import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { STSUploadRole } from '../../common/constants';
import { aws_sdk_client_common_config } from '../../common/sdk-client-config-ln';

export const AssumeUploadRole = async (sessionName: string) => {
  const client = new STSClient({
    ...aws_sdk_client_common_config,
  });
  const command = new AssumeRoleCommand({
    RoleArn: STSUploadRole,
    RoleSessionName: sessionName,
    DurationSeconds: 900,
  });
  const data = await client.send(command);
  return {
    AccessKeyId: data.Credentials!.AccessKeyId,
    SecretAccessKey: data.Credentials!.SecretAccessKey,
    SessionToken: data.Credentials!.SessionToken,
  };
};