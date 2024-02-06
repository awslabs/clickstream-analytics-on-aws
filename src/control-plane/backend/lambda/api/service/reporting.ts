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
import { AnalysisDefinition, AnalysisSummary, ConflictException, DashboardSummary, DashboardVersionDefinition, DataSetIdentifierDeclaration, DataSetSummary, DayOfWeek, InputColumn, QuickSight, ResourceStatus, ThrottlingException, paginateListAnalyses, paginateListDashboards, paginateListDataSets } from '@aws-sdk/client-quicksight';
import { BatchExecuteStatementCommand, DescribeStatementCommand, StatusString } from '@aws-sdk/client-redshift-data';
import { v4 as uuidv4 } from 'uuid';
import { DataSetProps } from './quicksight/dashboard-ln';
import {
  createDataSet,
  funnelVisualColumns,
  applyChangeToDashboard,
  getDashboardDefinitionFromArn,
  CreateDashboardResult,
  DashboardCreateParameters,
  getFunnelVisualDef,
  getVisualRelatedDefs,
  getFunnelTableVisualRelatedDefs,
  getFunnelTableVisualDef,
  VisualProps,
  getEventChartVisualDef,
  getEventPivotTableVisualDef,
  pathAnalysisVisualColumns,
  getPathAnalysisChartVisualDef,
  getRetentionChartVisualDef,
  getRetentionPivotTableVisualDef,
  retentionAnalysisVisualColumns,
  VisualMapProps,
  getTempResourceName,
  getDashboardTitleProps,
  eventVisualColumns,
  checkFunnelAnalysisParameter,
  checkEventAnalysisParameter,
  checkPathAnalysisParameter,
  checkRetentionAnalysisParameter,
  encodeQueryValueForSql,
} from './quicksight/reporting-utils';
import { SQLParameters, buildEventAnalysisView, buildEventPathAnalysisView, buildFunnelTableView, buildFunnelView, buildNodePathAnalysisView, buildRetentionAnalysisView } from './quicksight/sql-builder';
import { awsAccountId } from '../common/constants';
import { DASHBOARD_READER_PERMISSION_ACTIONS, OUTPUT_DATA_MODELING_REDSHIFT_DATA_API_ROLE_ARN_SUFFIX, OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_NAME, QUICKSIGHT_TEMP_RESOURCE_NAME_PREFIX } from '../common/constants-ln';
import { ExploreLocales, AnalysisType, ExplorePathNodeType, ExploreRequestAction, ExploreTimeScopeType, ExploreVisualName, QuickSightChartType, ExploreComputeMethod } from '../common/explore-types';
import { PipelineStackType } from '../common/model-ln';
import { logger } from '../common/powertools';
import { SDKClient } from '../common/sdk-client';
import { ApiFail, ApiSuccess } from '../common/types';
import { getStackOutputFromPipelineStatus } from '../common/utils';
import { sleep } from '../common/utils-ln';
import { QuickSightUserArns, generateEmbedUrlForRegisteredUser, getClickstreamUserArn, waitDashboardSuccess } from '../store/aws/quicksight';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const sdkClient: SDKClient = new SDKClient();
const store: ClickStreamStore = new DynamoDbStore();

export class ReportingService {

  async createFunnelVisual(req: any, res: any, next: any) {

    try {
      logger.info('start to create funnel analysis visuals', { request: req.body });

      const query = req.body;
      const checkResult = checkFunnelAnalysisParameter(query);
      if (!checkResult.success) {
        logger.debug(checkResult.message);
        return res.status(400).json(new ApiFail(checkResult.message));
      }

      encodeQueryValueForSql(query as SQLParameters);

      //construct parameters to build sql
      const viewName = getTempResourceName(query.viewName, query.action);
      const sql = buildFunnelView({
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
        groupCondition: query.groupCondition,
        globalEventCondition: query.globalEventCondition,
      }, query.chartType === QuickSightChartType.BAR);

      logger.debug(`funnel sql: ${sql}`);

      const tableVisualViewName = viewName + '_tab';
      const sqlTable = buildFunnelTableView({
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
        groupCondition: query.groupCondition,
        globalEventCondition: query.globalEventCondition,
      });

      logger.debug(`funnel table chart sql: ${sqlTable}`);

      let sheetId;
      if (!query.dashboardId) {
        sheetId = uuidv4();
      } else {
        if (!query.sheetId) {
          return res.status(400).send(new ApiFail('missing required parameter sheetId'));
        }
        sheetId = query.sheetId;
      }

      const result = await this._buildFunnelQuickSightDashboard(viewName, sql, tableVisualViewName,
        sqlTable, query, sheetId, query.computeMethod);
      if (result.dashboardEmbedUrl === '' && query.action === ExploreRequestAction.PREVIEW) {
        return res.status(500).json(new ApiFail('Failed to create resources, please try again later.'));
      }
      return res.status(201).json(new ApiSuccess(result));

    } catch (error) {
      next(error);
    }
  };

  private async _buildFunnelQuickSightDashboard(viewName: string, sql: string, tableVisualViewName: string,
    sqlTable: string, query: any, sheetId: string, computeMethod: ExploreComputeMethod) {

    const datasetColumns = [...funnelVisualColumns];
    const visualProjectedColumns = [
      'event_name',
      'event_date',
    ];

    let countColName = 'event_id';
    if (computeMethod === ExploreComputeMethod.EVENT_CNT) {
      datasetColumns.push({
        Name: 'event_id',
        Type: 'STRING',
      });
      visualProjectedColumns.push('event_id');
    } else {
      datasetColumns.push({
        Name: 'user_pseudo_id',
        Type: 'STRING',
      });
      visualProjectedColumns.push('user_pseudo_id');
      countColName = 'user_pseudo_id';
    }

    const hasGrouping = query.chartType == QuickSightChartType.BAR && query.groupCondition !== undefined;
    if (hasGrouping) {
      datasetColumns.push({
        Name: 'group_col',
        Type: 'STRING',
      });

      visualProjectedColumns.push('group_col');
    }

    //create quicksight dataset
    const datasetPropsArray: DataSetProps[] = [];
    datasetPropsArray.push({
      tableName: viewName,
      columns: datasetColumns,
      importMode: 'DIRECT_QUERY',
      customSql: sql,
      projectedColumns: visualProjectedColumns,
    });

    const projectedColumns: string[] = [query.groupColumn];
    const tableViewCols: InputColumn[] = [{
      Name: query.groupColumn,
      Type: 'STRING',
    }];

    let groupingConditionCol = '';
    if (query.groupCondition !== undefined) {
      groupingConditionCol = query.groupCondition.property;
      tableViewCols.push({
        Name: groupingConditionCol,
        Type: 'STRING',
      });

      projectedColumns.push(groupingConditionCol);
    }

    const maxIndex = query.eventAndConditions.length - 1;
    for (const [index, item] of query.eventAndConditions.entries()) {
      projectedColumns.push(`${item.eventName}`);
      tableViewCols.push({
        Name: item.eventName,
        Type: 'DECIMAL',
      });

      if (index === 0) {
        continue;
      }
      if (index === maxIndex) {
        projectedColumns.push('total_conversion_rate');
        tableViewCols.push({
          Name: 'total_conversion_rate',
          Type: 'DECIMAL',
        });
      }
      projectedColumns.push(`${item.eventName}_rate`);
      tableViewCols.push({
        Name: `${item.eventName}_rate`,
        Type: 'DECIMAL',
      });

    }
    datasetPropsArray.push({
      tableName: tableVisualViewName,
      columns: tableViewCols,
      importMode: 'DIRECT_QUERY',
      customSql: sqlTable,
      projectedColumns: ['event_date'].concat(projectedColumns),
    });

    const visualId = uuidv4();
    const locale = query.locale ?? ExploreLocales.EN_US;
    const titleProps = await getDashboardTitleProps(AnalysisType.FUNNEL, query);
    const quickSightChartType = query.chartType;
    const visualDef = getFunnelVisualDef(visualId, viewName, titleProps, quickSightChartType, query.groupColumn, hasGrouping, countColName);
    const visualRelatedParams = await getVisualRelatedDefs({
      timeScopeType: query.timeScopeType,
      sheetId,
      visualId,
      viewName,
      lastN: query.lastN,
      timeUnit: query.timeUnit,
      timeStart: query.timeStart,
      timeEnd: query.timeEnd,
    }, locale);

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
      colSpan: quickSightChartType === QuickSightChartType.FUNNEL ? 20: undefined,
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
    const tableVisualDef = getFunnelTableVisualDef(tableVisualId, tableVisualViewName, eventNames, titleProps,
      query.groupColumn, groupingConditionCol);
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

    return this.createDashboardVisuals(sheetId, viewName, query, datasetPropsArray, [visualProps, tableVisualProps]);
  }

  async createEventVisual(req: any, res: any, next: any) {
    try {
      logger.info('start to create event analysis visuals', { request: req.body });

      const query = req.body;
      const checkResult = checkEventAnalysisParameter(query);
      if (!checkResult.success) {
        logger.debug(checkResult.message);
        return res.status(400).json(new ApiFail(checkResult.message));
      }

      encodeQueryValueForSql(query as SQLParameters);

      //construct parameters to build sql
      const viewName = getTempResourceName(query.viewName, query.action);

      const sql = buildEventAnalysisView({
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
        groupCondition: query.groupCondition,
        globalEventCondition: query.globalEventCondition,
      });
      logger.debug(`event analysis sql: ${sql}`);

      const hasGrouping = query.groupCondition !== undefined;
      const projectedColumns = ['event_date', 'event_name', 'id'];
      const datasetColumns = [...eventVisualColumns];
      if (hasGrouping) {
        datasetColumns.push({
          Name: 'group_col',
          Type: 'STRING',
        });

        projectedColumns.push('group_col');
      }

      const datasetPropsArray: DataSetProps[] = [];
      datasetPropsArray.push({
        tableName: viewName,
        columns: datasetColumns,
        importMode: 'DIRECT_QUERY',
        customSql: sql,
        projectedColumns,
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

      const locale = query.locale ?? ExploreLocales.EN_US;
      const visualId = uuidv4();
      const titleProps = await getDashboardTitleProps(AnalysisType.EVENT, query);
      const quickSightChartType = query.chartType;
      const visualDef = getEventChartVisualDef(visualId, viewName, titleProps, quickSightChartType, query.groupColumn, hasGrouping);
      const visualRelatedParams = await getVisualRelatedDefs({
        timeScopeType: query.timeScopeType,
        sheetId,
        visualId,
        viewName,
        lastN: query.lastN,
        timeUnit: query.timeUnit,
        timeStart: query.timeStart,
        timeEnd: query.timeEnd,
      }, locale);

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
      const tableVisualDef = getEventPivotTableVisualDef(tableVisualId, viewName, titleProps, query.groupColumn, hasGrouping);

      visualRelatedParams.filterGroup!.ScopeConfiguration!.SelectedSheets!.SheetVisualScopingConfigurations![0].VisualIds!.push(tableVisualId);

      const tableVisualProps = {
        sheetId: sheetId,
        name: ExploreVisualName.TABLE,
        visualId: tableVisualId,
        visual: tableVisualDef,
        dataSetIdentifierDeclaration: [],
      };

      const result: CreateDashboardResult = await this.createDashboardVisuals(
        sheetId, viewName, query, datasetPropsArray, [visualProps, tableVisualProps]);

      if (result.dashboardEmbedUrl === '' && query.action === ExploreRequestAction.PREVIEW) {
        return res.status(500).json(new ApiFail('Failed to create resources, please try again later.'));
      }
      return res.status(201).json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  };

  private _buildSqlForPathAnalysis(query: any) {
    if (query.pathAnalysis.nodeType === ExplorePathNodeType.EVENT) {
      return buildEventPathAnalysisView({
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
          includingOtherEvents: query.pathAnalysis.includingOtherEvents,
          mergeConsecutiveEvents: query.pathAnalysis.mergeConsecutiveEvents,
        },
        groupCondition: query.groupCondition,
        globalEventCondition: query.globalEventCondition,
      });
    }

    return buildNodePathAnalysisView({
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
        includingOtherEvents: query.pathAnalysis.includingOtherEvents,
        mergeConsecutiveEvents: query.pathAnalysis.mergeConsecutiveEvents,
      },
      groupCondition: query.groupCondition,
      globalEventCondition: query.globalEventCondition,
    });
  }

  async createPathAnalysisVisual(req: any, res: any, next: any) {
    try {
      logger.info('start to create path analysis visuals', { request: req.body });

      const query = req.body;
      const checkResult = checkPathAnalysisParameter(query);
      if (!checkResult.success) {
        logger.debug(checkResult.message);
        return res.status(400).json(new ApiFail(checkResult.message));
      }

      encodeQueryValueForSql(query as SQLParameters);

      //construct parameters to build sql
      const viewName = getTempResourceName(query.viewName, query.action);
      let sql = this._buildSqlForPathAnalysis(query);
      logger.debug(`path analysis sql: ${sql}`);

      const datasetPropsArray: DataSetProps[] = [];
      datasetPropsArray.push({
        tableName: viewName,
        columns: pathAnalysisVisualColumns,
        importMode: 'DIRECT_QUERY',
        customSql: sql,
        projectedColumns: [
          'event_date',
          'source',
          'target',
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

      const titleProps = await getDashboardTitleProps(AnalysisType.PATH, query);
      const visualId = uuidv4();
      const locale = query.locale ?? ExploreLocales.EN_US;
      const visualDef = getPathAnalysisChartVisualDef(visualId, viewName, titleProps);
      const visualRelatedParams = await getVisualRelatedDefs({
        timeScopeType: query.timeScopeType,
        sheetId,
        visualId,
        viewName,
        lastN: query.lastN,
        timeUnit: query.timeUnit,
        timeStart: query.timeStart,
        timeEnd: query.timeEnd,
      }, locale);

      const visualProps: VisualProps = {
        sheetId: sheetId,
        name: ExploreVisualName.CHART,
        visualId: visualId,
        visual: visualDef,
        dataSetIdentifierDeclaration: [],
        filterControl: visualRelatedParams.filterControl,
        parameterDeclarations: visualRelatedParams.parameterDeclarations,
        filterGroup: visualRelatedParams.filterGroup,
      };

      const result: CreateDashboardResult = await this.createDashboardVisuals(
        sheetId, viewName, query, datasetPropsArray, [visualProps]);

      if (result.dashboardEmbedUrl === '' && query.action === ExploreRequestAction.PREVIEW) {
        return res.status(500).json(new ApiFail('Failed to create resources, please try again later.'));
      }
      return res.status(201).json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  };

  async createRetentionVisual(req: any, res: any, next: any) {
    try {
      logger.info('start to create retention analysis visuals', { request: req.body });

      const query = req.body;
      const checkResult = checkRetentionAnalysisParameter(query);
      if (!checkResult.success) {
        logger.debug(checkResult.message);
        return res.status(400).json(new ApiFail(checkResult.message));
      }

      encodeQueryValueForSql(query as SQLParameters);

      //construct parameters to build sql
      const viewName = getTempResourceName(query.viewName, query.action);
      const sql = buildRetentionAnalysisView({
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
        groupCondition: query.groupCondition,
        globalEventCondition: query.globalEventCondition,
      });
      logger.debug(`retention analysis sql: ${sql}`);

      const hasGrouping = query.groupCondition !== undefined;
      const projectedColumns = [
        'grouping',
        'start_event_date',
        'event_date',
        'retention',
      ];
      const datasetColumns = [...retentionAnalysisVisualColumns];
      if (hasGrouping) {
        datasetColumns.push({
          Name: 'group_col',
          Type: 'STRING',
        });

        projectedColumns.push('group_col');
      }

      const datasetPropsArray: DataSetProps[] = [];
      datasetPropsArray.push({
        tableName: viewName,
        columns: datasetColumns,
        importMode: 'DIRECT_QUERY',
        customSql: sql,
        projectedColumns,
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

      const titleProps = await getDashboardTitleProps(AnalysisType.RETENTION, query);
      const visualId = uuidv4();
      const locale = query.locale ?? ExploreLocales.EN_US;
      const quickSightChartType = query.chartType;
      const visualDef = getRetentionChartVisualDef(visualId, viewName, titleProps, quickSightChartType, hasGrouping);
      const visualRelatedParams = await getVisualRelatedDefs({
        timeScopeType: query.timeScopeType,
        sheetId,
        visualId,
        viewName,
        lastN: query.lastN,
        timeUnit: query.timeUnit,
        timeStart: query.timeStart,
        timeEnd: query.timeEnd,
      }, locale);

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
      const tableVisualDef = getRetentionPivotTableVisualDef(tableVisualId, viewName, titleProps, hasGrouping);

      visualRelatedParams.filterGroup!.ScopeConfiguration!.SelectedSheets!.SheetVisualScopingConfigurations![0].VisualIds!.push(tableVisualId);

      const tableVisualProps = {
        sheetId: sheetId,
        name: ExploreVisualName.TABLE,
        visualId: tableVisualId,
        visual: tableVisualDef,
        dataSetIdentifierDeclaration: [],
      };

      const result: CreateDashboardResult = await this.createDashboardVisuals(
        sheetId, viewName, query, datasetPropsArray, [visualProps, tableVisualProps]);

      if (result.dashboardEmbedUrl === '' && query.action === ExploreRequestAction.PREVIEW) {
        return res.status(500).json(new ApiFail('Failed to create resources, please try again later.'));
      }
      return res.status(201).json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  };

  public async createDashboardVisuals(sheetId: string, resourceName: string, query: any,
    datasetPropsArray: DataSetProps[], visualPropsArray: VisualProps[]) {

    const dashboardCreateParameters = query.dashboardCreateParameters as DashboardCreateParameters;
    const quickSight = sdkClient.QuickSight({ region: dashboardCreateParameters.region });
    const principals = await getClickstreamUserArn();

    //create quicksight dataset
    const dataSetIdentifierDeclaration: DataSetIdentifierDeclaration[] = [];
    for (const datasetProps of datasetPropsArray) {
      const datasetOutput = await createDataSet(
        quickSight, awsAccountId!,
        principals.publishUserArn,
        dashboardCreateParameters.quickSight.dataSourceArn,
        datasetProps,
        query.action as ExploreRequestAction,
      );

      dataSetIdentifierDeclaration.push({
        Identifier: datasetProps.tableName,
        DataSetArn: datasetOutput?.Arn,
      });

      logger.info('created dataset:', { arn: datasetOutput?.Arn });
    }

    visualPropsArray[0].dataSetIdentifierDeclaration.push(...dataSetIdentifierDeclaration);

    logger.info('Got first element of visual props', { visualPropsArray: visualPropsArray[0] });

    const result = await this._buildDashboard(query, visualPropsArray, quickSight,
      sheetId, resourceName, principals, dashboardCreateParameters);
    for (let visualProps of visualPropsArray) {
      const visual: VisualMapProps = {
        name: visualProps.name,
        id: visualProps.visualId,
      };
      result.visualIds.push(visual);
    }

    return result;
  };

  private async _buildDashboard(query: any, visualPropsArray: VisualProps[], quickSight: QuickSight,
    sheetId: string, resourceName: string, principals: QuickSightUserArns,
    dashboardCreateParameters: DashboardCreateParameters) {
    // generate dashboard definition
    let dashboardDef: DashboardVersionDefinition;
    let dashboardName: string | undefined;
    if (!query.dashboardId) {
      dashboardDef = JSON.parse(readFileSync(join(__dirname, './quicksight/templates/dashboard.json')).toString()) as DashboardVersionDefinition;
      const sid = visualPropsArray[0].sheetId;
      dashboardDef.Sheets![0].SheetId = sid;
      dashboardDef.Sheets![0].Name = query.sheetName ?? 'sheet1';
      dashboardDef.Options!.WeekStart = DayOfWeek.MONDAY;
    } else {
      const dashboardDefProps = await getDashboardDefinitionFromArn(quickSight, awsAccountId!, query.dashboardId);
      dashboardDef = dashboardDefProps.def;
      dashboardName = dashboardDefProps.name;
      if (dashboardDef.Options === undefined) {
        dashboardDef.Options = {};
      }
      dashboardDef.Options.WeekStart = DayOfWeek.MONDAY;
    }

    const dashboard = applyChangeToDashboard({
      action: 'ADD',
      requestAction: query.action,
      visuals: visualPropsArray,
      dashboardDef: dashboardDef,
    });
    logger.info('final dashboard def:', { dashboard });

    let result: CreateDashboardResult;
    if (!query.dashboardId) {
      //create QuickSight analysis
      result = await this._createDashboard(quickSight, resourceName, principals, dashboard,
        query, dashboardCreateParameters, sheetId);
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
        Name: dashboardName,
        Definition: dashboard,
      });
      const versionNumber = newDashboard.VersionArn?.substring(newDashboard.VersionArn?.lastIndexOf('/') + 1);

      // publish new version
      await this._publishNewVersionDashboard(quickSight, query, versionNumber!);

      result = {
        dashboardId: query.dashboardId,
        dashboardArn: newDashboard.Arn!,
        dashboardName: query.dashboardName,
        dashboardVersion: Number.parseInt(versionNumber!),
        dashboardEmbedUrl: '',
        analysisId: query.analysisId,
        analysisArn: newAnalysis?.Arn!,
        analysisName: query.analysisName,
        sheetId,
        visualIds: [],
      };
    }
    return result;
  }

  private async _publishNewVersionDashboard(quickSight: QuickSight, query: any,
    versionNumber: string) {
    let cnt = 0;
    for (const _i of Array(100).keys()) {
      cnt += 1;
      try {
        const response = await quickSight.updateDashboardPublishedVersion({
          AwsAccountId: awsAccountId,
          DashboardId: query.dashboardId,
          VersionNumber: Number.parseInt(versionNumber),
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
    if (cnt >= 100) {
      throw new Error(`publish dashboard new version failed after try ${cnt} times`);
    }
  }

  private async _createDashboard(quickSight: QuickSight, resourceName: string, principals: QuickSightUserArns,
    dashboard: DashboardVersionDefinition, query: any, dashboardCreateParameters: DashboardCreateParameters, sheetId: string) {
    const analysisId = `${QUICKSIGHT_TEMP_RESOURCE_NAME_PREFIX}${uuidv4()}`;
    const newAnalysis = await quickSight.createAnalysis({
      AwsAccountId: awsAccountId,
      AnalysisId: analysisId,
      Name: `${resourceName}`,
      Definition: dashboard as AnalysisDefinition,
    });

    //create QuickSight dashboard
    const dashboardId = `${QUICKSIGHT_TEMP_RESOURCE_NAME_PREFIX}${uuidv4()}`;
    const newDashboard = await quickSight.createDashboard({
      AwsAccountId: awsAccountId,
      DashboardId: dashboardId,
      Name: `${resourceName}`,
      Definition: dashboard,
      Permissions: [{
        Principal: principals.publishUserArn,
        Actions: DASHBOARD_READER_PERMISSION_ACTIONS,
      }],
    });

    let dashboardEmbedUrl = '';
    if (query.action === ExploreRequestAction.PREVIEW) {
      const dashboardSuccess = await waitDashboardSuccess(dashboardCreateParameters.region, dashboardId);
      if (dashboardSuccess) {
        const embedUrl = await generateEmbedUrlForRegisteredUser(
          dashboardCreateParameters.region,
          dashboardCreateParameters.allowedDomain,
          dashboardId,
        );
        dashboardEmbedUrl = embedUrl.EmbedUrl!;
      }
    }
    const result = {
      dashboardId,
      dashboardArn: newDashboard.Arn!,
      dashboardName: `${resourceName}`,
      dashboardVersion: Number.parseInt(newDashboard.VersionArn!.substring(newDashboard.VersionArn!.lastIndexOf('/') + 1)),
      dashboardEmbedUrl: dashboardEmbedUrl,
      analysisId,
      analysisArn: newAnalysis.Arn!,
      analysisName: `${resourceName}`,
      sheetId,
      visualIds: [],
    };
    return result;
  }

  async warmup(req: any, res: any, next: any) {
    try {
      logger.info('start to warm up reporting service', { request: req.body });

      const projectId = req.body.projectId;
      const appId = req.body.appId;
      const region = req.body.region;

      const latestPipelines = await store.listPipeline(projectId, 'latest', 'asc');
      if (latestPipelines.length === 0) {
        return res.status(404).send(new ApiFail('Pipeline not found'));
      }
      const latestPipeline = latestPipelines[0];
      const dataApiRole = getStackOutputFromPipelineStatus(
        latestPipeline.stackDetails ?? latestPipeline.status?.stackDetails,
        PipelineStackType.DATA_MODELING_REDSHIFT,
        OUTPUT_DATA_MODELING_REDSHIFT_DATA_API_ROLE_ARN_SUFFIX);
      const redshiftDataClient = sdkClient.RedshiftDataClient(
        {
          region: region,
        },
        dataApiRole,
      );
      const quickSight = sdkClient.QuickSight({ region: region });

      //warmup principal
      await getClickstreamUserArn();

      //warm up redshift serverless
      if (latestPipeline.dataModeling?.redshift?.newServerless) {
        const workgroupName = getStackOutputFromPipelineStatus(
          latestPipeline.stackDetails ?? latestPipeline.status?.stackDetails,
          PipelineStackType.DATA_MODELING_REDSHIFT,
          OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_NAME);
        const input = {
          Sqls: [`select * from ${appId}.event limit 1`],
          WorkgroupName: workgroupName,
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
          logger.warn('Warmup redshift serverless with error,', {
            status: resp.Status,
            response: resp,
          });
        }
      }

      //warm up quicksight
      await quickSight.listDashboards({
        AwsAccountId: awsAccountId,
      });

      logger.info('end of warm up reporting service');
      return res.status(201).json(new ApiSuccess('OK'));
    } catch (error) {
      logger.warn(`Warmup redshift serverless with error: ${error}`);
      next(error);
    }
  };

  async cleanQuickSightResources(req: any, res: any, next: any) {
    try {
      logger.info('start to clean QuickSight temp resources', { request: req.body });

      const region = req.body.region;
      const quickSight = sdkClient.QuickSight({ region: region });

      const deletedDashBoards = await _cleanedDashboard(quickSight);

      const deletedAnalyses = await _cleanAnalyses(quickSight);

      const deletedDatasets = await _cleanDatasets(quickSight);

      const result = {
        deletedDashBoards,
        deletedAnalyses,
        deletedDatasets,
      };
      logger.info('end of clean QuickSight temp resources');
      return res.status(201).json(new ApiSuccess(result));
    } catch (error) {
      logger.warn(`Clean QuickSight temp resources with warning: ${error}`);
      if ( error instanceof ThrottlingException) {
        return res.status(201).json(new ApiSuccess(null, 'resource cleaning finished with error'));
      }
      next(error);
    }
  };

}

async function _cleanDatasets(quickSight: QuickSight) {
  const deletedDatasets: string[] = [];

  const dataSetSummaries: DataSetSummary[] = [];
  for await (const page of paginateListDataSets({ client: quickSight }, {
    AwsAccountId: awsAccountId,
  })) {
    if (page.DataSetSummaries !== undefined) {
      dataSetSummaries.push(...page.DataSetSummaries);
    }
  }

  for (const dataSetSummary of dataSetSummaries) {
    if (
      dataSetSummary.DataSetId?.startsWith(QUICKSIGHT_TEMP_RESOURCE_NAME_PREFIX)
      && dataSetSummary.CreatedTime !== undefined
      && (new Date().getTime() - dataSetSummary.CreatedTime.getTime()) > 60 * 60 * 1000
    ) {
      const dataSetId = dataSetSummary.DataSetId;
      logger.info(`deleting data set: ${ dataSetId }`);
      const deletedRes = await quickSight.deleteDataSet({
        AwsAccountId: awsAccountId,
        DataSetId: dataSetId,
      });
      deletedDatasets.push(deletedRes.DataSetId!);
      logger.info(`dataset ${dataSetSummary.Name} removed`);
    }
  }

  return deletedDatasets;
}

async function _cleanAnalyses(quickSight: QuickSight) {
  const deletedAnalyses: string[] = [];

  const analysisSummaries: AnalysisSummary[] = [];
  for await (const page of paginateListAnalyses({ client: quickSight }, {
    AwsAccountId: awsAccountId,
  })) {
    if (page.AnalysisSummaryList !== undefined) {
      analysisSummaries.push(...page.AnalysisSummaryList);
    }
  }

  for (const analysisSummary of analysisSummaries) {
    const analysisId = analysisSummary.AnalysisId;
    if (analysisSummary.Status !== ResourceStatus.DELETED
      && analysisSummary.CreatedTime !== undefined
      && analysisSummary.AnalysisId?.startsWith(QUICKSIGHT_TEMP_RESOURCE_NAME_PREFIX) &&
      (new Date().getTime() - analysisSummary.CreatedTime.getTime()) > 60 * 60 * 1000
    ) {
      await quickSight.deleteAnalysis({
        AwsAccountId: awsAccountId,
        AnalysisId: analysisId,
        ForceDeleteWithoutRecovery: true,
      });
      deletedAnalyses.push(analysisId!);
      logger.info(`analysis ${analysisSummary.Name} removed`);
    }
  }

  return deletedAnalyses;
}

async function _cleanedDashboard(quickSight: QuickSight) {
  const deletedDashBoards: string[] = [];

  const dashboardSummaries: DashboardSummary[] = [];
  for await (const page of paginateListDashboards({ client: quickSight }, {
    AwsAccountId: awsAccountId,
  })) {
    if (page.DashboardSummaryList !== undefined) {
      dashboardSummaries.push(...page.DashboardSummaryList);
    }
  }

  for (const dashboardSummary of dashboardSummaries) {
    const dashboardId = dashboardSummary.DashboardId;
    if (dashboardSummary.DashboardId?.startsWith(QUICKSIGHT_TEMP_RESOURCE_NAME_PREFIX)
      && dashboardSummary.CreatedTime !== undefined
      && (new Date().getTime() - dashboardSummary.CreatedTime.getTime()) > 60 * 60 * 1000
    ) {
      await quickSight.deleteDashboard({
        AwsAccountId: awsAccountId,
        DashboardId: dashboardId,
      });
      deletedDashBoards.push(dashboardId!);
      logger.info(`dashboard ${dashboardSummary.Name} removed`);
    }
  }

  return deletedDashBoards;
}
