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
  DeleteDataSetCommandOutput,
  UpdateDashboardCommandOutput,
  DeleteAnalysisCommandOutput,
  UpdateDataSetCommandOutput,
  ConflictException,
  paginateListTemplateVersions,
  TemplateVersionSummary,
  ParameterValueType,
  DatasetParameter,
  MemberType,
  FolderType,
  SharingModel,
  ResourceExistsException,
} from '@aws-sdk/client-quicksight';
import { Context, CloudFormationCustomResourceEvent, CloudFormationCustomResourceUpdateEvent, CloudFormationCustomResourceCreateEvent, CloudFormationCustomResourceDeleteEvent, CdkCustomResourceResponse } from 'aws-lambda';
import Mustache from 'mustache';
import { v4 as uuidv4 } from 'uuid';
import { ANALYSIS_ADMIN_PERMISSION_ACTIONS, DASHBOARD_ADMIN_PERMISSION_ACTIONS, DATASET_ADMIN_PERMISSION_ACTIONS, DATASET_READER_PERMISSION_ACTIONS, FOLDER_CONTRIBUTOR_PERMISSION_ACTIONS, FOLDER_OWNER_PERMISSION_ACTIONS } from '../../../../common/constant';
import { logger } from '../../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../../common/sdk-client-config';
import { sleep } from '../../../../common/utils';
import { getQuickSightFolderId, getQuickSightFolderName } from '../../../../control-plane/backend/lambda/api/store/aws/quicksight';
import {
  QuicksightCustomResourceLambdaProps,
  waitForAnalysisChangeCompleted,
  waitForAnalysisDeleteCompleted,
  waitForDashboardChangeCompleted,
  waitForDashboardDeleteCompleted,
  waitForDataSetCreateCompleted,
  waitForDataSetDeleteCompleted,
  QuickSightDashboardDefProps,
  DataSetProps,
  truncateString,
  waitForTemplateChangeCompleted,
  existDashboard,
  existAnalysis,
  findAnalysisWithPrefix,
  findDashboardWithPrefix,
  waitForDataSourceChangeCompleted,
  DateTimeParameter,
  existFolder,
} from '../../../private/dashboard';

type ResourceEvent = CloudFormationCustomResourceEvent;

type QuicksightCustomResourceLambdaPropsType = QuicksightCustomResourceLambdaProps & {
  readonly ServiceToken: string;
}

type ResourceCommonParams = {
  awsAccountId: string;
  databaseName: string;
  schema: string;
  sharePrincipalArn: string;
  ownerPrincipalArn: string;
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
  const sharePrincipalArn = props.quickSightSharePrincipalArn;
  const ownerPrincipalArn = props.quickSightOwnerPrincipalArn;

  if (event.RequestType === 'Create') {
    return _onCreate(quickSight, awsAccountId, sharePrincipalArn, ownerPrincipalArn, event);
  } else if (event.RequestType === 'Update' ) {
    return _onUpdate(quickSight, awsAccountId, sharePrincipalArn, ownerPrincipalArn, event);
  } else if (event.RequestType === 'Delete' ) {
    return _onDelete(quickSight, awsAccountId, event);
  } else {
    logger.warn('Invalid request type.');
  }

};

const _onCreate = async (quickSight: QuickSight, awsAccountId: string, sharePrincipalArn: string, ownerPrincipalArn: string,
  event: CloudFormationCustomResourceCreateEvent): Promise<CdkCustomResourceResponse> => {

  const props = event.ResourceProperties as QuicksightCustomResourceLambdaPropsType;
  let dashboards = [];
  const databaseSchemaNames = props.schemas;
  if ( databaseSchemaNames.trim().length > 0 ) {
    for (const schemaName of databaseSchemaNames.split(',')) {
      const dashboardDefProps: QuickSightDashboardDefProps = props.dashboardDefProps;
      logger.info('creating quicksight dashboard with params', {
        schemaName: schemaName,
        dashboardDefProps: dashboardDefProps,
      });

      const dashboard = await createQuickSightDashboard(quickSight, awsAccountId, sharePrincipalArn, ownerPrincipalArn,
        schemaName,
        dashboardDefProps);

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
  const props = event.ResourceProperties as QuicksightCustomResourceLambdaPropsType;
  const databaseSchemaNames = props.schemas;
  if ( databaseSchemaNames.trim().length > 0 ) {
    for (const schemaName of databaseSchemaNames.split(',')) {
      const dashboardDefProps: QuickSightDashboardDefProps = props.dashboardDefProps;

      logger.info('deleting quicksight dashboard with params', {
        schemaName: schemaName,
        dashboardDefProps: dashboardDefProps,
      });

      const dashboard = await deleteQuickSightDashboard(quickSight, awsAccountId, schemaName, dashboardDefProps);
      logger.info(`delete dashboard: ${dashboard?.DashboardId}`);
    };
  } else {
    logger.info('empty database schema, nothing need to delete.');
  }
};

const _onUpdate = async (quickSight: QuickSight, awsAccountId: string, sharePrincipalArn: string, ownerPrincipalArn: string,
  event: CloudFormationCustomResourceUpdateEvent): Promise<CdkCustomResourceResponse> => {
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

  logger.info('Filtering params:', {
    propsSchemas: props.schemas,
    oldPropsSchemas: oldProps.schemas,
    databaseSchemaNameArray: databaseSchemaNameArray,
    oldDatabaseSchemaNameArray: oldDatabaseSchemaNameArray,
  });

  const updateSchemas = databaseSchemaNameArray.filter(item => oldDatabaseSchemaNameArray.includes(item));
  const deleteSchemas = oldDatabaseSchemaNameArray.filter(item => !databaseSchemaNameArray.includes(item));
  const createSchemas = databaseSchemaNameArray.filter(item => !oldDatabaseSchemaNameArray.includes(item));

  logger.info('schemas to process', {
    updateSchemas: updateSchemas,
    deleteSchemas: deleteSchemas,
    createSchemas: createSchemas,
  });

  for (const schemaName of updateSchemas) {
    const dashboardDefProps: QuickSightDashboardDefProps = props.dashboardDefProps;
    const oldDashboardDefProps: QuickSightDashboardDefProps = oldProps.dashboardDefProps;

    logger.info('Updating schema', {
      schemaName: schemaName,
      dashboardDefProps: dashboardDefProps,
      oldDashboardDefProps: oldDashboardDefProps,
    });

    const dashboard = await updateQuickSightDashboard(quickSight, awsAccountId,
      schemaName,
      dashboardDefProps, oldDashboardDefProps, ownerPrincipalArn, sharePrincipalArn);

    dashboards.push({
      appId: schemaName,
      dashboardId: dashboard?.DashboardId,
    });
  };

  //create before delete
  for (const schemaName of createSchemas) {
    const dashboardDefProps: QuickSightDashboardDefProps = props.dashboardDefProps;
    const dashboard = await createQuickSightDashboard(quickSight, awsAccountId, sharePrincipalArn, ownerPrincipalArn,
      schemaName,
      dashboardDefProps);

    logger.info('Creating schema', {
      schemaName: schemaName,
      dashboardDefProps: dashboardDefProps,
      oldDashboardDefProps: dashboard?.DashboardId,
    });

    dashboards.push({
      appId: schemaName,
      dashboardId: dashboard?.DashboardId,
    });
  };

  for (const schemaName of deleteSchemas) {
    const dashboardDefProps: QuickSightDashboardDefProps = props.dashboardDefProps;

    const dashboard = await deleteQuickSightDashboard(quickSight, awsAccountId,
      schemaName,
      dashboardDefProps);

    logger.info('Deleting schema', {
      schemaName: schemaName,
      dashboardDefProps: dashboardDefProps,
      oldDashboardDefProps: dashboard?.DashboardId,
    });

  };

  return {
    Data: {
      dashboards: JSON.stringify(dashboards),
    },
  };
};

const createQuickSightDashboard = async (quickSight: QuickSight,
  accountId: string,
  sharePrincipalArn: string,
  ownerPrincipalArn: string,
  schema: string,
  dashboardDef: QuickSightDashboardDefProps)
: Promise<CreateDashboardCommandOutput|undefined> => {

  const datasetRefs: DataSetReference[] = [];
  const dataSets = dashboardDef.dataSets;
  const databaseName = dashboardDef.databaseName;
  const commonParams: ResourceCommonParams = {
    awsAccountId: accountId,
    ownerPrincipalArn,
    sharePrincipalArn,
    databaseName,
    schema,
  };

  await grantDataSourcePermission(quickSight, dashboardDef.dataSourceArn, commonParams.awsAccountId, ownerPrincipalArn, sharePrincipalArn);

  for ( const dataSet of dataSets) {
    const createdDataset = await createDataSet(quickSight, commonParams, dashboardDef.dataSourceArn, dataSet);
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

  const folder = await quickSight.createFolder({
    AwsAccountId: commonParams.awsAccountId,
    FolderId: getQuickSightFolderId(commonParams.databaseName, commonParams.schema),
    Name: getQuickSightFolderName(commonParams.databaseName, commonParams.schema),
    FolderType: FolderType.SHARED,
    SharingModel: SharingModel.ACCOUNT,
    Permissions: [
      {
        Principal: commonParams.sharePrincipalArn,
        Actions: FOLDER_CONTRIBUTOR_PERMISSION_ACTIONS,
      },
      {
        Principal: commonParams.ownerPrincipalArn,
        Actions: FOLDER_OWNER_PERMISSION_ACTIONS,
      },
    ],
  });

  const analysis = await createAnalysis(quickSight, commonParams, sourceEntity, dashboardDef);
  logger.info(`Analysis ${analysis?.AnalysisId} creation completed.`);

  const dashboard = await createDashboard(quickSight, commonParams, sourceEntity, dashboardDef);
  logger.info(`Dashboard ${dashboard?.DashboardId} creation completed.`);

  await quickSight.createFolderMembership({
    AwsAccountId: commonParams.awsAccountId,
    FolderId: folder.FolderId!,
    MemberId: dashboard?.DashboardId!,
    MemberType: MemberType.DASHBOARD,
  });

  return dashboard;

};

const deleteQuickSightDashboard = async (quickSight: QuickSight,
  accountId: string,
  schema: string,
  dashboardDef: QuickSightDashboardDefProps)
: Promise<DeleteDashboardCommandOutput|undefined> => {

  // Delete Dashboard
  const dashboardId = buildDashBoardId(dashboardDef.databaseName, schema);
  const result = deleteDashboardById(quickSight, accountId, dashboardId.id);

  //delete Analysis
  const analysisId = buildAnalysisId(dashboardDef.databaseName, schema);
  await deleteAnalysisById(quickSight, accountId, analysisId.id);

  //delete DataSets
  const dataSets = dashboardDef.dataSets;
  const databaseName = dashboardDef.databaseName;
  for ( const dataSet of dataSets) {
    await deleteDataSet(quickSight, accountId, schema, databaseName, dataSet);
  }

  await quickSight.listFolderMembers({
    AwsAccountId: accountId,
    FolderId: getQuickSightFolderId(databaseName, schema),
  }).then(async (data) => {
    if (data !== undefined && data.FolderMemberList !== undefined) {
      for (const member of data.FolderMemberList) {
        const memberType = getMemberType(member.MemberArn!, member.MemberId!);
        await quickSight.deleteFolderMembership({
          AwsAccountId: accountId,
          FolderId: getQuickSightFolderId(databaseName, schema),
          MemberId: member.MemberId!,
          MemberType: memberType,
        });
      }
    }
  });

  //delete folder
  await quickSight.deleteFolder({
    AwsAccountId: accountId,
    FolderId: getQuickSightFolderId(databaseName, schema),
  });

  return result;

};

const getMemberType = function(memberArn: string, memberId: string): MemberType | undefined {
  let memberType = undefined;

  if (memberArn.includes(`:dashboard/${memberId}`)) {
    memberType = MemberType.DASHBOARD;
  } else if (memberArn.includes(`:analysis/${memberId}`)) {
    memberType = MemberType.ANALYSIS;
  } else if (memberArn.includes(`:dataset/${memberId}`)) {
    memberType = MemberType.DATASET;
  } else if (memberArn.includes(`:datasource/${memberId}`)) {
    memberType = MemberType.DATASOURCE;
  } else if (memberArn.includes(`:topic/${memberId}`)) {
    memberType = MemberType.TOPIC;
  }
  return memberType;
};

const getLatestTemplateVersion = async (quickSight: QuickSight,
  accountId: string, templateId: string): Promise<number> => {
  await waitForTemplateChangeCompleted(quickSight, accountId, templateId);

  const templateVersionSummaries: TemplateVersionSummary[] = [];
  for await (const page of paginateListTemplateVersions({ client: quickSight }, {
    TemplateId: templateId,
    AwsAccountId: accountId,
  })) {
    if (page.TemplateVersionSummaryList !== undefined) {
      templateVersionSummaries.push(...page.TemplateVersionSummaryList);
    }
  }

  let maxNumber = 1;
  for (const version of templateVersionSummaries) {
    const number = version.VersionNumber ?? 1;
    if (number > maxNumber) {
      maxNumber = number;
    }
  }

  return maxNumber;
};

const updateQuickSightDashboard = async (quickSight: QuickSight,
  accountId: string,
  schema: string,
  dashboardDef: QuickSightDashboardDefProps,
  oldDashboardDef: QuickSightDashboardDefProps,
  ownerPrincipalArn : string,
  sharePrincipalArn : string,
)
: Promise<UpdateDashboardCommandOutput|undefined> => {

  const datasetRefs: DataSetReference[] = [];
  const dataSets = dashboardDef.dataSets;
  const oldDataSets = oldDashboardDef.dataSets;
  const databaseName = dashboardDef.databaseName;
  const commonParams: ResourceCommonParams = {
    awsAccountId: accountId,
    ownerPrincipalArn,
    sharePrincipalArn,
    databaseName,
    schema,
  };

  await grantDataSourcePermission(quickSight, dashboardDef.dataSourceArn, commonParams.awsAccountId, ownerPrincipalArn, sharePrincipalArn);

  const oldDataSetTableNames: string[] = [];
  const dataSetTableNames: string[] = [];
  for (const dataset of dataSets) {
    dataSetTableNames.push(dataset.tableName);
  }
  for (const dataset of oldDataSets) {
    oldDataSetTableNames.push(dataset.tableName);
  }

  const needDeleteDataSets = oldDataSets.filter(item => !dataSetTableNames.includes(item.tableName));
  const needUpdateDataSetTableNames = dataSetTableNames.filter(item => oldDataSetTableNames.includes(item));

  logger.info('Delete and update dataset and table names', {
    needDeleteDataSets: needDeleteDataSets,
    needUpdateDataSetTableNames: needUpdateDataSetTableNames,
  });

  for ( const dataSet of dataSets) {
    let createdDataset;
    if (needUpdateDataSetTableNames.includes(dataSet.tableName)) {
      logger.info(`update data set : ${dataSet.tableName}`);
      createdDataset = await updateDataSet(quickSight, commonParams, dashboardDef.dataSourceArn, dataSet);
    } else {
      logger.info(`create data set : ${dataSet.tableName}`);
      createdDataset = await createDataSet(quickSight, commonParams, dashboardDef.dataSourceArn, dataSet);
    }
    datasetRefs.push({
      DataSetPlaceholder: dataSet.tableName,
      DataSetArn: createdDataset?.Arn!,
    });
  }

  //remove unused datasets
  for (const dataSet of needDeleteDataSets) {
    logger.info(`delete data set : ${dataSet.tableName}`);
    await deleteDataSet(quickSight, accountId, schema, databaseName, dataSet);
  }

  const latestVersion = await getLatestTemplateVersion(quickSight, accountId, dashboardDef.templateId);

  logger.info('template info', {
    templateId: dashboardDef.templateId,
    templateArn: dashboardDef.templateArn,
    latestVersion: latestVersion,
  });

  const sourceEntity = {
    SourceTemplate: {
      Arn: dashboardDef.templateArn + `/version/${latestVersion}`,
      DataSetReferences: datasetRefs,
    },
  };

  const analysisId = buildAnalysisId(commonParams.databaseName, commonParams.schema);

  const analysisExist = await existAnalysis(quickSight, commonParams.awsAccountId, analysisId.id);
  if (analysisExist) {
    const analysis = await updateAnalysis(quickSight, commonParams, sourceEntity, dashboardDef);
    logger.info(`Analysis ${analysis?.AnalysisId} update completed.`);
  } else {
    const analysis = await createAnalysis(quickSight, commonParams, sourceEntity, dashboardDef);
    logger.info(`Analysis ${analysis?.AnalysisId} create completed.`);

    const foundAnalysisId = await findAnalysisWithPrefix(quickSight, commonParams.awsAccountId, analysisId.id.replace(`/${analysisId.idSuffix}/g`, ''), analysis?.AnalysisId);
    if (foundAnalysisId !== undefined) {
      await deleteAnalysisById(quickSight, commonParams.awsAccountId, foundAnalysisId);
    }
  }

  let dashboard = undefined;
  const dashboardId = buildDashBoardId(commonParams.databaseName, commonParams.schema);
  const dashboardExist = await existDashboard(quickSight, commonParams.awsAccountId, dashboardId.id);
  if (dashboardExist) {
    dashboard = await updateDashboard(quickSight, commonParams, sourceEntity, dashboardDef);
    logger.info(`Dashboard ${dashboard?.DashboardId} update completed.`);
  } else {
    dashboard = await createDashboard(quickSight, commonParams, sourceEntity, dashboardDef);
    logger.info(`Dashboard ${dashboard?.DashboardId} create completed.`);

    //due to dashboardId changed in version v1.1, need to delete old dashboard
    const foundDashboardId = await findDashboardWithPrefix(quickSight, commonParams.awsAccountId, dashboardId.id.replace(`/${dashboardId.idSuffix}/g`, ''), dashboard?.DashboardId);
    if (foundDashboardId !== undefined) {
      await deleteDashboardById(quickSight, commonParams.awsAccountId, foundDashboardId);
    }
  }

  const folderId = `clickstream_${commonParams.databaseName}_${commonParams.schema}`;
  await updateFolderMembership(quickSight, commonParams, folderId, dashboard?.DashboardId!);

  return dashboard;
};

const updateFolderMembership = async (quickSight: QuickSight, commonParams: ResourceCommonParams, folderId: string, dashboardId: string)
: Promise<void> => {
  let folderExist = await existFolder(quickSight, commonParams.awsAccountId, folderId);
  if (!folderExist) {
    await quickSight.createFolder({
      AwsAccountId: commonParams.awsAccountId,
      FolderId: folderId,
      Name: `${commonParams.databaseName}_${commonParams.schema}`,
      FolderType: FolderType.SHARED,
      SharingModel: SharingModel.ACCOUNT,
    });
  }

  try {
    await quickSight.createFolderMembership({
      AwsAccountId: commonParams.awsAccountId,
      FolderId: folderId,
      MemberId: dashboardId,
      MemberType: MemberType.DASHBOARD,
    });
  } catch (e) {
    if (e instanceof ResourceExistsException) {
      logger.warn('folder membership already exist. skip create operation.');
    } else {
      throw e;
    }
  }

  //update folder permissions
  await quickSight.updateFolderPermissions({
    AwsAccountId: commonParams.awsAccountId,
    FolderId: folderId,
    GrantPermissions: [
      {
        Principal: commonParams.sharePrincipalArn,
        Actions: FOLDER_CONTRIBUTOR_PERMISSION_ACTIONS,
      },
      {
        Principal: commonParams.ownerPrincipalArn,
        Actions: FOLDER_OWNER_PERMISSION_ACTIONS,
      },
    ],
  });

};

const buildDataSetParameter = function (dateTimeDatasetParameter: DateTimeParameter[] | undefined): DatasetParameter[] | undefined {

  let datasetParameters: DatasetParameter[] | undefined = undefined;
  if (dateTimeDatasetParameter !== undefined) {
    datasetParameters = [];
    for (const param of dateTimeDatasetParameter) {
      datasetParameters.push({
        DateTimeDatasetParameter: {
          Id: uuidv4(),
          Name: param.name,
          ValueType: ParameterValueType.SINGLE_VALUED,
          TimeGranularity: param.timeGranularity,
          DefaultValues: {
            StaticValues: [new Date(param.defaultValue)],
          },
        },
      });
    }
  }

  return datasetParameters;
};

const createDataSet = async (quickSight: QuickSight, commonParams: ResourceCommonParams,
  dataSourceArn: string,
  props: DataSetProps)
: Promise<CreateDataSetCommandOutput|undefined> => {
  try {
    const identifier = buildDataSetId(commonParams.databaseName, commonParams.schema, props.tableName);
    const datasetId = identifier.id;

    const mustacheParam: MustacheParamType = {
      schema: commonParams.schema,
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

    const datasetParameters = buildDataSetParameter(props.dateTimeDatasetParameter);
    logger.info('datasetParameters: ', { datasetParameters });

    logger.info('start to create dataset');
    const datasetParams = {
      AwsAccountId: commonParams.awsAccountId,
      DataSetId: datasetId,
      Name: `${identifier.tableNameIdentifier}-${identifier.schemaIdentifier}-${identifier.databaseIdentifier}`,
      Permissions: [
        {
          Principal: commonParams.ownerPrincipalArn,
          Actions: DATASET_ADMIN_PERMISSION_ACTIONS,
        },
        {
          Principal: commonParams.sharePrincipalArn,
          Actions: DATASET_READER_PERMISSION_ACTIONS,
        },
      ],
      DatasetParameters: datasetParameters,
      ImportMode: props.importMode,
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
    logger.info('dataset params', { datasetParams });
    const dataset = await quickSight.createDataSet(datasetParams);

    await waitForDataSetCreateCompleted(quickSight, commonParams.awsAccountId, datasetId);
    logger.info('create dataset finished', { datasetId });

    return dataset;

  } catch (err: any) {
    logger.error('Create QuickSight dataset failed', err);
    throw err;
  }
};

const createAnalysis = async (quickSight: QuickSight, commonParams: ResourceCommonParams,
  sourceEntity: AnalysisSourceEntity, props: QuickSightDashboardDefProps)
: Promise<CreateAnalysisCommandOutput|undefined> => {

  try {
    const identifier = buildAnalysisId(commonParams.databaseName, commonParams.schema);
    const analysisId = identifier.id;

    logger.info(`start to create analysis: ${analysisId}`);
    const analysis = await quickSight.createAnalysis({
      AwsAccountId: commonParams.awsAccountId,
      AnalysisId: analysisId,
      Name: `${props.analysisName} - ${identifier.schemaIdentifier} - ${identifier.databaseIdentifier}`,
      Permissions: [
        {
          Principal: commonParams.ownerPrincipalArn,
          Actions: ANALYSIS_ADMIN_PERMISSION_ACTIONS,
        },
      ],

      SourceEntity: sourceEntity,
    });
    await waitForAnalysisChangeCompleted(quickSight, commonParams.awsAccountId, analysisId);
    logger.info('Create analysis finished', { Id: analysisId });

    return analysis;

  } catch (err: any) {
    logger.error('Create QuickSight analysis failed due to', err);
    throw err;
  }
};

const createDashboard = async (quickSight: QuickSight, commonParams: ResourceCommonParams,
  sourceEntity: DashboardSourceEntity, props: QuickSightDashboardDefProps)
: Promise<CreateDashboardCommandOutput|undefined> => {
  try {
    const identifier = buildDashBoardId(commonParams.databaseName, commonParams.schema);
    const dashboardId = identifier.id;

    logger.info(`start to create dashboard ${dashboardId}`);
    const dashboard = await quickSight.createDashboard({
      AwsAccountId: commonParams.awsAccountId,
      DashboardId: dashboardId,
      Name: `${props.dashboardName} - ${identifier.schemaIdentifier} - ${identifier.databaseIdentifier} `,
      Permissions: [{
        Principal: commonParams.ownerPrincipalArn,
        Actions: DASHBOARD_ADMIN_PERMISSION_ACTIONS,
      },
      {
        Principal: commonParams.sharePrincipalArn,
        Actions: DASHBOARD_ADMIN_PERMISSION_ACTIONS,
      }],

      SourceEntity: sourceEntity,

    });
    await waitForDashboardChangeCompleted(quickSight, commonParams.awsAccountId, dashboardId);
    logger.info(`Create dashboard finished. Id: ${dashboardId}`);

    return dashboard;

  } catch (err: any) {
    logger.error(`Create QuickSight dashboard failed due to: ${(err as Error).message}`);
    throw err;
  }
};

const deleteDashboardById = async (quickSight: QuickSight, awsAccountId: string, dashboardId: string)
: Promise<DeleteDashboardCommandOutput|undefined> => {

  let deleteResult = undefined;
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

const deleteAnalysisById = async (quickSight: QuickSight, awsAccountId: string, analysisId: string)
: Promise<DeleteAnalysisCommandOutput|undefined> => {

  let result = undefined;
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
: Promise<DeleteDataSetCommandOutput|undefined> => {

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

const updateDataSet = async (quickSight: QuickSight, commonParams: ResourceCommonParams,
  dataSourceArn: string,
  props: DataSetProps,
)
: Promise<UpdateDataSetCommandOutput|undefined> => {

  try {
    const identifier = buildDataSetId(commonParams.databaseName, commonParams.schema, props.tableName);
    const datasetId = identifier.id;

    const mustacheParam: MustacheParamType = {
      schema: commonParams.schema,
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

    const datasetParameters = buildDataSetParameter(props.dateTimeDatasetParameter);
    logger.info('datasetParameters: ', { datasetParameters });

    logger.info('start to update dataset');
    let dataset: UpdateDataSetCommandOutput | undefined = undefined;
    dataset = await quickSight.updateDataSet({
      AwsAccountId: commonParams.awsAccountId,
      DataSetId: datasetId,
      Name: `${identifier.tableNameIdentifier}-${identifier.schemaIdentifier}-${identifier.databaseIdentifier}`,

      ImportMode: props.importMode,
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
      DatasetParameters: datasetParameters,
      LogicalTableMap: needLogicalMap ? logicalMap : undefined,
      ColumnGroups: colGroups.length > 0 ? colGroups : undefined,
      DataSetUsageConfiguration: {
        DisableUseAsDirectQuerySource: false,
        DisableUseAsImportedSource: false,
      },
    });
    logger.info(`update dataset finished. Id: ${dataset?.DataSetId}`);

    await waitForDataSetCreateCompleted(quickSight, commonParams.awsAccountId, datasetId);

    await quickSight.updateDataSetPermissions({
      AwsAccountId: commonParams.awsAccountId,
      DataSetId: datasetId,
      GrantPermissions: [
        {
          Principal: commonParams.ownerPrincipalArn,
          Actions: DATASET_ADMIN_PERMISSION_ACTIONS,
        },
        {
          Principal: commonParams.sharePrincipalArn,
          Actions: DATASET_READER_PERMISSION_ACTIONS,
        },
      ],
    });

    logger.info(`grant dataset permissions to new principal ${commonParams.ownerPrincipalArn}, ${commonParams.sharePrincipalArn}`);

    return dataset;

  } catch (err: any) {
    logger.error(`update QuickSight dataset failed due to: ${(err as Error).message}`);
    throw err;
  }
};

const updateAnalysis = async (quickSight: QuickSight, commonParams: ResourceCommonParams,
  sourceEntity: AnalysisSourceEntity, props: QuickSightDashboardDefProps)
: Promise<CreateAnalysisCommandOutput|undefined> => {

  try {
    const identifier = buildAnalysisId(commonParams.databaseName, commonParams.schema);
    const analysisId = identifier.id;

    logger.info('start to update analysis');
    const analysis = await quickSight.updateAnalysis({
      AwsAccountId: commonParams.awsAccountId,
      AnalysisId: analysisId,
      Name: `${props.analysisName} - ${identifier.schemaIdentifier} - ${identifier.databaseIdentifier}`,
      SourceEntity: sourceEntity,
    });
    logger.info(`update analysis finished. Id: ${analysisId}`);

    await waitForAnalysisChangeCompleted(quickSight, commonParams.awsAccountId, analysisId);
    await quickSight.updateAnalysisPermissions({
      AwsAccountId: commonParams.awsAccountId,
      AnalysisId: analysisId,
      GrantPermissions: [
        {
          Principal: commonParams.ownerPrincipalArn,
          Actions: ANALYSIS_ADMIN_PERMISSION_ACTIONS,
        },
      ],
    });

    logger.info(`grant analysis permissions to new principal ${commonParams.ownerPrincipalArn}`);

    return analysis;

  } catch (err: any) {
    logger.error(`Update QuickSight analysis failed due to: ${(err as Error).message}`);
    throw err;
  }
};

const publishNewVersionDashboard = async(quickSight: QuickSight, dashboardId: string,
  versionNumber: string, awsAccountId: string) => {
  let cnt = 0;
  for (const _i of Array(100).keys()) {
    cnt += 1;
    try {
      const response = await quickSight.updateDashboardPublishedVersion({
        AwsAccountId: awsAccountId,
        DashboardId: dashboardId,
        VersionNumber: Number.parseInt(versionNumber),
      });

      if (response.DashboardId) {
        break;
      }
    } catch (err: any) {
      if (err instanceof ConflictException ) {
        logger.warn('sleep 100ms to wait publish new dashboard version finish');
        await sleep(100);
      } else {
        throw err;
      }
    }
  }
  if (cnt >= 100) {
    throw new Error(`publish dashboard new version failed after try ${cnt} times`);
  }
};

const updateDashboard = async (quickSight: QuickSight, commonParams: ResourceCommonParams,
  sourceEntity: DashboardSourceEntity, props: QuickSightDashboardDefProps)
: Promise<UpdateDashboardCommandOutput|undefined> => {
  try {
    const identifier = buildDashBoardId(commonParams.databaseName, commonParams.schema);
    const dashboardId = identifier.id;

    logger.info('start to update dashboard', { sourceEntity });
    const dashboard = await quickSight.updateDashboard({
      AwsAccountId: commonParams.awsAccountId,
      DashboardId: dashboardId,
      Name: `${props.dashboardName} - ${identifier.schemaIdentifier} - ${identifier.databaseIdentifier}`,

      SourceEntity: sourceEntity,

    });
    logger.info('update dashboard finished.', { id: dashboardId });

    await waitForDashboardChangeCompleted(quickSight, commonParams.awsAccountId, dashboardId);

    const versionNumber = dashboard.VersionArn?.substring(dashboard.VersionArn?.lastIndexOf('/') + 1);
    logger.info(`quicksight versionNumber: ${versionNumber}`);
    await publishNewVersionDashboard(quickSight, dashboardId, versionNumber!, commonParams.awsAccountId);
    logger.info('Publish new dashboard version finished.');

    await quickSight.updateDashboardPermissions({
      AwsAccountId: commonParams.awsAccountId,
      DashboardId: dashboardId,
      GrantPermissions: [
        {
          Principal: commonParams.ownerPrincipalArn,
          Actions: DASHBOARD_ADMIN_PERMISSION_ACTIONS,
        },
        {
          Principal: commonParams.sharePrincipalArn,
          Actions: DASHBOARD_ADMIN_PERMISSION_ACTIONS,
        },
      ],
    });

    logger.info(`grant dashboard permissions to new principal ${commonParams.ownerPrincipalArn} and ${commonParams.sharePrincipalArn}`);

    return dashboard;

  } catch (err: any) {
    logger.error(`update QuickSight dashboard failed due to: ${(err as Error).message}`);
    throw err;
  }
};

const grantDataSourcePermission = async (quickSight: QuickSight, dataSourceArn: string, awsAccountId: string,
  ownerPrincipalArn: string, sharePrincipalArn: string) => {
  const arnSplits = dataSourceArn.split('/');
  const dataSourceId = arnSplits[arnSplits.length - 1];
  await waitForDataSourceChangeCompleted(quickSight, awsAccountId, dataSourceId);
  await quickSight.updateDataSourcePermissions({
    AwsAccountId: awsAccountId,
    DataSourceId: dataSourceId,
    GrantPermissions: [
      {
        Principal: ownerPrincipalArn,
        Actions: [
          'quicksight:UpdateDataSourcePermissions',
          'quicksight:DescribeDataSourcePermissions',
          'quicksight:PassDataSource',
          'quicksight:DescribeDataSource',
          'quicksight:DeleteDataSource',
          'quicksight:UpdateDataSource',
        ],
      },
      {
        Principal: sharePrincipalArn,
        Actions: [
          'quicksight:UpdateDataSourcePermissions',
          'quicksight:DescribeDataSourcePermissions',
          'quicksight:PassDataSource',
          'quicksight:DescribeDataSource',
          'quicksight:DeleteDataSource',
          'quicksight:UpdateDataSource',
        ],
      },
    ],
  });
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
