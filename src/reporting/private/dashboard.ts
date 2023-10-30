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

import { DataSetImportMode, InputColumn, QuickSight, ResourceNotFoundException } from '@aws-sdk/client-quicksight';
import { logger } from '../../common/powertools';

export interface RedShiftProps {
  databaseSchemaNames: string;
};

export interface QuickSightProps {
  namespace: string;
  userName: string;
  principalArn: string;
};

export interface QuicksightCustomResourceProps {
  readonly templateArn: string;
  readonly dataSourceArn: string;
  readonly databaseName: string;
  readonly quickSightProps: QuickSightProps;
  readonly redshiftProps: RedShiftProps;
};

export interface QuicksightCustomResourceLambdaProps {
  readonly awsAccountId: string;
  readonly awsRegion: string;
  readonly awsPartition: string;
  readonly quickSightNamespace: string;
  readonly quickSightUser: string;
  readonly quickSightPrincipalArn: string;
  readonly schemas: string;
  readonly dashboardDefProps: QuickSightDashboardDefProps;
};

export interface TagColumnOperationProps {
  columnName: string;
  columnGeographicRoles: string[];
};

export interface ColumnGroupsProps {
  geoSpatialColumnGroupName: string;
  geoSpatialColumnGroupColumns: string[];
};

export interface DataSetProps {
  name: string;
  tableName: string;
  columns: InputColumn[];
  importMode: DataSetImportMode;
  columnGroups?: ColumnGroupsProps[];
  projectedColumns?: string[];
  tagColumnOperations?: TagColumnOperationProps[];
  customSql: string;
};

export interface QuickSightDashboardDefProps {
  dashboardName: string;
  analysisName: string;
  templateArn: string;
  dataSourceArn: string;
  databaseName: string;
  dataSets: DataSetProps[];
};

export const dataSetActions = [
  'quicksight:UpdateDataSetPermissions',
  'quicksight:DescribeDataSet',
  'quicksight:DescribeDataSetPermissions',
  'quicksight:PassDataSet',
  'quicksight:DescribeIngestion',
  'quicksight:ListIngestions',
  'quicksight:UpdateDataSet',
  'quicksight:DeleteDataSet',
  'quicksight:CreateIngestion',
  'quicksight:CancelIngestion',
];

export const CLICKSTREAM_RETENTION_VIEW_PLACEHOLDER = 'clickstream_retention_view';
export const CLICKSTREAM_SESSION_VIEW_PLACEHOLDER = 'clickstream_session_view';
export const CLICKSTREAM_USER_DIM_VIEW_PLACEHOLDER = 'clickstream_user_dim_view';
export const CLICKSTREAM_EVENT_VIEW_PLACEHOLDER = 'clickstream_event_view';
export const CLICKSTREAM_DEVICE_VIEW_PLACEHOLDER = 'clickstream_device_view';
export const CLICKSTREAM_EVENT_PARAMETER_VIEW_PLACEHOLDER = 'clickstream_event_parameter_view';
export const CLICKSTREAM_LIFECYCLE_DAILY_VIEW_PLACEHOLDER = 'clickstream_lifecycle_daily_view';
export const CLICKSTREAM_LIFECYCLE_WEEKLY_VIEW_PLACEHOLDER = 'clickstream_lifecycle_weekly_view';
export const CLICKSTREAM_USER_ATTR_VIEW_PLACEHOLDER = 'clickstream_user_attr_view';

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(() => resolve(), ms));
};

export async function waitForDataSetCreateCompleted(quickSight: QuickSight, accountId: string, datasetId: string) {
  for (const _i of Array(60).keys()) {
    try {
      const dataset = await quickSight.describeDataSet({
        AwsAccountId: accountId,
        DataSetId: datasetId,
      });

      if ( dataset.DataSet !== undefined && dataset.DataSet?.DataSetId !== undefined) {
        return;
      }
      logger.info('DataSetCreate: sleep 1 second');
      await sleep(1000);

    } catch (err: any) {
      logger.info('DataSetCreate catch: sleep 1 second');
      await sleep(1000);
    }
  }
};

export async function waitForTemplateCreateCompleted(quickSight: QuickSight, accountId: string, templateId: string) {
  for (const _i of Array(60).keys()) {
    try {
      const template = await quickSight.describeTemplate({
        AwsAccountId: accountId,
        TemplateId: templateId,
      });

      if ( template.Template !== undefined && template.Template?.TemplateId !== undefined ) {
        return;
      }
      logger.info('TemplateCreate: sleep 1 second');
      await sleep(1000);

    } catch (err: any) {
      logger.info('TemplateCreate catch: sleep 1 second');
      await sleep(1000);
    }
  }
};

export async function waitForAnalysisCreateCompleted(quickSight: QuickSight, accountId: string, analysisId: string) {
  for (const _i of Array(60).keys()) {
    try {
      const analysis = await quickSight.describeAnalysis({
        AwsAccountId: accountId,
        AnalysisId: analysisId,
      });

      if ( analysis.Analysis !== undefined && analysis.Analysis?.AnalysisId !== undefined ) {
        return;
      }
      logger.info('AnalysisCreate: sleep 1 second');
      await sleep(1000);

    } catch (err: any) {
      logger.info('AnalysisCreate catch: sleep 1 second');
      await sleep(1000);
    }
  }
};

export async function waitForDashboardCreateCompleted(quickSight: QuickSight, accountId: string, dashboardId: string) {
  for (const _i of Array(60).keys()) {
    try {
      const dashboard = await quickSight.describeDashboard({
        AwsAccountId: accountId,
        DashboardId: dashboardId,
      });
      if ( dashboard.Dashboard !== undefined && dashboard.Dashboard?.DashboardId !== undefined ) {
        return;
      }
      logger.info('DashboardCreate: sleep 1 second');
      await sleep(1000);

    } catch (err: any) {
      logger.info('DashboardCreate catch: sleep 1 second');
      await sleep(1000);
    }
  }
};

export async function waitForDataSetDeleteCompleted(quickSight: QuickSight, accountId: string, datasetId: string) {
  for (const _i of Array(180).keys()) {
    try {
      await quickSight.describeDataSet({
        AwsAccountId: accountId,
        DataSetId: datasetId,
      });
      logger.info('delete dataset: sleep 1 second');
      await sleep(1000);
    } catch (err: any) {
      if ((err as Error) instanceof ResourceNotFoundException) {
        logger.info('delete dataset: wait finished');
        return;
      }

      logger.info('delete dataset catch: sleep 1 second');
      await sleep(1000);
    }
  }
};

export async function waitForTemplateDeleteCompleted(quickSight: QuickSight, accountId: string, templateId: string) {
  for (const _i of Array(60).keys()) {
    try {
      await quickSight.describeTemplate({
        AwsAccountId: accountId,
        TemplateId: templateId,
      });

      logger.info('TemplateDelete: sleep 1 second');
      await sleep(1000);

    } catch (err: any) {
      if ((err as Error) instanceof ResourceNotFoundException) {
        return;
      }
      logger.info('TemplateDelete catch: sleep 1 second');
      await sleep(1000);
    }
  }
};

export async function waitForAnalysisDeleteCompleted(quickSight: QuickSight, accountId: string, analysisId: string) {
  for (const _i of Array(60).keys()) {
    try {
      await quickSight.describeAnalysis({
        AwsAccountId: accountId,
        AnalysisId: analysisId,
      });

      logger.info('AnalysisDelete: sleep 1 second');
      await sleep(1000);

    } catch (err: any) {
      if ((err as Error) instanceof ResourceNotFoundException) {
        return;
      }
      logger.info('AnalysisDelete catch: sleep 1 second');
      await sleep(1000);
    }
  }
};

export async function waitForDashboardDeleteCompleted(quickSight: QuickSight, accountId: string, dashboardId: string) {
  for (const _i of Array(60).keys()) {
    try {
      await quickSight.describeDashboard({
        AwsAccountId: accountId,
        DashboardId: dashboardId,
      });

      logger.info('DashboardDelete: sleep 1 second');
      await sleep(1000);

    } catch (err: any) {
      if ((err as Error) instanceof ResourceNotFoundException) {
        return;
      }
      logger.info('DashboardDelete catch: sleep 1 second');
      await sleep(1000);
    }
  }
};

export function truncateString(source: string, length: number): string {
  if (source.length > length) {
    return source.substring(0, length);
  }
  return source;
};