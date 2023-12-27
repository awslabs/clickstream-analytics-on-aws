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
import { AttributionSQLParameters, BaseSQLParameters, ColumnAttribute, EVENT_TABLE, EventAndCondition, EventNonNestColProps, USER_TABLE, buildCommonColumnsSql, buildCommonConditionSql, buildConditionProps, buildEventConditionPropsFromEvents, buildEventDateSql, buildEventJoinTable, buildEventsNameFromConditions, buildNecessaryEventColumnsSql, buildUserJoinTable } from './sql-builder';

export function buildSQLForLastTouchModel(params: AttributionSQLParameters): string {

  const eventNames = buildEventsNameFromConditions(params.eventAndConditions as EventAndCondition[]);
  let sql = '';

  sql = buildCommonSqlForAttribution(eventNames.concat(params.targetEventAndCondition.eventName), params);

  return format(sql, {
    language: 'postgresql',
  });
}

export function buildCommonSqlForAttribution(eventNames: string[], params: AttributionSQLParameters) : string {

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

function _getUserConditionProps(sqlParameters: AttributionSQLParameters) {

  let hasNestUserAttribute = false;
  let hasOuterUserAttribute = false;
  const userAttributes: ColumnAttribute[] = [];
  if (sqlParameters.eventAndConditions) {
    for (const eventCondition of sqlParameters.eventAndConditions) {
      if (eventCondition.sqlCondition?.conditions !== undefined) {
        const conditionProps = buildConditionProps(eventCondition.sqlCondition?.conditions);
        hasNestUserAttribute = hasNestUserAttribute || conditionProps.hasUserAttribute;
        hasOuterUserAttribute = hasOuterUserAttribute || conditionProps.hasUserOuterAttribute;
        userAttributes.push(...conditionProps.userAttributes);
        userAttributes.push(...conditionProps.userOuterAttributes);
      }
    }
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

// function _getAllConditionSql(eventNames: string[], sqlParameters: AttributionSQLParameters) : string {

//   let eventNameAndSQLConditions: EventNameAndConditionsSQL[] = [];
//   fillEventNameAndSQLConditions(eventNames, sqlParameters, eventNameAndSQLConditions, false);

//   let allConditionSql = '';
//   for (const [index, eventNameAndSQLCondition] of eventNameAndSQLConditions.entries()) {
//     let conditionSql = eventNameAndSQLCondition.conditionSql;
//     if (conditionSql !== '') {
//       conditionSql = `and (${conditionSql}) `;
//     }

//     allConditionSql = allConditionSql.concat(`
//       ${index === 0? '' : 'or' } (event_name = '${eventNameAndSQLCondition.eventName}' ${conditionSql} )
//     `);
//   }

//   if (allConditionSql !== '' ) {
//     allConditionSql = allConditionSql + ` or (event_name not in ('${eventNames.join('\',\'')}'))`;
//   }

//   return allConditionSql !== '' ? `and (${allConditionSql})` : '';
// }