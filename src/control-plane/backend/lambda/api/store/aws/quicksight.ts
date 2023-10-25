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

import { randomUUID } from 'crypto';
import {
  ListUsersCommand,
  User,
  DescribeAccountSubscriptionCommand,
  RegisterUserCommand,
  IdentityType,
  UserRole,
  DescribeAccountSubscriptionCommandOutput,
  GenerateEmbedUrlForRegisteredUserCommand,
  GenerateEmbedUrlForRegisteredUserCommandOutput,
  UpdateDashboardPermissionsCommand,
  GenerateEmbedUrlForRegisteredUserCommandInput,
  ResourceExistsException,
  CreateDashboardCommand,
  CreateDashboardCommandOutput,
  CreateDashboardCommandInput,
  RegisterUserCommandInput,
  CreateFolderCommand,
  CreateFolderMembershipCommand,
  CreateFolderMembershipCommandOutput,
  CreateFolderMembershipCommandInput,
  MemberType,
  SearchFoldersCommand,
  FilterOperator,
  FolderFilterAttribute,
} from '@aws-sdk/client-quicksight';
import { APIRoleName, awsAccountId, awsRegion, QUICKSIGHT_CONTROL_PLANE_REGION, QUICKSIGHT_EMBED_NO_REPLY_EMAIL, QuickSightEmbedRoleArn } from '../../common/constants';
import { getPaginatedResults } from '../../common/paginator';
import { logger } from '../../common/powertools';
import { SDKClient } from '../../common/sdk-client';
import { QuickSightAccountInfo, QuickSightUser } from '../../common/types';
import { generateRandomStr } from '../../common/utils-ln';

const QUICKSIGHT_NAMESPACE = 'default';
const QUICKSIGHT_PREFIX = 'Clickstream';
const QUICKSIGHT_DEFAULT_USER = `${QUICKSIGHT_PREFIX}-User-${generateRandomStr(8, 'abcdefghijklmnopqrstuvwxyz')}`;
const QUICKSIGHT_EXPLORE_USER_NAME = 'ClickstreamExploreUser';
const QUICKSIGHT_PUBLISH_USER_NAME = 'ClickstreamPublishUser';

const sdkClient: SDKClient = new SDKClient();

export const listQuickSightUsers = async () => {
  const identityRegion = await sdkClient.QuickSightIdentityRegion();
  return listQuickSightUsersByRegion(identityRegion);
};

export const listQuickSightUsersByRegion = async (region: string) => {
  const users: QuickSightUser[] = [];
  const quickSightClient = sdkClient.QuickSightClient({
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
  const identityRegion = await sdkClient.QuickSightIdentityRegion();
  return registerQuickSightUserByRegion(identityRegion, email, username);
};

export const registerClickstreamUser = async () => {
  const identityRegion = await sdkClient.QuickSightIdentityRegion();
  await registerUserByRegion(identityRegion, {
    IdentityType: IdentityType.IAM,
    AwsAccountId: awsAccountId,
    Email: QUICKSIGHT_EMBED_NO_REPLY_EMAIL,
    IamArn: QuickSightEmbedRoleArn,
    Namespace: QUICKSIGHT_NAMESPACE,
    UserRole: UserRole.ADMIN,
    SessionName: QUICKSIGHT_PUBLISH_USER_NAME,
  });
  await registerUserByRegion(identityRegion, {
    IdentityType: IdentityType.IAM,
    AwsAccountId: awsAccountId,
    Email: QUICKSIGHT_EMBED_NO_REPLY_EMAIL,
    IamArn: QuickSightEmbedRoleArn,
    Namespace: QUICKSIGHT_NAMESPACE,
    UserRole: UserRole.ADMIN,
    SessionName: QUICKSIGHT_EXPLORE_USER_NAME,
  });
  return getClickstreamUserArn();
};

export const registerQuickSightUserByRegion = async (region: string, email: string, username?: string) => {
  try {
    const quickSightClient = sdkClient.QuickSightClient({
      region: region,
    });
    const command: RegisterUserCommand = new RegisterUserCommand({
      IdentityType: IdentityType.QUICKSIGHT,
      AwsAccountId: awsAccountId,
      Email: email,
      UserName: username ?? QUICKSIGHT_DEFAULT_USER,
      UserRole: UserRole.ADMIN,
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

export const registerUserByRegion = async (
  region: string,
  user: RegisterUserCommandInput,
) => {
  try {
    const quickSightClient = sdkClient.QuickSightClient({
      region: region,
    });
    const command: RegisterUserCommand = new RegisterUserCommand(user);
    await quickSightClient.send(command);
    return true;
  } catch (err) {
    if (err instanceof ResourceExistsException) {
      return true;
    }
    logger.error('Register User Error.', { err });
    return false;
  }
};

export const generateEmbedUrlForRegisteredUser = async (
  region: string,
  allowedDomain: string,
  publish: boolean,
  dashboardId?: string,
  sheetId?: string,
  visualId?: string,
): Promise<GenerateEmbedUrlForRegisteredUserCommandOutput> => {
  const quickSightClient = sdkClient.QuickSightClient({
    region: region,
  });
  const arns = await getClickstreamUserArn();
  let commandInput: GenerateEmbedUrlForRegisteredUserCommandInput = {
    AwsAccountId: awsAccountId,
    UserArn: publish ? arns.publishUserArn : arns.exploreUserArn,
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
  } else if (dashboardId) {
    commandInput = {
      ...commandInput,
      ExperienceConfiguration: {
        Dashboard: {
          InitialDashboardId: dashboardId,
        },
      },
    };
  } else {
    commandInput = {
      ...commandInput,
      ExperienceConfiguration: {
        QuickSightConsole: {
          InitialPath: '/start/analyses',
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
  const quickSightClient = sdkClient.QuickSightClient({
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
  const quickSightClient = sdkClient.QuickSightClient({
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
    const quickSightClient = sdkClient.QuickSightClient({
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
  const quickSightClient = sdkClient.QuickSightClient({
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

export interface QuickSightUserArns {
  exploreUserArn: string;
  publishUserArn: string;
  exploreUserName: string;
  publishUserName: string;
}

export const getClickstreamUserArn = async (): Promise<QuickSightUserArns> => {
  const identityRegion = await sdkClient.QuickSightIdentityRegion();
  const quickSightEmbedRoleName = QuickSightEmbedRoleArn?.split(':role/')[1];
  const partition = awsRegion?.startsWith('cn') ? 'aws-cn' : 'aws';
  const exploreUserName = `${quickSightEmbedRoleName}/${QUICKSIGHT_EXPLORE_USER_NAME}`;
  const publishUserName = `${quickSightEmbedRoleName}/${QUICKSIGHT_PUBLISH_USER_NAME}`;
  const exploreUserArn = `arn:${partition}:quicksight:${identityRegion}:${awsAccountId}:user/${QUICKSIGHT_NAMESPACE}/${exploreUserName}`;
  const publishUserArn = `arn:${partition}:quicksight:${identityRegion}:${awsAccountId}:user/${QUICKSIGHT_NAMESPACE}/${publishUserName}`;
  return { exploreUserArn, publishUserArn, exploreUserName, publishUserName };
};

export const createDashboard = async (
  region: string,
  input: CreateDashboardCommandInput,
): Promise<CreateDashboardCommandOutput> => {
  try {
    const quickSightClient = sdkClient.QuickSightClient({
      region: region,
    });
    const command: CreateDashboardCommand = new CreateDashboardCommand(input);
    return await quickSightClient.send(command);
  } catch (err) {
    logger.error('Create Dashboard Error.', { err });
    throw err;
  }
};

export const searchFolder = async (
  region: string,
  folderName: string,
): Promise<string | undefined> => {
  try {
    const quickSightClient = sdkClient.QuickSightClient({
      region: region,
    });
    const command: SearchFoldersCommand = new SearchFoldersCommand({
      AwsAccountId: awsAccountId,
      Filters: [{
        Operator: FilterOperator.StringEquals,
        Name: FolderFilterAttribute.FOLDER_NAME,
        Value: folderName,
      }],
    });
    const res = await quickSightClient.send(command);
    if (res.FolderSummaryList && res.FolderSummaryList?.length > 0) {
      return res.FolderSummaryList[0].FolderId;
    }
    return;
  } catch (err) {
    logger.error('Create Folder Error.', { err });
    throw err;
  }
};

export const createFolder = async (
  region: string,
  name: string,
): Promise<string | undefined> => {
  try {
    const quickSightClient = sdkClient.QuickSightClient({
      region: region,
    });
    const command: CreateFolderCommand = new CreateFolderCommand({
      AwsAccountId: awsAccountId,
      FolderId: randomUUID(),
      Name: name,
    });
    const res = await quickSightClient.send(command);
    return res.FolderId;
  } catch (err) {
    logger.error('Create Folder Error.', { err });
    throw err;
  }
};

export const createFolderMembership = async (
  region: string,
  input: CreateFolderMembershipCommandInput,
): Promise<CreateFolderMembershipCommandOutput> => {
  try {
    const quickSightClient = sdkClient.QuickSightClient({
      region: region,
    });
    const command: CreateFolderMembershipCommand = new CreateFolderMembershipCommand(input);
    return await quickSightClient.send(command);
  } catch (err) {
    logger.error('Create Folder Membership Error.', { err });
    throw err;
  }
};

export const moveToFolder = async (
  region: string,
  folderName: string,
  resourceId: string,
  resourceType: MemberType,
): Promise<any> => {
  try {
    let folderId = await searchFolder(region, folderName);
    if (!folderId) {
      folderId = await createFolder(region, folderName);
    }
    await createFolderMembership(
      region,
      {
        AwsAccountId: awsAccountId,
        FolderId: folderId,
        MemberId: resourceId,
        MemberType: resourceType,
      },
    );
  } catch (err) {
    logger.error('Move to folder Error.', { err });
    throw err;
  }
};
