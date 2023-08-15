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
  GenerateEmbedUrlForRegisteredUserCommand,
  GenerateEmbedUrlForRegisteredUserCommandOutput,
  UpdateDashboardPermissionsCommand,
  GenerateEmbedUrlForRegisteredUserCommandInput,
  ResourceExistsException,
} from '@aws-sdk/client-quicksight';
import { APIRoleName, awsAccountId, awsRegion, QUICKSIGHT_CONTROL_PLANE_REGION, QuickSightEmbedRoleArn } from '../../common/constants';
import { REGION_PATTERN } from '../../common/constants-ln';
import { getPaginatedResults } from '../../common/paginator';
import { logger } from '../../common/powertools';
import { aws_sdk_client_common_config } from '../../common/sdk-client-config-ln';
import { QuickSightAccountInfo, QuickSightUser } from '../../common/types';
import { generateRandomStr } from '../../common/utils';

const QUICKSIGHT_NAMESPACE = 'default';
const QUICKSIGHT_PREFIX = 'Clickstream';
const QUICKSIGHT_DEFAULT_USER = `${QUICKSIGHT_PREFIX}-User-${generateRandomStr(8)}`;
const QUICKSIGHT_DASHBOARD_USER_NAME = 'ClickstreamDashboardUser';
const QUICKSIGHT_EMBED_USER_NAME = 'ClickstreamEmbedUser';
const QUICKSIGHT_EMBED_NO_REPLY_EMAIL = 'quicksight-embedding-no-reply@amazon.com';

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

export const getIdentityRegion = async () => {
  try {
    await listQuickSightUsersByRegion(QUICKSIGHT_CONTROL_PLANE_REGION);
  } catch (err) {
    if (err instanceof AccessDeniedException) {
      const message = (err as AccessDeniedException).message;
      return getIdentityRegionFromMessage(message);
    }
  }
  return QUICKSIGHT_CONTROL_PLANE_REGION;
};

export const listQuickSightUsers = async () => {
  const identityRegion = await getIdentityRegion();
  return listQuickSightUsersByRegion(identityRegion);
};

export const getQuickSightSubscribeRegion = async () => {
  try {
    const quickSightClient = new QuickSightClient({
      ...aws_sdk_client_common_config,
      region: QUICKSIGHT_CONTROL_PLANE_REGION,
    });

    const params: ListUsersCommand = new ListUsersCommand({
      AwsAccountId: awsAccountId,
      Namespace: 'default',
    });
    await quickSightClient.send(params);

    console.log(`quicksightRegion: ${QUICKSIGHT_CONTROL_PLANE_REGION}` );

    return QUICKSIGHT_CONTROL_PLANE_REGION;
  } catch (err) {
    if (err instanceof AccessDeniedException) {
      const message = (err as AccessDeniedException).message;
      console.log(`quicksight error message: ${message}` );
      const identityRegion = getIdentityRegionFromMessage(message);
      if (identityRegion) {
        return identityRegion;
      }
    }

    console.log(`quicksight error message: ${(err as Error).message}`);
  }
  return '';
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
      Namespace: QUICKSIGHT_NAMESPACE,
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
  const identityRegion = await getIdentityRegion();
  return registerQuickSightUserByRegion(identityRegion, email, username);
};

export const registerClickstreamUser = async () => {
  const identityRegion = await getIdentityRegion();
  await registerEmbeddingUserByRegion(identityRegion);
  await registerQuickSightUserByRegion(identityRegion, QUICKSIGHT_EMBED_NO_REPLY_EMAIL, QUICKSIGHT_DASHBOARD_USER_NAME);
};

export const registerQuickSightUserByRegion = async (region: string, email: string, username?: string) => {
  try {
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
  } catch (err) {
    if (err instanceof ResourceExistsException) {
      return '';
    }
    throw err;
  }
};

export const registerEmbeddingUserByRegion = async (region: string) => {
  try {
    const quickSightClient = new QuickSightClient({
      ...aws_sdk_client_common_config,
      region: region,
    });
    const command: RegisterUserCommand = new RegisterUserCommand({
      IdentityType: IdentityType.IAM,
      AwsAccountId: awsAccountId,
      Email: QUICKSIGHT_EMBED_NO_REPLY_EMAIL,
      IamArn: QuickSightEmbedRoleArn,
      Namespace: QUICKSIGHT_NAMESPACE,
      UserRole: UserRole.ADMIN,
      SessionName: QUICKSIGHT_EMBED_USER_NAME,
    });
    await quickSightClient.send(command);
    return true;
  } catch (err) {
    if (err instanceof ResourceExistsException) {
      return true;
    }
    logger.error('Register Embedding User Error.', { err });
    return false;
  }
};

export const generateEmbedUrlForRegisteredUser = async (
  region: string,
  allowedDomain: string,
  dashboardId: string,
  sheetId?: string,
  visualId?: string,
): Promise<GenerateEmbedUrlForRegisteredUserCommandOutput> => {
  const quickSightClient = new QuickSightClient({
    ...aws_sdk_client_common_config,
    region: region,
  });
  const arns = await getClickstreamUserArn();
  let commandInput: GenerateEmbedUrlForRegisteredUserCommandInput = {
    AwsAccountId: awsAccountId,
    UserArn: arns[1],
    AllowedDomains: [allowedDomain],
    ExperienceConfiguration: {},
  };
  if (sheetId && visualId) {
    commandInput = {
      ...commandInput,
      ExperienceConfiguration: {
        DashboardVisual: {
          InitialDashboardVisualId: {
            DashboardId: dashboardId,
            SheetId: sheetId,
            VisualId: visualId,
          },
        },
      },
    };
  } else {
    commandInput = {
      ...commandInput,
      ExperienceConfiguration: {
        Dashboard: {
          InitialDashboardId: dashboardId,
        },
      },
    };
  }
  const command: GenerateEmbedUrlForRegisteredUserCommand = new GenerateEmbedUrlForRegisteredUserCommand(commandInput);
  return quickSightClient.send(command);
};

export const updateDashboardPermissionsCommand = async (
  region: string,
  dashboardId: string,
  userArn: string,
): Promise<void> => {
  const quickSightClient = new QuickSightClient({
    ...aws_sdk_client_common_config,
    region: region,
  });
  const command: UpdateDashboardPermissionsCommand = new UpdateDashboardPermissionsCommand({
    AwsAccountId: awsAccountId,
    DashboardId: dashboardId,
    GrantPermissions: [{
      Principal: userArn,
      Actions: ['quicksight:DescribeDashboard', 'quicksight:QueryDashboard', 'quicksight:ListDashboardVersions'],
    }],
  });
  await quickSightClient.send(command);
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

export const getClickstreamUserArn = async (): Promise<string[]> => {
  const identityRegion = await getIdentityRegion();
  const quickSightEmbedRoleName = QuickSightEmbedRoleArn?.split(':role/')[1];
  const partition = awsRegion?.startsWith('cn') ? 'aws-cn' : 'aws';
  const ownerArn = `arn:${partition}:quicksight:${identityRegion}:${awsAccountId}:user/${QUICKSIGHT_NAMESPACE}/${QUICKSIGHT_DASHBOARD_USER_NAME}`;
  const embedArn = `arn:${partition}:quicksight:${identityRegion}:${awsAccountId}:user/${QUICKSIGHT_NAMESPACE}/${quickSightEmbedRoleName}/${QUICKSIGHT_EMBED_USER_NAME}`;
  return [ownerArn, embedArn];
};

