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

import {
  QuickSight,
  DashboardSourceEntity,
  AnalysisSourceEntity,
  CreateDataSetCommandOutput,
  CreateAnalysisCommandOutput,
  CreateDashboardCommandOutput,
  ResourceNotFoundException,
  ColumnGroup,
  DataSetReference,
  TransformOperation,
  ColumnTag,
} from '@aws-sdk/client-quicksight';
import { Context, CloudFormationCustomResourceEvent } from 'aws-lambda';
import { logger } from '../../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../../common/sdk-client-config';
import {
  QuicksightCustomResourceLabmdaProps,
  dataSetActions,
  waitForAnalysisCreateCompleted,
  waitForAnalysisDeleteCompleted,
  waitForDashboardCreateCompleted,
  waitForDashboardDeleteCompleted,
  waitForDataSetCreateCompleted,
  waitForDataSetDeleteCompleted,
  QuickSightDashboardDefProps,
  DataSetProps,
  truncateString,
} from '../../../private/dashboard';

type ResourceEvent = CloudFormationCustomResourceEvent;

type QuicksightCustomResourceLabmdaPropsType = QuicksightCustomResourceLabmdaProps & {
  readonly ServiceToken: string;
}

interface ReturnData {
  Data: {
    dashboards: string;
  };
}

const sleep = (ms: number) => {
  return new Promise(resolve=>setTimeout(resolve, ms));
};

export const handler = async (event: ResourceEvent, _context: Context): Promise<ReturnData> => {
  logger.info(JSON.stringify(event));

  const props = event.ResourceProperties as QuicksightCustomResourceLabmdaPropsType;
  const region = props.awsRegion;
  const partition = props.awsPartition;
  const quickSight = new QuickSight({
    region,
    ...aws_sdk_client_common_config,
  });

  const awsAccountId = props.awsAccountId;
  const namespace: string = props.quickSightNamespace;
  const quickSightUser: string = props.quickSightUser;
  let principalArn = `arn:${partition}:quicksight:us-east-1:${awsAccountId}:user/${namespace}/${quickSightUser}`;
  if (props.quickSightPrincipalArn !== '') {
    principalArn = props.quickSightPrincipalArn;
  }

  let dashboards = [];

  if (event.RequestType === 'Create' || event.RequestType === 'Update' ) {
    const databaseSchemaNames = props.schemas;
    if ( databaseSchemaNames.trim().length > 0 ) {
      for (const schemaName of databaseSchemaNames.split(',')) {
        logger.info('schemaName: ', schemaName);
        const dashboardDefProps: QuickSightDashboardDefProps = props.dashboardDefProps;
        logger.info('dashboardDefProps', JSON.stringify(dashboardDefProps));

        const dashboard = await createQuickSightDashboard(quickSight, awsAccountId, principalArn,
          schemaName,
          dashboardDefProps);
        logger.info('created dashboard:', JSON.stringify(dashboard));
        dashboards.push({
          appId: schemaName,
          dashboardId: dashboard?.DashboardId,
        });
      };
    } else {
      logger.info('empty database schema.');
    }
  } else {
    logger.warn('Ignore Cloudformation Delete request to keep QuickSight resources.');
  }

  return {
    Data: {
      dashboards: JSON.stringify(dashboards),
    },
  };
};

const createDataSet = async (quickSight: QuickSight, awsAccountId: string, principalArn: string,
  dataSourceArn: string,
  schema: string,
  databaseName: string,
  props: DataSetProps)
: Promise<CreateDataSetCommandOutput|undefined> => {

  try {
    const tableNameIdentifer = truncateString(props.tableName, 30);
    const schemaIdentifer = truncateString(schema, 20);
    const databaseIdentifer = truncateString(databaseName, 20);
    const datasetId = `clickstream_dataset_v1_${tableNameIdentifer}_${databaseIdentifer}_${schemaIdentifer}`;
    //delete dataset if it exist.
    try {
      const dataset = await quickSight.describeDataSet({
        AwsAccountId: awsAccountId,
        DataSetId: datasetId,
      });
      logger.info('exist dataset: ', JSON.stringify(dataset));

      if (dataset.DataSet?.DataSetId === datasetId) {
        logger.info('delete exist dataset');
        await quickSight.deleteDataSet({
          AwsAccountId: awsAccountId,
          DataSetId: datasetId,
        });
        await waitForDataSetDeleteCompleted(quickSight, awsAccountId, datasetId);
      }
    } catch (err: any) {
      if ((err as Error) instanceof ResourceNotFoundException) {
        logger.info('Dataset not exist. skip delete operation.');
      } else {
        throw err;
      }
    }

    let colGroups: ColumnGroup[] = [];
    if (props.columnGroups !== undefined) {
      for (const columnsGroup of props.columnGroups ) {
        colGroups.push({
          GeoSpatialColumnGroup: {
            Name: columnsGroup.geoSpatialColumnGroupName,
            Columns: columnsGroup.geoSpatialColumnGroupColumns,
          },
        });
      }
    }

    let dataTransforms: TransformOperation[] = [];
    let needLogicalMap = false;
    if (props.tagColumnOperations !== undefined) {
      needLogicalMap = true;
      for (const tagColOperation of props.tagColumnOperations ) {
        const tags: ColumnTag[] = [];
        for (const role of tagColOperation.columnGeographicRoles) {
          tags.push({
            ColumnGeographicRole: role,
          });
        }
        dataTransforms.push({
          TagColumnOperation: {
            ColumnName: tagColOperation.columnName,
            Tags: tags,
          },
        });
      }
    }

    if (props.projectedColumns !== undefined) {
      needLogicalMap = true;
      dataTransforms.push({
        ProjectOperation: {
          ProjectedColumns: props.projectedColumns,
        },
      });
    }

    let logicalMap = undefined;
    if (needLogicalMap) {
      logicalMap = {
        LogialTable1: {
          Alias: 'Alias_LogialTable1',
          Source: {
            PhysicalTableId: 'PhyTable1',
          },
          DataTransforms: dataTransforms,
        },
      };
    }

    logger.info('start to create dataset');
    let dataset: CreateDataSetCommandOutput | undefined = undefined;
    for (const i of Array(60).keys()) {
      logger.info(`create dataset ${datasetId} round: ${i} `);
      try {
        dataset = await quickSight.createDataSet({
          AwsAccountId: awsAccountId,
          DataSetId: datasetId,
          Name: `${props.name} - ${databaseIdentifer} - ${schemaIdentifer} - ${tableNameIdentifer}`,
          Permissions: [{
            Principal: principalArn,
            Actions: dataSetActions,
          }],

          ImportMode: props.importMode,
          PhysicalTableMap: {
            PhyTable1: {
              CustomSql: {
                DataSourceArn: dataSourceArn,
                Name: props.tableName,
                SqlQuery: `SELECT * FROM ${schema}.${props.tableName}`,
                Columns: props.columns,
              },
            },
          },
          LogicalTableMap: needLogicalMap ? logicalMap : undefined,
          ColumnGroups: colGroups.length > 0 ? colGroups : undefined,
        });
        break;
      } catch (err: any) {
        if ( (err as Error).name === 'ConflictException'
          && (err as Error).message.includes('deletion is in progress')) {
          logger.info('dataset deletion is in progress wait 3 seconds');
          await sleep(3000);
          continue;
        } else {
          throw err;
        }
      }
    }

    await waitForDataSetCreateCompleted(quickSight, awsAccountId, datasetId);
    logger.info('create dataset finished. arn: ', dataset?.Arn!);

    return dataset;

  } catch (err: any) {
    logger.error(`Create QuickSight dataset failed due to: ${(err as Error).message}`);
    throw err;
  }
};

const createAnalysis = async (quickSight: QuickSight, awsAccountId: string, principalArn: string, databaseName: string, schema: string,
  sourceEntity: AnalysisSourceEntity, props: QuickSightDashboardDefProps)
: Promise<CreateAnalysisCommandOutput|undefined> => {

  try {
    const schemaIdentifer = truncateString(schema, 40);
    const databaseIdentifer = truncateString(databaseName, 40);
    const analysisId = `clickstream_analysis_v1_${databaseIdentifer}_${schemaIdentifer}`;

    //delete analysis if it exist.
    try {
      const analysis = await quickSight.describeAnalysis({
        AwsAccountId: awsAccountId,
        AnalysisId: analysisId,
      });
      logger.info('exist analysis: ', JSON.stringify(analysis));

      if (analysis.Analysis?.AnalysisId === analysisId) {
        logger.info('delete exist analysis');
        await quickSight.deleteAnalysis({
          AwsAccountId: awsAccountId,
          AnalysisId: analysisId,
          ForceDeleteWithoutRecovery: true,
        });
        await waitForAnalysisDeleteCompleted(quickSight, awsAccountId, analysisId);
      }
    } catch (err: any) {
      if ((err as Error) instanceof ResourceNotFoundException) {
        logger.info('Analysis not exist. skip delete operation.');
      } else {
        throw err;
      }
    }

    logger.info('start to create analysis');
    const analysis = await quickSight.createAnalysis({
      AwsAccountId: awsAccountId,
      AnalysisId: analysisId,
      Name: `${props.analysisName} ${databaseIdentifer} - ${schemaIdentifer}`,
      Permissions: [{
        Principal: principalArn,
        Actions: [
          'quicksight:DescribeAnalysis',
          'quicksight:UpdateAnalysisPermissions',
          'quicksight:QueryAnalysis',
          'quicksight:UpdateAnalysis',
          'quicksight:RestoreAnalysis',
          'quicksight:DeleteAnalysis',
          'quicksight:DescribeAnalysisPermissions',
        ],
      }],

      SourceEntity: sourceEntity,
    });
    await waitForAnalysisCreateCompleted(quickSight, awsAccountId, analysisId);
    logger.info('create analysis finished. arn: ', analysis.Arn!);

    return analysis;

  } catch (err: any) {
    logger.error(`Create QuickSight analysis failed due to: ${(err as Error).message}`);
    throw err;
  }
};


const createDashboard = async (quickSight: QuickSight, awsAccountId: string, principalArn: string, databaseName: string, schema: string,
  sourceEntity: DashboardSourceEntity, props: QuickSightDashboardDefProps)
: Promise<CreateDashboardCommandOutput|undefined> => {
  try {
    const schemaIdentifer = truncateString(schema, 40);
    const databaseIdentifer = truncateString(databaseName, 40);
    const dashboardId = `clickstream_dashboard_v1_${databaseIdentifer}_${schemaIdentifer}`;

    //delete dashboard if it exist.
    try {

      const dashbaord = await quickSight.describeDashboard({
        AwsAccountId: awsAccountId,
        DashboardId: dashboardId,
      });
      logger.info('exist dashboard: ', JSON.stringify(dashbaord));

      if (dashbaord.Dashboard?.DashboardId === dashboardId) {
        logger.info('delete exist dashboard');
        await quickSight.deleteDashboard({
          AwsAccountId: awsAccountId,
          DashboardId: dashboardId,
        });

        await waitForDashboardDeleteCompleted(quickSight, awsAccountId, dashboardId);
      }
    } catch (err: any) {
      if ((err as Error) instanceof ResourceNotFoundException) {
        logger.info('Dashboard not exist. skip delete operation.');
      } else {
        throw err;
      }
    }

    logger.info('start to create dashboard');
    const dashboard = await quickSight.createDashboard({
      AwsAccountId: awsAccountId,
      DashboardId: dashboardId,
      Name: `${props.dashboardName} ${databaseIdentifer} - ${schemaIdentifer}`,
      Permissions: [{
        Principal: principalArn,
        Actions: [
          'quicksight:DescribeDashboard',
          'quicksight:ListDashboardVersions',
          'quicksight:UpdateDashboardPermissions',
          'quicksight:QueryDashboard',
          'quicksight:UpdateDashboard',
          'quicksight:DeleteDashboard',
          'quicksight:DescribeDashboardPermissions',
          'quicksight:UpdateDashboardPublishedVersion',
        ],
      }],

      SourceEntity: sourceEntity,

    });
    await waitForDashboardCreateCompleted(quickSight, awsAccountId, dashboardId);
    logger.info('create dashboard finished. arn: ', dashboard.Arn!);

    return dashboard;

  } catch (err: any) {
    logger.error(`Create QuickSight dashboard failed due to: ${(err as Error).message}`);
    throw err;
  }
};

const createQuickSightDashboard = async (quickSight: QuickSight,
  accountId: string,
  principalArn: string,
  schema: string,
  dashboardDef: QuickSightDashboardDefProps)
: Promise<CreateDashboardCommandOutput|undefined> => {

  const datasetRefs: DataSetReference[] = [];
  const dataSets = dashboardDef.dataSets;
  const databaseName = dashboardDef.databaseName;
  for ( const dataSet of dataSets) {
    const createdDataset = await createDataSet(quickSight, accountId, principalArn, dashboardDef.dataSourceArn, schema, databaseName, dataSet);
    logger.info('data set arn:', createdDataset?.Arn!);

    datasetRefs.push({
      DataSetPlaceholder: dataSet.tableName,
      DataSetArn: createdDataset?.Arn!,
    });
  }

  const sourceEntity = {
    SourceTemplate: {
      Arn: dashboardDef.templateArn,
      DataSetReferences: datasetRefs,
    },
  };

  const analysis = await createAnalysis(quickSight, accountId, principalArn, databaseName, schema, sourceEntity, dashboardDef);
  logger.info(`Analysis ${analysis?.Arn} creation completed.`);

  const dashboard = await createDashboard(quickSight, accountId, principalArn, databaseName, schema, sourceEntity, dashboardDef);
  logger.info(`Dashboard ${dashboard?.Arn} creation completed.`);

  return dashboard;

};