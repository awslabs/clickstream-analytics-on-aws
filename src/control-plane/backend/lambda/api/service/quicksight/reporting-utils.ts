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

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CreateDataSetCommandOutput, QuickSight,
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
  AnalysisDefinition,
} from '@aws-sdk/client-quicksight';
import { v4 as uuidv4 } from 'uuid';
import { DataSetProps, waitForAnalysisCreateCompleted, waitForDashboardCreateCompleted } from './dashbaord-ln';
import { logger } from '../../common/powertools';

export interface VisualPorps {
  readonly name: string;
  readonly sheetId: string;
  readonly visualContent: any;
  readonly dataSetConfiguration: any;
  readonly filterControl: any;
  readonly parameterDeclarations: any[];
  readonly filterGroup: any;
  readonly eventCount: number;
}

export interface DashboardAction {
  readonly action: 'ADD' | 'UPDATE' | 'DELETE';
  readonly visuals: VisualPorps[];
  readonly dashboardDef: string;
}

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

  console.log(`props: ${JSON.stringify(props)}`);
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
    const dashboardId = uuidv4();

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

export const createTemplateFromDefinition = 
async (quickSight: QuickSight, awsAccountId: string, principalArn: string, dashboardDef: TemplateVersionDefinition)
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
      ],
    }],
    Definition: dashboardDef,
  });

  return template.Arn;
};

export const getDatasetConfigsOfAnalysis = async (quickSight: QuickSight, awsAccountId: string, analysisId: string)
: Promise<DataSetIdentifierDeclaration[]|undefined> => {
  const analysisDef = await quickSight.describeAnalysisDefinition({
    AwsAccountId: awsAccountId,
    AnalysisId: analysisId,
  });

  return analysisDef.Definition?.DataSetIdentifierDeclarations;
};

export const createTemplateFromDashboard =
async (quickSight: QuickSight, awsAccountId: string, principalArn: string, _dashboardId: string)
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
      ],
    }],
    SourceEntity: {
      SourceAnalysis: {
        Arn: '',
        DataSetReferences: [],
      },
    },
  });

  return template.Arn;
};

export const getTemplateDefinition = async (quickSight: QuickSight, awsAccountId: string, templateId: string)
: Promise<TemplateVersionDefinition|undefined> => {
  const templateDef = await quickSight.describeTemplateDefinition({
    AwsAccountId: awsAccountId,
    TemplateId: templateId,
  });

  return templateDef.Definition;
};

export const getAnalysisDefinitionFromArn = async (quickSight: QuickSight, awsAccountId: string, analysisId: string)
: Promise<AnalysisDefinition|undefined> => {
  const analysisDef = await quickSight.describeAnalysisDefinition({
    AwsAccountId: awsAccountId,
    AnalysisId: analysisId,
  });

  return analysisDef.Definition;
};

export function applyChangeToDashboard(dashboardAction: DashboardAction) : string {
  try {
    if (dashboardAction.action === 'ADD') {
      return addVisuals(dashboardAction.visuals, dashboardAction.dashboardDef);
    }
    return dashboardAction.dashboardDef;
  } catch (err) {
    logger.error(`The dashboard was not changed due to ${(err as Error).message}`);
    return dashboardAction.dashboardDef;
  }
};

function addVisuals(visuals: VisualPorps[], dashboardDef: string) : string {
  const dashboard = JSON.parse(dashboardDef);

  // add visuals to sheet
  for (const visual of visuals) {
    logger.info('start to add visual');
    const sheet = findElementWithProperyValue(dashboard, 'Sheets', 'SheetId', visual.sheetId);
    if ( sheet !== undefined) {
      //add visual to sheet
      const charts = findElementByPath(sheet, 'Visuals') as Array<any>;
      logger.info(`charts: ${JSON.stringify(charts)}`);
      charts.push(visual.visualContent);

      //add dataset configuration
      const configs = findElementByPath(dashboard, 'DataSetIdentifierDeclarations') as Array<any>;
      configs.push(visual.dataSetConfiguration);

      //add filter
      const controls = findElementByPath(sheet, 'FilterControls') as Array<any>;
      logger.info(`controls: ${JSON.stringify(controls)}`);
      controls.push(visual.filterControl);

      //add parameters
      const parameters = findElementByPath(dashboard, 'ParameterDeclarations') as Array<any>;
      logger.info(`parameters: ${JSON.stringify(parameters)}`);
      parameters.push(visual.parameterDeclarations);

      //add dataset configuration
      const fiterGroups = findElementByPath(dashboard, 'FilterGroups') as Array<any>;
      logger.info(`fiterGroups: ${JSON.stringify(fiterGroups)}`);
      fiterGroups.push(visual.filterGroup);

      // visual layout
      const layout = findKthElement(sheet, 'Layouts', 1) as Array<any>;
      const elements = findElementByPath(layout, 'Configuration.GridLayout.Elements') as Array<any>;
      const layoutControl = JSON.parse(readFileSync(join(__dirname, './templates/layout-control.json')).toString());
      const visualControl = JSON.parse(readFileSync(join(__dirname, './templates/layout-visual.json')).toString());

      if (elements.length > 0) {
        const lastElement = elements.at(elements.length - 1);
        logger.info(`lastElement: ${JSON.stringify(lastElement)}`);
        layoutControl.RowIndex = lastElement.RowIndex + lastElement.RowSpan;
        visualControl.RowIndex = lastElement.RowIndex + lastElement.RowSpan + layoutControl.RowSpan;
      }
      const firstObj = findFirstChild(visual.filterControl);
      layoutControl.ElementId = firstObj.FilterControlId;
      visualControl.RowSpan = visual.eventCount * 2;

      logger.info(`visual.visualContent: ${visual.visualContent}`);
      visualControl.ElementId = findFirstChild(visual.visualContent).VisualId;
      elements.push(layoutControl);
      elements.push(visualControl);

    }
  }

  return dashboard;
};

function findElementByPath(jsonData: any, path: string): any {
  const pathKeys = path.split('.');

  for (const key of pathKeys) {
    if (jsonData && typeof jsonData === 'object' && key in jsonData) {
      jsonData = jsonData[key];
    } else {
      // If the key doesn't exist in the JSON object, return undefined
      return undefined;
    }
  }

  return jsonData;
}

function findKthElement(jsonData: any, path: string, index: number): any {
  const pathKeys = path.split('.');

  for (const key of pathKeys) {
    if (jsonData && typeof jsonData === 'object' && key in jsonData) {
      jsonData = jsonData[key];
    } else {
      // If the key doesn't exist in the JSON object, return undefined
      return undefined;
    }
  }

  if (Array.isArray(jsonData) && jsonData.length >= index) {
    return jsonData[index-1]; // Return the kth element of the array
  } else {
    return undefined; // If the path doesn't lead to an array or the array is too short, return undefined
  }
}

function findFirstChild(jsonData: any): any {
  if (Array.isArray(jsonData)) {
    return undefined; // Return the kth element of the array
  } else if (jsonData && typeof jsonData === 'object') {
    for (const key in jsonData) {
      if (jsonData.hasOwnProperty(key)) {
        return jsonData[key];
      }
    }
  }
  logger.info('other');
  return undefined;
}

function findElementWithProperyValue(root: any, path: string, property: string, value: string): any {
  const jsonData = findElementByPath(root, path);
  if (Array.isArray(jsonData)) {
    for ( const e of jsonData) {
      if (e && typeof e === 'object' && property in e) {
        const v = e[property];
        if ((v as string) === value ) {
          return e;
        }
      }
    }
    return undefined;
  } else {
    return undefined;
  }
}