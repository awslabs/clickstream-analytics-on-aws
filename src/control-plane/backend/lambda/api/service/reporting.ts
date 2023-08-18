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
import { AnalysisDefinition, ConflictException, DashboardVersionDefinition, DataSetIdentifierDeclaration, InputColumn, QuickSight } from '@aws-sdk/client-quicksight';
import { BatchExecuteStatementCommand, DescribeStatementCommand, RedshiftDataClient, StatusString } from '@aws-sdk/client-redshift-data';
import { STSClient } from '@aws-sdk/client-sts';
import { v4 as uuidv4 } from 'uuid';
import { DataSetProps } from './quicksight/dashboard-ln';
import {
  createDataSet,
  funnelVisualColumns,
  applyChangeToDashboard,
  getDashboardDefinitionFromArn,
  CreateDashboardResult,
  sleep,
  DashboardCreateParameters,
  getFunnelVisualDef,
  getVisualRelatedDefs,
  getFunnelTableVisualRelatedDefs,
  getFunnelTableVisualDef,
  getCredentialsFromRole,
  VisualProps,
  getEventLineChartVisualDef,
  getEventPivotTableVisualDef,
  pathAnalysisVisualColumns,
  getPathAnalysisChartVisualDef,
} from './quicksight/reporting-utils';
import { buildFunnelDataSql, buildFunnelView, buildPathAnalysisView } from './quicksight/sql-builder';
import { awsAccountId } from '../common/constants';
import { logger } from '../common/powertools';
import { aws_sdk_client_common_config } from '../common/sdk-client-config-ln';
import { ApiFail, ApiSuccess } from '../common/types';
import { getClickstreamUserArn } from '../store/aws/quicksight';

export class ReportingServ {

  async createFunnelVisual(req: any, res: any, next: any) {
    try {
      logger.info('start to create funnel analysis visuals');
      logger.info(`request: ${JSON.stringify(req.body)}`);

      const query = req.body;
      const dashboardCreateParameters = query.dashboardCreateParameters as DashboardCreateParameters;

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

      console.log(`funnel table sql: ${sqlTable}`);

      const sqls = [sql, sqlTable];
      for ( const viewNm of [viewName, tableVisualViewName]) {
        sqls.push(`grant select on ${query.appId}.${viewNm} to ${dashboardCreateParameters.redshift.user}`);
      }

      //create quicksight dataset
      const datasetPropsArray: DataSetProps[] = [];
      datasetPropsArray.push({
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
      datasetPropsArray.push({
        name: '',
        tableName: tableVisualViewName,
        columns: tableViewCols,
        importMode: 'DIRECT_QUERY',
        customSql: `select * from ${query.appId}.${tableVisualViewName}`,
        projectedColumns: ['event_date'].concat(projectedColumns),
      });

      let sheetId;
      if (!query.dashboardId) {
        sheetId = uuidv4();
      } else {
        if (!query.sheetId) {
          return res.status(400).send(new ApiFail('missing required parameter sheetId'));
        }
        sheetId = query.sheetId;
      }

      const visualId = uuidv4();
      const visualDef = getFunnelVisualDef(visualId, viewName);
      const visualRelatedParams = getVisualRelatedDefs({
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
        sheetId: sheetId,
        visual: visualDef,
        dataSetIdentifierDeclaration: [],
        filterControl: visualRelatedParams.filterControl,
        parameterDeclarations: visualRelatedParams.parameterDeclarations,
        filterGroup: visualRelatedParams.filterGroup,
        eventCount: query.eventAndConditions.length,
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
        sheetId: sheetId,
        visual: tableVisualDef,
        dataSetIdentifierDeclaration: [],
        ColumnConfigurations: columnConfigurations,
      };

      const result: CreateDashboardResult = await this.create(viewName, query, sqls, datasetPropsArray, [visualProps, tableVisualProps]);
      result.visualIds.push({
        name: 'CHART',
        id: visualId,
      });
      result.visualIds.push({
        name: 'TABLE',
        id: tableVisualId,
      });

      return res.status(201).json(new ApiSuccess(result));

    } catch (error) {
      next(error);
    }
  };

  async createEventVisual(req: any, res: any, next: any) {
    try {
      logger.info('start to create event analysis visuals');
      logger.info(`request: ${JSON.stringify(req.body)}`);

      const query = req.body;
      const dashboardCreateParameters = query.dashboardCreateParameters as DashboardCreateParameters;;

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
      console.log(`event analysis sql: ${sql}`);

      const sqls = [sql];
      sqls.push(`grant select on ${query.appId}.${viewName} to ${dashboardCreateParameters.redshift.user}`);

      const datasetPropsArray: DataSetProps[] = [];
      datasetPropsArray.push({
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

      let sheetId;
      if (!query.dashboardId) {
        sheetId = uuidv4();
      } else {
        if (!query.sheetId) {
          return res.status(400).send(new ApiFail('missing required parameter sheetId'));
        }
        sheetId = query.sheetId;
      }

      const visualId = uuidv4();
      const visualDef = getEventLineChartVisualDef(visualId, viewName, query.timeUnit);
      const visualRelatedParams = getVisualRelatedDefs({
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
        sheetId: sheetId,
        visual: visualDef,
        dataSetIdentifierDeclaration: [],
        filterControl: visualRelatedParams.filterControl,
        parameterDeclarations: visualRelatedParams.parameterDeclarations,
        filterGroup: visualRelatedParams.filterGroup,
        eventCount: query.eventAndConditions.length,
      };

      const tableVisualId = uuidv4();
      const tableVisualDef = getEventPivotTableVisualDef(tableVisualId, viewName, query.groupColumn);

      visualRelatedParams.filterGroup!.ScopeConfiguration!.SelectedSheets!.SheetVisualScopingConfigurations![0].VisualIds!.push(tableVisualId);

      const tableVisualProps = {
        sheetId: sheetId,
        visual: tableVisualDef,
        dataSetIdentifierDeclaration: [],
      };

      const result: CreateDashboardResult = await this.create(viewName, query, sqls, datasetPropsArray, [visualProps, tableVisualProps]);
      result.visualIds.push({
        name: 'CHART',
        id: visualId,
      });
      result.visualIds.push({
        name: 'TABLE',
        id: tableVisualId,
      });

      return res.status(201).json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  };

  async createPathAnalysisVisual(req: any, res: any, next: any) {
    try {
      logger.info('start to create path analysis visuals');
      logger.info(`request: ${JSON.stringify(req.body)}`);

      const query = req.body;
      const dashboardCreateParameters = query.dashboardCreateParameters;


      //construct parameters to build sql
      const viewName = query.viewName;
      const sql = buildPathAnalysisView(query.appId, viewName, {
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
        pathAnalysis: {
          type: query.pathAnalysis.type,
          lagSeconds: query.pathAnalysis.lagSeconds,
        },
      });
      console.log(`path analysis sql: ${sql}`);

      const sqls = [sql];
      sqls.push(`grant select on ${query.appId}.${viewName} to ${dashboardCreateParameters.quickSight.redshiftUser}`);

      const datasetPropsArray: DataSetProps[] = [];
      datasetPropsArray.push({
        name: '',
        tableName: viewName,
        columns: pathAnalysisVisualColumns,
        importMode: 'DIRECT_QUERY',
        customSql: `select * from ${query.appId}.${viewName}`,
        projectedColumns: [
          'event_date',
          'source',
          'target',
          'weight',
        ],
      });

      let sheetId;
      if (!query.dashboardId) {
        sheetId = uuidv4();
      } else {
        if (!query.sheetId) {
          return res.status(400).send(new ApiFail('missing required parameter sheetId'));
        }
        sheetId = query.sheetId;
      }

      const visualId = uuidv4();
      const visualDef = getPathAnalysisChartVisualDef(visualId, viewName);
      const visualRelatedParams = getVisualRelatedDefs({
        timeScopeType: query.timeScopeType,
        sheetId,
        visualId,
        viewName,
        lastN: query.lastN,
        timeUnit: query.timeUnit,
        timeStart: query.timeStart,
        timeEnd: query.timeEnd,
      });

      const visualProps: VisualProps = {
        sheetId: sheetId,
        visual: visualDef,
        dataSetIdentifierDeclaration: [],
        filterControl: visualRelatedParams.filterControl,
        parameterDeclarations: visualRelatedParams.parameterDeclarations,
        filterGroup: visualRelatedParams.filterGroup,
        eventCount: query.eventAndConditions.length,
        colSpan: 32,
        rowSpan: 12,
      };

      const result: CreateDashboardResult = await this.create(viewName, query, sqls, datasetPropsArray, [visualProps]);
      result.visualIds.push({
        name: 'CHART',
        id: visualId,
      });

      return res.status(201).json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  };

  private async create(resourceName: string, query: any, sqls: string[], datasetPropsArray: DataSetProps[], visualPropsArray: VisualProps[]) {

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

    //create view in redshift
    const input = {
      Sqls: sqls,
      WorkgroupName: dashboardCreateParameters.redshift.newServerless?.workgroupName ?? undefined,
      Database: query.projectId,
      WithEvent: false,
      ClusterIdentifier: dashboardCreateParameters.redshift.provisioned?.clusterIdentifier ?? undefined,
      DbUser: dashboardCreateParameters.redshift.provisioned?.dbUser ?? undefined,
    };

    const params = new BatchExecuteStatementCommand(input);
    const executeResponse = await redshiftDataClient.send(params);
    const checkParams = new DescribeStatementCommand({
      Id: executeResponse.Id,
    });
    let res = await redshiftDataClient.send(checkParams);
    logger.info(`Get statement status: ${res.Status}`);
    let count = 0;
    while (res.Status != StatusString.FINISHED && res.Status != StatusString.FAILED && count < 60) {
      await sleep(100);
      count++;
      res = await redshiftDataClient.send(checkParams);
      logger.info(`Get statement status: ${res.Status}`);
    }
    if (res.Status == StatusString.FAILED) {
      logger.error('Error: '+ res.Status, JSON.stringify(res));
      throw new Error('failed to run sql of create redshift view');
    }

    //create quicksight dataset
    const dataSetIdentifierDeclaration: DataSetIdentifierDeclaration[] = [];
    for (const datasetProps of datasetPropsArray) {
      const datasetOutput = await createDataSet(
        quickSight, awsAccountId!,
        principals.dashboardOwner,
        dashboardCreateParameters.quickSight.dataSourceArn,
        datasetProps,
      );

      dataSetIdentifierDeclaration.push({
        Identifier: datasetProps.tableName,
        DataSetArn: datasetOutput?.Arn,
      });

      logger.info(`created dataset arn: ${JSON.stringify(datasetOutput?.Arn)}`);
    }

    visualPropsArray[0].dataSetIdentifierDeclaration.push(...dataSetIdentifierDeclaration);

    logger.info(`visualPropsArray[0] ${JSON.stringify(visualPropsArray[0])}`);

    // generate dashboard definition
    let dashboardDef;
    if (!query.dashboardId) {
      dashboardDef = JSON.parse(readFileSync(join(__dirname, './quicksight/templates/dashboard.json')).toString()) as DashboardVersionDefinition;
      const sheetId = visualPropsArray[0].sheetId;
      dashboardDef.Sheets![0].SheetId = sheetId;
      dashboardDef.Sheets![0].Name = query.sheetName;
    } else {
      dashboardDef = await getDashboardDefinitionFromArn(quickSight, awsAccountId!, query.dashboardId);
    }

    const dashboard = applyChangeToDashboard({
      action: 'ADD',
      visuals: visualPropsArray,
      dashboardDef: dashboardDef as DashboardVersionDefinition,
    });

    logger.info(`final dashboard def: ${JSON.stringify(dashboard)}`);

    let result: CreateDashboardResult;
    if (!query.dashboardId) {

      //create QuickSight analysis
      const analysisId = `clickstream-ext-${uuidv4()}`;
      const newAnalysis = await quickSight.createAnalysis({
        AwsAccountId: awsAccountId,
        AnalysisId: analysisId,
        Name: `analysis-${resourceName}`,
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

      //create QuickSight dashboard
      const dashboardId = `clickstream-ext-${uuidv4()}`;
      const newDashboard = await quickSight.createDashboard({
        AwsAccountId: awsAccountId,
        DashboardId: dashboardId,
        Name: `dashboard-${resourceName}`,
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

      result = {
        dashboardId,
        dashboardArn: newDashboard.Arn!,
        dashboardName: `dashboard-${resourceName}`,
        dashboardVersion: Number.parseInt(newDashboard.VersionArn!.substring(newDashboard.VersionArn!.lastIndexOf('/') + 1)),
        analysisId,
        analysisArn: newAnalysis.Arn!,
        analysisName: `analysis-${resourceName}`,
        visualIds: [],
      };
    } else {
      //update QuickSight analysis
      const newAnalysis = await quickSight.updateAnalysis({
        AwsAccountId: awsAccountId,
        AnalysisId: query.analysisId,
        Name: query.analysisName,
        Definition: dashboard as AnalysisDefinition,
      });

      //update QuickSight dashboard
      const newDashboard = await quickSight.updateDashboard({
        AwsAccountId: awsAccountId,
        DashboardId: query.dashboardId,
        Name: query.dashboardName,
        Definition: dashboard,
      });
      const versionNumber = newDashboard.VersionArn?.substring(newDashboard.VersionArn?.lastIndexOf('/') + 1);

      // publish new version
      let cnt = 0;
      for (const _i of Array(60).keys()) {
        cnt += 1;
        try {
          const response = await quickSight.updateDashboardPublishedVersion({
            AwsAccountId: awsAccountId,
            DashboardId: query.dashboardId,
            VersionNumber: Number.parseInt(versionNumber!),
          });

          if (response.DashboardId) {
            break;
          }
        } catch (err: any) {
          if (err instanceof ConflictException ) {
            logger.warn('sleep 100ms to wait updateDashboard finish');
            await sleep(100);
          } else {
            throw err;
          }
        }
      }
      if (cnt >= 60) {
        throw new Error(`publish dashboard new version failed after try ${cnt} times`);
      }

      result = {
        dashboardId: query.dashboardId,
        dashboardArn: newDashboard.Arn!,
        dashboardName: query.dashboardName,
        dashboardVersion: Number.parseInt(versionNumber!),
        analysisId: query.analysisId,
        analysisArn: newAnalysis.Arn!,
        analysisName: query.analysisName,
        visualIds: [],
      };
    }

    return result;
  };

}

