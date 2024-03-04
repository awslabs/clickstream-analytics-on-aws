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

import { format } from 'sql-formatter';
import { formatDateToYYYYMMDD, getFirstDayOfLastNMonths, getFirstDayOfLastNYears, getMondayOfLastNWeeks } from './reporting-utils';
import { ConditionCategory, ExploreAggregationMethod, ExploreComputeMethod, ExploreConversionIntervalType, ExploreGroupColumn, ExploreLocales, ExplorePathNodeType, ExplorePathSessionDef, ExploreRelativeTimeUnit, ExploreTimeScopeType, MetadataPlatform, MetadataValueType } from '../../common/explore-types';
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

export enum ExploreAnalyticsOperators {
  NULL = 'is_null',
  NOT_NULL = 'is_not_null',
  EQUAL = '=',
  NOT_EQUAL = '<>',
  GREATER_THAN = '>',
  GREATER_THAN_OR_EQUAL = '>=',
  LESS_THAN = '<',
  LESS_THAN_OR_EQUAL = '<=',
  IN = 'in',
  NOT_IN = 'not_in',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
}

const baseColumns: ColumnAttribute[] = [
  {
    category: ConditionCategory.OTHER,
    property: 'event_name',
    dataType: MetadataValueType.STRING,
  },
  {
    category: ConditionCategory.OTHER,
    property: 'event_id',
    dataType: MetadataValueType.STRING,
  },
  {
    category: ConditionCategory.OTHER,
    property: 'event_timestamp',
    dataType: MetadataValueType.INTEGER,
  },
];

const columnTemplate = `
 event_date as event_date####
,event_name as event_name####
,event_timestamp as event_timestamp####
,event_id as event_id####
,user_id as user_id####
,user_pseudo_id as user_pseudo_id####
`;

export interface EventConditionProps {
  hasEventAttribute: boolean;
  eventAttributes: ColumnAttribute[];
  hasEventNonNestAttribute: boolean;
  eventNonNestAttributes: ColumnAttribute[];
}

const builtInBigintColumns = [
  'event_bundle_sequence_id',
  'event_previous_timestamp',
  'screen_width',
  'screen_height',
  'time_zone_offset_seconds',
  'viewport_height',
  'event_timestamp',
];
export interface EventNonNestColProps {
  sql: string;
  colList: string[];
}

export const EVENT_TABLE = 'event';
export const EVENT_PARAMETER_TABLE = 'event_parameter';
export const USER_TABLE = 'user_m_view';


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

  const maxIndex = eventNames.length - 1;
  for (const [index, _item] of eventNames.entries()) {
    resultCntSQL = resultCntSQL.concat(`, count(distinct ${prefix}_${index})  as ${eventNames[index]} \n`);
    if (index === 0) {
      resultCntSQL = resultCntSQL.concat(`, (count(distinct ${prefix}_${maxIndex}) :: decimal /  NULLIF(count(distinct ${prefix}_0), 0) ):: decimal(20, 4)  as total_conversion_rate \n`);
    } else {
      resultCntSQL = resultCntSQL.concat(`, (count(distinct ${prefix}_${index}) :: decimal /  NULLIF(count(distinct ${prefix}_${index-1}), 0) ):: decimal(20, 4)  as ${eventNames[index]}_rate \n`);
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
      ,${eventNames[0]} desc
  `);

  return format(sql, {
    language: 'postgresql',
  });
};


function _buildFunnelChartViewNestCaseWhenSql(prefix: string, cnt: number, isNameCol: boolean) : string {

  let sql = '';
  if (isNameCol) {
    for (let i = 0; i < cnt; i++) {
      sql += `when seq = ${i} then '${i+1}_' || event_name_${i} \n`;
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

function _buildFunnelChartViewOneResultSql(prefix: string, eventCount: number, index: number, isNameCol: boolean) : string {
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

  if (sqlParameters.groupCondition !== undefined) {
    const colName = buildColNameWithPrefix(sqlParameters.groupCondition);
    groupColSQL = `${colName}::varchar as ${colName},`;
  }

  const computeMethodProps = getComputeMethodProps(sqlParameters);
  if (!computeMethodProps.isMixedMethod) {
    if (computeMethodProps.hasAggregationPropertyMethod) {

      if (!computeMethodProps.isSameAggregationMethod) {
        resultSql = resultSql.concat(`
          select 
            *
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
            day, event_name, ${groupColSQL} custom_attr_id
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
          day, event_name, ${groupColSQL} x_id, custom_attr_id
      `);
    }
  } else { // mixed method
    resultSql = resultSql.concat(`
        select 
          *
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
        ROW_NUMBER() OVER (PARTITION BY user_pseudo_id, _session_id ORDER BY event_timestamp asc) as step_1,
        ROW_NUMBER() OVER (PARTITION BY user_pseudo_id, _session_id ORDER BY event_timestamp asc) + 1 as step_2
      from mid_table 
    ),
    step_table_1 as (
      select 
      data.user_pseudo_id user_pseudo_id,
      data._session_id _session_id,
      min(step_1) min_step
      from data
      where event_name = '${midTable.prefix}${eventNames[0]}'
      group by user_pseudo_id, _session_id
    ),
    step_table_2 as (
      select 
      data.*
      from data join step_table_1 on data.user_pseudo_id = step_table_1.user_pseudo_id and data._session_id = step_table_1._session_id and data.step_1 >= step_table_1.min_step
    ),
    data_final as (
      select
        event_name,
        event_date,
        user_pseudo_id,
        event_id,
        event_timestamp,
        _session_id,
        ROW_NUMBER() OVER (
          PARTITION BY
            user_pseudo_id,
            _session_id
          ORDER BY
            step_1 asc, step_2
        ) as step_1,
        ROW_NUMBER() OVER (
          PARTITION BY
            user_pseudo_id,
            _session_id
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
      and a._session_id = b._session_id
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
        case when (b.event_timestamp - a.event_timestamp < ${sqlParameters.pathAnalysis!.lagSeconds!} * cast(1000 as bigint) and b.event_timestamp - a.event_timestamp >=0) then 0 else 1 end as group_start
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
    ${_buildCommonPartSql(eventNames, sqlParameters, true)}
    ${midTableSql}
    ${dataTableSql}
  `;
  return format(sql, {
    language: 'postgresql',
  });
}

export function buildNodePathAnalysisView(sqlParameters: SQLParameters) : string {

  let midTableSql = '';
  let dataTableSql = '';

  const includingOtherEvents = sqlParameters.pathAnalysis?.includingOtherEvents ? true: false;

  if (sqlParameters.pathAnalysis!.sessionType === ExplorePathSessionDef.SESSION ) {
    midTableSql = `
      mid_table_1 as (
        select 
          event_name,
          event_date,
          user_pseudo_id,
          event_id,
          event_timestamp,
          _session_id
        from base_data
      ),
      mid_table_2 as (
        ${_buildNodePathSQL(sqlParameters, sqlParameters.pathAnalysis!.nodeType)}
      ),
      ${_getMidTableForNodePathAnalysis(sqlParameters, true)}
      data as (
        select
        event_name,
        event_date,
        user_pseudo_id,
        event_id,
        event_timestamp,
        _session_id,
        case 
          when node in ('${sqlParameters.pathAnalysis?.nodes?.join('\',\'')}') then node 
          else 'other'
        end as node,
        ROW_NUMBER() OVER (
          PARTITION BY
            user_pseudo_id,
            _session_id
          ORDER BY
            event_timestamp asc
        ) as step_1,
        ROW_NUMBER() OVER (
          PARTITION BY
            user_pseudo_id,
            _session_id
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
        _session_id,
        min(step_1) min_step
      from
        data
      where
        node = '${sqlParameters.pathAnalysis!.nodes![0]}'
      group by
        user_pseudo_id,
        _session_id
    ),
    step_table_2 as (
      select
        data.*
      from data
      join step_table_1 on data.user_pseudo_id = step_table_1.user_pseudo_id
      and data._session_id = step_table_1._session_id
      and data.step_1 >= step_table_1.min_step
    ),
    data_final as (
      select        
        event_name,
        event_date,
        user_pseudo_id,
        event_id,
        event_timestamp,
        _session_id,
        node,
        ROW_NUMBER() OVER (
          PARTITION BY
            user_pseudo_id,
            _session_id
          ORDER BY
            step_1 asc,
            step_2
        ) as step_1,
        ROW_NUMBER() OVER (
          PARTITION BY
            user_pseudo_id,
            _session_id
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
      and a._session_id = b._session_id
      and a.step_2 = b.step_1
    where a.step_2 <= ${sqlParameters.maxStep ?? 10}
    `;

  } else {
    midTableSql = `
    mid_table_1 as (
      select 
        event_name,
        event_date,
        user_pseudo_id,
        event_id,
        event_timestamp
      from base_data
    ),
    mid_table_2 as (
      ${_buildNodePathSQL(sqlParameters, sqlParameters.pathAnalysis!.nodeType)}
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
            b.event_timestamp - a.event_timestamp < ${sqlParameters.pathAnalysis!.lagSeconds!} * cast(1000 as bigint)
            and b.event_timestamp - a.event_timestamp >= 0
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
    ${_buildCommonPartSql([], sqlParameters, false, true)}
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
    ${_buildCommonPartSql(_getRetentionAnalysisViewEventNames(sqlParameters), sqlParameters, false, false, true)}
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

function _buildTableListColumnSql(eventNames: string[], groupCondition: GroupingCondition|undefined) {

  let firstTableColumns = '';
  let sql = '';
  let groupCol = '';
  let newColumnTemplate = columnTemplate;
  if (groupCondition !== undefined && groupCondition.applyTo !== 'FIRST') {
    groupCol = `,COALESCE(${buildColNameWithPrefix(groupCondition)}::varchar, 'null')`;
    newColumnTemplate += `${groupCol} as ${buildColNameWithPrefix(groupCondition)}####`;
  }

  if (groupCondition !== undefined && groupCondition.applyTo === 'FIRST') {
    firstTableColumns = `
       month
      ,week
      ,day
      ,hour
      ,COALESCE(${buildColNameWithPrefix(groupCondition)}::varchar, 'null') as ${buildColNameWithPrefix(groupCondition)}_0
      ,${newColumnTemplate.replace(/####/g, '_0')}
    `;
  } else {
    firstTableColumns = `
       month
      ,week
      ,day
      ,hour
      ,${newColumnTemplate.replace(/####/g, '_0')}
    `;
  }

  for (const [index, event] of eventNames.entries()) {
    sql = sql.concat(`
    table_${index} as (
      select 
        ${ index === 0 ? firstTableColumns : newColumnTemplate.replace(/####/g, `_${index}`)}
      from base_data base
      where event_name = '${event}'
    ),
    `);
  }
  return sql;
}

function _buildFunnelBaseSql(eventNames: string[], sqlParameters: SQLParameters, applyToFirst: boolean,
  groupCondition: GroupingCondition | undefined = undefined) : string {

  let sql = _buildCommonPartSql(eventNames, sqlParameters);

  sql = sql.concat(_buildTableListColumnSql(eventNames, groupCondition));

  let joinConditionSQL = '';
  let joinColumnsSQL = '';

  for (const [index, _item] of eventNames.entries()) {
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
      joinConditionSQL = joinConditionSQL.concat(`left outer join table_${index} ${joinCondition} and table_${index}.event_timestamp_${index} - table_${index-1}.event_timestamp_${index-1} > 0 and table_${index}.event_timestamp_${index} - table_0.event_timestamp_0 <= ${sqlParameters.conversionIntervalInSeconds} * cast(1000 as bigint) \n`);
    } else {
      joinConditionSQL = joinConditionSQL.concat(`left outer join table_${index} ${joinCondition} and table_${index}.event_timestamp_${index} - table_${index-1}.event_timestamp_${index-1} > 0 and TO_CHAR(TIMESTAMP 'epoch' + cast(table_${index-1}.event_timestamp_${index-1}/1000 as bigint) * INTERVAL '1 second', 'YYYY-MM-DD') = TO_CHAR(TIMESTAMP 'epoch' + cast(table_${index}.event_timestamp_${index}/1000 as bigint) * INTERVAL '1 second', 'YYYY-MM-DD')  \n`);
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
  let newColumnTemplate = columnTemplate;

  if (groupCondition !== undefined && !applyToFirst) {
    groupCol = `,COALESCE(${buildColNameWithPrefix(groupCondition)}::varchar, 'null') as ${buildColNameWithPrefix(groupCondition)}`;
    newColumnTemplate += `${groupCol}`;
  }

  const firstTableColumns = `
     month
    ,week
    ,day
    ,hour
    ${ applyToFirst ? `,COALESCE(${buildColNameWithPrefix(groupCondition!)}::varchar, 'null') as ${buildColNameWithPrefix(groupCondition!)}` : ''}
    ,${newColumnTemplate.replace(/####/g, '_0')}
  `;

  if (index === 0) {
    return firstTableColumns;
  }

  return newColumnTemplate.replace(/####/g, `_${index}`);

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
    joinConditionSQL = joinConditionSQL.concat(`left outer join table_${index} ${joinCondition} ${groupingJoinSQL} and table_${index}.event_timestamp_${index} - table_${index-1}.event_timestamp_${index-1} > 0 and table_${index}.event_timestamp_${index} - table_0.event_timestamp_0 <= ${sqlParameters.conversionIntervalInSeconds} * cast(1000 as bigint) \n`);
  } else {
    joinConditionSQL = joinConditionSQL.concat(`left outer join table_${index} ${joinCondition} ${groupingJoinSQL} and table_${index}.event_timestamp_${index} - table_${index-1}.event_timestamp_${index-1} > 0 and TO_CHAR(TIMESTAMP 'epoch' + cast(table_${index-1}.event_timestamp_${index-1}/1000 as bigint) * INTERVAL '1 second', 'YYYY-MM-DD') = TO_CHAR(TIMESTAMP 'epoch' + cast(table_${index}.event_timestamp_${index}/1000 as bigint) * INTERVAL '1 second', 'YYYY-MM-DD')  \n`);
  }

  return joinConditionSQL;

}

function _buildFunnelBaseSqlForTableVisual(eventNames: string[], sqlParameters: SQLParameters,
  groupCondition: GroupingCondition | undefined = undefined) : string {

  let sql = _buildCommonPartSql(eventNames, sqlParameters);

  const applyToFirst = groupCondition?.applyTo === 'FIRST';

  for (const [index, event] of eventNames.entries()) {
    sql = sql.concat(`
    table_${index} as (
      select 
        ${_buildColumnsForFunnelTableViews(index, applyToFirst, groupCondition)}
      from base_data base
      where event_name = '${event}'
    ),
    `);
  }

  let joinConditionSQL = '';
  let joinColumnsSQL = '';

  for (const [index, _item] of eventNames.entries()) {
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

  let sql = _buildCommonPartSql(eventNames, sqlParameters, false, false, true);
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

  if (eventAndCondition.computeMethod === ExploreComputeMethod.EVENT_CNT
      || eventAndCondition.computeMethod === ExploreComputeMethod.USER_ID_CNT) {
    sql = `
      ${dateGroupCol} as event_date,
      event_name,
      ${groupCol === '' ? '' : groupCol+','}
      null as custom_attr_id,
      count(distinct x_id) as "count/aggregation amount"
    `;
  } else if (eventAndCondition.computeMethod === ExploreComputeMethod.COUNT_PROPERTY) {
    sql = `
      ${dateGroupCol} as event_date,
      event_name,
      ${groupCol === '' ? '' : groupCol+','}
      custom_attr_id,
      count(1) as "count/aggregation amount"
    `;
  } else {
    sql = `
      ${dateGroupCol} as event_date,
      event_name,
      ${groupCol === '' ? '' : groupCol+','}
      null as custom_attr_id,
      ${eventAndCondition.eventExtParameter?.aggregationMethod}(custom_attr_id) as "count/aggregation amount"
    `;
  }

  return sql;
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

  let sql = _buildCommonPartSql(eventNames, sqlParameters);
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

      joinTableSQL = joinTableSQL.concat(`
      ${unionSql}
      select 
        ${_buildQueryColumnSqlMixedMode(item, groupCol, sqlParameters.groupColumn!)}
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
        group by ${sqlParameters.groupColumn}, event_name ${groupCol === '' ? '': ',' + groupCol} ,custom_attr_id
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
      event_date
      ${isSessionJoin ? ',_session_id' : ''}
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
            _session_id
          from (
            select 
              event_name,
              user_pseudo_id,
              event_id,
              event_timestamp,
              event_date,
              _session_id,
              ROW_NUMBER() over(partition by event_name, user_pseudo_id, _session_id order by event_timestamp desc) as rk
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
            event_date,
            _session_id
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
              event_date,
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
        event_date
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
            _session_id,
            node
          from (
            select 
              mid_table_1.*,
              mid_table_2.node,
              ROW_NUMBER() over(partition by event_name, user_pseudo_id, _session_id, node order by mid_table_1.event_timestamp desc) as rk
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

export function buildNecessaryEventColumnsSql(eventConditionProps: EventConditionProps): EventNonNestColProps {

  let sql: string = 'event_date';
  const eventNonNestAttributes = baseColumns.concat(...eventConditionProps.eventNonNestAttributes);
  const propertyList: string[] = ['event_date'];
  const colList: string[] = ['event_date'];

  for (const props of eventNonNestAttributes) {
    if (propertyList.includes(props.property)) {
      continue;
    }
    propertyList.push(props.property);

    if (props.category === ConditionCategory.DEVICE
        || props.category === ConditionCategory.GEO
        || props.category === ConditionCategory.TRAFFIC_SOURCE
        || props.category === ConditionCategory.APP_INFO
    ) {
      sql = sql.concat(`,${props.category}.${props.property}${builtInBigintColumns.includes(props.property) ? '::bigint' : '::varchar'} as ${props.category}_${props.property}`);
      colList.push(`${props.category}_${props.property}`);
    } else if (props.category === ConditionCategory.OTHER) {
      sql = sql.concat(`,${props.property}${builtInBigintColumns.includes(props.property) ? '::bigint' : '::varchar'}  as  ${props.property}`);
      colList.push(`${props.property}`);
    }
  }

  return {
    sql,
    colList,
  };
}

export function _buildCommonPartSql(eventNames: string[], sqlParameters: SQLParameters,
  isEventPathAnalysis: boolean = false, isNodePathAnalysis: boolean = false, skipAllCondition: boolean = false) : string {

  let resultSql = 'with';
  const commonConditionSql = buildCommonConditionSql(sqlParameters, 'event.');
  let allConditionSql = '';
  if (_shouldAddAllCondition(eventNames, sqlParameters, isEventPathAnalysis, isNodePathAnalysis, skipAllCondition)) {
    allConditionSql = _getAllConditionSql(eventNames, sqlParameters, isEventPathAnalysis);
  }

  const eventConditionProps = _getEventConditionProps(sqlParameters);
  let eventJoinTable = '';
  let baseUserDataSql = '';
  let eventColList: string[] = [];

  const eventNonNestColProps = buildNecessaryEventColumnsSql(eventConditionProps);
  const baseEventDataSql = _buildBaseEventDataSql(eventNames, sqlParameters, eventNonNestColProps, isEventPathAnalysis, isNodePathAnalysis);

  if (eventConditionProps.hasEventAttribute) {
    const eventAttributes: ColumnAttribute[] = [];
    eventAttributes.push(...eventConditionProps.eventAttributes);
    const eventCommonColumnsSql = buildCommonColumnsSql(eventAttributes, 'event_param_key', 'event_param_{{}}_value');
    eventColList = eventCommonColumnsSql.columns;
    eventJoinTable = buildEventJoinTable(sqlParameters.dbName + '.' + sqlParameters.schemaName, eventCommonColumnsSql.columnsSql);
  }

  const userConditionProps = _getUserConditionProps(sqlParameters);
  let userJoinTable = '';
  let userColList: string[] = [];
  if (userConditionProps.hasNestUserAttribute || userConditionProps.hasOuterUserAttribute) {

    baseUserDataSql = _buildBaseUserDataSql(sqlParameters, userConditionProps.hasNestUserAttribute);

    const userAttributes = [];
    userAttributes.push(...userConditionProps.userAttributes);
    const userCommonColumnsSql = buildCommonColumnsSql(userAttributes, 'user_param_key', 'user_param_{{}}_value');
    userColList = userCommonColumnsSql.columns;
    userJoinTable = buildUserJoinTable(userCommonColumnsSql.columnsSql);
  }

  userColList.push(...eventColList);
  userColList = [...new Set(userColList)];

  let nestColList = userColList.join(',');
  if (nestColList !== '') {
    nestColList += ',';
  }

  if (!userConditionProps.hasNestUserAttribute && !eventConditionProps.hasEventAttribute) {

    let userOuterSql = '';
    let userOuterCol = '';
    if (userConditionProps.hasOuterUserAttribute) {
      userOuterCol = ',user_base.*';
      userOuterSql = `
      join 
        (
          ${_buildBaseUserDataTableSql(sqlParameters, false, '_join')}
        ) as user_base
        on event_base.user_pseudo_id = user_base.user_pseudo_id_join
    `;
    }

    resultSql = resultSql.concat(
      `
        base_data as (
          select 
             event_base.*
            ${userOuterCol}
          from
          (
            ${_buildBaseEventDataTableSQL(eventNames, sqlParameters, eventNonNestColProps, isEventPathAnalysis, isNodePathAnalysis)}
          ) as event_base
          ${userOuterSql}
          where 1=1
          ${commonConditionSql.globalConditionSql}
          ${allConditionSql}
        ),
        `,
    );

  } else {
    resultSql = resultSql.concat(
      `
        ${baseUserDataSql}
        ${baseEventDataSql}
        base_data as (
          select 
            ${nestColList}
            event_base.*
          from event_base
          ${eventJoinTable}
          ${userJoinTable}
          where 1=1
          ${commonConditionSql.globalConditionSql}
          ${allConditionSql}
        ),
      `,
    );
  }

  return format(resultSql, { language: 'postgresql' });
}

function _shouldAddAllCondition(eventNames: string[], sqlParameters: SQLParameters,
  isEventPathAnalysis: boolean, isNodePathAnalysis: boolean, skipAllCondition: boolean): boolean {

  if ( skipAllCondition || isNodePathAnalysis
    || (isEventPathAnalysis && eventNames.length < sqlParameters.eventAndConditions!.length) ) {
    return false;
  }

  return true;
}

function _buildNodePathSQL(sqlParameters: SQLParameters, nodeType: ExplorePathNodeType) : string {
  return `
    select 
      base_data.event_timestamp,
      base_data.event_id,
      max(event_param.event_param_string_value) as node
    from base_data
    join ${sqlParameters.dbName}.${sqlParameters.schemaName}.${EVENT_PARAMETER_TABLE} as event_param
    on base_data.event_timestamp = event_param.event_timestamp and base_data.event_id = event_param.event_id
    where 
      event_param.event_param_key = '${nodeType}'
    group by 1,2
  `;
}

export function buildCommonColumnsSql(columns: ColumnAttribute[], key: string, value: string) {
  let columnsSql = '';
  const columnList: string[] = [];
  for ( const col of columns) {

    if (columnList.includes(col.property)) {
      continue;
    }
    const val = value.replace(/{{}}/g, col.dataType);
    if (col.category === ConditionCategory.USER_OUTER) {
      columnsSql += `max(${col.property}) as ${col.property},`;
    } else {
      columnsSql += `max(case when ${key} = '${col.property}' then ${val} else null end) as ${col.property},`;
    }

    columnList.push(col.property);
  }
  if (columnsSql.endsWith(',')) {
    columnsSql = columnsSql.substring(0, columnsSql.length-1);
  }

  return {
    columnsSql,
    columns: columnList,
  };
}

export function buildUserJoinTable(columnsSql: any) {
  return `
  join (
    select
        event_base.user_pseudo_id,
        ${columnsSql}
    from
        event_base
        join user_base on event_base.user_pseudo_id = user_base.user_pseudo_id
    group by
        event_base.user_pseudo_id
    ) user_join_table on event_base.user_pseudo_id = user_join_table.user_pseudo_id
  `;
}

export function buildEventJoinTable(schema: string, columnsSql: string) {
  return `
  join
  (
    select 
    event_base.event_id,
    ${columnsSql}
    from event_base
    join ${schema}.event_parameter as event_param on event_base.event_timestamp = event_param.event_timestamp 
      and event_base.event_id = event_param.event_id
    group by
      event_base.event_id
  ) as event_join_table on event_base.event_id = event_join_table.event_id
  `;
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

function _buildBaseEventDataTableSQL(eventNames: string[], sqlParameters: SQLParameters, eventNonNestColProps: EventNonNestColProps,
  isEventPathAnalysis: boolean = false, isNodePathAnalysis: boolean = false) {
  const eventDateSQL = buildEventDateSql(sqlParameters, 'event.');
  const eventNameClause = _buildEventNameClause(eventNames, sqlParameters, isEventPathAnalysis, isNodePathAnalysis);

  return `
    select
       ${eventNonNestColProps.colList.join(',')}
      ,COALESCE(r.user_id, l.user_pseudo_id) as user_pseudo_id
      ,r.user_id
      ,month
      ,week
      ,day
      ,hour
    from 
    (
      select
        ${eventNonNestColProps.sql},
        user_pseudo_id,
        TO_CHAR(
        TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
        'YYYY-MM'
        ) as month,
        TO_CHAR(
        date_trunc(
            'week',
            TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second'
        ),
        'YYYY-MM-DD'
        ) as week,
        TO_CHAR(
        TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
        'YYYY-MM-DD'
        ) as day,
        TO_CHAR(
        TIMESTAMP 'epoch' + cast(event_timestamp / 1000 as bigint) * INTERVAL '1 second',
        'YYYY-MM-DD HH24'
        ) || '00:00' as hour
      from
          ${sqlParameters.dbName}.${sqlParameters.schemaName}.${EVENT_TABLE} as event
      where
          ${eventDateSQL}
          ${eventNameClause}
    ) as l
    join 
    (
      select user_pseudo_id, user_id from ${sqlParameters.dbName}.${sqlParameters.schemaName}.user_m_view group by user_pseudo_id, user_id
    ) as r on l.user_pseudo_id= r.user_pseudo_id
  `;
}

function _buildBaseEventDataSql(eventNames: string[], sqlParameters: SQLParameters, eventNonNestColProps: EventNonNestColProps,
  isEventPathAnalysis: boolean = false, isNodePathAnalysis: boolean = false) {

  return `
    event_base as (
      ${_buildBaseEventDataTableSQL(eventNames, sqlParameters, eventNonNestColProps, isEventPathAnalysis, isNodePathAnalysis)}
  ),
  `;
}

function _buildBaseUserDataTableSql(sqlParameters: SQLParameters, hasNestParams: boolean, suffix: string ='') {

  let nestParamSql = '';
  let nextColSQL = '';
  if (hasNestParams) {
    nestParamSql = `,
      user_properties.key:: varchar as user_param_key,
      user_properties.value.string_value::varchar as user_param_string_value,
      user_properties.value.int_value::bigint as user_param_int_value,
      user_properties.value.float_value::double precision as user_param_float_value,
      user_properties.value.double_value::double precision as user_param_double_value
    `;
    nextColSQL = ', u.user_properties as user_properties';
  }

  return `
    select
      COALESCE(user_id, user_pseudo_id) as user_pseudo_id${suffix},
      user_id as user_id${suffix},
      user_first_touch_timestamp,
      _first_visit_date,
      _first_referer,
      _first_traffic_source_type,
      _first_traffic_medium,
      _first_traffic_source,
      _channel
      ${nestParamSql}
    from
    ${sqlParameters.dbName}.${sqlParameters.schemaName}.${USER_TABLE} u ${nextColSQL}
  `;
}

function _buildBaseUserDataSql(sqlParameters: SQLParameters, hasNestParams: boolean) {

  return `
    user_base as (
      ${_buildBaseUserDataTableSql(sqlParameters, hasNestParams)}
  ),
  `;
}

function fillEventNameAndSQLConditions(eventNames: string[], sqlParameters: SQLParameters,
  eventNameAndSQLConditions: EventNameAndConditionsSQL[], simpleVersion: boolean) {
  if (simpleVersion) {
    for (const [index, event] of eventNames.entries()) {
      eventNameAndSQLConditions.push({
        eventName: event,
        conditionSql: getConditionSqlSimple(sqlParameters.eventAndConditions![index].sqlCondition),
      });
    }
  } else {
    for (const [index, event] of eventNames.entries()) {
      eventNameAndSQLConditions.push({
        eventName: event,
        conditionSql: _buildAllConditionSql(sqlParameters.eventAndConditions![index].sqlCondition),
      });
    }
  }
}

function _getAllConditionSql(eventNames: string[], sqlParameters: SQLParameters,
  isEventPathAnalysis: boolean = false, simpleVersion: boolean = false) : string {

  const prefix = simpleVersion ? 'event.' : '';
  let eventNameAndSQLConditions: EventNameAndConditionsSQL[] = [];
  fillEventNameAndSQLConditions(eventNames, sqlParameters, eventNameAndSQLConditions, simpleVersion);

  let allConditionSql = '';
  for (const [index, eventNameAndSQLCondition] of eventNameAndSQLConditions.entries()) {
    let conditionSql = eventNameAndSQLCondition.conditionSql;
    if (conditionSql !== '') {
      conditionSql = `and (${conditionSql}) `;
    }

    allConditionSql = allConditionSql.concat(`
      ${index === 0? '' : 'or' } (${prefix}event_name = '${eventNameAndSQLCondition.eventName}' ${conditionSql} )
    `);
  }

  const includingOtherEvents: boolean = sqlParameters.pathAnalysis?.includingOtherEvents ? true : false;
  if (isEventPathAnalysis && includingOtherEvents && allConditionSql !== '' ) {
    allConditionSql = allConditionSql + ` or (${prefix}event_name not in ('${eventNames.join('\',\'')}'))`;
  }

  return allConditionSql !== '' ? `and (${allConditionSql})` : '';
}

export function buildCommonConditionSql(sqlParameters: BaseSQLParameters, prefix?: string) {

  const eventDateSQL = buildEventDateSql(sqlParameters, prefix);
  let globalConditionSql = _buildAllConditionSql(sqlParameters.globalEventCondition);
  globalConditionSql = globalConditionSql !== '' ? `and (${globalConditionSql}) ` : '';

  return {
    eventDateSQL,
    globalConditionSql,
  };
}

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
      eventDateSQL = eventDateSQL.concat(`${prefix}event_date >= date ${_getStartDateForFixDateRange(sqlParameters.timeStart!, timeWindowInSeconds)} and ${prefix}event_date <= date ${formatDateToYYYYMMDD(sqlParameters.timeEnd!)}`);
    } else {
      eventDateSQL = eventDateSQL.concat(`${prefix}event_date >= ${_getStartDateForRelativeDateRange(sqlParameters.lastN!, sqlParameters.timeUnit!, timeWindowInSeconds)} and ${prefix}event_date <= CURRENT_DATE`);
    }
  } else {
    if (sqlParameters.timeScopeType === ExploreTimeScopeType.FIXED) {
      eventDateSQL = eventDateSQL.concat(`${prefix}event_date >= date ${formatDateToYYYYMMDD(sqlParameters.timeStart!)} and ${prefix}event_date <= date ${formatDateToYYYYMMDD(sqlParameters.timeEnd!)}`);
    } else {
      if (sqlParameters.timeUnit === ExploreRelativeTimeUnit.WK) {
        eventDateSQL = eventDateSQL.concat(`${prefix}event_date >= date_trunc('week', current_date - interval '${sqlParameters.lastN! - 1} weeks') and ${prefix}event_date <= CURRENT_DATE`);
      } else if (sqlParameters.timeUnit === ExploreRelativeTimeUnit.MM) {
        eventDateSQL = eventDateSQL.concat(`${prefix}event_date >= date_trunc('month', current_date - interval '${sqlParameters.lastN! - 1} months') and ${prefix}event_date <= CURRENT_DATE`);
      } else if (sqlParameters.timeUnit === ExploreRelativeTimeUnit.YY) {
        eventDateSQL = eventDateSQL.concat(`${prefix}event_date >= date_trunc('year', current_date - interval '${sqlParameters.lastN! - 1} years') and ${prefix}event_date <= CURRENT_DATE`);
      } else {
        eventDateSQL = eventDateSQL.concat(`${prefix}event_date >= date_trunc('day', current_date - interval '${sqlParameters.lastN! - 1} days') and ${prefix}event_date <= CURRENT_DATE`);
      }
    }
  }

  return eventDateSQL;
}

export function buildColNameWithPrefix(groupCondition: ColumnAttribute) {

  let prefix = '';
  if (groupCondition.category !== ConditionCategory.EVENT
     && groupCondition.category !== ConditionCategory.USER
     && groupCondition.category !== ConditionCategory.OTHER
  ) {
    prefix = `${groupCondition.category}_`;
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
          event_date,
          event_name,
          ${joinColLeft}
          ${groupColSql}
          user_pseudo_id
        from base_data join first_date on base_data.event_date = first_date.first_date
        ${startConditionSql !== '' ? 'where ' + startConditionSql : ''}
      ),
      second_table_${index} as (
        select 
          event_date,
          event_name,
          ${joinColRight}
          ${groupColSql}
          user_pseudo_id
        from base_data join first_date on base_data.event_date >= first_date.first_date
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
    let prefixLeft = pair.startEvent.retentionJoinColumn.category as string + '_';
    let prefixRight = pair.backEvent.retentionJoinColumn.category as string + '_';

    if (pair.startEvent.retentionJoinColumn.category === ConditionCategory.OTHER
      || pair.startEvent.retentionJoinColumn.category === ConditionCategory.USER
      || pair.startEvent.retentionJoinColumn.category === ConditionCategory.USER_OUTER
      || pair.startEvent.retentionJoinColumn.category === ConditionCategory.EVENT
    ) {

      prefixLeft = '';
    }

    if (pair.backEvent.retentionJoinColumn.category === ConditionCategory.OTHER
      || pair.backEvent.retentionJoinColumn.category === ConditionCategory.USER
      || pair.backEvent.retentionJoinColumn.category === ConditionCategory.USER_OUTER
      || pair.backEvent.retentionJoinColumn.category === ConditionCategory.EVENT
    ) {

      prefixRight = '';
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
      conditionSql = buildSqlFromCondition(condition);
    } else if (condition.category === ConditionCategory.USER || condition.category === ConditionCategory.USER_OUTER) {
      conditionSql = buildSqlFromCondition(condition);
    } else {
      let category: string = `${condition.category}_`;
      if (condition.category === ConditionCategory.OTHER) {
        category = '';
      }
      conditionSql = buildSqlFromCondition(condition, category);
    }
    sql = sql.concat(`
    ${sql === '' ? '' : sqlCondition.conditionOperator ?? 'and'} ${conditionSql}
  `);

  }

  return sql;
}

function getConditionSqlSimple(sqlCondition: SQLCondition | undefined) {
  if (!sqlCondition) {
    return '';
  }

  let sql = '';
  for (const condition of sqlCondition.conditions) {

    let conditionSql = '';
    if (condition.category === ConditionCategory.EVENT) {
      conditionSql = buildSqlForEventCondition(condition);
    } else if (condition.category === ConditionCategory.USER
        || condition.category === ConditionCategory.USER_OUTER ) {
      conditionSql = buildSqlForUserCondition(condition);
    } else {
      let category: string = `${condition.category}_`;
      if (condition.category === ConditionCategory.OTHER) {
        category = '';
      }
      conditionSql = buildSqlFromCondition(condition, category);
    }
    sql = sql.concat(`
    ${sql === '' ? '' : sqlCondition.conditionOperator ?? 'and'} ${conditionSql}
  `);

  }

  return sql;
}


function _getOneConditionSql(condition: Condition) {
  let category: string = `${condition.category}_`;
  if (condition.category === ConditionCategory.OTHER
    || condition.category === ConditionCategory.USER
    || condition.category === ConditionCategory.USER_OUTER
    || condition.category === ConditionCategory.EVENT
  ) {
    category = '';
  }

  return buildSqlFromCondition(condition, category);
}

function _buildAllConditionSql(sqlCondition: SQLCondition | undefined) {
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

function buildSqlForUserCondition(condition: Condition, tablePrefix: string = '') : string {

  switch (condition.dataType) {
    case MetadataValueType.STRING:
      return buildSqlForNestAttributeStringCondition(condition, `${tablePrefix}custom_attr_key`, `${tablePrefix}custom_attr_value`);
    case MetadataValueType.DOUBLE:
    case MetadataValueType.FLOAT:
    case MetadataValueType.INTEGER:
      return buildSqlForNestAttributeNumberCondition(condition, `${tablePrefix}custom_attr_key`, `${tablePrefix}custom_attr_value`);
    default:
      logger.error('unsupported condition', { condition });
      throw new Error('Unsupported condition');
  }
}

function buildSqlForEventCondition(condition: Condition, tablePrefix: string = '') : string {
  switch (condition.dataType) {
    case MetadataValueType.STRING:
      return buildSqlForNestAttributeStringCondition(condition, `${tablePrefix}event_parameter_key`, `${tablePrefix}event_parameter_value`);
    case MetadataValueType.DOUBLE:
    case MetadataValueType.FLOAT:
    case MetadataValueType.INTEGER:
      return buildSqlForNestAttributeNumberCondition(condition, `${tablePrefix}event_parameter_key`, `${tablePrefix}event_parameter_value`);
    default:
      logger.error('unsupported condition', { condition });
      throw new Error('Unsupported condition');
  }
}

function buildSqlForNestAttributeStringCondition(condition: Condition, propertyKey: string, propertyValue: string) : string {
  switch (condition.operator) {
    case ExploreAnalyticsOperators.EQUAL:
    case ExploreAnalyticsOperators.GREATER_THAN:
    case ExploreAnalyticsOperators.GREATER_THAN_OR_EQUAL:
    case ExploreAnalyticsOperators.LESS_THAN:
    case ExploreAnalyticsOperators.LESS_THAN_OR_EQUAL:
      return `(${propertyKey} = '${condition.property}' and ${propertyValue} ${condition.operator} '${condition.value[0]}')`;
    case ExploreAnalyticsOperators.NOT_EQUAL:
      return `(${propertyKey} is null or (${propertyKey} = '${condition.property}' and (${propertyValue} is null or ${propertyValue} ${condition.operator} '${condition.value[0]}')))`;
    case ExploreAnalyticsOperators.IN:
      const values = '\'' + condition.value.join('\',\'') + '\'';
      return `(${propertyKey} = '${condition.property}' and ${propertyValue} in (${values}))`;
    case ExploreAnalyticsOperators.NOT_IN:
      const notValues = '\'' + condition.value.join('\',\'') + '\'';
      return `(${propertyKey} is null or (${propertyKey} = '${condition.property}' and (${propertyValue} is null or ${propertyValue} not in (${notValues}))))`;
    case ExploreAnalyticsOperators.CONTAINS:
      return `(${propertyKey} = '${condition.property}' and ${propertyValue} like '%${_encodeValueForLikeOperator(condition.value[0])}%')`;
    case ExploreAnalyticsOperators.NOT_CONTAINS:
      return `(${propertyKey} is null or (${propertyKey} = '${condition.property}' and (${propertyValue} is null or ${propertyValue} not like '%${_encodeValueForLikeOperator(condition.value[0])}%')))`;
    case ExploreAnalyticsOperators.NULL:
      return `(${propertyKey} = '${condition.property}' and ${propertyValue} is null)`;
    case ExploreAnalyticsOperators.NOT_NULL:
      return `(${propertyKey} = '${condition.property}' and ${propertyValue} is not null)`;
    default:
      logger.error('unsupported condition', { condition });
      throw new Error('Unsupported condition');
  }

}

function buildSqlForNestAttributeNumberCondition(condition: Condition, propertyKey: string, propertyValue: string) : string {
  switch (condition.operator) {
    case ExploreAnalyticsOperators.EQUAL:
    case ExploreAnalyticsOperators.GREATER_THAN:
    case ExploreAnalyticsOperators.GREATER_THAN_OR_EQUAL:
    case ExploreAnalyticsOperators.LESS_THAN:
    case ExploreAnalyticsOperators.LESS_THAN_OR_EQUAL:
      return `(${propertyKey} = '${condition.property}' and ${propertyValue} ${condition.operator} '${condition.value[0]}')`;
    case ExploreAnalyticsOperators.NOT_EQUAL:
      return `(${propertyKey} is null or (${propertyKey} = '${condition.property}' and (${propertyValue} is null or ${propertyValue} ${condition.operator} '${condition.value[0]}')))`;
    case ExploreAnalyticsOperators.IN:
      const values = condition.value.join(',');
      return `(${propertyKey} = '${condition.property}' and ${propertyValue} in (${values}))`;
    case ExploreAnalyticsOperators.NOT_IN:
      const notValues = condition.value.join(',');
      return `(${propertyKey} is null or (${propertyKey} = '${condition.property}' and (${propertyValue} not in (${notValues}) or ${propertyValue} is null)))`;
    case ExploreAnalyticsOperators.NULL:
      return `(${propertyKey} = '${condition.property}' and ${propertyValue} is null)`;
    case ExploreAnalyticsOperators.NOT_NULL:
      return `(${propertyKey} = '${condition.property}' and ${propertyValue} is not null)`;
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
      property: '_session_id',
      dataType: MetadataValueType.STRING,
      category: ConditionCategory.EVENT,
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

function _getUserConditionProps(sqlParameters: SQLParameters) {

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