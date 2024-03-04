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

import { FetchType, IACMCertificate, IAlarm, IApplication, IBucket, IDashboard, IDashboardSheet, IMSKCluster, IPlugin, IProject, IRedshiftCluster, IRedshiftServerlessWorkGroup, IRegion, IRole, ISSMSecret, ISecurityGroup, IServiceAvailable, ISubnet, IUser, IUserSettings, IVpc, PluginType, ProjectEnvironment, SubnetType, UserRole } from './models';

export interface ResponseTableData<T> {
  totalCount: number;
  items: Array<T>;
}

export interface ClickstreamApiResponse {
  readonly success: boolean;
  readonly message: string;
  readonly error: string;
}

export interface ClickstreamListApiRequest {
  readonly pageNumber?: number;
  readonly pageSize?: number;
  readonly order?: string;
}

export type ListRegionsResponse = IRegion[];

export interface ListVpcRequest extends ClickstreamListApiRequest {
  readonly region: string;
}

export type ListVpcResponse = IVpc[];

export interface ListSubnetsRequest extends ClickstreamListApiRequest {
  readonly region: string;
  readonly vpcId: string;
  readonly subnetType?: SubnetType;
}

export type ListSubnetsResponse = ISubnet[];

export interface ListSecurityGroupsRequest extends ClickstreamListApiRequest {
  readonly region: string;
  readonly vpcId: string;
}

export type ListSecurityGroupsResponse = ISecurityGroup[];

export interface ListBucketsRequest extends ClickstreamListApiRequest {
  readonly region: string;
}

export type ListBucketsResponse = IBucket[];

export interface ListMSKClustersRequest extends ClickstreamListApiRequest {
  readonly region: string;
  readonly vpcId: string;
}

export type ListMSKClustersResponse = IMSKCluster[];

export interface ListRedshiftClustersRequest extends ClickstreamListApiRequest {
  readonly region: string;
  readonly vpcId?: string;
}

export type ListRedshiftClustersResponse = IRedshiftCluster[];

export interface ListRedshiftServerlessWorkGroupsRequest
  extends ClickstreamListApiRequest {
  readonly region: string;
}

export type ListRedshiftServerlessWorkGroupsResponse = IRedshiftServerlessWorkGroup[];

export interface ListRolesRequest extends ClickstreamListApiRequest {
  readonly service?: string;
  readonly account?: string;
}

export type ListRolesResponse = IRole[];

export interface DescribeQuickSightSubscriptionResponse {
  readonly AccountName?: string;
  readonly AccountSubscriptionStatus?: string;
  readonly AuthenticationType?: string;
  readonly Edition?: string;
  readonly NotificationEmail?: string;
}

export interface ListACMCertificatesRequest extends ClickstreamListApiRequest {
  readonly region: string;
}

export type ListACMCertificatesResponse = IACMCertificate[];

export interface ListSSMSecretsRequest extends ClickstreamListApiRequest {
  readonly region: string;
}

export type ListSSMSecretsResponse = ISSMSecret[];

export interface CredentialsResponse {
  readonly AccessKeyId: string;
  readonly SecretAccessKey: string;
  readonly SessionToken: string;
}

export interface ListAlarmsRequest extends ClickstreamListApiRequest {
  readonly projectId: string;
}

export type ListAlarmsResponse = ResponseTableData<IAlarm>;

export interface UpdateAlarmsRequest {
  readonly region: string;
  readonly alarmNames: string[];
  readonly enabled: boolean;
}

export interface ServicesAvailableRequest {
  readonly region: string;
  readonly services: string;
}

export type ServicesAvailableResponse = IServiceAvailable[];

export interface DomainAvailableRequest {
  readonly type: FetchType;
  readonly projectId?: string;
}

export interface DomainAvailableResponse {
  readonly data: any;
  readonly ok: boolean;
  readonly status: number;
}

export type ListUsersRequest = ClickstreamListApiRequest;

export type ListUsersResponse = ResponseTableData<IUser>;

export interface CreateUserRequest {
  readonly id: string;
  readonly name: string;
  readonly roles: UserRole[];
}

export interface CreateUserResponse {
  readonly id: string;
};

export interface GetUserRequest {
  readonly id: string;
}

export type GetUserResponse = IUser;

export type UpdateUserRequest = IUser;

export type DeleteUserRequest = GetUserRequest;

export type GetUserSettingsResponse = IUserSettings;

export type UpdateUserSettingsRequest = IUserSettings;

export interface ListPluginsRequest extends ClickstreamListApiRequest {
  readonly type?: string;
}

export type ListPluginsResponse = ResponseTableData<IPlugin>;

export interface CreatePluginRequest {
  readonly name: string;
  readonly description: { [key: string]: string };
  readonly pluginType: PluginType;
  readonly mainFunction: string;
  readonly jarFile: string;
  readonly dependencyFiles: string[];
}

export interface CreatePluginResponse {
  readonly id: string;
}

export interface DeletePluginRequest {
  readonly pluginId: string;
}

export interface ListDashboardsRequest extends ClickstreamListApiRequest {
  readonly projectId: string;
  readonly appId: string;
}

export type ListDashboardsResponse = ResponseTableData<IDashboard>;

export interface CreateDashboardRequest {
  readonly name: string;
  readonly description: string;
  readonly projectId: string;
  readonly appId: string;
  readonly region: string;
  readonly sheets: IDashboardSheet[];
}

export interface CreateDashboardResponse {
  readonly id: string;
}

export interface DescribeDashboardRequest {
  readonly dashboardId: string;
  readonly projectId: string;
  readonly appId: string;
  readonly allowedDomain: string;
}

export type DescribeDashboardResponse = IDashboard;

export interface DeleteDashboardRequest {
  readonly dashboardId: string;
  readonly projectId: string;
  readonly appId: string;
}
export interface DescribeAnalyzesRequest {
  readonly projectId: string;
  readonly allowedDomain: string;
}

export interface DescribeAnalyzesResponse {
  readonly embedUrl: string;
};

export interface ListProjectsRequest extends ClickstreamListApiRequest {
  readonly details?: string;
}

export type ListProjectsResponse = ResponseTableData<IProject>;

export interface CreateProjectRequest {
  readonly name: string;
  readonly description: string;
  readonly emails: string;
  readonly region: string;
  readonly environment: ProjectEnvironment;
}

export interface CreateProjectResponse {
  readonly id: string;
}

export interface GetProjectRequest {
  readonly projectId: string;
}

export type GetProjectResponse = IProject;
export type UpdateProjectRequest = IProject;
export type DeleteProjectRequest = GetProjectRequest;
export type VerificationProjectRequest = GetProjectRequest;

export interface VerificationProjectResponse {
  readonly exist: boolean;
}

export interface ListApplicationsRequest extends ClickstreamListApiRequest {
  readonly projectId: string;
}

export type ListApplicationsResponse = ResponseTableData<IApplication>;

export interface CreateApplicationRequest {
  readonly projectId: string;
  readonly appId: string;
  readonly name: string;
  readonly description: string;
  readonly androidPackage?: string;
  readonly iosBundleId?: string;
  readonly iosAppStoreId?: string;
}

export interface GetApplicationRequest {
  readonly projectId: string;
  readonly appId: string;
}

export type DeleteApplicationsRequest = GetApplicationRequest;

