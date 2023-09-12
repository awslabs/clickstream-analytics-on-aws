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
import { AnalysisDefinition, ConflictException, DashboardVersionDefinition, DataSetIdentifierDeclaration, InputColumn } from '@aws-sdk/client-quicksight';
import { BatchExecuteStatementCommand, DescribeStatementCommand, StatusString } from '@aws-sdk/client-redshift-data';
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
  VisualProps,
  getEventLineChartVisualDef,
  getEventPivotTableVisualDef,
  pathAnalysisVisualColumns,
  getPathAnalysisChartVisualDef,
  getRetentionLineChartVisualDef,
  getRetentionPivotTableVisualDef,
  retentionAnalysisVisualColumns,
  VisualMapProps,
  getTempResourceName,
  TEMP_RESOURCE_NAME_PREFIX,
} from './quicksight/reporting-utils';
import { buildEventAnalysisView, buildEventPathAnalysisView, buildFunnelDataSql, buildFunnelView, buildNodePathAnalysisView, buildRetentionAnalysisView } from './quicksight/sql-builder';
import { awsAccountId } from '../common/constants';
import { ExploreRequestAction, ExplorePathNodeType, ExploreTimeScopeType, ExploreVisualName } from '../common/explore-types';
import { logger } from '../common/powertools';
import { SDKClient } from '../common/sdk-client';
import { ApiFail, ApiSuccess } from '../common/types';
import { generateEmbedUrlForRegisteredUser, getClickstreamUserArn } from '../store/aws/quicksight';

const sdkClient: SDKClient = new SDKClient();

export class ReportingServ {

  async createFunnelVisual(req: any, res: any, next: any) {

    try {
      logger.info('start to create funnel analysis visuals');
      logger.info(`request: ${JSON.stringify(req.body)}`);

      const query = req.body;
      const dashboardCreateParameters = query.dashboardCreateParameters as DashboardCreateParameters;

      //construct parameters to build sql
      const viewName = getTempResourceName(query.viewName, query.action);
      const sql = buildFunnelView(query.appId, viewName, {
        schemaName: query.appId,
        computeMethod: query.computeMethod,
        specifyJoinColumn: query.specifyJoinColumn,
        joinColumn: query.joinColumn,
        conversionIntervalType: query.conversionIntervalType,
        conversionIntervalInSeconds: query.conversionIntervalInSeconds,
        eventAndConditions: query.eventAndConditions,
        timeScopeType: query.timeScopeType,
        timeStart: query.timeScopeType === ExploreTimeScopeType.FIXED ? query.timeStart : undefined,
        timeEnd: query.timeScopeType === ExploreTimeScopeType.FIXED ? query.timeEnd : undefined,
        lastN: query.lastN,
        timeUnit: query.timeUnit,
        groupColumn: query.groupColumn,
      });

      logger.debug(`funnel sql: ${sql}`);

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
        timeStart: query.timeScopeType === ExploreTimeScopeType.FIXED ? query.timeStart : undefined,
        timeEnd: query.timeScopeType === ExploreTimeScopeType.FIXED ? query.timeEnd : undefined,
        lastN: query.lastN,
        timeUnit: query.timeUnit,
        groupColumn: query.groupColumn,
      });

      logger.debug(`funnel table chart sql: ${sqlTable}`);

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
        name: ExploreVisualName.CHART,
        visualId: visualId,
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
        name: ExploreVisualName.TABLE,
        visualId: tableVisualId,
        visual: tableVisualDef,
        dataSetIdentifierDeclaration: [],
        ColumnConfigurations: columnConfigurations,
      };

      const result: CreateDashboardResult = await this.create(sheetId, viewName, query, sqls, datasetPropsArray, [visualProps, tableVisualProps]);


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
      const viewName = getTempResourceName(query.viewName, query.action);

      const sql = buildEventAnalysisView(query.appId, viewName, {
        schemaName: query.appId,
        computeMethod: query.computeMethod,
        specifyJoinColumn: query.specifyJoinColumn,
        joinColumn: query.joinColumn,
        conversionIntervalType: query.conversionIntervalType,
        conversionIntervalInSeconds: query.conversionIntervalInSeconds,
        eventAndConditions: query.eventAndConditions,
        timeScopeType: query.timeScopeType,
        timeStart: query.timeScopeType === ExploreTimeScopeType.FIXED ? query.timeStart : undefined,
        timeEnd: query.timeScopeType === ExploreTimeScopeType.FIXED ? query.timeEnd : undefined,
        lastN: query.lastN,
        timeUnit: query.timeUnit,
        groupColumn: query.groupColumn,
      });
      logger.debug(`event analysis sql: ${sql}`);

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
      const visualDef = getEventLineChartVisualDef(visualId, viewName, query.groupColumn);
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
        name: ExploreVisualName.CHART,
        visualId: visualId,
        visual: visualDef,
        dataSetIdentifierDeclaration: [],
        filterControl: visualRelatedParams.filterControl,
        parameterDeclarations: visualRelatedParams.parameterDeclarations,
        filterGroup: visualRelatedParams.filterGroup,
      };

      const tableVisualId = uuidv4();
      const tableVisualDef = getEventPivotTableVisualDef(tableVisualId, viewName, query.groupColumn);

      visualRelatedParams.filterGroup!.ScopeConfiguration!.SelectedSheets!.SheetVisualScopingConfigurations![0].VisualIds!.push(tableVisualId);

      const tableVisualProps = {
        sheetId: sheetId,
        name: ExploreVisualName.TABLE,
        visualId: tableVisualId,
        visual: tableVisualDef,
        dataSetIdentifierDeclaration: [],
      };

      const result: CreateDashboardResult = await this.create(sheetId, viewName, query, sqls, datasetPropsArray, [visualProps, tableVisualProps]);

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
      const dashboardCreateParameters = query.dashboardCreateParameters as DashboardCreateParameters;

      //construct parameters to build sql
      const viewName = getTempResourceName(query.viewName, query.action);
      let sql = '';
      if (query.pathAnalysis.nodeType === ExplorePathNodeType.EVENT) {
        sql = buildEventPathAnalysisView(query.appId, viewName, {
          schemaName: query.appId,
          computeMethod: query.computeMethod,
          specifyJoinColumn: query.specifyJoinColumn,
          joinColumn: query.joinColumn,
          conversionIntervalType: query.conversionIntervalType,
          conversionIntervalInSeconds: query.conversionIntervalInSeconds,
          eventAndConditions: query.eventAndConditions,
          timeScopeType: query.timeScopeType,
          timeStart: query.timeScopeType === ExploreTimeScopeType.FIXED ? query.timeStart : undefined,
          timeEnd: query.timeScopeType === ExploreTimeScopeType.FIXED ? query.timeEnd : undefined,
          lastN: query.lastN,
          timeUnit: query.timeUnit,
          groupColumn: query.groupColumn,
          pathAnalysis: {
            platform: query.pathAnalysis.platform,
            sessionType: query.pathAnalysis.sessionType,
            nodeType: query.pathAnalysis.nodeType,
            lagSeconds: query.pathAnalysis.lagSeconds,
          },
        });
      } else {
        sql = buildNodePathAnalysisView(query.appId, viewName, {
          schemaName: query.appId,
          computeMethod: query.computeMethod,
          specifyJoinColumn: query.specifyJoinColumn,
          joinColumn: query.joinColumn,
          conversionIntervalType: query.conversionIntervalType,
          conversionIntervalInSeconds: query.conversionIntervalInSeconds,
          timeScopeType: query.timeScopeType,
          timeStart: query.timeScopeType === ExploreTimeScopeType.FIXED ? query.timeStart : undefined,
          timeEnd: query.timeScopeType === ExploreTimeScopeType.FIXED ? query.timeEnd : undefined,
          lastN: query.lastN,
          timeUnit: query.timeUnit,
          groupColumn: query.groupColumn,
          pathAnalysis: {
            platform: query.pathAnalysis.platform,
            sessionType: query.pathAnalysis.sessionType,
            nodeType: query.pathAnalysis.nodeType,
            lagSeconds: query.pathAnalysis.lagSeconds,
            nodes: query.pathAnalysis.nodes,
          },
        });
      }
      logger.debug(`path analysis sql: ${sql}`);

      const sqls = [sql];
      sqls.push(`grant select on ${query.appId}.${viewName} to ${dashboardCreateParameters.redshift.user}`);

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
        name: ExploreVisualName.CHART,
        visualId: visualId,
        visual: visualDef,
        dataSetIdentifierDeclaration: [],
        filterControl: visualRelatedParams.filterControl,
        parameterDeclarations: visualRelatedParams.parameterDeclarations,
        filterGroup: visualRelatedParams.filterGroup,
        colSpan: 32,
        rowSpan: 12,
      };

      const result: CreateDashboardResult = await this.create(sheetId, viewName, query, sqls, datasetPropsArray, [visualProps]);

      return res.status(201).json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  };

  async createRetentionVisual(req: any, res: any, next: any) {
    try {
      logger.info('start to create retention analysis visuals');
      logger.info(`request: ${JSON.stringify(req.body)}`);

      const query = req.body;
      const dashboardCreateParameters = query.dashboardCreateParameters as DashboardCreateParameters;

      //construct parameters to build sql
      const viewName = getTempResourceName(query.viewName, query.action);
      const sql = buildRetentionAnalysisView(query.appId, viewName, {
        schemaName: query.appId,
        computeMethod: query.computeMethod,
        specifyJoinColumn: query.specifyJoinColumn,
        joinColumn: query.joinColumn,
        conversionIntervalType: query.conversionIntervalType,
        conversionIntervalInSeconds: query.conversionIntervalInSeconds,
        eventAndConditions: query.eventAndConditions,
        timeScopeType: query.timeScopeType,
        timeStart: query.timeScopeType === ExploreTimeScopeType.FIXED ? query.timeStart : undefined,
        timeEnd: query.timeScopeType === ExploreTimeScopeType.FIXED ? query.timeEnd : undefined,
        lastN: query.lastN,
        timeUnit: query.timeUnit,
        groupColumn: query.groupColumn,
        pairEventAndConditions: query.pairEventAndConditions,
      });
      logger.debug(`retention analysis sql: ${sql}`);

      const sqls = [sql];
      sqls.push(`grant select on ${query.appId}.${viewName} to ${dashboardCreateParameters.redshift.user}`);

      const datasetPropsArray: DataSetProps[] = [];
      datasetPropsArray.push({
        name: '',
        tableName: viewName,
        columns: retentionAnalysisVisualColumns,
        importMode: 'DIRECT_QUERY',
        customSql: `select * from ${query.appId}.${viewName}`,
        projectedColumns: [
          'grouping',
          'start_event_date',
          'event_date',
          'retention',
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
      const visualDef = getRetentionLineChartVisualDef(visualId, viewName);
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
        name: ExploreVisualName.CHART,
        visualId: visualId,
        visual: visualDef,
        dataSetIdentifierDeclaration: [],
        filterControl: visualRelatedParams.filterControl,
        parameterDeclarations: visualRelatedParams.parameterDeclarations,
        filterGroup: visualRelatedParams.filterGroup,
        eventCount: query.eventAndConditions.length,
      };

      const tableVisualId = uuidv4();
      const tableVisualDef = getRetentionPivotTableVisualDef(tableVisualId, viewName);

      visualRelatedParams.filterGroup!.ScopeConfiguration!.SelectedSheets!.SheetVisualScopingConfigurations![0].VisualIds!.push(tableVisualId);

      const tableVisualProps = {
        sheetId: sheetId,
        name: ExploreVisualName.TABLE,
        visualId: tableVisualId,
        visual: tableVisualDef,
        dataSetIdentifierDeclaration: [],
      };

      const result: CreateDashboardResult = await this.create(sheetId, viewName, query, sqls, datasetPropsArray, [visualProps, tableVisualProps]);

      return res.status(201).json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  };

  private async create(sheetId: string, resourceName: string, query: any, sqls: string[],
    datasetPropsArray: DataSetProps[], visualPropsArray: VisualProps[]) {

    const dashboardCreateParameters = query.dashboardCreateParameters as DashboardCreateParameters;
    const redshiftDataClient = sdkClient.RedshiftDataClient(
      {
        region: dashboardCreateParameters.region,
      },
      dashboardCreateParameters.redshift.dataApiRole,
    );
    const quickSight = sdkClient.QuickSight({ region: dashboardCreateParameters.region });
    const principals = await getClickstreamUserArn();

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
    redshiftDataClient.send(params).then( executeResponse => {
      const checkParams = new DescribeStatementCommand({
        Id: executeResponse.Id,
      });
      redshiftDataClient.send(checkParams).then (async(res) => {
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
      }).catch(error => {
        logger.error(error);
      });
    }).catch(error => {
      logger.error(error);
    });

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
      const sid = visualPropsArray[0].sheetId;
      dashboardDef.Sheets![0].SheetId = sid;
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
        Name: `${resourceName}`,
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
        Name: `${resourceName}`,
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
        dashboardName: `${resourceName}`,
        dashboardVersion: Number.parseInt(newDashboard.VersionArn!.substring(newDashboard.VersionArn!.lastIndexOf('/') + 1)),
        analysisId,
        analysisArn: newAnalysis.Arn!,
        analysisName: `${resourceName}`,
        sheetId,
        visualIds: [],
      };
    } else {
      //update QuickSight analysis
      let newAnalysis;
      if (query.analysisId) {
        newAnalysis = await quickSight.updateAnalysis({
          AwsAccountId: awsAccountId,
          AnalysisId: query.analysisId,
          Name: query.analysisName,
          Definition: dashboard as AnalysisDefinition,
        });
      }

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
        analysisArn: newAnalysis?.Arn!,
        analysisName: query.analysisName,
        sheetId,
        visualIds: [],
      };
    }

    for (let visualProps of visualPropsArray) {
      let embedUrl;
      if (query.action === ExploreRequestAction.PREVIEW) {
        const embed = await generateEmbedUrlForRegisteredUser(
          dashboardCreateParameters.region,
          dashboardCreateParameters.allowedDomain,
          false,
          result.dashboardId,
          result.sheetId,
          visualProps.visualId,
        );
        if (embed.EmbedUrl) {
          embedUrl = embed.EmbedUrl;
        }
      }
      const visual: VisualMapProps = {
        name: visualProps.name,
        id: visualProps.visualId,
        embedUrl,
      };

      result.visualIds.push(visual);
    }

    return result;
  };

  async warmup(req: any, res: any, next: any) {
    try {
      logger.info('start to warm up reporting service');
      logger.info(`request: ${JSON.stringify(req.body)}`);

      const projectId = req.body.projectId;
      const appId = req.body.appId;
      const dashboardCreateParameters = req.body.dashboardCreateParameters as DashboardCreateParameters;
      const region = dashboardCreateParameters.region;
      const dataApiRole = dashboardCreateParameters.redshift.dataApiRole;
      const redshiftDataClient = sdkClient.RedshiftDataClient(
        {
          region: region,
        },
        dataApiRole,
      );
      const quickSight = sdkClient.QuickSight({ region: region });

      //warm up redshift serverless
      if (dashboardCreateParameters.redshift.newServerless) {
        const input = {
          Sqls: [`select * from ${appId}.ods_events limit 1`],
          WorkgroupName: dashboardCreateParameters.redshift.newServerless.workgroupName,
          Database: projectId,
          WithEvent: false,
        };

        const params = new BatchExecuteStatementCommand(input);
        const executeResponse = await redshiftDataClient.send(params);

        const checkParams = new DescribeStatementCommand({
          Id: executeResponse.Id,
        });
        let resp = await redshiftDataClient.send(checkParams);
        logger.info(`Get statement status: ${resp.Status}`);
        let count = 0;
        while (resp.Status != StatusString.FINISHED && resp.Status != StatusString.FAILED && count < 60) {
          await sleep(500);
          count++;
          resp = await redshiftDataClient.send(checkParams);
          logger.info(`Get statement status: ${resp.Status}`);
        }
        if (resp.Status == StatusString.FAILED) {
          logger.warn('Warmup redshift serverless with error: '+ resp.Status, JSON.stringify(resp));
        }
      }

      //warm up quicksight
      const dashBoards = await quickSight.listDashboards({
        AwsAccountId: awsAccountId,
      });

      logger.info('end of warm up reporting service');
      return res.status(201).json(new ApiSuccess(dashBoards.DashboardSummaryList));
    } catch (error) {
      next(`Warmup redshift serverless with error: ${error}`);
    }
  };

  async cleanQuickSightResources(req: any, res: any, next: any) {
    try {
      logger.info('start to clean QuickSight temp resources');
      logger.info(`request: ${JSON.stringify(req.body)}`);


      const deletedDashBoards: string[] = [];
      const deletedAnalyses: string[] = [];
      const deletedDatasets: string[] = [];

      const region = req.body.region;
      const quickSight = sdkClient.QuickSight({ region: region });

      const dashBoards = await quickSight.listDashboards({
        AwsAccountId: awsAccountId,
      });

      if (dashBoards.DashboardSummaryList) {
        for (const [_index, dashboard] of dashBoards.DashboardSummaryList.entries()) {
          if (dashboard.Name?.startsWith(TEMP_RESOURCE_NAME_PREFIX) && (new Date().getTime() - dashboard.CreatedTime!.getTime()) > 60*60*1000) {
            const deletedRes = await quickSight.deleteDashboard({
              AwsAccountId: awsAccountId,
              DashboardId: dashboard.DashboardId,
            });
            deletedDashBoards.push(deletedRes.DashboardId!);
            logger.info(`dashboard ${dashboard.Name} removed`);
          }
        }
      }

      const analyses = await quickSight.listAnalyses({
        AwsAccountId: awsAccountId,
      });

      if (analyses.AnalysisSummaryList) {
        for (const [_index, analysis] of analyses.AnalysisSummaryList.entries()) {
          if (analysis.Name?.startsWith(TEMP_RESOURCE_NAME_PREFIX) && (new Date().getTime() - analysis.CreatedTime!.getTime()) > 60*60*1000) {
            const deletedRes = await quickSight.deleteAnalysis({
              AwsAccountId: awsAccountId,
              AnalysisId: analysis.AnalysisId,
            });
            deletedAnalyses.push(deletedRes.AnalysisId!);
            logger.info(`analysis ${analysis.Name} removed`);
          }
        }
      }

      const datasets = await quickSight.listDataSets({
        AwsAccountId: awsAccountId,
      });

      if (datasets.DataSetSummaries) {
        for (const [_index, dataset] of datasets.DataSetSummaries.entries()) {
          if (dataset.Name?.startsWith(TEMP_RESOURCE_NAME_PREFIX) && (new Date().getTime() - dataset.CreatedTime!.getTime()) > 60*60*1000) {
            const deletedRes = await quickSight.deleteDataSet({
              AwsAccountId: awsAccountId,
              DataSetId: dataset.DataSetId,
            });
            deletedDatasets.push(deletedRes.DataSetId!);
            logger.info(`dataset ${dataset.Name} removed`);
          }
        }
      }

      const result = {
        deletedDashBoards,
        deletedAnalyses,
        deletedDatasets,
      };
      logger.info('end of clean QuickSight temp resources');
      return res.status(201).json(new ApiSuccess(result));
    } catch (error) {
      logger.warn(`Clean QuickSight temp resources with warning: ${error}`);
      next(`Clean QuickSight temp resources with warning: ${error}`);
    }
  };

}

