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

import { CertificateStatus } from '@aws-sdk/client-acm';
import { Parameter, Tag } from '@aws-sdk/client-cloudformation';
import { RouteTable } from '@aws-sdk/client-ec2';
import { Endpoint, VpcSecurityGroupMembership } from '@aws-sdk/client-redshift';
import { WorkgroupStatus } from '@aws-sdk/client-redshift-serverless';
import { ExecutionStatus } from '@aws-sdk/client-sfn';
import { PipelineStatusDetail, PipelineStatusType } from './model-ln';

export class ClickStreamBadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClickStreamBadRequestError';
    this.message = message;
  }
}

export class ClickStreamAuthError extends Error {
  readonly code: number;
  readonly body: {
    auth: boolean;
    message: string;
  };

  constructor(code: number, message: string) {
    super(message);
    this.name = 'ClickStreamAuthError';
    this.message = message;
    this.code = code;
    this.body = {
      auth: false,
      message: message,
    };
  }
}

export class ApiResponse {
  readonly success: boolean;
  readonly message: string;

  constructor(success: boolean, message?: string) {
    this.success = success;
    this.message = message ? message : '';
  }
}

export class ApiSuccess extends ApiResponse {
  readonly data?: any | never[];

  constructor(data: any | never[], message?: string) {
    super(true, message);
    this.data = data;
  }
}

export class ApiFail extends ApiResponse {
  readonly error?: any;

  constructor(message: string, error?: any) {
    super(false, message);
    this.error = error;
  }
}

export interface Policy {
  readonly Version: string;
  readonly Statement: PolicyStatement[];
}

export interface PolicyStatement {
  readonly Sid?: string;
  readonly Effect?: string;
  readonly Action?: string | string[];
  readonly Principal?: {
    [name: string]: any;
  };
  readonly Resource?: string | string[];
  readonly Condition?: any;
}

export interface ALBRegionMappingObject {
  [key: string]: {
    account: string;
  };
}

export interface RPURange {
  min: number;
  max: number;
}

export interface RPURegionMappingObject {
  [key: string]: RPURange;
}

export interface StackData {
  Input: SfnStackInput;
  Callback: SfnStackCallback;
}

export interface SfnStackInput {
  Action: string;
  readonly Region: string;
  readonly StackName: string;
  TemplateURL: string;
  readonly Parameters: Parameter[];
  Tags?: Tag[];
}

export interface SfnStackCallback {
  BucketName: string;
  readonly BucketPrefix: string;
}

export interface WorkflowTemplate {
  readonly Version: string;
  Workflow: WorkflowState;
}

export interface WorkflowState {
  Type: WorkflowStateType;
  Data?: StackData;
  readonly Branches?: WorkflowParallelBranch[];
  End?: boolean;
  Next?: string;
}

export enum WorkflowStateType {
  PASS = 'Pass',
  PARALLEL = 'Parallel',
  STACK = 'Stack',
}

export interface WorkflowParallelBranch {
  StartAt: string;
  States: {
    [name: string]: WorkflowState;
  };
}

export interface KeyVal<T> {
  [key: string]: T;
}

export interface ClickStreamRegion {
  readonly id: string;
}

export interface Certificate {
  readonly arn: string;
  readonly domain?: string;
  readonly id?: string;
  readonly name?: string;
  readonly status?: CertificateStatus | string;
}

export interface WorkGroup {
  readonly name: string;
  readonly description: string;
  readonly state: string;
  readonly engineVersion: string;
}

export interface ClickStreamVpc {
  readonly id: string;
  readonly name: string;
  readonly cidr: string;
  readonly isDefault: boolean;
}

export interface ClickStreamSubnet {
  readonly id: string;
  readonly name: string;
  readonly cidr: string;
  readonly availabilityZone: string;
  readonly type: SubnetType;
  readonly routeTable?: RouteTable;
}

export interface IamRole {
  readonly name: string;
  readonly id: string;
  readonly arn: string;
}

export interface MSKCluster {
  readonly name: string;
  readonly arn: string;
  readonly type: string;
  readonly authentication: string[];
  readonly state: string;
  readonly securityGroupId: string;
  readonly clientBroker: string;
}

export interface QuickSightUser {
  readonly userName: string;
  readonly role: string;
  readonly arn: string;
  readonly active: boolean;
  readonly email: string;
}

export interface QuickSightAccountInfo {
  readonly accountName?: string;
  readonly edition?: string;
  readonly notificationEmail?: string;
  readonly authenticationType?: string;
  readonly accountSubscriptionStatus?: string;
}

export interface RedshiftCluster {
  readonly name: string;
  readonly nodeType: string;
  readonly endpoint?: Endpoint;
  readonly status: string;
  readonly masterUsername: string;
  readonly publiclyAccessible: boolean;
  readonly vpcSecurityGroups: VpcSecurityGroupMembership[];
  readonly clusterSubnetGroupName: string;
  readonly vpcId: string;
}

export interface RedshiftWorkgroup {
  readonly id: string;
  readonly arn: string;
  readonly name: string;
  readonly namespace: string;
  readonly status: WorkgroupStatus | string;
}

export interface Route53HostedZone {
  readonly id: string;
  readonly name: string;
}

export interface ClickStreamBucket {
  readonly name: string;
  readonly location: string;
}

export interface ClickStreamSecurityGroup {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

export interface PipelineStatus {
  status: PipelineStatusType;
  readonly stackDetails: PipelineStatusDetail[];
  readonly executionDetail: {
    readonly name?: string;
    readonly status?: ExecutionStatus | string;
  };
}

export interface SSMSecret {
  readonly name: string;
  readonly arn: string;
}

export enum AssumeRoleType {
  ALL = 'All',
  SERVICE = 'Service',
  ACCOUNT = 'Account',
}

export enum KinesisStreamMode {
  ON_DEMAND = 'ON_DEMAND',
  PROVISIONED = 'PROVISIONED',
}

export enum WorkflowVersion {
  V20220315 = '2022-03-15',
}

export enum PipelineSinkType {
  S3 = 's3',
  KAFKA = 'kafka',
  KINESIS = 'kinesis',
}

export enum IngestionType {
  Fargate = 'Fargate',
  EC2 = 'EC2',
}

export enum ENetworkType {
  General = 'General',
  Private = 'Private',
}

export enum PipelineServerProtocol {
  HTTP = 'HTTP',
  HTTPS = 'HTTPS',
}

export enum PluginType {
  TRANSFORM = 'Transform',
  ENRICH = 'Enrich',
}

export enum ProjectEnvironment {
  DEV = 'Dev',
  TEST = 'Test',
  PROD = 'Prod',
}

export interface RedshiftInfo {
  readonly endpoint: {
    address: string;
    port: number;
  };
  readonly publiclyAccessible: boolean;
  readonly network: {
    readonly vpcId?: string;
    readonly securityGroups?: string[];
    readonly subnetIds?: string[];
  };
  readonly serverless?: {
    readonly workgroupId: string;
    readonly workgroupArn: string;
    readonly workgroupName: string;
    readonly namespaceId: string;
    readonly namespaceArn: string;
    readonly namespaceName: string;
  };
  readonly provisioned?: {
    readonly clusterIdentifier: string;
  };
}

export interface IngestionServerSinkBatchProps {
  readonly size: number;
  readonly intervalSeconds: number;
}

export interface ReportingDashboardOutput {
  readonly appId: string;
  readonly dashboardId: string;
}

export interface IngestionServerSizeProps {
  readonly serverMin: number;
  readonly serverMax: number;
  readonly warmPoolSize: number;
  readonly scaleOnCpuUtilizationPercent?: number;
}

export interface StackUpdateParameter {
  readonly stackName: string;
  readonly parameterKey: string;
  readonly parameterValue: any;
}

export enum BucketPrefix {
  LOGS_ALB = 'logs-alb',
  LOGS_KAFKA_CONNECTOR = 'logs-kafka-connector',
  DATA_BUFFER = 'data-buffer',
  DATA_ODS = 'data-ods',
  DATA_PIPELINE_TEMP = 'data-pipeline-temp',
  LOAD_WORKFLOW = 'load-workflow',
  KAFKA_CONNECTOR_PLUGIN = 'kafka-connector-plugin',
}

export enum MetricsLegendPosition {
  RIGHT = 'right',
  BOTTOM = 'bottom',
  HIDDEN = 'hidden',
}

export enum SubnetType {
  ALL = 'all',
  PUBLIC = 'public',
  PRIVATE = 'private',
  ISOLATED = 'isolated',
}

export enum DataCollectionSDK {
  CLICKSTREAM = 'clickstream',
  THIRDPARTY = 'thirdparty',
}

export enum FetchType {
  ANDROIDSDK = 'AndroidSDK',
  PIPELINE_ENDPOINT = 'PipelineEndpoint',
  PIPELINE_DOMAIN= 'PipelineDomain',
  PIPELINE_DNS= 'PipelineDNS',
}

export enum IUserRole {
  ADMIN = 'Admin',
  OPERATOR = 'Operator',
  ANALYST = 'Analyst',
  ANALYST_READER = 'AnalystReader',
}
