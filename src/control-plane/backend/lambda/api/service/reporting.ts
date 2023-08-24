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
import { AnalysisDefinition, ConflictException, DashboardVersionDefinition, InputColumn, QuickSight } from '@aws-sdk/client-quicksight';
import { BatchExecuteStatementCommand, RedshiftDataClient } from '@aws-sdk/client-redshift-data';
import { STSClient } from '@aws-sdk/client-sts';
import { v4 as uuidv4 } from 'uuid';
import {
  createDataSet,
  funnelVisualColumns,
  applyChangeToDashboard,
  getDashboardDefinitionFromArn,
  CreateDashboardResult,
  sleep,
  DashboardCreateParameters,
  getFunnelVisualDef,
  getFunnelVisualRelatedDefs,
  getFunnelTableVisualRelatedDefs,
  getFunnelTableVisualDef,
  getCredentialsFromRole,
} from './quicksight/reporting-utils';
import { buildFunnelDataSql, buildFunnelView } from './quicksight/sql-builder';
import { awsAccountId } from '../common/constants';
import { logger } from '../common/powertools';
import { aws_sdk_client_common_config } from '../common/sdk-client-config-ln';
import { ApiFail, ApiSuccess } from '../common/types';
import { getClickstreamUserArn, registerClickstreamUser } from '../store/aws/quicksight';

export class ReportingServ {

  async createFunnelVisual(req: any, res: any, next: any) {
    try {
      logger.info(`request: ${JSON.stringify(req.body)}`);

      await registerClickstreamUser();

      const query = req.body;
      const dashboardCreateParameters = query.dashboardCreateParameters as DashboardCreateParameters;
      const redshiftRegion = dashboardCreateParameters.region;

      const stsClient = new STSClient({
        region: redshiftRegion,
        ...aws_sdk_client_common_config,
      });
      const quickSight = new QuickSight({
        region: redshiftRegion,
        ...aws_sdk_client_common_config,
      });
      const principals = await getClickstreamUserArn();

      const credentials = await getCredentialsFromRole(stsClient, dashboardCreateParameters.redshift.dataApiRole);
      const redshiftDataClient = new RedshiftDataClient({
        region: redshiftRegion,
        credentials: {
          accessKeyId: credentials?.AccessKeyId!,
          secretAccessKey: credentials?.SecretAccessKey!,
          sessionToken: credentials?.SessionToken,
        },
      });

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

      const tableVisualViewName = viewName + '_tab';
      const sqlTable = buildFunnelDataSql(query.appId, tableVisualViewName, {
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

      logger.info(`dashboardCreateParameters: ${JSON.stringify(dashboardCreateParameters)}`);

      const sqls = [sql, sqlTable];
      const grantSql: string[] = [];
      for ( const viewNm of [viewName, tableVisualViewName]) {
        grantSql.push(`grant select on ${query.appId}.${viewNm} to ${dashboardCreateParameters.redshift.user};`);
      }
      //create view in redshift
      const input = {
        Sqls: sqls.concat(grantSql),
        WorkgroupName: dashboardCreateParameters.redshift.newServerless?.workgroupName ?? undefined,
        Database: query.projectId,
        WithEvent: false,
        ClusterIdentifier: dashboardCreateParameters.redshift.provisioned?.clusterIdentifier ?? undefined,
        DbUser: dashboardCreateParameters.redshift.provisioned?.dbUser ?? undefined,
      };

      const params = new BatchExecuteStatementCommand(input);
      await redshiftDataClient.send(params);

      //create quicksight dataset
      const datasetOutput = await createDataSet(
        quickSight, awsAccountId!,
        principals.dashboardOwner,
        dashboardCreateParameters.quickSight.dataSourceArn, {
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
        });

      logger.info(`funnel chart dataset arn: ${JSON.stringify(datasetOutput?.Arn)}`);

      const projectedColumns: string[] = [query.groupColumn];
      const tableViewCols: InputColumn[] = [{
        Name: query.groupColumn,
        Type: 'STRING',
      }];

      for (const [index, item] of query.eventAndConditions.entries()) {
        projectedColumns.push(`${item.eventName}`);
        tableViewCols.push({
          Name: item.eventName,
          Type: 'DECIMAL',
        });

        if (index === 0) {
          projectedColumns.push('rate');
          tableViewCols.push({
            Name: 'rate',
            Type: 'DECIMAL',
          });
        } else {
          projectedColumns.push(`${item.eventName}_rate`);
          tableViewCols.push({
            Name: `${item.eventName}_rate`,
            Type: 'DECIMAL',
          });
        }
      }
      const datasetOutputForTableChart = await createDataSet(
        quickSight, awsAccountId!,
        principals.dashboardOwner,
        dashboardCreateParameters.quickSight.dataSourceArn, {
          name: '',
          tableName: tableVisualViewName,
          columns: tableViewCols,
          importMode: 'DIRECT_QUERY',
          customSql: `select * from ${query.appId}.${tableVisualViewName}`,
          projectedColumns: ['event_date'].concat(projectedColumns),
        });

      logger.info(`table chart dataset status: ${JSON.stringify(datasetOutputForTableChart?.Arn)}`);

      // generate dashboard definition
      let dashboardDef;
      let sheetId;
      if (!query.dashboardId) {
        dashboardDef = JSON.parse(readFileSync(join(__dirname, './quicksight/templates/dashboard.json')).toString()) as DashboardVersionDefinition;
        sheetId = uuidv4();
        dashboardDef.Sheets![0].SheetId = sheetId;
        dashboardDef.Sheets![0].Name = query.sheetName;
      } else {
        if (!query.sheetId) {
          return res.status(400).send(new ApiFail('missing required parameter sheetId'));
        }
        sheetId = query.sheetId;
        dashboardDef = await getDashboardDefinitionFromArn(quickSight, awsAccountId!, query.dashboardId);
      }

      const dataSetIdentifierDeclaration = {
        Identifier: viewName,
        DataSetArn: datasetOutput?.Arn,
      };

      const visualId = uuidv4();
      const visualDef = getFunnelVisualDef(visualId, viewName);
      const visualRelatedParams = getFunnelVisualRelatedDefs({
        timeScopeType: query.timeScopeType,
        sheetId,
        visualId,
        viewName,
        lastN: query.lastN,
        timeUnit: query.timeUnit,
        timeStart: query.timeStart,
        timeEnd: query.timeEnd,
      });

      const visualProps = {
        name: `visual-${viewName}`,
        sheetId: sheetId,
        visual: visualDef,
        dataSetIdentifierDeclaration: dataSetIdentifierDeclaration,
        filterControl: visualRelatedParams.filterControl,
        parameterDeclarations: visualRelatedParams.parameterDeclarations,
        filterGroup: visualRelatedParams.filterGroup,
        eventCount: query.eventAndConditions.length,
      };

      const dataSetIdentifierDeclarationForTableVisual = {
        Identifier: tableVisualViewName,
        DataSetArn: datasetOutputForTableChart?.Arn,
      };

      const tableVisualId = uuidv4();
      const eventNames = [];
      const percentageCols = ['rate'];
      for (const [index, e] of query.eventAndConditions.entries()) {
        eventNames.push(e.eventName);
        if (index > 0) {
          percentageCols.push(e.eventName + '_rate');
        }
      }
      const tableVisualDef = getFunnelTableVisualDef(tableVisualId, tableVisualViewName, eventNames, query.groupColumn);
      const columnConfigurations = getFunnelTableVisualRelatedDefs(tableVisualViewName, percentageCols);

      visualRelatedParams.filterGroup!.ScopeConfiguration!.SelectedSheets!.SheetVisualScopingConfigurations![0].VisualIds?.push(tableVisualId);

      const tableVisualProps = {
        name: `visual-${tableVisualViewName}}`,
        sheetId: sheetId,
        visual: tableVisualDef,
        dataSetIdentifierDeclaration: dataSetIdentifierDeclarationForTableVisual,
        ColumnConfigurations: columnConfigurations,
      };

      const dashboard = applyChangeToDashboard({
        action: 'ADD',
        visuals: [visualProps, tableVisualProps],
        dashboardDef: dashboardDef as DashboardVersionDefinition,
      });

      logger.info(`final dashboard def: ${JSON.stringify(dashboard)}`);

      let result: CreateDashboardResult;
      if (!query.dashboardId) {

        //crate QuickSight analysis
        const analysisId = `clickstream-ext-${uuidv4()}`;
        const newAnalysis = await quickSight.createAnalysis({
          AwsAccountId: awsAccountId,
          AnalysisId: analysisId,
          Name: `analysis-${viewName}`,
          Permissions: [{
            Principal: principals.dashboardOwner,
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
          Definition: dashboard as AnalysisDefinition,
        });

        //crate QuickSight dashboard
        const dashboardId = `clickstream-ext-${uuidv4()}`;
        const newDashboard = await quickSight.createDashboard({
          AwsAccountId: awsAccountId,
          DashboardId: dashboardId,
          Name: `dashboard-${viewName}`,
          Permissions: [{
            Principal: principals.dashboardOwner,
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
          },
          {
            Principal: principals.embedOwner,
            Actions: [
              'quicksight:DescribeDashboard', 'quicksight:QueryDashboard', 'quicksight:ListDashboardVersions',
            ],
          }],
          Definition: dashboard,
        });
        logger.info('funnel chart successfully created');

        result = {
          dashboardId,
          dashboardArn: newDashboard.Arn!,
          dashboardName: `dashboard-${viewName}`,
          dashboardVersion: Number.parseInt(newDashboard.VersionArn!.substring(newDashboard.VersionArn!.lastIndexOf('/') + 1)),
          analysisId,
          analysisArn: newAnalysis.Arn!,
          analysisName: `analysis-${viewName}`,
          sheetId: sheetId,
          visualIds: [visualId, tableVisualId],
        };
      } else {
        //crate QuickSight analysis
        let newAnalysis;
        if (query.analysisId) {
          newAnalysis = await quickSight.updateAnalysis({
            AwsAccountId: awsAccountId,
            AnalysisId: query.analysisId,
            Name: query.analysisName,
            Definition: dashboard as AnalysisDefinition,
          });
        }

        //crate QuickSight dashboard
        const newDashboard = await quickSight.updateDashboard({
          AwsAccountId: awsAccountId,
          DashboardId: query.dashboardId,
          Name: query.dashboardName,
          Definition: dashboard,
        });
        const versionNumber = newDashboard.VersionArn?.substring(newDashboard.VersionArn?.lastIndexOf('/') + 1);

        for (const _i of Array(60).keys()) {
          try {
            await quickSight.updateDashboardPublishedVersion({
              AwsAccountId: awsAccountId,
              DashboardId: query.dashboardId,
              VersionNumber: Number.parseInt(versionNumber!),
            });

          } catch (err: any) {
            if (err instanceof ConflictException ) {
              logger.warn('sleep 100ms to wait updateDashboard finish');
              await sleep(100);
            }
          }
        }

        result = {
          dashboardId: query.dashboardId,
          dashboardArn: newDashboard.Arn!,
          dashboardName: query.dashboardName,
          dashboardVersion: Number.parseInt(versionNumber!),
          analysisId: query.analysisId,
          analysisArn: newAnalysis?.Arn!,
          analysisName: query.analysisName,
          sheetId: sheetId,
          visualIds: [visualId, tableVisualId],
        };

        logger.info('funnel chart successfully updated');
      }

      return res.status(201).json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  };

}

