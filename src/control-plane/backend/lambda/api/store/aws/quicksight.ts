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
  CreateAnalysisCommand,
  CreateAnalysisCommandInput,
  CreateAnalysisCommandOutput,
  CreateDataSetCommand,
  CreateDataSetCommandOutput,
  CreateDataSetCommandInput,
  DataSetImportMode,
  SheetDefinition,
  AnalysisDefinition,
  DescribeDashboardCommand,
  DescribeDashboardCommandInput,
  DescribeDashboardCommandOutput,
  DescribeDashboardDefinitionCommand,
  DeleteDataSetCommand,
  DeleteUserCommand,
  DeleteUserCommandInput,
  ResourceNotFoundException,
  CreateFolderMembershipCommand,
  CreateFolderMembershipCommandInput,
  CreateFolderMembershipCommandOutput,
  MemberType,
  ListFolderMembersCommand,
  ListFolderMembersCommandInput,
  ListFolderMembersCommandOutput,
} from '@aws-sdk/client-quicksight';
import pLimit from 'p-limit';
import { awsAccountId, awsRegion, QUICKSIGHT_CONTROL_PLANE_REGION, QUICKSIGHT_EMBED_NO_REPLY_EMAIL, QuickSightEmbedRoleArn } from '../../common/constants';
import { DEFAULT_DASHBOARD_NAME_PREFIX, QUICKSIGHT_ANALYSIS_INFIX, QUICKSIGHT_DASHBOARD_INFIX, QUICKSIGHT_DATASET_INFIX } from '../../common/constants-ln';
import { logger } from '../../common/powertools';
import { SDKClient } from '../../common/sdk-client';
import { QuickSightAccountInfo } from '../../common/types';
import { sleep } from '../../common/utils-ln';
import { IDashboard } from '../../model/project';
import { analysisAdminPermissionActions, dashboardAdminPermissionActions, dataSetAdminPermissionActions } from '../../service/quicksight/dashboard-ln';

const QUICKSIGHT_NAMESPACE = 'default';
const QUICKSIGHT_EXPLORE_USER_NAME = 'ClickstreamExploreUser';
const QUICKSIGHT_PUBLISH_USER_NAME = 'ClickstreamPublishUser';

const sdkClient: SDKClient = new SDKClient();
const promisePool = pLimit(3);

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

export const deleteClickstreamUser = async () => {
  const identityRegion = await sdkClient.QuickSightIdentityRegion();
  const quickSightEmbedRoleName = QuickSightEmbedRoleArn?.split(':role/')[1];
  await deleteUserByRegion(identityRegion, {
    AwsAccountId: awsAccountId,
    Namespace: QUICKSIGHT_NAMESPACE,
    UserName: `${quickSightEmbedRoleName}/${QUICKSIGHT_PUBLISH_USER_NAME}`,
  });
  await deleteUserByRegion(identityRegion, {
    AwsAccountId: awsAccountId,
    Namespace: QUICKSIGHT_NAMESPACE,
    UserName: `${quickSightEmbedRoleName}/${QUICKSIGHT_EXPLORE_USER_NAME}`,
  });
};

export const deleteUserByRegion = async (
  region: string,
  user: DeleteUserCommandInput,
) => {
  try {
    const quickSightClient = sdkClient.QuickSightClient({
      region: region,
    });
    const command: DeleteUserCommand = new DeleteUserCommand(user);
    await quickSightClient.send(command);
    return true;
  } catch (err) {
    if (err instanceof ResourceNotFoundException) {
      return true;
    }
    logger.error('Delete User Error.', { err });
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

export const createDataSet = async (
  region: string,
  input: CreateDataSetCommandInput,
): Promise<CreateDataSetCommandOutput> => {
  try {
    const quickSightClient = sdkClient.QuickSightClient({
      region: region,
    });
    const command: CreateDataSetCommand = new CreateDataSetCommand(input);
    return await quickSightClient.send(command);
  } catch (err) {
    logger.error('Create DataSet Error.', { err });
    throw err;
  }
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

export const createAnalysis = async (
  region: string,
  input: CreateAnalysisCommandInput,
): Promise<CreateAnalysisCommandOutput> => {
  try {
    const quickSightClient = sdkClient.QuickSightClient({
      region: region,
    });
    const command: CreateAnalysisCommand = new CreateAnalysisCommand(input);
    return await quickSightClient.send(command);
  } catch (err) {
    logger.error('Create Analysis Error.', { err });
    throw err;
  }
};

export const waitDashboardSuccess = async (region: string, dashboardId: string): Promise<boolean> => {
  await sleep(300);
  let resp = await describeDashboard(
    region,
    {
      AwsAccountId: awsAccountId,
      DashboardId: dashboardId,
    },
  );
  let count = 0;
  while (!resp.Dashboard?.Version?.Status?.endsWith('_SUCCESSFUL') &&
  !resp.Dashboard?.Version?.Status?.endsWith('_FAILED') && count < 10) {
    await sleep(1000);
    count++;
    resp = await describeDashboard(
      region,
      {
        AwsAccountId: awsAccountId,
        DashboardId: dashboardId,
      },
    );
  }
  const success = resp.Dashboard?.Version?.Status?.endsWith('_SUCCESSFUL') ?? false;
  return success;
};

export const describeDashboard = async (
  region: string,
  input: DescribeDashboardCommandInput,
): Promise<DescribeDashboardCommandOutput> => {
  try {
    const quickSightClient = sdkClient.QuickSightClient({
      region: region,
    });
    const command: DescribeDashboardCommand = new DescribeDashboardCommand(input);
    return await quickSightClient.send(command);
  } catch (err) {
    logger.error('Describe Dashboard Error.', { err });
    throw err;
  }
};

export const createPublishDashboard = async (
  dashboard: IDashboard,
  defaultDataSourceArn: string,
): Promise<any> => {
  try {
    const principals = await getClickstreamUserArn();
    // Create dataset in QuickSight
    const datasetId = dashboard.id.replace(QUICKSIGHT_DASHBOARD_INFIX, QUICKSIGHT_DATASET_INFIX);
    const datasetInput: CreateDataSetCommandInput = {
      AwsAccountId: awsAccountId,
      DataSetId: datasetId,
      Name: `dataset-${dashboard.name}-default`,
      Permissions: [{
        Principal: principals.publishUserArn,
        Actions: dataSetAdminPermissionActions,
      }],
      ImportMode: DataSetImportMode.DIRECT_QUERY,
      PhysicalTableMap: {
        PhyTable0: {
          CustomSql: {
            DataSourceArn: defaultDataSourceArn,
            Name: 'event',
            SqlQuery: `select * from ${dashboard.appId}.event`,
            Columns: [
              {
                Name: 'event_date',
                Type: 'DATETIME',
              },
              {
                Name: 'event_name',
                Type: 'STRING',
              },
            ],
          },
        },
      },
      DataSetUsageConfiguration: {
        DisableUseAsDirectQuerySource: false,
        DisableUseAsImportedSource: false,
      },
    };
    const dataset = await createDataSet(dashboard.region, datasetInput);
    // Create dashboard in QuickSight
    const sheets: SheetDefinition[] = [];
    for (let sheet of dashboard.sheets) {
      const sheetDefinition: SheetDefinition = {
        SheetId: sheet.id,
        Name: sheet.name,
      };
      sheets.push(sheetDefinition);
    }
    const dashboardDefinition = {
      DataSetIdentifierDeclarations: [
        {
          Identifier: 'default',
          DataSetArn: dataset.Arn,
        },
      ],
      Sheets: sheets,
      FilterGroups: [],
      CalculatedFields: [],
      ParameterDeclarations: [],
    };
    const dashboardInput: CreateDashboardCommandInput = {
      AwsAccountId: awsAccountId,
      DashboardId: dashboard.id,
      Name: dashboard.name,
      Definition: dashboardDefinition,
      VersionDescription: dashboard.description,
      Permissions: [
        {
          Principal: principals.publishUserArn,
          Actions: dashboardAdminPermissionActions,
        },
      ],
    };
    await createDashboard(dashboard.region, dashboardInput);
    const analysisId = dashboard.id.replace(QUICKSIGHT_DASHBOARD_INFIX, QUICKSIGHT_ANALYSIS_INFIX);
    const analysisInput: CreateAnalysisCommandInput = {
      AwsAccountId: awsAccountId,
      AnalysisId: analysisId,
      Name: dashboard.name,
      Definition: dashboardDefinition as AnalysisDefinition,
      Permissions: [
        {
          Principal: principals.publishUserArn,
          Actions: analysisAdminPermissionActions,
        },
      ],
    };
    await createAnalysis(dashboard.region, analysisInput);
    await createFolderMembership(dashboard.region, {
      AwsAccountId: awsAccountId,
      FolderId: `clickstream_${dashboard.projectId}_${dashboard.appId}`,
      MemberId: dashboard.id,
      MemberType: MemberType.DASHBOARD,
    });
  } catch (err) {
    logger.error('Create Publish Dashboard Error.', { err });
    throw err;
  }
};

export const deleteDatasetOfPublishDashboard = async (
  region: string,
  dashboardId: string,
): Promise<any> => {
  try {
    const quickSightClient = sdkClient.QuickSightClient({
      region: region,
    });
    const command: DescribeDashboardDefinitionCommand = new DescribeDashboardDefinitionCommand({
      AwsAccountId: awsAccountId,
      DashboardId: dashboardId,
    });
    const dashboardDefinition = await quickSightClient.send(command);
    dashboardDefinition.Definition?.DataSetIdentifierDeclarations?.forEach(async (dataset) => {
      const datasetId = dataset.DataSetArn?.split('/')[1];
      const delCommand: DeleteDataSetCommand = new DeleteDataSetCommand({
        AwsAccountId: awsAccountId,
        DataSetId: datasetId,
      });
      await quickSightClient.send(delCommand);
    });
  } catch (err) {
    logger.error('Delete dataset of publish dashboard error.', { err });
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

export const listFolderMembership = async (
  region: string,
  input: ListFolderMembersCommandInput,
): Promise<ListFolderMembersCommandOutput> => {
  try {
    const quickSightClient = sdkClient.QuickSightClient({
      region: region,
    });
    const command: ListFolderMembersCommand = new ListFolderMembersCommand(input);
    return await quickSightClient.send(command);
  } catch (err) {
    logger.error('List Folder Membership Error.', { err });
    throw err;
  }
};

export const describeDashboardByIds = async (
  region: string,
  projectId: string,
  appId: string,
  dashboardIds: string[],
): Promise<IDashboard[]> => {
  const dashboards: IDashboard[] = [];
  const inputs = [];
  const quickSightClient = sdkClient.QuickSightClient({
    region: region,
  });
  for (let dashboardId of dashboardIds) {
    inputs.push(promisePool(() => {
      return quickSightClient.send(new DescribeDashboardCommand({
        AwsAccountId: awsAccountId,
        DashboardId: dashboardId,
      })).then(res => {
        if (res.Dashboard && res.Dashboard.DashboardId) {
          dashboards.push({
            id: res.Dashboard.DashboardId,
            name: res.Dashboard.Name ?? '',
            description: res.Dashboard.Version?.Description ?? '',
            projectId: projectId,
            appId: appId,
            region: region,
            sheets: res.Dashboard.Version?.Sheets?.map((sheet) => {
              return {
                id: sheet.SheetId ?? '',
                name: sheet.Name ?? '',
              };
            }) ?? [],
            createAt: res.Dashboard.CreatedTime?.getTime() ?? 0,
            updateAt: res.Dashboard.LastUpdatedTime?.getTime() ?? 0,
          });
        }
      }).catch(_ => {
        return;
      });
    }));
  }
  await Promise.all(inputs);
  // sort by create timestamp
  dashboards.sort((a, b) => {
    return b.createAt - a.createAt;
  });
  const presetDashboard = dashboards.find((dashboard) => {
    return dashboard.name.startsWith(DEFAULT_DASHBOARD_NAME_PREFIX);
  });
  if (presetDashboard) {
    dashboards.splice(dashboards.indexOf(presetDashboard), 1);
    dashboards.unshift(presetDashboard);
  }
  return dashboards;
};

export const listDashboardIdsInFolder = async (
  region: string,
  folderId: string,
): Promise<string[]> => {
  const dashboardIds: string[] = [];
  let nextToken: string | undefined;
  do {
    const resp = await listFolderMembership(region, {
      AwsAccountId: awsAccountId,
      FolderId: folderId,
      NextToken: nextToken,
    });
    resp.FolderMemberList?.forEach((member) => {
      if (member.MemberArn?.includes('dashboard') && member.MemberId) {
        dashboardIds.push(member.MemberId);
      }
    });
    nextToken = resp.NextToken;
  } while (nextToken);
  return dashboardIds;
};

export const listDashboardsByApp = async (
  region: string,
  projectId: string,
  appId: string,
): Promise<IDashboard[]> => {
  const folderId = `clickstream_${projectId}_${appId}`;
  const dashboardIds = await listDashboardIdsInFolder(region, folderId);
  const dashboards = await describeDashboardByIds(region, projectId, appId, dashboardIds);
  return dashboards;
};

export const getDashboardDetail = async (
  region: string,
  projectId: string,
  appId: string,
  dashboardId: string,
): Promise<IDashboard | undefined> => {
  const dashboard = await describeDashboard(region, {
    AwsAccountId: awsAccountId,
    DashboardId: dashboardId,
  });
  if (dashboard.Dashboard && dashboard.Dashboard.DashboardId) {
    return {
      id: dashboard.Dashboard.DashboardId,
      name: dashboard.Dashboard.Name ?? '',
      description: dashboard.Dashboard.Version?.Description ?? '',
      projectId: projectId,
      appId: appId,
      region: region,
      sheets: dashboard.Dashboard.Version?.Sheets?.map((sheet) => {
        return {
          id: sheet.SheetId ?? '',
          name: sheet.Name ?? '',
        };
      }) ?? [],
      createAt: dashboard.Dashboard.CreatedTime?.getTime() ?? 0,
      updateAt: dashboard.Dashboard.LastUpdatedTime?.getTime() ?? 0,
    };
  }
  return undefined;
};
