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

import { v4 as uuidv4 } from 'uuid';
import { DataSetProps, waitForAnalysisCreateCompleted, waitForDashboardCreateCompleted } from './dashbaord-ln';
import { CreateDataSetCommandOutput, QuickSight,
  ColumnGroup,
  TransformOperation,
  ColumnTag, 
  InputColumn,
  AnalysisSourceEntity,
  CreateAnalysisCommandOutput,
  CreateDashboardCommandOutput,
  TemplateVersionDefinition,
  DataSetIdentifierDeclaration,
  DashboardVersionDefinition,
} from '@aws-sdk/client-quicksight'
import { logger } from '../powertools';

export const funnelVisualColumns: InputColumn[] = [
  {
    Name: 'event_date',
    Type: 'DATETIME',
  },
  {
    Name: 'event_name',
    Type: 'STRING',
  },
  {
    Name: 'x_id',
    Type: 'STRING',
  },
];

export const createDataSet = async (quickSight: QuickSight, awsAccountId: string, principalArn: string,
  dataSourceArn: string,
  props: DataSetProps)
: Promise<CreateDataSetCommandOutput|undefined> => {

  console.log(`props: ${JSON.stringify(props)}`)
  try {
    const datasetId = uuidv4();
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
    const dataset = await quickSight.createDataSet({
      AwsAccountId: awsAccountId,
      DataSetId: datasetId,
      Name: `${props.name}dataset-${datasetId}`,
      Permissions: [{
        Principal: principalArn,
        Actions: [
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
        ],
      }],

      ImportMode: props.importMode,
      PhysicalTableMap: {
        PhyTable1: {
          CustomSql: {
            DataSourceArn: dataSourceArn,
            Name: props.tableName,
            SqlQuery: props.customSql,
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

    logger.info(`create dataset finished. Id: ${datasetId}`);

    return dataset;

  } catch (err: any) {
    logger.error(`Create QuickSight dataset failed due to: ${(err as Error).message}`);
    throw err;
  }
};

export const createAnalysis = async (quickSight: QuickSight, awsAccountId: string, principalArn: string,
  sourceEntity: AnalysisSourceEntity, analysisName: string)
: Promise<CreateAnalysisCommandOutput|undefined> => {

  try {
    const analysisId = uuidv4();

    logger.info('start to create analysis');
    const analysis = await quickSight.createAnalysis({
      AwsAccountId: awsAccountId,
      AnalysisId: analysisId,
      Name: analysisName,
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

export const createDashboard = async (quickSight: QuickSight, awsAccountId: string, principalArn: string,
  definition: DashboardVersionDefinition, dashboardName: string)
: Promise<CreateDashboardCommandOutput|undefined> => {
  try {
    const dashboardId = uuidv4()

    logger.info('start to create dashboard');
    const dashboard = await quickSight.createDashboard({
      AwsAccountId: awsAccountId,
      DashboardId: dashboardId,
      Name: dashboardName,
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

      Definition: definition,

    });
    await waitForDashboardCreateCompleted(quickSight, awsAccountId, dashboardId);
    logger.info(`Create dashboard finished. Id: ${dashboardId}`);

    return dashboard;

  } catch (err: any) {
    logger.error(`Create QuickSight dashboard failed due to: ${(err as Error).message}`);
    throw err;
  }
};

export  const createTemplateFromDefinition = async (quickSight: QuickSight, awsAccountId: string,  principalArn: string, dashboardDef: TemplateVersionDefinition)
: Promise<string|undefined> => {

  const templateId = uuidv4();
  const template = await quickSight.createTemplate({
    AwsAccountId: awsAccountId,
    TemplateId: templateId,
    Permissions: [{
      Principal: principalArn,
      Actions: [
        'quicksight:CreateTemplate',
        'quicksight:DescribeTemplate',
        'quicksight:UpdateTemplate',
        'quicksight:DeleteTemplate',
        'quicksight:PassTemplate',
        'quicksight:UpdateTemplatePermissions',
        'quicksight:DescribeTemplatePermissions',
      ]
    }],
    Definition: dashboardDef
  })

  return template.Arn
}

export  const getDatasetConfigsOfAnalysis = async (quickSight: QuickSight, awsAccountId: string, analysisId: string)
: Promise<DataSetIdentifierDeclaration[]|undefined> => {
  const analysisDef = await quickSight.describeAnalysisDefinition({
    AwsAccountId: awsAccountId,
    AnalysisId: analysisId,
  })

  return analysisDef.Definition?.DataSetIdentifierDeclarations
}

export  const createTemplateFromDashboard = async (quickSight: QuickSight, awsAccountId: string,  principalArn: string, _dashboardId: string)
: Promise<string|undefined> => {

  const templateId = uuidv4();
  const template = await quickSight.createTemplate({
    AwsAccountId: awsAccountId,
    TemplateId: templateId,
    Permissions: [{
      Principal: principalArn,
      Actions: [
        'quicksight:CreateTemplate',
        'quicksight:DescribeTemplate',
        'quicksight:UpdateTemplate',
        'quicksight:DeleteTemplate',
        'quicksight:PassTemplate',
        'quicksight:UpdateTemplatePermissions',
        'quicksight:DescribeTemplatePermissions',
      ]
    }],
    SourceEntity: {
      SourceAnalysis: {
        Arn: '',
        DataSetReferences:[]
      }
    }
  })

  return template.Arn
}

export  const getTemplateDefinition = async (quickSight: QuickSight, awsAccountId: string,  templateId: string,)
: Promise<TemplateVersionDefinition|undefined> => {
  const templateDef = await quickSight.describeTemplateDefinition({
    AwsAccountId: awsAccountId,
    TemplateId: templateId,
  })

  return templateDef.Definition
}
