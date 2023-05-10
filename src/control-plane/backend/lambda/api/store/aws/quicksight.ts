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
  CreateAccountSubscriptionCommand,
  DeleteAccountSubscriptionCommand,
  RegisterUserCommand,
  UpdateAccountSettingsCommand,
  AuthenticationMethodOption,
  Edition,
  IdentityType,
  UserRole,
  DescribeAccountSubscriptionCommandOutput,
} from '@aws-sdk/client-quicksight';
import { APIRoleName, awsAccountId } from '../../common/constants';
import { getPaginatedResults } from '../../common/paginator';
import { logger } from '../../common/powertools';
import { aws_sdk_client_common_config } from '../../common/sdk-client-config-ln';
import { QuickSightAccountInfo, QuickSightUser } from '../../common/types';
import { generateRandomStr } from '../../common/utils';

const QUICKSIGHT_CONTROL_PLANE_REGION = 'us-east-1';
const QUICKSIGHT_NAMESPACE = 'default';
const QUICKSIGHT_PREFIX = 'Clickstream';
const QUICKSIGHT_DEFAULT_ACCOUNT = `${QUICKSIGHT_PREFIX}-${generateRandomStr(8)}`;
const QUICKSIGHT_DEFAULT_USER = `${QUICKSIGHT_PREFIX}-User-${generateRandomStr(8)}`;
const ACCOUNT_SUBSCRIPTION_TIMEOUT = 20;
export const listQuickSightUsers = async () => {
  const users: QuickSightUser[] = [];
  try {
    const quickSightClient = new QuickSightClient({
      ...aws_sdk_client_common_config,
      region: QUICKSIGHT_CONTROL_PLANE_REGION,
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
  } catch (err) {
    logger.warn('List QuickSight users error.', { err });
  }
  return users;
};

// Creates an Amazon QuickSight user
export const registerQuickSightUser = async (email: string, username?: string) => {
  const quickSightClient = new QuickSightClient({
    ...aws_sdk_client_common_config,
    region: QUICKSIGHT_CONTROL_PLANE_REGION,
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
export const quickSightPing = async (): Promise<boolean> => {
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
  return undefined;
};

export const createAccountSubscription = async (email: string, accountName: string) => {
  try {
    const quickSightClient = new QuickSightClient({
      ...aws_sdk_client_common_config,
      region: QUICKSIGHT_CONTROL_PLANE_REGION,
    });
    const command: CreateAccountSubscriptionCommand = new CreateAccountSubscriptionCommand({
      AccountName: accountName ? `${QUICKSIGHT_PREFIX}-${accountName}` : QUICKSIGHT_DEFAULT_ACCOUNT,
      AuthenticationMethod: AuthenticationMethodOption.IAM_AND_QUICKSIGHT,
      AwsAccountId: awsAccountId,
      Edition: Edition.ENTERPRISE,
      NotificationEmail: email,
    });
    const createResponse = await quickSightClient.send(command);
    await Sleep(1000);
    let count = 1;
    let describeResponse = await describeAccountSubscription();
    while (describeResponse.AccountInfo?.AccountSubscriptionStatus != 'ACCOUNT_CREATED' && count < ACCOUNT_SUBSCRIPTION_TIMEOUT) {
      await Sleep(1000);
      count++;
      describeResponse = await describeAccountSubscription();
    }
    if (describeResponse.AccountInfo?.AccountSubscriptionStatus != 'ACCOUNT_CREATED') {
      logger.error('Account Subscription Failed.', { describeResponse });
      throw new Error('Account Subscription Failed.');
    }

    return {
      ...createResponse.SignupResponse,
      vpcConnectionsUrl: `https://${QUICKSIGHT_CONTROL_PLANE_REGION}.quicksight.aws.amazon.com/sn/admin#vpc-connections`,
    };
  } catch (err) {
    throw err;
  }
};

export const deleteAccountSubscription = async () => {
  const quickSightClient = new QuickSightClient({
    ...aws_sdk_client_common_config,
    region: QUICKSIGHT_CONTROL_PLANE_REGION,
  });
  // @ts-ignore
  const commandUpdate: UpdateAccountSettingsCommand = new UpdateAccountSettingsCommand({
    AwsAccountId: awsAccountId,
    DefaultNamespace: QUICKSIGHT_NAMESPACE,
    TerminationProtectionEnabled: false,
  });
  await quickSightClient.send(commandUpdate);
  const command: DeleteAccountSubscriptionCommand = new DeleteAccountSubscriptionCommand({
    AwsAccountId: awsAccountId,
  });
  await quickSightClient.send(command);
};

export const Sleep = (ms: number) => {
  return new Promise(resolve=>setTimeout(resolve, ms));
};
