-- recompute refresh
CREATE MATERIALIZED VIEW {{schema}}.clickstream_session_mv_2 
BACKUP NO
SORTKEY(session_id, first_sv_event_id, last_sv_event_id)
AUTO REFRESH YES
AS
select session_id, first_sv_event_id, last_sv_event_id, count(event_id) from (
    select 
      session_id::varchar
      ,event_id
      ,first_value(event_id) over(partition by session_id order by event_timestamp asc rows between unbounded preceding and unbounded following) as first_sv_event_id
      ,last_value(event_id) over(partition by session_id order by event_timestamp asc rows between unbounded preceding and unbounded following) as last_sv_event_id
        from (
          select 
            event_name
            ,event_id
            ,event_timestamp
            ,max(case when event_param_key = '_session_id' then event_param_string_value else null end) as session_id
          from {{schema}}.clickstream_event_parameter_view where event_name in ('_screen_view','_page_view')
          group by 1,2,3
        ) 
) group by 1,2,3;