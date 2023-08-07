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
  FilterControl, FilterGroup, ParameterDeclaration, Visual, DashboardVersionDefinition, DataSetIdentifierDeclaration
} from '@aws-sdk/client-quicksight';
import { v4 as uuidv4 } from 'uuid';
import { DataSetProps } from './dashbaord-ln';
import { logger } from '../../common/powertools';
import { RedshiftDataClient } from '@aws-sdk/client-redshift-data';
import { ClickStreamStore } from '../../store/click-stream-store';
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import { getQuickSightSubscribeRegion } from '../../store/aws/quicksight';
import { PipelineStackType } from '../../common/types';
import { CPipeline } from '../../model/pipeline';

export interface VisualPorps {
  readonly name: string;
  readonly sheetId: string;
  readonly visual: Visual;
  readonly dataSetIdentifierDeclaration: DataSetIdentifierDeclaration;
  readonly filterControl: FilterControl;
  readonly parameterDeclarations: ParameterDeclaration[];
  readonly filterGroup: FilterGroup;
  readonly eventCount: number;
}

export interface DashboardAction {
  readonly action: 'ADD' | 'UPDATE' | 'DELETE';
  readonly visuals: VisualPorps[];
  readonly dashboardDef: DashboardVersionDefinition;
}

export interface Status {
  readonly code: number;
  readonly message?: string;
}

export interface DashboardCreateParameters {
  readonly status: Status;
  readonly redshiftRegion?: string;
  readonly redshiftDataClient?: RedshiftDataClient;
  readonly workgroupName?: string;
  readonly clusterIdentifier?: string;
  readonly dbUser?: string;
  readonly isProvisionedRedshift?: boolean;
  readonly quickSightPricipal?: string;
  readonly dataApiRole?: string;
  readonly datasourceArn?: string;
}

export interface DashboardCreateInputParameters {
  readonly action: 'PREVIEW' | 'PUBLISH';
  readonly accountId: string;
  readonly projectId: string;
  readonly appId: string;
  readonly pipelineId: string;
  readonly stsClient: STSClient;
  readonly store: ClickStreamStore;
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

export const getDashboardDefinitionFromArn = async (quickSight: QuickSight, awsAccountId: string, dashboardId: string)
: Promise<DashboardVersionDefinition|undefined> => {
  const dashboard = await quickSight.describeDashboardDefinition({
    AwsAccountId: awsAccountId,
    DashboardId: dashboardId,
  });

  return dashboard.Definition
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

function addVisuals(visuals: VisualPorps[], dashboardDef: DashboardVersionDefinition) : DashboardVersionDefinition {

  // add visuals to sheet
  for (const visual of visuals) {
    logger.info('start to add visual');

    const sheet = findElementWithProperyValue(dashboardDef, 'Sheets', 'SheetId', visual.sheetId);
    if ( sheet !== undefined) {
      //add visual to sheet
      const charts = sheet.Visuals!;
      charts.push(visual.visual);

      //add dataset configuration
      const configs = dashboardDef.DataSetIdentifierDeclarations!;
      configs.push(visual.dataSetIdentifierDeclaration);

      //add filter
      const controls = sheet.FilterControls!;
      controls.push(visual.filterControl);

      //add parameters
      const parameters = dashboardDef.ParameterDeclarations!;
      parameters.push(...visual.parameterDeclarations);

      //add dataset configuration
      const fiterGroups = dashboardDef.FilterGroups!
      fiterGroups.push(visual.filterGroup);

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
      const firstObj = findFirstChild(visual.filterControl);
      layoutControl.ElementId = firstObj.FilterControlId;
      visualControl.RowSpan = visual.eventCount * 2;

      visualControl.ElementId = findFirstChild(visual.visual).VisualId;
      elements.push(layoutControl);
      elements.push(visualControl);

    }
  }

  return dashboardDef;
};

export async function getDashboardCreateParameters(input: DashboardCreateInputParameters) : Promise<DashboardCreateParameters> {

  //get requied parameters from ddb and stack output.
  const pipeline = await input.store.getPipeline(input.projectId, input.pipelineId);
  if (!pipeline) {
    return { status: { code: 404, message: 'Pipeline not found' } };
  }
  const redshiftRegion = pipeline.region;

  logger.info(`redshiftRegion: ${redshiftRegion}`);

  if (!pipeline.dataModeling?.redshift) {
    return { status: { code: 404, message: 'Redshift not enabled in the pipeline' } };
  }

  const isProvisionedRedshift = pipeline.dataModeling?.redshift?.provisioned ? true : false;
  const clusterIdentifier = isProvisionedRedshift ? pipeline.dataModeling?.redshift.provisioned?.clusterIdentifier : undefined;
  const dbUser= isProvisionedRedshift ? pipeline.dataModeling?.redshift.provisioned?.dbUser : undefined;

  let workgroupName = undefined;
  let dataApiRole = undefined;

  logger.info(`pipeline: ${pipeline}`);

  const cPipeline = new CPipeline(pipeline);
  const modelingStackOutputs = await cPipeline.getStackOutputs(PipelineStackType.DATA_MODELING_REDSHIFT);

  console.log(`stackoutput: ${JSON.stringify(modelingStackOutputs)}`);
  for (const [name, value] of modelingStackOutputs) {
    if (name.endsWith('WorkgroupName')) {
      workgroupName = value;
    }
    if (name.endsWith('DataApiRoleArn')) {
      dataApiRole = value;
    }
  }
  if (!workgroupName && !isProvisionedRedshift) {
    return { status: { code: 404, message: 'Redshift serverless workgroup not found' } };
  }
  if (!dataApiRole) {
    dataApiRole = 'arn:aws:iam::451426793911:role/Clickstream-DataModelingR-RedshiftServerelssWorkgr-1B641805YKFF7';
    // return {code: 404, message: 'Redshift data api role not found'};
  }

  let datasourceArn = undefined;
  let quicksightInternalUser = undefined;
  const reportingStackOutputs = await cPipeline.getStackOutputs(PipelineStackType.REPORTING);
  for (const [name, value] of reportingStackOutputs) {
    if (name.endsWith('DataSourceArn')) {
      datasourceArn = value;
    }
    if (name.endsWith('QuickSightInternalUser')) {
      quicksightInternalUser = value;
    }
  }
  if (!datasourceArn) {
    datasourceArn = 'arn:aws:quicksight:us-east-1:451426793911:datasource/clickstream_datasource_project11_50543d10';
    // return res.status(404).send(new ApiFail('QuickSight data source arn not found'));
  }
  if (!quicksightInternalUser) {
    quicksightInternalUser = 'Admin/liwmin-Isengard';
    // return res.status(404).send(new ApiFail('QuickSight internal user not found'));
  }

  //quicksight user name
  const quicksightPublicUser = pipeline.reporting?.quickSight?.user;
  if (!quicksightPublicUser) {
    return { status: { code: 404, message: 'QuickSight user not found' } };
  }

  let quicksightUser;
  if (input.action === 'PREVIEW') {
    quicksightUser = quicksightInternalUser!;
  } else {
    quicksightUser = quicksightPublicUser;
  }

  quicksightUser = 'Admin/liwmin-Isengard';

  const awsPartition = 'aws';
  const quickSightSubscribeRegion = await getQuickSightSubscribeRegion();
  logger.info(`quickSightSubscribeRegion: ${quickSightSubscribeRegion}`);

  const quickSightPricipal = `arn:${awsPartition}:quicksight:${quickSightSubscribeRegion}:${input.accountId}:user/default/${quicksightUser}`;
  console.log(`quickSightPricipal: ${quickSightPricipal}`);

  //get redshift client
  const credentials = await getCredentialsFromRole(input.stsClient, dataApiRole);
  const redshiftDataClient = new RedshiftDataClient({
    region: redshiftRegion,
    credentials: {
      accessKeyId: credentials?.AccessKeyId!,
      secretAccessKey: credentials?.SecretAccessKey!,
      sessionToken: credentials?.SessionToken,
    },
  });

  return {
    status: { code: 200 },
    redshiftRegion,
    redshiftDataClient,
    quickSightPricipal,
    dataApiRole,
    clusterIdentifier,
    dbUser,
    workgroupName,
    datasourceArn,
    isProvisionedRedshift,
  };

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

export function getVisualDef(visualId: string, viewName: string) : Visual {

  const visualDef = JSON.parse(readFileSync(join(__dirname, './templates/funnel-chart.json')).toString()) as Visual;
  const eventNameFiledId = uuidv4();
  const idFilefId = uuidv4();
  visualDef.FunnelChartVisual!.VisualId = visualId;

  const fieldWells = visualDef.FunnelChartVisual!.ChartConfiguration!.FieldWells!;
  const sortConfiguration = visualDef.FunnelChartVisual!.ChartConfiguration!.SortConfiguration!;
  const tooltipFields = visualDef.FunnelChartVisual?.ChartConfiguration?.Tooltip!.FieldBasedTooltip!.TooltipFields!;

  fieldWells.FunnelChartAggregatedFieldWells!.Category![0].CategoricalDimensionField!.FieldId = eventNameFiledId;
  fieldWells.FunnelChartAggregatedFieldWells!.Values![0].CategoricalMeasureField!.FieldId = idFilefId;
  fieldWells.FunnelChartAggregatedFieldWells!.Category![0].CategoricalDimensionField!.Column!.DataSetIdentifier = viewName;
  fieldWells.FunnelChartAggregatedFieldWells!.Values![0].CategoricalMeasureField!.Column!.DataSetIdentifier = viewName;
  sortConfiguration.CategorySort![0].FieldSort!.FieldId = idFilefId;
  sortConfiguration.CategorySort![1].FieldSort!.FieldId = eventNameFiledId;

  tooltipFields[0].FieldTooltipItem!.FieldId = idFilefId;
  tooltipFields[1].FieldTooltipItem!.FieldId = eventNameFiledId;

  return visualDef;
}

export interface VisualRalatedDefParams {
  readonly filterContrl: FilterControl;
  readonly parameterDeclarations: ParameterDeclaration[];
  readonly filterGroup: FilterGroup;
}

export interface VisualRalatedDefProps {
  readonly timeScopeType: 'FIXED' | 'RELATIVE';
  readonly sheetId: string;
  readonly visualId: string;
  readonly viewName: string;
  readonly lastN?: number;
  readonly timeUnit?: string;
  readonly timeStart?: string;
  readonly timeEnd?: string;
}

export function getVisualRalatedDefs(props: VisualRalatedDefProps) : VisualRalatedDefParams {

  const filterControlId = uuidv4();
  const sourceFilterId = uuidv4();
  const parameterSuffix = uuidv4().replace(/-/g, '');

  let filterContrl: FilterControl;
  const parameterDeclarations = [];
  let filterGroup: FilterGroup;

  if (props.timeScopeType === 'FIXED') {
    filterContrl = JSON.parse(readFileSync(join(__dirname, './templates/filter-control-datetime.json')).toString()) as FilterControl;
    filterContrl.DateTimePicker!.FilterControlId = filterControlId;
    filterContrl.DateTimePicker!.Title = 'event_date between';
    filterContrl.DateTimePicker!.SourceFilterId = sourceFilterId;

    // const parameterDeclarationStart = JSON.parse(readFileSync(join(__dirname, './templates/datetime-parameter.json')).toString()) as ParameterDeclaration;
    // parameterDeclarationStart.DateTimeParameterDeclaration!.Name = `dateStart${parameterSuffix}`;
    // parameterDeclarationStart.DateTimeParameterDeclaration!.TimeGranularity = 'DAY';
    // parameterDeclarationStart.DateTimeParameterDeclaration!.DefaultValues!.StaticValues = [new Date(props.timeStart!)];
    // parameterDeclarationStart.DateTimeParameterDeclaration!.DefaultValues!.RollingDate = undefined;
    // parameterDeclarations.push(parameterDeclarationStart);

    // const parameterDeclarationEnd = JSON.parse(readFileSync(join(__dirname, './templates/datetime-parameter.json')).toString()) as ParameterDeclaration;
    // parameterDeclarationEnd.DateTimeParameterDeclaration!.Name = `dateEnd${parameterSuffix}`;
    // parameterDeclarationEnd.DateTimeParameterDeclaration!.TimeGranularity = 'DAY';
    // parameterDeclarationEnd.DateTimeParameterDeclaration!.DefaultValues!.StaticValues = [new Date(props.timeEnd!)];
    // parameterDeclarationEnd.DateTimeParameterDeclaration!.DefaultValues!.RollingDate = undefined;
    // parameterDeclarations.push(parameterDeclarationEnd);

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
    filterContrl = JSON.parse(readFileSync(join(__dirname, './templates/filter-control-relative-datetime.json')).toString()) as FilterControl;
    filterContrl.RelativeDateTime!.FilterControlId = filterControlId;
    filterContrl.RelativeDateTime!.Title = 'event_date';
    filterContrl.RelativeDateTime!.SourceFilterId = sourceFilterId;

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

    let unit = 'DAY';
    if (props.timeUnit == 'WK') {
      unit = 'WEEK';
    } else if (props.timeUnit == 'MM') {
      unit = 'MONTH';
    } else if (props.timeUnit == 'Q') {
      unit = 'QUARTER';
    }

    filterGroup = JSON.parse(readFileSync(join(__dirname, './templates/filter-group-relative.json')).toString()) as FilterGroup;

    filterGroup.FilterGroupId = uuidv4();
    filterGroup.Filters![0].RelativeDatesFilter!.FilterId = sourceFilterId;
    filterGroup.Filters![0].RelativeDatesFilter!.Column!.ColumnName = 'event_date';
    filterGroup.Filters![0].RelativeDatesFilter!.Column!.DataSetIdentifier = props.viewName;

    filterGroup.Filters![0].RelativeDatesFilter!.RelativeDateValue = props.lastN;
    filterGroup.Filters![0].RelativeDatesFilter!.TimeGranularity = unit;

    filterGroup.ScopeConfiguration!.SelectedSheets!.SheetVisualScopingConfigurations![0].SheetId = props.sheetId;
    filterGroup.ScopeConfiguration!.SelectedSheets!.SheetVisualScopingConfigurations![0].VisualIds = [props.visualId];

  }

  return {
    parameterDeclarations,
    filterContrl,
    filterGroup,
  };
}

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

