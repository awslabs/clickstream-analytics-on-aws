-- run following command to load latest partition
-- msck repair table {{database}}.{{eventTable}};
-- msck repair table {{database}}.{{eventParamTable}};

with temp_1 as (
  select 
    event.event_id,
    event.event_name,
    event.event_date,
    event.platform,
    event.user_id,
    event.user_pseudo_id,
    event.event_timestamp,
    event_parameter.event_param_key,
    event_parameter.event_param_double_value,
    event_parameter.event_param_float_value,
    event_parameter.event_param_int_value,
    event_parameter.event_param_string_value
  from {{database}}.{{eventTable}} as event
  join {{database}}.{{eventParamTable}} as event_parameter 
  on event.event_timestamp = event_parameter.event_timestamp and event.event_id = event_parameter.event_id
  where event.partition_app = ? 
  and event.partition_year >= ?
  and event.partition_month >= ?
  and event.partition_day >= ?
),
temp_2 as 
(
  SELECT 
     user_pseudo_id
    ,event_id
    ,platform
    ,max(case when event_param_key = '_session_id' then event_param_string_value else null end) as session_id
    ,max(case when event_param_key = '_session_duration' then event_param_int_value else null end) as session_duration
    ,max(case when event_param_key = '_session_start_timestamp' then event_param_int_value else null end) as session_st
    ,max(case when event_param_key = '_engagement_time_msec' then event_param_int_value else null end) as engagement_time
    ,(case when max(event_name) in ('_screen_view', '_page_view') then 1 else 0 end) as view
  FROM temp_1
  group by 1,2,3
),
temp_3 as (
  select 
     event_name
    ,event_id
    ,event_timestamp
    ,max(case when event_param_key = '_session_id' then event_param_string_value else null end) as session_id
    ,(case when max(event_name) in ('_screen_view', '_page_view') then 1 else 0 end) as view
    from temp_1 where event_name in ('_screen_view','_page_view')
    group by 1,2,3
),
session_part_1 as (
  SELECT
     session_id 
    ,user_pseudo_id
    ,platform
    ,max(session_duration) as session_duration
    ,(case when (max(session_duration)>10000 or sum(view) >1) then 1 else 0 end) as engaged_session
    ,(case when (max(session_duration)>10000 or sum(view) >1) then 0 else 1 end) as bounced_session
    ,min(session_st) as session_start_timestamp
    ,sum(view) as session_views
    ,sum(engagement_time) as session_engagement_time
  FROM temp_2
  GROUP BY 1,2,3
),
session_part_2 as (
  select session_id, first_sv_event_id, last_sv_event_id, count(event_id) from (
    select 
      session_id
      ,event_id
      ,first_value(event_id) over(partition by session_id order by event_timestamp asc rows between unbounded preceding and unbounded following) as first_sv_event_id,
      last_value(event_id) over(partition by session_id order by event_timestamp asc rows between unbounded preceding and unbounded following) as last_sv_event_id
    from temp_3 
  ) group by 1,2,3
  ),
  session_f_sv_view as (
    select 
      session_f_l_sv.*,
      t.view as first_sv_view
    from session_part_2 as session_f_l_sv left outer join
    temp_3 as t on session_f_l_sv.first_sv_event_id=t.event_id
), 
session_f_l_sv_view as (
    select 
      session_f_sv_view.*,
      t.view as last_sv_view
    from session_f_sv_view left outer join
    temp_3 as t on session_f_sv_view.last_sv_event_id=t.event_id
)
select 
    CASE
      WHEN session.session_id IS NULL THEN CAST('#' AS VARCHAR)
      WHEN session.session_id = '' THEN CAST('#' AS VARCHAR)
      ELSE session.session_id 
    END AS session_id
    ,user_pseudo_id
    ,platform
    ,cast(session_duration as bigint) as session_duration
    ,cast(session_views as bigint) as session_duration
    ,engaged_session
    ,bounced_session
    ,session_start_timestamp
    ,session_engagement_time
    ,CASE
       WHEN session.session_engagement_time IS NULL THEN CAST(0 AS BIGINT)
       ELSE session.session_engagement_time 
     END AS session_engagement_time
    ,DATE_TRUNC('day', from_unixtime(session_start_timestamp/1000)) as session_date
    ,DATE_TRUNC('hour', from_unixtime(session_start_timestamp/1000)) as session_date_hour
    ,first_sv_view as entry_view
    ,last_sv_view as exit_view
from session_part_1 as session left outer join 
session_f_l_sv_view on session.session_id = session_f_l_sv_view.session_id