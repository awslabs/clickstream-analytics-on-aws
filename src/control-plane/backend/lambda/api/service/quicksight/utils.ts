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
import { FilterControl, FilterGroup, ParameterDeclaration, Visual } from '@aws-sdk/client-quicksight';
import { RedshiftDataClient } from '@aws-sdk/client-redshift-data';
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../common/powertools';
import { PipelineStackType } from '../../common/types';
import { CPipeline } from '../../model/pipeline';
import { getQuickSightSubscribeRegion } from '../../store/aws/quicksight';
import { ClickStreamStore } from '../../store/click-stream-store';


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
    quicksightInternalUser = 'clickstream';
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

    const parameterDeclarationStart = JSON.parse(readFileSync(join(__dirname, './templates/datetime-parameter.json')).toString()) as ParameterDeclaration;
    parameterDeclarationStart.DateTimeParameterDeclaration!.Name = `dateStart${parameterSuffix}`;
    parameterDeclarationStart.DateTimeParameterDeclaration!.TimeGranularity = 'DAY';
    parameterDeclarationStart.DateTimeParameterDeclaration!.DefaultValues!.StaticValues = [new Date(props.timeStart!)];
    parameterDeclarations.push(parameterDeclarationStart);

    const parameterDeclarationEnd = JSON.parse(readFileSync(join(__dirname, './templates/datetime-parameter.json')).toString()) as ParameterDeclaration;
    parameterDeclarationEnd.DateTimeParameterDeclaration!.Name = `dateEnd${parameterSuffix}`;
    parameterDeclarationEnd.DateTimeParameterDeclaration!.TimeGranularity = 'DAY';
    parameterDeclarationEnd.DateTimeParameterDeclaration!.DefaultValues!.StaticValues = [new Date(props.timeEnd!)];
    parameterDeclarations.push(parameterDeclarationEnd);

    filterGroup = JSON.parse(readFileSync(join(__dirname, './templates/filter-group.json')).toString()) as FilterGroup;

    filterGroup.FilterGroupId = uuidv4();
    filterGroup.Filters![0].TimeRangeFilter!.FilterId = sourceFilterId;
    filterGroup.Filters![0].TimeRangeFilter!.Column!.ColumnName = 'event_date';
    filterGroup.Filters![0].TimeRangeFilter!.Column!.DataSetIdentifier = props.viewName;

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
    parameterDeclarations.push(parameterDeclarationStart);

    const parameterDeclarationEnd = JSON.parse(readFileSync(join(__dirname, './templates/datetime-parameter.json')).toString()) as ParameterDeclaration;
    parameterDeclarationEnd.DateTimeParameterDeclaration!.Name = `dateEnd${parameterSuffix}`;
    parameterDeclarationEnd.DateTimeParameterDeclaration!.TimeGranularity = 'DAY';
    parameterDeclarationEnd.DateTimeParameterDeclaration!.DefaultValues!.RollingDate!.Expression = 'addDateTime(1, \'DD\', truncDate(\'DD\', now()))';
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

