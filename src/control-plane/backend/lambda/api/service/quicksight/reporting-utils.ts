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
  FilterControl, FilterGroup, ParameterDeclaration, Visual, DashboardVersionDefinition, DataSetIdentifierDeclaration, ColumnConfiguration,
} from '@aws-sdk/client-quicksight';
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import { v4 as uuidv4 } from 'uuid';
import { DataSetProps, dataSetActions } from './dashboard-ln';
import { logger } from '../../common/powertools';

export interface VisualProps {
  readonly sheetId: string;
  readonly visual: Visual;
  readonly dataSetIdentifierDeclaration: DataSetIdentifierDeclaration[];
  readonly filterControl?: FilterControl;
  readonly parameterDeclarations?: ParameterDeclaration[];
  readonly filterGroup?: FilterGroup;
  readonly eventCount?: number;
  readonly columnConfigurations?: ColumnConfiguration[];
  readonly colSpan?: number;
  readonly rowSpan?: number;
}

export interface DashboardAction {
  readonly action: 'ADD' | 'UPDATE' | 'DELETE';
  readonly visuals: VisualProps[];
  readonly dashboardDef: DashboardVersionDefinition;
}

export interface DashboardCreateParameters {
  readonly region: string;
  readonly redshift: {
    readonly user: string;
    readonly dataApiRole: string;
    readonly newServerless?: {
      readonly workgroupName: string;
    };
    readonly provisioned?: {
      readonly clusterIdentifier: string;
      readonly dbUser: string;
    };
  };
  readonly quickSight: {
    readonly dataSourceArn: string;
  };
}

export interface DashboardCreateInputParameters {
  readonly action: 'PREVIEW' | 'PUBLISH';
  readonly accountId: string;
  readonly projectId: string;
  readonly appId: string;
  readonly pipelineId: string;
}

export interface VisualMapProps {
  readonly name: 'CHART' | 'TABLE' ;
  readonly id: string;
}

export interface CreateDashboardResult {
  readonly dashboardId: string;
  readonly dashboardName: string;
  readonly dashboardArn: string;
  readonly dashboardVersion: number;
  readonly analysisId: string;
  readonly analysisName: string;
  readonly analysisArn: string;
  readonly visualIds: VisualMapProps[];
}

export interface VisualRelatedDefParams {
  readonly filterControl?: FilterControl;
  readonly parameterDeclarations?: ParameterDeclaration[];
  readonly filterGroup?: FilterGroup;
  readonly columnConfigurations?: FilterGroup;
}

export interface VisualRelatedDefProps {
  readonly timeScopeType: 'FIXED' | 'RELATIVE';
  readonly sheetId: string;
  readonly visualId: string;
  readonly viewName: string;
  readonly lastN?: number;
  readonly timeUnit?: 'DD' | 'WK' | 'MM' | 'Q';
  readonly timeStart?: Date;
  readonly timeEnd?: Date;
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

export const pathAnalysisVisualColumns: InputColumn[] = [
  {
    Name: 'event_date',
    Type: 'DATETIME',
  },
  {
    Name: 'source',
    Type: 'STRING',
  },
  {
    Name: 'target',
    Type: 'STRING',
  },
  {
    Name: 'weight',
    Type: 'DECIMAL',
  },
];

export const createDataSet = async (quickSight: QuickSight, awsAccountId: string, principalArn: string,
  dataSourceArn: string,
  props: DataSetProps)
: Promise<CreateDataSetCommandOutput|undefined> => {

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
    const dataset = await quickSight.createDataSet({
      AwsAccountId: awsAccountId,
      DataSetId: datasetId,
      Name: `${props.name}dataset-${datasetId}`,
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

export const getDashboardDefinitionFromArn = async (quickSight: QuickSight, awsAccountId: string, dashboardId: string)
: Promise<DashboardVersionDefinition|undefined> => {
  const dashboard = await quickSight.describeDashboardDefinition({
    AwsAccountId: awsAccountId,
    DashboardId: dashboardId,
  });

  return dashboard.Definition;
};

export function applyChangeToDashboard(dashboardAction: DashboardAction) : DashboardVersionDefinition {
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

function addVisuals(visuals: VisualProps[], dashboardDef: DashboardVersionDefinition) : DashboardVersionDefinition {

  // add visuals to sheet
  for (const visual of visuals) {
    logger.info('start to add visual');

    const sheet = findElementWithPropertyValue(dashboardDef, 'Sheets', 'SheetId', visual.sheetId);
    if ( sheet !== undefined) {
      //add visual to sheet
      const charts = sheet.Visuals!;
      charts.push(visual.visual);

      //add dataset configuration
      const configs = dashboardDef.DataSetIdentifierDeclarations!;
      if (visual.dataSetIdentifierDeclaration) {
        configs.push(...visual.dataSetIdentifierDeclaration);
      }

      //add filter
      const controls = sheet.FilterControls!;
      if (visual.filterControl) {
        controls.push(visual.filterControl);
      }

      //add parameters
      const parameters = dashboardDef.ParameterDeclarations!;
      if (visual.parameterDeclarations) {
        parameters.push(...visual.parameterDeclarations);
      }

      //add dataset configuration
      const filterGroups = dashboardDef.FilterGroups!;
      if (visual.filterGroup) {
        filterGroups.push(visual.filterGroup);
      }

      if (visual.columnConfigurations) {
        if (dashboardDef.ColumnConfigurations) {
          dashboardDef.ColumnConfigurations?.push(...visual.columnConfigurations);
        } else {
          dashboardDef.ColumnConfigurations = visual.columnConfigurations;
        }
      }

      // visual layout
      const layout = findKthElement(sheet, 'Layouts', 1) as Array<any>;
      const elements = findElementByPath(layout, 'Configuration.GridLayout.Elements') as Array<any>;

      const layoutControl = JSON.parse(readFileSync(join(__dirname, './templates/layout-control.json')).toString());
      const visualControl = JSON.parse(readFileSync(join(__dirname, './templates/layout-visual.json')).toString());

      if (elements.length > 0) {
        const lastElement = elements.at(elements.length - 1);
        layoutControl.RowIndex = lastElement.RowIndex + lastElement.RowSpan;
        visualControl.RowIndex = lastElement.RowIndex + lastElement.RowSpan + layoutControl.RowSpan;
      }

      if (visual.filterControl) {
        const firstObj = findFirstChild(visual.filterControl);
        layoutControl.ElementId = firstObj.FilterControlId;
        elements.push(layoutControl);
      }

      if (visual.eventCount) {
        visualControl.RowSpan = visual.rowSpan ?? visual.eventCount * 2;
        visualControl.ColumnSpan = visual.colSpan ?? 20;
      }
      visualControl.ElementId = findFirstChild(visual.visual).VisualId;
      elements.push(visualControl);

    }
  }

  return dashboardDef;
};

export async function getCredentialsFromRole(stsClient: STSClient, roleArn: string) {
  try {
    const assumeRoleCommand = new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: 'redshift-data-api-role',
    });

    const response = await stsClient.send(assumeRoleCommand);
    const credentials = response.Credentials;

    return credentials;
  } catch (error) {
    console.error('Error occurred while assuming role:', error);
    throw error;
  }
}

export function getFunnelVisualDef(visualId: string, viewName: string) : Visual {

  const visualDef = JSON.parse(readFileSync(join(__dirname, './templates/funnel-chart.json')).toString()) as Visual;
  const eventNameFiledId = uuidv4();
  const idFiledId = uuidv4();
  visualDef.FunnelChartVisual!.VisualId = visualId;

  const fieldWells = visualDef.FunnelChartVisual!.ChartConfiguration!.FieldWells!;
  const sortConfiguration = visualDef.FunnelChartVisual!.ChartConfiguration!.SortConfiguration!;
  const tooltipFields = visualDef.FunnelChartVisual?.ChartConfiguration?.Tooltip!.FieldBasedTooltip!.TooltipFields!;

  fieldWells.FunnelChartAggregatedFieldWells!.Category![0].CategoricalDimensionField!.FieldId = eventNameFiledId;
  fieldWells.FunnelChartAggregatedFieldWells!.Values![0].CategoricalMeasureField!.FieldId = idFiledId;
  fieldWells.FunnelChartAggregatedFieldWells!.Category![0].CategoricalDimensionField!.Column!.DataSetIdentifier = viewName;
  fieldWells.FunnelChartAggregatedFieldWells!.Values![0].CategoricalMeasureField!.Column!.DataSetIdentifier = viewName;
  sortConfiguration.CategorySort![0].FieldSort!.FieldId = idFiledId;
  sortConfiguration.CategorySort![1].FieldSort!.FieldId = eventNameFiledId;

  tooltipFields[0].FieldTooltipItem!.FieldId = idFiledId;
  tooltipFields[1].FieldTooltipItem!.FieldId = eventNameFiledId;

  return visualDef;
}

export function getFunnelTableVisualDef(visualId: string, viewName: string, eventNames: string[], dateField: string) : Visual {

  const visualDef = JSON.parse(readFileSync(join(__dirname, './templates/funnel-table-chart.json')).toString()) as Visual;
  visualDef.TableVisual!.VisualId = visualId;

  const groupBy = visualDef.TableVisual!.ChartConfiguration!.FieldWells!.TableAggregatedFieldWells?.GroupBy!;
  const sortConfiguration = visualDef.TableVisual!.ChartConfiguration!.SortConfiguration!;
  const fieldOptions = visualDef.TableVisual?.ChartConfiguration?.FieldOptions?.SelectedFieldOptions!;
  const sortFieldId = uuidv4();

  groupBy.push({
    CategoricalDimensionField: {
      FieldId: sortFieldId,
      Column: {
        DataSetIdentifier: viewName,
        ColumnName: dateField,
      },
    },
  });
  fieldOptions.push({
    FieldId: sortFieldId,
    Width: '120px',
  });

  for (const [index, eventName] of eventNames.entries()) {

    const fieldId = uuidv4();
    groupBy.push({
      NumericalDimensionField: {
        FieldId: fieldId,
        Column: {
          DataSetIdentifier: viewName,
          ColumnName: eventName,
        },
      },
    });

    fieldOptions.push({
      FieldId: fieldId,
      Width: '120px',
    });

    const fieldIdRate = uuidv4();
    if (index === 0) {
      groupBy.push({
        NumericalDimensionField: {
          FieldId: fieldIdRate,
          Column: {
            DataSetIdentifier: viewName,
            ColumnName: 'rate',
          },
        },
      });
    } else {
      groupBy.push({
        NumericalDimensionField: {
          FieldId: fieldIdRate,
          Column: {
            DataSetIdentifier: viewName,
            ColumnName: `${eventName}_rate`,
          },
        },
      });
    }

    fieldOptions.push({
      FieldId: fieldIdRate,
      Width: '120px',
    });
  }

  sortConfiguration.RowSort = [
    {
      FieldSort: {
        FieldId: sortFieldId,
        Direction: 'DESC',
      },
    },
  ];

  return visualDef;
}

export function getVisualRelatedDefs(props: VisualRelatedDefProps) : VisualRelatedDefParams {

  const filterControlId = uuidv4();
  const sourceFilterId = uuidv4();
  const parameterSuffix = uuidv4().replace(/-/g, '');

  let filterControl: FilterControl;
  const parameterDeclarations = [];
  let filterGroup: FilterGroup;

  if (props.timeScopeType === 'FIXED') {
    filterControl = JSON.parse(readFileSync(join(__dirname, './templates/filter-control-datetime.json')).toString()) as FilterControl;
    filterControl.DateTimePicker!.FilterControlId = filterControlId;
    filterControl.DateTimePicker!.Title = 'event_date between';
    filterControl.DateTimePicker!.SourceFilterId = sourceFilterId;

    filterGroup = JSON.parse(readFileSync(join(__dirname, './templates/filter-group.json')).toString()) as FilterGroup;
    filterGroup.FilterGroupId = uuidv4();
    filterGroup.Filters![0].TimeRangeFilter!.FilterId = sourceFilterId;
    filterGroup.Filters![0].TimeRangeFilter!.Column!.ColumnName = 'event_date';
    filterGroup.Filters![0].TimeRangeFilter!.Column!.DataSetIdentifier = props.viewName;
    filterGroup.Filters![0].TimeRangeFilter!.RangeMinimumValue!.StaticValue = new Date(props.timeStart!);
    filterGroup.Filters![0].TimeRangeFilter!.RangeMaximumValue!.StaticValue = new Date(props.timeEnd!);
    filterGroup.ScopeConfiguration!.SelectedSheets!.SheetVisualScopingConfigurations![0].SheetId = props.sheetId;
    filterGroup.ScopeConfiguration!.SelectedSheets!.SheetVisualScopingConfigurations![0].VisualIds = [props.visualId];

  } else {
    filterControl = JSON.parse(readFileSync(join(__dirname, './templates/filter-control-relative-datetime.json')).toString()) as FilterControl;
    filterControl.RelativeDateTime!.FilterControlId = filterControlId;
    filterControl.RelativeDateTime!.Title = 'event_date';
    filterControl.RelativeDateTime!.SourceFilterId = sourceFilterId;

    const parameterDeclarationStart = JSON.parse(readFileSync(join(__dirname, './templates/datetime-parameter.json')).toString()) as ParameterDeclaration;
    parameterDeclarationStart.DateTimeParameterDeclaration!.Name = `dateStart${parameterSuffix}`;
    parameterDeclarationStart.DateTimeParameterDeclaration!.TimeGranularity = 'DAY';
    parameterDeclarationStart.DateTimeParameterDeclaration!.DefaultValues!.RollingDate!.Expression = `addDateTime(-${props.lastN}, '${props.timeUnit}', truncDate('${props.timeUnit}', now()))`;
    parameterDeclarationStart.DateTimeParameterDeclaration!.DefaultValues!.StaticValues = undefined;
    parameterDeclarations.push(parameterDeclarationStart);

    const parameterDeclarationEnd = JSON.parse(readFileSync(join(__dirname, './templates/datetime-parameter.json')).toString()) as ParameterDeclaration;
    parameterDeclarationEnd.DateTimeParameterDeclaration!.Name = `dateEnd${parameterSuffix}`;
    parameterDeclarationEnd.DateTimeParameterDeclaration!.TimeGranularity = 'DAY';
    parameterDeclarationEnd.DateTimeParameterDeclaration!.DefaultValues!.RollingDate!.Expression = 'addDateTime(1, \'DD\', truncDate(\'DD\', now()))';
    parameterDeclarationEnd.DateTimeParameterDeclaration!.DefaultValues!.StaticValues = undefined;
    parameterDeclarations.push(parameterDeclarationEnd);

    filterGroup = JSON.parse(readFileSync(join(__dirname, './templates/filter-group-relative.json')).toString()) as FilterGroup;

    filterGroup.FilterGroupId = uuidv4();
    filterGroup.Filters![0].RelativeDatesFilter!.FilterId = sourceFilterId;
    filterGroup.Filters![0].RelativeDatesFilter!.Column!.ColumnName = 'event_date';
    filterGroup.Filters![0].RelativeDatesFilter!.Column!.DataSetIdentifier = props.viewName;

    filterGroup.Filters![0].RelativeDatesFilter!.RelativeDateValue = props.lastN;
    filterGroup.Filters![0].RelativeDatesFilter!.TimeGranularity = getQuickSightUnitFromTimeUnit(props.timeUnit!);

    filterGroup.ScopeConfiguration!.SelectedSheets!.SheetVisualScopingConfigurations![0].SheetId = props.sheetId;
    filterGroup.ScopeConfiguration!.SelectedSheets!.SheetVisualScopingConfigurations![0].VisualIds = [props.visualId];

  }

  return {
    parameterDeclarations,
    filterControl,
    filterGroup,
  };
}

export function getFunnelTableVisualRelatedDefs(viewName: string, colNames: string[]) : ColumnConfiguration[] {

  const columnConfigurations: ColumnConfiguration[] = [];
  for (const col of colNames) {
    const config = JSON.parse(readFileSync(join(__dirname, './templates/percentage-column-config.json')).toString()) as ColumnConfiguration;
    config.Column!.ColumnName = col;
    config.Column!.DataSetIdentifier = viewName;
    columnConfigurations.push(config);
  }

  return columnConfigurations;
}

export function getEventLineChartVisualDef(visualId: string, viewName: string, timeUnit: string) : Visual {

  const visualDef = JSON.parse(readFileSync(join(__dirname, './templates/event-line-chart.json')).toString()) as Visual;
  const filedId1 = uuidv4();
  const filedId2 = uuidv4();
  const filedId3 = uuidv4();
  const hierarchyId = uuidv4();
  visualDef.LineChartVisual!.VisualId = visualId;

  const fieldWell = visualDef.LineChartVisual!.ChartConfiguration!.FieldWells!.LineChartAggregatedFieldWells!;
  const sortConfiguration = visualDef.LineChartVisual!.ChartConfiguration!.SortConfiguration!;
  const tooltipFields = visualDef.LineChartVisual?.ChartConfiguration?.Tooltip!.FieldBasedTooltip!.TooltipFields!;

  fieldWell.Category![0].DateDimensionField!.FieldId = filedId1;
  fieldWell.Category![0].DateDimensionField!.Column!.DataSetIdentifier = viewName;
  fieldWell.Category![0].DateDimensionField!.HierarchyId = hierarchyId;
  fieldWell.Category![0].DateDimensionField!.DateGranularity = getQuickSightUnitFromTimeUnit(timeUnit);

  fieldWell.Values![0].CategoricalMeasureField!.FieldId = filedId2;
  fieldWell.Values![0].CategoricalMeasureField!.Column!.DataSetIdentifier = viewName;
  fieldWell.Values![0].CategoricalMeasureField!.AggregationFunction = 'DISTINCT_COUNT';

  fieldWell.Colors![0].CategoricalDimensionField!.FieldId = filedId3;
  fieldWell.Colors![0].CategoricalDimensionField!.Column!.DataSetIdentifier = viewName;

  sortConfiguration.CategorySort![0].FieldSort!.FieldId = filedId1;

  tooltipFields[0].FieldTooltipItem!.FieldId = filedId1;
  tooltipFields[1].FieldTooltipItem!.FieldId = filedId2;
  tooltipFields[2].FieldTooltipItem!.FieldId = filedId3;

  visualDef.LineChartVisual!.ColumnHierarchies![0].DateTimeHierarchy!.HierarchyId = hierarchyId;

  return visualDef;
}

export function getPathAnalysisChartVisualDef(visualId: string, viewName: string) : Visual {

  const visualDef = JSON.parse(readFileSync(join(__dirname, './templates/path-analysis-chart.json')).toString()) as Visual;
  const filedId1 = uuidv4();
  const filedId2 = uuidv4();
  const filedId3 = uuidv4();
  visualDef.SankeyDiagramVisual!.VisualId = visualId;

  const fieldWell = visualDef.SankeyDiagramVisual!.ChartConfiguration!.FieldWells!.SankeyDiagramAggregatedFieldWells!;
  const sortConfiguration = visualDef.SankeyDiagramVisual!.ChartConfiguration!.SortConfiguration!;

  fieldWell.Source![0].CategoricalDimensionField!.FieldId = filedId1;
  fieldWell.Source![0].CategoricalDimensionField!.Column!.DataSetIdentifier = viewName;

  fieldWell.Destination![0].CategoricalDimensionField!.FieldId = filedId2;
  fieldWell.Destination![0].CategoricalDimensionField!.Column!.DataSetIdentifier = viewName;

  fieldWell.Weight![0].NumericalMeasureField!.FieldId = filedId3;
  fieldWell.Weight![0].NumericalMeasureField!.Column!.DataSetIdentifier = viewName;

  sortConfiguration.WeightSort![0].FieldSort!.FieldId = filedId3;

  return visualDef;
}

export function getEventPivotTableVisualDef(visualId: string, viewName: string, timeUnit: string) : Visual {

  const visualDef = JSON.parse(readFileSync(join(__dirname, './templates/event-pivot-table-chart.json')).toString()) as Visual;
  const filedId1 = uuidv4();
  const filedId2 = uuidv4();
  const filedId3 = uuidv4();
  visualDef.PivotTableVisual!.VisualId = visualId;

  const fieldWell = visualDef.PivotTableVisual!.ChartConfiguration!.FieldWells!.PivotTableAggregatedFieldWells!;
  const sortConfiguration = visualDef.PivotTableVisual!.ChartConfiguration!.SortConfiguration!;
  const fieldOptions = visualDef.PivotTableVisual?.ChartConfiguration?.FieldOptions!.SelectedFieldOptions!;

  fieldWell.Rows![0].CategoricalDimensionField!.FieldId = filedId1;
  fieldWell.Rows![0].CategoricalDimensionField!.Column!.DataSetIdentifier = viewName;

  fieldWell.Columns![0].DateDimensionField!.FieldId = filedId2;
  fieldWell.Columns![0].DateDimensionField!.Column!.DataSetIdentifier = viewName;
  fieldWell.Columns![0].DateDimensionField!.DateGranularity = getQuickSightUnitFromTimeUnit(timeUnit);

  fieldWell.Values![0].CategoricalMeasureField!.FieldId = filedId3;
  fieldWell.Values![0].CategoricalMeasureField!.Column!.DataSetIdentifier = viewName;
  fieldWell.Values![0].CategoricalMeasureField!.AggregationFunction = 'DISTINCT_COUNT';

  sortConfiguration.FieldSortOptions![0].FieldId = filedId2;
  sortConfiguration.FieldSortOptions![0].SortBy!.Field!.FieldId = filedId2;
  sortConfiguration.FieldSortOptions![0].SortBy!.Field!.Direction = 'ASC';

  fieldOptions[0].FieldId = filedId1;
  fieldOptions[1].FieldId = filedId2;
  fieldOptions[2].FieldId = filedId3;

  return visualDef;

}

function findElementByPath(jsonData: any, path: string): any {
  const pathKeys = path.split('.');

  for (const key of pathKeys) {
    if (jsonData && typeof jsonData === 'object' && key in jsonData) {
      jsonData = jsonData[key];
    } else {
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
      return undefined;
    }
  }

  if (Array.isArray(jsonData) && jsonData.length >= index) {
    return jsonData[index-1];
  } else {
    return undefined;
  }
}

function findFirstChild(jsonData: any): any {
  if (Array.isArray(jsonData)) {
    return undefined;
  } else if (jsonData && typeof jsonData === 'object') {
    for (const key in jsonData) {
      if (jsonData.hasOwnProperty(key)) {
        return jsonData[key];
      }
    }
  }
  return undefined;
}

function findElementWithPropertyValue(root: any, path: string, property: string, value: string): any {
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

export function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(() => resolve(), ms));
};

export function getQuickSightUnitFromTimeUnit(timeUnit: string) : string {

  let unit = 'DAY';
  if (timeUnit == 'WK') {
    unit = 'WEEK';
  } else if (timeUnit == 'MM') {
    unit = 'MONTH';
  } else if (timeUnit == 'Q') {
    unit = 'QUARTER';
  }
  return unit;
}

