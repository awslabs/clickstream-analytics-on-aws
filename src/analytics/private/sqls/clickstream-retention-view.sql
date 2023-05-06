CREATE OR REPLACE VIEW {{schema}}.clickstream_retention_view AS 
  with first_action as (
    SELECT 
      user_pseudo_id,
      Date(date_trunc('day', TIMESTAMP 'epoch' + min(event_timestamp)/1000 * INTERVAL '1 second')) as day_cohort
    FROM {{schema}}.{{table_ods_events}}
    WHERE event_name='_session_start'
    GROUP by user_pseudo_id
  ), 
  return_action as (
    SELECT 
      user_pseudo_id,
      Date(date_trunc('day', TIMESTAMP 'epoch' + event_timestamp/1000 * INTERVAL '1 second')) as return_day
    FROM {{schema}}.{{table_ods_events}}
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
  ORDER by day_cohort