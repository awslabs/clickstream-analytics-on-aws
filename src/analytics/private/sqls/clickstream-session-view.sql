CREATE OR REPLACE VIEW {{schema}}.clickstream_session_view AS 
  with session_d as ( 
    SELECT 
      e.event_id,
      DATE(DATE_TRUNC('day', TIMESTAMP 'epoch' + event_timestamp/1000 * INTERVAL '1 second')) AS event_create_day,
      params.key, 
      params.value.int_value::int as session_duration
    FROM {{schema}}.{{table_ods_events}} e, e.event_params as params 
    WHERE params.key = '_session_duration'
  ),
  session_i as (
    SELECT 
      s.event_id, 
      s.user_pseudo_id,
      params.value.string_value as session_id 
    FROM {{schema}}.{{table_ods_events}} s, s.event_params as params WHERE params.key = '_session_id'
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
  FROM session, {{schema}}.clickstream_dau_wau_view as clickstream_dau_wau_view
  WHERE session.event_create_day = clickstream_dau_wau_view.event_create_day
  GROUP by session.event_create_day,clickstream_dau_wau_view.today_active_user_num