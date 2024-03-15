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

import { ConditionCategory, ExploreAggregationMethod, ExploreAnalyticsOperators, ExploreComputeMethod, ExploreConversionIntervalType, ExploreGroupColumn, ExploreLocales, ExplorePathNodeType, ExplorePathSessionDef, ExploreRelativeTimeUnit, ExploreTimeScopeType, MetadataPlatform, MetadataValueType } from '@aws/clickstream-base-lib';
import { format } from 'sql-formatter';
import { formatDateToYYYYMMDD, getFirstDayOfLastNMonths, getFirstDayOfLastNYears, getMondayOfLastNWeeks } from './reporting-utils';
import { logger } from '../../common/powertools';

export interface Condition {
  readonly category: ConditionCategory;
  readonly property: string;
  readonly operator: string;
  value: any[];
  readonly dataType: MetadataValueType;
}

export interface EventExtParameter {
  readonly targetProperty: ColumnAttribute;
  readonly aggregationMethod?: ExploreAggregationMethod;
}

export interface EventAndCondition {
  eventName: string;
  readonly sqlCondition?: SQLCondition;
  readonly retentionJoinColumn?: RetentionJoinColumn;
  readonly computeMethod?: ExploreComputeMethod;
  readonly eventExtParameter?: EventExtParameter;
}

export interface AttributionTouchPoint {
  eventName: string;
  readonly sqlCondition?: SQLCondition;
  readonly groupColumn?: ColumnAttribute;
}

export interface SQLCondition {
  readonly conditions: Condition[];
  readonly conditionOperator?: 'and' | 'or' ;
}

export interface ComputeMethodProps {
  readonly hasExtParameter: boolean;
  readonly hasCounntPropertyMethod: boolean;
  readonly hasAggregationPropertyMethod: boolean;
  readonly hasIdCountMethod: boolean;
  readonly isMixedMethod: boolean;
  readonly isSameAggregationMethod: boolean;
  readonly aggregationMethod?: ExploreAggregationMethod;
};

export interface PathAnalysisParameter {
  readonly platform?: MetadataPlatform;
  readonly sessionType: ExplorePathSessionDef;
  readonly nodeType: ExplorePathNodeType;
  readonly lagSeconds?: number;
  readonly nodes?: string[];
  readonly includingOtherEvents?: boolean;
  readonly mergeConsecutiveEvents?: boolean;
}

export interface ColumnAttribute {
  readonly category: ConditionCategory;
  readonly property: string;
  readonly dataType: MetadataValueType;
}

export type RetentionJoinColumn = ColumnAttribute;
export type GroupingCondition = ColumnAttribute & {
  readonly applyTo?: 'FIRST' | 'ALL';
};

export interface PairEventAndCondition {
  readonly startEvent: EventAndCondition;
  readonly backEvent: EventAndCondition;
}

export interface EventNameAndConditionsSQL {
  readonly eventName: string;
  readonly conditionSql: string;
}

export interface BaseSQLParameters {
  readonly dbName: string;
  readonly schemaName: string;
  readonly computeMethod: ExploreComputeMethod;
  readonly globalEventCondition?: SQLCondition;
  readonly timeScopeType: ExploreTimeScopeType;
  readonly timeStart?: Date;
  readonly timeEnd?: Date;
  readonly lastN?: number;
  readonly timeUnit?: ExploreRelativeTimeUnit;
  readonly groupColumn?: ExploreGroupColumn;
  readonly locale?: ExploreLocales;
  readonly groupCondition?: GroupingCondition;
}

export interface SQLParameters extends BaseSQLParameters {
  readonly specifyJoinColumn: boolean;
  readonly joinColumn?: string;
  readonly conversionIntervalType?: ExploreConversionIntervalType;
  readonly conversionIntervalInSeconds?: number;
  readonly eventAndConditions?: EventAndCondition[];
  readonly maxStep?: number;
  readonly pathAnalysis?: PathAnalysisParameter;
  readonly pairEventAndConditions?: PairEventAndCondition[];
}

export interface EventComputeMethodsProps {
  readonly hasExtParameter : boolean;
  readonly hasCounntPropertyMethod : boolean;
  readonly hasAggregationPropertyMethod : boolean;
  readonly hasIdCountMethod : boolean;
  readonly isMixedMethod : boolean;
  readonly isSameAggregationMethod : boolean;
  readonly isCountMixedMethod : boolean;
  readonly aggregationMethodName? : string;
};

export const BUILTIN_EVENTS = [
  '_session_start',
  '_session_stop',
  '_screen_view',
  '_app_exception',
  '_app_update',
  '_first_open',
  '_os_update',
  '_user_engagement',
  '_profile_set',
  '_page_view',
  '_app_start',
  '_scroll',
  '_search',
  '_click',
  '_clickstream_error',
  '_mp_share',
  '_mp_favorite',
  '_app_end',
];

export enum ExploreAnalyticsType {
  FUNNEL = 'is_null',
  EVENT = 'is_not_null',
  EVENT_PATH = '=',
  NODE_PATH = '<>',
  RETENTION = '>',
  ATTRIBUTION = '>=',
}

const columnTemplate = `
 event_name as event_name####
,event_timestamp as event_timestamp####
,event_id as event_id####
,user_id as user_id####
,user_pseudo_id as user_pseudo_id####
`;

const columnTemplateForFunnelVisual = `
 %%%%event_name as event_name####
,event_timestamp as event_timestamp####
,event_id as event_id####
,user_id as user_id####
,user_pseudo_id as user_pseudo_id####
`;

export const basicColumns = ['user_id', 'user_pseudo_id', 'event_id', 'event_name', 'event_timestamp'];

export interface EventConditionProps {
  hasEventAttribute: boolean;
  eventAttributes: ColumnAttribute[];
  hasEventNonNestAttribute: boolean;
  eventNonNestAttributes: ColumnAttribute[];
}

export interface EventNonNestColProps {
  sql: string;
  colList: string[];
}

export const EVENT_TABLE = 'clickstream_event_attr_view_v2';
export const EVENT_USER_VIEW = 'clickstream_event_view_v3';

export function buildFunnelTableView(sqlParameters: SQLParameters) : string {

  let eventNames = buildEventsNameFromConditions(sqlParameters.eventAndConditions!);
  let groupCondition: GroupingCondition | undefined = undefined;
  let appendGroupingCol = false;
  let colNameWithPrefix = '';

  if (sqlParameters.groupCondition !== undefined) {
    colNameWithPrefix = buildColNameWithPrefix(sqlParameters.groupCondition);
    groupCondition = sqlParameters.groupCondition;
    appendGroupingCol = true;
  }

  let sql = _buildFunnelBaseSqlForTableVisual(eventNames, sqlParameters, groupCondition);

  let prefix = 'user_pseudo_id';
  if (sqlParameters.computeMethod === ExploreComputeMethod.EVENT_CNT) {
    prefix = 'event_id';
  }
  let resultCntSQL ='';

  const maxIndex = sqlParameters.eventAndConditions!.length - 1;
  for (const [index, item] of sqlParameters.eventAndConditions!.entries()) {
    resultCntSQL = resultCntSQL.concat(`, count(distinct ${prefix}_${index})  as "${index+1}_${item.eventName}" \n`);
    if (index === 0) {
      resultCntSQL = resultCntSQL.concat(`, (count(distinct ${prefix}_${maxIndex}) :: decimal /  NULLIF(count(distinct ${prefix}_0), 0) ):: decimal(20, 4)  as total_conversion_rate \n`);
    } else {
      resultCntSQL = resultCntSQL.concat(`, (count(distinct ${prefix}_${index}) :: decimal /  NULLIF(count(distinct ${prefix}_${index-1}), 0) ):: decimal(20, 4)  as "${index+1}_${item.eventName}_rate" \n`);
    }
  }

  sql = sql.concat(`
    select 
      ${sqlParameters.groupColumn}
      ${appendGroupingCol ? `, ${colNameWithPrefix} as ${sqlParameters.groupCondition?.property}` : ''}
      ${resultCntSQL}
    from join_table
    group by 
      ${sqlParameters.groupColumn}
      ${appendGroupingCol ? `, ${colNameWithPrefix}` : ''}
    order by 
      ${sqlParameters.groupColumn}
      ,"1_${eventNames[0]}" desc
  `);

  return format(sql, {
    language: 'postgresql',
  });
};


function _buildFunnelChartViewNestCaseWhenSql(prefix: string, cnt: number, isNameCol?: boolean) : string {

  let sql = '';
  if (isNameCol) {
    for (let i = 0; i < cnt; i++) {
      sql += `when seq = ${i} then event_name_${i} \n`;
    }
  } else {
    for (let i = 0; i < cnt; i++) {
      sql += `when seq = ${i} then ${prefix}_${i} \n`;
    }
  }

  return sql;
}

function _buildFunnelChartViewGroupingNestCaseWhenSql(cnt: number, groupColNameWithPrefix: string) : string {

  let sql = '';
  for (let i = 0; i < cnt; i++) {
    sql += `when seq = ${i} then ${groupColNameWithPrefix}_${i} \n`;
  }

  return sql;
}

function _buildFunnelChartViewOneResultSql(prefix: string, eventCount: number, index: number, isNameCol?: boolean) : string {
  let sql = ' when ';
  for (let i = 1; i < eventCount; i++) {
    if (i < index) {
      sql += `${i === 1 ? ' ': ' and'} ${prefix}_${i} is not null `;
    } else {
      sql += `${i === 1 ? ' ': ' and'} ${prefix}_${i} is null `;
    }
  }

  sql += `then 
    case 
      ${_buildFunnelChartViewNestCaseWhenSql(prefix, index, isNameCol)}
    else null 
    end
  `;

  return sql;
}

function _buildFunnelChartViewGroupingSql(prefix: string, eventCount: number, index: number, groupColNameWithPrefix: string) : string {

  let sql = ' when ';
  for (let i = 1; i < eventCount; i++) {
    if (i < index) {
      sql += `${i === 1 ? ' ': ' and'} ${prefix}_${i} is not null `;
    } else {
      sql += `${i === 1 ? ' ': ' and'} ${prefix}_${i} is null `;
    }
  }

  sql += `then 
    case 
      ${_buildFunnelChartViewGroupingNestCaseWhenSql(index, groupColNameWithPrefix)}
    else null 
    end
  `;

  return sql;
}

function _buildFunnelChartViewResultCaseWhenSql(prefix: string, eventCount: number, isEventName: boolean) : string {

  let resultColSql = `
    case
  `;

  if (isEventName) {
    for (let index = eventCount; index > 0; index--) {
      resultColSql += _buildFunnelChartViewOneResultSql(prefix, eventCount, index, true);
    }
    resultColSql += `
    end as event_name
    `;
  } else {
    for (let index = eventCount; index > 0; index--) {
      resultColSql += _buildFunnelChartViewOneResultSql(prefix, eventCount, index, false);
    }
    resultColSql += `
      end as ${prefix}
    `;
  }

  return resultColSql;
}

function _buildFunnelChartViewResultGroupingSql(prefix: string,
  appendGroupingCol: boolean, applyToFirst: boolean, groupColNameWithPrefix: string, eventCount: number) : string {

  let resultColSql = '';

  if (applyToFirst) {
    resultColSql = `
      ${ appendGroupingCol ? `,${groupColNameWithPrefix}_0 as group_col` : ''}
    `;
  } else if (appendGroupingCol) {
    resultColSql = `
      ,case
    `;
    for (let index = eventCount; index > 0; index--) {
      resultColSql += _buildFunnelChartViewGroupingSql(prefix, eventCount, index, groupColNameWithPrefix);
    }
    resultColSql += `
      end
    as group_col
    `;
  }

  return resultColSql;
}

function _buildFunnelChartEventNameSql(count: number) : string {
  let sql = '';
  for (let i = 0; i < count; i++) {
    if (i>0) {
      sql += `
        union all 
      `;
    }
    sql += `
      select ${i} as seq
    `;
  }
  return sql;
}

function _buildFunnelChartIdList(count: number, prefix: string) : string {

  let idList = '';
  for (let i = 0; i < count; i++) {
    idList += `, ${prefix}_${i}`;
  }
  return idList;
}

function _buildFunnelChartViewResultSql(sqlParameters: SQLParameters, prefix: string,
  appendGroupingCol: boolean, applyToFirst: boolean, groupColNameWithPrefix: string) : string {

  const count = sqlParameters.eventAndConditions!.length;
  const seqTable = `,
    seq_table as (
      ${_buildFunnelChartEventNameSql(count)}
    ),
  `;

  const resultColSql= `
    final_table as (
      select
      day ${_buildFunnelChartIdList(count, prefix)},
      ${_buildFunnelChartViewResultCaseWhenSql(prefix, count, false)}
      ,
      ${_buildFunnelChartViewResultCaseWhenSql(prefix, count, true)}
      ${_buildFunnelChartViewResultGroupingSql(prefix, appendGroupingCol, applyToFirst, groupColNameWithPrefix, count)}
      from join_table join seq_table on 1=1
    )
  `;

  return `
    ${seqTable}
    ${resultColSql}
    select day::date as event_date, event_name, ${prefix} ${appendGroupingCol ? ',group_col' : ''} 
    from final_table where event_name is not null
  `;
}

export function buildFunnelView(sqlParameters: SQLParameters, isMultipleChart: boolean = false) : string {

  const eventNames = buildEventsNameFromConditions(sqlParameters.eventAndConditions!);

  let prefix = 'user_pseudo_id';
  if (sqlParameters.computeMethod === ExploreComputeMethod.EVENT_CNT) {
    prefix = 'event_id';
  }

  let groupCondition: GroupingCondition | undefined = undefined;
  let appendGroupingCol = false;
  let colNameWithPrefix = '';


  if (isMultipleChart && sqlParameters.groupCondition?.property !== undefined) {
    colNameWithPrefix = buildColNameWithPrefix(sqlParameters.groupCondition);
    groupCondition = sqlParameters.groupCondition;
    appendGroupingCol = true;
  }

  const applyToFirst = appendGroupingCol && (sqlParameters.groupCondition?.applyTo === 'FIRST');

  let baseSQL = _buildFunnelBaseSql(eventNames, sqlParameters, applyToFirst, groupCondition);
  const resultSql = _buildFunnelChartViewResultSql(sqlParameters, prefix, appendGroupingCol, applyToFirst, colNameWithPrefix);

  let sql = `
   ${baseSQL}
   ${resultSql}
   `;

  return format(sql, {
    language: 'postgresql',
  });
}

export function buildEventAnalysisView(sqlParameters: SQLParameters) : string {

  let resultSql = '';
  const eventNames = buildEventsNameFromConditions(sqlParameters.eventAndConditions!);

  let baseSQL = _buildEventAnalysisBaseSql(eventNames, sqlParameters);

  let groupColSQL = '';
  let groupCol = '';

  if (sqlParameters.groupCondition !== undefined) {
    const colName = buildColNameWithPrefix(sqlParameters.groupCondition);
    groupColSQL = `${colName}::varchar as group_col,`;
    groupCol = `${colName}::varchar,`;
  }

  resultSql = resultSql.concat(`
      select 
        day::date as event_date, 
        event_name, 
        ${groupColSQL}
        x_id as id
      from join_table 
      where x_id is not null
      group by
      day, event_name, ${groupCol} x_id
  `);

  let sql = `
   ${baseSQL}
   ${resultSql}
   `;
  return format(sql, {
    language: 'postgresql',
  });
}

export function buildEventPropertyAnalysisView(sqlParameters: SQLParameters) : string {

  let resultSql = '';
  const eventNames = buildEventsNameFromConditions(sqlParameters.eventAndConditions!);

  let baseSQL = _buildEventPropertyAnalysisBaseSql(eventNames, sqlParameters);

  let groupColSQL = '';
  let groupBySQL = '';
  if (sqlParameters.groupCondition !== undefined) {
    const colName = buildColNameWithPrefix(sqlParameters.groupCondition);
    groupColSQL = `${colName}::varchar as ${colName},`;
    groupBySQL = `${colName},`;
  }

  const computeMethodProps = getComputeMethodProps(sqlParameters);
  if (!computeMethodProps.isMixedMethod) {
    if (computeMethodProps.hasAggregationPropertyMethod) {

      if (!computeMethodProps.isSameAggregationMethod) {
        resultSql = resultSql.concat(`
          select 
            event_date:: date,
            event_name,
            ${groupBySQL}
            custom_attr_id,
            "count/aggregation amount":: double precision
          from join_table
        `);
      } else {
        resultSql = resultSql.concat(`
            select 
              day::date as event_date, 
              event_name, 
              ${groupColSQL}
              custom_attr_id as id
            from join_table
            group by
            day, event_name, ${groupBySQL} custom_attr_id
        `);
      }
    } else {
      resultSql = resultSql.concat(`
          select 
            day::date as event_date, 
            event_name, 
            ${groupColSQL}
            x_id as id,
            custom_attr_id
          from join_table 
          group by
          day, event_name, ${groupBySQL} x_id, custom_attr_id
      `);
    }
  } else { // mixed method
    resultSql = resultSql.concat(`
        select 
          event_date:: date,
          event_name,
          ${groupBySQL}
          custom_attr_id,
          "count/aggregation amount":: double precision
        from join_table
    `);
  }

  let sql = `
   ${baseSQL}
   ${resultSql}
   `;
  return format(sql, {
    language: 'postgresql',
  });
}

//todo event_date
export function buildEventPathAnalysisView(sqlParameters: SQLParameters) : string {

  const eventNames = buildEventsNameFromConditions(sqlParameters.eventAndConditions!);

  let midTableSql = '';
  let dataTableSql = '';
  if (sqlParameters.pathAnalysis?.sessionType === ExplorePathSessionDef.SESSION ) {
    const midTable = _getMidTableForEventPathAnalysis(eventNames, sqlParameters, true);
    midTableSql = midTable.midTableSql;
    dataTableSql = `data as (
      select 
        *,
        ROW_NUMBER() OVER (PARTITION BY user_pseudo_id, session_id ORDER BY event_timestamp asc) as step_1,
        ROW_NUMBER() OVER (PARTITION BY user_pseudo_id, session_id ORDER BY event_timestamp asc) + 1 as step_2
      from mid_table 
    ),
    step_table_1 as (
      select 
      data.user_pseudo_id user_pseudo_id,
      data.session_id session_id,
      min(step_1) min_step
      from data
      where event_name = '${midTable.prefix}${eventNames[0]}'
      group by user_pseudo_id, session_id
    ),
    step_table_2 as (
      select 
      data.*
      from data join step_table_1 on data.user_pseudo_id = step_table_1.user_pseudo_id and data.session_id = step_table_1.session_id and data.step_1 >= step_table_1.min_step
    ),
    data_final as (
      select
        event_name,
        event_date,
        user_pseudo_id,
        event_id,
        event_timestamp,
        session_id,
        ROW_NUMBER() OVER (
          PARTITION BY
            user_pseudo_id,
            session_id
          ORDER BY
            step_1 asc, step_2
        ) as step_1,
        ROW_NUMBER() OVER (
          PARTITION BY
            user_pseudo_id,
            session_id
          ORDER BY
            step_1 asc, step_2
        ) + 1 as step_2
      from
        step_table_2
    )
    select 
      a.event_date,
      a.event_name || '_' || a.step_1 as source,
      CASE
        WHEN b.event_name is not null THEN b.event_name || '_' || a.step_2
        ELSE 'lost'
      END as target,
      ${sqlParameters.computeMethod != ExploreComputeMethod.EVENT_CNT ? 'a.user_pseudo_id' : 'a.event_id' } as x_id
    from data_final a left join data_final b 
      on a.step_2 = b.step_1 
      and a.session_id = b.session_id
      and a.user_pseudo_id = b.user_pseudo_id
    where a.step_2 <= ${sqlParameters.maxStep ?? 10}
    `;

  } else {
    const midTable = _getMidTableForEventPathAnalysis(eventNames, sqlParameters, false);
    midTableSql = midTable.midTableSql;

    dataTableSql = `data_1 as (
      select 
        *,
        ROW_NUMBER() OVER (PARTITION BY user_pseudo_id ORDER BY event_timestamp asc) as step_1,
        ROW_NUMBER() OVER (PARTITION BY user_pseudo_id ORDER BY event_timestamp asc) + 1 as step_2
      from mid_table 
    ),
    data_2 as (
      select 
        a.event_name,
        a.user_pseudo_id,
        a.event_id,
        a.event_timestamp,
        a.event_date,
        case when (EXTRACT(epoch FROM b.event_timestamp - a.event_timestamp) < cast(${sqlParameters.pathAnalysis!.lagSeconds!} as bigint) and EXTRACT(epoch FROM b.event_timestamp - a.event_timestamp) >=0) then 0 else 1 end as group_start
      from data_1 a left join data_1 b 
        on a.user_pseudo_id = b.user_pseudo_id 
        and a.step_2 = b.step_1
    )
     ,data_3 AS (
      SELECT
          *,
          SUM(group_start) over(order by user_pseudo_id, event_timestamp ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW ) AS group_id
      FROM
        data_2
      )
    ,data as (
      select 
        event_name,
        user_pseudo_id,
        event_id,
        event_timestamp,
        event_date,
        group_id,
        ROW_NUMBER() OVER (PARTITION BY user_pseudo_id, group_id ORDER BY event_timestamp asc) as step_1,
        ROW_NUMBER() OVER (PARTITION BY user_pseudo_id, group_id ORDER BY event_timestamp asc) + 1 as step_2
      from data_3
    ),
    step_table_1 as (
      select
        data.user_pseudo_id user_pseudo_id,
        group_id,
        min(step_1) min_step,
        min(event_timestamp) event_timestamp
      from
        data
      where
        event_name = '${midTable.prefix}${eventNames[0]}'
      group by
        user_pseudo_id,
        group_id
    ),
    step_table_2 as (
      select
        data.*
      from
        data
        join step_table_1 on data.user_pseudo_id = step_table_1.user_pseudo_id and data.group_id = step_table_1.group_id
        and data.step_1 >= step_table_1.min_step
    ),
    data_final as (
      select
        event_name,
        event_date,
        user_pseudo_id,
        event_id,
        group_id,
        ROW_NUMBER() OVER (
          PARTITION BY
            user_pseudo_id,
            group_id
          ORDER BY
            step_1 asc,
            step_2
        ) as step_1,
        ROW_NUMBER() OVER (
          PARTITION BY
            user_pseudo_id,
            group_id
          ORDER BY
            step_1 asc,
            step_2
        ) + 1 as step_2
      from
        step_table_2
    )
    select 
      a.event_date event_date,
      a.event_name || '_' || a.step_1 as source,
      CASE
        WHEN b.event_name is not null THEN b.event_name || '_' || a.step_2
        ELSE 'lost'
      END as target,
      ${sqlParameters.computeMethod != ExploreComputeMethod.EVENT_CNT ? 'a.user_pseudo_id' : 'a.event_id' } as x_id
    from data_final a left join data_final b 
      on a.step_2 = b.step_1 
      and a.group_id = b.group_id 
      and a.user_pseudo_id = b.user_pseudo_id
    where a.step_2 <= ${sqlParameters.maxStep ?? 10}
    `;
  }

  const sql = `
    ${_buildCommonPartSql(ExploreAnalyticsType.EVENT_PATH, eventNames, sqlParameters)}
    ${midTableSql}
    ${dataTableSql}
  `;
  return format(sql, {
    language: 'postgresql',
  });
}

//todo
export function buildNodePathAnalysisView(sqlParameters: SQLParameters) : string {

  let midTableSql = '';
  let dataTableSql = '';

  const includingOtherEvents = sqlParameters.pathAnalysis?.includingOtherEvents ? true: false;

  if (sqlParameters.pathAnalysis!.sessionType === ExplorePathSessionDef.SESSION ) {
    midTableSql = `
      mid_table_1 as (
        select 
          event_name,
          day as event_date,
          user_pseudo_id,
          event_id,
          event_timestamp,
          session_id
        from base_data
      ),
      mid_table_2 as (
        ${_buildNodePathSQL(sqlParameters.pathAnalysis!.nodeType)}
      ),
      ${_getMidTableForNodePathAnalysis(sqlParameters, true)}
      data as (
        select
        event_name,
        event_date,
        user_pseudo_id,
        event_id,
        event_timestamp,
        session_id,
        case 
          when node in ('${sqlParameters.pathAnalysis?.nodes?.join('\',\'')}') then node 
          else 'other'
        end as node,
        ROW_NUMBER() OVER (
          PARTITION BY
            user_pseudo_id,
            session_id
          ORDER BY
            event_timestamp asc
        ) as step_1,
        ROW_NUMBER() OVER (
          PARTITION BY
            user_pseudo_id,
            session_id
          ORDER BY
            event_timestamp asc
        ) + 1 as step_2
        from
          mid_table
        ${!includingOtherEvents ? `where node in ('${sqlParameters.pathAnalysis?.nodes?.join('\',\'')}')` : ''}
      ),
    `;
    dataTableSql = `step_table_1 as (
      select
        user_pseudo_id,
        session_id,
        min(step_1) min_step
      from
        data
      where
        node = '${sqlParameters.pathAnalysis!.nodes![0]}'
      group by
        user_pseudo_id,
        session_id
    ),
    step_table_2 as (
      select
        data.*
      from data
      join step_table_1 on data.user_pseudo_id = step_table_1.user_pseudo_id
      and data.session_id = step_table_1.session_id
      and data.step_1 >= step_table_1.min_step
    ),
    data_final as (
      select        
        event_name,
        event_date,
        user_pseudo_id,
        event_id,
        event_timestamp,
        session_id,
        node,
        ROW_NUMBER() OVER (
          PARTITION BY
            user_pseudo_id,
            session_id
          ORDER BY
            step_1 asc,
            step_2
        ) as step_1,
        ROW_NUMBER() OVER (
          PARTITION BY
            user_pseudo_id,
            session_id
          ORDER BY
            step_1 asc,
            step_2
        ) + 1 as step_2
      from
        step_table_2
    )
    select 
      a.event_date event_date,
      a.node || '_' || a.step_1 as source,
      CASE 
        WHEN b.node is not null THEN b.node || '_' || a.step_2
        ELSE 'lost'
      END as target,
      ${sqlParameters.computeMethod != ExploreComputeMethod.EVENT_CNT ? 'a.user_pseudo_id' : 'a.event_id' } as x_id
    from data_final a left join data_final b 
      on a.user_pseudo_id = b.user_pseudo_id 
      and a.session_id = b.session_id
      and a.step_2 = b.step_1
    where a.step_2 <= ${sqlParameters.maxStep ?? 10}
    `;

  } else {
    midTableSql = `
    mid_table_1 as (
      select 
        event_name,
        day as event_date,
        user_pseudo_id,
        event_id,
        event_timestamp
      from base_data
    ),
    mid_table_2 as (
      ${_buildNodePathSQL(sqlParameters.pathAnalysis!.nodeType)}
    ),
    ${_getMidTableForNodePathAnalysis(sqlParameters, false)}
    `;

    dataTableSql = `data_1 as (
      select 
        user_pseudo_id,
        event_id,
        event_date,
        event_timestamp,
        case 
          when node in ('${sqlParameters.pathAnalysis?.nodes?.join('\',\'')}') then node 
          else 'other'
        end as node,
        ROW_NUMBER() OVER (PARTITION BY user_pseudo_id ORDER BY event_timestamp asc) as step_1,
        ROW_NUMBER() OVER (PARTITION BY user_pseudo_id ORDER BY event_timestamp asc) + 1 as step_2
      from mid_table
      ${!includingOtherEvents ? `where node in ('${sqlParameters.pathAnalysis?.nodes?.join('\',\'')}')` : ''}
    ),
    data_2 as (
      select 
        a.node,
        a.user_pseudo_id,
        a.event_id,
        a.event_timestamp,
        a.event_date,
        case
          when (
            EXTRACT(epoch FROM b.event_timestamp - a.event_timestamp) < cast(${sqlParameters.pathAnalysis!.lagSeconds!} as bigint)
            and EXTRACT(epoch FROM b.event_timestamp - a.event_timestamp) >= 0
          ) then 0
          else 1
        end as group_start
      from data_1 a left join data_1 b 
      on a.user_pseudo_id = b.user_pseudo_id 
      and a.step_2 = b.step_1
    )
     ,data_3 AS (
      select
          *,
          SUM(group_start) over (
            order by
              user_pseudo_id,
              event_timestamp ROWS BETWEEN UNBOUNDED PRECEDING
              AND CURRENT ROW
          ) AS group_id
      from
        data_2
      )
    ,data as (
      select 
        node,
        user_pseudo_id,
        event_id,
        event_date,
        event_timestamp,
        group_id,
        ROW_NUMBER() OVER (PARTITION BY user_pseudo_id, group_id ORDER BY event_timestamp asc) as step_1,
        ROW_NUMBER() OVER (PARTITION BY user_pseudo_id, group_id ORDER BY event_timestamp asc) + 1 as step_2
      from data_3
    ),
    step_table_1 as (
      select
        data.user_pseudo_id user_pseudo_id,
        group_id,
        min(step_1) min_step,
        min(event_timestamp) event_timestamp
      from
        data
      where
        node = '${sqlParameters.pathAnalysis!.nodes![0]}'
      group by
        user_pseudo_id,
        group_id
    ),
    step_table_2 as (
      select
        data.*
      from
        data
        join step_table_1 on data.user_pseudo_id = step_table_1.user_pseudo_id
        and data.group_id = step_table_1.group_id
        and data.step_1 >= step_table_1.min_step
    ),
    data_final as (
      select
        node,
        user_pseudo_id,
        event_id,
        event_date,
        group_id,
        ROW_NUMBER() OVER (
          PARTITION BY
            user_pseudo_id,
            group_id
          ORDER BY
            step_1 asc,
            step_2
        ) as step_1,
        ROW_NUMBER() OVER (
          PARTITION BY
            user_pseudo_id,
            group_id
          ORDER BY
            step_1 asc,
            step_2
        ) + 1 as step_2
      from
        step_table_2
    )
    select 
      a.event_date event_date,
      a.node || '_' || a.step_1 as source,
      CASE 
        WHEN b.node is not null THEN b.node || '_' || a.step_2
        ELSE 'lost'
      END as target,
      ${sqlParameters.computeMethod != ExploreComputeMethod.EVENT_CNT ? 'a.user_pseudo_id' : 'a.event_id' } as x_id
    from data_final a left join data_final b 
      on a.user_pseudo_id = b.user_pseudo_id 
      and a.group_id = b.group_id
      and a.step_2 = b.step_1
    where a.step_2 <= ${sqlParameters.maxStep ?? 10}
    `;
  }

  const sql = `
    ${_buildCommonPartSql(ExploreAnalyticsType.NODE_PATH, [], sqlParameters)}
    ${midTableSql}
    ${dataTableSql}
  `;

  return format(sql, {
    language: 'postgresql',
  });
}

export function buildRetentionAnalysisView(sqlParameters: SQLParameters) : string {

  const dateListSql = _buildDateListSQL(sqlParameters);
  const { tableSql, resultSql } = _buildRetentionAnalysisSQLs(sqlParameters);

  let groupingCol = '';
  let groupingColSql = '';
  let groupByColSql = '';
  if (sqlParameters.groupCondition !== undefined) {
    groupByColSql = `${buildColNameWithPrefix(sqlParameters.groupCondition)}::varchar,`;
    groupingCol = buildColNameWithPrefix(sqlParameters.groupCondition);
    groupingColSql = `${groupingCol}::varchar as group_col,`;
  }

  const sql = `
    ${_buildCommonPartSql(ExploreAnalyticsType.RETENTION, _getRetentionAnalysisViewEventNames(sqlParameters), sqlParameters)}
    ${dateListSql}
    first_date as (
      select min(event_date) as first_date from date_list
    ),
    ${tableSql}
    result_table as (${resultSql})
    select 
      ${groupingColSql}
      grouping, 
      ${_getRetentionDateSql(sqlParameters.groupColumn!)}
      (count(distinct end_user_pseudo_id)::decimal / NULLIF(count(distinct start_user_pseudo_id), 0)):: decimal(20, 4)  as retention 
    from result_table 
    group by ${groupByColSql} grouping, start_event_date, event_date
    order by grouping, event_date
  `;

  return format(sql, {
    language: 'postgresql',
  });
}

function _buildTableListColumnSql(sqlParameters: SQLParameters, groupCondition: GroupingCondition|undefined) {

  let firstTableColumns = '';
  let sql = '';
  let groupCol = '';
  let newColumnTemplate = columnTemplateForFunnelVisual;
  if (groupCondition !== undefined && groupCondition.applyTo !== 'FIRST') {
    groupCol = `,COALESCE(${buildColNameWithPrefix(groupCondition)}::varchar, null)`;
    newColumnTemplate += `${groupCol} as ${buildColNameWithPrefix(groupCondition)}####`;
  }

  if (groupCondition !== undefined && groupCondition.applyTo === 'FIRST') {
    firstTableColumns = `
       month
      ,week
      ,day
      ,hour
      ,COALESCE(${buildColNameWithPrefix(groupCondition)}::varchar, null) as ${buildColNameWithPrefix(groupCondition)}_0
      ,${newColumnTemplate.replace(/####/g, '_0').replace(/%%%%/g, '\'1_\' || ')}
    `;
  } else {
    firstTableColumns = `
       month
      ,week
      ,day
      ,hour
      ,${newColumnTemplate.replace(/####/g, '_0').replace(/%%%%/g, '\'1_\' || ')}
    `;
  }

  for (const [index, event] of sqlParameters.eventAndConditions!.entries()) {

    let filterSql = '';
    filterSql = buildConditionSql(sqlParameters.eventAndConditions![index].sqlCondition);
    if (filterSql !== '') {
      filterSql = `and (${filterSql}) `;
    }

    sql = sql.concat(`
    table_${index} as (
      select 
        ${ index === 0 ? firstTableColumns : newColumnTemplate.replace(/####/g, `_${index}`).replace(/%%%%/g, `'${index+1}_' || `)}
      from base_data base
      where event_name = '${event.eventName}'
      ${filterSql}
    ),
    `);
  }
  return sql;
}

function _buildFunnelBaseSql(eventNames: string[], sqlParameters: SQLParameters, applyToFirst: boolean,
  groupCondition: GroupingCondition | undefined = undefined) : string {

  let sql = _buildCommonPartSql(ExploreAnalyticsType.FUNNEL, eventNames, sqlParameters);

  sql = sql.concat(_buildTableListColumnSql(sqlParameters, groupCondition));

  let joinConditionSQL = '';
  let joinColumnsSQL = '';

  for (const [index, _item] of sqlParameters.eventAndConditions!.entries()) {
    if (index === 0) {
      continue;
    }
    joinColumnsSQL = joinColumnsSQL.concat(`, table_${index}.event_id_${index} \n`);
    joinColumnsSQL = joinColumnsSQL.concat(`, table_${index}.event_name_${index} \n`);
    joinColumnsSQL = joinColumnsSQL.concat(`, table_${index}.user_pseudo_id_${index} \n`);
    joinColumnsSQL = joinColumnsSQL.concat(`, table_${index}.event_timestamp_${index} \n`);

    let joinCondition = '';
    if ( sqlParameters.specifyJoinColumn) {
      joinCondition = `on table_${index-1}.${sqlParameters.joinColumn}_${index-1} = table_${index}.${sqlParameters.joinColumn}_${index}`;
    } else {
      joinCondition = `on table_${index-1}.user_pseudo_id_${index-1} = table_${index}.user_pseudo_id_${index}`;
    }

    if (groupCondition !== undefined && !applyToFirst ) {
      joinColumnsSQL = joinColumnsSQL.concat(`, table_${index}.${buildColNameWithPrefix(groupCondition)}_${index} \n`);
      joinCondition = joinCondition.concat(` and table_${index-1}.${buildColNameWithPrefix(groupCondition)}_${index-1} = table_${index}.${buildColNameWithPrefix(groupCondition)}_${index}`);
    }

    if (sqlParameters.conversionIntervalType == 'CUSTOMIZE') {
      joinConditionSQL = joinConditionSQL.concat(`left outer join table_${index} ${joinCondition} and EXTRACT(epoch FROM table_${index}.event_timestamp_${index} - table_${index-1}.event_timestamp_${index-1}) > 0 and EXTRACT(epoch FROM table_${index}.event_timestamp_${index} - table_0.event_timestamp_0) <= cast(${sqlParameters.conversionIntervalInSeconds} as bigint) \n`);
    } else {
      joinConditionSQL = joinConditionSQL.concat(`left outer join table_${index} ${joinCondition} and EXTRACT(epoch FROM table_${index}.event_timestamp_${index} - table_${index-1}.event_timestamp_${index-1}) > 0 and TO_CHAR(table_${index-1}.event_timestamp_${index-1}, 'YYYY-MM-DD') = TO_CHAR(table_${index}.event_timestamp_${index}, 'YYYY-MM-DD')  \n`);
    }
  }

  sql = sql.concat(`
    join_table as (
      select table_0.*
        ${joinColumnsSQL}
      from table_0 
        ${joinConditionSQL}
    )`,
  );

  return sql;
};

function _buildColumnsForFunnelTableViews(index: number, applyToFirst: boolean, groupCondition: GroupingCondition | undefined = undefined ) {

  let groupCol = '';
  let newColumnTemplate = columnTemplateForFunnelVisual;

  if (groupCondition !== undefined && !applyToFirst) {
    groupCol = `,COALESCE(${buildColNameWithPrefix(groupCondition)}::varchar, null) as ${buildColNameWithPrefix(groupCondition)}`;
    newColumnTemplate += `${groupCol}`;
  }

  const firstTableColumns = `
     month
    ,week
    ,day
    ,hour
    ${ applyToFirst ? `,COALESCE(${buildColNameWithPrefix(groupCondition!)}::varchar, null) as ${buildColNameWithPrefix(groupCondition!)}` : ''}
    ,${newColumnTemplate.replace(/####/g, '_0').replace(/%%%%/g, '\'1_\' || ')}
  `;

  if (index === 0) {
    return firstTableColumns;
  }

  return newColumnTemplate.replace(/####/g, `_${index}`).replace(/%%%%/g, `'${index+1}_' || `);

}

function _buildJoinSqlForFunnelTableVisual(sqlParameters: SQLParameters, index:number,
  applyToFirst: boolean, groupCondition: GroupingCondition | undefined = undefined ) {

  let joinCondition = '';
  let joinConditionSQL = '';
  let groupingJoinSQL = '';

  if ( sqlParameters.specifyJoinColumn) {
    joinCondition = `on table_${index-1}.${sqlParameters.joinColumn}_${index-1} = table_${index}.${sqlParameters.joinColumn}_${index}`;
  } else {
    joinCondition = `on table_${index-1}.user_pseudo_id_${index-1} = table_${index}.user_pseudo_id_${index}`;
  }

  if (groupCondition !== undefined && !applyToFirst) {
    groupingJoinSQL = `and table_${index-1}.${buildColNameWithPrefix(groupCondition)} = table_${index}.${buildColNameWithPrefix(groupCondition)}`;
  }

  if (sqlParameters.conversionIntervalType == 'CUSTOMIZE') {
    joinConditionSQL = joinConditionSQL.concat(`left outer join table_${index} ${joinCondition} ${groupingJoinSQL} and EXTRACT(epoch FROM table_${index}.event_timestamp_${index} - table_${index-1}.event_timestamp_${index-1}) > 0 and EXTRACT(epoch FROM table_${index}.event_timestamp_${index} - table_0.event_timestamp_0) <= cast(${sqlParameters.conversionIntervalInSeconds} as bigint) \n`);
  } else {
    joinConditionSQL = joinConditionSQL.concat(`left outer join table_${index} ${joinCondition} ${groupingJoinSQL} and EXTRACT(epoch FROM table_${index}.event_timestamp_${index} - table_${index-1}.event_timestamp_${index-1}) > 0 and TO_CHAR(table_${index-1}.event_timestamp_${index-1}, 'YYYY-MM-DD') = TO_CHAR(table_${index}.event_timestamp_${index}, 'YYYY-MM-DD')  \n`);
  }

  return joinConditionSQL;

}

function _buildFunnelBaseSqlForTableVisual(eventNames: string[], sqlParameters: SQLParameters,
  groupCondition: GroupingCondition | undefined = undefined) : string {

  let sql = _buildCommonPartSql(ExploreAnalyticsType.FUNNEL, eventNames, sqlParameters);

  const applyToFirst = groupCondition?.applyTo === 'FIRST';

  for (const [index, event] of sqlParameters.eventAndConditions!.entries()) {
    let filterSql = '';
    filterSql = buildConditionSql(sqlParameters.eventAndConditions![index].sqlCondition);
    if (filterSql !== '') {
      filterSql = `and (${filterSql}) `;
    }

    sql = sql.concat(`
    table_${index} as (
      select 
        ${_buildColumnsForFunnelTableViews(index, applyToFirst, groupCondition)}
      from base_data base
      where event_name = '${event.eventName}'
      ${filterSql}
    ),
    `);
  }

  let joinConditionSQL = '';
  let joinColumnsSQL = '';

  for (const [index, _item] of sqlParameters.eventAndConditions!.entries()) {
    if (index === 0) {
      continue;
    }
    joinColumnsSQL = joinColumnsSQL.concat(`, table_${index}.event_id_${index} \n`);
    joinColumnsSQL = joinColumnsSQL.concat(`, table_${index}.event_name_${index} \n`);
    joinColumnsSQL = joinColumnsSQL.concat(`, table_${index}.user_pseudo_id_${index} \n`);
    joinColumnsSQL = joinColumnsSQL.concat(`, table_${index}.event_timestamp_${index} \n`);

    joinConditionSQL += _buildJoinSqlForFunnelTableVisual(sqlParameters, index, applyToFirst, groupCondition);
  }

  sql = sql.concat(`
    join_table as (
      select table_0.*
        ${joinColumnsSQL}
      from table_0 
        ${joinConditionSQL}
    )`,
  );

  return sql;
};

function _buildEventAnalysisBaseSql(eventNames: string[], sqlParameters: SQLParameters) : string {

  let sql = _buildCommonPartSql(ExploreAnalyticsType.EVENT, eventNames, sqlParameters);
  const buildResult = _buildEventCondition(sqlParameters, sql);
  sql = buildResult.sql;

  let joinTableSQL = '';
  for (const [index, _item] of sqlParameters.eventAndConditions!.entries()) {

    let unionSql = '';
    if (index > 0) {
      unionSql = 'union all';
    }
    let idSql = '';
    if (buildResult.computedMethodList[index] === ExploreComputeMethod.EVENT_CNT) {
      idSql = `, table_${index}.event_id_${index} as x_id`;
    } else {
      idSql = `, table_${index}.user_pseudo_id_${index} as x_id`;
    }
    let groupColSql = '';
    let groupCol = '';
    if (sqlParameters.groupCondition !== undefined) {
      groupCol = buildColNameWithPrefix(sqlParameters.groupCondition);
      groupColSql = `, table_${index}.${groupCol}_${index} as ${groupCol}`;
    }

    joinTableSQL = joinTableSQL.concat(`
    ${unionSql}
    select 
      table_${index}.month
    , table_${index}.week
    , table_${index}.day
    , table_${index}.hour
    , ${index+1} || '_' || table_${index}.event_name_${index} as event_name
    , table_${index}.event_timestamp_${index} as event_timestamp
    ${idSql}
    ${groupColSql}
    from table_${index}
    `);

  }

  sql = sql.concat(`
    join_table as (
      ${joinTableSQL}
    )`,
  );

  return sql;
};

function _buildIDColumnSql(index: number, eventAndCondition: EventAndCondition, extParamProps: ComputeMethodProps) {
  let idSql = '';
  if (extParamProps.hasAggregationPropertyMethod) {
    idSql = `
    , table_${index}.event_id_${index} as x_id
    , table_${index}.custom_attr_${index} as custom_attr_id
    `;
  } else {
    if (extParamProps.hasCounntPropertyMethod) {

      if (eventAndCondition.computeMethod === ExploreComputeMethod.EVENT_CNT) {
        idSql = `
        , null as x_id
        , table_${index}.event_id_${index} as custom_attr_id
        `;
      } else if (eventAndCondition.computeMethod === ExploreComputeMethod.USER_ID_CNT) {
        idSql = `
        , null as x_id
        , table_${index}.user_pseudo_id_${index} as custom_attr_id
        `;
      } else {
        idSql = `
        , table_${index}.custom_attr_${index} as x_id
        , table_${index}.event_id_${index} as custom_attr_id
        `;
      }
    } else {
      if (eventAndCondition.computeMethod === ExploreComputeMethod.EVENT_CNT) {
        idSql = `, table_${index}.event_id_${index} as x_id`;
      } else if (eventAndCondition.computeMethod === ExploreComputeMethod.USER_ID_CNT) {
        idSql = `, table_${index}.user_pseudo_id_${index} as x_id`;
      }
    }
  }

  return idSql;
}

function _buildIDColumnSqlMixedMode(index: number, eventAndCondition: EventAndCondition) {
  let idSql = '';

  if (eventAndCondition.computeMethod === ExploreComputeMethod.EVENT_CNT) {
    idSql = `
    , table_${index}.event_id_${index} as x_id
    , table_${index}.custom_attr_${index} as custom_attr_id 
    `;
  } else if (eventAndCondition.computeMethod === ExploreComputeMethod.USER_ID_CNT) {
    idSql = `
    , table_${index}.user_pseudo_id_${index} as x_id
    , table_${index}.custom_attr_${index} as custom_attr_id 
    `;
  } else {
    idSql = `
    , table_${index}.event_id_${index} as x_id
    , table_${index}.custom_attr_${index} as custom_attr_id
    `;
  }
  return idSql;
}

function _buildQueryColumnSqlMixedMode(eventAndCondition: EventAndCondition, groupCol: string, dateGroupCol: string) {
  let sql = '';
  let groupby = ',custom_attr_id';
  if (eventAndCondition.computeMethod === ExploreComputeMethod.EVENT_CNT
      || eventAndCondition.computeMethod === ExploreComputeMethod.USER_ID_CNT) {
    sql = `
      ${dateGroupCol} as event_date,
      event_name,
      ${groupCol === '' ? '' : groupCol+','}
      null as custom_attr_id,
      count(distinct x_id)  as "count/aggregation amount"
    `;
    groupby = '';
  } else if (eventAndCondition.computeMethod === ExploreComputeMethod.COUNT_PROPERTY) {
    sql = `
      ${dateGroupCol} as event_date,
      event_name,
      ${groupCol === '' ? '' : groupCol+','}
      custom_attr_id,
      count(1) as "count/aggregation amount"
    `;
  } else {
    let method = eventAndCondition.eventExtParameter!.aggregationMethod?.toUpperCase();
    sql = `
      ${dateGroupCol} as event_date,
      event_name,
      ${groupCol === '' ? '' : groupCol+','}
      null as custom_attr_id,
      ${method}(custom_attr_id) as "count/aggregation amount"
    `;
    groupby = '';
  }

  return {
    sql,
    groupby,
  };
}

function _buildEventPropertyAnalysisBaseSqlCase1(sqlParameters: SQLParameters, extParamProps: ComputeMethodProps) {

  let joinTableSQL = '';

  for (const [index, item] of sqlParameters.eventAndConditions!.entries()) {
    let unionSql = '';
    if (index > 0) {
      unionSql = 'union all';
    }

    let idSql = _buildIDColumnSql(index, item, extParamProps);

    let groupColSql = '';
    let groupCol = '';
    if (sqlParameters.groupCondition !== undefined) {
      groupCol = buildColNameWithPrefix(sqlParameters.groupCondition);
      groupColSql = `, table_${index}.${groupCol}_${index} as ${groupCol}`;
    }

    joinTableSQL = joinTableSQL.concat(`
    ${unionSql}
    select
      table_${index}.month
    , table_${index}.week
    , table_${index}.day
    , table_${index}.hour
    , ${index+1} || '_' || table_${index}.event_name_${index} as event_name
    , table_${index}.event_timestamp_${index} as event_timestamp
    ${idSql}
    ${groupColSql}
    from table_${index}
    `);

  }

  return joinTableSQL;

}

function _buildEventPropertyAnalysisBaseSql(eventNames: string[], sqlParameters: SQLParameters) : string {

  let sql = _buildCommonPartSql(ExploreAnalyticsType.EVENT, eventNames, sqlParameters);
  const buildResult = _buildEventCondition(sqlParameters, sql);
  sql = buildResult.sql;

  let joinTableSQL = '';

  const extParamProps = getComputeMethodProps(sqlParameters);
  if (extParamProps.isMixedMethod || (extParamProps.hasAggregationPropertyMethod && !extParamProps.isSameAggregationMethod)) {
    for (const [index, item] of sqlParameters.eventAndConditions!.entries()) {
      let unionSql = '';
      if (index > 0) {
        unionSql = 'union all';
      }

      let groupColSql = '';
      let groupCol = '';
      if (sqlParameters.groupCondition !== undefined) {
        groupCol = buildColNameWithPrefix(sqlParameters.groupCondition);
        groupColSql = `, table_${index}.${groupCol}_${index} as ${groupCol}`;
      }

      const idSql = _buildIDColumnSqlMixedMode(index, item);
      const query = _buildQueryColumnSqlMixedMode(item, groupCol, sqlParameters.groupColumn!);

      joinTableSQL = joinTableSQL.concat(`
      ${unionSql}
      select 
        ${query.sql}
        from(
          select
            table_${index}.month
          , table_${index}.week
          , table_${index}.day
          , table_${index}.hour
          , ${index+1} || '_' || table_${index}.event_name_${index} as event_name
          , table_${index}.event_timestamp_${index} as event_timestamp
          ${idSql}
          ${groupColSql}
          from table_${index}
        ) as union_table_${index}
        group by ${sqlParameters.groupColumn}, event_name ${groupCol === '' ? '': ',' + groupCol} ${query.groupby}
      `);
    }
  } else {
    joinTableSQL = _buildEventPropertyAnalysisBaseSqlCase1(sqlParameters, extParamProps);
  }

  sql = sql.concat(`
    join_table as (
      ${joinTableSQL}
    )`,
  );

  return sql;
};

function _getUnionBaseDataForEventPathAnalysis(eventNames: string[], sqlParameters: SQLParameters, isSessionJoin: boolean = false) {
  let sql = 'union_base_data as (';
  for (const [index, eventCondition] of sqlParameters.eventAndConditions!.entries()) {
    const eventName = eventCondition.eventName;
    const conditionSql = buildConditionSql(eventCondition.sqlCondition);

    if (index > 0) {
      sql += 'union all';
    }

    sql += `
    select 
      CASE 
        WHEN event_name in ('${eventNames.join('\',\'')}')  THEN '${index+1}_' || event_name 
        ELSE 'other' 
      END as event_name,
      user_pseudo_id,
      event_id,
      event_timestamp,
      day
      ${isSessionJoin ? ',session_id' : ''}
    from base_data
    where event_name = '${eventName}' ${conditionSql !== '' ? ` and (${conditionSql})` : ''}
    `;
  }
  sql += '),';

  return sql;

}

function _getMidTableForEventPathAnalysis(eventNames: string[], sqlParameters: SQLParameters, isSessionJoin: boolean) {

  let baseTable = 'base_data';
  let unionTableSql = '';
  let prefix = '';
  let midTableSql = '';
  let eventNameClause = `
    CASE
      WHEN event_name in ('${eventNames.join('\',\'')}')  THEN event_name 
      ELSE 'other'
    END as event_name,
  `;
  if (eventNames.length < sqlParameters.eventAndConditions!.length) {//has same event
    unionTableSql = _getUnionBaseDataForEventPathAnalysis(eventNames, sqlParameters, isSessionJoin);
    baseTable = 'union_base_data';
    eventNameClause = 'event_name,';
    prefix = '1_';
  }

  if (isSessionJoin) {
    if (sqlParameters.pathAnalysis?.mergeConsecutiveEvents) {
      midTableSql = `
        ${unionTableSql}
        mid_table as (
          select
            ${eventNameClause}
            user_pseudo_id,
            event_id,
            event_timestamp,
            event_date,
            session_id
          from (
            select 
              event_name,
              user_pseudo_id,
              event_id,
              event_timestamp,
              day as event_date,
              session_id,
              ROW_NUMBER() over(partition by event_name, user_pseudo_id, session_id order by event_timestamp desc) as rk
            from ${baseTable}
          ) where rk = 1
        ),
      `;
    } else {
      midTableSql = `
        ${unionTableSql}
        mid_table as (
          select 
            ${eventNameClause}
            user_pseudo_id,
            event_id,
            event_timestamp,
            day as event_date,
            session_id
          from ${baseTable}
        ),
     `;
    }
  } else {
    if (sqlParameters.pathAnalysis?.mergeConsecutiveEvents) {
      midTableSql = `
        ${unionTableSql}
        mid_table as (
          select
            ${eventNameClause}
            user_pseudo_id,
            event_id,
            event_timestamp,
            event_date
          from (
            select 
              event_name,
              user_pseudo_id,
              event_id,
              event_timestamp,
              day as event_date,
              ROW_NUMBER() over(partition by event_name, user_pseudo_id order by event_timestamp desc) as rk
            from ${baseTable}
          ) where rk = 1
        ),
      `;
    } else {
      midTableSql = `
      ${unionTableSql}
      mid_table as (
        select 
        ${eventNameClause}
        user_pseudo_id,
        event_id,
        event_timestamp,
        day as event_date
      from ${baseTable} base
      ),
      `;
    }
  }

  return {
    midTableSql,
    prefix,
  };
}

function _getMidTableForNodePathAnalysis(sqlParameters: SQLParameters, isSessionJoin: boolean) : string {

  if (isSessionJoin) {
    if (sqlParameters.pathAnalysis?.mergeConsecutiveEvents) {
      return `
        mid_table as (
          select 
            event_name,
            event_date,
            user_pseudo_id,
            event_id,
            event_timestamp,
            session_id,
            node
          from (
            select 
              mid_table_1.*,
              mid_table_2.node,
              ROW_NUMBER() over(partition by event_name, user_pseudo_id, session_id, node order by mid_table_1.event_timestamp desc) as rk
            from 
              mid_table_1 
              join mid_table_2 on mid_table_1.event_id = mid_table_2.event_id
          ) where rk = 1
        ),
      `;
    }

    return `
      mid_table as (
        select 
          mid_table_1.*,
          mid_table_2.node
        from 
          mid_table_1 
          join mid_table_2 on mid_table_1.event_id = mid_table_2.event_id
      ),
    `;
  } else {
    if (sqlParameters.pathAnalysis?.mergeConsecutiveEvents) {
      return `
      mid_table as (
        select 
          event_name,
          event_date,
          user_pseudo_id,
          event_id,
          event_timestamp,
          node
        from (
          select 
            mid_table_1.*,
            mid_table_2.node,
            ROW_NUMBER() over(partition by event_name, user_pseudo_id, node order by mid_table_1.event_timestamp desc) as rk
          from 
            mid_table_1 
            join mid_table_2 on mid_table_1.event_id = mid_table_2.event_id
        ) where rk = 1
      ),
      `;
    }

    return `
      mid_table as (
        select 
          mid_table_1.*,
          mid_table_2.node
        from 
          mid_table_1 
          join mid_table_2 on mid_table_1.event_id = mid_table_2.event_id
      ),
    `;

  }
}

export function buildColumnsSqlFromConditions(columns: ColumnAttribute[], prefix: string) {
  let columnsSql = '';
  const columnList: string[] = [];
  const columnNameList: string[] = [];
  for ( const col of columns) {
    if (columnNameList.includes(col.property) || basicColumns.includes(col.property) ) {
      continue;
    }

    if (col.category === ConditionCategory.USER) {
      columnsSql += `${prefix}.user_properties.${col.property}.value::${_getSqlColumnType(col.dataType)} as u_${col.property},`;
      columnList.push('u.u_' + col.property);
    } else if (col.category === ConditionCategory.EVENT) {
      columnsSql += `${prefix}.custom_parameters.${col.property}.value::${_getSqlColumnType(col.dataType)} as e_${col.property},`;
      columnList.push('event.e_' + col.property);
    } else if (col.category === ConditionCategory.USER_OUTER) {
      columnsSql += `${prefix}.${col.property},`;
      columnList.push('u.' + col.property);
    } else if (col.category === ConditionCategory.EVENT_OUTER) {
      columnsSql += `${prefix}.${col.property},`;
      columnList.push('event.' + col.property);
    }

    columnNameList.push(col.property);
  }

  return {
    columnsSql,
    columns: columnList,
  };
}

export function _buildCommonPartSql(analyticsType: ExploreAnalyticsType, eventNames: string[], sqlParameters: SQLParameters) : string {

  // build column sql from event condition
  const eventConditionProps = _getEventConditionProps(sqlParameters);
  const extraEventColumns: ColumnAttribute[] = [];
  if (analyticsType === ExploreAnalyticsType.NODE_PATH) {
    extraEventColumns.push({
      property: sqlParameters.pathAnalysis!.nodeType,
      dataType: MetadataValueType.STRING,
      category: ConditionCategory.EVENT_OUTER,
    });
  }
  const allColumns = eventConditionProps.eventNonNestAttributes.concat(eventConditionProps.eventAttributes.concat(extraEventColumns));
  const eventColumnSql = buildColumnsSqlFromConditions(allColumns, 'event').columnsSql;

  // build column sql from user condition
  const userConditionProps = _getUserConditionProps(analyticsType, sqlParameters);
  const columnsSql = buildColumnsSqlFromConditions(userConditionProps.userAttributes, 'event').columnsSql;

  // build base data sql
  const baseDataSql = _buildBaseEventDataSql(analyticsType, eventNames, sqlParameters, eventColumnSql, columnsSql,
    userConditionProps.hasComputeMethodOnUserId || userConditionProps.userAttributes.length > 0,
  );

  return format(baseDataSql, { language: 'postgresql' });
}

function _buildNodePathSQL(nodeType: ExplorePathNodeType) : string {
  return `
    select 
      base_data.event_timestamp,
      base_data.event_id,
      max(${nodeType}) as node
    from base_data
    group by 1,2
  `;
}

function _getSqlColumnType(dataType: MetadataValueType) {
  if (dataType === MetadataValueType.INTEGER) {
    return 'bigint';
  } else if (dataType === MetadataValueType.DOUBLE || dataType === MetadataValueType.FLOAT) {
    return 'double precision';
  } else {
    return 'varchar';
  }
}

function _buildEventNameClause(eventNames: string[], sqlParameters: SQLParameters, isEventPathAnalysis: boolean, isNodePathSQL: boolean, prefix: string = 'event.') {

  const includingOtherEvents: boolean = sqlParameters.pathAnalysis?.includingOtherEvents ? true : false;
  const eventNameInClause = `and ${prefix}event_name in ('${eventNames.join('\',\'')}')`;
  const eventNameClause = eventNames.length > 0 ? eventNameInClause : '';

  if (isNodePathSQL) {
    return `
    and ${prefix}event_name = '${ (sqlParameters.pathAnalysis?.platform === MetadataPlatform.ANDROID || sqlParameters.pathAnalysis?.platform === MetadataPlatform.IOS) ? '_screen_view' : '_page_view' }'
    ${sqlParameters.pathAnalysis!.platform ? 'and platform = \'' + sqlParameters.pathAnalysis!.platform + '\'' : '' }
    `;
  } else if (isEventPathAnalysis && includingOtherEvents) {
    return `and ${prefix}event_name not in ('${BUILTIN_EVENTS.filter(event => !eventNames.includes(event)).join('\',\'')}')`;
  }

  return eventNameClause;
}

export function buildDateUnitsSql() {

  return `
    TO_CHAR(
      event.event_timestamp,
      'YYYY-MM'
    ) as month,
    TO_CHAR(
      date_trunc(
        'week',
        event.event_timestamp
      ),
      'YYYY-MM-DD'
    ) as week,
    TO_CHAR(
      event.event_timestamp,
      'YYYY-MM-DD'
    ) as day,
    TO_CHAR(
      event.event_timestamp,
      'YYYY-MM-DD HH24'
    ) || '00:00' as hour
  `;
}

function _buildBaseEventDataSql(analyticsType: ExploreAnalyticsType, eventNames: string[],
  sqlParameters: SQLParameters,
  eventColumnSql: string,
  userColumnSql: string,
  needJoinUserTable: boolean = false,
) {

  const eventDateSQL = buildEventDateSql(sqlParameters, 'event.');
  const eventNameClause = _buildEventNameClause(eventNames, sqlParameters,
    analyticsType === ExploreAnalyticsType.EVENT_PATH, analyticsType === ExploreAnalyticsType.NODE_PATH);
  let globalConditionSql = buildAllConditionSql(sqlParameters.globalEventCondition);
  globalConditionSql = globalConditionSql !== '' ? `and (${globalConditionSql}) ` : '';

  let tableName = '';
  if (needJoinUserTable) {
    tableName = EVENT_USER_VIEW;
  } else {
    tableName = EVENT_TABLE;
  }

  return `
    with base_data as (
      select
        event.event_id,
        event.event_name,
        event.event_timestamp,
        event.user_pseudo_id,
        event.user_id,
        ${eventColumnSql}
        ${userColumnSql}
        ${buildDateUnitsSql()}
      from
        ${sqlParameters.dbName}.${sqlParameters.schemaName}.${tableName} as event
      where
        ${eventDateSQL}
        ${eventNameClause}
        ${globalConditionSql}
    ),
  `;
};

function _getStartDateForFixDateRange(date: Date, timeWindowInSeconds: number) {
  const dayCount = Math.ceil(timeWindowInSeconds / 86400);
  date.setDate(date.getDate() - dayCount);
  return formatDateToYYYYMMDD(date);
}

function _getStartDateForRelativeDateRange(lastN: number, timeUnit: ExploreRelativeTimeUnit, timeWindowInSeconds: number) {

  const dayCount = Math.ceil(timeWindowInSeconds / 86400);

  if (timeUnit === ExploreRelativeTimeUnit.WK) {
    return `DATEADD(DAY, -${dayCount}, date_trunc('week', current_date - interval '${lastN - 1} weeks'))` ;
  } else if (timeUnit === ExploreRelativeTimeUnit.MM) {
    return `DATEADD(DAY, -${dayCount}, date_trunc('month', current_date - interval '${lastN - 1} months'))`;
  } else if (timeUnit === ExploreRelativeTimeUnit.YY) {
    return `DATEADD(DAY, -${dayCount}, date_trunc('year', current_date - interval '${lastN - 1} years'))`;
  } else {
    return `DATEADD(DAY, -${dayCount}, date_trunc('day', current_date - interval '${lastN - 1} days'))`;
  }
}

export function buildEventDateSql(sqlParameters: BaseSQLParameters, prefix: string = '', timeWindowInSeconds?: number) {
  let eventDateSQL = '';
  if (timeWindowInSeconds) {
    if (sqlParameters.timeScopeType === ExploreTimeScopeType.FIXED) {
      eventDateSQL = eventDateSQL.concat(`DATE(${prefix}event_timestamp) >= date ${_getStartDateForFixDateRange(sqlParameters.timeStart!, timeWindowInSeconds)} and DATE(${prefix}event_timestamp) <= date ${formatDateToYYYYMMDD(sqlParameters.timeEnd!)}`);
    } else {
      eventDateSQL = eventDateSQL.concat(`DATE(${prefix}event_timestamp) >= ${_getStartDateForRelativeDateRange(sqlParameters.lastN!, sqlParameters.timeUnit!, timeWindowInSeconds)} and DATE(${prefix}event_timestamp) <= CURRENT_DATE`);
    }
  } else {
    if (sqlParameters.timeScopeType === ExploreTimeScopeType.FIXED) {
      eventDateSQL = eventDateSQL.concat(`DATE(${prefix}event_timestamp) >= date ${formatDateToYYYYMMDD(sqlParameters.timeStart!)} and DATE(${prefix}event_timestamp) <= date ${formatDateToYYYYMMDD(sqlParameters.timeEnd!)}`);
    } else {
      if (sqlParameters.timeUnit === ExploreRelativeTimeUnit.WK) {
        eventDateSQL = eventDateSQL.concat(`DATE(${prefix}event_timestamp) >= date_trunc('week', current_date - interval '${sqlParameters.lastN! - 1} weeks') and DATE(${prefix}event_timestamp) <= CURRENT_DATE`);
      } else if (sqlParameters.timeUnit === ExploreRelativeTimeUnit.MM) {
        eventDateSQL = eventDateSQL.concat(`DATE(${prefix}event_timestamp) >= date_trunc('month', current_date - interval '${sqlParameters.lastN! - 1} months') and DATE(${prefix}event_timestamp) <= CURRENT_DATE`);
      } else if (sqlParameters.timeUnit === ExploreRelativeTimeUnit.YY) {
        eventDateSQL = eventDateSQL.concat(`DATE(${prefix}event_timestamp) >= date_trunc('year', current_date - interval '${sqlParameters.lastN! - 1} years') and DATE(${prefix}event_timestamp) <= CURRENT_DATE`);
      } else {
        eventDateSQL = eventDateSQL.concat(`DATE(${prefix}event_timestamp) >= date_trunc('day', current_date - interval '${sqlParameters.lastN! - 1} days') and DATE(${prefix}event_timestamp) <= CURRENT_DATE`);
      }
    }
  }

  return eventDateSQL;
}

export function buildColNameWithPrefix(groupCondition: ColumnAttribute) {

  let prefix = '';
  if (groupCondition.category === ConditionCategory.EVENT) {
    prefix = 'e_';
  } else if (groupCondition.category === ConditionCategory.USER) {
    prefix = 'u_';
  }

  return `${prefix}${groupCondition.property}`;
}

export function getComputeMethodProps(sqlParameters: SQLParameters): EventComputeMethodsProps {
  let eventAndConditions = sqlParameters.eventAndConditions;
  let hasExtParameter: boolean = false;
  let hasCounntPropertyMethod: boolean = false;
  let hasAggregationPropertyMethod: boolean = false;
  let hasIdCountMethod: boolean = false;
  const aggregationMethodSet: Set<ExploreAggregationMethod> = new Set();
  for (const item of eventAndConditions!) {
    if (item.eventExtParameter !== undefined) {
      hasExtParameter = true;
    }
    if (item.computeMethod === ExploreComputeMethod.COUNT_PROPERTY) {
      hasCounntPropertyMethod = true;
    }

    if (item.computeMethod === ExploreComputeMethod.AGGREGATION_PROPERTY) {
      hasAggregationPropertyMethod = true;
      aggregationMethodSet.add(item.eventExtParameter!.aggregationMethod!);
    }

    if (item.computeMethod === ExploreComputeMethod.EVENT_CNT || item.computeMethod === ExploreComputeMethod.USER_ID_CNT) {
      hasIdCountMethod = true;
    }
  }

  const isMixedMethod = hasAggregationPropertyMethod && (hasCounntPropertyMethod || hasIdCountMethod);
  const isSameAggregationMethod = !isMixedMethod && aggregationMethodSet.size === 1 && hasAggregationPropertyMethod;
  const aggregationMethodName = isSameAggregationMethod ? aggregationMethodSet.values().next().value : undefined;
  const isCountMixedMethod = hasCounntPropertyMethod && hasIdCountMethod && !hasAggregationPropertyMethod;

  return {
    hasExtParameter,
    hasCounntPropertyMethod,
    hasAggregationPropertyMethod,
    hasIdCountMethod,
    isMixedMethod,
    isSameAggregationMethod,
    isCountMixedMethod,
    aggregationMethodName,
  };
}

function _buildEventCondition(sqlParameters: SQLParameters, baseSQL: string) {
  let sql = baseSQL;
  let groupCol = '';
  let newColumnTemplate = columnTemplate;
  if (sqlParameters.groupCondition !== undefined) {
    groupCol = `,${buildColNameWithPrefix(sqlParameters.groupCondition)}`;
    newColumnTemplate += `${groupCol} as ${buildColNameWithPrefix(sqlParameters.groupCondition)}####`;
  }

  const extParamProps = getComputeMethodProps(sqlParameters);
  const computedMethodList: ExploreComputeMethod[] = [];
  for (const [index, event] of sqlParameters.eventAndConditions!.entries()) {
    let extCol = '';
    if (extParamProps.hasExtParameter) {
      if (event.eventExtParameter !== undefined) {
        extCol = `,${buildColNameWithPrefix(event.eventExtParameter.targetProperty)} as custom_attr_${index}`;
      } else {
        extCol = `,null as custom_attr_${index}`;
      }
    }

    computedMethodList.push(sqlParameters.eventAndConditions![index].computeMethod ?? ExploreComputeMethod.EVENT_CNT);
    let tableColumns = `
       month
      ,week
      ,day
      ,hour
      ${extCol}
      ,${newColumnTemplate.replace(/####/g, `_${index}`)}
    `;

    let filterSql = '';
    filterSql = buildConditionSql(sqlParameters.eventAndConditions![index].sqlCondition);
    if (filterSql !== '') {
      filterSql = `and (${filterSql}) `;
    }

    sql = sql.concat(`
    table_${index} as (
      select 
        ${tableColumns}
      from base_data base
      where event_name = '${event.eventName}'
      ${filterSql}
    ),
    `);
  }
  return { sql, computedMethodList };
}

function _buildConditionSQLForRetention(eventName: string, sqlCondition: SQLCondition | undefined) {

  let sql = '';
  sql = buildConditionSql(sqlCondition);
  if (sql !== '') {
    sql = `and (${sql}) `;
  }

  return `
    event_name = '${eventName}' ${sql}
  `;
}

function _buildRetentionAnalysisSQLs(sqlParameters: SQLParameters) {
  let tableSql = '';
  let resultSql = '';

  let groupColSql = '';
  let resultGroupColSql = '';
  let groupJoinCol = '';
  let colName = '';
  if (sqlParameters.groupCondition !== undefined) {
    const groupCondition = sqlParameters.groupCondition;
    colName = buildColNameWithPrefix(groupCondition);
    groupColSql = `${colName},`;
    groupJoinCol = `and first_table_####.${colName} = second_table_####.${colName}`;
  }

  for (const [index, pair] of sqlParameters.pairEventAndConditions!.entries()) {

    const startConditionSql = _buildConditionSQLForRetention(pair.startEvent.eventName, pair.startEvent.sqlCondition);
    const backConditionSql = _buildConditionSQLForRetention(pair.backEvent.eventName, pair.backEvent.sqlCondition);

    let { joinColLeft, joinColRight, joinSql } = _buildJoinSQL(pair, index);

    tableSql = tableSql.concat(
      `
      first_table_${index} as (
        select 
          day::date as event_date,
          event_name,
          ${joinColLeft}
          ${groupColSql}
          user_pseudo_id
        from base_data join first_date on base_data.day::date = first_date.first_date
        ${startConditionSql !== '' ? 'where ' + startConditionSql : ''}
      ),
      second_table_${index} as (
        select 
          day::date as event_date,
          event_name,
          ${joinColRight}
          ${groupColSql}
          user_pseudo_id
        from base_data join first_date on base_data.day::date >= first_date.first_date
        ${backConditionSql !== '' ? 'where ' + backConditionSql : ''}
      ),
      `,
    );

    if (index > 0) {
      resultSql = resultSql.concat(`
      union all
      `);
    }

    if (sqlParameters.groupCondition !== undefined) {
      resultGroupColSql = `first_table_${index}.${colName},`;
    }

    resultSql = resultSql.concat(`
    select 
      ${resultGroupColSql}
      first_table_${index}.event_name || '_' || ${index} as grouping,
      first_table_${index}.event_date as start_event_date,
      first_table_${index}.user_pseudo_id as start_user_pseudo_id,
      date_list.event_date as event_date,
      second_table_${index}.user_pseudo_id as end_user_pseudo_id,
      second_table_${index}.event_date as end_event_date
    from first_table_${index} 
    join date_list on 1=1
    left join second_table_${index} on date_list.event_date = second_table_${index}.event_date 
    and first_table_${index}.user_pseudo_id = second_table_${index}.user_pseudo_id
    ${joinSql}
    ${groupJoinCol.replace(/####/g, index.toString())}
    `);
  }
  return { tableSql, resultSql };
}

function _buildJoinSQL(pair: PairEventAndCondition, index: number) {
  let joinSql = '';
  let joinColLeft = '';
  let joinColRight = '';
  if (pair.startEvent.retentionJoinColumn && pair.backEvent.retentionJoinColumn) {
    let prefixLeft = '';
    let prefixRight = '';

    if (pair.startEvent.retentionJoinColumn.category === ConditionCategory.EVENT
    ) {
      prefixLeft = 'e_';
    } else if (pair.startEvent.retentionJoinColumn.category === ConditionCategory.USER) {
      prefixLeft = 'u_';
    }

    if (pair.backEvent.retentionJoinColumn.category === ConditionCategory.EVENT
    ) {
      prefixRight = 'e_';
    } else if (pair.backEvent.retentionJoinColumn.category === ConditionCategory.USER) {
      prefixRight = 'u_';
    }

    joinColLeft = `${prefixLeft}${pair.startEvent.retentionJoinColumn.property},`;
    joinColRight = `${prefixRight}${pair.backEvent.retentionJoinColumn.property},`;

    joinSql = `
      and first_table_${index}.${prefixLeft}${pair.startEvent.retentionJoinColumn.property} = second_table_${index}.${prefixRight}${pair.backEvent.retentionJoinColumn.property}
    `;
  }
  return { joinColLeft, joinColRight, joinSql };
}

function _buildDateListSQL(sqlParameters: SQLParameters) {
  let dateList: string[] = [];
  if (sqlParameters.timeScopeType === ExploreTimeScopeType.FIXED) {
    dateList.push(...generateDateList(new Date(sqlParameters.timeStart!), new Date(sqlParameters.timeEnd!)));
  } else {
    const daysCount = getLastNDayNumber(sqlParameters.lastN!-1, sqlParameters.timeUnit!);
    for (let n = 0; n < daysCount; n++) {
      dateList.push(`
       (CURRENT_DATE - INTERVAL '${n} day') 
      `);
    }
  }

  let dateListSql = 'date_list as (';
  for (const [index, dt] of dateList.entries()) {
    if (index > 0) {
      dateListSql = dateListSql.concat(`
      union all
      `);
    }
    dateListSql = dateListSql.concat(`select ${dt}::date as event_date`);
  }
  dateListSql = dateListSql.concat(`
  ),
  `);
  return dateListSql;
}

function generateDateList(startDate: Date, endDate: Date): string[] {
  const dateList: string[] = [];
  let currentDate = new Date(startDate);
  currentDate.setDate(currentDate.getDate());

  while (currentDate <= endDate) {
    dateList.push(formatDateToYYYYMMDD(new Date(currentDate)) );
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dateList;
}

export function buildConditionSql(sqlCondition: SQLCondition | undefined) {
  if (!sqlCondition) {
    return '';
  }

  let sql = '';
  for (const condition of sqlCondition.conditions) {

    let conditionSql = '';
    if (condition.category === ConditionCategory.EVENT) {
      conditionSql = buildSqlFromCondition(condition, 'e_');
    } else if (condition.category === ConditionCategory.USER) {
      conditionSql = buildSqlFromCondition(condition, 'u_');
    } else {
      conditionSql = buildSqlFromCondition(condition);
    }
    sql = sql.concat(`
      ${sql === '' ? '' : sqlCondition.conditionOperator ?? 'and'} ${conditionSql}
    `);
  }

  return sql;
}

function _getOneConditionSql(condition: Condition) {
  let category: string = '';
  if (condition.category === ConditionCategory.USER) {
    category = 'u_';
  } else if (condition.category === ConditionCategory.EVENT) {
    category = 'e_';
  }

  return buildSqlFromCondition(condition, category);
}

export function buildAllConditionSql(sqlCondition: SQLCondition | undefined) {
  if (!sqlCondition) {
    return '';
  }

  let sql = '';
  for (const condition of sqlCondition.conditions) {
    const conditionSql = _getOneConditionSql(condition);

    sql = sql.concat(`
    ${sql === '' ? '' : sqlCondition.conditionOperator ?? 'and'} ${conditionSql}
  `);
  }

  return sql;
}

export function getLastNDayNumber(lastN: number, timeUnit: ExploreRelativeTimeUnit) : number {
  const currentDate = new Date();
  let targetDate: Date = new Date();
  if (timeUnit === ExploreRelativeTimeUnit.WK) {
    targetDate = getMondayOfLastNWeeks(currentDate, lastN);
  } else if (timeUnit === ExploreRelativeTimeUnit.MM) {
    targetDate = getFirstDayOfLastNMonths(currentDate, lastN);
  } else if (timeUnit === ExploreRelativeTimeUnit.YY) {
    targetDate = getFirstDayOfLastNYears(currentDate, lastN);
  }
  return daysBetweenDates(currentDate, targetDate);
}

export function daysBetweenDates(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  const diffDays = Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
  return diffDays;
}

function buildSqlFromCondition(condition: Condition, propertyPrefix?: string) : string {

  const prefix = propertyPrefix ?? '';
  switch (condition.dataType) {
    case MetadataValueType.STRING:
      return _buildSqlFromStringCondition(condition, prefix);
    case MetadataValueType.DOUBLE:
    case MetadataValueType.FLOAT:
    case MetadataValueType.INTEGER:
      return _buildSqlFromNumberCondition(condition, prefix);
    default:
      logger.error('unsupported condition', { condition });
      throw new Error('Unsupported condition');
  }
}

function _buildSqlFromStringCondition(condition: Condition, prefix: string) : string {
  switch (condition.operator) {
    case ExploreAnalyticsOperators.EQUAL:
    case ExploreAnalyticsOperators.GREATER_THAN:
    case ExploreAnalyticsOperators.GREATER_THAN_OR_EQUAL:
    case ExploreAnalyticsOperators.LESS_THAN:
    case ExploreAnalyticsOperators.LESS_THAN_OR_EQUAL:
      return `${prefix}${condition.property} ${condition.operator} '${condition.value[0]}'`;
    case ExploreAnalyticsOperators.NOT_EQUAL:
      return `(${prefix}${condition.property} is null or ${prefix}${condition.property} ${condition.operator} '${condition.value[0]}')`;
    case ExploreAnalyticsOperators.IN:
      const values = '\'' + condition.value.join('\',\'') + '\'';
      return `${prefix}${condition.property} in (${values})`;
    case ExploreAnalyticsOperators.NOT_IN:
      const notValues = '\'' + condition.value.join('\',\'') + '\'';
      return `(${prefix}${condition.property} is null or ${prefix}${condition.property} not in (${notValues}))`;
    case ExploreAnalyticsOperators.CONTAINS:
      return `${prefix}${condition.property} like '%${_encodeValueForLikeOperator(condition.value[0])}%'`;
    case ExploreAnalyticsOperators.NOT_CONTAINS:
      return `(${prefix}${condition.property} is null or ${prefix}${condition.property} not like '%${_encodeValueForLikeOperator(condition.value[0])}%')`;
    case ExploreAnalyticsOperators.NULL:
      return `${prefix}${condition.property} is null `;
    case ExploreAnalyticsOperators.NOT_NULL:
      return `${prefix}${condition.property} is not null `;
    default:
      logger.error('unsupported condition', { condition });
      throw new Error('Unsupported condition');
  }

}

function _encodeValueForLikeOperator(value: string) {
  return value.replace(/%/g, '\\\\%').replace(/_/g, '\\\\_');
}

function _buildSqlFromNumberCondition(condition: Condition, prefix: string) : string {
  switch (condition.operator) {
    case ExploreAnalyticsOperators.EQUAL:
    case ExploreAnalyticsOperators.GREATER_THAN:
    case ExploreAnalyticsOperators.GREATER_THAN_OR_EQUAL:
    case ExploreAnalyticsOperators.LESS_THAN:
    case ExploreAnalyticsOperators.LESS_THAN_OR_EQUAL:
      return `${prefix}${condition.property} ${condition.operator} ${condition.value[0]}`;
    case ExploreAnalyticsOperators.NOT_EQUAL:
      return `(${prefix}${condition.property} is null or ${prefix}${condition.property} ${condition.operator} ${condition.value[0]})`;
    case ExploreAnalyticsOperators.IN:
      const values = condition.value.join(',');
      return `${prefix}${condition.property} in (${values})`;
    case ExploreAnalyticsOperators.NOT_IN:
      const notValues = condition.value.join(',');
      return `(${prefix}${condition.property} is null or ${prefix}${condition.property} not in (${notValues}))`;
    case ExploreAnalyticsOperators.NULL:
      return `${prefix}${condition.property} is null `;
    case ExploreAnalyticsOperators.NOT_NULL:
      return `${prefix}${condition.property} is not null `;
    default:
      logger.error('unsupported condition', { condition });
      throw new Error('Unsupported condition');
  }

}

export function buildEventsNameFromConditions(eventAndConditions: EventAndCondition[]) {
  const eventNames: string[] = [];
  for (const e of eventAndConditions) {
    eventNames.push(e.eventName);
  }
  return [...new Set(eventNames)];
}

function _getRetentionAnalysisViewEventNames(sqlParameters: SQLParameters) : string[] {

  const eventNames: string[] = [];

  for (const pair of sqlParameters.pairEventAndConditions!) {
    eventNames.push(pair.startEvent.eventName);
    eventNames.push(pair.backEvent.eventName);
  }

  return [...new Set(eventNames)];
}

function _getRetentionDateSql(groupCol: string) {
  if (groupCol === ExploreGroupColumn.WEEK) {
    //sunday as first day of week to align with quicksight
    return `
      DATE_TRUNC('week', start_event_date) - INTERVAL '1 day' as start_event_date,
      DATE_TRUNC('week', event_date) - INTERVAL '1 day' as event_date,
    `;
  } else if (groupCol === ExploreGroupColumn.MONTH) {
    return `
      DATE_TRUNC('month', start_event_date) as start_event_date,
      DATE_TRUNC('month', event_date) as event_date,
    `;
  }

  return `
    start_event_date,
    event_date,
  `;
}

export function buildConditionProps(conditions: Condition[]) {

  let hasUserAttribute = false;
  let hasUserOuterAttribute =false;
  let hasEventAttribute = false;
  let hasEventNonNestAttribute = false;
  const userAttributes: ColumnAttribute[] = [];
  const eventAttributes: ColumnAttribute[] = [];
  const userOuterAttributes: ColumnAttribute[] = [];
  const eventNonNestAttributes: ColumnAttribute[] = [];

  for (const condition of conditions) {
    if (condition.category === ConditionCategory.USER) {
      hasUserAttribute = true;
      userAttributes.push({
        property: condition.property,
        category: condition.category,
        dataType: condition.dataType,
      });
    } else if (condition.category === ConditionCategory.EVENT) {
      hasEventAttribute = true;
      eventAttributes.push({
        property: condition.property,
        category: condition.category,
        dataType: condition.dataType,
      });
    } else if (condition.category === ConditionCategory.USER_OUTER) {
      hasUserOuterAttribute = true;
      userOuterAttributes.push({
        property: condition.property,
        category: condition.category,
        dataType: condition.dataType,
      });
    } else {
      hasEventNonNestAttribute = true;
      eventNonNestAttributes.push({
        property: condition.property,
        category: condition.category,
        dataType: condition.dataType,
      });
    }
  }

  return {
    hasEventAttribute,
    hasUserAttribute,
    hasUserOuterAttribute,
    userAttributes,
    eventAttributes,
    userOuterAttributes,
    hasEventNonNestAttribute,
    eventNonNestAttributes,
  };
}

function _getGroupingConditionProps(groupCondition: GroupingCondition) {

  let hasUserAttribute = false;
  let hasUserOuterAttribute = false;
  let hasEventAttribute = false;
  let hasEventNonNestAttribute = false;
  const userAttributes: ColumnAttribute[] = [];
  const eventAttributes: ColumnAttribute[] = [];
  const userOuterAttributes: ColumnAttribute[] = [];
  const eventNonNestAttributes: ColumnAttribute[] = [];

  if (groupCondition.category === ConditionCategory.USER) {
    hasUserAttribute = true;
    userAttributes.push({
      property: groupCondition.property,
      category: groupCondition.category,
      dataType: groupCondition.dataType,
    });
  } else if (groupCondition.category === ConditionCategory.EVENT) {
    hasEventAttribute = true;
    eventAttributes.push({
      property: groupCondition.property,
      category: groupCondition.category,
      dataType: groupCondition.dataType,
    });
  } else if (groupCondition.category === ConditionCategory.USER_OUTER) {
    hasUserOuterAttribute = true;
    userOuterAttributes.push({
      property: groupCondition.property,
      category: groupCondition.category,
      dataType: groupCondition.dataType,
    });
  } else {
    hasEventNonNestAttribute = true;
    eventNonNestAttributes.push({
      property: groupCondition.property,
      category: groupCondition.category,
      dataType: groupCondition.dataType,
    });
  }

  return {
    hasEventAttribute,
    hasUserAttribute,
    hasUserOuterAttribute,
    hasEventNonNestAttribute,
    userAttributes,
    eventAttributes,
    userOuterAttributes,
    eventNonNestAttributes,
  };
}

export function buildEventConditionPropsFromEvents(eventAndConditions: EventAndCondition[]) {

  let hasEventAttribute = false;
  const eventAttributes: ColumnAttribute[] = [];
  let hasEventNonNestAttribute = false;
  const eventNonNestAttributes: ColumnAttribute[] = [];

  for (const eventCondition of eventAndConditions) {
    if (eventCondition.sqlCondition?.conditions !== undefined) {
      const allAttribute = buildConditionProps(eventCondition.sqlCondition?.conditions);
      hasEventAttribute = hasEventAttribute || allAttribute.hasEventAttribute;
      eventAttributes.push(...allAttribute.eventAttributes);

      hasEventNonNestAttribute = hasEventNonNestAttribute || allAttribute.hasEventNonNestAttribute;
      eventNonNestAttributes.push(...allAttribute.eventNonNestAttributes);
    }

    const extAttributeProps = buildColumnConditionProps(eventCondition.eventExtParameter?.targetProperty);
    hasEventAttribute = hasEventAttribute || extAttributeProps.hasEventAttribute;
    eventAttributes.push(...extAttributeProps.eventAttributes);
    hasEventNonNestAttribute = hasEventNonNestAttribute || extAttributeProps.hasEventNonNestAttribute;
    eventNonNestAttributes.push(...extAttributeProps.eventNonNestAttributes);
  }

  return {
    hasEventAttribute,
    hasEventNonNestAttribute,
    eventAttributes,
    eventNonNestAttributes,
  };

}

function _getEventConditionProps(sqlParameters: SQLParameters) {

  let hasEventAttribute = false;
  const eventAttributes: ColumnAttribute[] = [];

  let hasEventNonNestAttribute = false;
  const eventNonNestAttributes: ColumnAttribute[] = [];

  if (sqlParameters.eventAndConditions) {
    const eventCondition = buildEventConditionPropsFromEvents(sqlParameters.eventAndConditions);
    hasEventAttribute = hasEventAttribute || eventCondition.hasEventAttribute;
    eventAttributes.push(...eventCondition.eventAttributes);

    hasEventNonNestAttribute = hasEventNonNestAttribute || eventCondition.hasEventNonNestAttribute;
    eventNonNestAttributes.push(...eventCondition.eventNonNestAttributes);
  }

  if (sqlParameters.globalEventCondition?.conditions) {
    const allAttribute = buildConditionProps(sqlParameters.globalEventCondition?.conditions);
    hasEventAttribute = hasEventAttribute || allAttribute.hasEventAttribute;
    eventAttributes.push(...allAttribute.eventAttributes);

    hasEventNonNestAttribute = hasEventNonNestAttribute || allAttribute.hasEventNonNestAttribute;
    eventNonNestAttributes.push(...allAttribute.eventNonNestAttributes);
  }

  if (sqlParameters.groupCondition) {
    const groupingCondition = _getGroupingConditionProps(sqlParameters.groupCondition);
    hasEventAttribute = hasEventAttribute || groupingCondition.hasEventAttribute;
    eventAttributes.push(...groupingCondition.eventAttributes);

    hasEventNonNestAttribute = hasEventNonNestAttribute || groupingCondition.hasEventNonNestAttribute;
    eventNonNestAttributes.push(...groupingCondition.eventNonNestAttributes);
  }

  const hasEventConditionRetentionAnalysis = _getEventConditionPropsRetentionAnalysis(sqlParameters);
  hasEventAttribute = hasEventAttribute || hasEventConditionRetentionAnalysis.hasEventAttribute;
  eventAttributes.push(...hasEventConditionRetentionAnalysis.eventAttributes);
  hasEventNonNestAttribute = hasEventNonNestAttribute || hasEventConditionRetentionAnalysis.hasEventNonNestAttribute;
  eventNonNestAttributes.push(...hasEventConditionRetentionAnalysis.eventNonNestAttributes);

  if (sqlParameters.pathAnalysis?.sessionType === ExplorePathSessionDef.SESSION) {
    hasEventAttribute = true;
    eventAttributes.push({
      property: 'session_id',
      dataType: MetadataValueType.STRING,
      category: ConditionCategory.EVENT_OUTER,
    });
  }

  return {
    hasEventAttribute,
    hasEventNonNestAttribute,
    eventAttributes,
    eventNonNestAttributes,
  };
}

function _getUserConditionPropsPart1(sqlParameters: SQLParameters) {

  let hasNestUserAttribute = false;
  let hasOuterUserAttribute = false;
  const userAttributes: ColumnAttribute[] = [];

  if (sqlParameters.eventAndConditions) {
    for (const eventCondition of sqlParameters.eventAndConditions) {
      if (eventCondition.sqlCondition?.conditions !== undefined) {
        const conditionProps = buildConditionProps(eventCondition.sqlCondition.conditions);
        hasNestUserAttribute = hasNestUserAttribute || conditionProps.hasUserAttribute;
        hasOuterUserAttribute = hasOuterUserAttribute || conditionProps.hasUserOuterAttribute;
        userAttributes.push(...conditionProps.userAttributes);
        userAttributes.push(...conditionProps.userOuterAttributes);
      }

      if (eventCondition.eventExtParameter?.targetProperty !== undefined) {
        const extAttributeProps = buildColumnConditionProps(eventCondition.eventExtParameter.targetProperty);
        hasNestUserAttribute = hasNestUserAttribute || extAttributeProps.hasUserAttribute;
        hasOuterUserAttribute = hasOuterUserAttribute || extAttributeProps.hasUserOuterAttribute;
        userAttributes.push(...extAttributeProps.userAttributes);
        userAttributes.push(...extAttributeProps.userOuterAttributes);
      }
    }
  }

  return {
    hasNestUserAttribute,
    hasOuterUserAttribute,
    userAttributes,
  };
}

function _hasComputeMethodOnUserId(analyticsType: ExploreAnalyticsType, sqlParameters: SQLParameters) {

  if (analyticsType === ExploreAnalyticsType.EVENT) {
    for (const event of sqlParameters.eventAndConditions!) {
      if (event.computeMethod === ExploreComputeMethod.USER_ID_CNT) {
        return true;
      }
    }
  } else {
    if ( sqlParameters.computeMethod === ExploreComputeMethod.USER_ID_CNT) {
      return true;
    }
  }

  return false;
}

function _getUserConditionProps(analyticsType: ExploreAnalyticsType, sqlParameters: SQLParameters) {

  let hasNestUserAttribute = false;
  let hasOuterUserAttribute = false;
  const userAttributes: ColumnAttribute[] = [];

  const part1Props = _getUserConditionPropsPart1(sqlParameters);
  hasNestUserAttribute = hasNestUserAttribute || part1Props.hasNestUserAttribute;
  hasOuterUserAttribute = hasOuterUserAttribute || part1Props.hasOuterUserAttribute;
  userAttributes.push(...part1Props.userAttributes);

  if (sqlParameters.globalEventCondition?.conditions) {
    const conditionProps = buildConditionProps(sqlParameters.globalEventCondition?.conditions);
    hasNestUserAttribute = hasNestUserAttribute || conditionProps.hasUserAttribute;
    hasOuterUserAttribute = hasOuterUserAttribute || conditionProps.hasUserOuterAttribute;
    userAttributes.push(...conditionProps.userAttributes);
    userAttributes.push(...conditionProps.userOuterAttributes);
  }

  if (sqlParameters.groupCondition) {
    const groupingCondition = _getGroupingConditionProps(sqlParameters.groupCondition);
    hasNestUserAttribute = hasNestUserAttribute || groupingCondition.hasUserAttribute;
    userAttributes.push(...groupingCondition.userAttributes);
    hasOuterUserAttribute = hasOuterUserAttribute || groupingCondition.hasUserOuterAttribute;
    userAttributes.push(...groupingCondition.userOuterAttributes);
  }

  const conditionProps = _getUserConditionPropsRetentionAnalysis(sqlParameters);
  hasNestUserAttribute = hasNestUserAttribute || conditionProps.hasUserAttribute;
  userAttributes.push(...conditionProps.userAttributes);
  hasOuterUserAttribute = hasOuterUserAttribute || conditionProps.hasUserOuterAttribute;
  userAttributes.push(...conditionProps.userOuterAttributes);

  return {
    hasNestUserAttribute,
    hasOuterUserAttribute,
    userAttributes,
    hasComputeMethodOnUserId: _hasComputeMethodOnUserId(analyticsType, sqlParameters),
  };
}

export function buildColumnConditionProps(columnAttribute: ColumnAttribute | undefined) {

  let hasUserAttribute = false;
  let hasEventAttribute = false;
  let hasUserOuterAttribute = false;
  let hasEventNonNestAttribute = false;

  const eventAttributes: ColumnAttribute[] = [];
  const userAttributes: ColumnAttribute[] = [];
  const userOuterAttributes: ColumnAttribute[] = [];
  const eventNonNestAttributes: ColumnAttribute[] = [];

  if (columnAttribute?.category === ConditionCategory.USER) {
    hasUserAttribute = true;
    userAttributes.push({
      property: columnAttribute.property,
      category: columnAttribute.category,
      dataType: columnAttribute.dataType,
    });
  } else if (columnAttribute?.category === ConditionCategory.EVENT) {
    hasEventAttribute = true;
    eventAttributes.push({
      property: columnAttribute.property,
      category: columnAttribute.category,
      dataType: columnAttribute.dataType,
    });
  } else if (columnAttribute?.category === ConditionCategory.USER_OUTER ) {
    hasUserOuterAttribute = true;
    userOuterAttributes.push({
      property: columnAttribute.property,
      category: columnAttribute.category,
      dataType: columnAttribute.dataType,
    });
  } else if (columnAttribute !== undefined) {
    hasEventNonNestAttribute = true;
    eventNonNestAttributes.push({
      property: columnAttribute.property,
      category: columnAttribute.category,
      dataType: columnAttribute.dataType,
    });
  }

  return {
    hasUserAttribute,
    hasEventAttribute,
    hasUserOuterAttribute,
    userOuterAttributes,
    eventAttributes,
    userAttributes,
    hasEventNonNestAttribute,
    eventNonNestAttributes,
  };
}

function _getOnePairConditionPropsFromJoinColumn(pairEventAndCondition: PairEventAndCondition) {

  let hasUserAttribute = false;
  let hasEventAttribute = false;
  let hasUserOuterAttribute = false;
  const eventAttributes: ColumnAttribute[] = [];
  const userAttributes: ColumnAttribute[] = [];
  const userOuterAttributes: ColumnAttribute[] = [];
  let hasEventNonNestAttribute = false;
  const eventNonNestAttributes: ColumnAttribute[] = [];

  const startConditionProps = buildColumnConditionProps(pairEventAndCondition.startEvent.retentionJoinColumn);
  hasEventAttribute = hasEventAttribute || startConditionProps.hasEventAttribute;
  eventAttributes.push(...startConditionProps.eventAttributes);
  hasUserAttribute = hasUserAttribute || startConditionProps.hasUserAttribute;
  userAttributes.push(...startConditionProps.userAttributes);
  hasUserOuterAttribute = hasUserOuterAttribute || startConditionProps.hasUserOuterAttribute;
  userOuterAttributes.push(...startConditionProps.userOuterAttributes);

  hasEventNonNestAttribute = hasEventNonNestAttribute || startConditionProps.hasEventNonNestAttribute;
  eventNonNestAttributes.push(...startConditionProps.eventNonNestAttributes);

  const backConditionProps = buildColumnConditionProps(pairEventAndCondition.backEvent.retentionJoinColumn);
  hasEventAttribute = hasEventAttribute || backConditionProps.hasEventAttribute;
  eventAttributes.push(...backConditionProps.eventAttributes);
  hasUserAttribute = hasUserAttribute || backConditionProps.hasUserAttribute;
  userAttributes.push(...backConditionProps.userAttributes);
  hasUserOuterAttribute = hasUserOuterAttribute || backConditionProps.hasUserOuterAttribute;
  userOuterAttributes.push(...backConditionProps.userOuterAttributes);

  hasEventNonNestAttribute = hasEventNonNestAttribute || backConditionProps.hasEventNonNestAttribute;
  eventNonNestAttributes.push(...backConditionProps.eventNonNestAttributes);


  return {
    hasUserAttribute,
    hasEventAttribute,
    hasUserOuterAttribute,
    hasEventNonNestAttribute,
    userAttributes,
    eventAttributes,
    userOuterAttributes,
    eventNonNestAttributes,
  };
}

function _getOnePairConditionProps(pairEventAndCondition: PairEventAndCondition) {

  let hasUserAttribute = false;
  let hasEventAttribute = false;
  let hasUserOuterAttribute = false;
  const eventAttributes: ColumnAttribute[] = [];
  const userAttributes: ColumnAttribute[] = [];
  const userOuterAttributes: ColumnAttribute[] = [];
  let hasEventNonNestAttribute = false;
  const eventNonNestAttributes: ColumnAttribute[] = [];

  const pairConditionProps = _getOnePairConditionPropsFromJoinColumn(pairEventAndCondition);
  hasUserOuterAttribute = hasUserOuterAttribute || pairConditionProps.hasUserOuterAttribute;
  userOuterAttributes.push(...pairConditionProps.userOuterAttributes);
  hasEventAttribute = hasEventAttribute || pairConditionProps.hasEventAttribute;
  eventAttributes.push(...pairConditionProps.eventAttributes);

  hasUserAttribute = hasUserAttribute || pairConditionProps.hasUserAttribute;
  userAttributes.push(...pairConditionProps.userAttributes);

  hasEventNonNestAttribute = hasEventNonNestAttribute || pairConditionProps.hasEventNonNestAttribute;
  eventNonNestAttributes.push(...pairConditionProps.eventNonNestAttributes);

  if (pairEventAndCondition.startEvent.sqlCondition?.conditions) {
    const conditionProps = buildConditionProps(pairEventAndCondition.startEvent.sqlCondition?.conditions);
    hasUserOuterAttribute = hasUserOuterAttribute || conditionProps.hasUserOuterAttribute;
    userOuterAttributes.push(...conditionProps.userOuterAttributes);
    hasEventAttribute = hasEventAttribute || conditionProps.hasEventAttribute;
    eventAttributes.push(...conditionProps.eventAttributes);

    hasUserAttribute = hasUserAttribute || conditionProps.hasUserAttribute;
    userAttributes.push(...conditionProps.userAttributes);

    hasEventNonNestAttribute = hasEventNonNestAttribute || conditionProps.hasEventNonNestAttribute;
    eventNonNestAttributes.push(...conditionProps.eventNonNestAttributes);
  }

  if (pairEventAndCondition.backEvent.sqlCondition?.conditions) {
    const conditionProps = buildConditionProps(pairEventAndCondition.backEvent.sqlCondition?.conditions);

    hasUserOuterAttribute = hasUserOuterAttribute || conditionProps.hasUserOuterAttribute;
    userOuterAttributes.push(...conditionProps.userOuterAttributes);
    hasEventAttribute = hasEventAttribute || conditionProps.hasEventAttribute;
    eventAttributes.push(...conditionProps.eventAttributes);
    hasUserAttribute = hasUserAttribute || conditionProps.hasUserAttribute;
    userAttributes.push(...conditionProps.userAttributes);

    hasEventNonNestAttribute = hasEventNonNestAttribute || conditionProps.hasEventNonNestAttribute;
    eventNonNestAttributes.push(...conditionProps.eventNonNestAttributes);
  }

  return {
    hasUserAttribute,
    hasEventAttribute,
    hasUserOuterAttribute,
    hasEventNonNestAttribute,
    userAttributes,
    eventAttributes,
    userOuterAttributes,
    eventNonNestAttributes,
  };
}

function _getUserConditionPropsRetentionAnalysis(sqlParameters: SQLParameters) {

  let hasUserAttribute = false;
  let hasUserOuterAttribute = false;
  const userAttributes: ColumnAttribute[] = [];
  const userOuterAttributes: ColumnAttribute[] = [];
  if (sqlParameters.pairEventAndConditions) {
    for (const pair of sqlParameters.pairEventAndConditions) {
      const conditionProps = _getOnePairConditionProps(pair);
      hasUserAttribute = hasUserAttribute || conditionProps.hasUserAttribute;
      hasUserOuterAttribute = hasUserOuterAttribute || conditionProps.hasUserOuterAttribute;
      userAttributes.push(...conditionProps.userAttributes);
      userOuterAttributes.push(...conditionProps.userOuterAttributes);
    }
  }

  return {
    hasUserAttribute,
    hasUserOuterAttribute,
    userAttributes,
    userOuterAttributes,
  };
}

function _getEventConditionPropsRetentionAnalysis(sqlParameters: SQLParameters) {

  let hasEventAttribute = false;
  const eventAttributes: ColumnAttribute[] = [];
  let hasEventNonNestAttribute = false;
  const eventNonNestAttributes: ColumnAttribute[] = [];

  if (sqlParameters.pairEventAndConditions) {
    for (const pair of sqlParameters.pairEventAndConditions) {
      const pairConditionProps = _getOnePairConditionProps(pair);
      hasEventAttribute = hasEventAttribute || pairConditionProps.hasEventAttribute;
      eventAttributes.push(...pairConditionProps.eventAttributes);

      hasEventNonNestAttribute = hasEventNonNestAttribute || pairConditionProps.hasEventNonNestAttribute;
      eventNonNestAttributes.push(...pairConditionProps.eventNonNestAttributes);
    }
  }

  return {
    hasEventAttribute,
    hasEventNonNestAttribute,
    eventAttributes,
    eventNonNestAttributes,
  };
}