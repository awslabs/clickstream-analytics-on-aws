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
  DASHBOARD_READER_PERMISSION_ACTIONS,
  OUTPUT_DATA_MODELING_REDSHIFT_DATA_API_ROLE_ARN_SUFFIX,
  OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_NAME,
  QUICKSIGHT_TEMP_RESOURCE_NAME_PREFIX,
  ExploreLocales,
  AnalysisType,
  ExplorePathNodeType,
  ExploreRequestAction,
  ExploreTimeScopeType,
  ExploreVisualName,
  QuickSightChartType,
  ExploreComputeMethod,

} from '@aws/clickstream-base-lib';
import { AnalysisDefinition, AnalysisSummary, ConflictException, DashboardSummary, DashboardVersionDefinition, DataSetIdentifierDeclaration, DataSetSummary, DayOfWeek, InputColumn, QuickSight, ResourceStatus, ThrottlingException, Visual, paginateListAnalyses, paginateListDashboards, paginateListDataSets } from '@aws-sdk/client-quicksight';
import { BatchExecuteStatementCommand, DescribeStatementCommand, StatusString } from '@aws-sdk/client-redshift-data';
import { v4 as uuidv4 } from 'uuid';
import { PipelineServ } from './pipeline';
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
  getEventNormalTableVisualDef,
  getEventPropertyCountPivotTableVisualDef,
  DashboardTitleProps,
} from './quicksight/reporting-utils';
import { EventAndCondition, EventComputeMethodsProps, SQLParameters, buildColNameWithPrefix, buildEventAnalysisView, buildEventPathAnalysisView, buildEventPropertyAnalysisView, buildFunnelTableView, buildFunnelView, buildNodePathAnalysisView, buildRetentionAnalysisView, getComputeMethodProps } from './quicksight/sql-builder';
import { FULL_SOLUTION_VERSION, awsAccountId } from '../common/constants';
import { PipelineStackType } from '../common/model-ln';
import { logger } from '../common/powertools';
import { SDKClient } from '../common/sdk-client';
import { SolutionVersion } from '../common/solution-info-ln';
import { ApiFail, ApiSuccess } from '../common/types';
import { getStackOutputFromPipelineStatus } from '../common/utils';
import { sleep } from '../common/utils-ln';
import { IPipeline } from '../model/pipeline';
import { QuickSightUserArns, deleteExploreUser, generateEmbedUrlForRegisteredUser, getClickstreamUserArn, waitDashboardSuccess } from '../store/aws/quicksight';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const sdkClient: SDKClient = new SDKClient();
const store: ClickStreamStore = new DynamoDbStore();
const pipelineServ: PipelineServ = new PipelineServ();

interface BuildDashboardProps {
  query: any;
  visualPropsArray: VisualProps[];
  quickSight: QuickSight;
  sheetId: string;
  resourceName: string;
  principals: QuickSightUserArns;
  dashboardCreateParameters: DashboardCreateParameters;
  templateVersion: string;
}

interface CreateDashboardProps {
  quickSight: QuickSight;
  resourceName: string;
  principals: QuickSightUserArns;
  dashboard: DashboardVersionDefinition;
  query: any;
  dashboardCreateParameters: DashboardCreateParameters;
  sheetId: string;
  templateVersion: string;
}

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
      const sqlParameters = {
        ...query,
        schemaName: query.appId,
        dbName: query.projectId,
        timeStart: query.timeScopeType === ExploreTimeScopeType.FIXED ? query.timeStart : undefined,
        timeEnd: query.timeScopeType === ExploreTimeScopeType.FIXED ? query.timeEnd : undefined,
      };
      const sql = buildFunnelView(sqlParameters, query.chartType === QuickSightChartType.BAR);

      logger.debug(`funnel sql: ${sql}`);

      const tableVisualViewName = viewName + '_tab';
      const sqlTable = buildFunnelTableView(sqlParameters);

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
      projectedColumns.push(`${index+1}_${item.eventName}`);
      tableViewCols.push({
        Name: `${index+1}_${item.eventName}`,
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
      projectedColumns.push(`${index+1}_${item.eventName}_rate`);
      tableViewCols.push({
        Name: `${index+1}_${item.eventName}_rate`,
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

    visualRelatedParams.filterGroup?.ScopeConfiguration?.SelectedSheets?.SheetVisualScopingConfigurations?.[0].VisualIds?.push(tableVisualId);

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
      const query = req.body;
      const checkResult = checkEventAnalysisParameter(query);
      if (!checkResult.success) {
        logger.debug(checkResult.message);
        return res.status(400).json(new ApiFail(checkResult.message));
      }

      encodeQueryValueForSql(query as SQLParameters);
      const eventAndConditions = query.eventAndConditions as EventAndCondition[];
      let hasComputeOnProperty = false;
      for (const item of eventAndConditions) {
        if (item.computeMethod === ExploreComputeMethod.COUNT_PROPERTY || item.computeMethod === ExploreComputeMethod.AGGREGATION_PROPERTY) {
          hasComputeOnProperty = true;
          break;
        }
      }

      if (hasComputeOnProperty) {
        return await this.createEventVisualOnEventProperty(req, res, next);
      } else {
        return await this.createEventVisualOnEvent(req, res, next);
      }

    } catch (error) {
      next(error);
    }
  };

  private _getProjectColumnsAndDatasetColumns(computeMethodProps: EventComputeMethodsProps, groupingColName?: string) {
    const projectedColumns = ['event_date', 'event_name'];
    const datasetColumns: InputColumn[] = [
      {
        Name: 'event_date',
        Type: 'DATETIME',
      },
      {
        Name: 'event_name',
        Type: 'STRING',
      },
    ];

    if (groupingColName != undefined) {
      datasetColumns.push({
        Name: groupingColName,
        Type: 'STRING',
      });

      projectedColumns.push(groupingColName);
    }

    if (!computeMethodProps.isMixedMethod) {
      if (computeMethodProps.hasAggregationPropertyMethod) {
        if (!computeMethodProps.isSameAggregationMethod) {
          datasetColumns.push({
            Name: 'custom_attr_id',
            Type: 'STRING',
          });
          projectedColumns.push('custom_attr_id');
          datasetColumns.push({
            Name: 'count/aggregation amount',
            Type: 'DECIMAL',
          });
          projectedColumns.push('count/aggregation amount');
        } else {
          datasetColumns.push({
            Name: 'id',
            Type: 'DECIMAL',
          });
          projectedColumns.push('id');
        }
      } else {
        datasetColumns.push({
          Name: 'id',
          Type: 'STRING',
        });
        projectedColumns.push('id');
        datasetColumns.push({
          Name: 'custom_attr_id',
          Type: 'STRING',
        });
        projectedColumns.push('custom_attr_id');
      }
    } else {
      if (computeMethodProps.isCountMixedMethod) {
        datasetColumns.push({
          Name: 'id',
          Type: 'STRING',
        });
        projectedColumns.push('id');
        datasetColumns.push({
          Name: 'custom_attr_id',
          Type: 'STRING',
        });
        projectedColumns.push('custom_attr_id');
      } else {
        datasetColumns.push({
          Name: 'custom_attr_id',
          Type: 'STRING',
        });
        projectedColumns.push('custom_attr_id');
        datasetColumns.push({
          Name: 'count/aggregation amount',
          Type: 'DECIMAL',
        });
        projectedColumns.push('count/aggregation amount');
      }
    }

    return {
      projectedColumns,
      datasetColumns,
    };
  }

  async createEventVisualOnEvent(req: any, res: any, next: any) {
    try {
      logger.info('start to create event analysis visuals', { request: req.body });

      const query = req.body;

      //construct parameters to build sql
      const viewName = getTempResourceName(query.viewName, query.action);

      const sqlParameters = {
        ...query,
        schemaName: query.appId,
        dbName: query.projectId,
        timeStart: query.timeScopeType === ExploreTimeScopeType.FIXED ? query.timeStart : undefined,
        timeEnd: query.timeScopeType === ExploreTimeScopeType.FIXED ? query.timeEnd : undefined,
      };

      const sql = buildEventAnalysisView(sqlParameters);
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
        projectedColumns: projectedColumns,
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

      visualRelatedParams.filterGroup?.ScopeConfiguration?.SelectedSheets?.SheetVisualScopingConfigurations?.[0].VisualIds?.push(tableVisualId);

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

  async _getVisualDefOfEventVisualOnEventProperty(computeMethodProps: EventComputeMethodsProps,
    tableVisualId: string, viewName: string, titleProps:DashboardTitleProps, groupColumn: string, groupingColName?: string) {

    let tableVisualDef: Visual;
    if (computeMethodProps.isSameAggregationMethod) {
      tableVisualDef = getEventPropertyCountPivotTableVisualDef(tableVisualId, viewName, titleProps, groupColumn
        , groupingColName, computeMethodProps.aggregationMethodName);
    } else if (
      (computeMethodProps.isMixedMethod && computeMethodProps.isCountMixedMethod)
      ||(!computeMethodProps.isMixedMethod && !computeMethodProps.hasAggregationPropertyMethod)) {

      logger.info('create pivot table for mix mode');
      tableVisualDef = getEventPropertyCountPivotTableVisualDef(tableVisualId, viewName, titleProps, groupColumn, groupingColName);
    } else {
      logger.info('create normal table for mix mode');
      tableVisualDef = getEventNormalTableVisualDef(computeMethodProps, tableVisualId, viewName, titleProps, groupingColName);
    }

    return tableVisualDef;
  }

  async createEventVisualOnEventProperty(req: any, res: any, next: any) {
    try {
      logger.info('start to create event analysis visuals', { request: req.body });

      const query = req.body;
      //construct parameters to build sql
      const viewName = getTempResourceName(query.viewName, query.action);

      const sqlParameters = {
        ...query,
        dbName: query.projectId,
        schemaName: query.appId,
        timeStart: query.timeScopeType === ExploreTimeScopeType.FIXED ? query.timeStart : undefined,
        timeEnd: query.timeScopeType === ExploreTimeScopeType.FIXED ? query.timeEnd : undefined,
      };

      const sql = buildEventPropertyAnalysisView(sqlParameters);
      logger.debug(`event analysis sql: ${sql}`);

      const computeMethodProps = getComputeMethodProps(sqlParameters);

      let groupingColName;
      if ( query.groupCondition !== undefined) {
        groupingColName = buildColNameWithPrefix(query.groupCondition);
      }

      const projectedColumnsAndDatasetColumns = this._getProjectColumnsAndDatasetColumns(computeMethodProps, groupingColName);

      const datasetPropsArray: DataSetProps[] = [];
      datasetPropsArray.push({
        tableName: viewName,
        columns: projectedColumnsAndDatasetColumns.datasetColumns,
        importMode: 'DIRECT_QUERY',
        customSql: sql,
        projectedColumns: projectedColumnsAndDatasetColumns.projectedColumns,
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

      let result: CreateDashboardResult;
      const locale = query.locale ?? ExploreLocales.EN_US;
      const visualId = uuidv4();
      const titleProps = await getDashboardTitleProps(AnalysisType.EVENT, query);

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

      const tableVisualId = uuidv4();
      const tableVisualDef = await this._getVisualDefOfEventVisualOnEventProperty(computeMethodProps, tableVisualId,
        viewName, titleProps, query.groupColumn, groupingColName);

      const tableVisualProps = {
        sheetId: sheetId,
        name: ExploreVisualName.TABLE,
        visualId: tableVisualId,
        visual: tableVisualDef,
        dataSetIdentifierDeclaration: [],
        filterControl: visualRelatedParams.filterControl,
        parameterDeclarations: visualRelatedParams.parameterDeclarations,
        filterGroup: visualRelatedParams.filterGroup,
      };

      result = await this.createDashboardVisuals(
        sheetId, viewName, query, datasetPropsArray, [tableVisualProps]);

      logger.info('create Dashboard result: ', { result } );

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
        dbName: query.projectId,
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
      dbName: query.projectId,
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
        dbName: query.projectId,
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

      visualRelatedParams.filterGroup?.ScopeConfiguration?.SelectedSheets?.SheetVisualScopingConfigurations?.[0].VisualIds?.push(tableVisualId);

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
    const pipeline = await pipelineServ.getPipelineByProjectId(query.projectId);
    const principals = await getClickstreamUserArn(
      SolutionVersion.Of(pipeline?.templateVersion ?? FULL_SOLUTION_VERSION),
      pipeline?.reporting?.quickSight?.user ?? '',
    );

    //create quicksight dataset
    const dataSetIdentifierDeclaration: DataSetIdentifierDeclaration[] = [];
    for (const datasetProps of datasetPropsArray) {
      const datasetOutput = await createDataSet(
        quickSight, awsAccountId,
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

    const result = await this._buildDashboard({
      query,
      visualPropsArray,
      quickSight,
      sheetId,
      resourceName,
      principals,
      dashboardCreateParameters,
      templateVersion: pipeline?.templateVersion ?? FULL_SOLUTION_VERSION,
    });
    for (let visualProps of visualPropsArray) {
      const visual: VisualMapProps = {
        name: visualProps.name,
        id: visualProps.visualId,
      };
      result.visualIds.push(visual);
    }

    return result;
  };

  private async _buildDashboard(props: BuildDashboardProps) {
    // generate dashboard definition
    let dashboardDef: DashboardVersionDefinition;
    let dashboardName: string | undefined;
    if (!props.query.dashboardId) {
      dashboardDef = JSON.parse(readFileSync(join(__dirname, './quicksight/templates/dashboard.json')).toString()) as DashboardVersionDefinition;
      const sid = props.visualPropsArray[0].sheetId;
      dashboardDef.Sheets![0].SheetId = sid;
      dashboardDef.Sheets![0].Name = props.query.sheetName ?? 'sheet1';
      dashboardDef.Options!.WeekStart = DayOfWeek.MONDAY;
    } else {
      const dashboardDefProps = await getDashboardDefinitionFromArn(props.quickSight, awsAccountId, props.query.dashboardId);
      dashboardDef = dashboardDefProps.def;
      dashboardName = dashboardDefProps.name;
      if (dashboardDef.Options === undefined) {
        dashboardDef.Options = {};
      }
      dashboardDef.Options.WeekStart = DayOfWeek.MONDAY;
    }

    const dashboard = applyChangeToDashboard({
      action: 'ADD',
      requestAction: props.query.action,
      visuals: props.visualPropsArray,
      dashboardDef: dashboardDef,
    });
    logger.info('final dashboard def:', { dashboard });

    let result: CreateDashboardResult;
    if (!props.query.dashboardId) {
      //create QuickSight analysis
      result = await this._createDashboard({
        quickSight: props.quickSight,
        resourceName: props.resourceName,
        principals: props.principals,
        dashboard,
        query: props.query,
        dashboardCreateParameters: props.dashboardCreateParameters,
        sheetId: props.sheetId,
        templateVersion: props.templateVersion,
      });
    } else {
      //update QuickSight dashboard
      const newDashboard = await props.quickSight.updateDashboard({
        AwsAccountId: awsAccountId,
        DashboardId: props.query.dashboardId,
        Name: dashboardName,
        Definition: dashboard,
      });
      const versionNumber = newDashboard.VersionArn?.substring(newDashboard.VersionArn?.lastIndexOf('/') + 1);

      // publish new version
      await this._publishNewVersionDashboard(props.quickSight, props.query, versionNumber);

      result = {
        dashboardId: props.query.dashboardId,
        dashboardArn: newDashboard.Arn!,
        dashboardName: props.query.dashboardName,
        dashboardVersion: versionNumber ? Number.parseInt(versionNumber) : 1,
        dashboardEmbedUrl: '',
        analysisId: props.query.analysisId,
        analysisArn: '',
        analysisName: props.query.analysisName,
        sheetId: props.sheetId,
        visualIds: [],
      };
    }
    return result;
  }

  private async _publishNewVersionDashboard(quickSight: QuickSight, query: any,
    versionNumber: string | undefined) {
    let cnt = 0;
    for (const _i of Array(100).keys()) {
      cnt += 1;
      try {
        const response = await quickSight.updateDashboardPublishedVersion({
          AwsAccountId: awsAccountId,
          DashboardId: query.dashboardId,
          VersionNumber: versionNumber ? Number.parseInt(versionNumber) : undefined,
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

  private async _createDashboard(props: CreateDashboardProps) {
    const analysisId = `${QUICKSIGHT_TEMP_RESOURCE_NAME_PREFIX}${uuidv4()}`;
    const newAnalysis = await props.quickSight.createAnalysis({
      AwsAccountId: awsAccountId,
      AnalysisId: analysisId,
      Name: `${props.resourceName}`,
      Definition: props.dashboard as AnalysisDefinition,
    });

    //create QuickSight dashboard
    const dashboardPermissions = [
      {
        Principal: props.principals.exploreUserArn,
        Actions: DASHBOARD_READER_PERMISSION_ACTIONS,
      },
    ];
    const dashboardId = `${QUICKSIGHT_TEMP_RESOURCE_NAME_PREFIX}${uuidv4()}`;
    const newDashboard = await props.quickSight.createDashboard({
      AwsAccountId: awsAccountId,
      DashboardId: dashboardId,
      Name: `${props.resourceName}`,
      Definition: props.dashboard,
      Permissions: dashboardPermissions,
    });

    let dashboardEmbedUrl = '';
    if (props.query.action === ExploreRequestAction.PREVIEW) {
      const dashboardSuccess = await waitDashboardSuccess(props.dashboardCreateParameters.region, dashboardId);
      if (dashboardSuccess) {
        const embedUrl = await generateEmbedUrlForRegisteredUser(
          props.dashboardCreateParameters.region,
          props.principals.exploreUserArn,
          props.dashboardCreateParameters.allowedDomain,
          dashboardId,
        );
        dashboardEmbedUrl = embedUrl.EmbedUrl!;
      }
    }
    const result = {
      dashboardId,
      dashboardArn: newDashboard.Arn!,
      dashboardName: `${props.resourceName}`,
      dashboardVersion: Number.parseInt(newDashboard.VersionArn!.substring(newDashboard.VersionArn!.lastIndexOf('/') + 1)),
      dashboardEmbedUrl: dashboardEmbedUrl,
      analysisId,
      analysisArn: newAnalysis.Arn!,
      analysisName: `${props.resourceName}`,
      sheetId: props.sheetId,
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
      await getClickstreamUserArn(
        SolutionVersion.Of(latestPipeline.templateVersion ?? FULL_SOLUTION_VERSION),
        latestPipeline.reporting?.quickSight?.user ?? '',
      );

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

      await _cleanUser();

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
      if (analysisId) {deletedAnalyses.push(analysisId);}
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
      if (dashboardId) {deletedDashBoards.push(dashboardId);}
      logger.info(`dashboard ${dashboardSummary.Name} removed`);
    }
  }

  return deletedDashBoards;
}

async function _cleanUser() {
  const pipelines = await store.listPipeline('', 'latest', 'asc');
  if (pipelines.every(p => !_needExploreUserVersion(p)) && !process.env.AWS_REGION?.startsWith('cn')) {
    await deleteExploreUser();
  }
}

function _needExploreUserVersion(pipeline: IPipeline) {
  const version = pipeline.templateVersion?.split('-')[0] ?? '';
  const oldVersions = ['v1.1.0', 'v1.1.1', 'v1.1.2', 'v1.1.3', 'v1.1.4'];
  return oldVersions.includes(version);

}
