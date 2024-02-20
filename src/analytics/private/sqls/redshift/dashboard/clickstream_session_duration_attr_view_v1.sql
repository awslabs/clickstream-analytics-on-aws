CREATE MATERIALIZED VIEW {{schema}}.{{viewName}}
BACKUP NO
SORTKEY(user_pseudo_id)
AUTO REFRESH NO
AS
WITH base_data AS (
  SELECT 
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
  FROM {{schema}}.event
  JOIN {{schema}}.event_parameter ON event.event_timestamp = event_parameter.event_timestamp AND event.event_id = event_parameter.event_id
)
SELECT 
  user_pseudo_id,
  event_id,
  platform,
  MAX(CASE WHEN event_param_key = '_session_id' THEN event_param_string_value ELSE NULL END) AS session_id,
  MAX(CASE WHEN event_param_key = '_session_duration' THEN event_param_int_value ELSE NULL END) AS session_duration,
  MAX(CASE WHEN event_param_key = '_session_start_timestamp' THEN event_param_int_value ELSE NULL END) AS session_st,
  MAX(CASE WHEN (event_param_key = '_engagement_time_msec' AND event_name = '_user_engagement') THEN event_param_int_value ELSE NULL END) AS engagement_time,
  (CASE WHEN MAX(event_name) IN ('_screen_view', '_page_view') THEN 1 ELSE 0 END) AS view
FROM base_data
GROUP BY 1,2,3