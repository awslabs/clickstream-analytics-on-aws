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
import { ApiFail, ApiSuccess, PipelineStackType } from '../common/types';
import { BatchExecuteStatementCommand, RedshiftDataClient } from '@aws-sdk/client-redshift-data';
import { FilterControl, FilterGroup, ParameterDeclaration, QuickSight, TemplateVersionDefinition, Visual } from '@aws-sdk/client-quicksight'
import { logger } from '../common/powertools';
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import { buildFunnelView } from '../common/sql-builder';
import { getQuickSightSubscribeRegion } from '../store/aws/quicksight';
import { awsAccountId, awsPartition, awsRegion } from '../common/constants';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';
import { ClickStreamStore } from '../store/click-stream-store';
import { CPipeline } from '../model/pipeline';
import { createDataSet, funnelVisualColumns } from '../common/quicksight/reporting-utils';
import { readFileSync } from 'fs';
import { join } from 'path';
import { applyChangeToDashboard } from '../common/quicksight-visual-utils';

const store: ClickStreamStore = new DynamoDbStore();
const stsClient = new STSClient({region: 'us-east-1'});
const quickSight = new QuickSight({
  region: awsRegion
});

async function getCredentialsFromRole(roleArn: string) {
  try {
    const assumeRoleCommand = new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: "redshift-data-api-role",
    });

    const response = await stsClient.send(assumeRoleCommand);
    const credentials = response.Credentials;

    return credentials;
  } catch (error) {
    console.error("Error occurred while assuming role:", error);
    throw error;
  }
}

export class ReportingServ {

  public async createFunnelVisual(req: any, res: any, next: any) {
    try {
      logger.info(`request: ${JSON.stringify(req.body)}`);

      const query = req.body;
      //construct parameters to build sql
      const viewName = query.viewName;
      const sql = buildFunnelView(query.appId, viewName, {
        schemaName: query.appId,
        computeMethod: query.computeMethod,
        specifyJoinColumn: query.specifyJoinColumn,
        joinColumn: query.joinColumn,
        conversionIntervalType: query.conversionIntervalType,
        conversionIntervalInSeconds: query.conversionIntervalInSeconds,
        eventAndConditions: query.eventAndConditions,
        timeScopeType: query.timeScopeType,
        timeStart: query.timeScopeType === 'FIXED' ? query.timeStart : new Date(new Date().getTime() - 180 * 24 * 3600 * 1000),
        timeEnd: query.timeScopeType === 'FIXED' ? query.timeEnd : new Date(),
        lastN: query.lastN,
        timeUnit: query.timeUnit,
        groupColumn: query.groupColumn,
      });

      console.log(`sql: ${sql}`)

      //get requied parameters from ddb and stack output.
      const pipeline = await store.getPipeline(query.projectId, query.pipelineId);
      if (!pipeline) {
        return res.status(404).send(new ApiFail('Pipeline not found'));
      }
      const redshiftRegion = pipeline.region

      logger.info(`region: ${redshiftRegion}`)

      if (!pipeline.dataModeling?.redshift) {
        return res.status(404).send(new ApiFail('Redshift not enabled in the pipeline'));
      }
      const isProvisionedRedshift = pipeline.dataModeling?.redshift?.provisioned ? true : false;

      let workgroupName = undefined;
      let dataApiRole = undefined;


      logger.info(`pipeline: ${pipeline}`)

      const cPipeline = new CPipeline(pipeline);
      const modelingStackOutputs = await cPipeline.getStackOutputs(PipelineStackType.DATA_MODELING_REDSHIFT);

      for (const [name, value] of modelingStackOutputs) {
        if(name.endsWith('WorkgroupName')){
          workgroupName = value;
        }
        if(name.endsWith('DataApiRole')){
          dataApiRole = value;
        }
      }
      if(!workgroupName && !isProvisionedRedshift) {
        return res.status(404).send(new ApiFail('Redshift serverless workgroup not found'));
      }
      if(!dataApiRole) {
        return res.status(404).send(new ApiFail('Redshift data api role not found'));
      }

      let datasourceArn = undefined;
      let quicksightInternalUser = undefined;
      const reportingStackOutputs = await cPipeline.getStackOutputs(PipelineStackType.REPORTING);
      for (const [name, value] of reportingStackOutputs) {
        if(name.endsWith('DataSourceArn')){
          datasourceArn = value;
        }
        if(name.endsWith('QuickSightInternalUser')){
          quicksightInternalUser = value;
        }
      }
      if(!datasourceArn) {
        return res.status(404).send(new ApiFail('QuickSight data source arn not found'));
      }
      if(!quicksightInternalUser) {
        return res.status(404).send(new ApiFail('QuickSight internal user not found'));
      }

      //quicksight user name
      const quicksightPublicUser = pipeline.reporting?.quickSight?.user;
      if(!quicksightPublicUser) {
        return res.status(404).send(new ApiFail('QuickSight user not found'));
      }

      // let quicksightUser = ''
      // if(query.action === 'PREVIEW') {
      //   quicksightUser = quicksightInternalUser!;
      // } else if(query.action === 'PUBLISH') {
        
      //   quicksightUser = quicksightPublicUser;
      // } else {
      //   return res.status(400).send(new ApiFail('Bad request'));
      // }
      //get requied parameters from ddb and stack output.
      
      const quickSightSubscribeRegion = await getQuickSightSubscribeRegion();
      const quickSightPricipal = `arn:${awsPartition}:quicksight:${quickSightSubscribeRegion}:${awsAccountId}:user/default/${quicksightPublicUser}`;
      // const quickSightInternalUserPricipal = `arn:${awsPartition}:quicksight:${quickSightSubscribeRegion}:${awsAccountId}:user/default/${quicksightInternalUser}`;

      //get redshift client
      const credentials = await getCredentialsFromRole(dataApiRole);
      const redshiftDataClient = new RedshiftDataClient({
        region: redshiftRegion,
        credentials: {
          accessKeyId: credentials?.AccessKeyId!,
          secretAccessKey: credentials?.SecretAccessKey!,
          sessionToken: credentials?.SessionToken,
        }
      })

      //create view in redshift
      const params = new BatchExecuteStatementCommand({
        Sqls: [sql],
        WorkgroupName: workgroupName,
        Database: query.projectId,
        WithEvent: false,
        ClusterIdentifier: isProvisionedRedshift ? pipeline.dataModeling?.redshift.provisioned?.clusterIdentifier : undefined,
        DbUser: isProvisionedRedshift ? pipeline.dataModeling?.redshift.provisioned?.dbUser : undefined,
      });

      await redshiftDataClient.send(params);

      //create quicksight dataset
      createDataSet(quickSight, awsAccountId!, quickSightPricipal, datasourceArn, {
        name: '',
        tableName: viewName,
        columns: funnelVisualColumns,
        importMode: 'DIRECT_QUERY',
        customSql: `select * from ${query.appId}.${viewName}`,
        projectedColumns: [
          'event_date',
          'event_name',
          'x_id',
        ],
      })

      const dashboardDef = JSON.parse(readFileSync(join(__dirname, '../common/quicksight-template/dashboard.json')).toString()) as TemplateVersionDefinition;
      const datasetConfg = {
        Placeholder: viewName,
        DataSetSchema: {
          ColumnSchemaList: [
            {
              "Name": "event_date",
              "DataType": "DATETIME"
            },
            {
              "Name": "event_name",
              "DataType": "STRING"
            },
            {
              "Name": "x_id",
              "DataType": "STRING"
            },
          ]
        },
        ColumnGroupSchemaList: [],
      }

      const visualDef = JSON.parse(readFileSync(join(__dirname, '../common/quicksight-template/funnel-chart.json')).toString()) as Visual
      const eventNameFiledId = uuidv4()
      const idFilefId = uuidv4()
      visualDef.FunnelChartVisual!.VisualId = uuidv4()

      const fieldWells = visualDef.FunnelChartVisual!.ChartConfiguration!.FieldWells!;
      const sortConfiguration = visualDef.FunnelChartVisual!.ChartConfiguration!.SortConfiguration!;
      const tooltipFields = visualDef.FunnelChartVisual?.ChartConfiguration?.Tooltip!.FieldBasedTooltip!.TooltipFields!;

      fieldWells.FunnelChartAggregatedFieldWells!.Category![0].CategoricalDimensionField!.FieldId = eventNameFiledId
      fieldWells.FunnelChartAggregatedFieldWells!.Values![0].CategoricalMeasureField!.FieldId = idFilefId;
      fieldWells.FunnelChartAggregatedFieldWells!.Category![0].CategoricalDimensionField!.Column!.DataSetIdentifier = viewName
      fieldWells.FunnelChartAggregatedFieldWells!.Values![0].CategoricalMeasureField!.Column!.DataSetIdentifier = viewName
      sortConfiguration.CategorySort![0].FieldSort!.FieldId = idFilefId;
      sortConfiguration.CategorySort![1].FieldSort!.FieldId = eventNameFiledId;

      tooltipFields[0].FieldTooltipItem!.FieldId = idFilefId;
      tooltipFields[1].FieldTooltipItem!.FieldId = eventNameFiledId;

      let filterContrl: FilterControl
      const filterControlId = uuidv4()
      const sourceFilterId = uuidv4()
      const parameterSuffix = uuidv4().replace(/-/g, '');

      const parameterDeclarations = []

      if (query.timeScopeType === 'FIXED') {

        filterContrl = JSON.parse(readFileSync(join(__dirname, '../common/quicksight-template/filter-control-datetime.json')).toString()) as FilterControl
        filterContrl.DateTimePicker!.FilterControlId = filterControlId
        filterContrl.DateTimePicker!.Title = 'event_date between'
        filterContrl.DateTimePicker!.SourceFilterId = sourceFilterId

        const parameterDeclarationStart = JSON.parse(readFileSync(join(__dirname, '../common/quicksight-template/filter-control-relative-datetime.json')).toString()) as ParameterDeclaration
        parameterDeclarationStart.DateTimeParameterDeclaration!.Name = `dateStart${parameterSuffix}`
        parameterDeclarationStart.DateTimeParameterDeclaration!.TimeGranularity = 'DAY'
        parameterDeclarationStart.DateTimeParameterDeclaration!.DefaultValues!.StaticValues = [new Date(req.timeStart)]
        parameterDeclarations.push(parameterDeclarationStart)

        const parameterDeclarationEnd = JSON.parse(readFileSync(join(__dirname, '../common/quicksight-template/filter-control-relative-datetime.json')).toString()) as ParameterDeclaration
        parameterDeclarationEnd.DateTimeParameterDeclaration!.Name = `dateEnd${parameterSuffix}`
        parameterDeclarationEnd.DateTimeParameterDeclaration!.TimeGranularity = 'DAY'
        parameterDeclarationEnd.DateTimeParameterDeclaration!.DefaultValues!.StaticValues = [new Date(req.timeEnd)]
        parameterDeclarations.push(parameterDeclarationEnd)

      } else {
        filterContrl = JSON.parse(readFileSync(join(__dirname, '../common/quicksight-template/filter-control-relative-datetime.json')).toString()) as FilterControl
        filterContrl.DateTimePicker!.FilterControlId = filterControlId
        filterContrl.DateTimePicker!.Title = 'event_date'
        filterContrl.DateTimePicker!.SourceFilterId = sourceFilterId

        const parameterDeclarationStart = JSON.parse(readFileSync(join(__dirname, '../common/quicksight-template/filter-control-relative-datetime.json')).toString()) as ParameterDeclaration
        parameterDeclarationStart.DateTimeParameterDeclaration!.Name = `dateStart${parameterSuffix}`
        parameterDeclarationStart.DateTimeParameterDeclaration!.TimeGranularity = 'DAY'
        parameterDeclarationStart.DateTimeParameterDeclaration!.DefaultValues!.RollingDate!.Expression = `addDateTime(-${query.lastN}, '${query.timeUnit}', truncDate('${query.timeUnit}', now()))`,
        parameterDeclarations.push(parameterDeclarationStart)

        const parameterDeclarationEnd = JSON.parse(readFileSync(join(__dirname, '../common/quicksight-template/filter-control-relative-datetime.json')).toString()) as ParameterDeclaration
        parameterDeclarationEnd.DateTimeParameterDeclaration!.Name = `dateEnd${parameterSuffix}`
        parameterDeclarationEnd.DateTimeParameterDeclaration!.TimeGranularity = 'DAY'
        parameterDeclarationEnd.DateTimeParameterDeclaration!.DefaultValues!.RollingDate!.Expression = `addDateTime(1, 'DD', truncDate('DD', now()))`,
        parameterDeclarations.push(parameterDeclarationEnd)
      }


      const filterGroup = JSON.parse(readFileSync(join(__dirname, '../common/quicksight-template/filter-group.json')).toString()) as FilterGroup;

      filterGroup.FilterGroupId = uuidv4()
      filterGroup.Filters![0].TimeRangeFilter!.FilterId = filterControlId
      filterGroup.Filters![0].TimeRangeFilter!.Column!.ColumnName = 'event_date'
      filterGroup.Filters![0].TimeRangeFilter!.Column!.DataSetIdentifier = viewName

      

      // //create quicksight tempalte
      // const templateArn = await createTemplateFromDefinition(quickSight, awsAccountId!, quickSightPricipal, templateDef)

      // // create quicksight analysis
      // const datasetRefs: DataSetReference[] = [];
      // const sourceEntity = {
      //   SourceTemplate: {
      //     Arn: templateArn,
      //     DataSetReferences: datasetRefs,
      //   },
      // };
      // createAnalysis(quickSight, awsAccountId!, quickSightPricipal, sourceEntity, '')
      
      //create quicksight dashboard

      const visualPorps = {
        name: `visual-${viewName}`,
        sheetId: 'sheet1',
        visualContent: visualDef,
        dataSetConfiguration: datasetConfg,
        filterControl: filterContrl,
        parameterDeclarations: parameterDeclarations,
        filterGroup: filterGroup,
        eventCount: query.eventAndConditions.length,
      }

      const dashboard = applyChangeToDashboard({
        action: 'ADD',
        visuals:[visualPorps],
        dashboardDef: JSON.stringify(dashboardDef),
      })

      logger.info(`final dashboard def: ${dashboard}`)

      // quickSight.createDashboard({
      //   AwsAccountId: awsAccountId,
      //   DashboardId: `dashboard-${uuidv4()}`,
      //   Name: `dashboard-${viewName}`,
      //   Definition: JSON.parse(dashboard) as DashboardVersionDefinition
      // })

      return res.status(201).json(new ApiSuccess({ }, 'funnel visual created'));
    } catch (error) {
      next(error);
    }
  };

}

