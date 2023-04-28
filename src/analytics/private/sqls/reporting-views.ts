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

export const dailyActiveUserView = `
  CREATE OR REPLACE VIEW ####.clickstream_daily_active_user_view AS 
  SELECT 
    event_date, 
    DATE(DATE_TRUNC('day', TIMESTAMP 'epoch' + event_timestamp/1000 * INTERVAL '1 second')) AS event_create_day, 
    user_pseudo_id, 
    geo.country::varchar AS country, 
    device.mobile_brand_name::varchar AS mobile_brand, 
    device.language as language, 
    case when max(case when event_name = '_first_open' then 1 else 0 end) = 1 then 'new_user' else 'existing_user' end as user_type
  FROM ####.ods_events
  GROUP by event_date, event_create_day, user_pseudo_id, country, mobile_brand, language
  ;
`;

export const odsFlattenedView = `
  CREATE OR REPLACE VIEW ####.clickstream_ods_flattened_view AS
  SELECT 
    e.event_date as event_date,
    e.event_name as event_name,
    e.event_id as event_id,
    e.event_bundle_sequence_id as event_bundle_sequence_id,
    event_params.key,
    event_params.value.double_value::DOUBLE PRECISION,
    event_params.value.float_value::DOUBLE PRECISION,
    event_params.value.int_value::int,
    event_params.value.string_value::varchar,
    e.event_previous_timestamp as event_previous_timestamp,
    e.event_server_timestamp_offset as event_server_timestamp_offset,
    e.event_timestamp as event_timestamp,
    e.ingest_timestamp as ingest_timestamp,
    e.event_value_in_usd as event_value_in_usd,
    e.app_info.app_id as app_info_app_id ,
    e.app_info.version as app_info_version,
    e.device.browser as device_browser,
    e.device.browser_version as device_browser_version,
    e.device.language as device_language ,
    e.device.mobile_brand_name as device_mobile_brand_name,
    e.device.mobile_model_name as device_mobile_model_name,
    e.device.operating_system as device_operating_system,
    e.device.time_zone_offset_seconds as device_time_zone_offset_seconds,
    e.device.web_info as device_web_info,
    e.geo.continent as geo_continent,
    e.geo.country as geo_country,
    e.geo.city as geo_city,
    e.platform as platform,
    e.project_id as project_id,
    e.traffic_source.name as traffic_source_name,
    e.traffic_source.meidum as traffic_source_meidum,
    e.traffic_source.source as traffic_source_source,
    e.user_first_touch_timestamp as user_first_touch_timestamp,
    e.user_id as user_id,
    e.user_ltv as user_ltv,
    e.user_pseudo_id as user_pseudo_id
  FROM ####.ods_events e, e.event_params as event_params;
`;

export const dauWauiew = `
  CREATE OR REPLACE VIEW ####.clickstream_dau_wau_view AS 
  with daily_active_user_num as (
    SELECT 
      DATE(DATE_TRUNC('day', TIMESTAMP 'epoch' + event_timestamp/1000 * INTERVAL '1 second')) AS event_create_day,
      count(distinct user_pseudo_id) as active_user_num 
    FROM ####.ods_events
    GROUP by 1
    ORDER by 1 DESC
  ),
  active_user_num_last_7_days as (
    SELECT 
      event_create_day,
      active_user_num as today_active_user_num,
      sum(active_user_num) over (order by event_create_day rows BETWEEN 6 PRECEDING AND CURRENT ROW) as active_user_numer_last_7_days
    FROM daily_active_user_num 
  )
  SELECT * FROM active_user_num_last_7_days;
`;

export const sessionView = `
  CREATE OR REPLACE VIEW ####.clickstream_session_view AS 
  with session_d as ( 
    SELECT 
      e.event_id,
      DATE(DATE_TRUNC('day', TIMESTAMP 'epoch' + event_timestamp/1000 * INTERVAL '1 second')) AS event_create_day,
      params.key, 
      params.value.int_value::int as session_duration
    FROM ####.ods_events e, e.event_params as params 
    WHERE params.key = '_session_duration'
  ),
  session_i as (
    SELECT 
      s.event_id, 
      s.user_pseudo_id,
      params.value.string_value as session_id 
    FROM ####.ods_events s, s.event_params as params WHERE params.key = '_session_id'
  ), 
  session as (
    SELECT 
      session_d.event_create_day,
      max(session_d.session_duration) as session_duration,
      session_i.session_id,
      case when max(case when session_d.session_duration > 10000 then 1 else 0 end) = 1 then 'engaged' else 'not_engaged' end as session_type
    FROM 
      session_d, 
      session_i 
    WHERE session_d.event_id = session_i.event_id 
    GROUP by session_i.session_id,session_d.event_create_day
  )
  SELECT 
    session.event_create_day, 
    count(distinct session_id) as total_session_num, 
    count(distinct case when session_type='engaged' then session_id else null end) engaged_session_num, 
    round(1.0*avg(session_duration)/1000/60,1) as avg_session_duration_min,
    clickstream_dau_wau_view.today_active_user_num,
    round((1.0*engaged_session_num)/clickstream_dau_wau_view.today_active_user_num,1) as engaged_session_num__per_user,
    round(100.00*engaged_session_num/total_session_num,2) as engaged_rate_percentage
  FROM session, ####.clickstream_dau_wau_view as clickstream_dau_wau_view
  WHERE session.event_create_day = clickstream_dau_wau_view.event_create_day
  GROUP by session.event_create_day,clickstream_dau_wau_view.today_active_user_num;
`;

export const retentionView = `
  CREATE OR REPLACE VIEW ####.clickstream_retention_view AS 
  with first_action as (
    SELECT 
      user_pseudo_id,
      Date(date_trunc('day', TIMESTAMP 'epoch' + min(event_timestamp)/1000 * INTERVAL '1 second')) as day_cohort
    FROM ####.ods_events
    WHERE event_name='_session_start'
    GROUP by user_pseudo_id
  ), 
  return_action as (
    SELECT 
      user_pseudo_id,
      Date(date_trunc('day', TIMESTAMP 'epoch' + event_timestamp/1000 * INTERVAL '1 second')) as return_day
    FROM ####.ods_events
    WHERE event_name='_session_start'
  ), 
  retention as (
    SELECT 
      day_cohort, 
      null as next_period, 
      count(distinct user_pseudo_id) as users_num 
    FROM first_action 
    GROUP by 1
    union all
    SELECT 
      first_action.day_cohort, 
      DATEDIFF(day, first_action.day_cohort, return_action.return_day), 
      count(distinct return_action.user_pseudo_id) as users_num
    FROM first_action join return_action on first_action.user_pseudo_id = return_action.user_pseudo_id 
    GROUP by 1, 2
    ORDER by 1, 2
  ) 
  SELECT 
    day_cohort,
    max(case when next_period = 0 then users_num else 0 end) total_user_num,
    max(case when next_period = 1 then users_num else 0 end) day_1,
    max(case when next_period = 2 then users_num else 0 end) day_2,
    max(case when next_period = 3 then users_num else 0 end) day_3,
    max(case when next_period = 4 then users_num else 0 end) day_4,
    max(case when next_period = 5 then users_num else 0 end) day_5,
    max(case when next_period = 6 then users_num else 0 end) day_6,
    max(case when next_period = 7 then users_num else 0 end) day_7,
    max(case when next_period = 8 then users_num else 0 end) day_8,
    max(case when next_period = 9 then users_num else 0 end) day_9,
    max(case when next_period = 10 then users_num else 0 end) day_10,
    max(case when next_period = 11 then users_num else 0 end) day_11
  FROM retention 
  GROUP by day_cohort 
  ORDER by day_cohort;
`;

// keep view order due to dependency between them.
export const ReportViews: string[] = [
  dailyActiveUserView,
  odsFlattenedView,
  dauWauiew,
  sessionView,
  retentionView,
];