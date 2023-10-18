-- recompute refresh
CREATE OR REPLACE VIEW {{schema}}.clickstream_session_mv_1 
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
        ,max(case when event_param_key = '_session_id' then event_param_string_value else null end) as session_id
        ,max(case when event_param_key = '_session_duration' then event_param_string_value else null end) as session_duration
        ,max(case when event_param_key = '_session_start_timestamp' then event_param_string_value else null end) as session_st
        ,max(case when event_param_key = '_engagement_time_msec' then event_param_string_value else null end) as engagement_time
        ,(case when max(event_name) in ('_screen_view', '_page_view') then 1 else 0 end) as view
    FROM {{schema}}.clickstream_event_parameter_view
    group by 1,2,3
) AS es GROUP BY 1,2,3;