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
import { ConditionCategory, ExploreComputeMethod, ExploreConversionIntervalType, ExploreGroupColumn, ExploreLocales, ExplorePathNodeType, ExplorePathSessionDef, ExploreRelativeTimeUnit, ExploreTimeScopeType, MetadataPlatform, MetadataValueType } from '../../common/explore-types';
import { logger } from '../../common/powertools';

export interface Condition {
  readonly category: ConditionCategory;
  readonly property: string;
  readonly operator: string;
  readonly value: any[];
  readonly dataType: MetadataValueType;
}

export interface EventAndCondition {
  readonly eventName: string;
  readonly sqlCondition?: SQLCondition;
  readonly retentionJoinColumn?: RetentionJoinColumn;
  readonly computeMethod?: ExploreComputeMethod;
}

export interface SQLCondition {
  readonly conditions: Condition[];
  readonly conditionOperator?: 'and' | 'or' ;
}

export interface PathAnalysisParameter {
  readonly platform?: MetadataPlatform;
  readonly sessionType: ExplorePathSessionDef;
  readonly nodeType: ExplorePathNodeType;
  readonly lagSeconds?: number;
  readonly nodes?: string[];
}

export interface RetentionJoinColumn {
  readonly category: ConditionCategory;
  readonly property: string;
}

export interface PairEventAndCondition {
  readonly startEvent: EventAndCondition;
  readonly backEvent: EventAndCondition;
}

export interface EventNameAndConditionsSQL {
  readonly eventName: string;
  readonly conditionSql: string;
}

export interface SQLParameters {
  readonly schemaName: string;
  readonly computeMethod: ExploreComputeMethod;
  readonly specifyJoinColumn: boolean;
  readonly joinColumn?: string;
  readonly conversionIntervalType?: ExploreConversionIntervalType;
  readonly conversionIntervalInSeconds?: number;
  readonly globalEventCondition?: SQLCondition;
  readonly eventAndConditions?: EventAndCondition[];
  readonly timeScopeType: ExploreTimeScopeType;
  readonly timeStart?: Date;
  readonly timeEnd?: Date;
  readonly lastN?: number;
  readonly timeUnit?: ExploreRelativeTimeUnit;
  readonly groupColumn: ExploreGroupColumn;
  readonly maxStep?: number;
  readonly pathAnalysis?: PathAnalysisParameter;
  readonly pairEventAndConditions?: PairEventAndCondition[];
  readonly locale?: ExploreLocales;
}

export const builtInEvents = [
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

const baseColumns = `
 event.event_date
,event.event_name
,event.event_id
,event_bundle_sequence_id:: bigint as event_bundle_sequence_id
,event_previous_timestamp:: bigint as event_previous_timestamp
,event_server_timestamp_offset:: bigint as event_server_timestamp_offset
,event_timestamp::bigint as event_timestamp
,ingest_timestamp
,event_value_in_usd
,app_info.app_id:: varchar as app_info_app_id
,app_info.id:: varchar as app_info_package_id
,app_info.install_source:: varchar as app_info_install_source
,app_info.version:: varchar as app_info_version
,device.vendor_id:: varchar as device_id
,device.mobile_brand_name:: varchar as device_mobile_brand_name
,device.mobile_model_name:: varchar as device_mobile_model_name
,device.manufacturer:: varchar as device_manufacturer
,device.screen_width:: bigint as device_screen_width
,device.screen_height:: bigint as device_screen_height
,device.viewport_height:: bigint as device_viewport_height
,device.carrier:: varchar as device_carrier
,device.network_type:: varchar as device_network_type
,device.operating_system:: varchar as device_operating_system
,device.operating_system_version:: varchar as device_operating_system_version
,device.ua_browser:: varchar as device_ua_browser
,device.ua_browser_version:: varchar as device_ua_browser_version
,device.ua_os:: varchar as device_ua_os
,device.ua_os_version:: varchar as device_ua_os_version
,device.ua_device:: varchar as device_ua_device
,device.ua_device_category:: varchar as device_ua_device_category
,device.system_language:: varchar as device_system_language
,device.time_zone_offset_seconds:: bigint as device_time_zone_offset_seconds
,device.advertising_id:: varchar as device_advertising_id
,geo.continent:: varchar as geo_continent
,geo.country:: varchar as geo_country
,geo.city:: varchar as geo_city
,geo.metro:: varchar as geo_metro
,geo.region:: varchar as geo_region
,geo.sub_continent:: varchar as geo_sub_continent
,geo.locale:: varchar as geo_locale
,platform
,project_id
,traffic_source.name:: varchar as traffic_source_name
,traffic_source.medium:: varchar as traffic_source_medium
,traffic_source.source:: varchar as traffic_source_source
,user_first_touch_timestamp
,event.user_pseudo_id
,event.user_id
`;

const columnTemplate = `
 event_date as event_date####
,event_name as event_name####
,event_timestamp as event_timestamp####
,event_id as event_id####
,user_id as user_id####
,user_pseudo_id as user_pseudo_id####
`;

function _buildSessionIdSQL(eventNames: string[], sqlParameters: SQLParameters, isEventPathSQL: boolean = false) : string {
  const eventDateSQL = _getEventDateSql(sqlParameters, 'event.');
  const eventNameInClause = `and event_name in ('${eventNames.join('\',\'')}')`;
  const eventNameClause = eventNames.length > 0 ? eventNameInClause : '';

  return `
    select 
      event.event_date,
      event.event_id,
      max(event_param.event_parameter_value) as session_id
    from ${sqlParameters.schemaName}.ods_events as event
    join ${sqlParameters.schemaName}.clickstream_ods_events_parameter_view as event_param
    on event.event_date = event_param.event_date and event.event_id = event_param.event_id
    where 
    ${eventDateSQL}
    ${ isEventPathSQL ? 'and event.event_name not in (\'' + builtInEvents.filter(event => !eventNames.includes(event)).join('\',\'') + '\')' : eventNameClause }
    and event_param.event_parameter_key = '_session_id'
    group by 1,2
  `;
}


function _buildNodePathSQL(eventNames: string[], sqlParameters: SQLParameters, nodeType: ExplorePathNodeType) : string {
  const eventDateSQL = _getEventDateSql(sqlParameters, 'event.');
  return `
    select 
      event.event_date,
      event.event_id,
      max(event_param.event_parameter_value) as node
    from ${sqlParameters.schemaName}.ods_events as event
    join ${sqlParameters.schemaName}.clickstream_ods_events_parameter_view as event_param
    on event.event_date = event_param.event_date and event.event_id = event_param.event_id
    where 
    ${eventDateSQL}
    and event.event_name not in ('${builtInEvents.filter(event => !eventNames.includes(event)).join('\',\'')}')
    and event_param.event_parameter_key = '${nodeType}'
    group by 1,2
  `;
}

function _buildCommonColumnsSql(columns: string[], key: string, value: string) {
  let columnsSql = '';
  const columnList: string[] = [];
  for ( const [_index, col] of columns.entries()) {
    columnsSql += `max(case when ${key} = '${col}' then ${value} else null end) as ${col},`;
    columnList.push(col);
  }
  if (columnsSql.endsWith(',')) {
    columnsSql = columnsSql.substring(0, columnsSql.length-1);
  }

  return {
    columnsSql,
    columns: columnList,
  };
}

function _buildUserJoinTable(schema: string, userJoinSql: string, userCommonColumnsSql: any, commonConditionSql: any, eventNameClause: string) {
  return `
  join 
  (
    select 
    event.user_pseudo_id,
    max(user_param.user_id) as user_id,
    ${userCommonColumnsSql.columnsSql}
    from ${schema}.ods_events as event
    ${userJoinSql}
    where ${commonConditionSql.eventDateSQL}
    ${eventNameClause}
    group by event.user_pseudo_id
  ) user_join_table on base_table.user_pseudo_id = user_join_table.user_pseudo_id
  `;
}

function _buildEventJoinTable(schema: string, eventJoinSql: string, eventCommonColumnsSql: any, commonConditionSql: any, eventNameClause: string) {
  return `
  join
  (
    select 
    event.event_id,
    ${eventCommonColumnsSql.columnsSql}
    from ${schema}.ods_events as event
    ${eventJoinSql}
    where ${commonConditionSql.eventDateSQL}
    ${eventNameClause}
    group by event.event_id
  ) event_join_table on base_table.event_id =  event_join_table.event_id
  `;
}

function _buildEventNameClause(eventNames: string[], sqlParameters: SQLParameters, isEventPathSQL: boolean, isNodePathSQL: boolean) {

  const eventNameInClause = `and event.event_name in ('${eventNames.join('\',\'')}')`;
  const eventNameClause = eventNames.length > 0 ? eventNameInClause : '';

  if (isNodePathSQL) {
    return `
    and event.event_name = '${ (sqlParameters.pathAnalysis?.platform === MetadataPlatform.ANDROID || sqlParameters.pathAnalysis?.platform === MetadataPlatform.IOS) ? '_screen_view' : '_page_view' }'
    ${sqlParameters.pathAnalysis!.platform ? 'and platform = \'' + sqlParameters.pathAnalysis!.platform + '\'' : '' }
    `;
  } else if (isEventPathSQL) {
    return 'and event.event_name not in (\'' + builtInEvents.filter(event => !eventNames.includes(event)).join('\',\'') + '\')';
  } else {
    return eventNameClause;
  }
}

export function _buildCommonPartSql(eventNames: string[], sqlParameters: SQLParameters,
  isEventPathSQL: boolean = false, isNodePathAnalysis: boolean = false, isRetentionAnalysis: boolean = false) : string {

  //If the query condition is simple use a different way to improve performance when fetch data
  if (!_hasMoreThanOneNestConditionInEvent(sqlParameters)) {
    return _buildCommonPartSqlSimple(eventNames, sqlParameters, isEventPathSQL, isNodePathAnalysis, isRetentionAnalysis);
  } else {
    const commonConditionSql = _getCommonConditionSql(sqlParameters, false, 'event.');
    let allConditionSql = '';
    if (!isRetentionAnalysis) {
      allConditionSql = _getAllConditionSql(eventNames, sqlParameters, isEventPathSQL);
    }
    const eventNameClause = _buildEventNameClause(eventNames, sqlParameters, isEventPathSQL, isNodePathAnalysis);

    let eventJoinSql = '';
    let userJoinSql = '';
    const eventCondition = _hasEventCondition(sqlParameters);
    let eventJoinTable = '';
    let eventColList: string[] = [];
    if (eventCondition.hasEventAttribute
      || sqlParameters.pathAnalysis?.sessionType === ExplorePathSessionDef.SESSION
    ) {
      eventJoinSql = `join ${sqlParameters.schemaName}.clickstream_ods_events_parameter_view as event_param
      on event.event_date = event_param.event_date and event.event_id = event_param.event_id
      `;

      const eventAttributes = ['_session_id'];
      eventAttributes.push(...eventCondition.eventAttributes);
      const eventCommonColumnsSql = _buildCommonColumnsSql([...new Set(eventAttributes)], 'event_parameter_key', 'event_parameter_value');
      eventColList = eventCommonColumnsSql.columns;
      eventJoinTable = _buildEventJoinTable(sqlParameters.schemaName, eventJoinSql, eventCommonColumnsSql, commonConditionSql, eventNameClause);
    }

    const userCondition = _hasUserCondition(sqlParameters);
    let userJoinTable = '';
    let userColList: string[] = [];
    if (userCondition.hasUserAttribute) {
      userJoinSql = `join ${sqlParameters.schemaName}.clickstream_user_attr_view as user_param
      on event.user_pseudo_id = user_param.user_pseudo_id
      `;

      const userAttributes = [];
      userAttributes.push(...userCondition.userAttributes);
      const userCommonColumnsSql = _buildCommonColumnsSql([...new Set(userAttributes)], 'custom_attr_key', 'custom_attr_value');
      userColList = userCommonColumnsSql.columns;
      userJoinTable = _buildUserJoinTable(sqlParameters.schemaName, userJoinSql, userCommonColumnsSql, commonConditionSql, eventNameClause);
    }

    userColList.push(...eventColList);
    let nestColList = userColList.join(',');
    if (nestColList !== '') {
      nestColList += ',';
    }

    return `with base_data as (
      select 
        ${nestColList}
        base_table.*
      from 
      (
      select 
      ${_renderUserPseudoIdColumn(baseColumns, sqlParameters.computeMethod, false)},
      TO_CHAR(TIMESTAMP 'epoch' + cast(event_timestamp/1000 as bigint) * INTERVAL '1 second', 'YYYY-MM') as month,
      TO_CHAR(date_trunc('week', TIMESTAMP 'epoch' + cast(event_timestamp/1000 as bigint) * INTERVAL '1 second'), 'YYYY-MM-DD') || ' - ' || TO_CHAR(date_trunc('week', (TIMESTAMP 'epoch' + cast(event_timestamp/1000 as bigint) * INTERVAL '1 second') + INTERVAL '6 days'), 'YYYY-MM-DD') as week,
      TO_CHAR(TIMESTAMP 'epoch' + cast(event_timestamp/1000 as bigint) * INTERVAL '1 second', 'YYYY-MM-DD') as day,
      TO_CHAR(TIMESTAMP 'epoch' + cast(event_timestamp/1000 as bigint) * INTERVAL '1 second', 'YYYY-MM-DD HH24') || '00:00' as hour
      from ${sqlParameters.schemaName}.ods_events as event
      where ${commonConditionSql.eventDateSQL}
      ${eventNameClause}
      ) base_table
      ${eventJoinTable}
      ${userJoinTable}
      where 1=1
      ${commonConditionSql.globalConditionSql}
      ${allConditionSql}
    ),
    `;
  }
}

export function _buildCommonPartSqlSimple(eventNames: string[], sqlParameters: SQLParameters,
  isEventPathSQL: boolean = false, isNodePathAnalysis: boolean = false, isRetentionAnalysis: boolean = false) : string {

  const commonConditionSql = _getCommonConditionSql(sqlParameters, true);
  let allConditionSql = '';
  if (!isRetentionAnalysis) {
    allConditionSql = _getAllConditionSql(eventNames, sqlParameters, isEventPathSQL, true);
  }

  const eventCondition = _hasEventCondition(sqlParameters);
  let eventJoinSql = '';
  let eventColumns = '';
  if (eventCondition.hasEventAttribute) {
    eventJoinSql = `join (select event_date, event_id, event_parameter_key, event_parameter_value from ${sqlParameters.schemaName}.clickstream_ods_events_parameter_view
      where ${_getEventDateSql(sqlParameters)}
      ) as event_param
    on event.event_date = event_param.event_date and event.event_id = event_param.event_id
    `;

    eventColumns = `
    event_param.event_parameter_key,
    event_param.event_parameter_value,
    `;

  }

  const userCondition = _hasUserCondition(sqlParameters);
  let userColumns = '';
  let userJoinSql = '';
  if (userCondition.hasUserAttribute) {
    userJoinSql = `join (select user_pseudo_id, custom_attr_key, custom_attr_value from ${sqlParameters.schemaName}.clickstream_user_attr_view) as user_param
    on event.user_pseudo_id = user_param.user_pseudo_id
    `;

    userColumns = `
    user_param.custom_attr_key,
    user_param.custom_attr_value,
    `;
  }

  return `with base_data as (
    select 
    ${_renderUserPseudoIdColumn(baseColumns, sqlParameters.computeMethod, false)},
    ${eventColumns}
    ${userColumns}
    TO_CHAR(TIMESTAMP 'epoch' + cast(event_timestamp/1000 as bigint) * INTERVAL '1 second', 'YYYY-MM') as month,
    TO_CHAR(date_trunc('week', TIMESTAMP 'epoch' + cast(event_timestamp/1000 as bigint) * INTERVAL '1 second'), 'YYYY-MM-DD') || ' - ' || TO_CHAR(date_trunc('week', (TIMESTAMP 'epoch' + cast(event_timestamp/1000 as bigint) * INTERVAL '1 second') + INTERVAL '6 days'), 'YYYY-MM-DD') as week,
    TO_CHAR(TIMESTAMP 'epoch' + cast(event_timestamp/1000 as bigint) * INTERVAL '1 second', 'YYYY-MM-DD') as day,
    TO_CHAR(TIMESTAMP 'epoch' + cast(event_timestamp/1000 as bigint) * INTERVAL '1 second', 'YYYY-MM-DD HH24') || '00:00' as hour
    from ${sqlParameters.schemaName}.ods_events as event
    ${userJoinSql}
    ${eventJoinSql}
    where ${commonConditionSql.eventDateSQL}
    ${_buildEventNameClause(eventNames, sqlParameters, isEventPathSQL, isNodePathAnalysis)}
    ${commonConditionSql.globalConditionSql}
    ${allConditionSql}
  ),
  `;
}

function _getAllConditionSql(eventNames: string[], sqlParameters: SQLParameters,
  isEventPathSQL: boolean = false, simpleVersion: boolean = false) : string {

  const prefix = simpleVersion ? 'event.' : '';
  let eventNameAndSQLConditions: EventNameAndConditionsSQL[] = [];
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
        conditionSql: getConditionSql(sqlParameters.eventAndConditions![index].sqlCondition),
      });
    }
  }

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

  if (isEventPathSQL && allConditionSql !== '' ) {
    allConditionSql = allConditionSql + ` or (${prefix}event_name not in ('${eventNames.join('\',\'')}'))`;
  }

  return allConditionSql !== '' ? `and (${allConditionSql})` : '';
}

function _getCommonConditionSql(sqlParameters: SQLParameters, simpleVersion: boolean = false, prefix?: string) {

  let prefixStr = simpleVersion ? 'event.' : '';
  if (prefix !== undefined) {
    prefixStr = prefix;
  }

  const eventDateSQL = _getEventDateSql(sqlParameters, prefixStr);
  let globalConditionSql = '';
  if (simpleVersion) {
    globalConditionSql = getGlobalConditionSqlSimple(sqlParameters.globalEventCondition);
  } else {
    globalConditionSql = getGlobalConditionSql(sqlParameters.globalEventCondition);
  }
  globalConditionSql = globalConditionSql !== '' ? `and (${globalConditionSql}) ` : '';

  return {
    eventDateSQL,
    globalConditionSql,
  };
}

function _getEventDateSql(sqlParameters: SQLParameters, prefix: string = '') {
  let eventDateSQL = '';
  if (sqlParameters.timeScopeType === ExploreTimeScopeType.FIXED) {
    eventDateSQL = eventDateSQL.concat(`${prefix}event_date >= '${sqlParameters.timeStart}'  and ${prefix}event_date <= '${sqlParameters.timeEnd}'`);
  } else {
    const nDayNumber = getLastNDayNumber(sqlParameters.lastN!, sqlParameters.timeUnit!);
    eventDateSQL = eventDateSQL.concat(`${prefix}event_date >= DATEADD(day, -${nDayNumber}, CURRENT_DATE) and ${prefix}event_date <= CURRENT_DATE`);
  }

  return eventDateSQL;
}

function _buildFunnelBaseSql(eventNames: string[], sqlParameters: SQLParameters) : string {

  let sql = _buildCommonPartSql(eventNames, sqlParameters);
  for (const [index, event] of eventNames.entries()) {
    let firstTableColumns = `
       month
      ,week
      ,day
      ,hour
      ,${_renderUserPseudoIdColumn(columnTemplate, sqlParameters.computeMethod, true).replace(/####/g, '_0')}
    `;

    sql = sql.concat(`
    table_${index} as (
      select 
        ${ index === 0 ? firstTableColumns : _renderUserPseudoIdColumn(columnTemplate, sqlParameters.computeMethod, true).replace(/####/g, `_${index}`)}
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

    let joinCondition = '';
    if ( sqlParameters.specifyJoinColumn) {
      joinCondition = `on table_${index-1}.${sqlParameters.joinColumn}_${index-1} = table_${index}.${sqlParameters.joinColumn}_${index}`;
    } else {
      joinCondition = `on table_${index-1}.user_pseudo_id_${index-1} = table_${index}.user_pseudo_id_${index}`;
    }

    if (sqlParameters.conversionIntervalType == 'CUSTOMIZE') {
      joinConditionSQL = joinConditionSQL.concat(`left outer join table_${index} ${joinCondition} and table_${index}.event_timestamp_${index} - table_${index-1}.event_timestamp_${index-1} > 0 and table_${index}.event_timestamp_${index} - table_${index-1}.event_timestamp_${index-1} < ${sqlParameters.conversionIntervalInSeconds}*1000 \n`);
    } else {
      joinConditionSQL = joinConditionSQL.concat(`left outer join table_${index} ${joinCondition} and TO_CHAR(TIMESTAMP 'epoch' + cast(table_${index-1}.event_timestamp_${index-1}/1000 as bigint) * INTERVAL '1 second', 'YYYY-MM-DD') = TO_CHAR(TIMESTAMP 'epoch' + cast(table_${index}.event_timestamp_${index}/1000 as bigint) * INTERVAL '1 second', 'YYYY-MM-DD')  \n`);
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

function _buildEventAnalysisBaseSql(eventNames: string[], sqlParameters: SQLParameters) : string {

  let sql = _buildCommonPartSql(eventNames, sqlParameters);
  const buildResult = _buildEventCondition(eventNames, sqlParameters, sql);
  sql = buildResult.sql;

  let joinTableSQL = '';
  for (const [index, _item] of eventNames.entries()) {

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
    joinTableSQL = joinTableSQL.concat(`
    ${unionSql}
    select 
      table_${index}.month
    , table_${index}.week
    , table_${index}.day
    , table_${index}.hour
    , table_${index}.event_name_${index} as event_name
    , table_${index}.event_timestamp_${index} as event_timestamp
    ${idSql}
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

function _buildEventCondition(eventNames: string[], sqlParameters: SQLParameters, baseSQL: string) {
  let sql = baseSQL;
  const computedMethodList: ExploreComputeMethod[] = [];
  for (const [index, event] of eventNames.entries()) {
    computedMethodList.push(sqlParameters.eventAndConditions![index].computeMethod ?? ExploreComputeMethod.EVENT_CNT);
    let tableColumns = `
       month
      ,week
      ,day
      ,hour
      ,${_renderUserPseudoIdColumn(columnTemplate, sqlParameters.computeMethod, true).replace(/####/g, `_${index}`)}
    `;

    sql = sql.concat(`
    table_${index} as (
      select 
        ${tableColumns}
      from base_data base
      where event_name = '${event}'
    ),
    `);
  }
  return { sql, computedMethodList };
}

export function buildFunnelTableView(sqlParameters: SQLParameters) : string {

  let eventNames = _getEventsNameFromConditions(sqlParameters.eventAndConditions!);
  let sql = _buildFunnelBaseSql(eventNames, sqlParameters);

  let prefix = 'user_pseudo_id';
  if (sqlParameters.computeMethod === ExploreComputeMethod.EVENT_CNT) {
    prefix = 'event_id';
  }
  let resultCntSQL ='';

  const maxIndex = eventNames.length - 1;
  for (const [index, _item] of eventNames.entries()) {
    resultCntSQL = resultCntSQL.concat(`, count(distinct ${prefix}_${index})  as ${eventNames[index]} \n`);
    if (index === 0) {
      resultCntSQL = resultCntSQL.concat(`, (count(distinct ${prefix}_${maxIndex}) :: decimal /  NULLIF(count(distinct ${prefix}_0), 0) ):: decimal(20, 4)  as rate \n`);
    } else {
      resultCntSQL = resultCntSQL.concat(`, (count(distinct ${prefix}_${index}) :: decimal /  NULLIF(count(distinct ${prefix}_${index-1}), 0) ):: decimal(20, 4)  as ${eventNames[index]}_rate \n`);
    }
  }

  sql = sql.concat(`
    select 
      ${sqlParameters.groupColumn}
      ${resultCntSQL}
    from join_table
    group by 
      ${sqlParameters.groupColumn}
  `);

  return format(sql, {
    language: 'postgresql',
  });
};

export function buildFunnelView(sqlParameters: SQLParameters) : string {

  let resultSql = '';
  const eventNames = _getEventsNameFromConditions(sqlParameters.eventAndConditions!);

  let index = 0;
  let prefix = 'u';
  if (sqlParameters.computeMethod === ExploreComputeMethod.EVENT_CNT) {
    prefix = 'e';
  }

  let baseSQL = _buildFunnelBaseSql(eventNames, sqlParameters);
  let finalTableColumnsSQL = `
     month
    ,week
    ,day
    ,hour
  `;

  let finalTableGroupBySQL = `
     month
    ,week
    ,day
    ,hour
  `;

  for (const [ind, _item] of eventNames.entries()) {
    finalTableColumnsSQL = finalTableColumnsSQL.concat(`, event_id_${ind} as e_id_${ind} \n`);
    finalTableColumnsSQL = finalTableColumnsSQL.concat(`, event_name_${ind} as e_name_${ind} \n`);
    finalTableColumnsSQL = finalTableColumnsSQL.concat(`, user_pseudo_id_${ind} as u_id_${ind} \n`);

    finalTableGroupBySQL = finalTableGroupBySQL.concat(`, event_id_${ind} \n`);
    finalTableGroupBySQL = finalTableGroupBySQL.concat(`, event_name_${ind} \n`);
    finalTableGroupBySQL = finalTableGroupBySQL.concat(`, user_pseudo_id_${ind} \n`);
  }

  baseSQL = baseSQL.concat(`,
    final_table as (
      select 
      ${finalTableColumnsSQL}
      from join_table 
      group by
      ${finalTableGroupBySQL}
    )
  `);

  for (const e of sqlParameters.eventAndConditions!) {
    eventNames.push(e.eventName);
    resultSql = resultSql.concat(`
    ${ index === 0 ? '' : 'union all'}
    select 
       day::date as event_date
      ,e_name_${index}::varchar as event_name
      ,${prefix}_id_${index}::varchar as x_id
    from final_table where ${prefix}_id_${index} is not null
    `);
    index += 1;
  }

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
  const eventNames = _getEventsNameFromConditions(sqlParameters.eventAndConditions!);

  let baseSQL = _buildEventAnalysisBaseSql(eventNames, sqlParameters);
  resultSql = resultSql.concat(`
      select 
        day::date as event_date, 
        event_name, 
        x_id as count
      from join_table 
      where x_id is not null
      group by
      day, event_name, x_id
  `);

  let sql = `
   ${baseSQL}
   ${resultSql}
   `;
  return format(sql, {
    language: 'postgresql',
  });
}

function _buildMidTableSQlForPathAnalysis(eventNames: string[], sqlParameters: SQLParameters) {

  if (_hasMoreThanOneNestConditionInEvent(sqlParameters)) {
    return `
    mid_table as (
      select 
        day::date as event_date,
        CASE
          WHEN event_name in ('${eventNames.join('\',\'')}')  THEN event_name 
          ELSE 'other'
        END as event_name,
        user_pseudo_id,
        event_id,
        event_timestamp,
        _session_id as session_id
      from base_data
    ),
    `;
  } else {
    return `
    mid_table_1 as (
      select 
        day::date as event_date,
        CASE
          WHEN event_name in ('${eventNames.join('\',\'')}')  THEN event_name 
          ELSE 'other'
        END as event_name,
        user_pseudo_id,
        event_id,
        event_timestamp
      from base_data
    ),
      mid_table_2 as (
      ${_buildSessionIdSQL(eventNames, sqlParameters, true)}
    ),
    mid_table as (
      select 
        mid_table_1.*,
        mid_table_2.session_id
      from 
        mid_table_1 join mid_table_2 on mid_table_1.event_date = mid_table_2.event_date and mid_table_1.event_id = mid_table_2.event_id
    ),
  `;
  }
}
export function buildEventPathAnalysisView(sqlParameters: SQLParameters) : string {

  const eventNames = _getEventsNameFromConditions(sqlParameters.eventAndConditions!);

  let midTableSql = '';
  let dataTableSql = '';
  if (sqlParameters.pathAnalysis?.sessionType === ExplorePathSessionDef.SESSION ) {
    midTableSql = _buildMidTableSQlForPathAnalysis(eventNames, sqlParameters);

    dataTableSql = `data as (
      select 
        *,
        ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY event_timestamp asc) as step_1,
        ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY event_timestamp asc) + 1 as step_2
      from mid_table 
    ),
    step_table_1 as (
      select 
      data.user_pseudo_id user_pseudo_id,
      data.session_id session_id,
      min(step_1) min_step
      from data
      where event_name in ('${eventNames.join('\',\'')}')
      group by user_pseudo_id, session_id
    ),
    step_table_2 as (
      select 
      data.*
      from data join step_table_1 on data.user_pseudo_id = step_table_1.user_pseudo_id and data.session_id = step_table_1.session_id and data.step_1 >= step_table_1.min_step
    ),
    data_final as (
      select
        event_date,
        event_name,
        user_pseudo_id,
        event_id,
        event_timestamp,
        session_id,
        ROW_NUMBER() OVER (
          PARTITION BY
            session_id
          ORDER BY
            step_1 asc, step_2
        ) as step_1,
        ROW_NUMBER() OVER (
          PARTITION BY
            session_id
          ORDER BY
            step_1 asc, step_2
        ) + 1 as step_2
      from
        step_table_2
    )
    select 
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
    midTableSql = `
      mid_table as (
        select 
        CASE
          WHEN event_name in ('${eventNames.join('\',\'')}')  THEN event_name 
          ELSE 'other'
        END as event_name,
        user_pseudo_id,
        event_id,
        event_timestamp
      from base_data base
      ),
    `;

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
        case when (b.event_timestamp - a.event_timestamp < ${sqlParameters.pathAnalysis!.lagSeconds! * 1000} and b.event_timestamp - a.event_timestamp >=0) then 0 else 1 end as group_start
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
        group_id,
        ROW_NUMBER() OVER (PARTITION BY user_pseudo_id, group_id ORDER BY event_timestamp asc) as step_1,
        ROW_NUMBER() OVER (PARTITION BY user_pseudo_id, group_id ORDER BY event_timestamp asc) + 1 as step_2
      from data_3
    ),
    step_table_1 as (
      select
        data.user_pseudo_id user_pseudo_id,
        group_id,
        min(step_1) min_step
      from
        data
      where
        event_name in ('${eventNames.join('\',\'')}')
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

  if (sqlParameters.pathAnalysis!.sessionType === ExplorePathSessionDef.SESSION ) {
    midTableSql = `
      mid_table_1 as (
        select 
          day::date as event_date,
          event_name,
          user_pseudo_id,
          event_id,
          event_timestamp
        from base_data
      ),
      mid_table_2 as (
        ${_buildSessionIdSQL(['_screen_view', '_page_view'], sqlParameters, true)}
      ),
      mid_table_3 as (
        ${_buildNodePathSQL(['_screen_view', '_page_view'], sqlParameters, sqlParameters.pathAnalysis!.nodeType)}
      ),
      mid_table as (
        select 
          mid_table_1.*,
          mid_table_2.session_id,
          mid_table_3.node
        from 
          mid_table_1 
          join mid_table_2 on mid_table_1.event_date = mid_table_2.event_date and mid_table_1.event_id = mid_table_2.event_id
          join mid_table_3 on mid_table_1.event_date = mid_table_3.event_date and mid_table_1.event_id = mid_table_3.event_id
      ),
      data as (
        select
        event_name,
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
        node in ('${sqlParameters.pathAnalysis?.nodes?.join('\',\'')}')
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
        day::date as event_date,
        event_name,
        user_pseudo_id,
        event_id,
        event_timestamp
      from base_data
    ),
    mid_table_2 as (
      ${_buildNodePathSQL(['_screen_view', '_page_view'], sqlParameters, sqlParameters.pathAnalysis!.nodeType)}
    ),
    mid_table as (
      select 
        mid_table_1.*,
        mid_table_2.node
      from 
        mid_table_1 
        join mid_table_2 on mid_table_1.event_date = mid_table_2.event_date and mid_table_1.event_id = mid_table_2.event_id
    ),
    `;

    dataTableSql = `data_1 as (
      select 
        user_pseudo_id,
        event_id,
        event_timestamp,
        case 
          when node in ('${sqlParameters.pathAnalysis?.nodes?.join('\',\'')}') then node 
          else 'other'
        end as node,
        ROW_NUMBER() OVER (PARTITION BY user_pseudo_id ORDER BY event_timestamp asc) as step_1,
        ROW_NUMBER() OVER (PARTITION BY user_pseudo_id ORDER BY event_timestamp asc) + 1 as step_2
      from mid_table
    ),
    data_2 as (
      select 
        a.node,
        a.user_pseudo_id,
        a.event_id,
        a.event_timestamp,
        case
          when (
            b.event_timestamp - a.event_timestamp < 3600000
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
        min(step_1) min_step
      from
        data
      where
        node in ('${sqlParameters.pathAnalysis?.nodes?.join('\',\'')}')
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
  const simpleVersion = !_hasMoreThanOneNestConditionInEvent(sqlParameters);
  const { tableSql, resultSql } = _buildSQLs(sqlParameters, simpleVersion);

  const sql = `
    ${_buildCommonPartSql(_getRetentionAnalysisViewEventNames(sqlParameters), sqlParameters, false, false, true)}
    first_date as (
      select min(event_date) as first_date from base_data
    ), 
    ${dateListSql}
    ${tableSql}
    result_table as (${resultSql})
    select 
      grouping, 
      start_event_date, 
      event_date, 
      (count(distinct end_user_pseudo_id)::decimal / NULLIF(count(distinct start_user_pseudo_id), 0)):: decimal(20, 4)  as retention 
    from result_table 
    group by grouping, start_event_date, event_date
    order by grouping, event_date
  `;

  return format(sql, {
    language: 'postgresql',
  });
}


function _buildConditionSQLForRetention(eventName: string, sqlCondition: SQLCondition | undefined, simpleVersion: boolean) {

  let sql = '';
  if (!simpleVersion) {
    sql = getConditionSql(sqlCondition);
  } else {
    sql = getConditionSqlSimple(sqlCondition);
  }

  if (sql !== '') {
    sql = `and (${sql}) `;
  }

  return `
    event_name = '${eventName}' ${sql}
  `;
}

function _buildSQLs(sqlParameters: SQLParameters, simpleVersion: boolean) {
  let tableSql = '';
  let resultSql = '';

  for (const [index, pair] of sqlParameters.pairEventAndConditions!.entries()) {

    const startConditionSql = _buildConditionSQLForRetention(pair.startEvent.eventName, pair.startEvent.sqlCondition, simpleVersion);
    const backConditionSql = _buildConditionSQLForRetention(pair.backEvent.eventName, pair.backEvent.sqlCondition, simpleVersion);

    let { joinColLeft, joinColRight, joinSql } = _buildJoinSQL(pair, index);

    tableSql = tableSql.concat(
      `
      first_table_${index} as (
        select 
          event_date,
          event_name,
          ${joinColLeft}
          user_pseudo_id
        from base_data join first_date on base_data.event_date = first_date.first_date
        ${startConditionSql !== '' ? 'where ' + startConditionSql : ''}
      ),
      second_table_${index} as (
        select 
          event_date,
          event_name,
          ${joinColRight}
          user_pseudo_id
        from base_data join first_date on base_data.event_date > first_date.first_date
        ${backConditionSql !== '' ? 'where ' + backConditionSql : ''}
      ),
      `,
    );

    if (index > 0) {
      resultSql = resultSql.concat(`
      union all
      `);
    }

    resultSql = resultSql.concat(`
    select 
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
    `);
  }
  return { tableSql, resultSql };
}

function _buildJoinSQL(pair: PairEventAndCondition, index: number) {
  let joinSql = '';
  let joinColLeft = '';
  let joinColRight = '';
  if (pair.startEvent.retentionJoinColumn && pair.backEvent.retentionJoinColumn) {
    const prefix1 = pair.startEvent.retentionJoinColumn.category === ConditionCategory.OTHER ? '' : pair.startEvent.retentionJoinColumn.category;
    const prefix2 = pair.backEvent.retentionJoinColumn.category === ConditionCategory.OTHER ? '' : pair.backEvent.retentionJoinColumn.category;

    joinColLeft = `${prefix1}_${pair.startEvent.retentionJoinColumn.property},`;
    joinColRight = `${prefix2}_${pair.backEvent.retentionJoinColumn.property},`;

    joinSql = `and first_table_${index}.${prefix1}_${pair.startEvent.retentionJoinColumn.property} = second_table_${index}.${prefix2}_${pair.backEvent.retentionJoinColumn.property}`;
  }
  return { joinColLeft, joinColRight, joinSql };
}

function _buildDateListSQL(sqlParameters: SQLParameters) {
  let dateList: string[] = [];
  if (sqlParameters.timeScopeType === ExploreTimeScopeType.FIXED) {
    dateList.push(...generateDateListWithoutStartData(new Date(sqlParameters.timeStart!), new Date(sqlParameters.timeEnd!)));
  } else {
    const lastN = getLastNDayNumber(sqlParameters.lastN!, sqlParameters.timeUnit!);
    for (let n = 1; n <= lastN; n++) {
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

function generateDateListWithoutStartData(startDate: Date, endDate: Date): string[] {
  const dateList: string[] = [];
  let currentDate = new Date(startDate);
  currentDate.setDate(currentDate.getDate() + 1);

  while (currentDate <= endDate) {
    dateList.push(formatDateToYYYYMMDD(new Date(currentDate)) );
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dateList;
}

function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `'${year.toString().trim()}-${month.trim()}-${day.trim()}'`;
}

function getConditionSql(sqlCondition: SQLCondition | undefined) {
  if (!sqlCondition) {
    return '';
  }

  let sql = '';
  for (const [_index, condition] of sqlCondition.conditions.entries()) {

    let conditionSql = '';
    if (condition.category === ConditionCategory.EVENT) {
      conditionSql = buildSqlFromCondition(condition);
    } else if (condition.category === ConditionCategory.USER) {
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
  for (const [_index, condition] of sqlCondition.conditions.entries()) {

    let conditionSql = '';
    if (condition.category === ConditionCategory.EVENT) {
      conditionSql = buildSqlForEventCondition(condition);
    } else if (condition.category === ConditionCategory.USER) {
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


function getGlobalConditionSql(sqlCondition: SQLCondition | undefined) {

  if (!sqlCondition) {
    return '';
  }

  let sql = '';
  for (const [_index, condition] of sqlCondition.conditions.entries()) {

    let conditionSql = '';
    //global condition were not supported on event attribute
    if (condition.category === ConditionCategory.EVENT) {
      logger.warn('global condition were not supported on event attribute');
      continue;
    } else if (condition.category === ConditionCategory.USER) {
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

function getGlobalConditionSqlSimple(sqlCondition: SQLCondition | undefined) {

  if (!sqlCondition) {
    return '';
  }

  let sql = '';
  for (const [_index, condition] of sqlCondition.conditions.entries()) {

    let conditionSql = '';
    //global condition were not supported on event attribute
    if (condition.category === ConditionCategory.EVENT) {
      logger.warn('global condition were not supported on event attribute');
      continue;
    } else if (condition.category === ConditionCategory.USER) {
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

function getLastNDayNumber(lastN: number, timeUnit: ExploreRelativeTimeUnit) : number {
  let lastNDayNumber = lastN;
  if (timeUnit === ExploreRelativeTimeUnit.WK) {
    lastNDayNumber = lastN * 7;
  } else if (timeUnit === ExploreRelativeTimeUnit.MM) {
    lastNDayNumber = lastN * 31;
  } else if (timeUnit === ExploreRelativeTimeUnit.Q) {
    lastNDayNumber = lastN * 31 * 3;
  }
  return lastNDayNumber;
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
      logger.error(`unsupported condition ${JSON.stringify(condition)}`);
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
      logger.error(`unsupported condition ${JSON.stringify(condition)}`);
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
      logger.error(`unsupported condition ${JSON.stringify(condition)}`);
      throw new Error('Unsupported condition');
  }
}

function buildSqlForNestAttributeStringCondition(condition: Condition, propertyKey: string, propertyValue: string) : string {
  switch (condition.operator) {
    case ExploreAnalyticsOperators.EQUAL:
    case ExploreAnalyticsOperators.NOT_EQUAL:
    case ExploreAnalyticsOperators.GREATER_THAN:
    case ExploreAnalyticsOperators.GREATER_THAN_OR_EQUAL:
    case ExploreAnalyticsOperators.LESS_THAN:
    case ExploreAnalyticsOperators.LESS_THAN_OR_EQUAL:
      return `(${propertyKey} = '${condition.property}' and ${propertyValue} ${condition.operator} '${condition.value[0]}')`;
    case ExploreAnalyticsOperators.IN:
      const values = '\'' + condition.value.join('\',\'') + '\'';
      return `(${propertyKey} = '${condition.property}' and ${propertyValue} in (${values}))`;
    case ExploreAnalyticsOperators.NOT_IN:
      const notValues = '\'' + condition.value.join('\',\'') + '\'';
      return `(${propertyKey} = '${condition.property}' and ${propertyValue} not in (${notValues}))`;
    case ExploreAnalyticsOperators.CONTAINS:
      return `(${propertyKey} = '${condition.property}' and ${propertyValue} like '%${condition.value[0]}%')`;
    case ExploreAnalyticsOperators.NOT_CONTAINS:
      return `(${propertyKey} = '${condition.property}' and ${propertyValue} not like '%${condition.value[0]}%')`;
    case ExploreAnalyticsOperators.NULL:
      return `(${propertyKey} = '${condition.property}' and ${propertyValue} is null)`;
    case ExploreAnalyticsOperators.NOT_NULL:
      return `(${propertyKey} = '${condition.property}' and ${propertyValue} is not null)`;
    default:
      logger.error(`unsupported condition ${JSON.stringify(condition)}`);
      throw new Error('Unsupported condition');
  }

}

function buildSqlForNestAttributeNumberCondition(condition: Condition, propertyKey: string, propertyValue: string) : string {
  switch (condition.operator) {
    case ExploreAnalyticsOperators.EQUAL:
    case ExploreAnalyticsOperators.NOT_EQUAL:
    case ExploreAnalyticsOperators.GREATER_THAN:
    case ExploreAnalyticsOperators.GREATER_THAN_OR_EQUAL:
    case ExploreAnalyticsOperators.LESS_THAN:
    case ExploreAnalyticsOperators.LESS_THAN_OR_EQUAL:
      return `(${propertyKey} = '${condition.property}' and ${propertyValue} ${condition.operator} '${condition.value[0]}')`;
    case ExploreAnalyticsOperators.IN:
      const values = condition.value.join(',');
      return `(${propertyKey} = '${condition.property}' and ${propertyValue} in (${values}))`;
    case ExploreAnalyticsOperators.NOT_IN:
      const notValues = condition.value.join(',');
      return `(${propertyKey} = '${condition.property}' and ${propertyValue} not in (${notValues}))`;
    case ExploreAnalyticsOperators.NULL:
      return `(${propertyKey} = '${condition.property}' and ${propertyValue} is null)`;
    case ExploreAnalyticsOperators.NOT_NULL:
      return `(${propertyKey} = '${condition.property}' and ${propertyValue} is not null)`;
    default:
      logger.error(`unsupported condition ${JSON.stringify(condition)}`);
      throw new Error('Unsupported condition');
  }

}

function _buildSqlFromStringCondition(condition: Condition, prefix: string) : string {
  switch (condition.operator) {
    case ExploreAnalyticsOperators.EQUAL:
    case ExploreAnalyticsOperators.NOT_EQUAL:
    case ExploreAnalyticsOperators.GREATER_THAN:
    case ExploreAnalyticsOperators.GREATER_THAN_OR_EQUAL:
    case ExploreAnalyticsOperators.LESS_THAN:
    case ExploreAnalyticsOperators.LESS_THAN_OR_EQUAL:
      return `${prefix}${condition.property} ${condition.operator} '${condition.value[0]}'`;
    case ExploreAnalyticsOperators.IN:
      const values = '\'' + condition.value.join('\',\'') + '\'';
      return `${prefix}${condition.property} in (${values})`;
    case ExploreAnalyticsOperators.NOT_IN:
      const notValues = '\'' + condition.value.join('\',\'') + '\'';
      return `${prefix}${condition.property} not in (${notValues})`;
    case ExploreAnalyticsOperators.CONTAINS:
      return `${prefix}${condition.property} like '%${condition.value[0]}%'`;
    case ExploreAnalyticsOperators.NOT_CONTAINS:
      return `${prefix}${condition.property} not like '%${condition.value[0]}%'`;
    case ExploreAnalyticsOperators.NULL:
      return `${prefix}${condition.property} is null `;
    case ExploreAnalyticsOperators.NOT_NULL:
      return `${prefix}${condition.property} is not null `;
    default:
      logger.error(`unsupported condition ${JSON.stringify(condition)}`);
      throw new Error('Unsupported condition');
  }

}

function _buildSqlFromNumberCondition(condition: Condition, prefix: string) : string {
  switch (condition.operator) {
    case ExploreAnalyticsOperators.EQUAL:
    case ExploreAnalyticsOperators.NOT_EQUAL:
    case ExploreAnalyticsOperators.GREATER_THAN:
    case ExploreAnalyticsOperators.GREATER_THAN_OR_EQUAL:
    case ExploreAnalyticsOperators.LESS_THAN:
    case ExploreAnalyticsOperators.LESS_THAN_OR_EQUAL:
      return `${prefix}${condition.property} ${condition.operator} ${condition.value[0]}`;
    case ExploreAnalyticsOperators.IN:
      const values = condition.value.join(',');
      return `${prefix}${condition.property} in (${values})`;
    case ExploreAnalyticsOperators.NOT_IN:
      const notValues = condition.value.join(',');
      return `${prefix}${condition.property} not in (${notValues})`;
    case ExploreAnalyticsOperators.NULL:
      return `${prefix}${condition.property} is null `;
    case ExploreAnalyticsOperators.NOT_NULL:
      return `${prefix}${condition.property} is not null `;
    default:
      logger.error(`unsupported condition ${JSON.stringify(condition)}`);
      throw new Error('Unsupported condition');
  }

}

function _renderUserPseudoIdColumn(columns: string, computeMethod: ExploreComputeMethod, addSuffix: boolean): string {
  if (computeMethod === ExploreComputeMethod.USER_ID_CNT) {
    let pattern = /,user_pseudo_id/g;
    let suffix = '';
    if (addSuffix) {
      pattern = /,user_pseudo_id as user_pseudo_id####/g;
      suffix = '####';
    }
    return columns.replace(pattern, `,COALESCE(user_id, user_pseudo_id) as user_pseudo_id${suffix}`);
  }

  return columns;
}

function _getEventsNameFromConditions(eventAndConditions: EventAndCondition[]) {
  const eventNames: string[] = [];
  for (const e of eventAndConditions) {
    eventNames.push(e.eventName);
  }
  return eventNames;
}

function _getRetentionAnalysisViewEventNames(sqlParameters: SQLParameters) : string[] {

  const eventNames: string[] = [];

  for (const pair of sqlParameters.pairEventAndConditions!) {
    eventNames.push(pair.startEvent.eventName);
    eventNames.push(pair.backEvent.eventName);
  }

  return [...new Set(eventNames)];
}

function hasNestAttribute(conditions: Condition[]) {

  let hasUserAttribute = false;
  let hasEventAttribute = false;
  const userAttributes: string[] = [];
  const eventAttributes: string[] = [];
  for (const [_index, condition] of conditions.entries()) {
    if (condition.category === ConditionCategory.USER) {
      hasUserAttribute = true;
      userAttributes.push(condition.property);
    } else if (condition.category === ConditionCategory.EVENT) {
      hasEventAttribute = true;
      eventAttributes.push(condition.property);
    }
  }

  return {
    hasEventAttribute,
    hasUserAttribute,
    userAttributes,
    eventAttributes,
  };
}

function _hasEventCondition(sqlParameters: SQLParameters) {

  let hasEventAttribute = false;
  const eventAttributes: string[] = [];
  if (sqlParameters.eventAndConditions) {
    for (const [_index, eventCondition] of sqlParameters.eventAndConditions.entries()) {
      if (eventCondition.sqlCondition?.conditions !== undefined) {
        const nestAttribute = hasNestAttribute(eventCondition.sqlCondition?.conditions);
        hasEventAttribute = hasEventAttribute || nestAttribute.hasEventAttribute;
        eventAttributes.push(...nestAttribute.eventAttributes);
      }
    }
  }

  if (sqlParameters.globalEventCondition?.conditions) {
    const nestAttribute = hasNestAttribute(sqlParameters.globalEventCondition?.conditions);
    hasEventAttribute = hasEventAttribute || nestAttribute.hasEventAttribute;
    eventAttributes.push(...nestAttribute.eventAttributes);
  }

  const hasEventConditionRetentionAnalysis = _hasEventConditionRetentionAnalysis(sqlParameters);
  hasEventAttribute = hasEventAttribute || hasEventConditionRetentionAnalysis.hasEventAttribute;
  eventAttributes.push(...hasEventConditionRetentionAnalysis.eventAttributes);

  return {
    hasEventAttribute,
    eventAttributes,
  };
}

function _hasUserCondition(sqlParameters: SQLParameters) {

  let hasUserAttribute = false;
  const userAttributes: string[] = [];
  if (sqlParameters.eventAndConditions) {
    for (const [_index, eventCondition] of sqlParameters.eventAndConditions.entries()) {
      if (eventCondition.sqlCondition?.conditions !== undefined) {
        const nestAttribute = hasNestAttribute(eventCondition.sqlCondition?.conditions);
        hasUserAttribute = hasUserAttribute || nestAttribute.hasUserAttribute;
        userAttributes.push(...nestAttribute.userAttributes);
      }
    }
  }

  if (sqlParameters.globalEventCondition?.conditions) {
    const nestAttribute = hasNestAttribute(sqlParameters.globalEventCondition?.conditions);
    hasUserAttribute = hasUserAttribute || nestAttribute.hasUserAttribute;
    userAttributes.push(...nestAttribute.userAttributes);
  }

  const hasUserConditionRetentionAnalysis = _hasUserConditionRetentionAnalysis(sqlParameters);
  hasUserAttribute = hasUserAttribute || hasUserConditionRetentionAnalysis.hasUserAttribute;
  userAttributes.push(...hasUserConditionRetentionAnalysis.userAttributes);

  return {
    hasUserAttribute,
    userAttributes,
  };
}


function _hasNestConditionRetentionAnalysis(pairEventAndCondition: PairEventAndCondition, category: ConditionCategory) {

  let hasAttribute = false;
  const attributes: string[] = [];

  if (pairEventAndCondition.startEvent.retentionJoinColumn?.category === category) {
    hasAttribute = true;
    attributes.push(pairEventAndCondition.startEvent.retentionJoinColumn?.property);
  }

  if (pairEventAndCondition.backEvent.retentionJoinColumn?.category === category) {
    hasAttribute = true;
    attributes.push(pairEventAndCondition.backEvent.retentionJoinColumn?.property);
  }

  if (pairEventAndCondition.startEvent.sqlCondition?.conditions) {
    const nestAttribute = hasNestAttribute(pairEventAndCondition.startEvent.sqlCondition?.conditions);

    if (category === ConditionCategory.EVENT) {
      hasAttribute = hasAttribute || nestAttribute.hasEventAttribute;
      attributes.push(...nestAttribute.eventAttributes);
    } else if (category === ConditionCategory.USER) {
      hasAttribute = hasAttribute || nestAttribute.hasUserAttribute;
      attributes.push(...nestAttribute.userAttributes);
    }
  }

  if (pairEventAndCondition.backEvent.sqlCondition?.conditions) {
    const nestAttribute = hasNestAttribute(pairEventAndCondition.backEvent.sqlCondition?.conditions);
    if (category === ConditionCategory.EVENT) {
      hasAttribute = hasAttribute || nestAttribute.hasEventAttribute;
      attributes.push(...nestAttribute.eventAttributes);
    } else if (category === ConditionCategory.USER) {
      hasAttribute = hasAttribute || nestAttribute.hasUserAttribute;
      attributes.push(...nestAttribute.userAttributes);
    }
  }

  return {
    hasAttribute,
    attributes,
  };
}

function _hasUserConditionRetentionAnalysis(sqlParameters: SQLParameters) {

  let hasUserAttribute = false;
  const userAttributes: string[] = [];
  if (sqlParameters.pairEventAndConditions) {
    for (const [_index, pair] of sqlParameters.pairEventAndConditions.entries()) {
      const userNestConditionRetentionAnalysis = _hasNestConditionRetentionAnalysis(pair, ConditionCategory.USER);
      hasUserAttribute = hasUserAttribute || userNestConditionRetentionAnalysis.hasAttribute;
      userAttributes.push(...userNestConditionRetentionAnalysis.attributes);
    }
  }

  return {
    hasUserAttribute,
    userAttributes,
  };
}

function _hasEventConditionRetentionAnalysis(sqlParameters: SQLParameters) {

  let hasEventAttribute = false;
  const eventAttributes: string[] = [];
  if (sqlParameters.pairEventAndConditions) {
    for (const [_index, pair] of sqlParameters.pairEventAndConditions.entries()) {
      const eventNestConditionRetentionAnalysis = _hasNestConditionRetentionAnalysis(pair, ConditionCategory.EVENT);
      hasEventAttribute = hasEventAttribute || eventNestConditionRetentionAnalysis.hasAttribute;
      eventAttributes.push(...eventNestConditionRetentionAnalysis.attributes);
    }
  }

  return {
    hasEventAttribute,
    eventAttributes,
  };
}

function _hasMoreThanOneNestConditionInEvent(sqlParameters: SQLParameters): boolean {

  if (_hasMoreThanOneNestConditionInEvent1(sqlParameters)) {
    return true;
  }

  if (_hasMoreThanOneNestConditionInEvent2(sqlParameters)) {
    return true;
  }

  if (_hasMoreThanOneNestConditionInEvent3(sqlParameters)) {
    return true;
  }

  if (_hasMoreThanOneNestConditionInEvent4(sqlParameters)) {
    return true;
  }

  return false;
}

function _hasMoreThanOneNestConditionInEvent1(sqlParameters: SQLParameters): boolean {
  let counter = 0;
  if (sqlParameters.globalEventCondition?.conditions !== undefined) {
    for (const [_index, condition] of sqlParameters.globalEventCondition.conditions.entries()) {
      if (condition.category === ConditionCategory.USER || condition.category === ConditionCategory.EVENT) {
        counter += 1;
      }
      if (counter > 1) {
        return true;
      }
    }
  }

  return false;
}

function _hasMoreThanOneNestConditionInEvent2(sqlParameters: SQLParameters): boolean {
  if (sqlParameters.eventAndConditions !== undefined) {
    for (const [_index, eventAndCondition] of sqlParameters.eventAndConditions.entries()) {
      if (eventAndCondition.sqlCondition !== undefined) {
        const has = _hasMoreThanOneNestConditionInEventBase(eventAndCondition.sqlCondition);
        if (has) {
          return true;
        }
      }
    }
  }

  return false;
  ;
}

function _hasMoreThanOneNestConditionInEventBase(sqlCondition: SQLCondition): boolean {
  let counter = 0;
  if (sqlCondition !== undefined && sqlCondition.conditions !== undefined) {
    for (const [_, condition] of sqlCondition.conditions.entries()) {
      if (condition.category === ConditionCategory.USER || condition.category === ConditionCategory.EVENT) {
        counter += 1;
      }
      if (counter > 1) {
        return true;
      }
    }
  }

  return false;
}

function _hasMoreThanOneNestConditionInEvent3(sqlParameters: SQLParameters): boolean {

  if (sqlParameters.pairEventAndConditions !== undefined) {
    for (const [_index, pair] of sqlParameters.pairEventAndConditions.entries()) {
      if (!pair.startEvent.sqlCondition) {
        const has = _hasMoreThanOneNestConditionInEventBase(pair.startEvent.sqlCondition!);
        if (has) {
          return true;
        }
      }
    }
  }

  return false;
}

function _hasMoreThanOneNestConditionInEvent4(sqlParameters: SQLParameters): boolean {
  if (sqlParameters.pairEventAndConditions !== undefined) {
    for (const [_index, pair] of sqlParameters.pairEventAndConditions.entries()) {
      if (!pair.backEvent.sqlCondition) {
        const has = _hasMoreThanOneNestConditionInEventBase(pair.backEvent.sqlCondition!);
        if (has) {
          return true;
        }
      }
    }
  }

  return false;
}