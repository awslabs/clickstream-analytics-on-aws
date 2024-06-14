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

export interface AuthenticationProps {
  readonly issuer: string;
  readonly userEndpoint: string;
  readonly authorizationEndpoint: string;
  readonly tokenEndpoint: string;
  readonly appClientId: string;
  readonly appClientSecret: string;
}

export interface BIUserCredential {
  readonly username: string;
  readonly password: string;
}

export interface PipelineStatusDetail {
  stackId: string;
  readonly stackName: string;
  readonly stackType: PipelineStackType;
  stackTemplateVersion: string;
  stackStatus: StackStatus | undefined;
  stackStatusReason: string;
  outputs: Output[];
}

export interface ExecutionDetail {
  executionArn?: string;
  name: string;
  status?: ExecutionStatus;
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
  STREAMING = 'Streaming',
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

export enum BuiltInTagKeys {
  AWS_SOLUTION = 'aws-solution/name',
  AWS_SOLUTION_VERSION = 'aws-solution/version',
  CLICKSTREAM_PROJECT = 'aws-solution/clickstream/project',
}

export enum SINK_TYPE_MODE {
  SINK_TYPE_KDS='KDS',
  SINK_TYPE_S3='S3',
  SINK_TYPE_MSK='MSK',
}

export enum ECS_INFRA_TYPE_MODE {
  FARGATE='FARGATE',
  EC2='EC2',
}

export enum REDSHIFT_MODE {
  PROVISIONED='Provisioned',
  SERVERLESS='Serverless',
  NEW_SERVERLESS='New_Serverless',
}

export enum KINESIS_MODE {
  ON_DEMAND = 'ON_DEMAND',
  PROVISIONED = 'PROVISIONED',
}

export enum MetricsNamespace {
  DATAPIPELINE = 'Clickstream/DataPipeline',
  REDSHIFT_ANALYTICS ='Clickstream/DataModeling/Redshift',
}

export enum MetricsService {
  EMR_SERVERLESS = 'EMR-Serverless',
  WORKFLOW = 'workflow',
}

export enum DataPipelineCustomMetricsName {
  SOURCE='Data Processing source count',
  FLATTED_SOURCE ='Data Processing flatted source count',
  SINK='Data Processing sink count',
  CORRUPTED='Data Processing corrupted count',
  RUN_TIME='Data Processing job run time seconds',
  INPUT_FILE_COUNT='Data Processing input file count',
  FILTERED_BY_APP_IDS='Data count filtered by appIds',
  FILTERED_BY_DATA_FRESHNESS_AND_FUTURE = 'Data count filtered by freshness and future time',
  FILTERED_BY_BOT = 'Data count filtered by bot',
};


export enum AnalyticsCustomMetricsName {
  FILE_NEW='New files count',
  FILE_PROCESSING='Processing files count',
  FILE_ENQUEUE ='Enqueue files count',
  FILE_LOADED='Loaded files count',
  FILE_MAX_AGE='File max age'
}

export enum MetadataVersionType {
  UNSUPPORTED = 'Unsupported',
  V1 = 'V1',
  V2 = 'V2',
  V3 = 'V3',
}
