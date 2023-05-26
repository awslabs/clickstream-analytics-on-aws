CREATE MATERIALIZED VIEW {{schema}}clickstream_path_mv 
BACKUP NO
SORTKEY(event_date)
AUTO REFRESH YES
AS
with event_data as (
select 
    user_pseudo_id
    ,event_date
    ,event_id
    ,event_name
    ,event_timestamp
    ,platform
    ,(select 
        ep.value.string_value as value 
    from {{schema}}ods_events e, e.event_params ep 
    where 
        ep.key = '_session_id' and e.event_id = ods.event_id)::varchar session_id
    ,(select 
            ep.value.string_value::varchar as screen_name 
        from {{schema}}ods_events e, e.event_params ep 
        where 
            ep.key = '_screen_name' and event_name = '_screen_view' and e.event_id = ods.event_id) as current_screen
from {{schema}}ods_events ods), ranked_events as ( select 
    *,
    DENSE_RANK() OVER (PARTITION BY user_pseudo_id, session_id ORDER BY event_timestamp ASC) event_rank,
    LAG(event_name,1) OVER (PARTITION BY user_pseudo_id, session_id ORDER BY event_timestamp ASC) previous_event,
    LEAD(event_name,1) OVER (PARTITION BY user_pseudo_id, session_id ORDER BY event_timestamp ASC) next_event,
    LAG(current_screen,1) OVER (PARTITION BY user_pseudo_id, session_id ORDER BY event_timestamp ASC) previous_screen,
    LEAD(current_screen,1) OVER (PARTITION BY  user_pseudo_id, session_id ORDER BY event_timestamp ASC)  next_screen
  FROM event_data) select * from ranked_events