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

export interface Condition {
  readonly category: 'user' | 'event' | 'device' | 'geo' | 'app_info' | 'traffic_source' | 'other';
  readonly property: string;
  readonly operator: string;
  readonly value: string;
  readonly dataType: 'STRING' | 'INT' | 'DOUBLE' | 'FLOAT';
}

export interface EventAndCondition {
  readonly eventName: string;
  readonly condations?: Condition[];
  readonly condationsOprerator?: 'and' | 'or' ;
}

export interface FunnelSQLPatameters {
  readonly schemaName: string;
  readonly computeMethod: 'USER_CNT' | 'EVENT_CNT';
  readonly specifyJoinColumn: boolean;
  readonly joinColumn?: string;
  readonly conversionIntervalType: 'CURRENT_DAY' | 'CUSTOMIZE';
  readonly conversionIntervalInSeconds?: number;
  readonly firstEventExtraCondition?: EventAndCondition;
  readonly eventAndConditions: EventAndCondition[];
  readonly timeScopeType: 'FIXED' | 'RELATIVE';
  readonly timeStart?: string;
  readonly timeEnd?: string;
  readonly lastN?: number;
  readonly timeUnit?: 'DAY' | 'WEEK' | 'MONTH';
  readonly groupColumn: 'week' | 'day' | 'hour';
}

function _buildFunnelbaseSql(eventNames: string[], sqlPatameters: FunnelSQLPatameters) : string {

  const baseColumns = `
    ,event_date
    ,event_name
    ,event_id
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
    ,user_id
    ,user_pseudo_id
    ,user_ltv
    ,event_dimensions
    ,ecommerce
    ,items
  `;

  const columnTemplate = `
     event_date as event_date####
    ,event_name as event_name####
    ,event_id as event_id####
    ,event_bundle_sequence_id as event_bundle_sequence_id####
    ,event_previous_timestamp as event_previous_timestamp####
    ,event_server_timestamp_offset as event_server_timestamp_offset####
    ,event_timestamp as event_timestamp####
    ,ingest_timestamp as ingest_timestamp####
    ,event_value_in_usd as event_value_in_usd####
    ,app_info_app_id as app_info_app_id####
    ,app_info_package_id as app_info_package_id####
    ,app_info_install_source as app_info_install_source####
    ,app_info_version as app_info_version####
    ,device_id as device_id####
    ,device_mobile_brand_name as device_mobile_brand_name####
    ,device_mobile_model_name as device_mobile_model_name####
    ,device_manufacturer as device_manufacturer####
    ,device_screen_width as device_screen_width####
    ,device_screen_height as device_screen_height####
    ,device_carrier as device_carrier####
    ,device_network_type as device_network_type####
    ,device_operating_system as device_operating_system####
    ,device_operating_system_version as device_operating_system_version####
    ,device_ua_browser as ua_browser####
    ,device_ua_browser_version as ua_browser_version####
    ,device_ua_os as ua_os####
    ,device_ua_os_version as ua_os_version####
    ,device_ua_device as ua_device####
    ,device_ua_device_category as ua_device_category####
    ,device_system_language as device_system_language####
    ,device_time_zone_offset_seconds as device_time_zone_offset_seconds####
    ,device_advertising_id as advertising_id####
    ,geo_continent as geo_continent####
    ,geo_country as geo_country####
    ,geo_city as geo_city####
    ,geo_metro as geo_metro####
    ,geo_region as geo_region####
    ,geo_sub_continent as geo_sub_continent####
    ,geo_locale as geo_locale####
    ,platform as platform####
    ,project_id as project_id####
    ,traffic_source_name as traffic_source_name####
    ,traffic_source_medium as traffic_source_medium####
    ,traffic_source_source as traffic_source_source####
    ,user_first_touch_timestamp as user_first_touch_timestamp####
    ,user_id as user_id####
    ,user_pseudo_id as user_pseudo_id####
    ,user_ltv as user_ltv####
    ,event_dimensions as event_dimensions####
    ,ecommerce as ecommerce####
    ,items as items####
  `;

  

  let sql = `
    with base_data as (
      select 
        TO_CHAR(date_trunc('week', TIMESTAMP 'epoch' + cast(event_timestamp/1000 as bigint) * INTERVAL '1 second'), 'YYYY-MM-DD') || ' - ' || TO_CHAR(date_trunc('week', (TIMESTAMP 'epoch' + cast(event_timestamp/1000 as bigint) * INTERVAL '1 second') + INTERVAL '6 days'), 'YYYY-MM-DD') as week
      , TO_CHAR(TIMESTAMP 'epoch' + cast(event_timestamp/1000 as bigint) * INTERVAL '1 second', 'YYYY-MM-DD') as day
      , TO_CHAR(TIMESTAMP 'epoch' + cast(event_timestamp/1000 as bigint) * INTERVAL '1 second', 'YYYY-MM-DD HH24') || '00:00' as hour
      , event_params
      , user_properties
      ${baseColumns}
      from ${sqlPatameters.schemaName}.ods_events ods 
      where event_date >= '${sqlPatameters.timeStart}'  and event_date <= '${sqlPatameters.timeEnd}'
      and event_name in (${ '\'' + eventNames.join('\',\'') + '\''})
    ),
  `;

  for (const [index, event] of eventNames.entries()) {

    const eventCondition = sqlPatameters.eventAndConditions[index];
    let eventConditionSql = '';
    if (eventCondition.condations !== undefined) {
      for (const condition of eventCondition.condations) {
        if (condition.category === 'user' || condition.category === 'event') {
          continue;
        }
        let value = condition.value;
        if (condition.dataType === 'STRING') {
          value = `'${value}'`;
        }

        let category: string = `${condition.category}_`;
        if (condition.category === 'other') {
          category = '';
        }
        eventConditionSql = eventConditionSql.concat(`
          ${eventCondition.condationsOprerator ?? 'and'} ${category}${condition.property} ${condition.operator} ${value}
        `);
      }
    }
    if (eventConditionSql !== '') {
      eventConditionSql = `
      and ( 1=1 ${eventConditionSql} )
      `;
    }

    let firstEventConditionSQL = '';
    let firstTableColumns = `
       week
      ,day
      ,hour
      ,${columnTemplate.replace(/####/g, '_0')}
    `;
    if ( index === 0 && sqlPatameters.firstEventExtraCondition !== undefined
      && sqlPatameters.firstEventExtraCondition.condations !== undefined ) {

      for (const condition of sqlPatameters.firstEventExtraCondition.condations) {
        let value = condition.value;
        if (condition.dataType === 'STRING') {
          value = `'${value}'`;
        }
        let prefix = 'event';
        if (condition.category === 'user') {
          prefix= 'user';
        }
        firstEventConditionSQL = firstEventConditionSQL.concat(`
          and ${prefix}_${condition.property} ${condition.operator} ${value}
        `);

        let valueType = '';
        if (condition.dataType === 'STRING') {
          valueType = 'string_value';
        } else if (condition.dataType === 'INT') {
          valueType = 'int_value';
        } else if (condition.dataType === 'FLOAT') {
          valueType = 'float_value';
        } else if (condition.dataType === 'DOUBLE') {
          valueType = 'double_value';
        }

        if (condition.category == 'user') {
          firstTableColumns += `, (
            select
              up.value.${valueType}
            from
              base_data e,
              e.user_properties up
            where
              up.key = '${condition.property}'
              and e.event_id = base.event_id
            limit 1
          ) as ${prefix}_${condition.property}`;

        } else if (condition.category == 'event') {
          firstTableColumns += `, (
            select
              ep.value.${valueType}
            from
              base_data e,
              e.event_params ep
            where
              ep.key = '${condition.property}'
              and e.event_id = base.event_id
            limit 1
          ) as ${prefix}_${condition.property}`;
        }

      }
    }
    if (firstEventConditionSQL !== '') {
      firstEventConditionSQL = `
      and ( 1=1 ${firstEventConditionSQL} )
      `;
    }

    sql = sql.concat(`
    table_${index} as (
      select 
        ${ index === 0 ? firstTableColumns : columnTemplate.replace(/####/g, `_${index}`)}
      from base_data base
      where event_name = '${event}'
      ${eventConditionSql}
      ${firstEventConditionSQL}
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

    let joinCondition = 'on 1 = 1';
    if ( sqlPatameters.specifyJoinColumn) {
      joinCondition = `on table_${index-1}.${sqlPatameters.joinColumn}_${index-1} = table_${index}.${sqlPatameters.joinColumn}_${index}`;
    }

    if (sqlPatameters.conversionIntervalType == 'CUSTOMIZE') {
      joinConditionSQL = joinConditionSQL.concat(`left outer join table_${index} ${joinCondition} and table_${index}.event_timestamp_${index} - table_${index-1}.event_timestamp_${index-1} > 0 and table_${index}.event_timestamp_${index} - table_${index-1}.event_timestamp_${index-1} < ${sqlPatameters.conversionIntervalInSeconds}*1000 \n`);
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

  let finalTableColumnsSQL = `
     week
    ,day
    ,hour
  `;

  let finalTableGroupBySQL = `
     week
    ,day
    ,hour
  `;

  for (const [index, _item] of eventNames.entries()) {
    finalTableColumnsSQL = finalTableColumnsSQL.concat(`, event_id_${index} as e_id_${index} \n`);
    finalTableColumnsSQL = finalTableColumnsSQL.concat(`, event_name_${index} as e_name_${index} \n`);
    finalTableColumnsSQL = finalTableColumnsSQL.concat(`, user_pseudo_id_${index} as u_id_${index} \n`);

    finalTableGroupBySQL = finalTableGroupBySQL.concat(`, event_id_${index} \n`);
    finalTableGroupBySQL = finalTableGroupBySQL.concat(`, event_name_${index} \n`);
    finalTableGroupBySQL = finalTableGroupBySQL.concat(`, user_pseudo_id_${index} \n`);
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

  return sql;
};

export function buildFunnelDataSql(sqlPatameters: FunnelSQLPatameters) : string {

  let eventNames: string[] = [];
  for (const e of sqlPatameters.eventAndConditions) {
    eventNames.push(e.eventName);
  }

  let sql = _buildFunnelbaseSql(eventNames, sqlPatameters);

  let prefix = 'e';
  if (sqlPatameters.computeMethod === 'USER_CNT') {
    prefix = 'u';
  }
  let resultCntSQL ='';

  for (const [index, _item] of eventNames.entries()) {
    resultCntSQL = resultCntSQL.concat(`, count(distinct ${prefix}_id_${index})  as ${eventNames[index]} \n`);
  }

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

export function buildFunnelView(schema: string, name: string, sqlPatameters: FunnelSQLPatameters) : string {

  let resultSql = ''
  let eventNames: string[] = [];
  let index = 0
  let prefix = 'e';
  if (sqlPatameters.computeMethod === 'USER_CNT') {
    prefix = 'u';
  }

  for (const e of sqlPatameters.eventAndConditions) {
    eventNames.push(e.eventName);
    resultSql = resultSql.concat(`
    ${ index === 0 ? '' : 'union all'}
    select 
       day::date as event_date
      ,e_name_${index}::varchar as event_name
      ,${prefix}_id_${index}::varchar as x_id
    from final_table where ${prefix}_id_${index} is not null
    `)
  }

  let sql = `CREATE OR REPLACE VIEW ${schema}.${name} AS
   ${_buildFunnelbaseSql(eventNames, sqlPatameters)}
   ${resultSql}
   with no schema binding
   `
   return format(sql, {
    language: 'postgresql',
  });
}

