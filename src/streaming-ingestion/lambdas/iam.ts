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

import { IAMClient, PutRolePolicyCommand } from '@aws-sdk/client-iam';
import { fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import { logger } from '../../common/powertools';
import { aws_sdk_client_common_config } from '../../common/sdk-client-config';

export function getIAMClient(roleArn: string) {
  return new IAMClient({
    ...aws_sdk_client_common_config,
    credentials: fromTemporaryCredentials({
      // Required. Options passed to STS AssumeRole operation.
      params: {
        // Required. ARN of role to assume.
        RoleArn: roleArn,
        // Optional. An identifier for the assumed role session. If skipped, it generates a random
        // session name with prefix of 'aws-sdk-js-'.
        RoleSessionName: 'streaming-ingestion-kinesis',
        // Optional. The duration, in seconds, of the role session.
        DurationSeconds: 900,
      },
    }),
  });
}

export const attachRolePolicy = async (iamClient: IAMClient, roleName: string, policyName: string, policyDocument: string) => {
  const input = {
    RoleName: roleName,
    PolicyName: policyName,
    PolicyDocument: policyDocument,
  };
  const command = new PutRolePolicyCommand(input);
  const response = await iamClient.send(command);
  logger.info('update policy response:', { response });
};

export function getRoleName(roleArn: string) {
  const arnParts = roleArn.split(':');
  const rolePath = arnParts[arnParts.length - 1];
  const roleName = rolePath.split('/')[rolePath.split('/').length - 1];
  return roleName;
}