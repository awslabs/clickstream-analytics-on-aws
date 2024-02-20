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

import { IApplication } from '../model/application';

export enum FetchType {
  ANDROIDSDK = 'AndroidSDK',
  PIPELINE_ENDPOINT = 'PipelineEndpoint',
  PIPELINE_DOMAIN = 'PipelineDomain',
  PIPELINE_DNS = 'PipelineDNS',
}

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

export interface IRegion {
  readonly Endpoint?: string;
  readonly RegionName: string;
  readonly OptInStatus?: string;
}

export type ListRegionsResponse = IRegion[];

export interface ListVpcRequest extends ClickstreamListApiRequest {
  readonly region: string;
}

export interface IVpc {
  readonly VpcId: string;
  readonly Name?: string;
  readonly CidrBlock?: string;
  readonly IsDefault?: boolean;
}
export type ListVpcResponse = IVpc[];

export enum SubnetType {
  ALL = 'all',
  PUBLIC = 'public',
  PRIVATE = 'private',
  ISOLATED = 'isolated',
}

export interface ListSubnetsRequest extends ClickstreamListApiRequest {
  readonly region: string;
  readonly vpcId: string;
  readonly subnetType?: SubnetType;
}

export interface ISubnet {
  readonly SubnetId: string;
  readonly Name: string;
  readonly CidrBlock?: string;
  readonly AvailabilityZone: string;
  readonly Type: SubnetType;
}
export type ListSubnetsResponse = ISubnet[];

export interface ListSecurityGroupsRequest extends ClickstreamListApiRequest {
  readonly region: string;
  readonly vpcId: string;
}

export interface ISecurityGroup {
  readonly GroupId: string;
  readonly GroupName: string;
  readonly Description: string;
}
export type ListSecurityGroupsResponse = ISecurityGroup[];

export interface ListBucketsRequest extends ClickstreamListApiRequest {
  readonly region: string;
}

export interface IBucket {
  readonly Name: string;
  readonly Location: string;
}
export type ListBucketsResponse = IBucket[];

export interface ListMSKClustersRequest extends ClickstreamListApiRequest {
  readonly region: string;
  readonly vpcId: string;
}

export interface IMSKCluster {
  readonly ClusterArn: string;
  readonly ClusterName: string;
  readonly ClusterType: string;
  readonly SecurityGroupId: string;
  readonly State: string;
  readonly Authentication: string[];
  readonly ClientBroker: string;
}
export type ListMSKClustersResponse = IMSKCluster[];

export interface ListRedshiftClustersRequest extends ClickstreamListApiRequest {
  readonly region: string;
  readonly vpcId?: string;
}

export interface IRedshiftCluster {
  readonly Name: string;
  readonly NodeType: string;
  readonly Status: string;
  readonly MasterUsername: string;
  readonly PubliclyAccessible: boolean;
  readonly VpcSecurityGroupIds: string[];
  readonly ClusterSubnetGroupName: string;
  readonly VpcId: string;
  readonly Endpoint: {
    readonly Address: string;
    readonly Port: number;
  };
}
export type ListRedshiftClustersResponse = IRedshiftCluster[];

export interface ListRedshiftServerlessWorkGroupsRequest
  extends ClickstreamListApiRequest {
  readonly region: string;
}

export interface IRedshiftServerlessWorkGroup {
  readonly Arn: string;
  readonly Id: string;
  readonly Name: string;
  readonly Namespace: string;
  readonly Status: string;
}
export type ListRedshiftServerlessWorkGroupsResponse = IRedshiftServerlessWorkGroup[];

export interface ListRolesRequest extends ClickstreamListApiRequest {
  readonly service?: string;
  readonly account?: string;
}

export interface IRole {
  readonly Arn: string;
  readonly Id: string;
  readonly Name: string;
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

export interface IACMCertificate {
  readonly Arn: string;
  readonly Domain: string;
  readonly Status?:
  | 'EXPIRED'
  | 'FAILED'
  | 'INACTIVE'
  | 'ISSUED'
  | 'PENDING_VALIDATION'
  | 'REVOKED'
  | 'VALIDATION_TIMED_OUT';
}
export type ListACMCertificatesResponse = IACMCertificate[];

export interface ListSSMSecretsRequest extends ClickstreamListApiRequest {
  readonly region: string;
}

export interface ISSMSecret {
  readonly Name: string;
  readonly Arn: string;
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

export interface IAlarm {
  AlarmName: string;
  AlarmArn: string;
  AlarmDescription: string;
  ActionsEnabled: boolean;
  StateValue: string;
  StateReason: string;
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

export interface IServiceAvailable {
  readonly service: string;
  readonly available: boolean;
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

export enum IUserRole {
  ADMIN = 'Admin',
  OPERATOR = 'Operator',
  ANALYST = 'Analyst',
  ANALYST_READER = 'AnalystReader',
}

export interface IUser {
  readonly id: string;
  readonly name?: string;
  readonly roles: IUserRole[];
  readonly createAt: number;
  readonly operator: string;
}
export type ListUsersResponse = ResponseTableData<IUser>;

export interface IUserSettings {
  readonly roleJsonPath: string;
  readonly adminRoleNames: string;
  readonly operatorRoleNames: string;
  readonly analystRoleNames: string;
  readonly analystReaderRoleNames: string;
}

export interface CreateUserRequest {
  readonly id: string;
  readonly name: string;
  readonly roles: IUserRole[];
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

export enum PluginType {
  TRANSFORM = 'Transform',
  ENRICH = 'Enrich',
}

export interface IPlugin {
  readonly id: string;
  readonly name: string;
  readonly description: { [key: string]: string };
  readonly pluginType: PluginType;
  readonly mainFunction: string;
  readonly jarFile: string;
  readonly dependencyFiles: string[];
  readonly builtIn: boolean;
  readonly createAt: number;
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

export interface IDashboard {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly projectId: string;
  readonly appId: string;
  readonly region: string;
  readonly sheets: IDashboardSheet[];
  embedUrl?: string;
  readonly createAt: number;
  readonly updateAt: number;
}

export interface IDashboardSheet {
  readonly id: string;
  readonly name: string;
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

export enum ProjectEnvironment {
  DEV = 'Dev',
  TEST = 'Test',
  PROD = 'Prod',
}

export interface IProject {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly emails: string;
  readonly region: string;
  readonly environment: ProjectEnvironment;
  readonly pipelineId: string;
  readonly pipelineVersion: string;
  readonly applications: IApplication[];
  readonly analysisStudioEnabled: boolean;
  readonly createAt: number;
  readonly updateAt: number;
}

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


