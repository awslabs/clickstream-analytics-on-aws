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

import { IBucket } from 'aws-cdk-lib/aws-s3';

export interface LoadDataProps {
  readonly scheduleInterval: number;
  readonly maxFilesLimit: number;
  readonly processingFilesLimit: number;
}

interface BucketInfo {
  readonly s3Bucket: IBucket;
  readonly prefix: string;
}

export type ODSSource = BucketInfo & {
  readonly fileSuffix: string;
}

export type LoadWorkflowData = BucketInfo;

interface RedshiftProps {
  // readonly database: string;
}

export interface ServerlessRedshiftProps extends RedshiftProps {
  readonly workgroupName: string;
  readonly workgroupId?: string;
  readonly namespaceId?: string;
  readonly superUserIAMRoleArn?: string;
}

export interface ProvisionedRedshiftProps extends RedshiftProps {
  readonly clusterIdentifier: string;
  readonly dbUser: string;
}

interface CustomProperties {
  readonly serverlessRedshiftProps?: ServerlessRedshiftProps | undefined;
  readonly provisionedRedshiftProps?: ProvisionedRedshiftProps | undefined;
}

export type CreateDatabaseAndSchemas = Omit<CustomProperties, 'serverlessRedshiftProps'> & {
  readonly projectId: string;
  readonly appIds: string;
  readonly odsTableName: string;
  readonly databaseName: string;
  readonly userRoleArn: string;

  readonly serverlessRedshiftProps?: ServerlessRedshiftProps & {
    readonly defaultDatabaseName: string;
  } | undefined;
}

export type AssociateIAMRoleToRedshift = CustomProperties & {
  readonly roleArn: string;
}

export interface ManifestItem {
  url: string;
  meta: {
    content_length: number;
  };
}

export interface ManifestBody {
  appId: string;
  manifestFileName: string;
  jobList: {
    entries: Array<ManifestItem>;
  };
}