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

export enum BuiltInTagKeys {
  AWS_SOLUTION = 'aws-solution/name',
  AWS_SOLUTION_VERSION = 'aws-solution/version',
  CLICKSTREAM_PROJECT = 'aws-solution/clickstream/project',
}

export enum REDSHIFT_MODE {
  PROVISIONED='Provisioned',
  SERVERLESS='Serverless',
  NEW_SERVERLESS='New_Serverless',
}

export enum MetricsNamespace {
  DATAPIPELINE = 'DataPipeline/ETL',
  REDSHIFT_ANALYTICS ='DataPipeline/DataModeling/Redshift',
}

export enum MetricsService {
  EMR_SERVERLESS = 'EMR-Serverless',
  WORKFLOW = 'workflow',
}

export enum DataPipelineCustomMetricsName {
  SOURCE='ETL source count',
  FLATTED_SOURCE ='ETL flatted source count',
  SINK='ETL sink count',
  CORRUPTED='ETL corrupted count',
  RUN_TIME='ETL job run time seconds',
};

export enum AnalyticsCustomMetricsName {
  FILE_NEW='New files count',
  FILE_PROCESSING='Processing files count',
  FILE_ENQUEUE ='Enqueue files count',
  FILE_LOADED='Loaded files count',
  FILE_MAX_AGE='File max age'
}