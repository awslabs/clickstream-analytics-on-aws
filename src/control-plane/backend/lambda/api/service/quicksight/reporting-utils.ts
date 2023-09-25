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
import Mustache from 'mustache';
import { v4 as uuidv4 } from 'uuid';
import { DataSetProps, dataSetActions } from './dashboard-ln';
import { AnalysisType, ExploreLanguage, ExploreRelativeTimeUnit, ExploreRequestAction, ExploreTimeScopeType, ExploreVisualName } from '../../common/explore-types';
import { logger } from '../../common/powertools';

export const TEMP_RESOURCE_NAME_PREFIX = '_tmp_';

export interface VisualProps {
  readonly sheetId: string;
  readonly name: ExploreVisualName;
  readonly visualId: string;
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
  readonly requestAction: ExploreRequestAction;
  readonly visuals: VisualProps[];
  readonly dashboardDef: DashboardVersionDefinition;
}

export interface DashboardCreateParameters {
  readonly region: string;
  readonly allowedDomain: string;
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

export interface VisualMapProps {
  readonly name: ExploreVisualName;
  readonly id: string;
  readonly embedUrl?: string;
}


export interface CreateDashboardResult {
  readonly dashboardId: string;
  readonly dashboardName: string;
  readonly dashboardArn: string;
  readonly dashboardVersion: number;
  readonly dashboardEmbedUrl: string;
  readonly analysisId: string;
  readonly analysisName: string;
  readonly analysisArn: string;
  readonly sheetId: string;
  readonly visualIds: VisualMapProps[];
}

export interface VisualRelatedDefParams {
  readonly filterControl?: FilterControl;
  readonly parameterDeclarations?: ParameterDeclaration[];
  readonly filterGroup?: FilterGroup;
  readonly columnConfigurations?: FilterGroup;
}

export interface VisualRelatedDefParams {
  readonly filterControl?: FilterControl;
  readonly parameterDeclarations?: ParameterDeclaration[];
  readonly filterGroup?: FilterGroup;
  readonly columnConfigurations?: FilterGroup;
}

export interface VisualRelatedDefProps {
  readonly timeScopeType: ExploreTimeScopeType;
  readonly sheetId: string;
  readonly visualId: string;
  readonly viewName: string;
  readonly lastN?: number;
  readonly timeUnit?: ExploreRelativeTimeUnit;
  readonly timeStart?: Date;
  readonly timeEnd?: Date;
}

export interface DashboardTitleProps {
  readonly title: string;
  readonly subTitle: string;
  readonly tableTitle: string;
}

export interface DashboardDefProps {
  def: DashboardVersionDefinition;
  name?: string;
}

export type MustachePathAnalysisType = {
  visualId: string;
  dataSetIdentifier: string;
  sourceFieldId: string;
  targetFieldId: string;
  weightFieldId: string;
  title: string;
  subTitle?: string;
}

export type MustacheFunnelAnalysisType = {
  visualId: string;
  dataSetIdentifier: string;
  dimFieldId: string;
  measureFieldId: string;
  title: string;
  subTitle?: string;
}

export type MustacheEventAnalysisType = {
  visualId: string;
  dataSetIdentifier: string;
  dateDimFieldId: string;
  catDimFieldId: string;
  catMeasureFieldId: string;
  dateGranularity?: string;
  hierarchyId?: string;
  title: string;
  subTitle?: string;
}

export type MustacheRetentionAnalysisType = {
  visualId: string;
  dataSetIdentifier: string;
  dateDimFieldId: string;
  catDimFieldId: string;
  numberMeasureFieldId: string;
  dateGranularity?: string;
  hierarchyId?: string;
  title: string;
  subTitle?: string;
}

export type MustacheFilterGroupType = {
  visualIds: string;
  sheetId: string;
  dataSetIdentifier: string;
  filterGroupId: string;
  filterId: string;
}

export type MustacheRelativeDateFilterGroupType = {
  visualIds: string;
  sheetId: string;
  dataSetIdentifier: string;
  filterGroupId: string;
  filterId: string;
  lastN: number;
  dateGranularity?: string;
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

export const eventVisualColumns: InputColumn[] = [
  {
    Name: 'event_date',
    Type: 'DATETIME',
  },
  {
    Name: 'event_name',
    Type: 'STRING',
  },
  {
    Name: 'count',
    Type: 'STRING',
  },
];

export const pathAnalysisVisualColumns: InputColumn[] = [
  {
    Name: 'source',
    Type: 'STRING',
  },
  {
    Name: 'target',
    Type: 'STRING',
  },
  {
    Name: 'x_id',
    Type: 'STRING',
  },
];

export const retentionAnalysisVisualColumns: InputColumn[] = [
  {
    Name: 'grouping',
    Type: 'STRING',
  },
  {
    Name: 'start_event_date',
    Type: 'DATETIME',
  },
  {
    Name: 'event_date',
    Type: 'DATETIME',
  },
  {
    Name: 'retention',
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
: Promise<DashboardDefProps> => {
  const dashboard = await quickSight.describeDashboardDefinition({
    AwsAccountId: awsAccountId,
    DashboardId: dashboardId,
  });

  return {
    name: dashboard.Name,
    def: dashboard.Definition!
  }
};

export const getAnalysisNameFromId = async (quickSight: QuickSight, awsAccountId: string, analysisId: string)
: Promise<string | undefined> => {
  const analysis = await quickSight.describeAnalysis({
    AwsAccountId: awsAccountId,
    AnalysisId: analysisId,
  });

  return analysis.Analysis?.Name;
};

export function applyChangeToDashboard(dashboardAction: DashboardAction) : DashboardVersionDefinition {
  try {
    if (dashboardAction.action === 'ADD') {
      return addVisuals(dashboardAction.visuals, dashboardAction.dashboardDef, dashboardAction.requestAction);
    }
    return dashboardAction.dashboardDef;
  } catch (err) {
    logger.error(`The dashboard was not changed due to ${(err as Error).message}`);
    return dashboardAction.dashboardDef;
  }
};

function addVisuals(visuals: VisualProps[], dashboardDef: DashboardVersionDefinition, requestAction: string) : DashboardVersionDefinition {

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
      if (!sheet.FilterControls) {
        sheet.FilterControls = [];
      }
      const controls = sheet.FilterControls;
      if (visual.filterControl && requestAction === ExploreRequestAction.PUBLISH) {
        controls.push(visual.filterControl);
      }

      //add parameters
      const parameters = dashboardDef.ParameterDeclarations!;
      if (visual.parameterDeclarations) {
        parameters.push(...visual.parameterDeclarations);
      }

      //add dataset configuration
      _addDatasetConfiguration(dashboardDef, visual, requestAction);

      // visual layout
      _addVisualLayout(sheet, visual, requestAction);
    }
  }

  return dashboardDef;
};

function _addDatasetConfiguration(dashboardDef: DashboardVersionDefinition, visual: VisualProps, requestAction: string) {
  const filterGroups = dashboardDef.FilterGroups!;
  if (visual.filterGroup && requestAction === ExploreRequestAction.PUBLISH) {
    filterGroups.push(visual.filterGroup);
  }

  if (visual.columnConfigurations) {
    if (dashboardDef.ColumnConfigurations) {
      dashboardDef.ColumnConfigurations?.push(...visual.columnConfigurations);
    } else {
      dashboardDef.ColumnConfigurations = visual.columnConfigurations;
    }
  }
}

function _addVisualLayout(sheet: any, visual: VisualProps, requestAction: string) {
  const layout = findKthElement(sheet, 'Layouts', 1) as Array<any>;
  const elements = findElementByPath(layout, 'Configuration.GridLayout.Elements') as Array<any>;

  const layoutControl = JSON.parse(readFileSync(join(__dirname, './templates/layout-control.json'), 'utf8'));
  const visualControl = JSON.parse(readFileSync(join(__dirname, './templates/layout-visual.json'), 'utf8'));

  if (elements.length > 0) {
    const lastElement = elements.at(elements.length - 1);
    layoutControl.RowIndex = lastElement.RowIndex + lastElement.RowSpan;
    visualControl.RowIndex = lastElement.RowIndex + lastElement.RowSpan + layoutControl.RowSpan;
  }

  if (visual.filterControl && requestAction === ExploreRequestAction.PUBLISH) {
    const firstObj = findFirstChild(visual.filterControl);
    layoutControl.ElementId = firstObj.FilterControlId;
    elements.push(layoutControl);
  }

  visualControl.RowSpan = visual.rowSpan ?? 12;
  visualControl.ColumnSpan = visual.colSpan ?? 36;

  if (visual.eventCount) {
    visualControl.RowSpan = visual.rowSpan ?? visual.eventCount * 3;
  }

  visualControl.ElementId = findFirstChild(visual.visual).VisualId;
  elements.push(visualControl);
}

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

export function getFunnelVisualDef(visualId: string, viewName: string, titleProps: DashboardTitleProps) : Visual {

  const visualDef = readFileSync(join(__dirname, './templates/funnel-chart.json'), 'utf8');
  const mustacheFunnelAnalysisType: MustacheFunnelAnalysisType = {
    visualId,
    dataSetIdentifier: viewName,
    dimFieldId: uuidv4(),
    measureFieldId: uuidv4(),
    title: titleProps.title,
    subTitle: titleProps.subTitle,
  };

  return JSON.parse(Mustache.render(visualDef, mustacheFunnelAnalysisType)) as Visual;

}

export function getFunnelTableVisualDef(visualId: string, viewName: string, eventNames: string[], titleProps: DashboardTitleProps, groupColumn: string) : Visual {

  const visualDef = JSON.parse(readFileSync(join(__dirname, './templates/funnel-table-chart.json'), 'utf8')) as Visual;
  visualDef.TableVisual!.VisualId = visualId;

  visualDef.TableVisual!.Title!.FormatText = {
    PlainText: titleProps.tableTitle
  }

  const groupBy = visualDef.TableVisual!.ChartConfiguration!.FieldWells!.TableAggregatedFieldWells?.GroupBy!;
  const sortConfiguration = visualDef.TableVisual!.ChartConfiguration!.SortConfiguration!;
  const fieldOptions = visualDef.TableVisual?.ChartConfiguration?.FieldOptions?.SelectedFieldOptions!;
  const sortFieldId = uuidv4();

  groupBy.push({
    CategoricalDimensionField: {
      FieldId: sortFieldId,
      Column: {
        DataSetIdentifier: viewName,
        ColumnName: groupColumn,
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
          FormatConfiguration: {
            FormatConfiguration: {
              PercentageDisplayFormatConfiguration: {
                Suffix: '%',
                SeparatorConfiguration: {
                  DecimalSeparator: 'DOT',
                  ThousandsSeparator: {
                    Symbol: 'COMMA',
                    Visibility: 'VISIBLE',
                  },
                },
                NegativeValueConfiguration: {
                  DisplayMode: 'NEGATIVE',
                },
              },
            },
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
          FormatConfiguration: {
            FormatConfiguration: {
              PercentageDisplayFormatConfiguration: {
                Suffix: '%',
                SeparatorConfiguration: {
                  DecimalSeparator: 'DOT',
                  ThousandsSeparator: {
                    Symbol: 'COMMA',
                    Visibility: 'VISIBLE',
                  },
                },
                NegativeValueConfiguration: {
                  DisplayMode: 'NEGATIVE',
                },
              },
            },
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

  if (props.timeScopeType === ExploreTimeScopeType.FIXED) {

    filterControl = JSON.parse(readFileSync(join(__dirname, './templates/filter-control-datetime.json'), 'utf8')) as FilterControl;
    filterControl.DateTimePicker!.FilterControlId = filterControlId;
    filterControl.DateTimePicker!.Title = 'event_date between';
    filterControl.DateTimePicker!.SourceFilterId = sourceFilterId;

    const filterGroupDef = readFileSync(join(__dirname, './templates/filter-group.template'), 'utf8');
    const mustacheFilterGroupType: MustacheFilterGroupType = {
      visualIds: `"${props.visualId}"`,
      sheetId: props.sheetId,
      dataSetIdentifier: props.viewName,
      filterGroupId: uuidv4(),
      filterId: sourceFilterId,
    };
    filterGroup = JSON.parse(Mustache.render(filterGroupDef, mustacheFilterGroupType)) as FilterGroup;
    filterGroup.Filters![0].TimeRangeFilter!.RangeMinimumValue!.StaticValue = new Date(props.timeStart!);
    filterGroup.Filters![0].TimeRangeFilter!.RangeMaximumValue!.StaticValue = new Date(props.timeEnd!);

  } else {
    filterControl = JSON.parse(readFileSync(join(__dirname, './templates/filter-control-relative-datetime.json'), 'utf8')) as FilterControl;
    filterControl.RelativeDateTime!.FilterControlId = filterControlId;
    filterControl.RelativeDateTime!.Title = 'event_date';
    filterControl.RelativeDateTime!.SourceFilterId = sourceFilterId;

    const parameterDeclarationStart = JSON.parse(readFileSync(join(__dirname, './templates/datetime-parameter.json'), 'utf8')) as ParameterDeclaration;
    parameterDeclarationStart.DateTimeParameterDeclaration!.Name = `dateStart${parameterSuffix}`;
    parameterDeclarationStart.DateTimeParameterDeclaration!.TimeGranularity = 'DAY';
    parameterDeclarationStart.DateTimeParameterDeclaration!.DefaultValues!.RollingDate!.Expression = `addDateTime(-${props.lastN}, '${props.timeUnit}', truncDate('${props.timeUnit}', now()))`;
    parameterDeclarationStart.DateTimeParameterDeclaration!.DefaultValues!.StaticValues = undefined;
    parameterDeclarations.push(parameterDeclarationStart);

    const parameterDeclarationEnd = JSON.parse(readFileSync(join(__dirname, './templates/datetime-parameter.json'), 'utf8')) as ParameterDeclaration;
    parameterDeclarationEnd.DateTimeParameterDeclaration!.Name = `dateEnd${parameterSuffix}`;
    parameterDeclarationEnd.DateTimeParameterDeclaration!.TimeGranularity = 'DAY';
    parameterDeclarationEnd.DateTimeParameterDeclaration!.DefaultValues!.RollingDate!.Expression = 'addDateTime(1, \'DD\', truncDate(\'DD\', now()))';
    parameterDeclarationEnd.DateTimeParameterDeclaration!.DefaultValues!.StaticValues = undefined;
    parameterDeclarations.push(parameterDeclarationEnd);

    const filterGroupDef = readFileSync(join(__dirname, './templates/filter-group-relative.template'), 'utf8');
    const mustacheRelativeDateFilterGroupType: MustacheRelativeDateFilterGroupType = {
      visualIds: `"${props.visualId}"`,
      sheetId: props.sheetId,
      dataSetIdentifier: props.viewName,
      filterGroupId: uuidv4(),
      filterId: sourceFilterId,
      lastN: props.lastN!,
      dateGranularity: getQuickSightUnitFromTimeUnit(props.timeUnit!),
    };

    filterGroup = JSON.parse(Mustache.render(filterGroupDef, mustacheRelativeDateFilterGroupType)) as FilterGroup;
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
    const config = JSON.parse(readFileSync(join(__dirname, './templates/percentage-column-config.json'), 'utf8')) as ColumnConfiguration;
    config.Column!.ColumnName = col;
    config.Column!.DataSetIdentifier = viewName;
    columnConfigurations.push(config);
  }

  return columnConfigurations;
}

export function getEventLineChartVisualDef(visualId: string, viewName: string, titleProps: DashboardTitleProps, groupColumn: string) : Visual {

  const visualDef = readFileSync(join(__dirname, './templates/event-line-chart.json'), 'utf8');
  const mustacheEventAnalysisType: MustacheEventAnalysisType = {
    visualId,
    dataSetIdentifier: viewName,
    dateDimFieldId: uuidv4(),
    catDimFieldId: uuidv4(),
    catMeasureFieldId: uuidv4(),
    hierarchyId: uuidv4(),
    dateGranularity: groupColumn,
    title: titleProps.title,
    subTitle: titleProps.subTitle,
  };

  return JSON.parse(Mustache.render(visualDef, mustacheEventAnalysisType)) as Visual;
}

export function getEventPivotTableVisualDef(visualId: string, viewName: string, titleProps: DashboardTitleProps, groupColumn: string) : Visual {

  const visualDef = readFileSync(join(__dirname, './templates/event-pivot-table-chart.json'), 'utf8');
  const mustacheEventAnalysisType: MustacheEventAnalysisType = {
    visualId,
    dataSetIdentifier: viewName,
    dateDimFieldId: uuidv4(),
    catDimFieldId: uuidv4(),
    catMeasureFieldId: uuidv4(),
    dateGranularity: groupColumn,
    title: titleProps.tableTitle,
  };

  return JSON.parse(Mustache.render(visualDef, mustacheEventAnalysisType)) as Visual;

}

export function getPathAnalysisChartVisualDef(visualId: string, viewName: string, titleProps: DashboardTitleProps) : Visual {
  const visualDef = readFileSync(join(__dirname, './templates/path-analysis-chart.json'), 'utf8');
  const mustachePathAnalysisType: MustachePathAnalysisType = {
    visualId,
    dataSetIdentifier: viewName,
    sourceFieldId: uuidv4(),
    targetFieldId: uuidv4(),
    weightFieldId: uuidv4(),
    title: titleProps.title,
    subTitle: titleProps.subTitle,
  };

  return JSON.parse(Mustache.render(visualDef, mustachePathAnalysisType)) as Visual;
}

export function getRetentionLineChartVisualDef(visualId: string, viewName: string, titleProps: DashboardTitleProps) : Visual {

  const visualDef = readFileSync(join(__dirname, './templates/retention-line-chart.json'), 'utf8');
  const mustacheRetentionAnalysisType: MustacheRetentionAnalysisType = {
    visualId,
    dataSetIdentifier: viewName,
    catDimFieldId: uuidv4(),
    dateDimFieldId: uuidv4(),
    numberMeasureFieldId: uuidv4(),
    hierarchyId: uuidv4(),
    title: titleProps.title,
    subTitle: titleProps.subTitle,
  };

  return JSON.parse(Mustache.render(visualDef, mustacheRetentionAnalysisType)) as Visual;
}

export function getRetentionPivotTableVisualDef(visualId: string, viewName: string, titleProps: DashboardTitleProps) : Visual {

  const visualDef = readFileSync(join(__dirname, './templates/retention-pivot-table-chart.json'), 'utf8');
  const mustacheRetentionAnalysisType: MustacheRetentionAnalysisType = {
    visualId,
    dataSetIdentifier: viewName,
    catDimFieldId: uuidv4(),
    dateDimFieldId: uuidv4(),
    numberMeasureFieldId: uuidv4(),
    title: titleProps.tableTitle
  };

  return JSON.parse(Mustache.render(visualDef, mustacheRetentionAnalysisType)) as Visual;

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
  if (timeUnit == ExploreRelativeTimeUnit.WK) {
    unit = 'WEEK';
  } else if (timeUnit == ExploreRelativeTimeUnit.MM) {
    unit = 'MONTH';
  }
  return unit;
}

export function getTempResourceName(resourceName: string, action: ExploreRequestAction) : string {
  if (action === ExploreRequestAction.PREVIEW) {
    return TEMP_RESOURCE_NAME_PREFIX + resourceName;
  }

  return resourceName;
}

export function getDashboardTitleProps(analysisType: AnalysisType, query: any) : DashboardTitleProps {
  let title = '';
  let subTitle = ' ';
  let tableTitle = '';

  const language = query.language;
  if(query.action === ExploreRequestAction.PUBLISH) {
      title = query.chartTitle;
      subTitle = query.chartSubTitle;
      if(language === ExploreLanguage.CHINESE) {
        tableTitle = '详细信息';
      } else {
        tableTitle = 'Detail information';
      }
  } else {
    if(language === ExploreLanguage.CHINESE) {
      tableTitle = '详细信息';
      switch (analysisType) {
        case AnalysisType.FUNNEL:
          title = '漏斗分析';
          break;
        case AnalysisType.EVENT:
          title = '事件分析';
          break;
        case AnalysisType.PATH:
          title = '路径分析';
          break;
        case AnalysisType.RETENTION:
          title = '留存分析';
          break;
      }
    } else {
      tableTitle = 'Detail information';
      switch (analysisType) {
        case AnalysisType.FUNNEL:
          title = 'Funnel analysis';
          break;
        case AnalysisType.EVENT:
          title = 'Event analysis';
          break;
        case AnalysisType.PATH:
          title = 'Path analysis';
          break;
        case AnalysisType.RETENTION:
          title = 'Retention analysis';
          break;
      }
    }
  }

  return {
    title,
    subTitle,
    tableTitle
  };
}

