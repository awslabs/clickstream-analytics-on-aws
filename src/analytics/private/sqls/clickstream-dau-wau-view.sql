CREATE OR REPLACE VIEW {{schema}}.clickstream_dau_wau_view AS 
  with daily_active_user_num as (
    SELECT 
      DATE(DATE_TRUNC('day', TIMESTAMP 'epoch' + event_timestamp/1000 * INTERVAL '1 second')) AS event_create_day,
      count(distinct user_pseudo_id) as active_user_num 
    FROM {{schema}}.{{table_ods_events}}
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
  SELECT * FROM active_user_num_last_7_days