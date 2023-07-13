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

import {
  QuickSightClient,
  ListUsersCommand,
  User,
  DescribeAccountSubscriptionCommand,
  RegisterUserCommand,
  IdentityType,
  UserRole,
  DescribeAccountSubscriptionCommandOutput,
  AccessDeniedException,
} from '@aws-sdk/client-quicksight';
import { APIRoleName, awsAccountId, QUICKSIGHT_CONTROL_PLANE_REGION } from '../../common/constants';
import { REGION_PATTERN } from '../../common/constants-ln';
import { getPaginatedResults } from '../../common/paginator';
import { aws_sdk_client_common_config } from '../../common/sdk-client-config-ln';
import { QuickSightAccountInfo, QuickSightUser } from '../../common/types';
import { generateRandomStr } from '../../common/utils';

const QUICKSIGHT_NAMESPACE = 'default';
const QUICKSIGHT_PREFIX = 'Clickstream';
const QUICKSIGHT_DEFAULT_USER = `${QUICKSIGHT_PREFIX}-User-${generateRandomStr(8)}`;

const getIdentityRegionFromMessage = (message: string) => {
  const regexp = new RegExp(REGION_PATTERN, 'g');
  const matchValues = [...message.matchAll(regexp)];
  let identityRegion = '';
  for (let v of matchValues) {
    if (v[0] !== QUICKSIGHT_CONTROL_PLANE_REGION) {
      identityRegion = v[0];
      break;
    }
  }
  return identityRegion;
};

export const listQuickSightUsers = async () => {
  try {
    return await listQuickSightUsersByRegion(QUICKSIGHT_CONTROL_PLANE_REGION);
  } catch (err) {
    if (err instanceof AccessDeniedException) {
      const message = (err as AccessDeniedException).message;
      const identityRegion = getIdentityRegionFromMessage(message);
      if (identityRegion) {
        return await listQuickSightUsersByRegion(identityRegion);
      }
    }
  }
  return [];
};

export const listQuickSightUsersByRegion = async (region: string) => {
  const users: QuickSightUser[] = [];
  const quickSightClient = new QuickSightClient({
    ...aws_sdk_client_common_config,
    region: region,
  });
  const records = await getPaginatedResults(async (NextToken: any) => {
    const params: ListUsersCommand = new ListUsersCommand({
      AwsAccountId: awsAccountId,
      Namespace: 'default',
      NextToken,
    });
    const queryResponse = await quickSightClient.send(params);
    return {
      marker: queryResponse.NextToken,
      results: queryResponse.UserList,
    };
  });
  for (let user of records as User[]) {
    if (!user.UserName?.startsWith(APIRoleName!)) {
      users.push({
        userName: user.UserName ?? '',
        arn: user.Arn ?? '',
        email: user.Email ?? '',
        role: user.Role ?? '',
        active: user.Active ?? false,
      });
    }
  }
  return users;
};

// Creates an Amazon QuickSight user
export const registerQuickSightUser = async (email: string, username?: string) => {
  try {
    return await registerQuickSightUserByRegion(QUICKSIGHT_CONTROL_PLANE_REGION, email, username);
  } catch (err) {
    if (err instanceof AccessDeniedException) {
      const message = (err as AccessDeniedException).message;
      const identityRegion = getIdentityRegionFromMessage(message);
      if (identityRegion) {
        return await registerQuickSightUserByRegion(identityRegion, email, username);
      }
    }
  }
  return '';
};

export const registerQuickSightUserByRegion = async (region: string, email: string, username?: string) => {
  const quickSightClient = new QuickSightClient({
    ...aws_sdk_client_common_config,
    region: region,
  });
  const command: RegisterUserCommand = new RegisterUserCommand({
    IdentityType: IdentityType.QUICKSIGHT,
    AwsAccountId: awsAccountId,
    Email: email,
    UserName: username ?? QUICKSIGHT_DEFAULT_USER,
    UserRole: UserRole.AUTHOR,
    Namespace: QUICKSIGHT_NAMESPACE,
  });
  const response = await quickSightClient.send(command);
  return response.UserInvitationUrl;
};

// Determine if QuickSight has already subscribed
export const quickSightIsSubscribed = async (): Promise<boolean> => {
  const quickSightClient = new QuickSightClient({
    ...aws_sdk_client_common_config,
    region: QUICKSIGHT_CONTROL_PLANE_REGION,
  });
  const command: DescribeAccountSubscriptionCommand = new DescribeAccountSubscriptionCommand({
    AwsAccountId: awsAccountId,
  });
  try {
    const response = await quickSightClient.send(command);
    if (response.AccountInfo?.AccountSubscriptionStatus?.startsWith('UNSUBSCRIBED')) {
      return false;
    }
  } catch (err) {
    if ((err as Error).name === 'ResourceNotFoundException') {
      return false;
    }
    throw err;
  }
  return true;
};

export const quickSightPing = async (region: string): Promise<boolean> => {
  try {
    const quickSightClient = new QuickSightClient({
      ...aws_sdk_client_common_config,
      maxAttempts: 1,
      region: region,
    });
    const command: DescribeAccountSubscriptionCommand = new DescribeAccountSubscriptionCommand({
      AwsAccountId: awsAccountId,
    });
    await quickSightClient.send(command);
  } catch (err) {
    if ((err as Error).name === 'TimeoutError' ||
    (err as Error).message.includes('getaddrinfo ENOTFOUND') ||
    (err as Error).name === 'UnrecognizedClientException' ||
    (err as Error).name === 'InternalFailure') {
      return false;
    }
  }
  return true;
};

export const describeAccountSubscription = async (): Promise<DescribeAccountSubscriptionCommandOutput> => {
  const quickSightClient = new QuickSightClient({
    ...aws_sdk_client_common_config,
    region: QUICKSIGHT_CONTROL_PLANE_REGION,
  });
  const command: DescribeAccountSubscriptionCommand = new DescribeAccountSubscriptionCommand({
    AwsAccountId: awsAccountId,
  });
  return quickSightClient.send(command);
};

export const describeClickstreamAccountSubscription = async (): Promise<QuickSightAccountInfo | undefined> => {
  try {
    const response = await describeAccountSubscription();
    if (response.AccountInfo?.AccountSubscriptionStatus === 'UNSUBSCRIBED') {
      return undefined;
    }
    return {
      accountName: response.AccountInfo?.AccountName,
      edition: response.AccountInfo?.Edition,
      notificationEmail: response.AccountInfo?.NotificationEmail,
      authenticationType: response.AccountInfo?.AuthenticationType,
      accountSubscriptionStatus: response.AccountInfo?.AccountSubscriptionStatus,
    } as QuickSightAccountInfo;
  } catch (err) {
    if ((err as Error).name === 'ResourceNotFoundException') {
      return undefined;
    }
    throw err;
  }
};

export const Sleep = (ms: number) => {
  return new Promise(resolve=>setTimeout(resolve, ms));
};
