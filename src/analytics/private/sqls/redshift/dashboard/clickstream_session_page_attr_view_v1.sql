CREATE MATERIALIZED VIEW {{schema}}.{{viewName}}
BACKUP YES
SORTKEY(session_id)
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
  event_id,
  event_timestamp,
  MAX(CASE WHEN event_param_key = '_session_id' THEN event_param_string_value ELSE NULL END) AS session_id,
  MAX(CASE WHEN (event_param_key = '_screen_name' OR event_param_key = '_page_title') THEN event_param_string_value ELSE null END) AS view
FROM base_data WHERE event_name IN ('_screen_view','_page_view')
GROUP BY 1,2