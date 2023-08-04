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
import { ApiFail, ApiSuccess } from '../common/types';
import { BatchExecuteStatementCommand } from '@aws-sdk/client-redshift-data';
import { AnalysisDefinition, DashboardVersionDefinition, QuickSight } from '@aws-sdk/client-quicksight'
import { logger } from '../common/powertools';
import { STSClient } from '@aws-sdk/client-sts';
import { buildFunnelView } from '../common/sql-builder';
import { awsAccountId, awsRegion } from '../common/constants';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';
import { ClickStreamStore } from '../store/click-stream-store';
import { createDataSet, funnelVisualColumns, getAnalysisDefinitionFromArn } from '../common/quicksight/reporting-utils';
import { applyChangeToDashboard } from '../common/quicksight-visual-utils';
import { getDashboardCreateParameters, getVisualDef, getVisualRalatedDefs } from './quicksight/utils';
import { readFileSync } from 'fs';
import { join } from 'path';

const store: ClickStreamStore = new DynamoDbStore();
const stsClient = new STSClient({region: 'us-east-1'});
const quickSight = new QuickSight({
  region: awsRegion
});

export class ReportingServ {

  async createFunnelVisual(req: any, res: any, next: any) {
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
        timeStart: query.timeScopeType === 'FIXED' ? query.timeStart : undefined,
        timeEnd: query.timeScopeType === 'FIXED' ? query.timeEnd : undefined,
        lastN: query.lastN,
        timeUnit: query.timeUnit,
        groupColumn: query.groupColumn,
      });

      console.log(`sql: ${sql}`)

      const dashboardCreateParameters = await getDashboardCreateParameters({
        action: query.action,
        accountId: awsAccountId!,
        projectId: query.projectId,
        appId: query.appId,
        pipelineId: query.pipelineId,
        stsClient,
        store,
      })

      logger.info(`dashboardCreateParameters: ${JSON.stringify(dashboardCreateParameters)}`)

      if(dashboardCreateParameters.status.code !== 200) {
        return res.status(dashboardCreateParameters.status.code).send(new ApiFail(dashboardCreateParameters.status.message ?? 'unknown error'));
      }

      //create view in redshift
      const input = {
        Sqls: [sql],
        WorkgroupName: dashboardCreateParameters.workgroupName,
        Database: query.projectId,
        WithEvent: false,
        ClusterIdentifier: dashboardCreateParameters.clusterIdentifier,
        DbUser: dashboardCreateParameters.dbUser,
      }
      const params = new BatchExecuteStatementCommand(input);

      await dashboardCreateParameters.redshiftDataClient!.send(params);

      //create quicksight dataset
      const datasetOutput =  await createDataSet(quickSight, awsAccountId!, dashboardCreateParameters.quickSightPricipal!, dashboardCreateParameters.datasourceArn!, {
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

      // gererate dashboard definition
      let dashboardDef
      let sheetId 
      if(!query.analysisId) {
        dashboardDef = JSON.parse(readFileSync(join(__dirname, '../common/quicksight-template/dashboard.json')).toString()) as DashboardVersionDefinition;
        sheetId = uuidv4()
        dashboardDef.Sheets![0].SheetId = sheetId
      } else {
        if(!query.sheetId) {
          return res.status(400).send(new ApiFail('missing required parameter sheetId'));
        }
        sheetId = query.sheetId
        dashboardDef = getAnalysisDefinitionFromArn(quickSight, awsAccountId!, query.analysisId)
      }

      const datasetConfg = {
        Identifier: viewName,
        DataSetArn: datasetOutput?.Arn
      }

      const visualId = uuidv4()
      const visualDef = getVisualDef(visualId, viewName);
      const visualRelatedParams = getVisualRalatedDefs({
        timeScopeType: query.timeScopeType, 
        sheetId, 
        visualId, 
        viewName, 
        lastN: query.lastN, 
        timeUnit: query.timeUnit,
        timeStart: query.timeStart,
        timeEnd: query.timeEnd,
      });

      const visualPorps = {
        name: `visual-${viewName}`,
        sheetId: sheetId,
        visualContent: visualDef,
        dataSetConfiguration: datasetConfg,
        filterControl: visualRelatedParams.filterContrl,
        parameterDeclarations: visualRelatedParams.parameterDeclarations,
        filterGroup: visualRelatedParams.filterGroup,
        eventCount: query.eventAndConditions.length,
      }

      const dashboard = applyChangeToDashboard({
        action: 'ADD',
        visuals:[visualPorps],
        dashboardDef: JSON.stringify(dashboardDef),
      })

      logger.info(`final dashboard def:`)
      console.log(dashboard)

      //crate QuickSight analysis
      quickSight.createAnalysis({
        AwsAccountId: awsAccountId,
        AnalysisId: `analysis${uuidv4()}`,
        Name: `analysis-${viewName}`,
        Permissions: [{
          Principal: dashboardCreateParameters.quickSightPricipal,
          Actions: [
            'quicksight:DescribeAnalysis',
            'quicksight:QueryAnalysis',
            'quicksight:UpdateAnalysis',
            'quicksight:RestoreAnalysis',
            'quicksight:DeleteAnalysis',
            'quicksight:UpdateAnalysisPermissions',
            'quicksight:DescribeAnalysisPermissions',
          ],
        }],
        Definition: JSON.parse(dashboard) as AnalysisDefinition
      })

      //crate QuickSight dashboard
      quickSight.createDashboard({
        AwsAccountId: awsAccountId,
        DashboardId: `dashboard-${uuidv4()}`,
        Name: `dashboard-${viewName}`,
        Permissions: [{
          Principal: dashboardCreateParameters.quickSightPricipal,
          Actions: [
            'quicksight:DescribeDashboard',
            'quicksight:ListDashboardVersions',
            'quicksight:QueryDashboard',
            'quicksight:UpdateDashboard',
            'quicksight:DeleteDashboard',
            'quicksight:UpdateDashboardPermissions',
            'quicksight:DescribeDashboardPermissions',
            'quicksight:UpdateDashboardPublishedVersion',
          ],
        }],
        Definition: JSON.parse(dashboard) as DashboardVersionDefinition
      })

      return res.status(201).json(new ApiSuccess({ }, 'funnel visual created'));
    } catch (error) {
      next(error);
    }
  };

}

