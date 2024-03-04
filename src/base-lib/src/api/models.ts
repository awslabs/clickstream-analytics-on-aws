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

import { Output, StackStatus } from '@aws-sdk/client-cloudformation';
import { ExecutionStatus } from '@aws-sdk/client-sfn';

export enum FetchType {
  ANDROIDSDK = 'AndroidSDK',
  PIPELINE_ENDPOINT = 'PipelineEndpoint',
  PIPELINE_DOMAIN = 'PipelineDomain',
  PIPELINE_DNS = 'PipelineDNS',
}

export interface IRegion {
  readonly Endpoint?: string;
  readonly RegionName: string;
  readonly OptInStatus?: string;
}

export interface IVpc {
  readonly VpcId: string;
  readonly Name?: string;
  readonly CidrBlock?: string;
  readonly IsDefault?: boolean;
}

export enum SubnetType {
  ALL = 'all',
  PUBLIC = 'public',
  PRIVATE = 'private',
  ISOLATED = 'isolated',
}

export interface ISubnet {
  readonly SubnetId: string;
  readonly Name: string;
  readonly CidrBlock?: string;
  readonly AvailabilityZone: string;
  readonly Type: SubnetType;
}

export interface ISecurityGroup {
  readonly GroupId: string;
  readonly GroupName: string;
  readonly Description: string;
}

export interface IBucket {
  readonly Name: string;
  readonly Location: string;
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

export interface IRedshiftServerlessWorkGroup {
  readonly Arn: string;
  readonly Id: string;
  readonly Name: string;
  readonly Namespace: string;
  readonly Status: string;
}
export interface IRole {
  readonly Arn: string;
  readonly Id: string;
  readonly Name: string;
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

export interface ISSMSecret {
  readonly Name: string;
  readonly Arn: string;
}

export interface IAlarm {
  AlarmName: string;
  AlarmArn: string;
  AlarmDescription: string;
  ActionsEnabled: boolean;
  StateValue: string;
  StateReason: string;
}

export interface IServiceAvailable {
  readonly service: string;
  readonly available: boolean;
}

export enum UserRole {
  ADMIN = 'Admin',
  OPERATOR = 'Operator',
  ANALYST = 'Analyst',
  ANALYST_READER = 'AnalystReader',
}

export interface IUser {
  readonly id: string;
  readonly name?: string;
  readonly roles: UserRole[];
  readonly createAt: number;
  readonly operator: string;
}

export interface IUserSettings {
  readonly roleJsonPath: string;
  readonly adminRoleNames: string;
  readonly operatorRoleNames: string;
  readonly analystRoleNames: string;
  readonly analystReaderRoleNames: string;
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

export enum ProjectEnvironment {
  DEV = 'Dev',
  TEST = 'Test',
  PROD = 'Prod',
}

export enum PipelineStackType {
  INGESTION = 'Ingestion',
  KAFKA_CONNECTOR = 'KafkaConnector',
  DATA_PROCESSING = 'DataProcessing',
  DATA_MODELING_REDSHIFT = 'DataModelingRedshift',
  REPORTING = 'Reporting',
  METRICS = 'Metrics',
  ATHENA = 'DataModelingAthena',
  APP_REGISTRY = 'ServiceCatalogAppRegistry',
}

export enum PipelineStatusType {
  ACTIVE = 'Active',
  FAILED = 'Failed',
  WARNING = 'Warning',
  CREATING = 'Creating',
  UPDATING = 'Updating',
  DELETING = 'Deleting',
  DELETED = 'Deleted',
}

export enum PipelineServerProtocol {
  HTTP = 'HTTP',
  HTTPS = 'HTTPS',
}

export interface IngestionServerLoadBalancerProps {
  serverEndpointPath: string;
  serverCorsOrigin: string;
  protocol: PipelineServerProtocol;
  notificationsTopicArn?: string;
  enableGlobalAccelerator: boolean;
  enableApplicationLoadBalancerAccessLog: boolean;
  logS3Bucket?: S3Bucket;
  authenticationSecretArn?: string;
}

export interface IngestionServerSinkS3Props {
  sinkBucket: S3Bucket;
  s3BufferSize: number;
  s3BufferInterval: number;
}

export interface IngestionServerSinkKafkaProps {
  topic: string;
  brokers: string[];
  securityGroupId: string;
  mskCluster?: MSKClusterProps;
  kafkaConnector: KafkaS3Connector;
}

export enum KinesisStreamMode {
  ON_DEMAND = 'ON_DEMAND',
  PROVISIONED = 'PROVISIONED',
}

export interface IngestionServerSinkKinesisProps {
  kinesisStreamMode: KinesisStreamMode;
  kinesisShardCount: number;
  kinesisDataRetentionHours?: number;
  sinkBucket: S3Bucket;
}

export interface IngestionServerDomainProps {
  domainName: string;
  certificateArn: string;
}

export enum ENetworkType {
  General = 'General',
  Private = 'Private',
}

export interface NetworkProps {
  vpcId: string;
  publicSubnetIds: string[];
  privateSubnetIds: string[];
  type?: ENetworkType;
}

export interface RedshiftNetworkProps {
  vpcId: string;
  securityGroups: string[];
  subnetIds: string[];
}

export enum IngestionType {
  Fargate = 'Fargate',
  EC2 = 'EC2',
}

export interface IngestionServerSizeProps {
  serverMin: number;
  serverMax: number;
  warmPoolSize: number;
  scaleOnCpuUtilizationPercent?: number;
}

export enum PipelineSinkType {
  S3 = 's3',
  KAFKA = 'kafka',
  KINESIS = 'kinesis',
}

export interface IngestionServerSinkBatchProps {
  size: number;
  intervalSeconds: number;
}

export interface IngestionServer {
  ingestionType?: IngestionType;
  size: IngestionServerSizeProps;
  domain?: IngestionServerDomainProps;
  loadBalancer: IngestionServerLoadBalancerProps;
  sinkType: PipelineSinkType;
  sinkBatch?: IngestionServerSinkBatchProps;
  sinkS3?: IngestionServerSinkS3Props;
  sinkKafka?: IngestionServerSinkKafkaProps;
  sinkKinesis?: IngestionServerSinkKinesisProps;
}

export interface DataProcessing {
  dataFreshnessInHour: number;
  scheduleExpression: string;
  sourceS3Bucket: S3Bucket;
  sinkS3Bucket: S3Bucket;
  pipelineBucket: S3Bucket;
  outputFormat?: 'parquet' | 'json';
  transformPlugin?: IPlugin;
  enrichPlugin?: IPlugin[];
}

export interface KafkaS3Connector {
  enable: boolean;
  sinkBucket?: S3Bucket;
  maxWorkerCount?: number;
  minWorkerCount?: number;
  workerMcuCount?: number;
  pluginUrl?: string;
  customConnectorConfiguration?: string;
}

export interface DataModeling {
  ods?: {
    bucket: S3Bucket;
    fileSuffix: string;
  };
  redshift?: {
    dataRange: number;
    newServerless?: {
      baseCapacity: number;
      network: RedshiftNetworkProps;
    };
    existingServerless?: {
      workgroupName: string;
      iamRoleArn: string;
    };
    provisioned?: {
      clusterIdentifier: string;
      dbUser: string;
    };
  };
  athena: boolean;
  loadWorkflow?: {
    bucket?: S3Bucket;
    maxFilesLimit?: number;
  };
}

export interface Reporting {
  quickSight?: {
    accountName: string;
    namespace?: string;
    vpcConnection?: string;
  };
}

export interface ITag {
  key: string;
  value: string;
  existing: boolean;
}

export interface S3Bucket {
  name: string;
  prefix: string;
}

export interface MSKClusterProps {
  name: string;
  arn: string;
}

export interface ExecutionDetail {
  executionArn: string;
  name: string;
  status?: ExecutionStatus;
}

export interface PipelineStatusDetail {
  stackId: string;
  stackName: string;
  stackType: PipelineStackType;
  stackTemplateVersion: string;
  stackStatus: StackStatus | undefined;
  stackStatusReason: string;
  outputs: Output[];
}

export interface IApplication {
  readonly id: string;
  readonly projectId: string;
  readonly appId: string;
  readonly name: string;
  readonly description: string;
  readonly androidPackage?: string;
  readonly iosBundleId?: string;
  readonly iosAppStoreId?: string;
  readonly createAt: number;
  readonly updateAt: number;
  pipeline?: {
    id: string;
    statusType: PipelineStatusType;
    executionDetail: ExecutionDetail;
    stackDetails: PipelineStatusDetail[];
    endpoint: string;
    dns: string;
    customDomain: string;
  };
}

export interface IProject {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly emails: string;
  readonly region: string;
  environment: ProjectEnvironment;
  readonly pipelineId: string;
  readonly pipelineVersion: string;
  readonly applications: IApplication[];
  readonly analysisStudioEnabled: boolean;
  readonly createAt: number;
  readonly updateAt: number;
}

export interface PipelineStatus {
  status: PipelineStatusType;
  readonly stackDetails: PipelineStatusDetail[];
  readonly executionDetail: {
    readonly name?: string;
    readonly status?: ExecutionStatus | string;
  };
}

export interface IPipeline {
  id: string;
  projectId: string;
  pipelineId: string;
  region: string;
  dataCollectionSDK: string;
  tags: ITag[];
  network: NetworkProps;
  bucket: S3Bucket;
  ingestionServer: IngestionServer;
  dataProcessing?: DataProcessing;
  dataModeling?: DataModeling;
  reporting?: Reporting;
  lastAction?: string;
  status?: PipelineStatus;
  templateVersion?: string;
  statusType?: PipelineStatusType;
  stackDetails?: PipelineStatusDetail[];
  executionDetail?: ExecutionDetail;
  templateInfo?: {
    isLatest: boolean;
    pipelineVersion: string;
    solutionVersion: string;
  };
  analysisStudioEnabled?: boolean;
  version: string;
  versionTag: string;
  createAt: number;
  updateAt: number;
}
