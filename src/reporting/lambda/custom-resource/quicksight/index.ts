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

import crypto from 'crypto';
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
  DeleteDashboardCommandOutput,
  GeoSpatialDataRole,
  DataSetImportMode,
} from '@aws-sdk/client-quicksight';
import { Context, CloudFormationCustomResourceEvent, CloudFormationCustomResourceUpdateEvent, CloudFormationCustomResourceCreateEvent, CloudFormationCustomResourceDeleteEvent, CdkCustomResourceResponse } from 'aws-lambda';
import Mustache from 'mustache';
import { logger } from '../../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../../common/sdk-client-config';
import {
  QuicksightCustomResourceLambdaProps,
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

type QuicksightCustomResourceLambdaPropsType = QuicksightCustomResourceLambdaProps & {
  readonly ServiceToken: string;
}

export type MustacheParamType = {
  schema: string;
}

export const handler = async (event: ResourceEvent, _context: Context): Promise<CdkCustomResourceResponse|void> => {
  const props = event.ResourceProperties as QuicksightCustomResourceLambdaPropsType;
  const region = props.awsRegion;
  const quickSight = new QuickSight({
    region,
    ...aws_sdk_client_common_config,
  });

  const awsAccountId = props.awsAccountId;
  const principalArn = props.quickSightPrincipalArn;

  if (event.RequestType === 'Create') {
    return _onCreate(quickSight, awsAccountId, principalArn, event);
  } else if (event.RequestType === 'Update' ) {
    return _onUpdate(quickSight, awsAccountId, principalArn, event);
  } else if (event.RequestType === 'Delete' ) {
    return _onDelete(quickSight, awsAccountId, event);
  } else {
    logger.warn('Invalid request type.');
  }

};

const _onCreate = async (quickSight: QuickSight, awsAccountId: string, principalArn: string,
  event: CloudFormationCustomResourceCreateEvent): Promise<CdkCustomResourceResponse> => {

  logger.info('receive event', JSON.stringify(event));

  const props = event.ResourceProperties as QuicksightCustomResourceLambdaPropsType;
  let dashboards = [];
  const databaseSchemaNames = props.schemas;
  if ( databaseSchemaNames.trim().length > 0 ) {
    for (const schemaName of databaseSchemaNames.split(',')) {
      logger.info(`create schemaName: ${schemaName}`);
      const dashboardDefProps: QuickSightDashboardDefProps = props.dashboardDefProps;
      logger.info('dashboardDefProps', JSON.stringify(dashboardDefProps));

      const dashboard = await createQuickSightDashboard(quickSight, awsAccountId, principalArn,
        schemaName,
        dashboardDefProps);
      logger.info('created dashboard', JSON.stringify(dashboard));
      dashboards.push({
        appId: schemaName,
        dashboardId: dashboard?.DashboardId,
      });
    };
  } else {
    logger.info('empty database schema.');
  }

  return {
    Data: {
      dashboards: JSON.stringify(dashboards),
    },
  };
};

const _onDelete = async (quickSight: QuickSight, awsAccountId: string, event: CloudFormationCustomResourceDeleteEvent): Promise<void> => {

  logger.info('receive event', JSON.stringify(event));

  const props = event.ResourceProperties as QuicksightCustomResourceLambdaPropsType;
  const databaseSchemaNames = props.schemas;
  if ( databaseSchemaNames.trim().length > 0 ) {
    for (const schemaName of databaseSchemaNames.split(',')) {
      logger.info(`delete schemaName: ${schemaName}`);
      const dashboardDefProps: QuickSightDashboardDefProps = props.dashboardDefProps;
      logger.info('dashboardDefProps', JSON.stringify(dashboardDefProps));

      const dashboard = await deleteQuickSightDashboard(quickSight, awsAccountId, schemaName, dashboardDefProps);
      logger.info(`delete dashboard: ${dashboard?.DashboardId}`);
    };
  } else {
    logger.info('empty database schema, nothing need to delete.');
  }
};

const _onUpdate = async (quickSight: QuickSight, awsAccountId: string, principalArn: string,
  event: CloudFormationCustomResourceUpdateEvent): Promise<CdkCustomResourceResponse> => {

  logger.info('receive event', JSON.stringify(event));
  const props = event.ResourceProperties as QuicksightCustomResourceLambdaPropsType;
  const oldProps = event.OldResourceProperties as QuicksightCustomResourceLambdaPropsType;

  let dashboards = [];

  const databaseSchemaNameArray: string[] = [];
  if ( props.schemas.trim().length > 0 ) {
    databaseSchemaNameArray.push(...props.schemas.trim().split(','));
  };

  const oldDatabaseSchemaNameArray: string[] = [];
  if ( oldProps.schemas.trim().length > 0 ) {
    oldDatabaseSchemaNameArray.push(...oldProps.schemas.trim().split(','));
  };

  logger.info(`props.schemas: ${props.schemas}`);
  logger.info(`oldProps.schemas: ${oldProps.schemas}`);
  logger.info(`databaseSchemaNameArray: ${databaseSchemaNameArray}`);
  logger.info(`oldDatabaseSchemaNameArray: ${oldDatabaseSchemaNameArray}`);

  const updateSchemas = databaseSchemaNameArray.filter(item => oldDatabaseSchemaNameArray.includes(item));
  logger.info(`schemas need to be update: ${updateSchemas}`);

  const deleteSchemas = oldDatabaseSchemaNameArray.filter(item => !databaseSchemaNameArray.includes(item));
  logger.info(`schemas need to be delete: ${deleteSchemas}`);

  const createSchemas = databaseSchemaNameArray.filter(item => !oldDatabaseSchemaNameArray.includes(item));
  logger.info(`schemas need to be create: ${createSchemas}`);

  for (const schemaName of updateSchemas) {
    logger.info(`update schemaName: ${schemaName}`);
    const dashboardDefProps: QuickSightDashboardDefProps = props.dashboardDefProps;
    logger.info('dashboardDefProps', JSON.stringify(dashboardDefProps));

    const dashboard = await updateQuickSightDashboard(quickSight, awsAccountId,
      schemaName,
      dashboardDefProps);
    logger.info(`updated dashboard: ${dashboard?.DashboardId}`);
    dashboards.push({
      appId: schemaName,
      dashboardId: dashboard?.DashboardId,
    });
  };

  //create before delete
  for (const schemaName of createSchemas) {
    logger.info(`create schemaName: ${schemaName}`);
    const dashboardDefProps: QuickSightDashboardDefProps = props.dashboardDefProps;
    logger.info('dashboardDefProps', JSON.stringify(dashboardDefProps));

    const dashboard = await createQuickSightDashboard(quickSight, awsAccountId, principalArn,
      schemaName,
      dashboardDefProps);
    logger.info(`created dashboard: ${dashboard?.DashboardId}`);
    dashboards.push({
      appId: schemaName,
      dashboardId: dashboard?.DashboardId,
    });
  };

  for (const schemaName of deleteSchemas) {
    logger.info(`delate schemaName: ${schemaName}`);
    const dashboardDefProps: QuickSightDashboardDefProps = props.dashboardDefProps;
    logger.info('dashboardDefProps', JSON.stringify(dashboardDefProps));

    const dashboard = await deleteQuickSightDashboard(quickSight, awsAccountId,
      schemaName,
      dashboardDefProps);
    logger.info(`deleted dashboard: ${dashboard?.DashboardId}`);
  };

  return {
    Data: {
      dashboards: JSON.stringify(dashboards),
    },
  };
};

const createQuickSightDashboard = async (quickSight: QuickSight,
  accountId: string,
  principalArn: string,
  schema: string,
  dashboardDef: QuickSightDashboardDefProps)
: Promise<CreateDashboardCommandOutput|undefined> => {

  const datasetRefs: DataSetReference[] = [];
  const datasetIds: string[] = [];
  const dataSets = dashboardDef.dataSets;
  const databaseName = dashboardDef.databaseName;
  for ( const dataSet of dataSets) {
    const createdDataset = await createDataSet(quickSight, accountId, principalArn, dashboardDef.dataSourceArn, schema,
      databaseName, dataSet);
    logger.info(`data set id: ${createdDataset?.DataSetId}`);

    datasetRefs.push({
      DataSetPlaceholder: dataSet.tableName,
      DataSetArn: createdDataset?.Arn!,
    });
    datasetIds.push(createdDataset?.DataSetId!);
  }

  const sourceEntity = {
    SourceTemplate: {
      Arn: dashboardDef.templateArn,
      DataSetReferences: datasetRefs,
    },
  };

  const analysis = await createAnalysis(quickSight, accountId, principalArn, databaseName, schema, sourceEntity, dashboardDef);
  logger.info(`Analysis ${analysis?.AnalysisId} creation completed.`);

  const dashboard = await createDashboard(quickSight, accountId, principalArn, databaseName, schema, sourceEntity, dashboardDef);
  logger.info(`Dashboard ${dashboard?.DashboardId} creation completed.`);
  return dashboard;

};

const deleteQuickSightDashboard = async (quickSight: QuickSight,
  accountId: string,
  schema: string,
  dashboardDef: QuickSightDashboardDefProps)
: Promise<CreateDashboardCommandOutput|undefined> => {

  // Delete Dashboard
  const result = deleteDashboard(quickSight, accountId, dashboardDef.databaseName, schema);

  //delete Analysis
  await deleteAnalysis(quickSight, accountId, dashboardDef.databaseName, schema);

  //delete DataSets
  const dataSets = dashboardDef.dataSets;
  const databaseName = dashboardDef.databaseName;
  for ( const dataSet of dataSets) {
    await deleteDataSet(quickSight, accountId, schema, databaseName, dataSet);
  }

  return result;

};

const updateQuickSightDashboard = async (quickSight: QuickSight,
  accountId: string,
  schema: string,
  dashboardDef: QuickSightDashboardDefProps)
: Promise<CreateDashboardCommandOutput|undefined> => {

  const datasetRefs: DataSetReference[] = [];
  const dataSets = dashboardDef.dataSets;
  const databaseName = dashboardDef.databaseName;
  for ( const dataSet of dataSets) {
    const createdDataset = await updateDataSet(quickSight, accountId, dashboardDef.dataSourceArn, schema, databaseName, dataSet);
    logger.info(`data set id: ${createdDataset?.DataSetId}`);

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

  const analysis = await updateAnalysis(quickSight, accountId, databaseName, schema, sourceEntity, dashboardDef);
  logger.info(`Analysis ${analysis?.AnalysisId} creation completed.`);

  const dashboard = await updateDashboard(quickSight, accountId, databaseName, schema, sourceEntity, dashboardDef);
  logger.info(`Dashboard ${dashboard?.DashboardId} creation completed.`);

  return dashboard;

};

const createDataSet = async (quickSight: QuickSight, awsAccountId: string, principalArn: string,
  dataSourceArn: string,
  schema: string,
  databaseName: string,
  props: DataSetProps)
: Promise<CreateDataSetCommandOutput|undefined> => {

  try {
    const identifier = buildDataSetId(databaseName, schema, props.tableName);
    const datasetId = identifier.id;

    const mustacheParam: MustacheParamType = {
      schema,
    };

    logger.info('SQL to run:', Mustache.render(props.customSql, mustacheParam));

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
            ColumnGeographicRole: role as GeoSpatialDataRole,
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
        LogicalTable1: {
          Alias: 'Alias_LogicalTable1',
          Source: {
            PhysicalTableId: 'PhyTable1',
          },
          DataTransforms: dataTransforms,
        },
      };
    }

    logger.info('start to create dataset');
    const datasetParams = {
      AwsAccountId: awsAccountId,
      DataSetId: datasetId,
      Name: `${props.name}${identifier.tableNameIdentifier}-${identifier.schemaIdentifier}-${identifier.databaseIdentifier}`,
      Permissions: [{
        Principal: principalArn,
        Actions: dataSetActions,
      }],

      ImportMode: props.importMode as DataSetImportMode,
      PhysicalTableMap: {
        PhyTable1: {
          CustomSql: {
            DataSourceArn: dataSourceArn,
            Name: props.tableName,
            SqlQuery: Mustache.render(props.customSql, mustacheParam),
            Columns: props.columns,
          },
        },
      },
      LogicalTableMap: needLogicalMap ? logicalMap : undefined,
      ColumnGroups: colGroups.length > 0 ? colGroups : undefined,
      DataSetUsageConfiguration: {
        DisableUseAsDirectQuerySource: false,
        DisableUseAsImportedSource: false,
      },
    };
    logger.info(`dataset params: ${JSON.stringify(datasetParams)}`);
    const dataset = await quickSight.createDataSet(datasetParams);

    await waitForDataSetCreateCompleted(quickSight, awsAccountId, datasetId);
    logger.info(`create dataset finished. Id: ${datasetId}`);

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
    const identifier = buildAnalysisId(databaseName, schema);
    const analysisId = identifier.id;

    logger.info('start to create analysis');
    const analysis = await quickSight.createAnalysis({
      AwsAccountId: awsAccountId,
      AnalysisId: analysisId,
      Name: `${props.analysisName} - ${identifier.schemaIdentifier} - ${identifier.databaseIdentifier}`,
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
    logger.info(`Create analysis finished. Id: ${analysisId}`);

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
    const identifier = buildDashBoardId(databaseName, schema);
    const dashboardId = identifier.id;

    logger.info('start to create dashboard');
    const dashboard = await quickSight.createDashboard({
      AwsAccountId: awsAccountId,
      DashboardId: dashboardId,
      Name: `${props.dashboardName} - ${identifier.schemaIdentifier} - ${identifier.databaseIdentifier} `,
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
    logger.info(`Create dashboard finished. Id: ${dashboardId}`);

    return dashboard;

  } catch (err: any) {
    logger.error(`Create QuickSight dashboard failed due to: ${(err as Error).message}`);
    throw err;
  }
};

const deleteDashboard = async (quickSight: QuickSight, awsAccountId: string, databaseName: string, schema: string)
: Promise<DeleteDashboardCommandOutput|undefined> => {

  let deleteResult = undefined;
  const identifier = buildDashBoardId(databaseName, schema);
  const dashboardId = identifier.id;
  try {
    deleteResult = await quickSight.deleteDashboard({
      AwsAccountId: awsAccountId,
      DashboardId: dashboardId,
    });

    await waitForDashboardDeleteCompleted(quickSight, awsAccountId, dashboardId);
  } catch (err: any) {
    if ((err as Error) instanceof ResourceNotFoundException) {
      logger.info('Dashboard not exist. skip delete operation.');
    } else {
      logger.error(`Delete QuickSight dashboard failed due to: ${(err as Error).message}`);
      throw err;
    }
  }

  logger.info(`Delete dashboard finished. dashboard id : ${dashboardId}`);

  return deleteResult;

};

const deleteAnalysis = async (quickSight: QuickSight, awsAccountId: string, databaseName: string, schema: string)
: Promise<CreateAnalysisCommandOutput|undefined> => {

  let result = undefined;
  const identifier = buildAnalysisId(databaseName, schema);
  const analysisId = identifier.id;
  try {
    result = await quickSight.deleteAnalysis({
      AwsAccountId: awsAccountId,
      AnalysisId: analysisId,
      ForceDeleteWithoutRecovery: true,
    });
    await waitForAnalysisDeleteCompleted(quickSight, awsAccountId, analysisId);
  } catch (err: any) {
    if ((err as Error) instanceof ResourceNotFoundException) {
      logger.info('Analysis not exist. skip delete operation.');
    } else {
      logger.error(`Delete QuickSight analysis failed due to: ${(err as Error).message}`);
      throw err;
    }
  }

  logger.info('Delete analysis finished. Id: ', analysisId);

  return result;

};

const deleteDataSet = async (quickSight: QuickSight, awsAccountId: string,
  schema: string,
  databaseName: string,
  props: DataSetProps)
: Promise<CreateDataSetCommandOutput|undefined> => {

  let result = undefined;
  const identifier = buildDataSetId(databaseName, schema, props.tableName);
  const datasetId = identifier.id;
  try {
    result = await quickSight.deleteDataSet({
      AwsAccountId: awsAccountId,
      DataSetId: datasetId,
    });
    await waitForDataSetDeleteCompleted(quickSight, awsAccountId, datasetId);
  } catch (err: any) {
    if ((err as Error) instanceof ResourceNotFoundException) {
      logger.info('Dataset not exist. skip delete operation.');
    } else {
      logger.error(`Delete QuickSight dataset failed due to: ${(err as Error).message}`);
      throw err;
    }
  }

  return result;

};

const updateDataSet = async (quickSight: QuickSight, awsAccountId: string,
  dataSourceArn: string,
  schema: string,
  databaseName: string,
  props: DataSetProps)
: Promise<CreateDataSetCommandOutput|undefined> => {

  try {

    const identifier = buildDataSetId(databaseName, schema, props.tableName);
    const datasetId = identifier.id;

    const mustacheParam: MustacheParamType = {
      schema,
    };

    logger.info('SQL to run:', Mustache.render(props.customSql, mustacheParam));

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
            ColumnGeographicRole: role as GeoSpatialDataRole,
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
        LogicalTable1: {
          Alias: 'Alias_LogicalTable1',
          Source: {
            PhysicalTableId: 'PhyTable1',
          },
          DataTransforms: dataTransforms,
        },
      };
    }

    logger.info('start to update dataset');
    let dataset: CreateDataSetCommandOutput | undefined = undefined;
    dataset = await quickSight.updateDataSet({
      AwsAccountId: awsAccountId,
      DataSetId: datasetId,
      Name: `${identifier.tableNameIdentifier}-${identifier.schemaIdentifier}-${identifier.databaseIdentifier}`,

      ImportMode: props.importMode as DataSetImportMode,
      PhysicalTableMap: {
        PhyTable1: {
          CustomSql: {
            DataSourceArn: dataSourceArn,
            Name: props.tableName,
            SqlQuery: Mustache.render(props.customSql, mustacheParam),
            Columns: props.columns,
          },
        },
      },
      LogicalTableMap: needLogicalMap ? logicalMap : undefined,
      ColumnGroups: colGroups.length > 0 ? colGroups : undefined,
      DataSetUsageConfiguration: {
        DisableUseAsDirectQuerySource: false,
        DisableUseAsImportedSource: false,
      },
    });
    logger.info(`update dataset finished. Id: ${dataset?.DataSetId}`);

    return dataset;

  } catch (err: any) {
    logger.error(`update QuickSight dataset failed due to: ${(err as Error).message}`);
    throw err;
  }
};

const updateAnalysis = async (quickSight: QuickSight, awsAccountId: string, databaseName: string, schema: string,
  sourceEntity: AnalysisSourceEntity, props: QuickSightDashboardDefProps)
: Promise<CreateAnalysisCommandOutput|undefined> => {

  try {
    const identifier = buildAnalysisId(databaseName, schema);
    const analysisId = identifier.id;

    logger.info('start to update analysis');
    const analysis = await quickSight.updateAnalysis({
      AwsAccountId: awsAccountId,
      AnalysisId: analysisId,
      Name: `${props.analysisName} - ${identifier.schemaIdentifier} - ${identifier.databaseIdentifier}`,
      SourceEntity: sourceEntity,
    });
    logger.info(`update analysis finished. Id: ${analysisId}`);

    return analysis;

  } catch (err: any) {
    logger.error(`Update QuickSight analysis failed due to: ${(err as Error).message}`);
    throw err;
  }
};

const updateDashboard = async (quickSight: QuickSight, awsAccountId: string, databaseName: string, schema: string,
  sourceEntity: DashboardSourceEntity, props: QuickSightDashboardDefProps)
: Promise<CreateDashboardCommandOutput|undefined> => {
  try {
    const identifier = buildDashBoardId(databaseName, schema);
    const dashboardId = identifier.id;

    logger.info('start to create dashboard');
    const dashboard = await quickSight.updateDashboard({
      AwsAccountId: awsAccountId,
      DashboardId: dashboardId,
      Name: `${props.dashboardName} - ${identifier.schemaIdentifier} - ${identifier.databaseIdentifier}`,

      SourceEntity: sourceEntity,

    });
    logger.info(`update dashboard finished. id: ${dashboardId}`);

    return dashboard;

  } catch (err: any) {
    logger.error(`update QuickSight dashboard failed due to: ${(err as Error).message}`);
    throw err;
  }
};

const buildDashBoardId = function (databaseName: string, schema: string): Identifier {
  const schemaIdentifier = truncateString(schema, 40);
  const databaseIdentifier = truncateString(databaseName, 40);
  const suffix = crypto.createHash('sha256').update(`${databaseName}${schema}`).digest('hex').substring(0, 8);
  return {
    id: `clickstream_dashboard_${databaseIdentifier}_${schemaIdentifier}_${suffix}`,
    idSuffix: suffix,
    databaseIdentifier,
    schemaIdentifier,
  };
};

const buildAnalysisId = function (databaseName: string, schema: string): Identifier {
  const schemaIdentifier = truncateString(schema, 40);
  const databaseIdentifier = truncateString(databaseName, 40);
  const suffix = crypto.createHash('sha256').update(`${databaseName}${schema}`).digest('hex').substring(0, 8);
  return {
    id: `clickstream_analysis_${databaseIdentifier}_${schemaIdentifier}_${suffix}`,
    idSuffix: suffix,
    databaseIdentifier,
    schemaIdentifier,
  };
};

const buildDataSetId = function (databaseName: string, schema: string, tableName: string): Identifier {
  const tableNameIdentifier = truncateString(tableName.replace(/clickstream_/g, ''), 40);
  const schemaIdentifier = truncateString(schema, 15);
  const databaseIdentifier = truncateString(databaseName, 15);
  const suffix = crypto.createHash('sha256').update(`${databaseName}${schema}${tableName}`).digest('hex').substring(0, 8);
  return {
    id: `clickstream_dataset_${databaseIdentifier}_${schemaIdentifier}_${tableNameIdentifier}_${suffix}`,
    idSuffix: suffix,
    databaseIdentifier,
    schemaIdentifier,
    tableNameIdentifier,
  };

};

interface Identifier {
  id: string;
  idSuffix: string;
  databaseIdentifier: string;
  schemaIdentifier?: string;
  tableNameIdentifier?: string;
}