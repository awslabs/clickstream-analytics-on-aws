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

import { DataSetImportMode, InputColumn, QuickSight, ResourceNotFoundException, ResourceStatus } from '@aws-sdk/client-quicksight';
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

export const dataSetPermissionActions = [
  'quicksight:DescribeDataSet',
  'quicksight:DescribeDataSetPermissions',
  'quicksight:PassDataSet',
  'quicksight:DescribeIngestion',
  'quicksight:ListIngestions',
];

export const analysisPermissionActions = [
  'quicksight:DescribeAnalysis',
  'quicksight:UpdateAnalysisPermissions',
  'quicksight:QueryAnalysis',
  'quicksight:UpdateAnalysis',
  'quicksight:RestoreAnalysis',
  'quicksight:DeleteAnalysis',
  'quicksight:DescribeAnalysisPermissions',
];

export const dashboardPermissionActions = [
  'quicksight:DescribeDashboard',
  'quicksight:ListDashboardVersions',
  'quicksight:QueryDashboard',
];

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
      logger.error(`Date set create failed due to ${(err as Error).message}`);
      throw err;
    }
  }
};

export async function waitForAnalysisChangeCompleted(quickSight: QuickSight, accountId: string, analysisId: string) {
  for (const _i of Array(60).keys()) {
    try {
      const analysis = await quickSight.describeAnalysisDefinition({
        AwsAccountId: accountId,
        AnalysisId: analysisId,
      });

      if ( analysis.ResourceStatus === ResourceStatus.UPDATE_SUCCESSFUL
        || analysis.ResourceStatus === ResourceStatus.CREATION_SUCCESSFUL) {
        return;
      } else if ( analysis.ResourceStatus === ResourceStatus.UPDATE_FAILED ) {
        throw new Error('Analysis update failed.');
      } else if ( analysis.ResourceStatus === ResourceStatus.CREATION_FAILED ) {
        throw new Error('Analysis create failed.');
      }

      logger.info('AnalysisUpdate: sleep 1 second');
      await sleep(1000);

    } catch (err: any) {
      logger.error(`Analysis create/update failed due to ${(err as Error).message}`);
      throw err;
    }
  }
};

export async function waitForDashboardChangeCompleted(quickSight: QuickSight, accountId: string, dashboardId: string) {
  for (const _i of Array(60).keys()) {
    try {
      const analysis = await quickSight.describeDashboardDefinition({
        AwsAccountId: accountId,
        DashboardId: dashboardId,
      });

      if ( analysis.ResourceStatus === ResourceStatus.UPDATE_SUCCESSFUL
        || analysis.ResourceStatus === ResourceStatus.CREATION_SUCCESSFUL) {
        return;
      } else if ( analysis.ResourceStatus === ResourceStatus.UPDATE_FAILED ) {
        throw new Error('Dashboard update failed.');
      } else if ( analysis.ResourceStatus === ResourceStatus.CREATION_FAILED ) {
        throw new Error('Dashboard create failed.');
      }
      logger.info('DashboardUpdate: sleep 1 second');
      await sleep(1000);

    } catch (err: any) {
      logger.error(`Dashboard create/update failed due to ${err}`);
      throw err;
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

      logger.error(`delete dataset failed due to ${err}`);
      throw err;
    }
  }
};

export async function waitForAnalysisDeleteCompleted(quickSight: QuickSight, accountId: string, analysisId: string) {
  for (const _i of Array(60).keys()) {
    try {
      const analysis = await quickSight.describeAnalysisDefinition({
        AwsAccountId: accountId,
        AnalysisId: analysisId,
      });

      if (analysis.ResourceStatus === ResourceStatus.DELETED) {
        return;
      }

      logger.info('AnalysisDelete: sleep 1 second');
      await sleep(1000);

    } catch (err: any) {
      if ((err as Error) instanceof ResourceNotFoundException) {
        return;
      }

      logger.error(`delete analysis failed due to ${err}`);
      throw err;
    }
  }
};

export async function waitForDashboardDeleteCompleted(quickSight: QuickSight, accountId: string, dashboardId: string) {
  for (const _i of Array(60).keys()) {
    try {
      const dashboard = await quickSight.describeDashboardDefinition({
        AwsAccountId: accountId,
        DashboardId: dashboardId,
      });

      if (dashboard.ResourceStatus === ResourceStatus.DELETED) {
        return;
      }

      logger.info('DashboardDelete: sleep 1 second');
      await sleep(1000);

    } catch (err: any) {
      if ((err as Error) instanceof ResourceNotFoundException) {
        return;
      }

      logger.error(`delete dashboard failed due to ${err}`);
      throw err;
    }
  }
};

export function truncateString(source: string, length: number): string {
  if (source.length > length) {
    return source.substring(0, length);
  }
  return source;
};