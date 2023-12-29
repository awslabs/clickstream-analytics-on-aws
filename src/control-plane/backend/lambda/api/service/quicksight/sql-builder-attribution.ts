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
import { AttributionSQLParameters, BaseSQLParameters, ColumnAttribute, EVENT_TABLE, EventAndCondition, EventNonNestColProps, USER_TABLE, buildColNameWithPrefix, buildColumnConditionProps, buildCommonColumnsSql, buildCommonConditionSql, buildConditionProps, buildConditionSql, buildEventConditionPropsFromEvents, buildEventDateSql, buildEventJoinTable, buildEventsNameFromConditions, buildNecessaryEventColumnsSql, buildUserJoinTable } from './sql-builder';
import { AttributionModelType, ExploreComputeMethod } from '../../common/explore-types';

export function buildSQLForSinglePointModel(params: AttributionSQLParameters): string {

  const eventNames = buildEventsNameFromConditions(params.eventAndConditions as EventAndCondition[]);
  const commonPartSql = buildCommonSqlForAttribution(eventNames, params);

  let modelBaseDataSql = '';
  if(params.modelType === AttributionModelType.LAST_TOUCH) {
    modelBaseDataSql = `
      model_base_data as (
        select user_pseudo_id, group_id, max(row_seq) as row_seq
        from joined_base_data
        group by user_pseudo_id, group_id
      ),
    `
  } else if (params.modelType === AttributionModelType.FIRST_TOUCH) {
    modelBaseDataSql = `
      model_base_data as (
        select user_pseudo_id, group_id, min(row_seq) as row_seq
        from joined_base_data
        group by user_pseudo_id, group_id
      ),
    `
  }

  const modelDataSql = `
    ${modelBaseDataSql}
    model_data as (
      select 
        joined_base_data.* 
      from joined_base_data join model_base_data on joined_base_data.user_pseudo_id = model_base_data.user_pseudo_id
      and joined_base_data.row_seq = model_base_data.row_seq and joined_base_data.group_id = model_base_data.group_id
    ),
  `

  let attributionDataSql = '';
  if(params.computeMethod === ExploreComputeMethod.EVENT_CNT) {
    attributionDataSql = `
      select 
         total_count_data.total_event_count
        ,attribution_data.t_event_name as event_name
        ,attribution_data.event_count
        ,cast(attribution_data.contribution as float)/t.total_contribution as contribution
      from attribution_data
      join (
        select 
          event_name
          ,count(event_id) as total_event_count
        from touch_point_data_3 group by event_name
      ) total_count_data on attribution_data.t_event_name = total_count_data.event_name
      join (
        select count(t_event_id) as total_contribution from model_data
      ) as t
      on 1=1
    `
  } else if (params.computeMethod === ExploreComputeMethod.USER_CNT) {
    attributionDataSql = `
      total_count_data as (
        select 
           event_name
          ,count(distinct COALESCE(u.user_id, u.user_pseudo_id) as u_user_pseudo_id) as total_user_count
        from touch_point_data_3
        join ${params.schemaName}.${USER_TABLE} as u
        on model_data.user_pseudo_id = u.user_pseudo_id
        group by event_name
      ),
      model_data_with_user as (
        select 
          model_data.*
          ,COALESCE(u.user_id, u.user_pseudo_id) as u_user_pseudo_id
        from model_data
        join ${params.schemaName}.${USER_TABLE} as u
        on model_data.user_pseudo_id = u.user_pseudo_id
      ),
      attribution_data as (
        select 
          t_event_name
          ,count(distinct u_user_pseudo_id) as contribution
        from model_data_with_user
        group by t_event_name
      )
      select 
         total_count_data.total_user_count
        ,t1.t_event_name as event_name
        ,t1.user_count
        ,cast(t1.contribution as float)/t2.total_contribution as contribution
      from attribution_data as t1
      join total_count_data on attribution_data.t_event_name = total_count_data.event_name
      join (
        select sum(contribution) as total_contribution from attribution_data
      ) as t2
      on 1=1
    `
  } else if(params.computeMethod === ExploreComputeMethod.SUM_VALUE) {
    attributionDataSql = `
      attribution_data as (
        select 
          t_event_name
          ,sum(sum_value) as contribution
          ,count(t_event_id) as event_count
        from model_data
        group by t_event_name
      )
      select 
         total_count_data.total_event_count
        ,attribution_data.t_event_name as event_name
        ,attribution_data.contribution as contribution_amount
        ,cast(attribution_data.contribution as float)/t.total_contribution as contribution
      from attribution_data
      join (
        select 
          event_name
          ,count(event_id) as total_event_count
        from touch_point_data_3 group by event_name
      ) total_count_data on attribution_data.t_event_name = total_count_data.event_name
      join (
        select count(t_event_id) as total_contribution from model_data
      ) as t
      on 1=1
    `
  }
  
  const sql = `
    ${commonPartSql}
    ${modelDataSql}
    ${attributionDataSql}
  `

  return format(sql, {
    language: 'postgresql',
  });
}

export function buildBaseDataForAttribution(eventNames: string[], params: AttributionSQLParameters) : string {

  let resultSql = 'with';
  const commonConditionSql = buildCommonConditionSql(params as BaseSQLParameters, 'event.');

  const eventConditionProps = buildAttributionEventConditionProps(params);
  let eventJoinTable = '';
  let baseUserDataSql = '';
  let eventColList: string[] = [];

  const eventNonNestColProps = buildNecessaryEventColumnsSql(eventConditionProps);
  const baseEventDataSql = _buildBaseEventDataSql(eventNames, params, eventNonNestColProps);

  if (eventConditionProps.hasEventAttribute) {
    const eventAttributes: ColumnAttribute[] = [];
    eventAttributes.push(...eventConditionProps.eventAttributes);
    const eventCommonColumnsSql = buildCommonColumnsSql(eventAttributes, 'event_param_key', 'event_param_{{}}_value');
    eventColList = eventCommonColumnsSql.columns;
    eventJoinTable = buildEventJoinTable(params.schemaName, eventCommonColumnsSql.columnsSql);
  }

  const userConditionProps = _getUserConditionProps(params);
  let userJoinTable = '';
  let userColList: string[] = [];
  if (userConditionProps.hasNestUserAttribute || userConditionProps.hasOuterUserAttribute) {

    baseUserDataSql = _buildBaseUserDataSql(params, userConditionProps.hasNestUserAttribute);

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
          ${_buildBaseUserDataTableSql(params, false, '_join')}
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
            ${_buildBaseEventDataTableSQL(eventNames, params, eventNonNestColProps)}
          ) as event_base
          ${userOuterSql}
          where 1=1
          ${commonConditionSql.globalConditionSql}
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
        ),
      `,
    );
  }

  return format(resultSql, { language: 'postgresql' });
}

export function buildCommonSqlForAttribution(eventNames: string[], params: AttributionSQLParameters) : string {

  const commonPartSql = buildBaseDataForAttribution(eventNames.concat(params.targetEventAndCondition.eventName), params);

  let sumValueColSql = '';
  let sumValueColName = '';
  let sumValueColDummy = '';
  if(params.computeMethod === ExploreComputeMethod.SUM_VALUE) {
    sumValueColSql = `,${buildColNameWithPrefix(params.targetEventAndCondition.groupColumn!)} as sum_value`;
    sumValueColName = ',sum_value';
    sumValueColDummy = ',0 as sum_value';
  }

  const targetSql = `
    target_data as (
      select 
         user_pseudo_id
        ,event_id
        ,event_name
        ,event_timestamp
        ,row_number() over(PARTITION by user_pseudo_id ORDER by event_timestamp asc) as rank 
        ${sumValueColSql}
      from base_data
      where event_name = '${params.targetEventAndCondition.eventName}' and (
        ${buildConditionSql(params.targetEventAndCondition.sqlCondition)}
      )
    ),
  `
  let touchPointSql = `
    touch_point_data_1 as (
      select 
        user_pseudo_id
      , event_id
      , event_name
      , event_timestamp
      ${sumValueColName}
      from target_data
  `;
  for (const [index, eventAndCondition] of params.eventAndConditions.entries()) {
    touchPointSql = touchPointSql.concat(`
      union all
      select 
        user_pseudo_id
      , event_id
      , '${index+1}_' || event_name as event_name
      , event_timestamp
      ${sumValueColDummy}
      from base_data 
      where 
        event_name = '${eventAndCondition.eventName}' 
        and ( ${buildConditionSql(eventAndCondition.sqlCondition)} )
    `)
  }

  touchPointSql = touchPointSql.concat(`
    ),
    touch_point_data_2 as (
      select 
      * 
      , case when event_name = '${params.targetEventAndCondition.eventName}' then 1 else 0 end as conversation_flag
      from touch_point_data_1 order by event_timestamp
    ),
    touch_point_data_3 as (
      select 
      * 
      , SUM(conversation_flag) over (
      PARTITION by user_pseudo_id
      order by
          user_pseudo_id,
          event_timestamp ROWS BETWEEN UNBOUNDED PRECEDING
          AND CURRENT ROW
      ) + 1 AS group_id
      from touch_point_data_2
    ),
  `)

  const joinSql = `
    joined_base_data as (
        select 
         target_data.*
        ,touch_point_data_3.user_pseudo_id as t_user_pseudo_id
        ,touch_point_data_3.event_id as t_event_id
        ,touch_point_data_3.event_name as t_event_name
        ,touch_point_data_3.event_timestamp as t_event_timestamp
        ,touch_point_data_3.conversation_flag
        ,touch_point_data_3.group_id
        ,row_number() over(PARTITION by t_user_pseudo_id, rank order by t_event_timestamp asc) as row_seq
        from target_data
        join touch_point_data_3 on target_data.user_pseudo_id = touch_point_data_3.user_pseudo_id and target_data.rank = touch_point_data_3.group_id and target_data.event_timestamp >= touch_point_data_3.event_timestamp
        where touch_point_data_3.event_name <> '${params.targetEventAndCondition.eventName}'
    ),
  `

  const sql = `
    ${commonPartSql}
    ${targetSql}
    ${touchPointSql}
    ${joinSql}
  `

  return format(sql, { language: 'postgresql' });
}

function buildAttributionEventConditionProps(sqlParameters: AttributionSQLParameters) {

  let hasEventAttribute = false;
  const eventAttributes: ColumnAttribute[] = [];

  let hasEventNonNestAttribute = false;
  const eventNonNestAttributes: ColumnAttribute[] = [];

  if (sqlParameters.eventAndConditions) {
    const eventCondition = buildEventConditionPropsFromEvents(sqlParameters.eventAndConditions as EventAndCondition[]);
    hasEventAttribute = hasEventAttribute || eventCondition.hasEventAttribute;
    eventAttributes.push(...eventCondition.eventAttributes);

    hasEventNonNestAttribute = hasEventNonNestAttribute || eventCondition.hasEventNonNestAttribute;
    eventNonNestAttributes.push(...eventCondition.eventNonNestAttributes);
  }

  if (sqlParameters.targetEventAndCondition?.sqlCondition?.conditions) {
    const allAttribute = buildConditionProps(sqlParameters.targetEventAndCondition?.sqlCondition?.conditions);
    hasEventAttribute = hasEventAttribute || allAttribute.hasEventAttribute;
    eventAttributes.push(...allAttribute.eventAttributes);

    hasEventNonNestAttribute = hasEventNonNestAttribute || allAttribute.hasEventNonNestAttribute;
    eventNonNestAttributes.push(...allAttribute.eventNonNestAttributes);
  }

  if(sqlParameters.targetEventAndCondition?.groupColumn){
    const groupColumnProps = buildColumnConditionProps(sqlParameters.targetEventAndCondition?.groupColumn);

    hasEventAttribute = hasEventAttribute || groupColumnProps.hasEventAttribute;
    eventAttributes.push(...groupColumnProps.eventAttributes);

    hasEventNonNestAttribute = hasEventNonNestAttribute || groupColumnProps.hasEventNonNestAttribute;
    eventNonNestAttributes.push(...groupColumnProps.eventNonNestAttributes);
  }

  if (sqlParameters.globalEventCondition?.conditions) {
    const allAttribute = buildConditionProps(sqlParameters.globalEventCondition?.conditions);
    hasEventAttribute = hasEventAttribute || allAttribute.hasEventAttribute;
    eventAttributes.push(...allAttribute.eventAttributes);

    hasEventNonNestAttribute = hasEventNonNestAttribute || allAttribute.hasEventNonNestAttribute;
    eventNonNestAttributes.push(...allAttribute.eventNonNestAttributes);
  }

  return {
    hasEventAttribute,
    hasEventNonNestAttribute,
    eventAttributes,
    eventNonNestAttributes,
  };
}

function _buildBaseEventDataSql(eventNames: string[], sqlParameters: AttributionSQLParameters, eventNonNestColProps: EventNonNestColProps) {

  return `
    event_base as (
      ${_buildBaseEventDataTableSQL(eventNames, sqlParameters, eventNonNestColProps)}
  ),
  `;
}

function _buildBaseEventDataTableSQL(eventNames: string[], sqlParameters: AttributionSQLParameters, eventNonNestColProps: EventNonNestColProps) {
  const eventDateSQL = buildEventDateSql(sqlParameters as BaseSQLParameters, 'event.');
  const eventNameClause = _buildEventNameClause(eventNames);

  return `
    select
      ${eventNonNestColProps.sql},
      user_pseudo_id,
      user_id
    from
        ${sqlParameters.schemaName}.${EVENT_TABLE} as event
    where
        ${eventDateSQL}
        ${eventNameClause}
  `;
}

function _buildEventNameClause(eventNames: string[], prefix: string = 'event.') {
  const eventNameInClause = `and ${prefix}event_name in ('${eventNames.join('\',\'')}')`;
  const eventNameClause = eventNames.length > 0 ? eventNameInClause : '';

  return eventNameClause;
}

function _getUserConditionPropsFromEventAndConditions(eventAndConditions: EventAndCondition[]) {
  
    let hasNestUserAttribute = false;
    let hasOuterUserAttribute = false;
    const userAttributes: ColumnAttribute[] = [];
    const userOuterAttributes: ColumnAttribute[] = [];
    for (const eventCondition of eventAndConditions) {
      if (eventCondition.sqlCondition?.conditions !== undefined) {
        const conditionProps = buildConditionProps(eventCondition.sqlCondition?.conditions);
        hasNestUserAttribute = hasNestUserAttribute || conditionProps.hasUserAttribute;
        hasOuterUserAttribute = hasOuterUserAttribute || conditionProps.hasUserOuterAttribute;
        userAttributes.push(...conditionProps.userAttributes);
        userOuterAttributes.push(...conditionProps.userOuterAttributes);
      }
    }
  
    return {
      hasNestUserAttribute,
      hasOuterUserAttribute,
      userAttributes,
      userOuterAttributes,
    };
  }

function _getUserConditionProps(sqlParameters: AttributionSQLParameters) {

  let hasNestUserAttribute = false;
  let hasOuterUserAttribute = false;
  const userAttributes: ColumnAttribute[] = [];
  if (sqlParameters.eventAndConditions) {
    const props = _getUserConditionPropsFromEventAndConditions(sqlParameters.eventAndConditions);
    hasNestUserAttribute = hasNestUserAttribute || props.hasNestUserAttribute;
    hasOuterUserAttribute = hasOuterUserAttribute || props.hasOuterUserAttribute;
    userAttributes.push(...props.userAttributes);
    userAttributes.push(...props.userOuterAttributes);
  }

  if (sqlParameters.targetEventAndCondition?.sqlCondition?.conditions) {
    const conditionProps = buildConditionProps(sqlParameters.targetEventAndCondition?.sqlCondition?.conditions);
    hasNestUserAttribute = hasNestUserAttribute || conditionProps.hasUserAttribute;
    hasOuterUserAttribute = hasOuterUserAttribute || conditionProps.hasUserOuterAttribute;
    userAttributes.push(...conditionProps.userAttributes);
    userAttributes.push(...conditionProps.userOuterAttributes);
  }

  if(sqlParameters.targetEventAndCondition?.groupColumn){
    const groupColumnProps = buildColumnConditionProps(sqlParameters.targetEventAndCondition?.groupColumn);
    hasNestUserAttribute = hasNestUserAttribute || groupColumnProps.hasUserAttribute;
    hasOuterUserAttribute = hasOuterUserAttribute || groupColumnProps.hasUserOuterAttribute;
    userAttributes.push(...groupColumnProps.userAttributes);
    userAttributes.push(...groupColumnProps.userOuterAttributes);
  }

  if (sqlParameters.globalEventCondition?.conditions) {
    const conditionProps = buildConditionProps(sqlParameters.globalEventCondition?.conditions);
    hasNestUserAttribute = hasNestUserAttribute || conditionProps.hasUserAttribute;
    hasOuterUserAttribute = hasOuterUserAttribute || conditionProps.hasUserOuterAttribute;
    userAttributes.push(...conditionProps.userAttributes);
    userAttributes.push(...conditionProps.userOuterAttributes);
  }

  return {
    hasNestUserAttribute,
    hasOuterUserAttribute,
    userAttributes,
  };
}

function _buildBaseUserDataSql(sqlParameters: AttributionSQLParameters, hasNestParams: boolean) {

  return `
    user_base as (
      ${_buildBaseUserDataTableSql(sqlParameters, hasNestParams)}
  ),
  `;
}

function _buildBaseUserDataTableSql(sqlParameters: AttributionSQLParameters, hasNestParams: boolean, suffix: string ='') {

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
      user_pseudo_id${suffix},
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
        ${sqlParameters.schemaName}.${USER_TABLE} u ${nextColSQL}
  `;
}