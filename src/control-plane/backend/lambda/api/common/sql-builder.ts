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

export interface FunnelSQLPatameters {
  schemaName: string;
  extraColumns?: string[];
  computeMethod: 'USER_CNT' | 'EVENT_CNT';
  specifyJoinColumn: boolean;
  joinColumn?: string;
  conversionIntervalType: 'CURRENT_DAY' | 'CUSTOMIZE';
  conversionIntervalInSeconds?: number;
  firstEvent: string;
  firstEventConditions: string[];
  eventsNames: string[];
  eventsNamesAlias: string[];
  timeStart: string;
  timeEnd: string;
  groupColumn: 'week' | 'day' | 'hour';
}

export function buildFunnelDataSql(sqlPatameters: FunnelSQLPatameters) : string {

  let extraColumnsSQL = '';
  if (sqlPatameters.extraColumns !== undefined) {
    for (const col of sqlPatameters.extraColumns) {
      extraColumnsSQL = extraColumnsSQL.concat(`,  ${col} \n`);
    }
  }

  let sql = `
    with base_data as (
      select 
      (
        select
          ep.value.string_value as value
        from
          app1.ods_events e,
          e.event_params ep
        where
          ep.key = '_session_id'
          and e.event_id = ods.event_id
      ) session_id
      , user_pseudo_id
      , event_id
      , event_name
      , event_timestamp::bigint
      , TO_CHAR(date_trunc('week', TIMESTAMP 'epoch' + cast(event_timestamp/1000 as bigint) * INTERVAL '1 second'), 'YYYY-MM-DD') || ' - ' || TO_CHAR(date_trunc('week', (TIMESTAMP 'epoch' + cast(event_timestamp/1000 as bigint) * INTERVAL '1 second') + INTERVAL '6 days'), 'YYYY-MM-DD') as week
      , TO_CHAR(TIMESTAMP 'epoch' + cast(event_timestamp/1000 as bigint) * INTERVAL '1 second', 'YYYY-MM-DD') as day
      , TO_CHAR(TIMESTAMP 'epoch' + cast(event_timestamp/1000 as bigint) * INTERVAL '1 second', 'YYYY-MM-DD HH24') || '00:00' as hour
      ${extraColumnsSQL}
      from ${sqlPatameters.schemaName}.ods_events ods 
      where event_date >= '${sqlPatameters.timeStart}'  and event_date <= '${sqlPatameters.timeEnd}'
    )`;

  let firstEventConditionsSQL = '';
  if (sqlPatameters.firstEventConditions !== undefined) {
    for (const condition of sqlPatameters.firstEventConditions) {
      firstEventConditionsSQL = firstEventConditionsSQL.concat(`and ${condition} \n`);
    }
  }

  sql = sql.concat(`,
    table_1 as (
      select * from base_data 
      where event_name = '${sqlPatameters.firstEvent}'
      ${firstEventConditionsSQL}
    )`,
  );

  let order = 2;
  for (const event of sqlPatameters.eventsNames) {
    sql = sql.concat(`,
    table_${order} as (
      select * from base_data 
      where event_name = '${event}'
    )`);
    order += 1;
  }

  let joinConditionSQL = '';
  let joinColumnsSQL = '';

  for (const [index, _item] of sqlPatameters.eventsNames.entries()) {
    joinColumnsSQL = joinColumnsSQL.concat(`, table_${index+2}.event_id as event_id_${index+2} \n`);
    joinColumnsSQL = joinColumnsSQL.concat(`, table_${index+2}.user_pseudo_id as user_pseudo_id_${index+2} \n`);
    joinColumnsSQL = joinColumnsSQL.concat(`, table_${index+2}.event_timestamp as event_timestamp_${index+2} \n`);

    let joinCondition = 'on 1 = 1';
    if ( sqlPatameters.specifyJoinColumn) {
      joinCondition = `on table_${index+1}.${sqlPatameters.joinColumn} = table_${index+2}.${sqlPatameters.joinColumn}`;
    }

    if (sqlPatameters.conversionIntervalType == 'CUSTOMIZE') {
      joinConditionSQL = joinConditionSQL.concat(`left outer join table_${index+2} ${joinCondition} and table_${index+2}.event_timestamp - table_${index+1}.event_timestamp > 0 and table_${index+2}.event_timestamp - table_${index+1}.event_timestamp < ${sqlPatameters.conversionIntervalInSeconds}*1000 \n`);
    } else {
      joinConditionSQL = joinConditionSQL.concat(`left outer join table_${index+2} ${joinCondition} and TO_CHAR(TIMESTAMP 'epoch' + cast(table_${index+1}.event_timestamp/1000 as bigint) * INTERVAL '1 second', 'YYYY-MM-DD') = TO_CHAR(TIMESTAMP 'epoch' + cast(table_${index+2}.event_timestamp/1000 as bigint) * INTERVAL '1 second', 'YYYY-MM-DD')  \n`);
    }
  }

  sql = sql.concat(`,
    join_table as (
      select table_1.*
        ${joinColumnsSQL}
      from table_1 
        ${joinConditionSQL}
    )`,
  );

  let finalTableColumnsSQL = `
     week
    ,day
    ,hour
    ,event_id as e_id_1
    ,user_pseudo_id as u_id_1
  `;

  let finalTableGroupBySQL = `
     week
    ,day
    ,hour
    ,event_id
    ,user_pseudo_id
  `;


  let prefix = 'e';
  if (sqlPatameters.computeMethod === 'USER_CNT') {
    prefix = 'u';
  }
  let resultCntSQL = `, count(distinct ${prefix}_id_1) as ${sqlPatameters.firstEvent} \n`;

  for (const [index, _item] of sqlPatameters.eventsNames.entries()) {
    resultCntSQL = resultCntSQL.concat(`, count(distinct ${prefix}_id_${index+2})  as ${sqlPatameters.eventsNames[index]} \n`);

    finalTableColumnsSQL = finalTableColumnsSQL.concat(`, event_id_${index+2} as e_id_${index+2} \n`);
    finalTableColumnsSQL = finalTableColumnsSQL.concat(`, user_pseudo_id_${index+2} as u_id_${index+2} \n`);

    finalTableGroupBySQL = finalTableGroupBySQL.concat(`, event_id_${index+2} \n`);
    finalTableGroupBySQL = finalTableGroupBySQL.concat(`, user_pseudo_id_${index+2} \n`);
  }

  sql = sql.concat(`,
    final_table as (
      select 
      ${finalTableColumnsSQL}
      from join_table 
      group by
      ${finalTableGroupBySQL}
    )
  `);

  sql = sql.concat(`
    select 
      ${sqlPatameters.groupColumn}
      ${resultCntSQL}
    from final_table
    group by 
      ${sqlPatameters.groupColumn}
  `);

  return format(sql, {
    language: 'postgresql',
  });
};


