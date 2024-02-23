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
  IdentityType,
  UserRole,
  GenerateEmbedUrlForRegisteredUserCommandInput,
  CreateDashboardCommandInput,
  CreateAnalysisCommandInput,
  CreateDataSetCommandInput,
  DataSetImportMode,
  SheetDefinition,
  AnalysisDefinition,
  ResourceNotFoundException,
  MemberType,
  FolderType,
  SharingModel,
  RegisterUserCommandInput,
  ResourceExistsException,
} from '@aws-sdk/client-quicksight';
import pLimit from 'p-limit';
import { awsAccountId, awsRegion, QUICKSIGHT_EMBED_NO_REPLY_EMAIL, QuickSightEmbedRoleArn } from '../../common/constants';
import { ANALYSIS_ADMIN_PERMISSION_ACTIONS, DASHBOARD_ADMIN_PERMISSION_ACTIONS, DATASET_ADMIN_PERMISSION_ACTIONS, DEFAULT_DASHBOARD_NAME_PREFIX, FOLDER_OWNER_PERMISSION_ACTIONS, QUICKSIGHT_ANALYSIS_INFIX, QUICKSIGHT_DASHBOARD_INFIX, QUICKSIGHT_DATASET_INFIX, QUICKSIGHT_RESOURCE_NAME_PREFIX } from '../../common/constants-ln';
import { logger } from '../../common/powertools';
import { SDKClient } from '../../common/sdk-client';
import { QuickSightAccountInfo } from '../../common/types';
import { IDashboard } from '../../model/project';
import { sleep } from '../../service/quicksight/reporting-utils';

const QUICKSIGHT_NAMESPACE = 'default';
const QUICKSIGHT_PUBLISH_USER_NAME = 'ClickstreamPublishUser';
const QUICKSIGHT_EXPLORE_USER_NAME = 'ClickstreamExploreUser';

const sdkClient: SDKClient = new SDKClient();
const promisePool = pLimit(3);

export const registerClickstreamUser = async () => {
  try {
    const identityRegion = await sdkClient.QuickSightIdentityRegion();
    await registerUser(identityRegion, {
      IdentityType: IdentityType.IAM,
      AwsAccountId: awsAccountId,
      Email: QUICKSIGHT_EMBED_NO_REPLY_EMAIL,
      IamArn: QuickSightEmbedRoleArn,
      Namespace: QUICKSIGHT_NAMESPACE,
      UserRole: UserRole.ADMIN,
      SessionName: QUICKSIGHT_PUBLISH_USER_NAME,
    });
    const clickstreamUserArn = await getClickstreamUserArn();
    return clickstreamUserArn;
  } catch (err) {
    logger.error('Register Clickstream User Error.', { err });
    throw err;
  }
};

const registerUser = async (
  region: string,
  input: RegisterUserCommandInput,
) => {
  try {
    const quickSight = sdkClient.QuickSight({
      region: region,
    });
    await quickSight.registerUser(input);
  } catch (err) {
    if (err instanceof ResourceExistsException) {
      return;
    }
    logger.error('Register User Error.', { err });
    throw err;
  }
};

export const deleteClickstreamUser = async () => {
  try {
    const identityRegion = await sdkClient.QuickSightIdentityRegion();
    const quickSightEmbedRoleName = QuickSightEmbedRoleArn?.split(':role/')[1];
    await sdkClient.QuickSight({ region: identityRegion }).deleteUser({
      AwsAccountId: awsAccountId,
      Namespace: QUICKSIGHT_NAMESPACE,
      UserName: `${quickSightEmbedRoleName}/${QUICKSIGHT_PUBLISH_USER_NAME}`,
    });
  } catch (err) {
    if (err instanceof ResourceNotFoundException) {
      return;
    }
    logger.error('Delete Clickstream User Error.', { err });
    throw err;
  }
};

export const deleteExploreUser = async () => {
  try {
    const identityRegion = await sdkClient.QuickSightIdentityRegion();
    const quickSightEmbedRoleName = QuickSightEmbedRoleArn?.split(':role/')[1];
    await sdkClient.QuickSight({ region: identityRegion }).deleteUser({
      AwsAccountId: awsAccountId,
      Namespace: QUICKSIGHT_NAMESPACE,
      UserName: `${quickSightEmbedRoleName}/${QUICKSIGHT_EXPLORE_USER_NAME}`,
    });
  } catch (err) {
    if (err instanceof ResourceNotFoundException) {
      return;
    }
    logger.error('Delete Clickstream User Error.', { err });
    throw err;
  }
};

export const generateEmbedUrlForRegisteredUser = async (
  region: string,
  allowedDomain: string,
  dashboardId?: string,
  sheetId?: string,
  visualId?: string,
) => {
  try {
    const quickSight = sdkClient.QuickSight({
      region: region,
    });
    const arns = await getClickstreamUserArn();
    let commandInput: GenerateEmbedUrlForRegisteredUserCommandInput = {
      AwsAccountId: awsAccountId,
      UserArn: arns.publishUserArn,
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
    const res = await quickSight.generateEmbedUrlForRegisteredUser(commandInput);
    return res;
  } catch (err) {
    logger.error('Generate Embed Url For Registered User Error.', { err });
    throw err;
  }
};

// Determine if QuickSight has already subscribed
export const quickSightIsSubscribed = async () => {
  try {
    const identityRegion = await sdkClient.QuickSightIdentityRegion();
    const quickSight = sdkClient.QuickSight({
      region: identityRegion,
    });
    const response = await quickSight.describeAccountSubscription({
      AwsAccountId: awsAccountId,
    });
    if (response.AccountInfo?.AccountSubscriptionStatus?.startsWith('UNSUBSCRIBED')) {
      return false;
    }
  } catch (err) {
    if (err instanceof ResourceNotFoundException) {
      return false;
    }
    logger.error('Describe Account Subscription Error.', { err });
    throw err;
  }
  return true;
};

export const quickSightIsEnterprise = async () => {
  try {
    const identityRegion = await sdkClient.QuickSightIdentityRegion();
    const quickSight = sdkClient.QuickSight({
      region: identityRegion,
    });
    const response = await quickSight.describeAccountSubscription({
      AwsAccountId: awsAccountId,
    });
    return response.AccountInfo?.Edition?.includes('ENTERPRISE');
  } catch (err) {
    logger.error('Describe Account Subscription Error.', { err });
    throw err;
  }
};

export const describeClickstreamAccountSubscription = async () => {
  try {
    const identityRegion = await sdkClient.QuickSightIdentityRegion();
    const quickSight = sdkClient.QuickSight({
      region: identityRegion,
    });
    const response = await quickSight.describeAccountSubscription({
      AwsAccountId: awsAccountId,
    });
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
    if (err instanceof ResourceNotFoundException) {
      return undefined;
    }
    logger.error('Describe Account Subscription Error.', { err });
    throw err;
  }
};

export interface QuickSightUserArns {
  publishUserArn: string;
  publishUserName: string;
}

export const getClickstreamUserArn = async (): Promise<QuickSightUserArns> => {
  const identityRegion = await sdkClient.QuickSightIdentityRegion();
  const quickSightEmbedRoleName = QuickSightEmbedRoleArn?.split(':role/')[1];
  const partition = awsRegion?.startsWith('cn') ? 'aws-cn' : 'aws';
  const publishUserName = `${quickSightEmbedRoleName}/${QUICKSIGHT_PUBLISH_USER_NAME}`;
  const publishUserArn = `arn:${partition}:quicksight:${identityRegion}:${awsAccountId}:user/${QUICKSIGHT_NAMESPACE}/${publishUserName}`;
  return { publishUserArn, publishUserName };
};

export const waitDashboardSuccess = async (region: string, dashboardId: string) => {
  try {
    const quickSight = sdkClient.QuickSight({
      region,
    });
    await sleep(300);
    let resp = await quickSight.describeDashboard(
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
      resp = await quickSight.describeDashboard(
        {
          AwsAccountId: awsAccountId,
          DashboardId: dashboardId,
        },
      );
    }
    const success = resp.Dashboard?.Version?.Status?.endsWith('_SUCCESSFUL') ?? false;
    return success;
  } catch (err) {
    logger.error('Wait Dashboard Success Error.', { err });
    throw err;
  }
};

export const createPublishDashboard = async (
  dashboard: IDashboard,
  defaultDataSourceArn: string,
): Promise<any> => {
  try {
    const principals = await getClickstreamUserArn();
    const quickSight = sdkClient.QuickSight({
      region: dashboard.region,
    });
    // Create dataset in QuickSight
    const datasetId = dashboard.id.replace(QUICKSIGHT_DASHBOARD_INFIX, QUICKSIGHT_DATASET_INFIX);
    const datasetInput: CreateDataSetCommandInput = {
      AwsAccountId: awsAccountId,
      DataSetId: datasetId,
      Name: `dataset-${dashboard.name}-default`,
      Permissions: [{
        Principal: principals.publishUserArn,
        Actions: DATASET_ADMIN_PERMISSION_ACTIONS,
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
    const dataset = await quickSight.createDataSet(datasetInput);
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
          Actions: DASHBOARD_ADMIN_PERMISSION_ACTIONS,
        },
      ],
    };
    await quickSight.createDashboard(dashboardInput);
    const analysisId = dashboard.id.replace(QUICKSIGHT_DASHBOARD_INFIX, QUICKSIGHT_ANALYSIS_INFIX);
    const analysisInput: CreateAnalysisCommandInput = {
      AwsAccountId: awsAccountId,
      AnalysisId: analysisId,
      Name: dashboard.name,
      Definition: dashboardDefinition as AnalysisDefinition,
      Permissions: [
        {
          Principal: principals.publishUserArn,
          Actions: ANALYSIS_ADMIN_PERMISSION_ACTIONS,
        },
      ],
    };
    await quickSight.createAnalysis(analysisInput);
    await quickSight.createFolderMembership({
      AwsAccountId: awsAccountId,
      FolderId: getQuickSightFolderId(dashboard.projectId, dashboard.appId),
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
) => {
  try {
    const quickSight = sdkClient.QuickSight({
      region: region,
    });
    const dashboardDefinition = await quickSight.describeDashboardDefinition({
      AwsAccountId: awsAccountId,
      DashboardId: dashboardId,
    });
    dashboardDefinition.Definition?.DataSetIdentifierDeclarations?.forEach(async (dataset) => {
      const datasetId = dataset.DataSetArn?.split('/')[1];
      await quickSight.deleteDataSet({
        AwsAccountId: awsAccountId,
        DataSetId: datasetId,
      });
    });
  } catch (err) {
    logger.error('Delete dataset of publish dashboard error.', { err });
    throw err;
  }
};

export const describeDashboardByIds = async (
  region: string,
  projectId: string,
  appId: string,
  dashboardIds: string[],
) => {
  try {
    const dashboards: IDashboard[] = [];
    const inputs = [];
    const quickSight = sdkClient.QuickSight({
      region: region,
    });
    for (let dashboardId of dashboardIds) {
      inputs.push(promisePool(() => {
        return quickSight.describeDashboard({
          AwsAccountId: awsAccountId,
          DashboardId: dashboardId,
        }).then(res => {
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
  } catch (err) {
    logger.error('Describe Dashboard By Ids Error.', { err });
    throw err;
  }
};

export const listDashboardIdsInFolder = async (
  region: string,
  folderId: string,
) => {
  try {
    const dashboardIds: string[] = [];
    let nextToken: string | undefined;
    const quickSight = sdkClient.QuickSight({
      region: region,
    });
    do {
      const resp = await quickSight.listFolderMembers({
        AwsAccountId: awsAccountId,
        FolderId: folderId,
        NextToken: nextToken,
      });
      resp.FolderMemberList?.forEach((member) => {
        if (member.MemberArn?.includes(':dashboard/') && member.MemberId) {
          dashboardIds.push(member.MemberId);
        }
      });
      nextToken = resp.NextToken;
    } while (nextToken);
    return dashboardIds;
  } catch (err) {
    logger.error('List Dashboard Ids In Folder Error.', { err });
    throw err;
  }
};

export const listDashboardsByApp = async (
  region: string,
  projectId: string,
  appId: string,
) => {
  const folderId = getQuickSightFolderId(projectId, appId);
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
  try {
    const quickSight = sdkClient.QuickSight({
      region: region,
    });
    const dashboard = await quickSight.describeDashboard({
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
  } catch (err) {
    logger.error('Get Dashboard Detail Error.', { err });
    throw err;
  }
};

export const checkFolder = async (
  region: string,
  projectId: string,
  appId: string,
  dashboardId?: string,
) => {
  try {
    const quickSight = sdkClient.QuickSight({
      region: region,
    });
    const folderId = getQuickSightFolderId(projectId, appId);
    const exist = await existFolder(region, folderId);
    if (!exist) {
      const principals = await getClickstreamUserArn();
      const folderRes = await quickSight.createFolder({
        AwsAccountId: awsAccountId,
        FolderId: folderId,
        Name: getQuickSightFolderName(projectId, appId),
        FolderType: FolderType.SHARED,
        SharingModel: SharingModel.ACCOUNT,
        Permissions: [
          {
            Principal: principals.publishUserArn,
            Actions: FOLDER_OWNER_PERMISSION_ACTIONS,
          },
        ],
      });
      if (dashboardId) {
        await quickSight.createFolderMembership({
          AwsAccountId: awsAccountId,
          FolderId: folderRes.FolderId,
          MemberId: dashboardId,
          MemberType: MemberType.DASHBOARD,
        });
      }
    }
  } catch (err) {
    logger.error('Check Folder Error.', { err });
    throw err;
  }
};

export const existFolder = async (
  region: string,
  folderId: string,
) => {
  try {
    const quickSight = sdkClient.QuickSight({
      region: region,
    });
    const res = await quickSight.describeFolder({
      AwsAccountId: awsAccountId,
      FolderId: folderId,
    });
    return res.Folder?.Arn !== undefined;
  } catch (err) {
    if (err instanceof ResourceNotFoundException) {
      return false;
    }
    logger.error('Describe Folder Error.', { err });
    throw err;
  }
};

export const getQuickSightFolderId = (projectId: string, appId: string) => {
  return `${QUICKSIGHT_RESOURCE_NAME_PREFIX}_${projectId}_${appId}`;
};

export const getQuickSightFolderName = (projectId: string, appId: string) => {
  return `${projectId}_${appId}`;
};

