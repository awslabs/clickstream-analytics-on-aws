-- recompute refresh
CREATE MATERIALIZED VIEW {{schema}}.clickstream_session_mv_1 
BACKUP NO
SORTKEY(session_id, user_pseudo_id, platform)
AUTO REFRESH YES
AS
SELECT 
    es.session_id::varchar 
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
            ep.value.string_value as value 
        from {{schema}}.ods_events e, e.event_params ep 
        where 
            ep.key = '_session_id' and e.event_id = ods.event_id) session_id
        ,(select 
            ep.value.int_value as value 
        from {{schema}}.ods_events e, e.event_params ep 
        where 
            ep.key = '_session_duration' and e.event_id = ods.event_id) session_duration
        ,(select 
            ep.value.int_value::bigint as value 
        from {{schema}}.ods_events e, e.event_params ep 
        where 
            ep.key = '_session_start_timestamp' and e.event_id = ods.event_id) session_st
        ,(select 
            ep.value.int_value as value 
        from {{schema}}.ods_events e, e.event_params ep 
        where 
            ep.key = '_engagement_time_msec' and event_name = '_user_engagement' and e.event_id = ods.event_id) as engagement_time
        ,(case when event_name in ('_screen_view', '_page_view') then 1 else 0 end) as view
    FROM {{schema}}.ods_events ods
) AS es
GROUP BY 1,2,3;

-- recompute refresh
CREATE MATERIALIZED VIEW {{schema}}.clickstream_session_mv_2 
BACKUP NO
SORTKEY(session_id, first_sv_event_id, last_sv_event_id)
AUTO REFRESH YES
AS
select session_id, first_sv_event_id, last_sv_event_id, count(event_id) from (
    select 
    session_id::varchar
    , event_id
    ,first_value(event_id) over(partition by session_id order by event_timestamp asc rows between unbounded preceding and unbounded following) as first_sv_event_id,
    last_value(event_id) over(partition by session_id order by event_timestamp asc rows between unbounded preceding and unbounded following) as last_sv_event_id
        from (
            select e.event_name, e.event_id, e.event_timestamp, ep.value.string_value as session_id
            from {{schema}}.ods_events e, e.event_params ep 
            where e.event_name in ('_screen_view','_page_view')
            and ep.key = '_session_id') 
) group by 1,2,3;


CREATE OR REPLACE VIEW {{schema}}.clickstream_session_view 
AS
with session_f_sv_view as (
    select * from {{schema}}.clickstream_session_mv_2 as session_f_l_sv left outer join
    (select e.event_id as event_id, ep.value.string_value as first_sv_view
    from {{schema}}.ods_events e, e.event_params ep
    where ep.key in ('_screen_name','_page_title')) t on session_f_l_sv.first_sv_event_id=t.event_id
), session_f_l_sv_view as (
    select * from session_f_sv_view left outer join
    (select e.event_id as event_id, ep.value.string_value as last_sv_view
    from {{schema}}.ods_events e, e.event_params ep
    where ep.key in ('_screen_name','_page_title')) t on session_f_sv_view.last_sv_event_id=t.event_id
)
select 
    CASE
      WHEN session.session_id IS NULL THEN CAST('#' AS VARCHAR)
      WHEN session.session_id = '' THEN CAST('#' AS VARCHAR)
      ELSE session.session_id END AS session_id
    ,user_pseudo_id
    ,platform
    ,session_duration::BIGINT
    ,session_views::BIGINT
    ,engaged_session::BIGINT
    ,bounced_session
    ,session_start_timestamp
    ,CASE
       WHEN session.session_engagement_time IS NULL THEN CAST(0 AS BIGINT)
       ELSE session.session_engagement_time 
    END::BIGINT AS session_engagement_time
    ,DATE_TRUNC('day', TIMESTAMP 'epoch' + session_start_timestamp/1000 * INTERVAL '1 second') as session_date
    ,DATE_TRUNC('hour', TIMESTAMP 'epoch' + session_start_timestamp/1000 * INTERVAL '1 second') as session_date_hour
    ,first_sv_view::varchar as entry_view
    ,last_sv_view::varchar as exit_view
from {{schema}}.clickstream_session_mv_1 as session left outer join 
session_f_l_sv_view on session.session_id = session_f_l_sv_view.session_id;