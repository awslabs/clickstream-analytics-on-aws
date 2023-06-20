with base as (
select 
  *
from {{database}}.{{eventTable}}
where partition_app = ? 
  and partition_year >= ?
  and partition_month >= ?
  and partition_day >= ?
),
clickstream_session_mv_1 as (
SELECT
    es.session_id 
    ,user_pseudo_id
    ,platform
    ,max(session_duration) as session_duration
    ,(case when (max(session_duration)>10000 or sum(view) >1) then 1 else 0 end) as engaged_session
    ,(case when (max(session_duration)>10000 or sum(view) >1) then 0 else 1 end) as bounced_session
    ,min(session_st) as session_start_timestamp
    ,sum(view) as session_views
    ,sum(engagement_time) as session_engagement_time
FROM
(SELECT 
        user_pseudo_id
        ,event_id
        ,platform
        ,(select 
            max(ep.value.string_value) as value
        from base e cross join unnest(event_params) as t(ep) 
        where 
            ep.key = '_session_id' and e.event_id = ods.event_id) session_id
        ,cast((select 
            max(ep.value.int_value) as value
        from base e cross join unnest(event_params) as t(ep) 
        where 
            ep.key = '_session_duration' and e.event_id = ods.event_id) as integer) session_duration
        ,cast((select 
            max(ep.value.int_value) as value
        from base e cross join unnest(event_params) as t(ep) 
        where 
            ep.key = '_session_start_timestamp' and e.event_id = ods.event_id) as bigint) session_st
        ,cast((select 
            max(ep.value.int_value) as value
        from base e cross join unnest(event_params) as t(ep) 
        where 
            ep.key = '_engagement_time_msec' and event_name = '_user_engagement' and e.event_id = ods.event_id) as integer)  as engagement_time
        ,cast((case when event_name in ('_screen_view', '_page_view') then 1 else 0 end) as integer) as view
    FROM base ods
) AS es
GROUP BY 1,2,3
),
clickstream_session_mv_2 as (
  select session_id, first_sv_event_id, last_sv_event_id, count(event_id) from (
    select 
    session_id
    , event_id
    ,first_value(event_id) over(partition by session_id order by event_timestamp asc rows between unbounded preceding and unbounded following) as first_sv_event_id,
    last_value(event_id) over(partition by session_id order by event_timestamp asc rows between unbounded preceding and unbounded following) as last_sv_event_id
        from (
            select e.event_name, e.event_id, e.event_timestamp, ep.value.string_value as session_id
            from base e cross join unnest(event_params) as t(ep) 
            where e.event_name in ('_screen_view','_page_view')
            and ep.key = '_session_id') 
  ) group by 1,2,3
  ),
  session_f_sv_view as (
    select * from clickstream_session_mv_2 as session_f_l_sv left outer join
    (select e.event_id as event_id, ep.value.string_value as first_sv_view
    from base e cross join unnest(event_params) as t(ep) 
    where ep.key in ('_screen_name','_page_title')) t on session_f_l_sv.first_sv_event_id=t.event_id
), 
session_f_l_sv_view as (
    select * from session_f_sv_view left outer join
    (select e.event_id as event_id, ep.value.string_value as last_sv_view
    from base e cross join unnest(event_params) as t(ep) 
    where ep.key in ('_screen_name','_page_title')) t on session_f_sv_view.last_sv_event_id=t.event_id
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
from clickstream_session_mv_1 as session left outer join 
session_f_l_sv_view on session.session_id = session_f_l_sv_view.session_id