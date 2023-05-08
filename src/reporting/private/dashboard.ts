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

import { ColumnGroup, DataSetReference, LogicalTable, PhysicalTable, QuickSight, ResourceNotFoundException } from '@aws-sdk/client-quicksight';
import { logger } from '../../common/powertools';

export interface RedShiftProps {
  databaseName: string;
  databaseSchemaNames: string;
  host: string;
  port: number;
  ssmParameterName: string;
}

export interface QuickSightProps {
  namespace: string;
  userName: string;
  vpcConnectionArn: string;
  principalArn: string;
  templateArn: string;
}

export interface QuicksightCustomResourceProps {
  readonly quickSightProps: QuickSightProps;
  readonly redshiftProps: RedShiftProps;
}

export interface QuicksightCustomResourceLabmdaProps {
  readonly awsAccountId: string;
  readonly awsRegion: string;
  readonly awsPartition: string;
  readonly quickSightNamespace: string;
  readonly quickSightUser: string;
  readonly quickSightPrincipalArn: string;
  readonly schemas: string;
  readonly dashboardDefProps: QuickSightDashboardDefProps;
}

export interface RedShiftDataSourceProps {
  id: string;
  name?: string;
  endpoint: string;
  port: number;
  databaseName: string;
  credentialParameter: string;
  vpcConnectionArn: string | undefined;
};

export interface QuickSightDataSetProps {
  id: string;
  name?: string;
  importMode: string;
  physicalTableMap: Record<string, PhysicalTable>;
  logicalTableMap?: Record<string, LogicalTable>;
  columnGroups?: ColumnGroup[];
};

export interface QuickSightDataProps {
  dataSets: QuickSightDataSetProps[];
  dataSource: RedShiftDataSourceProps;
  dataSetReferences: DataSetReference[];
};

export interface QuickSightTemplateProps {
  id: string;
  name?: string;
  templateArn?: string;
  templateDefinition?: string;
};

export interface QuickSightDashboardDefProps {
  dashboardId: string;
  dashboardName?: string;
  analysisId: string;
  analysisName?: string;
  data: QuickSightDataProps;
  template: QuickSightTemplateProps;
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

export const CLICKSTREAM_DAILY_ACTIVE_USER_VIEW_PLACEHOLDER = 'clickstream_daily_active_user_view';
export const CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER = 'clickstream_ods_flattened_view';
export const CLICKSTREAM_RETENTION_VIEW_PLACEHOLDER = 'clickstream_retention_view';
export const CLICKSTREAM_SESSION_VIEW_PLACEHOLDER = 'clickstream_session_view';
export const CLICKSTREAM_DAU_WAU_VIEW_PLACEHOLDER = 'clickstream_dau_wau_view';
export const CLICKSTREAM_USER_DIM_VIEW_PLACEHOLDER = 'clickstream_user_dim_view';
export const CLICKSTREAM_ODS_EVENT_VIEW_PLACEHOLDER = 'clickstream_ods_events_view';

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

      if ( dataset.DataSet !== undefined && dataset.DataSet?.DataSetId !== undefined ) {
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

export async function waitForDataSourceCreateCompleted(quickSight: QuickSight, accountId: string, datasourceId: string) {
  for (const _i of Array(60).keys()) {
    try {
      const datasource = await quickSight.describeDataSource({
        AwsAccountId: accountId,
        DataSourceId: datasourceId,
      });
      if ( datasource.DataSource !== undefined && datasource.DataSource?.DataSourceId !== undefined ) {
        return;
      }
      logger.info('DataSourceCreate: sleep 1 second');
      await sleep(1000);

    } catch (err: any) {
      logger.info('DataSourceCreate catch: sleep 1 second');
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

export async function waitForDashboardCreateCompleted(quickSight: QuickSight, accountId: string, dashbaordId: string) {
  for (const _i of Array(60).keys()) {
    try {
      const dashboard = await quickSight.describeDashboard({
        AwsAccountId: accountId,
        DashboardId: dashbaordId,
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

export async function waitForDataSourceDeleteCompleted(quickSight: QuickSight, accountId: string, datasourceId: string) {
  for (const _i of Array(60).keys()) {
    try {
      await quickSight.describeDataSource({
        AwsAccountId: accountId,
        DataSourceId: datasourceId,
      });
      logger.info('DataSourceDelete: sleep 1 second');
      await sleep(1000);

    } catch (err: any) {
      if ((err as Error) instanceof ResourceNotFoundException) {
        return;
      }
      logger.info('DataSourceDelete catch: sleep 1 second');
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