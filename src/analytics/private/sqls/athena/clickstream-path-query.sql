with base as (
  select 
    *
  from {{database}}.{{eventTable}}
  where partition_app = ? 
    and partition_year >= ?
    and partition_month >= ?
    and partition_day >= ?
),
event_data as (
  select 
    user_pseudo_id
    ,event_date
    ,event_id
    ,event_name
    ,event_timestamp
    ,platform
    ,(select 
        ep.value.string_value as value 
      from base cross join unnest(event_params) as t(ep) 
      where 
        ep.key = '_session_id' and event_id = ods.event_id
      ) session_id
    ,(select 
        ep.value.string_value as screen_name 
      from base cross join unnest(event_params) as t(ep) 
      where ep.key = '_screen_name' and event_name = '_screen_view' and event_id = ods.event_id
      ) as current_screen
    from base ods 
), 
ranked_events as (
  select 
    *,
    DENSE_RANK() OVER (PARTITION BY user_pseudo_id, session_id ORDER BY event_timestamp ASC) event_rank,
    LAG(event_name,1) OVER (PARTITION BY user_pseudo_id, session_id ORDER BY event_timestamp ASC) previous_event,
    LEAD(event_name,1) OVER (PARTITION BY user_pseudo_id, session_id ORDER BY event_timestamp ASC) next_event,
    LAG(current_screen,1) OVER (PARTITION BY user_pseudo_id, session_id ORDER BY event_timestamp ASC) previous_screen,
    LEAD(current_screen,1) OVER (PARTITION BY  user_pseudo_id, session_id ORDER BY event_timestamp ASC)  next_screen
  FROM event_data
) 
select * from ranked_events